"""Reference simulator for Overpowered, implementing ../docs/specs.md.

Its purpose is to measure `TargetEnergy`: the spec sets that constant to roughly 80%
of the peak Battery Contents reachable under strong play, and says it must be
re-measured whenever the economy is retuned. Strong play is approximated here by a
greedy reinvestment policy whose knobs are swept; the peak it reaches is a lower
bound on true optimal play, so a target derived from it errs towards the generous.

Machines have no throttle. Every machine runs at its Flow, so a run is decided
entirely by what is bought and when: the only lever on stress is how far out of step
the chain is, and the only answer to a wearing machine is a purchase.

Every constant below is taken from the spec. When the spec changes, change them here
and re-run `measure.py`.
"""
import copy
import itertools

TIME_LIMIT = 600.0

# flow: base Flow (a machine holds nothing, so it has no Capacity at all) | nom: stress
# running clean | safe/safe_hi/safe_lo: the Tolerance band | mx: MaxStress
# | cons: BaseConsumption | wg/wr: WearGrowth, WearRecovery
# | rep: RepairSeconds
P = dict(flow=4.00,  nom=70.0,  safe=85.0,  safe_hi=140.0, safe_lo=45.0, mx=150.0,
         cons=0.1,  wg=0.100, wr=0.008, rep=8.0)
B = dict(flow=21.00, nom=100.0, safe=120.0, safe_hi=220.0, safe_lo=70.0, mx=236.0,
         cons=0.1,  wg=0.040, wr=0.004, rep=40.0)
T = dict(flow=23.70, nom=5.0,   safe=6.5,   safe_hi=12.0,  safe_lo=3.5,  mx=13.0,
         cons=0.62, wg=0.067, wr=0.020, rep=20.0)

PULV_YIELD, STEAM_YIELD = 0.95, 10.0
MAX_EFF, MIN_EFF, UPGRADE_GAIN, TOLERANCE_GAIN = 0.95, 0.40, 0.25, 0.25
# Three geometric tracks, three knobs. A machine's Flow and a store's Capacity carry
# the same number today and are still separate: one is how far a stage jumps out of
# step with its neighbours, the other is how much room the store beside it has.
MACHINE_FLOW_GROWTH, STORE_CAP_GROWTH, STORE_FLOW_GROWTH = 1.5, 1.5, 2.25
RESERVE_FRACTION, STARTUP_SECONDS, RESTART_MULTIPLE, STARTING_CHARGE = 0.10, 30.0, 2.0, 4.0
START_PRICE, PRICE_GROWTH = 1.0, 1.06
START_EFFICIENCY = 0.70

# The penalty legs. Each purchase closes this share of the gap between the stat it
# penalises and that stat's floor, so no track can ever drive a stat to nothing:
#   machine   Flow -> SafeStress -> Efficiency -> FlowFactor -> ...
#   storage   Capacity <-> FlowFactor
FLOW_ON_SAFE, TOL_ON_EFF, EFF_ON_FLOW = 0.10, 0.08, 0.06
STORE_CAP_ON_FLOW, STORE_FLOW_ON_CAP = 0.10, 0.10
CAP_FACTOR_FLOOR, FLOW_FACTOR_FLOOR = 0.55, 0.55

# Strain: a machine out of step with the chain runs hotter than running clean implies.
# The Pulverizer and Boiler push into the store below them and strain when it backs up; the
# Turbine draws from the store above it and strains when that runs dry. A machine held
# below its request by a store's flow cap strains by the share of the request it lost.
# See "Buffers and strain" in ../docs/specs.md.
STRAIN_GAIN, BACKLOG_THRESHOLD, STARVE_THRESHOLD = 1.25, 0.70, 0.30

# Storage: base Capacity and base Flow. Material stores are kg and kg/s; the Battery is
# MWh and MW. The Silo and Tank contend -- in + out must fit inside one Flow -- while the
# Stockpile caps only the draw out to the Pulverizer and the Battery only the charge in.
# A coal purchase lands whole and at once, so nothing rate-limits what enters a Stockpile.
# The Silo is deliberately small and deliberately tight. The chain does not open matched:
# the Pulverizer makes 4.00 kg/s of powder against a 3.00 kg/s draw, so the Silo gains a
# kilogram a second and crosses BacklogThreshold about seventy seconds in. Its Flow carries
# the opening rate with 7% to spare, so the first Pulverizer flow upgrade breaks it.
STORE = {
    'stock': dict(cap=500.0,  flow=12.0),
    'silo':  dict(cap=100.0,  flow=7.5),
    'tank':  dict(cap=1500.0, flow=48.0),
    'batt':  dict(cap=10.0,   flow=28.0),
}
# The Tank opens half full. Everything downstream of an empty Tank is a Turbine at full
# strain with no throttle to answer it, which is a run lost before the player has touched
# anything; opening exactly on STARVE_THRESHOLD leaves it on the line its own bar bands on.
TANK_START_FILL = 0.5


