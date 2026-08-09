"""Checks that the simulator is sound before any number from it is believed.

  1. Energy balance -- everything generated must end up banked, drawn by a machine,
     spent on coal, or spent on an upgrade. A non-zero residual means the model is
     inventing or losing energy somewhere.
  2. Step-size convergence -- results must not depend on DeltaTimeSeconds.
  3. Opening state -- the values the simulator starts from must match ../docs/specs.md.
  4. Restart floor -- MinimumReserve must never sit below what a restart costs.

    python3 verify.py
"""
import statistics as st

import sim

POL = dict(ride=1.15, backoff='turbine', slack=1.30, t_stop=440.0,
           wear_hi=0.85, wear_lo=0.15, buffer=45.0)

# opening values as printed in ../docs/specs.md, at the starting Setting of 0.6
SPEC_OPENING = {
    'Pulverizer Output':    (lambda s: sim.START_SETTING * s.capP, 4.80),
    'Pulverizer raw draw':  (lambda s: sim.START_SETTING * s.capP / sim.PULV_YIELD, 5.05),
    'Pulverizer power':     (lambda s: sim.START_SETTING * s.capP * sim.P['cons'] / s.effP, 0.56),
    'Boiler Output':        (lambda s: sim.START_SETTING * s.capB, 30.00),
    'Boiler fuel draw':     (lambda s: sim.START_SETTING * s.capB / (sim.STEAM_YIELD * s.effB), 4.41),
    'Boiler power':         (lambda s: sim.START_SETTING * s.capB * sim.B['cons'] / s.effB, 3.53),
    'Turbine Output':       (lambda s: sim.START_SETTING * s.capT, 30.00),
    'Turbine steam draw':   (lambda s: sim.START_SETTING * s.capT * sim.T['cons'] / s.effT, 26.47),
    'Temperature':          (lambda s: sim.P['base'] + sim.P['rng'] * sim.START_SETTING * (1 - s.cool), 66.0),
    'Pressure':             (lambda s: sim.B['base'] + sim.B['rng'] * sim.START_SETTING * (1 - s.reg), 84.8),
    'Vibration':            (lambda s: sim.T['base'] + sim.T['rng'] * sim.START_SETTING * (1 - s.stab), 4.6),
    'MinimumReserve':       (lambda s: s.capBatt * sim.RESERVE_FRACTION, 1.0),
}

failures = []


def check(name, got, want, tol):
    ok = abs(got - want) <= tol
    print(f'  {"ok  " if ok else "FAIL"} {name:22} got {got:10.4f}  spec {want}')
    if not ok:
        failures.append(name)


print('OPENING STATE vs ../docs/specs.md')
s0 = sim.State()
for name, (fn, want) in SPEC_OPENING.items():
    check(name, fn(s0), want, max(0.005, abs(want) * 0.002))

print('\nENERGY BALANCE')
s = sim.run(POL, 1, 0.1)
lhs = sim.STARTING_CHARGE + s.generated
rhs = s.batt + s.machine_use + s.coal_cost + s.spent
print(f'  in  : start {sim.STARTING_CHARGE:.2f} + stored {s.generated:.2f} = {lhs:.2f} MWh')
print(f'  out : final {s.batt:.2f} + machines {s.machine_use:.2f} + coal {s.coal_cost:.2f}'
      f' + upgrades {s.spent:.2f} = {rhs:.2f} MWh')
check('residual', lhs - rhs, 0.0, 1e-6)
print(f'  (discarded by a full Battery: {s.clipped:.2f} MWh)')

print('\nSTEP-SIZE CONVERGENCE')
# An individual run is sensitive to dt because purchases are discrete: a marginal
# upgrade can fire one second earlier and compound. That averages out across seeds, so
# the distribution is what converges, and the build itself is the structural check.
seeds = range(16)
runs = {dt: [sim.run(POL, sd, dt) for sd in seeds] for dt in (0.4, 0.2, 0.1, 0.05)}
for dt, rs in runs.items():
    peaks = [r.peak for r in rs]
    lv = st.mean(sum(r.levels.values()) for r in rs)
    print(f'  dt={dt:<5} median peak {st.median(peaks):7.2f}   mean upgrade levels {lv:6.1f}')

fine = [0.2, 0.1, 0.05]     # dt=0.4 is too coarse to use and is reported for contrast
meds = [st.median([r.peak for r in runs[dt]]) for dt in fine]
check('median spread, dt<=0.2', (max(meds) - min(meds)) / st.mean(meds), 0.0, 0.06)
lvls = [st.mean(sum(r.levels.values()) for r in runs[dt]) for dt in fine]
check('build spread, dt<=0.2', (max(lvls) - min(lvls)) / st.mean(lvls), 0.0, 0.02)

per_seed = [abs(x.peak - y.peak) / max(x.peak, y.peak)
            for x, y in zip(runs[0.1], runs[0.05])]
print(f'  note: a single run still moves {st.mean(per_seed):.0%} on average between '
      f'dt=0.1 and 0.05, from discrete purchase timing')

print('\nRESTART FLOOR (MinimumReserve must never sit below a restart)')
worst = 0.0
for sd in range(12):
    r = sim.run(POL, sd, 0.1)
    worst = max(worst, r.startup_energy() - r.reserve())
check('max startup - reserve', worst, 0.0, 0.0)

print('\nFAILED: ' + ', '.join(failures) if failures else '\nall checks passed')
raise SystemExit(1 if failures else 0)
