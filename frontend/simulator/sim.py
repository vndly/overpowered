"""Reference simulator for Overpowered, implementing ../docs/specs.md.

Its purpose is to measure `TargetEnergy`: the spec sets that constant to roughly 80%
of the peak Battery Contents reachable under strong play, and says it must be
re-measured whenever the economy is retuned. Strong play is approximated here by a
greedy reinvestment policy whose knobs are swept; the peak it reaches is a lower
bound on true optimal play, so a target derived from it errs towards the generous.

Every constant below is taken from the spec. When the spec changes, change them here
and re-run `measure.py`.
"""
import copy
import itertools
import math
import random

TIME_LIMIT = 600.0
MAX_SETTING = 2.0

# cap: base Capacity | base/rng/safe/mx: the stress curve | cons: BaseConsumption
# wg/wr: WearGrowth, WearRecovery | rep: RepairSeconds
P = dict(cap=8.0,  base=30.0, rng=100.0, safe=70.0, mx=150.0, cons=0.1,  wg=0.100, wr=0.008, rep=8.0)
B = dict(cap=50.0, base=20.0, rng=180.0, safe=95.0, mx=236.0, cons=0.1,  wg=0.040, wr=0.004, rep=40.0)
T = dict(cap=50.0, base=1.0,  rng=10.0,  safe=6.0,  mx=13.0,  cons=0.75, wg=0.067, wr=0.020, rep=20.0)

PULV_YIELD, STEAM_YIELD = 0.95, 8.0
MAX_EFF, MAX_CTRL, UPGRADE_GAIN, CAPACITY_GROWTH = 0.95, 0.75, 0.25, 1.5
RESERVE_FRACTION, STARTUP_SECONDS, RESTART_MULTIPLE, STARTING_CHARGE = 0.10, 30.0, 2.0, 4.0
START_PRICE, PRICE_GROWTH, MARKET_RANGE, VOLATILITY, REVERSION = 1.0, 1.06, 0.25, 0.03, 0.01
START_SETTING = 0.6

# The spec advances the market once per simulation step, which ties the realised price
# path to DeltaTimeSeconds -- two implementations stepping differently would face
# different markets on the same seed. Here the walk runs on its own fixed grid so that a
# seed means one market at any step size, which is what makes convergence testable.
MARKET_DT = 0.05

# upgrade track -> (BaseCost, CostGrowth)
COST = {
    'capP': (0.02, 1.70), 'capB': (0.02, 1.70), 'capT': (0.02, 1.70),
    'stock': (0.02, 1.55), 'silo': (0.02, 1.55), 'tank': (0.02, 1.55), 'batt': (0.02, 1.55),
    'effP': (0.05, 1.30), 'effB': (0.05, 1.30), 'effT': (0.05, 1.30),
    'cool': (0.05, 1.45), 'reg': (0.05, 1.45), 'stab': (0.05, 1.45),
}


