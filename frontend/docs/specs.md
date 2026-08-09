# Overpowered

## Objective

A game is a single timed run. The player wins by raising the Battery's stored energy to `TargetEnergy` before `TimeLimit` elapses; the run ends in defeat when the timer expires first.

| Type     | Parameter    | Unit | Description                          | Value |
| -------- | ------------ | ---- | ------------------------------------ | ----: |
| Constant | TargetEnergy | MWh  | Stored energy that wins the run      |    40 |
| Constant | TimeLimit    | s    | Time available to reach TargetEnergy |   600 |

- The win is checked against `Battery Contents` — energy that has been generated and then spent is not banked. Reaching the target requires a Battery `Capacity` of at least `TargetEnergy`.
- The win triggers the instant `Contents ≥ TargetEnergy`, at any point during the run.
- On defeat the run ends and every component resets to its starting value. The highest stored energy reached is recorded as the player's best result.
- Because upgrades compound, the central decision of a run is _when to stop reinvesting and start banking_: energy spent on upgrades is energy not counted toward the target, but an under-built plant cannot fill the Battery before the timer expires.

`TargetEnergy` is set to roughly 80% of the peak achievable under strong play with these parameters, and must be re-measured whenever the economy is retuned. **The current value of 40 predates the coal market and has not been re-measured against it** — it is a placeholder until the simulation exists and strong play can be sampled.

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

| Type     | Parameter       | Unit | Description / Formula                                              |  Value |
| -------- | --------------- | ---- | ------------------------------------------------------------------ | -----: |
| Constant | ReserveFraction | %    | Share of Battery Capacity held back from upgrade spending          |   0.10 |
| Constant | StartupSeconds  | s    | Machine runtime the restart floor must cover                       |     30 |
| Variable | MinimumReserve  | MWh  | Battery Capacity × ReserveFraction                                 |      1 |
| Variable | SpendableEnergy | MWh  | max(0, Battery Contents − MinimumReserve)                          |      3 |
| Variable | StartupEnergy   | MWh  | (Pulverizer + Boiler ElectricConsumption) × StartupSeconds / 3,600 | 0.0455 |

**Upgrades** are limited by `SpendableEnergy`. This is the floor the player sees and plans around: it stops a run from being wrecked by one over-ambitious purchase, and because it is a share of Battery `Capacity` it keeps scaling as the plant grows.

**Coal purchases** are limited by `max(0, Contents − StartupEnergy)` instead. Coal is the only purchase that can restart a stalled chain, so it must remain affordable even at the reserve — a player sitting at `MinimumReserve` with an empty Stockpile would otherwise be unable to act at all. `StartupEnergy` is the residue that stops the opposite trap: spending the last of the Battery on coal that there is then no electricity left to pulverize.

**Machines** draw from the full `Contents` and may take it below both floors. The floors restrict discrete spending only; they are not brownout thresholds.

Together these cover every recoverable case. `StartupEnergy` always covers the Pulverizer and Boiler for `StartupSeconds`, and because a machine throttles instead of stopping, the Turbine begins returning energy as soon as the first steam reaches the Tank — well inside that window. `StartupEnergy` is derived from current consumption, so it scales with every capacity upgrade. From a Battery sitting at `MinimumReserve` with the whole chain empty, one coal purchase restarts production and the Battery recovers without ever reaching zero.

Both floors are denominated in energy rather than coal, so the rising coal price does not break them — it only means the same reserve buys less coal, and a late restart is tighter than an early one. At base capacities a restart from `MinimumReserve` buys 954 kg of raw coal at the opening price and 533 kg at the end-of-run trend: 85 s of Pulverizer runtime against the few seconds the Turbine needs before it starts returning energy. Both sides of that comparison scale with capacity — the reserve with the Battery's, the coal draw with the Pulverizer's — so a player who lets the Battery fall far behind the rest of the plant narrows the margin.

The floors cannot cover every case, because the player can always choose a configuration that consumes energy without producing any — running the Pulverizer and Boiler with the Turbine's `Setting` at zero drains the Battery no matter what the floors are. That is handled as a loss condition rather than a spending rule; see [Stalling](#stalling).

