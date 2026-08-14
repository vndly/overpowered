# Overpowered

## Objective

A game is a single timed run. The player wins by raising the Battery's stored energy to `TargetEnergy` before `TimeLimit` elapses; the run ends in defeat when the timer expires first.

| Type     | Parameter    | Unit | Description                          | Value |
| -------- | ------------ | ---- | ------------------------------------ | ----: |
| Constant | TargetEnergy | MWh  | Stored energy that wins the run      |   210 |
| Constant | TimeLimit    | s    | Time available to reach TargetEnergy |   600 |

- The win is checked against `Battery Contents` — energy that has been generated and then spent is not banked. Reaching the target requires a Battery `Capacity` of at least `TargetEnergy`.
- The win triggers the instant `Contents ≥ TargetEnergy`, at any point during the run.
- On defeat the run ends and every component resets to its starting value. The highest stored energy reached is recorded as the player's best result.
- Because upgrades compound, the central decision of a run is _when to stop reinvesting and start banking_: energy spent on upgrades is energy not counted toward the target, but an under-built plant cannot fill the Battery before the timer expires.

`TargetEnergy` is set to roughly 80% of the peak achievable under strong play with these parameters, and must be re-measured whenever the economy is retuned.

The current value was measured with [`simulator/`](../simulator/), which implements this document. The coal price is a function of run time alone, so a greedy reinvestment policy has exactly one run in it and there is no distribution to take: the best **converging** policy of 5,184 swept reaches a **peak of 263 MWh**, and 210 is 80% of that. Candidate targets as shares of that peak, which is what `measure.py` prints:

| TargetEnergy      | 130 | 160 | 185 | 195 | 210 | 235 |  265 |
| ----------------- | --: | --: | --: | --: | --: | --: | ---: |
| Share of the peak | 50% | 60% | 70% | 75% | 80% | 90% | 100% |

**This number has a wider error bar than any before it, and the reason is structural.** Two caveats attach to it, and the second is the serious one.

The first is the usual one: the policy measured is a strong heuristic rather than proven-optimal play, so the true peak sits at or above 263 and the target errs towards the generous.

The second is that most policies do not converge. Because no single purchase raises the chain's rate — only a whole round does, see [The round](#the-round) — income moves in steps, and every purchase shifts the ratios the next one is judged on. A marginal upgrade landing one second earlier compounds for the rest of the run. Measured across `DeltaTimeSeconds` of 0.2, 0.1 and 0.05, most swept policies move their peak by more than 100%, and the highest-scoring ones move it most: they are the ones running their stores closest to empty, which is exactly where a discrete step stops resolving the chain. `measure.py` therefore discards any policy whose peak moves by more than 10% and walks down its shortlist to the best one that holds still. 284 is that policy; the discarded ones reached several times it.

The engine itself is not in question. A plant that is never upgraded produces the same energy at every step size to within 0.04% — `verify.py` asserts exactly that, and reports the purchase-timing spread separately without asserting on it. What is in question is whether a target measured off a chaotic economy means what a target is supposed to mean.

No earlier value is comparable. Every figure before this one was measured against a plant whose machines carried a player-controlled `Setting`, where a single capacity upgrade could be absorbed by moving a throttle. With the throttle gone, raising the chain's rate takes a level on each of seven stages rather than one purchase — see [The round](#the-round) — and the whole cost structure was re-derived around that.

One rule survives every retune and is worth stating on its own: **a measurement grid must bracket its winner on every axis, not end at it.** Extend an axis; never slide it.

### Stalling

A run is lost immediately, without waiting for the timer, when the Stockpile, Silo, Tank, and Battery are all empty at the same time. In that state nothing can produce and nothing can be bought, so the run cannot be recovered.

Machines have no throttle, so this is reached by building rather than by operating: the Pulverizer and Boiler draw electricity in proportion to their `Capacity`, and a plant whose front two stages are built far past what the Turbine can convert consumes more than it generates. Buying capacity out of order is what drains the Battery, and it does so quietly, because a bigger plant looks like progress. Ending the run at once states the outcome plainly instead of leaving the player watching a dead plant until the clock expires.

## Production flow

```text
Stockpile -> Pulverizer -> Silo -> Boiler -> Tank -> Turbine -> Battery
```

The Stockpile, Silo, Tank, and Battery are storage components. Their stored amounts are clamped between zero and their current capacity. Output produced beyond the available storage capacity is silently discarded.

