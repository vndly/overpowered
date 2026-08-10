"""Measure TargetEnergy.

Sweeps reinvestment policies, then reports the peak each one reaches. The spec sets
TargetEnergy to roughly 80% of the best peak; the share table is there to move it
deliberately.

The coal price is a function of run time alone, so a policy has one run in it and there
is no distribution to take: what used to be a median over 60 market seeds and a win rate
against them is now a single peak, and a target either sits under it or does not.

    python3 measure.py           # sweep, then measure the best policies
    python3 measure.py --quick   # skip the sweep, use the policies already found
"""
import sys

import sim

# `buffer` dominates the sweep and wants small values: every second of stock a store is
# sized and filled to is storage capacity bought and coal held instead of energy banked.
# It reaches down to 0.5 s because the grid's floor was the winner at every wider setting
# tried, which means a floor set too high silently caps the measured peak. Below about 2 s
# the axis saturates -- `band()` clamps the target fill into the strain-free window anyway,
# and the storage-purchase rule stops firing -- so 0.5 is there to demonstrate the floor,
# not because anything is expected to move.
#
# Every axis has to bracket its winner on both sides. Widening the Efficiency band moved
# the winner on four of them at once, and the first attempt at rewidening this grid pushed
# the low ends out while quietly dropping `ride` 1.75 and `t_stop` 380 off the high and low
# ends -- which promptly became the new winners. Extend an axis; do not slide it.
SWEEP_GRID = dict(
    ride=[1.3, 1.45, 1.6, 1.75, 1.9],
    backoff=['all', 'turbine'],
    wear_hi=[0.85], wear_lo=[0.15],
    slack=[1.6, 2.0, 2.5, 3.0, 3.5, 4.0],
    buffer=[0.5, 1.0, 2.0, 3.0],
    t_stop=[320.0, 380.0, 440.0, 500.0],
)

# best policies from the last full sweep; --quick starts here instead of re-sweeping.
# The sweep ranks at dt=0.2 and the measurement runs at dt=0.1, so the order here is not
# the order they finish in -- the third of these is the one that peaks highest.
KNOWN_BEST = [
    dict(ride=1.60, backoff='turbine', slack=1.60, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=0.5),
    dict(ride=1.75, backoff='turbine', slack=2.00, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
    dict(ride=1.60, backoff='all', slack=3.00, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
    dict(ride=1.60, backoff='all', slack=3.50, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
]

DT = 0.1

# Candidate targets as a share of the measured peak, so the table stays useful at any
# scale. A fixed tuple silently goes off the end of the range after a retune.
TARGET_SHARES = (0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0)


def label(pol):
    return (f'ride={pol["ride"]:.2f} back={pol["backoff"]:<7} slack={pol["slack"]:.2f} '
            f'buf={pol["buffer"]:.0f} stop={pol["t_stop"]:.0f}')


def main():
    if '--quick' in sys.argv:
        policies = KNOWN_BEST
    else:
        print(f'sweeping {len(list(sim.itertools.product(*SWEEP_GRID.values())))} policies...')
        policies = [p for _, p in sim.sweep(SWEEP_GRID)[:4]]

    print(f'\nmeasuring {len(policies)} policies at dt={DT}\n')
    print(f'{"policy":48} {"peak":>6} {"trips":>6} {"levels":>7}')
    peaks = []
    for pol in policies:
        result = sim.run(pol, DT)
        peaks.append(result.peak)
        print(f'{label(pol):48} {result.peak:6.0f} {sum(result.trips.values()):6.0f} '
              f'{sum(result.levels.values()):7.0f}')

    best = max(peaks)
    print(f'\nbest peak {best:.0f} MWh  ->  suggested TargetEnergy '
          f'{round(0.8 * best / 5) * 5:.0f}  (80% of it, to the nearest 5)')
    print('\ncandidate TargetEnergy by share of that peak')
    print(f'{"target":>7} {"of peak":>9}')
    for share in TARGET_SHARES:
        print(f'{round(share * best / 5) * 5:7} {share:8.0%}')


if __name__ == '__main__':
    main()