`StartingCharge` must exceed `MinimumReserve`, otherwise no upgrade is affordable at the start of a run.

### Upgrade costs

Every upgrade track is priced independently and grows geometrically with the number of times that track has been purchased:

`UpgradeCost(n) = BaseCost × CostGrowth^n`

where `n` is the number of upgrades already bought on that track, starting at zero.

| Type     | Parameter      | Unit | Description                                                           | Value |
| -------- | -------------- | ---- | --------------------------------------------------------------------- | ----: |
| Constant | CostGrowth     | ×    | Cost multiplier per level, applied per track                          |  1.55 |
| Constant | CapacityGrowth | ×    | Capacity multiplier per capacity upgrade                              |   1.5 |
| Constant | UpgradeGain    | %    | Share of the remaining gap closed by an Efficiency or control upgrade |  0.25 |

| Upgrade track                             | BaseCost (MWh) | Effect                                                   |
| ----------------------------------------- | -------------: | -------------------------------------------------------- |
| Capacity (Pulverizer, Boiler, Turbine)    |           0.02 | Capacity × CapacityGrowth                                |
| Capacity (Stockpile, Silo, Tank, Battery) |           0.02 | Capacity × CapacityGrowth                                |
| Efficiency (Pulverizer, Boiler, Turbine)  |           0.05 | Efficiency += (MaxEfficiency − Efficiency) × UpgradeGain |
| Control (Cooling, Regulation, Stability)  |           0.05 | Control += (MaxControl − Control) × UpgradeGain          |

Capacity upgrades are multiplicative rather than additive. Coal cost and energy output both scale linearly with throughput, so additive upgrades would leave profit per unit of throughput constant and each upgrade would take longer to afford than the last. Multiplying capacity is what makes a run accelerate.

Efficiency and the machine controls close a fixed share of the distance to their cap on each purchase, so they approach `MaxEfficiency` and `MaxControl` without ever exceeding them. `MaxEfficiency` is strictly below 1 — an Efficiency of 1 or greater would make the plant produce energy from nothing.

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
| Starting Efficiency of 0.85 |                          1.79 |               10:00 |
| Efficiency at its 0.95 cap  |                          2.30 |     after the timer |

Both figures are for a chain matched to the Turbine's steam draw, and neither depends on `Capacity` or on the three controls: a capacity upgrade scales revenue and coal consumption by the same factor, and a control upgrade buys wear headroom rather than output. `Efficiency` is the only track that moves this number. Against a rising price, **Capacity buys speed, Efficiency buys survival, and control buys headroom** — a plant that never touches Efficiency reaches break-even exactly as the timer expires, while one at `MaxEfficiency` still holds a 22% margin and is threatened only by a market spike near the clamp.

That band is only 1.29× wide, because `Efficiency` spans just 0.85 to 0.95. It is narrow enough that no exponential price curve can both spare a well-run plant and sharply punish a neglected one, so the market as tuned applies steady pressure rather than a deadline. Widening it means widening the `Efficiency` range, which would need the chain rebalanced around the new starting value — an open tuning question, not a settled one.

The rising price also sharpens the closing decision. Net income is `Throughput × (YieldPerTonne − CoalPrice)`, and the second factor shrinks all run no matter how large the plant grows, so there is a point past which no reinvestment can pay itself back and banking is the only correct move.

Because the price only ever trends upward, a full Stockpile is worth more than the energy that bought it, and the decision in a coal purchase is timing: buying into a spike wastes energy, but waiting out a dip starves the Pulverizer. Stockpile `Capacity` is what buys the ability to wait, which is the reason it is an upgrade worth considering against throughput.

### Pulverizer

The Pulverizer converts raw coal supplied by the Stockpile into pulverized coal stored in the Silo.

