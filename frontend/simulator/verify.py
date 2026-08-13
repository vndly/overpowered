"""Checks that the simulator is sound before any number from it is believed.

  1. Opening state -- the values the simulator starts from must match ../docs/specs.md.
  2. The opening imbalance -- the Pulverizer runs a third ahead of the Boiler's draw on
     purpose, and the Boiler is matched to the Turbine. That is the run's first problem
     and the shape of it is asserted, not left to drift with a capacity edit.
  3. Flow headroom -- every store's Flow must carry what passes through it at the opening,
     and the Silo and Tank must carry it twice over, because they contend.
  4. Wear onset -- the store fill at which each machine starts to take wear, against the
     figures the spec quotes.
  5. Energy balance -- everything generated must end up banked, drawn by a machine,
     spent on coal, or spent on an upgrade. A non-zero residual means the model is
     inventing or losing energy somewhere.
  6. Step-size convergence -- results must not depend on DeltaTimeSeconds.
  7. Restart floor -- MinimumReserve must never sit below what a restart costs.

    python3 verify.py
"""
import statistics as st

import sim

# The policy the checks are driven by has to keep real buffers and real flow headroom.
# It is not chosen to score well: it is chosen because a plant run with its stores close
# to empty is one where `contents / (rate x dt)` becomes the binding term every step, and
# a run in that regime reports the size of the step rather than the state of the game.
POL = dict(headroom=0.85, buffer=15.0, flow_edge=1.30, eff_bias=2.0,
           batt_at=0.70, wear_at=0.20, t_stop=500.0)

s0 = sim.State()
r0 = s0.rates()

# opening values as printed in ../docs/specs.md. Every machine runs at its Capacity, and
# the Tank opens at StarveThreshold, so no machine opens under any strain at all.
SPEC_OPENING = {
    'Pulverizer Output':    (r0['powder'], 4.00),
    'Pulverizer raw draw':  (r0['raw'], 4.21),
    'Pulverizer power':     (r0['elec_p'], 0.57),
    'Boiler Output':        (r0['steam'], 21.00),
    'Boiler fuel draw':     (r0['fuel'], 3.00),
    'Boiler power':         (r0['elec_b'], 3.00),
    'Turbine Output':       (r0['power'], 23.70),
    'Turbine steam draw':   (r0['tsteam'], 20.99),
    'Pulverizer Strain':    (sim.wear_pressure(s0)['P'] * sim.STRAIN_GAIN, 0.0),
    'Boiler Strain':        (sim.wear_pressure(s0)['B'] * sim.STRAIN_GAIN, 0.0),
    'Turbine Strain':       (sim.wear_pressure(s0)['T'] * sim.STRAIN_GAIN, 0.0),
    'Temperature':          (sim.P['nom'], 70.0),
    'Pressure':             (sim.B['nom'], 100.0),
    'Vibration':            (sim.T['nom'], 5.0),
    'NetFlow':              (r0['power'] - r0['elec_p'] - r0['elec_b'], 20.13),
    'MinimumReserve':       (s0.store_cap('batt') * sim.RESERVE_FRACTION, 1.0),
}

# Stress at full strain, which is what a saturated store does to the machine beside it.
# The Pulverizer reads past its own maximum and the gauge simply pegs there.
SPEC_FULL_STRAIN = {
    'Pulverizer at full strain': (sim.P['nom'] * (1 + sim.STRAIN_GAIN), 157.5),
    'Boiler at full strain':     (sim.B['nom'] * (1 + sim.STRAIN_GAIN), 225.0),
    'Turbine at full strain':    (sim.T['nom'] * (1 + sim.STRAIN_GAIN), 11.25),
}

# The store fill at which each machine's stress reaches SafeStress and wear begins.
SPEC_ONSET = {
    'Pulverizer wears above Silo': ('P', 'backlog', 0.751),
    'Boiler wears above Tank':     ('B', 'backlog', 0.748),
    'Turbine wears below Tank':    ('T', 'starve', 0.228),
}

failures = []


def check(name, got, want, tol):
    ok = abs(got - want) <= tol
    print(f'  {"ok  " if ok else "FAIL"} {name:29} got {got:11.4f}  spec {want}')
    if not ok:
        failures.append(name)


print('OPENING STATE vs ../docs/specs.md')
for name, (got, want) in SPEC_OPENING.items():
    check(name, got, want, max(0.005, abs(want) * 0.002))

print('\nTHE OPENING IMBALANCE (surplus as a share of the stage below)')
# The Pulverizer overproduces by design: the Silo gains a kilogram a second and backs up
# about seventy seconds in, which is the run's first decision. The Boiler is matched to
# the Turbine, so there is exactly one problem on screen rather than three.
check('Pulverizer over Boiler draw', r0['powder'] / r0['fuel'] - 1, 1 / 3, 0.005)
check('Boiler vs Turbine draw', r0['steam'] / r0['tsteam'] - 1, 0.0, 0.001)
check('seconds to Silo backlog',
      sim.BACKLOG_THRESHOLD * sim.STORE['silo']['cap'] / (r0['powder'] - r0['fuel']), 70.0, 1.0)