def gap_up(value, ceiling, share):
    """Close `share` of the distance to a ceiling. Approaches it, never reaches it."""
    return value + (ceiling - value) * share


def gap_down(value, floor, share):
    """Close `share` of the distance to a floor. Approaches it, never reaches it."""
    return value - (value - floor) * share


def backlog(contents, capacity):
    """Pressure on a machine pushing into `contents` of `capacity`, 0 to 1."""
    fill = 0.0 if capacity <= 0 else contents / capacity
    return max(0.0, min(1.0, (fill - BACKLOG_THRESHOLD) / (1 - BACKLOG_THRESHOLD)))


def starve(contents, capacity):
    """Pressure on a machine drawing from `contents` of `capacity`, 0 to 1."""
    fill = 0.0 if capacity <= 0 else contents / capacity
    return max(0.0, min(1.0, (STARVE_THRESHOLD - fill) / STARVE_THRESHOLD))


# upgrade track -> (BaseCost, CostGrowth)
#
# Every track is priced far more gently than it was when a throttle existed. Raising the
# chain's rate by one step now takes a level on each of seven stages rather than a single
# purchase, so a growth rate that was a brake on one upgrade is a wall in front of a round
# of them: at the old 1.70 the second round is already unaffordable and the plant sits at
# its opening rates, drifting out of balance, for the rest of the run.
COST = {
    'flowP': (0.02, 1.40), 'flowB': (0.02, 1.40), 'flowT': (0.02, 1.40),
    'effP': (0.05, 1.30), 'effB': (0.05, 1.30), 'effT': (0.05, 1.30),
    'tolP': (0.04, 1.35), 'tolB': (0.04, 1.35), 'tolT': (0.04, 1.35),
    'capStock': (0.02, 1.40), 'capSilo': (0.02, 1.40),
    'capTank': (0.02, 1.40), 'capBatt': (0.02, 1.40),
    'flowStock': (0.02, 1.85), 'flowSilo': (0.02, 1.85),
    'flowTank': (0.02, 1.85), 'flowBatt': (0.02, 1.85),
}

MACHINE_KEYS = ('P', 'B', 'T')
STORE_KEYS = ('stock', 'silo', 'tank', 'batt')