| Type              | Parameter           | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum pulverized coal throughput                                                |     8 |
| Player controlled | Efficiency          | %     | Electrical consumption performance                                                |  0.85 |
| Player controlled | Cooling             | %     | Temperature control                                                               |   0.4 |
| Player controlled | Setting             | ×     | Operating level, from 0 to MaxSetting                                             |   0.8 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                                    |  0.95 |
| Constant          | MaxCooling          | %     | Highest Cooling obtainable through upgrades                                       |  0.75 |
| Constant          | BaseConsumption     | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | PulverizedCoalYield | kg/kg | Pulverized coal produced per kg of raw coal                                       |  0.95 |
| Constant          | BaseTemperature     | °C    | Minimum temperature                                                               |    30 |
| Constant          | TemperatureRange    | °C    | Additional temperature as Setting rises                                           |   100 |
| Constant          | SafeTemperature     | °C    | Temperature below which no wear accrues                                           |    80 |
| Constant          | MaxTemperature      | °C    | Temperature at which wear accrues fastest                                         |   150 |
| Variable          | Temperature         | °C    | BaseTemperature + TemperatureRange × Setting × (1 − Cooling)                      |    78 |
| Variable          | ExcessTemperature   | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) |     0 |
| Variable          | Wear                | %     | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear)       |     0 |
| Variable          | Output              | kg/s  | Capacity × Setting                                                                |  6.40 |
| Variable          | RawCoalConsumption  | kg/s  | Output / PulverizedCoalYield                                                      |  6.74 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                               |  0.75 |

At the starting `Cooling` of 0.4 the Pulverizer runs clean up to a `Setting` of 0.833 and reaches `MaxTemperature` at `MaxSetting`. Cooling upgrades raise that clean ceiling — see [Setting, stress, and wear](#setting-stress-and-wear).

### Silo

The Silo stores pulverized coal produced by the Pulverizer and supplies it to the Boiler. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                      | Value |
| ----------------- | --------- | ---- | ------------------------------------------ | ----: |
| Player controlled | Capacity  | t    | Maximum pulverized coal that can be stored |   0.5 |
| Variable          | Contents  | t    | Pulverized coal currently stored           |     0 |

The player can increase `Capacity` by purchasing a Silo capacity upgrade with energy stored in the Battery. The upgrade is unavailable when the Battery does not contain the displayed energy cost.

### Boiler

The Boiler burns pulverized coal supplied by the Silo to produce high-pressure steam stored in the Tank. At base conversion, one kg of pulverized coal produces eight kg of steam; Boiler efficiency reduces the fuel required to reach the requested output.

| Type              | Parameter           | Unit  | Description / Formula                                                       | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum steam output                                                        |    50 |
| Player controlled | Efficiency          | %     | Fuel and electrical consumption performance                                 |  0.85 |
| Player controlled | Regulation          | %     | Pressure control                                                            |   0.4 |
| Player controlled | Setting             | ×     | Operating level, from 0 to MaxSetting                                       |   0.8 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                              |  0.95 |
| Constant          | MaxRegulation       | %     | Highest Regulation obtainable through upgrades                              |  0.75 |
| Constant          | BaseConsumption     | MJ/kg | Electrical consumption per kg of requested steam                            |   0.1 |
| Constant          | SteamYield          | kg/kg | Base steam produced per kg of pulverized coal                               |     8 |
| Constant          | BasePressure        | bar   | Minimum pressure                                                            |    20 |
| Constant          | PressureRange       | bar   | Additional pressure the Boiler can generate as Setting rises                |   180 |
| Constant          | SafePressure        | bar   | Pressure below which no wear accrues                                        |   110 |
| Constant          | MaxPressure         | bar   | Pressure at which wear accrues fastest                                      |   236 |
| Variable          | Pressure            | bar   | BasePressure + PressureRange × Setting × (1 − Regulation)                   | 106.4 |
| Variable          | ExcessPressure      | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1)       |     0 |
| Variable          | Wear                | %     | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear) |     0 |
| Variable          | Output              | kg/s  | Capacity × Setting                                                          | 40.00 |
| Variable          | FuelConsumption     | kg/s  | Output / (SteamYield × Efficiency)                                          |  5.88 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                         |  4.71 |

