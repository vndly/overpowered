# Overpowered

## Objective

A game is a single timed run. The player wins by raising the Battery's stored energy to `TargetEnergy` before `TimeLimit` elapses; the run ends in defeat when the timer expires first.

| Type     | Parameter    | Unit | Description                          | Value |
| -------- | ------------ | ---- | ------------------------------------ | ----: |
| Constant | TargetEnergy | MWh  | Stored energy that wins the run      |   175 |
| Constant | TimeLimit    | s    | Time available to reach TargetEnergy |   600 |

- The win is checked against `Battery Contents` — energy that has been generated and then spent is not banked. Reaching the target requires a Battery `Capacity` of at least `TargetEnergy`.
- The win triggers the instant `Contents ≥ TargetEnergy`, at any point during the run.
- On defeat the run ends and every component resets to its starting value. The highest stored energy reached is recorded as the player's best result.
- Because upgrades compound, the central decision of a run is _when to stop reinvesting and start banking_: energy spent on upgrades is energy not counted toward the target, but an under-built plant cannot fill the Battery before the timer expires.

`TargetEnergy` is set to roughly 80% of the peak achievable under strong play with these parameters, and must be re-measured whenever the economy is retuned.

The current value of 175 was measured with [`simulator/`](../simulator/), which implements this document. Run under a greedy reinvestment policy across 60 market seeds, it reaches a **median peak of about 248 MWh** — quartiles 184 and 302, individual runs from 123 to 357. A target of 175 is reached on 78% of seeds by one good line of play, and 82% when the line is chosen to suit the market.

| TargetEnergy         | 125 | 150 | 175 | 185 | 200 | 225 | 250 |
| -------------------- | --: | --: | --: | --: | --: | --: | --: |
| Strong-play win rate | 98% | 90% | 78% | 73% | 70% | 58% | 50% |

Three caveats attach to the number. A strict reading of the 80% rule would put the target at 200 rather than 175; 175 is 71% of the measured median, chosen because it holds the strong-play win rate above three quarters. The policy measured is a strong heuristic rather than proven-optimal play, so the true peak sits at or above 248 and the target errs towards the generous either way. And the spread is wide — the market alone separates a 123 MWh run from a 357 MWh one — so no single target is equally fair on every seed.

The previous value of 80 is not comparable, and not only because the economy changed under it. It was measured with the policy's `buffer` knob pinned at 45 s rather than swept, which sizes every store far larger than a run wants and buys storage capacity that never pays for itself. Sweeping it moved the measured peak by more than the removal of the control tracks did. The lesson is in `measure.py`: a knob left out of the sweep silently caps the number the sweep reports, so the grid must bracket its winner on every axis rather than end at it.

### Stalling

A run is lost immediately, without waiting for the timer, when the Battery, Stockpile, Silo, and Tank are all empty at the same time. In that state nothing can produce and nothing can be bought, so the run cannot be recovered.

This is reachable through any configuration that spends energy without generating any — most simply, running the Pulverizer and Boiler with the Turbine's `Setting` at zero until the Battery drains, or leaving them running while the Turbine sits tripped. Ending the run at once states the outcome plainly instead of leaving the player watching a dead plant until the clock expires.

## Production flow

```text
Stockpile -> Pulverizer -> Silo -> Boiler -> Tank -> Turbine -> Battery
```

The Stockpile, Silo, Tank, and Battery are storage components. Their stored amounts are clamped between zero and their current capacity. Output produced beyond the available storage capacity is silently discarded.