class State:
    """Plant state. Storage is kept in kg internally; the UI displays tonnes."""

    def __init__(self):
        self.t = 0.0
        # machines: geometric flow times a factor the Efficiency track erodes
        self.flow_lvl = {k: 0 for k in MACHINE_KEYS}
        self.flow_factor = {k: 1.0 for k in MACHINE_KEYS}
        self.eff = {k: START_EFFICIENCY for k in MACHINE_KEYS}
        self.safe = {'P': P['safe'], 'B': B['safe'], 'T': T['safe']}
        # storage: the same shape, one factor each way
        self.store_cap_lvl = {k: 0 for k in STORE_KEYS}
        self.store_flow_lvl = {k: 0 for k in STORE_KEYS}
        self.store_cap_factor = {k: 1.0 for k in STORE_KEYS}
        self.store_flow_factor = {k: 1.0 for k in STORE_KEYS}

        self.contents = {'stock': 0.0, 'silo': 0.0,
                         'tank': STORE['tank']['cap'] * TANK_START_FILL,
                         'batt': STARTING_CHARGE}
        self.wear = {k: 0.0 for k in MACHINE_KEYS}
        self.repair = {k: 0.0 for k in MACHINE_KEYS}
        self.levels = {k: 0 for k in COST}
        self.last_elec, self.last_raw = 0.0, 0.0
        # outcome and energy accounting, so a run can be audited for conservation
        self.peak = STARTING_CHARGE
        self.trips = {k: 0 for k in MACHINE_KEYS}
        self.spent = self.coal_cost = self.generated = self.machine_use = self.clipped = 0.0
        self.stalled = False

    # --- derived component values -------------------------------------------

    def flow(self, key):
        base = {'P': P, 'B': B, 'T': T}[key]['flow']
        return base * MACHINE_FLOW_GROWTH ** self.flow_lvl[key] * self.flow_factor[key]

    def store_cap(self, key):
        return (STORE[key]['cap'] * STORE_CAP_GROWTH ** self.store_cap_lvl[key]
                * self.store_cap_factor[key])

    def store_flow(self, key):
        return (STORE[key]['flow'] * STORE_FLOW_GROWTH ** self.store_flow_lvl[key]
                * self.store_flow_factor[key])

    def fill(self, key):
        capacity = self.store_cap(key)
        return 0.0 if capacity <= 0 else self.contents[key] / capacity

    # --- requested rates, all from start-of-step state ----------------------

    def rates(self):
        """Every rate the chain requests when nothing is throttling it."""
        powder = self.flow('P')
        raw = powder / PULV_YIELD
        steam = self.flow('B')
        fuel = steam / (STEAM_YIELD * self.eff['B'])
        power = self.flow('T')
        tsteam = power * T['cons'] / self.eff['T']
        elec_p = powder * P['cons'] / self.eff['P']
        elec_b = steam * B['cons'] / self.eff['B']
        return dict(raw=raw, powder=powder, fuel=fuel, steam=steam,
                    tsteam=tsteam, power=power, elec_p=elec_p, elec_b=elec_b)

    def price(self):
        return START_PRICE * PRICE_GROWTH ** (self.t / 60.0)

    def startup_energy(self):
        return self.last_elec * STARTUP_SECONDS / 3600.0

    def reserve(self):
        """MinimumReserve. The two terms scale with different things -- the first with
        Battery capacity, the second with machine consumption -- and taking the larger is
        what stops the upgrade floor sinking below the coal floor. Below that crossover a
        player could spend to the reserve and find no coal affordable at any price."""
        return max(self.store_cap('batt') * RESERVE_FRACTION,
                   self.startup_energy() * RESTART_MULTIPLE)

    def spendable(self):
        return max(0.0, self.contents['batt'] - self.reserve())

    def cost_of(self, track):
        base, growth = COST[track]
        return base * growth ** self.levels[track]

    # --- upgrades -----------------------------------------------------------

    def apply(self, track):
        self.contents['batt'] -= self.cost_of(track)
        self.spent += self.cost_of(track)
        self.levels[track] += 1
        kind, who = track[:3], track[3:]

        # 'flowP' and 'flowStock' share the three characters `kind` is read from, so the
        # machine leg is told apart by its key -- the way the store flow leg re-slices.
        if kind == 'flo' and track[4:] in MACHINE_KEYS:
            machine = track[4:]
            self.flow_lvl[machine] += 1
            limits = {'P': P, 'B': B, 'T': T}[machine]
            self.safe[machine] = gap_down(self.safe[machine], limits['safe_lo'], FLOW_ON_SAFE)
        elif kind == 'eff':
            self.eff[who] = gap_up(self.eff[who], MAX_EFF, UPGRADE_GAIN)
            self.flow_factor[who] = gap_down(self.flow_factor[who], FLOW_FACTOR_FLOOR, EFF_ON_FLOW)
        elif kind == 'tol':
            limits = {'P': P, 'B': B, 'T': T}[who]
            self.safe[who] = gap_up(self.safe[who], limits['safe_hi'], TOLERANCE_GAIN)
            self.eff[who] = gap_down(self.eff[who], MIN_EFF, TOL_ON_EFF)
        elif kind == 'cap':
            key = who[0].lower() + who[1:]
            self.store_cap_lvl[key] += 1
            self.store_flow_factor[key] = gap_down(
                self.store_flow_factor[key], FLOW_FACTOR_FLOOR, STORE_CAP_ON_FLOW)
        elif kind == 'flo':
            key = track[4].lower() + track[5:]
            self.store_flow_lvl[key] += 1
            self.store_cap_factor[key] = gap_down(
                self.store_cap_factor[key], CAP_FACTOR_FLOOR, STORE_FLOW_ON_CAP)