class State:
    """Plant state. Storage is kept in kg internally; the UI displays tonnes."""

    def __init__(self):
        self.t = 0.0
        self.capP, self.capB, self.capT = P['cap'], B['cap'], T['cap']
        self.capStock, self.capSilo, self.capTank, self.capBatt = 1000.0, 500.0, 3000.0, 10.0
        self.effP = self.effB = self.effT = 0.85
        self.cool = self.reg = self.stab = 0.4
        self.stock = self.silo = self.tank = 0.0
        self.batt = STARTING_CHARGE
        self.wear = {'P': 0.0, 'B': 0.0, 'T': 0.0}
        self.repair = {'P': 0.0, 'B': 0.0, 'T': 0.0}
        self.levels = {k: 0 for k in COST}
        self.market = 1.0
        self.last_elec, self.last_raw = (0.0, 0.0), 0.0
        # outcome and energy accounting, so a run can be audited for conservation
        self.peak = STARTING_CHARGE
        self.trips = {'P': 0, 'B': 0, 'T': 0}
        self.spent = self.coal_cost = self.generated = self.machine_use = self.clipped = 0.0
        self.stalled = False

    def price(self):
        return START_PRICE * PRICE_GROWTH ** (self.t / 60.0) * self.market

    def startup_energy(self):
        return sum(self.last_elec) * STARTUP_SECONDS / 3600.0

    def reserve(self):
        """MinimumReserve. The two terms scale with different things -- the first with
        Battery capacity, the second with machine consumption -- and taking the larger is
        what stops the upgrade floor sinking below the coal floor. Below that crossover a
        player could spend to the reserve and find no coal affordable at any price."""
        return max(self.capBatt * RESERVE_FRACTION, self.startup_energy() * RESTART_MULTIPLE)

    def spendable(self):
        return max(0.0, self.batt - self.reserve())

    def ceilings(self):
        """Wear-free Setting ceiling for each machine at its current control."""
        return ((P['safe'] - P['base']) / (P['rng'] * (1 - self.cool)),
                (B['safe'] - B['base']) / (B['rng'] * (1 - self.reg)),
                (T['safe'] - T['base']) / (T['rng'] * (1 - self.stab)))

    def ratios(self):
        """sP/sT and sB/sT for a chain matched to the Turbine's draw."""
        rB = self.capT * T['cons'] / (self.effT * self.capB)
        rP = self.capT * T['cons'] / (self.effT * STEAM_YIELD * self.effB * self.capP)
        return rP, rB

    def cost_of(self, track):
        base, growth = COST[track]
        return base * growth ** self.levels[track]

    def apply(self, track):
        self.batt -= self.cost_of(track)
        self.spent += self.cost_of(track)
        self.levels[track] += 1
        if track == 'capP': self.capP *= CAPACITY_GROWTH
        elif track == 'capB': self.capB *= CAPACITY_GROWTH
        elif track == 'capT': self.capT *= CAPACITY_GROWTH
        elif track == 'stock': self.capStock *= CAPACITY_GROWTH
        elif track == 'silo': self.capSilo *= CAPACITY_GROWTH
        elif track == 'tank': self.capTank *= CAPACITY_GROWTH
        elif track == 'batt': self.capBatt *= CAPACITY_GROWTH
        elif track == 'effP': self.effP += (MAX_EFF - self.effP) * UPGRADE_GAIN
        elif track == 'effB': self.effB += (MAX_EFF - self.effB) * UPGRADE_GAIN
        elif track == 'effT': self.effT += (MAX_EFF - self.effT) * UPGRADE_GAIN
        elif track == 'cool': self.cool += (MAX_CTRL - self.cool) * UPGRADE_GAIN
        elif track == 'reg': self.reg += (MAX_CTRL - self.reg) * UPGRADE_GAIN
        elif track == 'stab': self.stab += (MAX_CTRL - self.stab) * UPGRADE_GAIN


def income(s, sT, price):
    """Steady-state MWh/s for a matched chain held at Turbine Setting sT."""
    rP, rB = s.ratios()
    sP, sB = sT * rP, sT * rB
    pEl = sP * s.capP * P['cons'] / s.effP
    bEl = sB * s.capB * B['cons'] / s.effB
    raw = sP * s.capP / PULV_YIELD
    return (sT * s.capT - pEl - bEl) / 3600.0 - raw / 1000.0 * price


def clone_with(s, track):
    c = copy.copy(s)
    c.levels = dict(s.levels)
    c.batt = s.batt + 1e9          # bypass the affordability check inside apply
    c.apply(track)
    return c


def deliverable(s, sT):
    """Largest Turbine Setting the chain can actually feed while staying matched.
    Clamping sP/sB independently instead would starve the Turbine."""
    rP, rB = s.ratios()
    return min(sT, MAX_SETTING, MAX_SETTING / rB, MAX_SETTING / rP)


# --- policy -----------------------------------------------------------------
# A policy is a dict of knobs, swept by measure.py:
#   ride     ride Setting as a multiple of the Turbine's clean ceiling
#   backoff  'all' drops far enough to heal every machine, 'turbine' only the Turbine
#   wear_hi  back off once any machine's wear passes this
#   wear_lo  resume riding once every machine is below this
#   slack    how far above its own ceiling an upstream machine may sit before
#            capacity or control is bought for it
#   buffer   seconds of downstream flow each store is sized and filled to
#   t_stop   stop upgrading and bank from here on