Machines have no separate enable control. A machine is enabled when `Setting > 0` and off when `Setting = 0`. How far it actually runs is set by its inputs, as described under [Simulation step](#simulation-step):

- When a machine's output storage is full, the machine continues running without pausing or changing its Setting. It continues consuming its normal inputs and electricity, and any output that cannot be stored is silently discarded.
- A machine only consumes resources while it is running. The rates in the component tables assume that input and electricity are available; output-storage capacity does not affect those rates.
- During each simulation step, the amount added to output storage is `min(ProducedOutput, Capacity − Contents)`. The remaining `ProducedOutput` is discarded. This rule also applies to electricity produced while the Battery is full.
- Discarded output is paid for. A machine running faster than the stage below it consumes coal, fuel, or electricity for output that never lands, and the starting Settings do exactly that — see [Oversupply and the matched chain](#oversupply-and-the-matched-chain).
- A machine tripped by wear runs at zero for `RepairSeconds` no matter what its `Setting` says, then resumes at that same Setting. See [Setting, stress, and wear](#setting-stress-and-wear).

Storage capacities can only be increased by purchasing upgrades. All storage components start empty except the Battery, which starts with `StartingCharge`.

### Simulation step

A step advances the simulation by `DeltaTimeSeconds`. Every machine reads component state as it stood at the _start_ of the step, and every storage write is applied at the _end_ of the step. No machine sees another machine's output from the same step, so the result does not depend on the order in which machines are evaluated.

Machines throttle rather than stop. A machine that cannot obtain everything it requests runs at the largest fraction of its requested rate that its inputs support:

```text
RequestedEnergy  = ElectricConsumption × DeltaTimeSeconds / 3,600
InputRatio       = min(1, InputContents / (RequestedInput × DeltaTimeSeconds))
ElectricityRatio = min(1, Battery Contents / TotalRequestedEnergy)
RunRatio         = min(InputRatio, ElectricityRatio)
```

`RequestedInput` is in kg/s and `RequestedEnergy` in MWh, so both ratios are dimensionless. `TotalRequestedEnergy` is the sum across every electricity-consuming machine, which is what makes the electricity share proportional.

Every rate in the machine's table — output, input consumption, and electrical consumption — is multiplied by `RunRatio` for that step. A machine with `RunRatio = 0` is stopped; its `Setting` is unchanged and it resumes automatically once inputs return.

A machine tripped by wear is held at `RunRatio = 0` for the whole of its repair: it requests nothing, produces nothing, and its `Setting` is left untouched. Each machine's `Wear` and the coal market are advanced once per step, alongside the storage writes.

When the Battery cannot meet the total demand of the Pulverizer and the Boiler, the available energy is divided between them in proportion to their demand, so both run at the same reduced `ElectricityRatio`. No machine has priority over the other.

The Turbine consumes no electricity, so any steam left in the Tank is always convertible back into energy. Combined with `StartupEnergy` below, this keeps the chain restartable from any state the player can reach by spending.

## Economy

Energy stored in the Battery, measured in MWh, is the game's only currency. There is no separate money balance.

- The Turbine produces energy and adds it to the Battery.
- The Pulverizer and Boiler consume energy from the Battery while running.
- Buying raw coal immediately deducts its energy cost from the Battery.
- Every storage and machine upgrade is purchased with energy and immediately deducts its cost from the Battery.
- An upgrade is unavailable when the player cannot pay its full cost. A coal purchase is automatically reduced to the amount that the player can afford.

### Spendable energy

Spending is floored twice, because upgrades and coal need different protections.

| Type     | Parameter       | Unit | Description / Formula                                                    |  Value |
| -------- | --------------- | ---- | ------------------------------------------------------------------------ | -----: |
| Constant | ReserveFraction | %    | Share of Battery Capacity held back from upgrade spending                |   0.10 |
| Constant | StartupSeconds  | s    | Machine runtime the restart floor must cover                             |     30 |
| Constant | RestartMultiple | ×    | Restarts the upgrade floor must leave affordable                         |      2 |
| Variable | StartupEnergy   | MWh  | (Pulverizer + Boiler ElectricConsumption) × StartupSeconds / 3,600       | 0.0414 |
| Variable | MinimumReserve  | MWh  | max(Battery Capacity × ReserveFraction, StartupEnergy × RestartMultiple) |      1 |
| Variable | SpendableEnergy | MWh  | max(0, Battery Contents − MinimumReserve)                                |      3 |

**Upgrades** are limited by `SpendableEnergy`. This is the floor the player sees and plans around: it stops a run from being wrecked by one over-ambitious purchase, and because it is a share of Battery `Capacity` it keeps scaling as the plant grows.

`MinimumReserve` takes the larger of the two terms because they scale with different things, and the share-of-Capacity term alone is not always the larger. It tracks the **Battery**, while `StartupEnergy` tracks **machine** consumption. A player who pours everything into throughput and leaves the Battery behind drives `StartupEnergy` past `Capacity × ReserveFraction` — at base Settings that happens once machine capacity reaches about 24× with the Battery unupgraded, a little under eight capacity levels. Past that crossover the upgrade floor sits _below_ the coal floor, so spending upgrades down to the reserve leaves `max(0, Contents − StartupEnergy)` at exactly zero: no coal is purchasable at any price, the chain starves, and nothing can restart it. It is not even a quick loss, because the Battery is still above zero and [Stalling](#stalling) does not fire until the machines have drained it. Holding the reserve at `RestartMultiple` startups keeps a restart affordable at every scale, and costs nothing at base, where `StartupEnergy × 2` is 0.083 MWh against a 1 MWh reserve.

Because `StartupEnergy` is computed from current consumption, `MinimumReserve` moves with the `Setting`s once that term dominates. The Battery card displays the reserve, so the player sees it move.

**Coal purchases** are limited by `max(0, Contents − StartupEnergy)` instead. Coal is the only purchase that can restart a stalled chain, so it must remain affordable even at the reserve — a player sitting at `MinimumReserve` with an empty Stockpile would otherwise be unable to act at all. `StartupEnergy` is the residue that stops the opposite trap: spending the last of the Battery on coal that there is then no electricity left to pulverize.

**Machines** draw from the full `Contents` and may take it below both floors. The floors restrict discrete spending only; they are not brownout thresholds.

Together these cover every recoverable case, at every scale. `StartupEnergy` always covers the Pulverizer and Boiler for `StartupSeconds`, and because a machine throttles instead of stopping, the Turbine begins returning energy as soon as the first steam reaches the Tank — well inside that window. Both `StartupEnergy` and `MinimumReserve` are derived from current consumption once the plant is large, so they scale with every capacity upgrade together rather than drifting apart. From a Battery sitting at `MinimumReserve` with the whole chain empty, one coal purchase restarts production and the Battery recovers without ever reaching zero.

Both floors are denominated in energy rather than coal, so the rising coal price does not break them — it only means the same reserve buys less coal, and a late restart is tighter than an early one. At base capacities a restart from `MinimumReserve` buys 959 kg of raw coal at the opening price and 535 kg at the end-of-run trend — 190 s and 106 s of Pulverizer runtime at its 5.05 kg/s raw draw, against the few seconds the Turbine needs before it starts returning energy. Both sides of that comparison scale with capacity — the reserve with the Battery's until the startup term takes over, the coal draw with the Pulverizer's — so the margin narrows as the plant grows but never closes.

The floors cannot cover every case, because the player can always choose a configuration that consumes energy without producing any — running the Pulverizer and Boiler with the Turbine's `Setting` at zero drains the Battery no matter what the floors are. That is handled as a loss condition rather than a spending rule; see [Stalling](#stalling).

`StartingCharge` must exceed `MinimumReserve`, otherwise no upgrade is affordable at the start of a run.

### Upgrade costs

Every upgrade track is priced independently and grows geometrically with the number of times that track has been purchased:

`UpgradeCost(n) = BaseCost × CostGrowth^n`

where `n` is the number of upgrades already bought on that track, starting at zero. `BaseCost` and `CostGrowth` are both properties of the track, not global constants.

| Type     | Parameter      | Unit | Description                                                | Value |
| -------- | -------------- | ---- | ---------------------------------------------------------- | ----: |
| Constant | CapacityGrowth | ×    | Capacity multiplier per capacity upgrade                   |   1.5 |
| Constant | UpgradeGain    | %    | Share of the remaining gap closed by an Efficiency upgrade |  0.25 |

| Upgrade track                             | BaseCost (MWh) | CostGrowth | Effect                                                   |
| ----------------------------------------- | -------------: | ---------: | -------------------------------------------------------- |
| Capacity (Pulverizer, Boiler, Turbine)    |           0.02 |       1.70 | Capacity × CapacityGrowth                                |
| Capacity (Stockpile, Silo, Tank, Battery) |           0.02 |       1.55 | Capacity × CapacityGrowth                                |
| Efficiency (Pulverizer, Boiler, Turbine)  |           0.05 |       1.30 | Efficiency += (MaxEfficiency − Efficiency) × UpgradeGain |

Capacity upgrades are multiplicative rather than additive. Coal cost and energy output both scale linearly with throughput, so additive upgrades would leave profit per unit of throughput constant and each upgrade would take longer to afford than the last. Multiplying capacity is what makes a run accelerate.

Efficiency closes a fixed share of the distance to its cap on each purchase, so it approaches `MaxEfficiency` without ever exceeding it. `MaxEfficiency` is strictly below 1 — an Efficiency of 1 or greater would make the plant produce energy from nothing.

There is no upgrade that directly buys wear headroom. A machine's wear-free ceiling is set by its own constants and by how full the store next to it is, so the purchase that buys headroom is storage capacity — see [Buffers and strain](#buffers-and-strain).

#### Why the growth rates differ

The tracks are not priced at the same rate because they do not weaken at the same rate. A machine capacity level always multiplies throughput by `CapacityGrowth`, so its gain never shrinks. An Efficiency level closes a quarter of the remaining gap to `MaxEfficiency`, so each one is worth about three quarters of the last.

Under a single growth rate that decay is what decides the game: capacity's gain per MWh stays almost flat while Efficiency's falls away, so capacity is the strongest buy at level zero and its lead only widens. Both tracks still get bought, but in a fixed order that never depends on the state of the run. Pricing each track against its own decay narrows that gap without closing it: at a fixed price capacity still leads at every level, because 1.70 against a gain that never shrinks decays more slowly than 1.30 against a gain that loses a quarter each time. What the separate rates buy is a crossing that the price can reach inside a run.

The coal market is what actually moves it. A capacity level multiplies income by `CapacityGrowth`, and income is `Throughput × (YieldPerTonne − CoalPrice)`, so its value shrinks as the price climbs and turns negative once the price passes the yield. An Efficiency level adds a fixed amount to `YieldPerTonne` regardless of the price, so its value holds. Against a bare plant the two cross at a coal price of 1.45 MWh/t, which the trend reaches at 6:24; a plant three capacity rounds in crosses at 1.72, which it reaches at 9:17. Capacity is the early buy and Efficiency the late one, the turn comes somewhere in the back half of a run, and how far into it depends on both the build and how the market has behaved — see [The coal market](#the-coal-market).

Storage capacity is the third choice rather than an afterthought, because it is what buys wear headroom. A Silo or Tank held below its strain threshold keeps the machine beside it on its full clean ceiling, and a larger store is more seconds of mismatch before that threshold is reached.

`CostGrowth` for storage stays at the base 1.55, which is the rate it was given when its only job was holding more. That reasoning no longer holds — the old note that storage "is already self-limiting, so it needs no extra brake" was written before strain existed, and a track that buys headroom as well as volume is plausibly underpriced at 1.55. It is left unchanged here deliberately: the right number is a measurement, not an estimate, and it should be set from a `measure.py` sweep rather than guessed.

These crossover levels are estimates from the marginal-value arithmetic rather than measurements. Simulated strong play is roughly consistent with them. A winning run ends at about 14 capacity levels on each of the three machines, 10 `Efficiency` levels on the Boiler and Turbine, and under 3 on the Pulverizer — that machine's electrical draw is too small a share of the plant to be worth improving. Storage lands at 7 levels each on Silo and Tank, 5 on the Stockpile, and 9 on the Battery, which is one more than the eight the target requires.

The same run trips no machine at all. Strain is not avoided by never pushing — the winning line rides well above the clean ceiling — but by keeping the stores off their thresholds so the ceiling stays where the machine constants put it.

## Components

### Stockpile

The Stockpile stores raw coal purchased by the player. A purchase adds as much of the requested coal as will fit and as the player can afford, then deducts the resulting energy cost from the Battery. The UI displays raw coal quantities in metric tonnes (`t`), where `1 t = 1,000 kg`; simulation calculations and machine throughput continue to use kg and kg/s internally.

| Type              | Parameter        | Unit  | Description / Formula                                                                         | Value |
| ----------------- | ---------------- | ----- | --------------------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | t     | Maximum raw coal that can be stored                                                           |     1 |
| Constant          | StartPrice       | MWh/t | Coal price at the start of a run                                                              |     1 |
| Constant          | PriceGrowth      | ×/min | Trend multiplier applied to the price each minute                                             |  1.06 |
| Constant          | MarketRange      | %     | Largest deviation from the trend the market can reach                                         |  0.25 |
| Constant          | MarketVolatility | 1/√s  | Half-width of each random market step                                                         |  0.03 |
| Constant          | MarketReversion  | 1/s   | Rate at which the market is pulled back towards the trend                                     |  0.01 |
| Variable          | Trend            | MWh/t | StartPrice × PriceGrowth^(ElapsedSeconds / 60)                                                |     1 |
| Variable          | Market           | ×     | Deviation from the trend, updated every step                                                  |     1 |
| Variable          | CoalPrice        | MWh/t | Trend × Market                                                                                |     1 |
| Variable          | Contents         | t     | Raw coal currently stored                                                                     |     0 |
| Variable          | PurchasedCoal    | t     | min(RequestedCoal, Capacity − Contents, max(0, Battery Contents − StartupEnergy) / CoalPrice) |     — |
| Variable          | PurchaseCost     | MWh   | PurchasedCoal × CoalPrice                                                                     |     — |

The player can buy any positive amount of raw coal, and `Capacity` can be increased with a capacity upgrade. The price itself cannot be upgraded — it is set by the market, and it rises for the whole run.

#### The coal market

Coal grows more expensive as a run progresses, following a compounding trend with a random deviation on top:

```text
Trend      = StartPrice × PriceGrowth^(ElapsedSeconds / 60)
Drift      = (1 − Market) × MarketReversion × DeltaTimeSeconds
NextMarket = clamp(Market + Drift + Noise × √DeltaTimeSeconds, 1 − MarketRange, 1 + MarketRange)
CoalPrice  = Trend × Market
```

`Noise` is drawn uniformly from `[−MarketVolatility, +MarketVolatility]` on every step, from a seeded generator, so a run replays identically and two runs sharing a seed face the same market. `Market` starts at 1 and settles around ±12% of the trend, touching the ±`MarketRange` clamp only occasionally.

The trend reaches 1.79 MWh/t by the end of a 600 s run. What that costs the player depends on how much energy the plant extracts from a tonne of raw coal:

| Plant state                 | Net MWh per tonne of raw coal | Trend reaches it at |
| --------------------------- | ----------------------------: | ------------------: |
| Starting Efficiency of 0.70 |                          1.78 |                9:56 |
| Efficiency at its 0.95 cap  |                          3.55 |     after the timer |

Both figures are for a chain matched to the Turbine's steam draw, which is not what the starting Settings give — see [Oversupply and the matched chain](#oversupply-and-the-matched-chain). Neither depends on `Capacity` or on storage: a capacity upgrade scales revenue and coal consumption by the same factor, and a storage upgrade buys wear headroom rather than output. `Efficiency` is the only track that moves this number. Against a rising price, **Capacity buys speed, Efficiency buys survival, and storage buys headroom** — a plant that never touches Efficiency reaches break-even moments before the timer expires, while one at `MaxEfficiency` still holds a 50% margin and is threatened only by a market spike near the clamp.

That band is 1.99× wide, because `Efficiency` spans 0.70 to 0.95. The range used to be 0.85 to 0.95 and the band 1.29×, which was too narrow for any exponential price curve to both spare a well-run plant and sharply punish a neglected one: the market applied a steady tax rather than a deadline. Widening the range needed the chain rebalanced around the new starting value, and that is what `SteamYield` and the Turbine's `BaseConsumption` do. At 10 and 0.62 they hold the opening material flows, the matched ratio, and the starting net yield within a hair of where 8 and 0.75 put them at an `Efficiency` of 0.85 — only the ceiling moved.

The widening also flattens the spread between market seeds without the market itself changing, because a plant running near break-even is enormously levered to the price. At a yield of 1.79 against a late-run price of 1.79, the ±12% the market swings is the difference between earning and not; at a yield of 3.55 the same swing moves income by a tenth. Efficiency is what buys out of that leverage, which is a second reason the track has to be worth buying.

The rising price also sharpens the closing decision. Net income is `Throughput × (YieldPerTonne − CoalPrice)`, and the second factor shrinks all run no matter how large the plant grows, so there is a point past which no reinvestment can pay itself back and banking is the only correct move.

Because the price only ever trends upward, a full Stockpile is worth more than the energy that bought it, and the decision in a coal purchase is timing: buying into a spike wastes energy, but waiting out a dip starves the Pulverizer. Stockpile `Capacity` is what buys the ability to wait, which is the reason it is an upgrade worth considering against throughput.

### Pulverizer

The Pulverizer converts raw coal supplied by the Stockpile into pulverized coal stored in the Silo.

| Type              | Parameter           | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum pulverized coal throughput                                                |     8 |
| Player controlled | Efficiency          | %     | Electrical consumption performance                                                |  0.70 |
| Player controlled | Setting             | ×     | Operating level, from 0 to MaxSetting                                             |   0.6 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                                    |  0.95 |
| Constant          | BaseConsumption     | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | PulverizedCoalYield | kg/kg | Pulverized coal produced per kg of raw coal                                       |  0.95 |
| Constant          | BaseTemperature     | °C    | Minimum temperature                                                               |    30 |
| Constant          | TemperatureRange    | °C    | Additional temperature as Setting rises                                           |    60 |
| Constant          | SafeTemperature     | °C    | Temperature below which no wear accrues                                           |    70 |
| Constant          | MaxTemperature      | °C    | Temperature at which wear accrues fastest                                         |   150 |
| Constant          | WearGrowth          | 1/s   | Wear accrued per second at Excess = 1                                             | 0.100 |
| Constant          | WearRecovery        | 1/s   | Wear shed per second while below SafeTemperature                                  | 0.008 |
| Constant          | RepairSeconds       | s     | Time the machine stays offline after tripping                                     |     8 |
| Variable          | Strain              | ×     | StrainGain × Backlog(Silo); see [Buffers and strain](#buffers-and-strain)         |     0 |
| Variable          | Temperature         | °C    | BaseTemperature + TemperatureRange × Setting × (1 + Strain)                       |    66 |
| Variable          | ExcessTemperature   | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) |     0 |
| Variable          | Wear                | %     | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear)       |     0 |
| Variable          | Output              | kg/s  | Capacity × Setting                                                                |  4.80 |
| Variable          | RawCoalConsumption  | kg/s  | Output / PulverizedCoalYield                                                      |  5.05 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                               |  0.69 |

With the Silo below `BacklogThreshold` the Pulverizer runs clean up to a `Setting` of 0.667 and reaches `MaxTemperature` at `MaxSetting`. A run opens at 0.6, just inside that ceiling. As the Silo backs up that ceiling falls, reaching 0.296 with the Silo full — the Pulverizer's own oversupply is what cooks it. See [Buffers and strain](#buffers-and-strain).

### Silo

The Silo stores pulverized coal produced by the Pulverizer and supplies it to the Boiler. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                      | Value |
| ----------------- | --------- | ---- | ------------------------------------------ | ----: |
| Player controlled | Capacity  | t    | Maximum pulverized coal that can be stored |   0.5 |
| Variable          | Contents  | t    | Pulverized coal currently stored           |     0 |

The player can increase `Capacity` by purchasing a Silo capacity upgrade with energy stored in the Battery. The upgrade is unavailable when the Battery does not contain the displayed energy cost.

### Boiler

The Boiler burns pulverized coal supplied by the Silo to produce high-pressure steam stored in the Tank. At base conversion, one kg of pulverized coal produces ten kg of steam; Boiler efficiency reduces the fuel required to reach the requested output.

| Type              | Parameter           | Unit  | Description / Formula                                                       | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum steam output                                                        |    50 |
| Player controlled | Efficiency          | %     | Fuel and electrical consumption performance                                 |  0.70 |
| Player controlled | Setting             | ×     | Operating level, from 0 to MaxSetting                                       |   0.6 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                              |  0.95 |
| Constant          | BaseConsumption     | MJ/kg | Electrical consumption per kg of requested steam                            |   0.1 |
| Constant          | SteamYield          | kg/kg | Base steam produced per kg of pulverized coal                               |    10 |
| Constant          | BasePressure        | bar   | Minimum pressure                                                            |    20 |
| Constant          | PressureRange       | bar   | Additional pressure the Boiler can generate as Setting rises                |   108 |
| Constant          | SafePressure        | bar   | Pressure below which no wear accrues                                        |    95 |
| Constant          | MaxPressure         | bar   | Pressure at which wear accrues fastest                                      |   236 |
| Constant          | WearGrowth          | 1/s   | Wear accrued per second at Excess = 1                                       | 0.040 |
| Constant          | WearRecovery        | 1/s   | Wear shed per second while below SafePressure                               | 0.004 |
| Constant          | RepairSeconds       | s     | Time the machine stays offline after tripping                               |    40 |
| Variable          | Strain              | ×     | StrainGain × Backlog(Tank); see [Buffers and strain](#buffers-and-strain)   |     0 |
| Variable          | Pressure            | bar   | BasePressure + PressureRange × Setting × (1 + Strain)                       |  84.8 |
| Variable          | ExcessPressure      | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1)       |     0 |
| Variable          | Wear                | %     | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear) |     0 |
| Variable          | Output              | kg/s  | Capacity × Setting                                                          | 30.00 |
| Variable          | FuelConsumption     | kg/s  | Output / (SteamYield × Efficiency)                                          |  4.29 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                         |  4.29 |

With the Tank below `BacklogThreshold` the Boiler runs clean up to a `Setting` of 0.694 and reaches `MaxPressure` at `MaxSetting`. As with the Pulverizer, a run opens at 0.6, just inside that ceiling. As the Tank backs up that ceiling falls, reaching 0.309 with the Tank full. See [Buffers and strain](#buffers-and-strain).

### Tank

The Tank stores high-pressure steam produced by the Boiler and supplies it to the Turbine. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                          | Value |
| ----------------- | --------- | ---- | ---------------------------------------------- | ----: |
| Player controlled | Capacity  | t    | Maximum high-pressure steam that can be stored |     3 |
| Variable          | Contents  | t    | High-pressure steam currently stored           |     0 |

The player can increase `Capacity` by purchasing a Tank capacity upgrade with energy stored in the Battery. The upgrade is unavailable when the Battery does not contain the displayed energy cost.

### Turbine

The Turbine converts high-pressure steam supplied by the Tank into electrical power stored in the Battery.

| Type              | Parameter        | Unit    | Description / Formula                                                       | Value |
| ----------------- | ---------------- | ------- | --------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | MW      | Maximum output                                                              |    50 |
| Player controlled | Efficiency       | %       | Steam consumption performance                                               |  0.70 |
| Player controlled | Setting          | ×       | Operating level, from 0 to MaxSetting                                       |   0.6 |
| Constant          | MaxEfficiency    | %       | Highest Efficiency obtainable through upgrades                              |  0.95 |
| Constant          | BaseConsumption  | kg/s/MW | Steam consumption per MW                                                    |  0.62 |
| Constant          | BaseVibration    | mm/s    | Minimum vibration                                                           |     1 |
| Constant          | VibrationRange   | mm/s    | Additional vibration as Setting rises                                       |     6 |
| Constant          | SafeVibration    | mm/s    | Vibration below which no wear accrues                                       |     6 |
| Constant          | MaxVibration     | mm/s    | Vibration at which wear accrues fastest                                     |    13 |
| Constant          | WearGrowth       | 1/s     | Wear accrued per second at Excess = 1                                       | 0.067 |
| Constant          | WearRecovery     | 1/s     | Wear shed per second while below SafeVibration                              | 0.020 |
| Constant          | RepairSeconds    | s       | Time the machine stays offline after tripping                               |    20 |
| Variable          | Strain           | ×       | StrainGain × Starve(Tank); see [Buffers and strain](#buffers-and-strain)    |  1.25 |
| Variable          | Vibration        | mm/s    | BaseVibration + VibrationRange × Setting × (1 + Strain)                     |   9.1 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1)   |  0.44 |
| Variable          | Wear             | %       | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear) |     0 |
| Variable          | Output           | MW      | Capacity × Setting                                                          | 30.00 |
| Variable          | SteamConsumption | kg/s    | (Setting × Capacity × BaseConsumption) / Efficiency                         | 26.57 |

With the Tank above `StarveThreshold` the Turbine runs clean up to a `Setting` of 0.833 and reaches `MaxVibration` at `MaxSetting`. As the Tank runs dry that ceiling falls, reaching 0.370 with the Tank empty. See [Buffers and strain](#buffers-and-strain).

A run therefore opens with the Turbine at full `Strain`, because the Tank starts empty: 9.1 mm/s against a `SafeVibration` of 6, well into the wear band. This is the run's first decision and it arrives before anything else. Left at 0.6 through the spin-up, the Turbine reaches **79% wear** before the Tank fills enough to relieve it — a gauge climbing toward a trip it never quite reaches. Dropping the `Setting` until steam has banked costs a little early output and clears the wear entirely.

Two things keep it from being a trap. `WearRate` scales with `RunRatio`, so a Turbine that has outrun its supply only wears at the fraction the Boiler is actually delivering. And the strain falls away on its own as the Tank fills, so the danger is bounded by the spin-up rather than lasting into the run.

### Battery

The Battery stores electricity produced by the Turbine and supplies electricity to the Pulverizer and Boiler. Power in MW is converted to stored energy in MWh using the simulation interval in seconds.

| Type              | Parameter      | Unit | Description / Formula                                                        | Value |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity       | MWh  | Maximum electricity that can be stored                                       |    10 |
| Constant          | StartingCharge | MWh  | Electricity available at the start of a new run                              |     4 |
| Variable          | Contents       | MWh  | Electricity currently stored; initially equal to StartingCharge              |     4 |
| Variable          | MinimumReserve | MWh  | See [Spendable energy](#spendable-energy); upgrades cannot spend below this  |     1 |
| Variable          | NetFlow        | MW   | Turbine Output − Pulverizer ElectricConsumption − Boiler ElectricConsumption | 25.03 |
| Variable          | EnergyChange   | MWh  | NetFlow × DeltaTimeSeconds / 3,600                                           |     — |

A run opens with 3 MWh of spendable energy above the reserve — enough for three full Stockpiles of coal at the starting price, or for a first round of upgrades. Because the Battery starts at 40% of capacity and `TargetEnergy` is 17.5 times the starting capacity, the Battery must be upgraded — eight times, to 256.3 MWh — before the run can be won.

`NetFlow` represents continuous generation and machine consumption. Coal purchases and upgrade costs are discrete expenses deducted directly from `Contents` when the player confirms them — upgrades limited by `SpendableEnergy`, coal by `StartupEnergy`.

## Setting, stress, and wear

`Capacity` is a rating, not a ceiling. Every machine accepts a `Setting` up to `MaxSetting` — twice its rating — and `Output` is `Capacity × Setting` across that whole range. Pushing past the rating is not penalised in output. It damages the machine.

| Type     | Parameter        | Unit | Description                                                        | Value |
| -------- | ---------------- | ---- | ------------------------------------------------------------------ | ----: |
| Constant | MaxSetting       | ×    | Highest Setting any machine accepts                                |     2 |
| Constant | StrainGain       | ×    | Largest fractional increase strain adds to stress                  |  1.25 |
| Constant | BacklogThreshold | %    | Output-store fill above which a producing machine starts to strain |  0.70 |
| Constant | StarveThreshold  | %    | Input-store fill below which a consuming machine starts to strain  |  0.30 |

These four are the only parts of this system every machine shares. `WearGrowth`, `WearRecovery`, and `RepairSeconds` are per-machine constants, listed in each machine's own table and compared under [Three machines, three problems](#three-machines-three-problems).

Each machine converts its `Setting` into a stress value — Temperature, Pressure, or Vibration — that grows linearly with the Setting and is raised further by `Strain`, the pressure of the store it is fighting:

```text
Stress   = BaseStress + StressRange × Setting × (1 + Strain)
Excess   = clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1)
WearRate = Tripped or Excess = 0 ? −WearRecovery : WearGrowth × Excess² × RunRatio
NextWear = clamp(Wear + WearRate × DeltaTimeSeconds, 0, 1)
```

`Stress` is not clamped to `MaxStress`; `Excess` is. A machine at `MaxSetting` under full strain reads well past its maximum, and the gauge simply pegs there.

When `Wear` reaches 1 the machine **trips**: it produces and consumes nothing for `RepairSeconds`, whatever its `Setting` says. The `Setting` is remembered and the machine resumes at it once the repair completes. Wear is scaled by `RunRatio` because a machine starved of input is not doing the work that damages it.

A tripped machine sheds at `WearRecovery` for the whole repair even though its `Setting` still puts it above the safe threshold; without that it would come back at `Wear = 1` and trip again on the next step. A machine that is merely starved is different: it holds its wear rather than shedding it, because `RunRatio = 0` zeroes the growth term without selecting the recovery branch.

How much a repair actually heals is `RepairSeconds × WearRecovery`, and it differs sharply: 0.40 for the Turbine, 0.16 for the Boiler, 0.064 for the Pulverizer, so they resume at 60%, 84%, and 94% wear. Only the Turbine comes back with room to push again. For the other two the repair is downtime rather than recovery — the recovery is a deliberate back-off afterwards, and a machine put straight back to work will trip again within seconds.

### Buffers and strain

A machine strains when it runs out of step with the chain. Overproducing strains the producer; overdrawing strains the consumer.

```text
Backlog = clamp((OutputStore Fill − BacklogThreshold) / (1 − BacklogThreshold), 0, 1)
Starve  = clamp((StarveThreshold − InputStore Fill) / StarveThreshold, 0, 1)
Strain  = StrainGain × (Backlog for the Pulverizer and Boiler, Starve for the Turbine)
```

| Machine    | Strain source | Bites when | Reads as                    | Clean ceiling |
| ---------- | ------------- | ---------- | --------------------------- | ------------: |
| Pulverizer | Silo fill     | above 70%  | grinding into a packed silo | 0.667 → 0.296 |
| Boiler     | Tank fill     | above 70%  | pushing into a full tank    | 0.694 → 0.309 |
| Turbine    | Tank fill     | below 30%  | running on starved steam    | 0.833 → 0.370 |

The Turbine inverts because it is the only pure consumer. Its output store is the Battery, which is never full until the run is already won, so a backlog rule would give it nothing; an empty Tank is what a Turbine actually suffers from. `Fill` is `Contents / Capacity` read at the start of the step, like every other input to a step.

`StrainGain` is measured rather than chosen, against two requirements: reading the gauge has to beat ignoring it by enough to be worth doing, and a run must not punish the player before they have done anything.

The measurement compares one policy against itself. Throttling against the strained ceiling, it reaches a median peak of 248 MWh and trips nothing. Throttling against the slack ceiling — the same play from someone who never looks at the gauge — it reaches 87 and trips a machine 2.7 times a run: a **65% penalty for ignoring strain**.

That penalty is what sets the constant. Under a gain of about 1.0 it falls to somewhere between 15% and 35%, inconsistently — strain becomes a mild tax on every run rather than something worth steering around. Over about 1.4 the opening spin-up trips the Turbine on its own, before the player has touched a control. 1.25 sits between: neglect costs about two thirds of the run, and the opening reaches 79% Turbine wear — alarming on the gauge, short of a trip.

**The stores become bands rather than tanks.** The Tank is squeezed from both ends: too full and the Boiler strains, too empty and the Turbine does. Neither end is a place to sit. The Silo has a wear penalty at one end only — full and the Pulverizer cooks, empty and the Boiler simply throttles, which costs output rather than damage. The Tank is the tighter rope, which is the second reason to buy its capacity before the Silo's.

**Storage capacity is what buys headroom.** Strain reads a fill fraction, so a larger store does not lower the strain at a given percentage. What it buys is time: more seconds of mismatch before the threshold is crossed, and more room to bank steam deliberately. That is the purchase that used to be a control upgrade, and it is now visible as a fill bar instead of a percentage on a card.

Because it is a fraction, a capacity upgrade moves the reading the instant it is bought. The same contents in a store 1.5× larger is a fill 1.5× lower, which relieves a backlog and deepens a starve at the same stroke. Buying Silo capacity is therefore an immediate reprieve for the Pulverizer, and buying Tank capacity relieves the Boiler while pushing the Turbine toward `StarveThreshold` until the extra steam is made. The Tank upgrade is the one that has to be timed rather than simply afforded — which is the same two-sided pressure the Tank already applies, now applied to the decision to enlarge it.

Strain also propagates a trip into its neighbours. A 40 s Boiler trip drains the Tank by 1,063 kg at the opening Settings — 35% of Tank capacity — while the Pulverizer keeps running and adds 192 kg to the Silo, 38% of Silo capacity. One machine going down pushes the store above it toward backlog and the store below it toward starvation, so the repair that follows is rarely the only cost.

### Why it is shaped this way

Wear accrues quadratically in `Excess` and sheds at a flat, slower rate. That asymmetry is the whole mechanic: no `Setting` above the safe threshold is sustainable, so the only way to use the range above it is to alternate — push, then back off and let the machine recover.

That duty cycle pays, and how much it pays is set by the ratio of `WearGrowth` to `WearRecovery`: a machine that sheds quickly can be pushed harder, because it spends less of the cycle recovering. At the starting controls the Turbine sheds fast enough to alternate indefinitely, and rides best around `Setting` 1.45 for an average of 1.15 × `Capacity`, 38% above its clean ceiling of 0.833. The Pulverizer and Boiler shed two to five times slower against much faster growth, so their own best ride points sit at 1.04 and 1.11 for averages of 0.86 and 0.90 — 28% and 30% above their lower ceilings of 0.667 and 0.694, over cycles of 250 s and 500 s.

Sitting at `MaxSetting` is worse than riding on all three, and far worse than parking at the safe ceiling: wear builds between three and twelve times faster than it sheds, so the machine spends nearly all of its life tripped. Averaged over that cycle it delivers 0.46 × `Capacity` for the Turbine, and 0.18 and 0.15 for the Boiler and Pulverizer, whose repairs barely heal them at all.

#### Three machines, three problems

In a chain matched to the Turbine's draw the three `Setting`s hold a fixed ratio of 0.791 : 0.886 : 1, so the player is really moving one throttle and the Turbine always sits highest. The wear constants are what stop that one throttle from being the whole game. Each machine's clean ceiling converts into a Turbine `Setting` below which it heals, and each sheds at its own rate once there; the figures below are for a matched chain with every store inside its thresholds, which is the only state in which strain is zero on all three at once.

| Machine    | Clean ceiling | Heals below Turbine | Loads at Turbine 1.45 | Clears from full | RepairSeconds |
| ---------- | ------------: | ------------------: | --------------------: | ---------------: | ------------: |
| Boiler     |         0.694 |               0.784 |            0.0082 / s |            250 s |            40 |
| Pulverizer |         0.667 |               0.843 |            0.0130 / s |            125 s |             8 |
| Turbine    |         0.833 |               0.833 |            0.0187 / s |             50 s |            20 |

Backing off is therefore cheap in depth and expensive in time. Dropping the Turbine from 1.45 to 0.78 heals all three at once and costs only 6% against the 0.833 the Turbine alone would need — but clearing the Turbine takes 50 s, the Pulverizer 125 s, and the Boiler 250 s. The question is never how far to back off. It is how long to stay there, and which machine you are willing to leave loaded.

The **Turbine** is the only machine that truly duty-cycles. Ride at 1.45, drop back, repeat: it sheds fast enough to sustain that indefinitely, and a trip costs 20 s off the one output that counts.

The **Pulverizer** loads fastest and forgives least. Left on the Turbine's own rhythm it reaches a trip after about 350 s of pushing, so it sets the first forced break. Its 8 s repair is misleading — it resumes at 94% wear and trips again almost at once unless the chain comes down properly. Its other cost is coal: pushing it past what the Boiler can consume fills the Silo, and the surplus is discarded after the player has already paid for it.

The **Boiler** is the long debt. It loads slowest, needs roughly 440 s of pushing to trip, and can be ignored for most of a run — but it clears at 250 s from full, and a 40 s trip is a fifteenth of the clock taken from the machine that feeds the Turbine, draining over a third of a full Tank at base capacity. Ignoring it is correct right up until it isn't. It is also the machine worth unbalancing on purpose: pushing it above the Turbine's draw banks steam in the Tank, which lets the Turbine keep earning at a high `Setting` while the Boiler sits low and heals. Tank capacity is what makes that window long enough to matter.

Tripping is what misjudging it costs, and it costs a different amount on each machine: 8 s, 20 s, and 40 s against a 600 s clock. A tripped machine also drains whatever storage sits downstream of it and backs up whatever sits upstream, which is the reason to buy Silo and Tank capacity as insurance and not only to hold more. The Tank is the more urgent of the two, because it stands between the longest repair and the only machine that generates.

Storage capacity is the only thing that buys the range back, and it buys it as time rather than as ceiling. The ceilings above hold for as long as the stores stay inside their thresholds; a bigger Tank does not raise the Boiler's 0.694, it lengthens the stretch of mismatch the Boiler can run before 0.694 starts falling. Because a redline always remains at zero strain, the decision the wear system poses is never removed — capacity only widens the window in which it can be answered calmly.

Pushing the Turbine alone still does not work, and now it fails twice over. A higher ride drags the Pulverizer and Boiler further above their own ceilings, and it drains the Tank faster than the Boiler refills it, so the Turbine strains itself as well. Raising the Boiler to keep up fills the Tank instead and strains the Boiler. The Tank level is the shared variable the two of them fight over, and the throttles have to move roughly together for either to pay.

### Oversupply and the matched chain

Output and every consumption rate are linear in `Setting`, so the ratios between machines never shift as the player pushes. At the starting Settings, and at any common multiple of them, no stage starves — but every stage is oversupplied. The Pulverizer makes 4.80 kg/s against the Boiler's 4.29 kg/s draw, and the Boiler makes 30.00 kg/s against the Turbine's 26.57 kg/s draw. Once the Silo and Tank fill, that surplus is discarded, and **21% of the raw coal bought is burned for output that is thrown away**.

Filling them is also what strains the two machines that did it. A common multiple is not merely wasteful; held long enough it drives the Silo and Tank past `BacklogThreshold` and starts wearing the Pulverizer and Boiler with coal the player has already paid for.

The efficient line is to match each machine to the draw below it rather than run them at a common multiple. At the starting capacities and Efficiencies that ratio is `Setting` 0.791 : 0.886 : 1 across Pulverizer, Boiler, and Turbine. It is fixed for a given set of capacities and Efficiencies, and it moves every time either is upgraded, so a matched chain has to be re-matched as the plant grows. The `Net MWh per tonne` figures under [The coal market](#the-coal-market) assume a matched chain; a player running a common multiple earns less than that table shows.

The ratio itself is still not surfaced. No card reports discarded output or names the matched Settings, and finding them is the reward for reading the numbers rather than a step the game walks the player through. What the UI does now report is the symptom: a Silo climbing toward its threshold says the Pulverizer is running ahead of the Boiler, and a Tank falling toward its own says the Turbine is running ahead of everything. The stores tell the player they are off the ratio; they never say what the ratio is. Running unmatched on purpose is still what refills a drained buffer after a trip — and now also what empties a backed-up one.

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

Each storage card displays its current contents, capacity, fill percentage, and capacity-upgrade cost in MWh. The Stockpile also displays coal-purchase controls, the current energy price per tonne, and a short history of that price — without it the player cannot tell a dip worth waiting out from the trend, and the timing decision is invisible. The Battery additionally displays its reserve, so the player can see why part of its contents is unspendable.

The Silo and Tank mark their strain thresholds on the fill bar — `BacklogThreshold` on both, and `StarveThreshold` on the Tank as well. Those marks are the only place the thresholds appear; without them the player watches a machine start to wear with nothing on screen explaining why.

```text
┌───────────────────────────────────────────┐
│ Stockpile                                 │
├───────────────────────────────────────────┤
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Coal price   {value} MWh/t  ▁▂▄▃▅▇▆ ▲     │
│ Buy coal     [-] {value} t [+]            │
│              [Buy: {cost} MWh]            │
│ Capacity     [Upgrade: {cost} MWh]        │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ Silo / Tank                               │
├───────────────────────────────────────────┤
│ Stored       █░░╵░░░░╷░░ {value} ({fill}%)│
│ Capacity     [Upgrade: {cost} MWh]        │
└───────────────────────────────────────────┘
              starve ╵      backlog ╷

┌───────────────────────────────────────────┐
│ Battery                                   │
├───────────────────────────────────────────┤
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Spendable    {value} MWh                  │
│ Reserved     {value} MWh                  │
│ Net flow     {value} MW                   │
│ Capacity     [Upgrade: {cost} MWh]        │
└───────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Pulverizer / Boiler / Turbine            │
├──────────────────────────────────────────┤
│ Capacity   {value} [Upgrade: {cost} MWh] │
│ Efficiency {value} [Upgrade: {cost} MWh] │
│ Setting    [-] {value} [+]               │
│ {Stress}   {value} ░░░█░░ clean to {max} │
│ Wear       ███████░░░ {n}% trips in {t}s │
│ Output     {value}                       │
└──────────────────────────────────────────┘
```

The player can move `Setting` freely between zero and `MaxSetting`. Reducing it to zero turns the machine off; increasing it above zero enables the machine. Settings above the machine's clean ceiling are allowed and accrue wear. `Capacity` and `Efficiency` can only be increased by spending the displayed energy cost.

Each machine card shows its stress against the safe and maximum thresholds, the `Setting` at which stress would cross the safe threshold, and a `Wear` gauge carrying the time left before a trip at the current rate. Together those answer the only question the card has to answer: how long can I hold this. A tripped machine shows its repair countdown in place of its output. The best `Setting` to ride is never labelled — judging it against the clock is the decision the card exists to pose.

The `clean to {max}` figure is live, not a constant: it is the current ceiling including `Strain`, so it falls as the neighbouring store moves toward its threshold. A player who never touches the throttle can still watch it come down to meet them, which is the card's way of reporting that the chain has drifted out of balance.

An upgrade button is disabled whenever its cost exceeds `SpendableEnergy`.