At the starting `Regulation` of 0.4 the Boiler runs clean up to a `Setting` of 0.833 and reaches `MaxPressure` at `MaxSetting`. Regulation upgrades raise that clean ceiling — see [Setting, stress, and wear](#setting-stress-and-wear).

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
| Player controlled | Efficiency       | %       | Steam consumption performance                                               |  0.85 |
| Player controlled | Stability        | %       | Vibration control                                                           |   0.4 |
| Player controlled | Setting          | ×       | Operating level, from 0 to MaxSetting                                       |   0.8 |
| Constant          | MaxEfficiency    | %       | Highest Efficiency obtainable through upgrades                              |  0.95 |
| Constant          | MaxStability     | %       | Highest Stability obtainable through upgrades                               |  0.75 |
| Constant          | BaseConsumption  | kg/s/MW | Steam consumption per MW                                                    |  0.75 |
| Constant          | BaseVibration    | mm/s    | Minimum vibration                                                           |     1 |
| Constant          | VibrationRange   | mm/s    | Additional vibration as Setting rises                                       |    10 |
| Constant          | SafeVibration    | mm/s    | Vibration below which no wear accrues                                       |     6 |
| Constant          | MaxVibration     | mm/s    | Vibration at which wear accrues fastest                                     |    13 |
| Variable          | Vibration        | mm/s    | BaseVibration + VibrationRange × Setting × (1 − Stability)                  |   5.8 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1)   |     0 |
| Variable          | Wear             | %       | Overdrive damage; see [Setting, stress, and wear](#setting-stress-and-wear) |     0 |
| Variable          | Output           | MW      | Capacity × Setting                                                          | 40.00 |
| Variable          | SteamConsumption | kg/s    | (Setting × Capacity × BaseConsumption) / Efficiency                         | 35.29 |

At the starting `Stability` of 0.4 the Turbine runs clean up to a `Setting` of 0.833 and reaches `MaxVibration` at `MaxSetting`. Stability upgrades raise that clean ceiling — see [Setting, stress, and wear](#setting-stress-and-wear).

### Battery

The Battery stores electricity produced by the Turbine and supplies electricity to the Pulverizer and Boiler. Power in MW is converted to stored energy in MWh using the simulation interval in seconds.

| Type              | Parameter      | Unit | Description / Formula                                                        | Value |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity       | MWh  | Maximum electricity that can be stored                                       |    10 |
| Constant          | StartingCharge | MWh  | Electricity available at the start of a new run                              |     4 |
| Variable          | Contents       | MWh  | Electricity currently stored; initially equal to StartingCharge              |     4 |
| Variable          | MinimumReserve | MWh  | Capacity × ReserveFraction; upgrades cannot spend below this                 |     1 |
| Variable          | NetFlow        | MW   | Turbine Output − Pulverizer ElectricConsumption − Boiler ElectricConsumption | 34.54 |
| Variable          | EnergyChange   | MWh  | NetFlow × DeltaTimeSeconds / 3,600                                           |     — |

A run opens with 3 MWh of spendable energy above the reserve — enough for three full Stockpiles of coal at the starting price, or for a first round of upgrades. Because the Battery starts at 40% of capacity and `TargetEnergy` is four times the starting capacity, the Battery must be upgraded before the run can be won.

`NetFlow` represents continuous generation and machine consumption. Coal purchases and upgrade costs are discrete expenses deducted directly from `Contents` when the player confirms them — upgrades limited by `SpendableEnergy`, coal by `StartupEnergy`.

## Setting, stress, and wear

`Capacity` is a rating, not a ceiling. Every machine accepts a `Setting` up to `MaxSetting` — twice its rating — and `Output` is `Capacity × Setting` across that whole range. Pushing past the rating is not penalised in output. It damages the machine.

| Type     | Parameter     | Unit | Description                                         | Value |
| -------- | ------------- | ---- | --------------------------------------------------- | ----: |
| Constant | MaxSetting    | ×    | Highest Setting any machine accepts                 |     2 |
| Constant | WearGrowth    | 1/s  | Wear accrued per second at Excess = 1               | 0.067 |
| Constant | WearRecovery  | 1/s  | Wear shed per second while below the safe threshold |  0.02 |
| Constant | RepairSeconds | s    | Time a tripped machine stays offline                |    20 |

Each machine converts its `Setting` into a stress value — Temperature, Pressure, or Vibration — that grows linearly with the Setting and is reduced by that machine's control:

```text
Excess   = clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1)
WearRate = Excess > 0 ? WearGrowth × Excess² × RunRatio : −WearRecovery
NextWear = clamp(Wear + WearRate × DeltaTimeSeconds, 0, 1)
```

When `Wear` reaches 1 the machine **trips**: it produces and consumes nothing for `RepairSeconds`, whatever its `Setting` says. The `Setting` is remembered and the machine resumes at it once the repair completes, and wear sheds throughout, so a machine comes back with room to push again. Wear is scaled by `RunRatio` because a machine starved of input is not doing the work that damages it.

### Why it is shaped this way

Wear accrues quadratically in `Excess` and sheds at a flat, slower rate. That asymmetry is the whole mechanic: no `Setting` above the safe threshold is sustainable, so the only way to use the range above it is to alternate — push, then back off and let the machine recover.

That duty cycle pays. At the starting control of 0.4 a machine is clean up to `Setting` 0.833. Riding around `Setting` 1.45 and dropping back to 0.833 to shed wear settles near half the time in each state and averages about 1.15 × `Capacity`, roughly 38% more than parking at the safe ceiling. Sitting at `MaxSetting` is worse than both: wear builds three times faster than it sheds, so the machine spends most of its life recovering. There is a best place to ride, it is well above the rating, and it is nowhere near the top.

Tripping is what misjudging it costs. `RepairSeconds` is dead time on a 600 s clock, and a tripped machine drains whatever storage sits downstream of it — which is the reason to buy Silo and Tank capacity as insurance, not only to hold more.

Control upgrades buy the range back. Each one flattens the stress curve and lifts the wear-free ceiling: 0.833 at the starting 0.4, then 0.98, 1.12, 1.26, 1.39 over the next four purchases. Because `UpgradeGain` closes a fixed share of the remaining gap, the control approaches `MaxControl` without reaching it, so the ceiling approaches `MaxSetting` without ever arriving — some redline range always remains, and control converts risk into free output without ever removing the decision.

The chain stays balanced through all of this. Output and every consumption rate are now linear in `Setting`, so the ratios between machines do not shift as the player pushes: the Pulverizer's output covers the Boiler's fuel draw and the Boiler's output covers the Turbine's steam draw at the starting Settings and at any common multiple of them.

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
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Capacity     [Upgrade: {cost} MWh]        │
└───────────────────────────────────────────┘

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
│ Control    {value} [Upgrade: {cost} MWh] │
│ Setting    [-] {value} [+]               │
│ {Stress}   {value} ░░░█░░ clean to {max} │
│ Wear       ███████░░░ {n}% trips in {t}s │
│ Output     {value}                       │
└──────────────────────────────────────────┘
```

The player can move `Setting` freely between zero and `MaxSetting`. Reducing it to zero turns the machine off; increasing it above zero enables the machine. Settings above the machine's clean ceiling are allowed and accrue wear. `Capacity`, `Efficiency`, and the component-specific control (`Cooling`, `Regulation`, or `Stability`) can only be increased by spending the displayed energy cost.

Each machine card shows its stress against the safe and maximum thresholds, the `Setting` at which stress would cross the safe threshold, and a `Wear` gauge carrying the time left before a trip at the current rate. Together those answer the only question the card has to answer: how long can I hold this. A tripped machine shows its repair countdown in place of its output. The best `Setting` to ride is never labelled — judging it against the clock is the decision the card exists to pose.

An upgrade button is disabled whenever its cost exceeds `SpendableEnergy`.