def flow_shares(s, r):
    """The fraction of its request each store's Flow can carry.

    The Silo and Tank divide one Flow between what enters and what leaves, so both sides
    are scaled by the same share; the Stockpile and Battery cap one direction only.
    """
    def share(key, demand):
        return 1.0 if demand <= 0 else min(1.0, s.store_flow(key) / demand)

    return (share('silo', r['powder'] + r['fuel']),
            share('tank', r['steam'] + r['tsteam']),
            share('batt', r['power']))


def steady(s):
    """Sustained run ratio of each machine, cascaded down the chain.

    Nothing throttles, so a machine runs at its Capacity unless something takes the rate
    away from it: a flow cap, or a stage above it that cannot supply what it asks for. An
    oversized machine is therefore worth nothing and still costs everything -- an oversized
    Pulverizer buys and grinds coal the Boiler never burns.
    """
    r = s.rates()
    f_silo, f_tank, f_batt = flow_shares(s, r)
    supply = 1.0 if r['raw'] <= 0 else min(1.0, s.store_flow('stock') / r['raw'])

    ratP = min(1.0, supply, f_silo)
    fed_b = 1.0 if r['fuel'] <= 0 else min(1.0, r['powder'] * ratP / r['fuel'])
    ratB = min(1.0, f_silo, f_tank, fed_b)
    fed_t = 1.0 if r['tsteam'] <= 0 else min(1.0, r['steam'] * ratB / r['tsteam'])
    ratT = min(1.0, f_tank, f_batt, fed_t)
    return r, ratP, ratB, ratT


def ceilings(s):
    """What each stage of the chain could carry on its own, in Turbine MW, in chain order.

    Every stage is a `min`, so in a matched chain no single purchase raises the rate at
    all: each one is worth exactly nothing until the rest of the round follows it. A policy
    that priced upgrades one at a time would buy none of them and sit at its opening
    capacity for the whole run. Comparing stage ceilings instead is what turns that into
    the ladder a player climbs, and it also says which end to climb from -- the smallest
    ceiling wins, and a tie goes to the most upstream stage, so a round opens at the
    Pulverizer and the surplus banks in the Silo. Opening it at the Turbine would drain
    the Tank instead, straining the one machine that generates.
    """
    to_mw = s.eff['T'] / T['cons']                      # kg/s of steam -> MW
    powder_to_mw = STEAM_YIELD * s.eff['B'] * to_mw     # kg/s of powder -> MW
    return [
        (s.store_flow('stock') * PULV_YIELD * powder_to_mw, 'flowStock'),
        (s.flow('P') * powder_to_mw, 'flowP'),
        (s.store_flow('silo') / 2.0 * powder_to_mw, 'flowSilo'),
        (s.flow('B') * to_mw, 'flowB'),
        (s.store_flow('tank') / 2.0 * to_mw, 'flowTank'),
        (s.flow('T'), 'flowT'),
        (s.store_flow('batt'), 'flowBatt'),
    ]


def binding(s):
    """The stage holding the chain back, most upstream first on a tie."""
    return min(ceilings(s), key=lambda c: c[0])[1]


def deliverable(s):
    """Sustained Turbine MW the chain can actually carry."""
    r, _, _, ratT = steady(s)
    return r['power'] * ratT


def income(s, price):
    """Steady-state MWh/s, at the rate the chain can actually carry."""
    r, ratP, ratB, ratT = steady(s)
    net_power = r['power'] * ratT - r['elec_p'] * ratP - r['elec_b'] * ratB
    return net_power / 3600.0 - r['raw'] * ratP / 1000.0 * price


def clone_with(s, track):
    c = copy.copy(s)
    for name in ('flow_lvl', 'flow_factor', 'eff', 'safe', 'store_cap_lvl',
                 'store_flow_lvl', 'store_cap_factor', 'store_flow_factor', 'levels'):
        setattr(c, name, dict(getattr(s, name)))
    c.contents = dict(s.contents)
    c.contents['batt'] += 1e9      # bypass the affordability check inside apply
    c.apply(track)
    return c


# --- policy -----------------------------------------------------------------
# A policy is a dict of knobs, swept by measure.py:
#   headroom  keep each machine's stress this far under SafeStress before buying Tolerance
#   buffer    seconds of downstream flow each store is sized and filled to
#   flow_edge keep each store's Flow this multiple of the rate passing through it
#   t_stop    stop upgrading and bank from here on

def wear_pressure(s):
    """Pressure on each machine from the store it is fighting, ignoring flow."""
    return {
        'P': backlog(s.contents['silo'], s.store_cap('silo')),
        'B': backlog(s.contents['tank'], s.store_cap('tank')),
        'T': starve(s.contents['tank'], s.store_cap('tank')),
    }


