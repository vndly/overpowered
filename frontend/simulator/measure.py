"""Measure TargetEnergy.

Sweeps reinvestment policies, then reports the peak distribution and the strong-play
win rate at candidate targets. The spec sets TargetEnergy to roughly 80% of the median
peak; the win-rate table is there to move it deliberately.

    python3 measure.py           # sweep, then measure the best policies
    python3 measure.py --quick   # skip the sweep, use the policies already found
"""
import statistics as st
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

# best policies from the last full sweep; --quick starts here instead of re-sweeping
KNOWN_BEST = [
    dict(ride=1.60, backoff='all', slack=2.50, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
    dict(ride=1.60, backoff='all', slack=2.50, t_stop=500.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
    dict(ride=1.60, backoff='all', slack=2.00, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
    dict(ride=1.60, backoff='all', slack=3.00, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=1.0),
]

SEEDS, DT = range(60), 0.1

# Candidate targets as a share of the measured median peak, so the table stays useful at
# any scale. A fixed tuple silently goes off the end of the distribution after a retune.
TARGET_SHARES = (0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0)


def label(pol):
    return (f'ride={pol["ride"]:.2f} back={pol["backoff"]:<7} slack={pol["slack"]:.2f} '
            f'buf={pol["buffer"]:.0f} stop={pol["t_stop"]:.0f}')


def pct(peaks, q):
    return peaks[min(len(peaks) - 1, int(len(peaks) * q))]


def main():
    if '--quick' in sys.argv:
        policies = KNOWN_BEST
    else:
        print(f'sweeping {len(list(sim.itertools.product(*SWEEP_GRID.values())))} policies '
              f'over 6 seeds...')
        policies = [p for _, _, _, p in sim.sweep(SWEEP_GRID, seeds=range(6))[:4]]

    print(f'\nmeasuring {len(policies)} policies over {len(list(SEEDS))} seeds at dt={DT}\n')
    print(f'{"policy":48} {"min":>6} {"p25":>6} {"med":>6} {"mean":>6} {"p75":>6} {"max":>6}')
    cols = []
    for pol in policies:
        peaks = sorted(sim.run(pol, sd, DT).peak for sd in SEEDS)
        cols.append(peaks)
        print(f'{label(pol):48} {peaks[0]:6.0f} {pct(peaks, .25):6.0f} {st.median(peaks):6.0f} '
              f'{st.mean(peaks):6.0f} {pct(peaks, .75):6.0f} {peaks[-1]:6.0f}')

    n = len(list(SEEDS))
    envelope = sorted(max(c[i] for c in cols) for i in range(n))
    best = max(cols, key=st.median)
    print(f'{"best-of-policies envelope":48} {envelope[0]:6.0f} {pct(envelope, .25):6.0f} '
          f'{st.median(envelope):6.0f} {st.mean(envelope):6.0f} {pct(envelope, .75):6.0f} '
          f'{envelope[-1]:6.0f}')

    median = st.median(best)
    print(f'\nmedian peak {median:.0f} MWh  ->  suggested TargetEnergy '
          f'{round(0.8 * median / 5) * 5:.0f}  (80% of it, to the nearest 5)')
    print('\nwin rate by candidate TargetEnergy')
    print(f'{"target":>7} {"of median":>10} {"single policy":>14} {"best-of":>9}')
    for share in TARGET_SHARES:
        target = round(share * median / 5) * 5
        a = sum(p >= target for p in best) / n
        b = sum(p >= target for p in envelope) / n
        print(f'{target:7} {share:9.0%} {a:13.0%} {b:8.0%}')


if __name__ == '__main__':
    main()
