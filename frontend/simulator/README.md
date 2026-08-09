# Simulator

A reference implementation of [`../docs/specs.md`](../docs/specs.md), used to measure
`TargetEnergy`. The spec sets that constant to roughly 80% of the peak Battery Contents
reachable under strong play, and says it must be re-measured whenever the economy is
retuned — this is what does the measuring.

It is a design tool, not part of the application. No dependencies beyond the Python
standard library, and nothing here is built, linted, or shipped by the frontend.

## Running

```sh
cd simulator
python3 verify.py           # soundness checks -- run this first, exits non-zero on failure
python3 measure.py          # sweep policies, then report the peak distribution (~2 min)
python3 measure.py --quick  # skip the sweep, reuse the policies already found (~30 s)
```

## After retuning the economy

1. Update the constants at the top of `sim.py` to match the spec.
2. Run `verify.py`. Its first section compares the opening state against the values
   printed in the spec's component tables, so a missed constant shows up there.
3. Run `measure.py` and take the suggested `TargetEnergy`, or pick another value from
   the win-rate table it prints.
4. Update the measured figures in the spec's Objective section.

## What "strong play" means here

Optimal play is not computed. `measure.py` sweeps a greedy reinvestment policy over its
knobs — how hard to ride the Turbine, when to back off, how much headroom to buy
upstream, how long to keep reinvesting — and reports the best. The policy keeps the
chain matched to the Turbine's draw, buys upgrades by marginal income per MWh, and
banks after `t_stop`.

That makes every peak a **lower bound** on what a perfect player could reach, so a
target derived from it errs towards the generous. The knobs are described in `sim.py`
above `settings()`.

## What is checked, and what is not

`verify.py` asserts four things:

- **Opening state** matches the spec's component tables, so a constant cannot drift
  out of sync silently.
- **Energy balance** closes exactly: everything generated is banked, drawn by a
  machine, spent on coal, or spent on an upgrade. A residual would mean the model
  invents or loses energy.
- **Step-size convergence** of the distribution and of the build. For `dt <= 0.2` the
  median peak moves under 3% and total upgrade levels under 2%.
- **The restart floor** — `MinimumReserve` never sits below `StartupEnergy`, the
  condition that keeps a stalled chain restartable.

Two things it deliberately does not claim:

- **A single run is not reproducible across step sizes.** Purchases are discrete, so a
  marginal upgrade can fire a second earlier and compound; an individual run moves
  about 12% between `dt = 0.1` and `0.05`. Only the distribution is stable. `dt = 0.4`
  is too coarse to use — it overstates the median by roughly 20%.
- **The measured peak is not an optimum**, for the reason above.

## One deliberate deviation from the spec

The spec advances the coal market once per simulation step, which ties the realised
price path to `DeltaTimeSeconds`. That is fine for the game, where the step is fixed,
but it means two step sizes face different markets on the same seed and convergence
cannot be tested. Here the market walk runs on its own fixed 0.05 s grid
(`MARKET_DT`), so a seed means one market at any step size. The two are equivalent
when `DeltaTimeSeconds` is 0.05.