**Machines have no operating control.** A machine always runs, and its `Output` is its `Capacity`. How far it actually runs is set by what reaches it, as described under [Simulation step](#simulation-step):

- When a machine's output storage is full, the machine continues running without pausing. It continues consuming its normal inputs and electricity, and any output that cannot be stored is silently discarded.
- A machine only consumes resources while it is running. The rates in the component tables assume that input, storage flow, and electricity are available.
- During each simulation step, the amount added to output storage is `min(ProducedOutput, Capacity − Contents)`. The remaining `ProducedOutput` is discarded. This rule also applies to electricity produced while the Battery is full.
- Discarded output is paid for. A machine running faster than the stage below it consumes coal, fuel, or electricity for output that never lands — see [The opening imbalance](#the-opening-imbalance).
- A machine tripped by wear runs at zero for `RepairSeconds`, then resumes. See [Stress and wear](#stress-and-wear).

Storage capacities and storage flow rates can only be increased by purchasing upgrades. All storage components start empty except the Battery, which starts with `StartingCharge`, and the Tank, which starts half full — see [Tank](#tank).

### Storage flow

Every store has a `Flow`: the rate at which material or energy can move through it. It is a property of the store, not of the machines either side, and it is upgraded separately from `Capacity`.

| Store     | Flow caps               | Contended |
| --------- | ----------------------- | :-------: |
| Stockpile | draw to the Pulverizer  |    no     |
| Silo      | what enters + leaves    |    yes    |
| Tank      | what enters + leaves    |    yes    |
| Battery   | charge from the Turbine |    no     |

The Silo and Tank are **contended**: one `Flow` is divided between what enters and what leaves, so a matched chain needs a `Flow` of at least twice its through-rate at each of them. This is what makes `Flow` a standing constraint rather than a threshold crossed once — every machine capacity upgrade immediately makes the stores either side of it inadequate.

The two endpoints cap one direction only, and neither can block a restart. **A coal purchase lands whole and at once**, so nothing rate-limits what enters a Stockpile — the player's own action is never metered out. The Battery's discharge to the Pulverizer and Boiler is likewise uncapped, so the energy to run a restart is always available at whatever rate the machines want it.

What the Stockpile's `Flow` caps is the draw the other way, out to the Pulverizer. That makes it the first rate in the chain rather than a delay on the player: a Stockpile can be large and slow to empty, or small and quick to feed, and buying either erodes the other exactly as it does on the Silo and the Tank. It throttles a restart rather than blocking one — the Pulverizer still runs, at the fraction the Stockpile can supply.

```text
FlowRatio(store) = min(1, Flow / RequestedThroughput)
```

where `RequestedThroughput` is the sum of what enters and what leaves for the Silo and Tank, and the single capped direction for the Stockpile and Battery. Both sides of a contended store are scaled by the same ratio, so the split does not depend on the order machines are evaluated in.

### Simulation step

A step advances the simulation by `DeltaTimeSeconds`. Every machine reads component state as it stood at the _start_ of the step, and every storage write is applied at the _end_ of the step. No machine sees another machine's output from the same step, so the result does not depend on the order in which machines are evaluated.

Machines throttle rather than stop. A machine that cannot obtain everything it requests runs at the largest fraction of its requested rate that its inputs, its stores' flow, and the Battery support:

```text
RequestedEnergy  = ElectricConsumption × DeltaTimeSeconds / 3,600
InputRatio       = min(1, InputContents / (RequestedInput × DeltaTimeSeconds))
ElectricityRatio = min(1, Battery Contents / TotalRequestedEnergy)
RunRatio         = min(InputRatio, ElectricityRatio, every FlowRatio that applies)
```

The flow ratios that apply to each machine are the store it draws from and the store it pushes into, where those are capped:

| Machine    | Flow ratios that bind        |
| ---------- | ---------------------------- |
| Pulverizer | Stockpile (its supply), Silo |
| Boiler     | Silo, Tank                   |
| Turbine    | Tank, Battery                |

`RequestedInput` is in kg/s and `RequestedEnergy` in MWh, so both ratios are dimensionless. `TotalRequestedEnergy` is the sum across every electricity-consuming machine, which is what makes the electricity share proportional.

Every rate in the machine's table — output, input consumption, and electrical consumption — is multiplied by `RunRatio` for that step. A machine with `RunRatio = 0` is stopped and resumes automatically once its inputs return.

A machine tripped by wear is held at `RunRatio = 0` for the whole of its repair: it requests nothing and produces nothing. Each machine's `Wear`, the coal market, and any coal in delivery are advanced once per step, alongside the storage writes.

When the Battery cannot meet the total demand of the Pulverizer and the Boiler, the available energy is divided between them in proportion to their demand, so both run at the same reduced `ElectricityRatio`. No machine has priority over the other.

The Turbine consumes no electricity, so any steam left in the Tank is always convertible back into energy. Combined with `StartupEnergy` below and the two uncapped directions above, this keeps the chain restartable from any state the player can reach by spending.

## Economy

Energy stored in the Battery, measured in MWh, is the game's only currency. There is no separate money balance.

- The Turbine produces energy and adds it to the Battery.
- The Pulverizer and Boiler consume energy from the Battery while running.
- Buying raw coal immediately deducts its energy cost from the Battery, and the coal lands in the Stockpile at once.
- Every storage and machine upgrade is purchased with energy and immediately deducts its cost from the Battery.
- An upgrade is unavailable when the player cannot pay its full cost. A coal purchase is automatically reduced to the amount that the player can afford.

### Spendable energy

Spending is floored twice, because upgrades and coal need different protections.

| Type     | Parameter       | Unit | Description / Formula                                                    |  Value |
| -------- | --------------- | ---- | ------------------------------------------------------------------------ | -----: |
| Constant | ReserveFraction | %    | Share of Battery Capacity held back from upgrade spending                |   0.10 |
| Constant | StartupSeconds  | s    | Machine runtime the restart floor must cover                             |     30 |
| Constant | RestartMultiple | ×    | Restarts the upgrade floor must leave affordable                         |      2 |
| Variable | StartupEnergy   | MWh  | (Pulverizer + Boiler ElectricConsumption) × StartupSeconds / 3,600       | 0.0298 |
| Variable | MinimumReserve  | MWh  | max(Battery Capacity × ReserveFraction, StartupEnergy × RestartMultiple) |      1 |
| Variable | SpendableEnergy | MWh  | max(0, Battery Contents − MinimumReserve)                                |      3 |

**Upgrades** are limited by `SpendableEnergy`. This is the floor the player sees and plans around: it stops a run from being wrecked by one over-ambitious purchase, and because it is a share of Battery `Capacity` it keeps scaling as the plant grows.

`MinimumReserve` takes the larger of the two terms because they scale with different things, and the share-of-Capacity term alone is not always the larger. It tracks the **Battery**, while `StartupEnergy` tracks **machine** consumption. A player who pours everything into throughput and leaves the Battery behind drives `StartupEnergy` past `Capacity × ReserveFraction`. Past that crossover the upgrade floor sits _below_ the coal floor, so spending upgrades down to the reserve leaves `max(0, Contents − StartupEnergy)` at exactly zero: no coal is purchasable at any price, the chain starves, and nothing can restart it. Holding the reserve at `RestartMultiple` startups keeps a restart affordable at every scale, and costs nothing at base, where `StartupEnergy × 2` is 0.060 MWh against a 1 MWh reserve.

**Coal purchases** are limited by `max(0, Contents − StartupEnergy)` instead. Coal is the only purchase that can restart a stalled chain, so it must remain affordable even at the reserve. `StartupEnergy` is the residue that stops the opposite trap: spending the last of the Battery on coal that there is then no electricity left to pulverize.

**Machines** draw from the full `Contents` and may take it below both floors. The floors restrict discrete spending only; they are not brownout thresholds.

Both floors are denominated in energy rather than coal, so the rising coal price does not break them — it only means the same reserve buys less coal, and a late restart is tighter than an early one. Both are derived from current consumption once the plant is large, so they scale with every capacity upgrade together rather than drifting apart.

The floors cannot cover every case, because the player can always build a plant that consumes more than it generates. That is handled as a loss condition rather than a spending rule; see [Stalling](#stalling).

`StartingCharge` must exceed `MinimumReserve`, otherwise no upgrade is affordable at the start of a run.

### Upgrade costs

Every upgrade track is priced independently and grows geometrically with the number of times that track has been purchased:

`UpgradeCost(n) = BaseCost × CostGrowth^n`

where `n` is the number of upgrades already bought on that track, starting at zero. `BaseCost` and `CostGrowth` are both properties of the track, not global constants.

There are seventeen tracks: three on each machine and two on each store.

| Upgrade track                             | BaseCost (MWh) | CostGrowth |
| ----------------------------------------- | -------------: | ---------: |
| Capacity (Pulverizer, Boiler, Turbine)    |           0.02 |       1.32 |
| Efficiency (Pulverizer, Boiler, Turbine)  |           0.05 |       1.30 |
| Tolerance (Pulverizer, Boiler, Turbine)   |           0.04 |       1.35 |
| Capacity (Stockpile, Silo, Tank, Battery) |           0.02 |       1.32 |
| Flow (Stockpile, Silo, Tank, Battery)     |           0.02 |       1.73 |

#### The round

Every stage of the chain is a `min`. Nothing throttles, so raising what the plant actually delivers means raising **every** stage: the three machine capacities and the four store flows. A single purchase among those seven raises no rate at all — it is worth exactly nothing until the rest of the round follows it.

This is the fact the whole cost structure is built on, and it is the reason `CostGrowth` is gentler than it was when a throttle existed: a growth rate that was a brake on one upgrade is a wall in front of a round of them.

**These four numbers sit on the edge of a cliff, and it is worth stating exactly where the edge is.** Income grows by `CapacityGrowth` per round while a round's cost grows by `CostGrowth`, so the ramp is governed by the ratio between them and compounds either way — there is nothing in the design damping it. Swept over the full 5,184-policy grid, holding everything else fixed:

| Capacity / Flow CostGrowth     | 1.30 / 1.70 | 1.32 / 1.73 | 1.38 / 1.82 | **1.40 / 1.85** | 1.42 / 1.88 | 1.44 / 1.92 |
| ------------------------------ | ----------: | ----------: | ----------: | --------------: | ----------: | ----------: |
| Best converging peak (MWh)     |        none |        none |        none |         **263** |         162 |          88 |
| What the strongest policies do |    run away |    run away |    run away |        converge |    converge |    converge |

Only the 1.40 column has been re-swept since coal purchases became immediate; the others established where the cliff is and have not been re-run. What is claimed here is the shape, not the four losing figures.

**1.40 is the cheapest price at which the strongest policies stop running away**, and therefore the largest measurable game this economy has. Below it the top policies reach tens of thousands of MWh while their peaks swing by 100% to 200% with the simulation step: a number, but not a measurement. Above it the run simply gets smaller.

Sitting on that edge is not a comfortable place for four constants to live, and it is the clearest symptom of what [The round](#the-round) describes. **Any change to the economy invalidates them** — a capacity, an efficiency, or a starting-ratio edit moves the whole curve, and the margin either side is two hundredths. Re-measure over the full grid; never estimate, and never trust a reduced grid, which will report a converging winner the full sweep does not have.

Which end of the round to open at is a real decision, and the two answers are not symmetric:

- Open at the **Pulverizer** and the surplus banks in the Silo. Backlog strain is bounded — the store fills up and stops.
- Open at the **Turbine** and it drains the Tank. Starve strain hits the one machine that generates, and with no throttle there is nothing to do but pay for it.

Upstream-first is therefore the safer climb, and it is what the measured policy does.

#### Every upgrade has a downside

Each track raises one value and erodes another. Machines run a three-cycle; stores run a two-cycle.

| Track            | Raises                          | Erodes         |
| ---------------- | ------------------------------- | -------------- |
| Capacity         | Capacity × CapacityGrowth       | SafeStress     |
| Tolerance        | SafeStress toward MaxTolerance  | Efficiency     |
| Efficiency       | Efficiency toward MaxEfficiency | CapacityFactor |
| Capacity (store) | Capacity × CapacityGrowth       | FlowFactor     |
| Flow (store)     | Flow × FlowGrowth               | CapacityFactor |

The fictions are the machine getting larger and therefore hotter, the machine being derated and armoured and therefore wasteful, and the machine being tuned lean and therefore unable to hold its peak. For a store it is one budget: a large vessel is slow to move material through, and a wide pipe has little room to hold any.

Two shapes carry all of it:

```text
geometric   Value  = Base × Growth^level × Factor
gap-closing Value += (Ceiling − Value) × Gain      raising
            Value -= (Value − Floor) × Share       eroding
```

`Capacity` and `Flow` grow geometrically and are eroded through a `Factor` that starts at 1 and falls toward `FactorFloor`. `Efficiency` and `SafeStress` both rise and fall by closing a share of the gap to a bound. Every penalty is therefore **asymptotic**: no track can drive a stat to nothing, no track ever becomes unbuyable, and the machine can always still run. Over-investing in one track buys a lopsided machine, never a broken one.

| Type     | Parameter         | Unit | Description                                                  | Value |
| -------- | ----------------- | ---- | ------------------------------------------------------------ | ----: |
| Constant | CapacityGrowth    | ×    | Capacity multiplier per capacity upgrade                     |  1.30 |
| Constant | FlowGrowth        | ×    | Flow multiplier per flow upgrade                             |  1.30 |
| Constant | UpgradeGain       | %    | Share of the remaining gap closed by an Efficiency upgrade   |  0.25 |
| Constant | ToleranceGain     | %    | Share of the remaining gap closed by a Tolerance upgrade     |  0.25 |
| Constant | MaxEfficiency     | %    | Highest Efficiency obtainable through upgrades               |  0.95 |
| Constant | MinEfficiency     | %    | Floor Efficiency is eroded toward                            |  0.40 |
| Constant | FactorFloor       | ×    | Floor both Capacity and Flow factors are eroded toward       |  0.55 |
| Constant | CapacityPenalty   | %    | Share of the SafeStress gap a Capacity upgrade erodes        |  0.10 |
| Constant | TolerancePenalty  | %    | Share of the Efficiency gap a Tolerance upgrade erodes       |  0.08 |
| Constant | EfficiencyPenalty | %    | Share of the CapacityFactor gap an Efficiency upgrade erodes |  0.06 |
| Constant | StorePenalty      | %    | Share of the opposite factor's gap a store upgrade erodes    |  0.10 |

`CapacityGrowth` is 1.30 rather than a larger step because a step is what the chain has to absorb. A ×1.5 upgrade throws one stage 50% out of step with its neighbours instantly, and with no throttle the store between them saturates before the rest of the round can be afforded. The step size is a tuning question about how much imbalance a run can survive, not a question about how fast a plant should grow — the pace comes from `CostGrowth`.

`MaxEfficiency` is strictly below 1 — an Efficiency of 1 or greater would make the plant produce energy from nothing.

#### What each track is for

Against a rising coal price the three machine tracks do different jobs, and the two store tracks do a third and fourth:

- **Capacity buys speed.** It scales revenue and coal consumption by the same factor, so it cannot move MWh per tonne. It is what makes a run accelerate, and it is the only track that does.
- **Efficiency buys survival.** It adds a fixed amount to `YieldPerTonne` regardless of the price, so its value holds as the price climbs — see [The coal market](#the-coal-market).
- **Tolerance buys permission to be unbalanced.** It is the only answer to a wearing machine, because there is no throttle to back off with. What it costs is Efficiency, so a plant that survives every drift is a plant that earns less per tonne.

  **Tolerance earns its place, but only just, and only since two other rules changed.** `measure.py` runs the winning policy against a copy of itself that never buys the track. Under an earlier build — coal metered into the Stockpile over time, and a Pulverizer that was throttled by the Stockpile's `Flow` without straining from it — the copy did _better_, 802 MWh against 284: Efficiency compounds into every tonne for the rest of the run, while the wear Tolerance prevents costs one repair. The correct play was to eat the trips, which left the only answer to a wearing machine as the worst purchase in the game.

  Making purchases immediate and making the Stockpile's `Flow` strain the machine it starves flipped it. The same comparison now reads **174 MWh against 263 — a 34% penalty for never buying it**. That is a real margin rather than a comfortable one, and it is worth re-running after any economy change: this track has been on the wrong side of zero before.

- **Store Capacity buys time.** More seconds of mismatch before a strain threshold is crossed, and more room to bank material deliberately.
- **Store Flow buys rate.** It is the only store track that raises what the plant delivers, and under contention it has to be bought twice over.

## Components

### Stockpile

The Stockpile stores raw coal purchased by the player. A purchase is immediate in both directions: the energy cost comes out of the Battery and the coal lands in the Stockpile in the same instant. The UI displays raw coal quantities in metric tonnes (`t`), where `1 t = 1,000 kg`; simulation calculations and machine throughput continue to use kg and kg/s internally.

| Type              | Parameter     | Unit  | Description / Formula                                                                         | Value |
| ----------------- | ------------- | ----- | --------------------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity      | t     | Maximum raw coal that can be stored                                                           |   0.5 |
| Player controlled | Flow          | kg/s  | Rate raw coal can be drawn out to the Pulverizer                                              |    12 |
| Constant          | StartPrice    | MWh/t | Coal price at the start of a run                                                              |     1 |
| Constant          | PriceGrowth   | ×/min | Multiplier applied to the price each minute                                                   |  1.06 |
| Variable          | CoalPrice     | MWh/t | StartPrice × PriceGrowth^(ElapsedSeconds / 60)                                                |     1 |
| Variable          | Contents      | t     | Raw coal currently stored                                                                     |     0 |
| Variable          | PurchasedCoal | t     | min(RequestedCoal, Capacity − Contents, max(0, Battery Contents − StartupEnergy) / CoalPrice) |     — |
| Variable          | PurchaseCost  | MWh   | PurchasedCoal × CoalPrice                                                                     |     — |

The player can buy any positive amount of raw coal, and both `Capacity` and `Flow` can be increased with upgrades. The price itself cannot be upgraded — it is set by the market, and it rises for the whole run.

Buying ahead of the price is worth something, and `Capacity` is what decides how far ahead a player can act — it is the only ceiling on how much cheap coal can be held. `Flow` decides the other half: how fast that coal can reach the Pulverizer, which is what makes a Stockpile large enough to hoard and too slow to feed a real mistake rather than a free one.

#### The coal market

Coal grows more expensive as a run progresses, compounding on a fixed curve:

```text
CoalPrice = StartPrice × PriceGrowth^(ElapsedSeconds / 60)
```

Nothing else moves it. The price at a given second is the same price in every run, so the market is a clock rather than a risk: there is no spike to be caught by and no dip to wait for, and a player who knows the curve knows every price they will ever be quoted. What that removes is a hedging game; what it leaves is the decision the price exists to force, which is that everything bought late costs more than the same thing bought early.

The price reaches 1.79 MWh/t by the end of a 600 s run. What that costs the player depends on how much energy the plant extracts from a tonne of raw coal:

| Plant state                 | Net MWh per tonne of raw coal | Price reaches it at |
| --------------------------- | ----------------------------: | ------------------: |
| Starting Efficiency of 0.70 |                          1.78 |                9:54 |
| Efficiency at its 0.95 cap  |                          3.55 |     after the timer |

Both figures are for a matched chain, which is not what a run opens at — see [The opening imbalance](#the-opening-imbalance). Neither depends on `Capacity` or on storage: a capacity upgrade scales revenue and coal consumption by the same factor, and a storage upgrade buys headroom or rate rather than yield. `Efficiency` is the only track that moves this number — which is also why `Tolerance`, whose price is paid in Efficiency, is a genuine cost and not a formality.

That band is 1.99× wide, because `Efficiency` spans 0.70 to 0.95. A plant that never touches Efficiency reaches break-even moments before the timer expires, while one at `MaxEfficiency` is still earning half of what it earned at the opening price.

A plant running near break-even is also enormously levered to the price. At a yield of 1.78 the margin on a tonne falls from 0.78 MWh at the opening price to nothing by the end of the run; at 3.55 the same climb takes a third of the margin and leaves the rest.

The rising price also sharpens the closing decision. Net income is `Throughput × (YieldPerTonne − CoalPrice)`, and the second factor shrinks all run no matter how large the plant grows, so there is a point past which no reinvestment can pay itself back and banking is the only correct move.

Because the price only ever rises, a full Stockpile is worth more than the energy that bought it, and coal is never cheaper than it is now. The decision in a purchase is therefore not when but how much: energy spent on coal ahead of time is energy not spent on an upgrade that would compound, and coal that cannot be burned before the timer expires is spent for nothing.

### Pulverizer

The Pulverizer converts raw coal supplied by the Stockpile into pulverized coal stored in the Silo.

| Type              | Parameter           | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Pulverized coal throughput                                                        |  4.00 |
| Player controlled | Efficiency          | %     | Electrical consumption performance                                                |  0.70 |
| Player controlled | SafeTemperature     | °C    | Temperature below which no wear accrues; raised by Tolerance                      |    85 |
| Constant          | BaseConsumption     | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | PulverizedCoalYield | kg/kg | Pulverized coal produced per kg of raw coal                                       |  0.95 |
| Constant          | NominalTemperature  | °C    | Temperature running clean, at any Capacity                                        |    70 |
| Constant          | MaxTolerance        | °C    | Highest SafeTemperature obtainable through upgrades                               |   140 |
| Constant          | MinTolerance        | °C    | Floor SafeTemperature is eroded toward by Capacity upgrades                       |    45 |
| Constant          | MaxTemperature      | °C    | Temperature at which wear accrues fastest                                         |   150 |
| Constant          | WearGrowth          | 1/s   | Wear accrued per second at Excess = 1                                             | 0.100 |
| Constant          | WearRecovery        | 1/s   | Wear shed per second while below SafeTemperature                                  | 0.008 |
| Constant          | RepairSeconds       | s     | Time the machine stays offline after tripping                                     |     8 |
| Variable          | Strain              | ×     | StrainGain × Pressure(Silo); see [Buffers and strain](#buffers-and-strain)        |     0 |
| Variable          | Temperature         | °C    | NominalTemperature × (1 + Strain)                                                 |    70 |
| Variable          | ExcessTemperature   | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) |     0 |
| Variable          | Wear                | %     | Damage from running strained; see [Stress and wear](#stress-and-wear)             |     0 |
| Variable          | Output              | kg/s  | Capacity                                                                          |  4.00 |
| Variable          | RawCoalConsumption  | kg/s  | Output / PulverizedCoalYield                                                      |  4.21 |
| Variable          | ElectricConsumption | MW    | (Capacity × BaseConsumption) / Efficiency                                         |  0.57 |

The Pulverizer runs clean until the Silo passes **75.1%** full, and reads 157.5 °C with the Silo packed — past its own maximum, where the gauge pegs. It is the machine that punishes over-building fastest: `WearGrowth` of 0.100/s trips it in ten seconds at full strain.

It is also the machine the run opens out of step: it makes 4.00 kg/s of powder against a 3.00 kg/s draw, so the Silo gains a kilogram a second — see [The opening imbalance](#the-opening-imbalance).

### Silo

The Silo stores pulverized coal produced by the Pulverizer and supplies it to the Boiler. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                                   | Value |
| ----------------- | --------- | ---- | ------------------------------------------------------- | ----: |
| Player controlled | Capacity  | t    | Maximum pulverized coal that can be stored              |   0.1 |
| Player controlled | Flow      | kg/s | Contended: what enters plus what leaves must fit inside |   7.5 |
| Variable          | Contents  | t    | Pulverized coal currently stored                        |     0 |

The Silo is the smallest store in the plant and the tightest, and both are deliberate. It carries 4.00 kg/s in against 3.00 kg/s out, so it **gains a kilogram a second**: it crosses `BacklogThreshold` seventy seconds into a run and is packed at a hundred, and from there the Pulverizer grinding into it cooks. Its `Flow` carries the opening 7.00 kg/s with 7% to spare, so the first Pulverizer capacity upgrade breaks that too.

That is the run's first decision, and it has three answers at different prices: Silo `Capacity` buys seconds, Silo `Flow` buys rate, and Boiler `Capacity` fixes the cause. Only the third stops coal being bought for powder nothing burns — see [The opening imbalance](#the-opening-imbalance).

### Boiler

The Boiler burns pulverized coal supplied by the Silo to produce high-pressure steam stored in the Tank. At base conversion, one kg of pulverized coal produces ten kg of steam; Boiler efficiency reduces the fuel required to reach the requested output.

| Type              | Parameter           | Unit  | Description / Formula                                                      | Value |
| ----------------- | ------------------- | ----- | -------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Steam output                                                               | 21.00 |
| Player controlled | Efficiency          | %     | Fuel and electrical consumption performance                                |  0.70 |
| Player controlled | SafePressure        | bar   | Pressure below which no wear accrues; raised by Tolerance                  |   120 |
| Constant          | BaseConsumption     | MJ/kg | Electrical consumption per kg of steam                                     |   0.1 |
| Constant          | SteamYield          | kg/kg | Base steam produced per kg of pulverized coal                              |    10 |
| Constant          | NominalPressure     | bar   | Pressure running clean, at any Capacity                                    |   100 |
| Constant          | MaxTolerance        | bar   | Highest SafePressure obtainable through upgrades                           |   220 |
| Constant          | MinTolerance        | bar   | Floor SafePressure is eroded toward by Capacity upgrades                   |    70 |
| Constant          | MaxPressure         | bar   | Pressure at which wear accrues fastest                                     |   236 |
| Constant          | WearGrowth          | 1/s   | Wear accrued per second at Excess = 1                                      | 0.040 |
| Constant          | WearRecovery        | 1/s   | Wear shed per second while below SafePressure                              | 0.004 |
| Constant          | RepairSeconds       | s     | Time the machine stays offline after tripping                              |    40 |
| Variable          | Strain              | ×     | StrainGain × Pressure(Tank); see [Buffers and strain](#buffers-and-strain) |     0 |
| Variable          | Pressure            | bar   | NominalPressure × (1 + Strain)                                             |   100 |
| Variable          | ExcessPressure      | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1)      |     0 |
| Variable          | Wear                | %     | Damage from running strained; see [Stress and wear](#stress-and-wear)      |     0 |
| Variable          | Output              | kg/s  | Capacity                                                                   | 21.00 |
| Variable          | FuelConsumption     | kg/s  | Output / (SteamYield × Efficiency)                                         |  3.00 |
| Variable          | ElectricConsumption | MW    | (Capacity × BaseConsumption) / Efficiency                                  |  3.00 |

The Boiler runs clean until the Tank passes **74.8%** full, and reads 225 bar with the Tank packed, just inside its 236 maximum. It opens matched to the Turbine and a third short of the Pulverizer, which makes it the stage the opening is asking to be bought. It is the long debt: `WearGrowth` of 0.040/s against a 40 s repair means it can be ignored for most of a run and costs a fifteenth of the clock when it cannot.

### Tank

The Tank stores high-pressure steam produced by the Boiler and supplies it to the Turbine. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                                   | Value |
| ----------------- | --------- | ---- | ------------------------------------------------------- | ----: |
| Player controlled | Capacity  | t    | Maximum high-pressure steam that can be stored          |   1.5 |
| Player controlled | Flow      | kg/s | Contended: what enters plus what leaves must fit inside |    48 |
| Variable          | Contents  | t    | High-pressure steam currently stored; starts half full  |  0.75 |

The Tank opens half full rather than empty. Everything downstream of an empty Tank is a Turbine at full starve strain with no throttle to answer it — a run lost before the player has touched anything. Opening exactly on `StarveThreshold` is barely better: strain is zero there, but the store sits on the line its own bar bands on, so the first frame of a run this document calls matched and clean would read as a warning. Half is clear of both thresholds.

At the opening it carries 21.00 kg/s in and 20.99 out, so 41.99 of its 48 kg/s is spoken for: 1.14× headroom. The Tank is the one part of the chain that opens balanced, which is what leaves the Silo as the only problem on screen.

### Turbine

The Turbine converts high-pressure steam supplied by the Tank into electrical power stored in the Battery.

| Type              | Parameter        | Unit    | Description / Formula                                                      | Value |
| ----------------- | ---------------- | ------- | -------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | MW      | Output                                                                     |  23.7 |
| Player controlled | Efficiency       | %       | Steam consumption performance                                              |  0.70 |
| Player controlled | SafeVibration    | mm/s    | Vibration below which no wear accrues; raised by Tolerance                 |   6.5 |
| Constant          | BaseConsumption  | kg/s/MW | Steam consumption per MW                                                   |  0.62 |
| Constant          | NominalVibration | mm/s    | Vibration running clean, at any Capacity                                   |     5 |
| Constant          | MaxTolerance     | mm/s    | Highest SafeVibration obtainable through upgrades                          |    12 |
| Constant          | MinTolerance     | mm/s    | Floor SafeVibration is eroded toward by Capacity upgrades                  |   3.5 |
| Constant          | MaxVibration     | mm/s    | Vibration at which wear accrues fastest                                    |    13 |
| Constant          | WearGrowth       | 1/s     | Wear accrued per second at Excess = 1                                      | 0.067 |
| Constant          | WearRecovery     | 1/s     | Wear shed per second while below SafeVibration                             | 0.020 |
| Constant          | RepairSeconds    | s       | Time the machine stays offline after tripping                              |    20 |
| Variable          | Strain           | ×       | StrainGain × Pressure(Tank); see [Buffers and strain](#buffers-and-strain) |     0 |
| Variable          | Vibration        | mm/s    | NominalVibration × (1 + Strain)                                            |     5 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1)  |     0 |
| Variable          | Wear             | %       | Damage from running strained; see [Stress and wear](#stress-and-wear)      |     0 |
| Variable          | Output           | MW      | Capacity                                                                   |  23.7 |
| Variable          | SteamConsumption | kg/s    | (Capacity × BaseConsumption) / Efficiency                                  | 20.99 |

The Turbine runs clean until the Tank falls below **22.8%**, and reads 11.25 mm/s with the Tank empty. It is the only machine whose strain inverts, and the only one whose trip stops the run's income outright.

`WearRate` scales with `RunRatio`, so a Turbine that has outrun its supply only wears at the fraction the Boiler is actually delivering. That is what stops a starving Turbine from tripping instantly and taking the run with it.

### Battery

The Battery stores electricity produced by the Turbine and supplies electricity to the Pulverizer and Boiler. Power in MW is converted to stored energy in MWh using the simulation interval in seconds.

| Type              | Parameter      | Unit | Description / Formula                                                        | Value |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity       | MWh  | Maximum electricity that can be stored                                       |    10 |
| Player controlled | Flow           | MW   | Maximum charge rate from the Turbine; discharge is uncapped                  |    28 |
| Constant          | StartingCharge | MWh  | Electricity available at the start of a new run                              |     4 |
| Variable          | Contents       | MWh  | Electricity currently stored; initially equal to StartingCharge              |     4 |
| Variable          | MinimumReserve | MWh  | See [Spendable energy](#spendable-energy); upgrades cannot spend below this  |     1 |
| Variable          | NetFlow        | MW   | Turbine Output − Pulverizer ElectricConsumption − Boiler ElectricConsumption | 20.13 |
| Variable          | EnergyChange   | MWh  | NetFlow × DeltaTimeSeconds / 3,600                                           |     — |

A run opens with 3 MWh of spendable energy above the reserve. Because the Battery starts at 40% of capacity and `TargetEnergy` is many times the starting capacity, the Battery must be upgraded repeatedly before the run can be won.

Battery `Flow` is the plant's last gate. It caps the Turbine directly, so a Turbine built past it generates into a wall — and because the excess steam then backs up the Tank, an under-bought Battery `Flow` shows first as a straining Boiler.

`NetFlow` represents continuous generation and machine consumption. Coal purchases and upgrade costs are discrete expenses deducted directly from `Contents` when the player confirms them — upgrades limited by `SpendableEnergy`, coal by `StartupEnergy`.

## Stress and wear

Machines have no throttle, so there is only one thing that can make a machine run hot: being out of step with the chain around it. Every machine has a `NominalStress` it runs at when nothing is wrong, and `Strain` is the only term that raises it.

| Type     | Parameter        | Unit | Description                                                        | Value |
| -------- | ---------------- | ---- | ------------------------------------------------------------------ | ----: |
| Constant | StrainGain       | ×    | Largest fractional increase strain adds to stress                  |  1.25 |
| Constant | BacklogThreshold | %    | Output-store fill above which a producing machine starts to strain |  0.70 |
| Constant | StarveThreshold  | %    | Input-store fill below which a consuming machine starts to strain  |  0.30 |

These three are the only parts of this system every machine shares. `NominalStress`, `SafeStress`, `MaxStress`, `WearGrowth`, `WearRecovery`, and `RepairSeconds` are per-machine and listed in each machine's own table.

```text
Stress   = NominalStress × (1 + Strain)
Excess   = clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1)
WearRate = Tripped or Excess = 0 ? −WearRecovery : WearGrowth × Excess² × RunRatio
NextWear = clamp(Wear + WearRate × DeltaTimeSeconds, 0, 1)
```

`Stress` is not clamped to `MaxStress`; `Excess` is. A machine under full strain can read well past its maximum, and the gauge simply pegs there.

When `Wear` reaches 1 the machine **trips**: it produces and consumes nothing for `RepairSeconds`. Wear is scaled by `RunRatio` because a machine starved of input is not doing the work that damages it.

A tripped machine sheds at `WearRecovery` for the whole repair even though its strain may still put it above the safe threshold; without that it would come back at `Wear = 1` and trip again on the next step. A machine that is merely starved is different: it holds its wear rather than shedding it, because `RunRatio = 0` zeroes the growth term without selecting the recovery branch.

How much a repair actually heals is `RepairSeconds × WearRecovery`, and it differs sharply: 0.40 for the Turbine, 0.16 for the Boiler, 0.064 for the Pulverizer, so they resume at 60%, 84%, and 94% wear. Only the Turbine comes back with room to spare. For the other two the repair is downtime rather than recovery — and a machine put back into the same imbalance will trip again within seconds.

**There is no way to back off.** `Setting` does not exist; a machine cannot be slowed, stopped, or eased. The only answers to a wearing machine are to buy `Tolerance` on it, to buy the neighbouring stage so the chain comes back into step, or to buy the store's `Capacity` so the drift takes longer to bite. All three cost energy, and none of them is instant. This is deliberate: it makes an upgrade order a commitment rather than an experiment.

What stops that from being brutal is that an over-built machine self-regulates. It fills its store, strains, trips, and while it is tripped the stage below drains what it made — so its average throughput settles at the bottleneck's rate anyway. Building a stage too far costs repair downtime and wasted coal, not the run.

### Buffers and strain

A machine strains when it runs out of step with the chain. Overproducing strains the producer; overdrawing strains the consumer; and being held back by a store's `Flow` strains whichever machine lost the rate.

```text
Backlog  = clamp((OutputStore Fill − BacklogThreshold) / (1 − BacklogThreshold), 0, 1)
Starve   = clamp((StarveThreshold − InputStore Fill) / StarveThreshold, 0, 1)
Unmet    = 1 − FlowRatio, for each capped store the machine touches
Pressure = max(Backlog or Starve, every Unmet that applies)
Strain   = StrainGain × Pressure
```

| Machine    | Fill strain | Bites when | Reads as                    | Runs clean until |
| ---------- | ----------- | ---------- | --------------------------- | ---------------: |
| Pulverizer | Silo fill   | above 70%  | grinding into a packed silo |       Silo 75.1% |
| Boiler     | Tank fill   | above 70%  | pushing into a full tank    |       Tank 74.8% |
| Turbine    | Tank fill   | below 30%  | running on starved steam    |       Tank 22.8% |

The Turbine inverts because it is the only pure consumer. Its output store is the Battery, which is never full until the run is already won, so a backlog rule would give it nothing; an empty Tank is what a Turbine actually suffers from. `Fill` is `Contents / Capacity` read at the start of the step, like every other input to a step.

**Flow strain is the same fact from the other side.** A machine held to 60% of its request by a contended store is 40% out of step with the chain, exactly as a machine grinding into a store that is 40% past its backlog threshold is. Taking the worse of the two means one gauge reports both, and the player's answer is the same either way — buy the stage that is out of step. Which of the two is biting is named in words by the alerts panel rather than by a second gauge.

**The stores become bands rather than tanks.** The Tank is squeezed from both ends: too full and the Boiler strains, too empty and the Turbine does. Neither end is a place to sit. The Silo has a wear penalty at one end only — full and the Pulverizer cooks, empty and the Boiler simply throttles, which costs output rather than damage. The Tank is the tighter rope, which is the second reason to buy its capacity before the Silo's.

**Storage capacity buys headroom as time.** Strain reads a fill fraction, so a larger store does not lower the strain at a given percentage. What it buys is seconds of mismatch before the threshold is reached. Because it is a fraction, a capacity upgrade moves the reading the instant it is bought: the same contents in a store 1.3× larger is a fill 1.3× lower, which relieves a backlog and deepens a starve at the same stroke. Buying Silo capacity is therefore an immediate reprieve for the Pulverizer, and buying Tank capacity relieves the Boiler while pushing the Turbine toward `StarveThreshold` until the extra steam is made. The Tank upgrade is the one that has to be timed rather than simply afforded.

Strain also propagates a trip into its neighbours. One machine going down pushes the store above it toward backlog and the store below it toward starvation, so the repair that follows is rarely the only cost — and with no throttle, the recovery is whatever the rest of the chain does on its own.

### The opening imbalance

Output is `Capacity` and every consumption rate is linear in it, so the ratios between machines are fixed by `Capacity` and `Efficiency` alone. A run therefore opens at whatever ratio the starting capacities set — and it is set **deliberately wrong**, in one place:

| Stage             |      Makes | The stage below draws |  Surplus |
| ----------------- | ---------: | --------------------: | -------: |
| Pulverizer → Silo |  4.00 kg/s |             3.00 kg/s | **+33%** |
| Boiler → Tank     | 21.00 kg/s |            20.99 kg/s |       0% |

The Silo gains a kilogram a second from the first, crosses `BacklogThreshold` at seventy seconds and is packed at a hundred. Everything else opens balanced, so there is exactly one problem on screen and it arrives on a clock the player can watch.

**A matched chain earns 1.78 MWh per tonne; this one earns 1.328.** A quarter of every tonne bought is ground into powder the Boiler never burns, and the player pays for all of it. At the opening price of 1.00 MWh/t that leaves a margin of 0.33 on a tonne — thin, and thinning, because the price rises all run while the yield does not. An unfixed plant is at break-even inside six minutes.

That is what makes the first decision a real one rather than a tutorial. It has three answers and they are not equivalent:

- **Silo `Capacity`** buys seconds before the backlog bites, and nothing else. The coal is still wasted.
- **Silo `Flow`** buys rate. The coal is still wasted, and at 1.07× headroom the store is already nearly at its limit.
- **Boiler `Capacity`** consumes the surplus, which is the only one of the three that moves `MWh per tonne`. It also pushes the Boiler past the Turbine's draw, so the Tank starts filling and the problem moves one stage down the chain.

The last of those is the round beginning — see [The round](#the-round). Buying it correctly means buying the Turbine after it, and the Silo and Tank `Flow` after that.

### Staying matched

Once the opening imbalance is closed, every upgrade opens a new one. A capacity upgrade throws one stage 50% out of step with its neighbours. An Efficiency upgrade moves the ratio too, in the other direction — a more efficient Boiler needs less fuel for the same steam, so the Pulverizer is suddenly oversupplying it again. A `Tolerance` upgrade moves it a third way, because it erodes the Efficiency that set the ratio in the first place.

So the matched ratio is not a state the player reaches and keeps. It is a state they pass through on the way to the next one, and the whole game is the sequence of those passes: **how far out of step to run, in which direction, and for how long.**

The ratio itself is not surfaced. No card reports discarded output or names the matched capacities, and finding them is the reward for reading the numbers rather than a step the game walks the player through. What the UI reports is the symptom: a Silo climbing toward its threshold says the Pulverizer is running ahead of the Boiler, and a Tank falling toward its own says the Turbine is running ahead of everything. The stores tell the player they are off the ratio; they never say what the ratio is.

Running unmatched on purpose is still what refills a drained buffer after a trip — and now also what empties a backed-up one.

## UI

```text
[Stockpile] -> [Pulverizer] -> [Silo] -> [Boiler] -> [Tank] -> [Turbine] -> [Battery]
```

A persistent run header shows the remaining time and progress toward `TargetEnergy`, since both are needed for the invest-or-bank decision.

```text
┌────────────────────────────────────────────────────┐
│ Time 07:12        Stored ███░░░░░░░ 12.4 / 40 MWh  │
└────────────────────────────────────────────────────┘
```

Every card carries the same shape: what the component is doing, then what can be bought on it. Machine cards carry three upgrade rows and storage cards two, and no card carries an operating control of any kind.

```text
┌───────────────────────────────────────────┐
│ Stockpile                                 │
├───────────────────────────────────────────┤
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Incoming     {value} t                    │
│ Price        {value} MWh/t                │
│ Buy coal     [-] {value} t [+]            │
│              [Buy: {cost} MWh]            │
├───────────────────────────────────────────┤
│ Capacity     [{cost} MWh]           ▼FLOW │
│ Flow         [{cost} MWh]            ▼CAP │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Silo / Tank / Battery                     │
├───────────────────────────────────────────┤
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Flow         {value}                      │
├───────────────────────────────────────────┤
│ Capacity     [{cost} MWh]           ▼FLOW │
│ Flow         [{cost} MWh]            ▼CAP │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Pulverizer / Boiler / Turbine             │
├───────────────────────────────────────────┤
│ Capacity     {value}                      │
│ Output       {value}                      │
├───────────────────────────────────────────┤
│ {Stress}     ░░░█░░                       │
│ Wear         ███████░░░                   │
├───────────────────────────────────────────┤
│ Capacity     [{cost} MWh]            ▼TOL │
│ Efficiency   [{cost} MWh]            ▼CAP │
│ Tolerance    [{cost} MWh]            ▼EFF │
└───────────────────────────────────────────┘
```

Each machine card shows its stress against the safe and maximum thresholds and a `Wear` gauge. Together those answer the only question the card has to answer: how long can this hold. A tripped machine shows its repair countdown in place of its output.

**Every upgrade row names what it costs.** The marker on the right — `▼TOL`, `▼CAP`, `▼EFF`, `▼FLOW` — is permanent, so the trade is never invisible and an unexplained stat drop never reads as a bug. Focusing an upgrade button reveals the exact before-and-after on both the row it raises and the row it erodes; the magnitudes are shown when the player is deciding, not at all times.

An upgrade button is disabled whenever its cost exceeds `SpendableEnergy`.

The alerts panel is what distinguishes the two sources of strain, since one gauge now carries both. A store crossing a fill threshold and a store's `Flow` holding a machine back are different problems with different answers, and the panel names which in words.
