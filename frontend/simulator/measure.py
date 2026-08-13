"""Measure TargetEnergy.

Sweeps reinvestment policies, then reports the peak each one reaches. The spec sets
TargetEnergy to roughly 80% of the best peak; the share table is there to move it
deliberately.

The coal price is a function of run time alone, so a policy has one run in it and there
is no distribution to take: a target either sits under the best peak or does not.

Machines have no throttle, so a policy is a buying policy and nothing else. What used to
be a ride point and a back-off rule is now the ladder in `sim.binding` -- buy whichever
stage of the chain has the lowest ceiling -- and the knobs only say how much headroom to
keep and when to stop reinvesting.

    python3 measure.py           # sweep, then measure the best policies
    python3 measure.py --quick   # skip the sweep, use the policies already found
"""
import sys

import sim

# Every axis has to bracket its winner on both sides. Extend an axis; never slide it --
# a grid that ends at its winner is measuring its own edge rather than the game.
SWEEP_GRID = dict(
    headroom=[0.70, 0.85, 0.95],
    buffer=[5.0, 10.0, 15.0, 22.0],
    flow_edge=[1.00, 1.15, 1.30, 1.50],
    eff_bias=[0.5, 1.0, 2.0],
    batt_at=[0.5, 0.7, 0.85],
    wear_at=[0.20, 0.35, 0.50],
    t_stop=[380.0, 440.0, 500.0, 560.0],
)

# The sweep ranks at dt=0.2 and the measurement runs at dt=0.1, and the two orders differ,
# so the top of the sweep is a shortlist rather than an answer. A policy is only believed
# once `spread` below shows its peak does not move with the step size: the ones that score
# highest tend to be the ones running their stores closest to empty, which is exactly where
# a discrete step stops resolving the chain.
# Wide, because the ranking and the gate pull in opposite directions: the policies that
# score highest are the ones running their stores closest to empty, which is exactly where
# a run stops being reproducible. The measurement walks down the list until one converges.
SHORTLIST = 40

# best policies from the last full sweep; --quick starts here instead of re-sweeping.
KNOWN_BEST = [
    dict(headroom=0.85, buffer=15.0, flow_edge=1.00, eff_bias=0.5,
         batt_at=0.85, wear_at=0.35, t_stop=500.0),
]

DT = 0.1

# How far a policy's peak may move between dt=0.2 and dt=0.05 before it is discarded.
# A run whose peak depends on the step size is reporting the discretisation, not the game.
SPREAD_LIMIT = 0.10

# Candidate targets as a share of the measured peak, so the table stays useful at any
# scale. A fixed tuple silently goes off the end of the range after a retune.
TARGET_SHARES = (0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0)


def label(pol):
    return (f'hr={pol["headroom"]:.2f} buf={pol["buffer"]:>4.1f} edge={pol["flow_edge"]:.2f} '
            f'eff={pol["eff_bias"]:.1f} batt={pol["batt_at"]:.2f} '
            f'wear={pol["wear_at"]:.2f} stop={pol["t_stop"]:.0f}')


def blind(pol):
    """The same policy from a player who never reads a stress or wear gauge.

    It climbs the same ladder and sizes its stores the same way -- so it is not simply a
    crippled build -- but it never spends on Tolerance, which is the only purchase whose
    whole purpose is what the gauges report. The gap between this and the policy it copies
    is what reading them is worth.
    """
    return dict(pol, headroom=99.0, wear_at=99.0)


def main():
    if '--quick' in sys.argv:
        policies = KNOWN_BEST
    else:
        total = 1
        for values in SWEEP_GRID.values():
            total *= len(values)
        print(f'sweeping {total} policies...')
        policies = [p for _, p in sim.sweep(SWEEP_GRID)[:SHORTLIST]]

    print(f'\nmeasuring {len(policies)} policies at dt={DT}\n')
    print(f'{"policy":72} {"peak":>8} {"spread":>7} {"trips":>6} {"levels":>7}')
    peaks = []
    for pol in policies:
        result = sim.run(pol, DT)
        across = [sim.run(pol, dt).peak for dt in (0.2, DT, 0.05)]
        spread = (max(across) - min(across)) / (sum(across) / len(across))
        # A peak that moves with the step size is not a measurement of the game
        peaks.append(0.0 if spread > SPREAD_LIMIT else result.peak)
        print(f'{label(pol):72} {result.peak:8.0f} {spread:6.1%}{"!" if spread > SPREAD_LIMIT else " "} '
              f'{sum(result.trips.values()):6.0f} {sum(result.levels.values()):7.0f}')

    best = max(peaks)

    if best <= 0:
        print(f'\nno policy converged: every one of the {len(policies)} measured moved its '
              f'peak by more than {SPREAD_LIMIT:.0%} across the step size.')
        print('There is no target to take from this economy until that is fixed.')
        return

    top = policies[peaks.index(best)]
    print(f'\nbest converging policy: {label(top)}')

    ignored = sim.run(blind(top), DT).peak
    print(f'never buying Tolerance: {ignored:.0f} MWh against {best:.0f} '
          f'-- a {1 - ignored / best:.0%} penalty')

    print(f'\nbest peak {best:.0f} MWh  ->  suggested TargetEnergy '
          f'{round(0.8 * best / 5) * 5:.0f}  (80% of it, to the nearest 5)')
    print('\ncandidate TargetEnergy by share of that peak')
    print(f'{"target":>8} {"of peak":>9}')
    for share in TARGET_SHARES:
        print(f'{round(share * best / 5) * 5:8} {share:8.0%}')


if __name__ == '__main__':
    main()
