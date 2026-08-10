"""Checks that the simulator is sound before any number from it is believed.

  1. Opening state -- the values the simulator starts from must match ../docs/specs.md.
  2. Clean ceilings -- slack and fully strained, against the figures the spec quotes.
  3. Max stress at MaxSetting -- what folding the old control constants had to preserve.
  4. Energy balance -- everything generated must end up banked, drawn by a machine,
     spent on coal, or spent on an upgrade. A non-zero residual means the model is
     inventing or losing energy somewhere.
  5. Step-size convergence -- results must not depend on DeltaTimeSeconds.
  6. Restart floor -- MinimumReserve must never sit below what a restart costs.

    python3 verify.py
"""
import statistics as st

import sim

POL = dict(ride=1.75, backoff='all', slack=2.00, t_stop=440.0,
           wear_hi=0.85, wear_lo=0.15, buffer=3.0)

def stress(m, strain):
    return m['base'] + m['rng'] * sim.START_SETTING * (1 + strain)


# opening values as printed in ../docs/specs.md, at the starting Setting of 0.6.
# Every store starts empty, so the Pulverizer and Boiler open with no backlog while the
# Turbine opens at full Starve -- which is why its Vibration begins well above SafeVibration.
SPEC_OPENING = {
    'Pulverizer Output':    (lambda s: sim.START_SETTING * s.capP, 4.80),
    'Pulverizer raw draw':  (lambda s: sim.START_SETTING * s.capP / sim.PULV_YIELD, 5.05),
    'Pulverizer power':     (lambda s: sim.START_SETTING * s.capP * sim.P['cons'] / s.effP, 0.69),
    'Boiler Output':        (lambda s: sim.START_SETTING * s.capB, 30.00),
    'Boiler fuel draw':     (lambda s: sim.START_SETTING * s.capB / (sim.STEAM_YIELD * s.effB), 4.29),
    'Boiler power':         (lambda s: sim.START_SETTING * s.capB * sim.B['cons'] / s.effB, 4.29),
    'Turbine Output':       (lambda s: sim.START_SETTING * s.capT, 30.00),
    'Turbine steam draw':   (lambda s: sim.START_SETTING * s.capT * sim.T['cons'] / s.effT, 26.57),
    'Pulverizer Strain':    (lambda s: s.strains()[0], 0.0),
    'Boiler Strain':        (lambda s: s.strains()[1], 0.0),
    'Turbine Strain':       (lambda s: s.strains()[2], 1.25),
    'Temperature':          (lambda s: stress(sim.P, s.strains()[0]), 66.0),
    'Pressure':             (lambda s: stress(sim.B, s.strains()[1]), 84.8),
    'Vibration':            (lambda s: stress(sim.T, s.strains()[2]), 9.1),
    'MinimumReserve':       (lambda s: s.capBatt * sim.RESERVE_FRACTION, 1.0),
}

# The clean ceilings quoted throughout the spec, slack store and fully strained.
SPEC_CEILINGS = {
    'Pulverizer ceiling':   (0, 0.667, 0.296),
    'Boiler ceiling':       (1, 0.694, 0.309),
    'Turbine ceiling':      (2, 0.833, 0.370),
}

# Each machine must still reach exactly MaxStress at MaxSetting with a slack store, which
# is what folding the old starting control into the range constant was chosen to preserve.
SPEC_MAX_STRESS = {
    'Pulverizer at MaxSetting': (sim.P, 150.0),
    'Boiler at MaxSetting':     (sim.B, 236.0),
    'Turbine at MaxSetting':    (sim.T, 13.0),
}

failures = []


def check(name, got, want, tol):
    ok = abs(got - want) <= tol
    print(f'  {"ok  " if ok else "FAIL"} {name:27} got {got:10.4f}  spec {want}')
    if not ok:
        failures.append(name)


print('OPENING STATE vs ../docs/specs.md')
s0 = sim.State()
for name, (fn, want) in SPEC_OPENING.items():
    check(name, fn(s0), want, max(0.005, abs(want) * 0.002))

print('\nCLEAN CEILINGS vs ../docs/specs.md')


def at(silo_fill, tank_fill):
    s = sim.State()
    s.silo, s.tank = s.capSilo * silo_fill, s.capTank * tank_fill
    return s


# No single state strains all three: the Boiler needs a full Tank and the Turbine an empty
# one, so each machine is put at full strain in a state of its own.
slack = at(0.5, 0.5)
full_strain = {0: at(1.0, 0.5), 1: at(0.5, 1.0), 2: at(0.5, 0.0)}
for name, (i, want_slack, want_strained) in SPEC_CEILINGS.items():
    check(name + ' slack', slack.ceilings()[i], want_slack, 0.002)
    check(name + ' strained', full_strain[i].ceilings()[i], want_strained, 0.002)

print('\nMAX STRESS AT MaxSetting (slack store)')
for name, (m, want) in SPEC_MAX_STRESS.items():
    check(name, m['base'] + m['rng'] * sim.MAX_SETTING, want, 0.05)

print('\nENERGY BALANCE')
s = sim.run(POL, 0.1)
lhs = sim.STARTING_CHARGE + s.generated
rhs = s.batt + s.machine_use + s.coal_cost + s.spent
print(f'  in  : start {sim.STARTING_CHARGE:.2f} + stored {s.generated:.2f} = {lhs:.2f} MWh')
print(f'  out : final {s.batt:.2f} + machines {s.machine_use:.2f} + coal {s.coal_cost:.2f}'
      f' + upgrades {s.spent:.2f} = {rhs:.2f} MWh')
check('residual', lhs - rhs, 0.0, 1e-6)
print(f'  (discarded by a full Battery: {s.clipped:.2f} MWh)')

print('\nSTEP-SIZE CONVERGENCE')
# A run is sensitive to dt because purchases are discrete: a marginal upgrade can fire
# one second earlier and compound. Nothing averages that out now that a policy has one
# run in it, so the peak is held to a looser bound than the build, which is the
# structural check -- the same plant reached by a slightly different path.
runs = {dt: sim.run(POL, dt) for dt in (0.4, 0.2, 0.1, 0.05)}
for dt, r in runs.items():
    print(f'  dt={dt:<5} peak {r.peak:7.2f}   upgrade levels {sum(r.levels.values()):6.0f}')

fine = [0.2, 0.1, 0.05]     # dt=0.4 is too coarse to use and is reported for contrast
peaks = [runs[dt].peak for dt in fine]
check('peak spread, dt<=0.2', (max(peaks) - min(peaks)) / st.mean(peaks), 0.0, 0.06)
lvls = [sum(runs[dt].levels.values()) for dt in fine]
check('build spread, dt<=0.2', (max(lvls) - min(lvls)) / st.mean(lvls), 0.0, 0.02)

print('\nRESTART FLOOR (MinimumReserve must never sit below a restart)')
r = sim.run(POL, 0.1)
# Clamped at zero: the check is that the gap never turns positive, and printing how far
# below the floor a comfortable run sits would say nothing about the rule.
check('max startup - reserve', max(0.0, r.startup_energy() - r.reserve()), 0.0, 0.0)

print('\nFAILED: ' + ', '.join(failures) if failures else '\nall checks passed')
raise SystemExit(1 if failures else 0)