def settings(s, pol, mode):
    ceilP, ceilB, ceilT = s.ceilings()
    rP, rB = s.ratios()
    if mode == 'ride':
        sT = pol['ride'] * ceilT
    elif pol['backoff'] == 'all':
        sT = min(ceilT, ceilB / rB, ceilP / rP) * 0.97
    else:
        sT = ceilT * 0.97
    sT = deliverable(s, sT)

    # Overproduce only by what is needed to close a buffer gap, then fall back to matched.
    # A flat percentage boost never switches off in a matched chain, because the stage
    # below consumes the surplus and the buffer never fills. The boost also stops at the
    # clean ceiling: refilling a store is not worth wearing the machine out, and
    # deliberate redlining is the ride mode's job.
    REFILL = 60.0
    tSteam = sT * s.capT * T['cons'] / s.effT
    want_tank = min(s.capTank, tSteam * pol['buffer'])
    boost = (tSteam + max(0.0, want_tank - s.tank) / REFILL) / s.capB
    sB = min(max(tSteam / s.capB, min(boost, ceilB)), MAX_SETTING)

    bFuel = sB * s.capB / (STEAM_YIELD * s.effB)
    want_silo = min(s.capSilo, bFuel * pol['buffer'])
    boost = (bFuel + max(0.0, want_silo - s.silo) / REFILL) / s.capP
    sP = min(max(bFuel / s.capP, min(boost, ceilP)), MAX_SETTING)
    return sP, sB, sT


def purchase(s, pol):
    ceilP, ceilB, ceilT = s.ceilings()
    rP, rB = s.ratios()
    rideT = deliverable(s, pol['ride'] * ceilT)
    price = s.price()

    # Battery capacity on demand only: buying it early raises MinimumReserve and locks up
    # the upgrade budget, so lift the ceiling when it actually binds.
    if s.batt > 0.85 * s.capBatt and s.cost_of('batt') <= s.spendable():
        s.apply('batt'); return
    if s.t >= pol['t_stop']:
        return

    def afford(tr): return s.cost_of(tr) <= s.spendable()

    # An upstream machine that cannot physically reach the matched Setting starves the
    # chain, so capacity there is mandatory whatever the slack knob says.
    for setting, capt in ((rideT * rB, 'capB'), (rideT * rP, 'capP')):
        if setting > 1.9 and afford(capt): s.apply(capt); return

    # headroom: keep the upstream machines near their own ceilings at the ride point
    for setting, ceil, capt, ctrlt in ((rideT * rB, ceilB, 'capB', 'reg'),
                                       (rideT * rP, ceilP, 'capP', 'cool')):
        if setting > ceil * pol['slack']:
            pick = min((capt, ctrlt), key=s.cost_of)
            if afford(pick): s.apply(pick); return

    # storage that has become too small for the flow through it
    raw = rideT * rP * s.capP / PULV_YIELD
    fuel = rideT * rB * s.capB / (STEAM_YIELD * s.effB)
    steam = rideT * s.capT * T['cons'] / s.effT
    for need, cap, tr in ((raw * pol['buffer'], s.capStock, 'stock'),
                          (fuel * pol['buffer'], s.capSilo, 'silo'),
                          (steam * pol['buffer'], s.capTank, 'tank')):
        if cap < need and afford(tr): s.apply(tr); return

    # Everything else by marginal income per MWh, gated on paying itself back in time.
    # Each candidate is valued at the ride point it would actually permit: holding the
    # ride point fixed makes capT look free, when buying it past capB/capP throttles the
    # Turbine instead, and a run then buys capacity it can never feed.
    base = income(s, rideT, price)
    best, best_score = None, 0.0
    for tr in ('capT', 'capB', 'capP', 'effT', 'effB', 'effP', 'stab', 'reg', 'cool'):
        if not afford(tr): continue
        c = clone_with(s, tr)
        gain = income(c, deliverable(c, pol['ride'] * c.ceilings()[2]), price) - base
        if gain <= 0: continue
        cost = s.cost_of(tr)
        if cost / gain > (pol['t_stop'] - s.t): continue
        if gain / cost > best_score: best, best_score = tr, gain / cost
    if best: s.apply(best)


def buy_coal(s):
    startup = s.startup_energy()
    floor = startup if s.stock < 0.2 * s.capStock else max(startup, s.reserve())
    budget = max(0.0, s.batt - floor)
    # coal that cannot be burned before the timer is pure loss against the peak
    burnable = s.last_raw * max(0.0, TIME_LIMIT - s.t)
    price = s.price()
    kg = min(s.capStock - s.stock, budget / price * 1000.0, max(0.0, burnable - s.stock))
    if kg <= 0: return
    s.batt -= kg / 1000.0 * price
    s.coal_cost += kg / 1000.0 * price
    s.stock += kg