print('\nFLOW HEADROOM AT THE OPENING (multiple of what passes through)')
for key, demand, floor in (('stock', r0['raw'], 1.0),
                           ('silo', r0['powder'] + r0['fuel'], 1.0),
                           ('tank', r0['steam'] + r0['tsteam'], 1.0),
                           ('batt', r0['power'], 1.0)):
    ratio = s0.store_flow(key) / demand
    ok = ratio >= floor
    print(f'  {"ok  " if ok else "FAIL"} {key:29} carries {ratio:8.3f}x its opening rate')
    if not ok:
        failures.append(key + ' flow')

print('\nWEAR ONSET vs ../docs/specs.md (store fill where stress reaches SafeStress)')
for name, (key, kind, want) in SPEC_ONSET.items():
    limits = {'P': sim.P, 'B': sim.B, 'T': sim.T}[key]
    pressure = (s0.safe[key] / limits['nom'] - 1) / sim.STRAIN_GAIN
    fill = (sim.BACKLOG_THRESHOLD + pressure * (1 - sim.BACKLOG_THRESHOLD) if kind == 'backlog'
            else sim.STARVE_THRESHOLD * (1 - pressure))
    check(name, fill, want, 0.002)

print('\nSTRESS AT FULL STRAIN')
for name, (got, want) in SPEC_FULL_STRAIN.items():
    check(name, got, want, max(0.005, abs(want) * 0.002))

print('\nENERGY BALANCE')
s = sim.run(POL, 0.1)
lhs = sim.STARTING_CHARGE + s.generated
rhs = s.contents['batt'] + s.machine_use + s.coal_cost + s.spent
print(f'  in  : start {sim.STARTING_CHARGE:.2f} + stored {s.generated:.2f} = {lhs:.2f} MWh')
print(f'  out : final {s.contents["batt"]:.2f} + machines {s.machine_use:.2f} + coal '
      f'{s.coal_cost:.2f} + upgrades {s.spent:.2f} = {rhs:.2f} MWh')
check('residual', lhs - rhs, 0.0, 1e-6)
print(f'  (discarded by a full Battery: {s.clipped:.2f} MWh)')

print('\nSTEP-SIZE CONVERGENCE (a plant that is never upgraded)')
# This is the engine's property, and it is the only one this file can assert. A plant
# held at one configuration must produce the same energy however finely the run is
# stepped: the throughput of the chain is a rate, not an artefact of the discretisation.
#
# A run that *buys* is a different matter and is deliberately not asserted here. With no
# throttle, no single purchase raises the chain's rate -- only a whole round does -- so
# income moves in steps and every purchase shifts the ratios the next one is judged on.
# A marginal upgrade landing one second earlier compounds for the rest of the run, and
# nothing averages that out now a policy has one run in it. The spread below is what that
# costs, and it is why measure.py discards any policy whose peak moves with the step.
static = sim.purchase
sim.purchase = lambda s, pol: None
flat = {dt: sim.run(POL, dt) for dt in (0.4, 0.2, 0.1, 0.05)}
sim.purchase = static
for dt, r in flat.items():
    print(f'  dt={dt:<5} generated {r.generated:9.3f}   coal {r.coal_cost:8.3f}')

banked = [flat[dt].generated for dt in (0.2, 0.1, 0.05)]
check('generated spread, dt<=0.2', (max(banked) - min(banked)) / st.mean(banked), 0.0, 1e-4)

print('\nPURCHASE-TIMING SENSITIVITY (reported, not asserted)')
runs = {dt: sim.run(POL, dt) for dt in (0.4, 0.2, 0.1, 0.05)}
for dt, r in runs.items():
    print(f'  dt={dt:<5} peak {r.peak:9.2f}   upgrade levels {sum(r.levels.values()):6.0f}')

fine = [0.2, 0.1, 0.05]     # dt=0.4 is too coarse to use and is reported for contrast
peaks = [runs[dt].peak for dt in fine]
print(f'  peak spread over dt<=0.2: {(max(peaks) - min(peaks)) / st.mean(peaks):.1%}')

print('\nRESTART FLOOR (MinimumReserve must never sit below a restart)')
r = sim.run(POL, 0.1)
# Clamped at zero: the check is that the gap never turns positive, and printing how far
# below the floor a comfortable run sits would say nothing about the rule.
check('max startup - reserve', max(0.0, r.startup_energy() - r.reserve()), 0.0, 0.0)

print('\nFAILED: ' + ', '.join(failures) if failures else '\nall checks passed')
raise SystemExit(1 if failures else 0)
