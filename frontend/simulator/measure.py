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

SWEEP_GRID = dict(
    ride=[1.0, 1.15, 1.3, 1.45, 1.6],
    backoff=['all', 'turbine'],
    wear_hi=[0.85], wear_lo=[0.15],
    slack=[1.0, 1.15, 1.3, 1.6],
    buffer=[45.0],
    t_stop=[260.0, 320.0, 380.0, 440.0, 500.0],
)

# best policies from the last full sweep; --quick starts here instead of re-sweeping
KNOWN_BEST = [
    dict(ride=1.15, backoff='turbine', slack=1.30, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=45.0),
    dict(ride=1.15, backoff='turbine', slack=1.15, t_stop=440.0, wear_hi=0.85, wear_lo=0.15, buffer=45.0),
    dict(ride=1.15, backoff='turbine', slack=1.30, t_stop=500.0, wear_hi=0.85, wear_lo=0.15, buffer=45.0),
    dict(ride=1.00, backoff='turbine', slack=1.30, t_stop=500.0, wear_hi=0.85, wear_lo=0.15, buffer=45.0),
]

SEEDS, DT = range(60), 0.1
TARGETS = (60, 70, 75, 80, 85, 90, 100)


def label(pol):
    return (f'ride={pol["ride"]:.2f} back={pol["backoff"]:<7} '
            f'slack={pol["slack"]:.2f} stop={pol["t_stop"]:.0f}')


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

    print(f'\nmedian peak {st.median(best):.0f} MWh  ->  suggested TargetEnergy '
          f'{round(0.8 * st.median(best) / 5) * 5:.0f}  (80% of it, to the nearest 5)')
    print('\nwin rate by candidate TargetEnergy')
    print(f'{"target":>7} {"single policy":>14} {"best-of":>9}')
    for target in TARGETS:
        a = sum(p >= target for p in best) / n
        b = sum(p >= target for p in envelope) / n
        print(f'{target:7} {a:13.0%} {b:8.0%}')


if __name__ == '__main__':
    main()