def purchase(s, pol):
    def afford(tr):
        return s.cost_of(tr) <= s.spendable()

    # Battery capacity is the ceiling on everything the run is for, and a Battery that
    # fills is a Turbine generating into nothing. It is still not bought early for its own
    # sake -- every level raises MinimumReserve and locks up the upgrade budget -- so the
    # trigger is a fill fraction, and how far ahead of the energy to buy is a policy knob.
    if s.fill('batt') > pol['batt_at'] and afford('capBatt'):
        s.apply('capBatt'); return
    if s.t >= pol['t_stop']:
        return

    r, ratP, ratB, ratT = steady(s)

    def track(kind, key):
        return kind + key[0].upper() + key[1:]

    # A store whose Flow cannot carry what passes through it throttles the whole chain,
    # and under contention the through-rate is counted twice. Buy it back first. The
    # demand is the unthrottled request, not the throttled rate -- sizing Flow to what the
    # cap is already allowing would leave it exactly where it is forever.
    through = {
        'stock': r['raw'],
        'silo': r['powder'] + r['fuel'],
        'tank': r['steam'] + r['tsteam'],
        'batt': r['power'],
    }
    for key, need in through.items():
        if s.store_flow(key) < need * pol['flow_edge'] and afford(track('flow', key)):
            s.apply(track('flow', key)); return

    # storage that has become too small to buffer the flow through it
    for key, rate in (('stock', r['raw'] * ratP), ('silo', r['fuel'] * ratB),
                      ('tank', r['tsteam'] * ratT)):
        if s.store_cap(key) < rate * pol['buffer'] and afford(track('cap', key)):
            s.apply(track('cap', key)); return

    # A machine running close to its SafeStress has nowhere to go when the chain drifts,
    # and with no throttle there is nothing to do about it afterwards. Wear that is already
    # on the clock is the more urgent of the two, so it is checked first.
    limits = {'P': P, 'B': B, 'T': T}
    for key in MACHINE_KEYS:
        if s.wear[key] > pol['wear_at'] and afford('tol' + key):
            s.apply('tol' + key); return
    for key, pressure in wear_pressure(s).items():
        stress = limits[key]['nom'] * (1 + STRAIN_GAIN * pressure)
        if stress > s.safe[key] * pol['headroom'] and afford('tol' + key):
            s.apply('tol' + key); return

    # Efficiency that pays for itself right now. effP and effB cut what a given output
    # costs, so they show a gain on their own; effT cuts steam per MW, which is worth
    # nothing until the Turbine is large enough to use the steam it frees, so it is priced
    # on the ladder below instead.
    base = income(s, s.price())
    best, best_score = None, 0.0
    for tr in ('effB', 'effP'):
        if not afford(tr):
            continue
        gain = income(clone_with(s, tr), s.price()) - base
        if gain <= 0:
            continue
        cost = s.cost_of(tr)
        if cost / gain > (pol['t_stop'] - s.t):
            continue
        if gain / cost > best_score:
            best, best_score = tr, gain / cost
    if best:
        s.apply(best); return

    # The ladder: buy whichever stage of the chain has the lowest ceiling.
    step = binding(s)
    if step == 'flowT' and s.eff['T'] < MAX_EFF and s.cost_of('effT') <= s.cost_of('flowT') * pol['eff_bias']:
        step = 'effT'
    if afford(step):
        s.apply(step)


def buy_coal(s):
    startup = s.startup_energy()
    floor = startup if s.fill('stock') < 0.2 else max(startup, s.reserve())
    budget = max(0.0, s.contents['batt'] - floor)
    # coal that cannot be burned before the timer is pure loss against the peak
    burnable = s.last_raw * max(0.0, TIME_LIMIT - s.t)
    held = s.contents['stock']
    price = s.price()
    kg = min(s.store_cap('stock') - held, budget / price * 1000.0, max(0.0, burnable - held))
    if kg <= 0:
        return
    s.contents['batt'] -= kg / 1000.0 * price
    s.coal_cost += kg / 1000.0 * price
    s.contents['stock'] += kg