def run(pol, seed, dt=0.2):
    """One run. Machines read start-of-step state; every store is written at step end."""
    path = market_path(seed)
    s = State()
    mode, next_decision = 'ride', 0.0
    for _ in range(int(TIME_LIMIT / dt)):
        s.market = path[int(s.t / MARKET_DT)]
        if max(s.wear.values()) > pol['wear_hi']: mode = 'back'
        elif max(s.wear.values()) < pol['wear_lo']: mode = 'ride'
        sP, sB, sT = settings(s, pol, mode)

        pEl = sP * s.capP * P['cons'] / s.effP
        bEl = sB * s.capB * B['cons'] / s.effB
        s.last_elec, s.last_raw = (pEl, bEl), sP * s.capP / PULV_YIELD

        if s.t >= next_decision:
            purchase(s, pol)
            buy_coal(s)
            next_decision += 1.0

        tripped = {k: s.repair[k] > 0 for k in 'PBT'}
        req = ((0.0 if tripped['P'] else pEl) + (0.0 if tripped['B'] else bEl)) * dt / 3600.0
        er = 1.0 if req <= 0 else min(1.0, s.batt / req)

        pRaw = sP * s.capP / PULV_YIELD
        bFuel = sB * s.capB / (STEAM_YIELD * s.effB)
        tSteam = sT * s.capT * T['cons'] / s.effT
        ratP = 0.0 if tripped['P'] else min(er, 1.0 if pRaw <= 0 else min(1.0, s.stock / (pRaw * dt)))
        ratB = 0.0 if tripped['B'] else min(er, 1.0 if bFuel <= 0 else min(1.0, s.silo / (bFuel * dt)))
        ratT = 0.0 if tripped['T'] else (1.0 if tSteam <= 0 else min(1.0, s.tank / (tSteam * dt)))

        made_mwh = sT * s.capT * ratT * dt / 3600.0
        used_elec = (pEl * ratP + bEl * ratB) * dt / 3600.0
        stored = min(made_mwh, s.capBatt - s.batt)
        s.generated += stored
        s.clipped += made_mwh - stored
        s.machine_use += used_elec

        s.stock -= pRaw * ratP * dt
        s.silo = s.silo - bFuel * ratB * dt + min(sP * s.capP * ratP * dt, s.capSilo - s.silo)
        s.tank = s.tank - tSteam * ratT * dt + min(sB * s.capB * ratB * dt, s.capTank - s.tank)
        s.batt = max(0.0, s.batt - used_elec + stored)
        s.stock, s.silo, s.tank = max(0.0, s.stock), max(0.0, s.silo), max(0.0, s.tank)
        s.peak = max(s.peak, s.batt)

        for key, m, setting, rat in (('P', P, sP, ratP), ('B', B, sB, ratB), ('T', T, sT, ratT)):
            ctrl = {'P': s.cool, 'B': s.reg, 'T': s.stab}[key]
            stress = m['base'] + m['rng'] * setting * (1 - ctrl)
            ex = max(0.0, min(1.0, (stress - m['safe']) / (m['mx'] - m['safe'])))
            rate = -m['wr'] if (s.repair[key] > 0 or ex == 0) else m['wg'] * ex * ex * rat
            s.wear[key] = max(0.0, min(1.0, s.wear[key] + rate * dt))
            if s.repair[key] > 0:
                s.repair[key] -= dt
            elif s.wear[key] >= 1.0:
                s.repair[key] = m['rep']; s.trips[key] += 1

        s.t += dt

        if s.batt <= 0 and s.stock <= 0 and s.silo <= 0 and s.tank <= 0:
            s.stalled = True
            break
    return s


def market_path(seed):
    """The whole run's Market series on the fixed MARKET_DT grid."""
    rng = random.Random(seed)
    market, path = 1.0, []
    for _ in range(int(TIME_LIMIT / MARKET_DT) + 2):
        path.append(market)
        drift = (1 - market) * REVERSION * MARKET_DT
        noise = rng.uniform(-VOLATILITY, VOLATILITY) * math.sqrt(MARKET_DT)
        market = max(1 - MARKET_RANGE, min(1 + MARKET_RANGE, market + drift + noise))
    return path


def sweep(grid, seeds, dt=0.2):
    """Run every combination in `grid` over `seeds`, best mean peak first."""
    keys = list(grid)
    out = []
    for combo in itertools.product(*(grid[k] for k in keys)):
        pol = dict(zip(keys, combo))
        peaks = sorted(run(pol, sd, dt).peak for sd in seeds)
        out.append((sum(peaks) / len(peaks), peaks[len(peaks) // 2], max(peaks), pol))
    out.sort(key=lambda r: -r[0])
    return out