def run(pol, dt=0.2):
    """One run. Machines read start-of-step state; every store is written at step end.

    The coal price is a function of `t` alone, so a policy has exactly one run in it:
    what used to be a distribution over market seeds is now a single number."""
    s = State()
    next_decision = 0.0
    for _ in range(int(TIME_LIMIT / dt)):
        r = s.rates()
        s.last_elec, s.last_raw = r['elec_p'] + r['elec_b'], r['raw']

        if s.t >= next_decision:
            purchase(s, pol)
            buy_coal(s)
            next_decision += 1.0
            r = s.rates()

        tripped = {k: s.repair[k] > 0 for k in MACHINE_KEYS}

        # electricity is shared in proportion to demand; a tripped machine requests none
        req = ((0.0 if tripped['P'] else r['elec_p'])
               + (0.0 if tripped['B'] else r['elec_b'])) * dt / 3600.0
        er = 1.0 if req <= 0 else min(1.0, s.contents['batt'] / req)

        # Flow reads start-of-step state like everything else, so the split between what
        # enters a store and what leaves it does not depend on evaluation order.
        f_silo, f_tank, f_batt = flow_shares(s, r)

        def held(key, rate):
            return 1.0 if rate <= 0 else min(1.0, s.contents[key] / (rate * dt))

        rat = {
            'P': 0.0 if tripped['P'] else min(er, held('stock', r['raw']),
                                              1.0 if r['raw'] <= 0 else min(1.0, s.store_flow('stock') / r['raw']),
                                              f_silo),
            'B': 0.0 if tripped['B'] else min(er, held('silo', r['fuel']), f_silo, f_tank),
            'T': 0.0 if tripped['T'] else min(held('tank', r['tsteam']), f_tank, f_batt),
        }

        # Strain: the worse of the store's fill and the share of its request a flow cap
        # took away. Read before the storage writes below, like every other step input.
        press = wear_pressure(s)
        f_stock = 1.0 if r['raw'] <= 0 else min(1.0, s.store_flow('stock') / r['raw'])
        unmet = {'P': max(1 - f_stock, 1 - f_silo),
                 'B': max(1 - f_silo, 1 - f_tank),
                 'T': max(1 - f_tank, 1 - f_batt)}
        strain = {k: STRAIN_GAIN * max(press[k], unmet[k]) for k in MACHINE_KEYS}

        made_mwh = r['power'] * rat['T'] * dt / 3600.0
        used_elec = (r['elec_p'] * rat['P'] + r['elec_b'] * rat['B']) * dt / 3600.0
        stored = min(made_mwh, s.store_cap('batt') - s.contents['batt'])
        s.generated += stored
        s.clipped += made_mwh - stored
        s.machine_use += used_elec

        s.contents['stock'] -= r['raw'] * rat['P'] * dt
        s.contents['silo'] += (min(r['powder'] * rat['P'] * dt,
                                   s.store_cap('silo') - s.contents['silo'])
                               - r['fuel'] * rat['B'] * dt)
        s.contents['tank'] += (min(r['steam'] * rat['B'] * dt,
                                   s.store_cap('tank') - s.contents['tank'])
                               - r['tsteam'] * rat['T'] * dt)
        s.contents['batt'] = max(0.0, s.contents['batt'] - used_elec + stored)
        for key in ('stock', 'silo', 'tank'):
            s.contents[key] = max(0.0, s.contents[key])
        s.peak = max(s.peak, s.contents['batt'])

        for key, m in (('P', P), ('B', B), ('T', T)):
            stress = m['nom'] * (1 + strain[key])
            ex = max(0.0, min(1.0, (stress - s.safe[key]) / (m['mx'] - s.safe[key])))
            rate = -m['wr'] if (s.repair[key] > 0 or ex == 0) else m['wg'] * ex * ex * rat[key]
            s.wear[key] = max(0.0, min(1.0, s.wear[key] + rate * dt))
            if s.repair[key] > 0:
                s.repair[key] -= dt
            elif s.wear[key] >= 1.0:
                s.repair[key] = m['rep']; s.trips[key] += 1

        s.t += dt

        if all(s.contents[k] <= 0 for k in STORE_KEYS):
            s.stalled = True
            break
    return s


def sweep(grid, dt=0.2):
    """Run every combination in `grid`, highest peak first."""
    keys = list(grid)
    out = []
    for combo in itertools.product(*(grid[k] for k in keys)):
        pol = dict(zip(keys, combo))
        out.append((run(pol, dt).peak, pol))
    out.sort(key=lambda r: -r[0])
    return out
