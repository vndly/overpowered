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

`TargetEnergy` is set to roughly 80% of the peak achievable under strong play with these parameters, and must be re-measured whenever the economy is retuned.

### Stalling

A run is lost immediately, without waiting for the timer, when the Battery, Stockpile, Silo, and Tank are all empty at the same time. In that state nothing can produce and nothing can be bought, so the run cannot be recovered.

This is reachable only through a configuration that spends energy without generating any — most simply, running the Pulverizer and Boiler with the Turbine's `Setting` at zero until the Battery drains. Ending the run at once states the outcome plainly instead of leaving the player watching a dead plant until the clock expires.

## Production flow

```text
Stockpile -> Pulverizer -> Silo -> Boiler -> Tank -> Turbine -> Battery
```

The Stockpile, Silo, Tank, and Battery are storage components. Their stored amounts are clamped between zero and their current capacity. Output produced beyond the available storage capacity is silently discarded.

Machines have no separate enable control. A machine is enabled when `Setting > 0` and off when `Setting = 0`. How far it actually runs is set by its inputs, as described under [Simulation step](#simulation-step):

- When a machine's output storage is full, the machine continues running without pausing or changing its Setting. It continues consuming its normal inputs and electricity, and any output that cannot be stored is silently discarded.
- A machine only consumes resources while it is running. The rates in the component tables assume that input and electricity are available; output-storage capacity does not affect those rates.
- During each simulation step, the amount added to output storage is `min(ProducedOutput, Capacity − Contents)`. The remaining `ProducedOutput` is discarded. This rule also applies to electricity produced while the Battery is full.

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
| CoalPrice                                 |           0.10 | CoalPrice × (1 − PriceReduction), floored                |

Capacity upgrades are multiplicative rather than additive. Coal cost and energy output both scale linearly with throughput, so additive upgrades would leave profit per unit of throughput constant and each upgrade would take longer to afford than the last. Multiplying capacity is what makes a run accelerate.

Efficiency and the machine controls close a fixed share of the distance to their cap on each purchase, so they approach `MaxEfficiency` and `MaxControl` without ever exceeding them. `MaxEfficiency` is strictly below 1 — an Efficiency of 1 or greater would make the plant produce energy from nothing.

## Components

### Stockpile

The Stockpile stores raw coal purchased by the player. A purchase adds as much of the requested coal as will fit and as the player can afford, then deducts the resulting energy cost from the Battery. The UI displays raw coal quantities in metric tonnes (`t`), where `1 t = 1,000 kg`; simulation calculations and machine throughput continue to use kg and kg/s internally.

| Type              | Parameter        | Unit  | Description / Formula                                                                         | Value |
| ----------------- | ---------------- | ----- | --------------------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | t     | Maximum raw coal that can be stored                                                           |     1 |
| Player controlled | CoalPrice        | MWh/t | Current energy price                                                                          |     1 |
| Constant          | PriceReduction   | %     | CoalPrice reduction from each price upgrade                                                   |  0.20 |
| Constant          | MinimumCoalPrice | MWh/t | Lowest price obtainable through upgrades                                                      |  0.20 |
| Variable          | Contents         | t     | Raw coal currently stored                                                                     |     0 |
| Variable          | PurchasedCoal    | t     | min(RequestedCoal, Capacity − Contents, max(0, Battery Contents − StartupEnergy) / CoalPrice) |     — |
| Variable          | PurchaseCost     | MWh   | PurchasedCoal × CoalPrice                                                                     |     — |

The player can buy any positive amount of raw coal. `Capacity` can be increased with a capacity upgrade. `CoalPrice` can be reduced with an expensive price upgrade:

`NextCoalPrice = max(MinimumCoalPrice, CoalPrice × (1 − PriceReduction))`

At the starting price, coal consumes roughly 71% of the Turbine's gross output; at `MinimumCoalPrice` it consumes roughly 14%. Net income after coal therefore rises from 3.9 MWh/h to 21.9 MWh/h — a 5.6× multiplier — without any throughput upgrade at all. Cutting the coal price is the highest-leverage purchase in the game, and eight price upgrades take it from the starting value to the floor.

### Pulverizer

The Pulverizer converts raw coal supplied by the Stockpile into pulverized coal stored in the Silo.

| Type              | Parameter           | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum pulverized coal throughput                                                |     8 |
| Player controlled | Efficiency          | %     | Electrical consumption performance                                                |  0.85 |
| Player controlled | Cooling             | %     | Temperature control                                                               |   0.4 |
| Player controlled | Setting             | %     | Operating level                                                                   |   0.8 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                                    |  0.95 |
| Constant          | MaxCooling          | %     | Highest Cooling obtainable through upgrades                                       |  0.75 |
| Constant          | BaseConsumption     | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | PulverizedCoalYield | kg/kg | Pulverized coal produced per kg of raw coal                                       |  0.95 |
| Constant          | BaseTemperature     | °C    | Minimum temperature                                                               |    30 |
| Constant          | TemperatureRange    | °C    | Additional temperature as Setting rises                                           |   100 |
| Constant          | SafeTemperature     | °C    | Temperature below which there is no output penalty                                |    70 |
| Constant          | MaxTemperature      | °C    | Temperature where the output penalty reaches its maximum                          |   100 |
| Constant          | TemperaturePenalty  | %     | Maximum temperature penalty                                                       |     1 |
| Variable          | Temperature         | °C    | BaseTemperature + TemperatureRange × Setting × (1 − Cooling)                      |    78 |
| Variable          | ExcessTemperature   | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) | 0.267 |
| Variable          | Output              | kg/s  | Capacity × Setting × (1 − ExcessTemperature² × TemperaturePenalty)                |  5.94 |
| Variable          | RawCoalConsumption  | kg/s  | Output / PulverizedCoalYield                                                      |  6.26 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                               |  0.75 |

At the starting `Cooling` of 0.4 the Pulverizer's most productive `Setting` is 0.81; at `MaxCooling` it is 1.

### Silo

The Silo stores pulverized coal produced by the Pulverizer and supplies it to the Boiler. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                      | Value |
| ----------------- | --------- | ---- | ------------------------------------------ | ----: |
| Player controlled | Capacity  | t    | Maximum pulverized coal that can be stored |   0.5 |
| Variable          | Contents  | t    | Pulverized coal currently stored           |     0 |

The player can increase `Capacity` by purchasing a Silo capacity upgrade with energy stored in the Battery. The upgrade is unavailable when the Battery does not contain the displayed energy cost.

### Boiler

The Boiler burns pulverized coal supplied by the Silo to produce high-pressure steam stored in the Tank. At base conversion, one kg of pulverized coal produces eight kg of steam; Boiler efficiency reduces the fuel required to reach the requested output.

| Type              | Parameter           | Unit  | Description / Formula                                                 | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum steam output                                                  |    50 |
| Player controlled | Efficiency          | %     | Fuel and electrical consumption performance                           |  0.85 |
| Player controlled | Regulation          | %     | Pressure control                                                      |   0.4 |
| Player controlled | Setting             | %     | Operating level                                                       |   0.8 |
| Constant          | MaxEfficiency       | %     | Highest Efficiency obtainable through upgrades                        |  0.95 |
| Constant          | MaxRegulation       | %     | Highest Regulation obtainable through upgrades                        |  0.75 |
| Constant          | BaseConsumption     | MJ/kg | Electrical consumption per kg of requested steam                      |   0.1 |
| Constant          | SteamYield          | kg/kg | Base steam produced per kg of pulverized coal                         |     8 |
| Constant          | BasePressure        | bar   | Minimum pressure                                                      |    20 |
| Constant          | PressureRange       | bar   | Additional pressure the Boiler can generate as Setting rises          |   180 |
| Constant          | SafePressure        | bar   | Pressure below which the Boiler operates without an output penalty    |    80 |
| Constant          | MaxPressure         | bar   | Pressure at which the pressure penalty reaches its maximum            |   160 |
| Constant          | PressurePenalty     | %     | Maximum pressure penalty                                              |     1 |
| Variable          | Pressure            | bar   | BasePressure + PressureRange × Setting × (1 − Regulation)             | 106.4 |
| Variable          | ExcessPressure      | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1) | 0.330 |
| Variable          | Output              | kg/s  | Capacity × Setting × (1 − ExcessPressure² × PressurePenalty)          | 35.64 |
| Variable          | FuelConsumption     | kg/s  | Output / (SteamYield × Efficiency)                                    |  5.24 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                   |  4.71 |

At the starting `Regulation` of 0.4 the Boiler's most productive `Setting` is 0.84; at `MaxRegulation` it is 1.

### Tank

The Tank stores high-pressure steam produced by the Boiler and supplies it to the Turbine. Its contents and capacity are displayed in metric tonnes, while production and consumption rates continue to use kg/s internally.

| Type              | Parameter | Unit | Description / Formula                          | Value |
| ----------------- | --------- | ---- | ---------------------------------------------- | ----: |
| Player controlled | Capacity  | t    | Maximum high-pressure steam that can be stored |     3 |
| Variable          | Contents  | t    | High-pressure steam currently stored           |     0 |

The player can increase `Capacity` by purchasing a Tank capacity upgrade with energy stored in the Battery. The upgrade is unavailable when the Battery does not contain the displayed energy cost.

### Turbine

The Turbine converts high-pressure steam supplied by the Tank into electrical power stored in the Battery.

| Type              | Parameter        | Unit    | Description / Formula                                                     | Value |
| ----------------- | ---------------- | ------- | ------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | MW      | Maximum output                                                            |    50 |
| Player controlled | Efficiency       | %       | Steam consumption performance                                             |  0.85 |
| Player controlled | Stability        | %       | Vibration control                                                         |   0.4 |
| Player controlled | Setting          | %       | Operating level                                                           |   0.8 |
| Constant          | MaxEfficiency    | %       | Highest Efficiency obtainable through upgrades                            |  0.95 |
| Constant          | MaxStability     | %       | Highest Stability obtainable through upgrades                             |  0.75 |
| Constant          | BaseConsumption  | kg/s/MW | Steam consumption per MW                                                  |  0.75 |
| Constant          | BaseVibration    | mm/s    | Minimum vibration                                                         |     1 |
| Constant          | VibrationRange   | mm/s    | Additional vibration as Setting rises                                     |    10 |
| Constant          | SafeVibration    | mm/s    | Vibration below which there is no penalty                                 |     4 |
| Constant          | MaxVibration     | mm/s    | Vibration where penalty reaches maximum                                   |     8 |
| Constant          | VibrationPenalty | %       | Maximum vibration penalty                                                 |     1 |
| Variable          | Vibration        | mm/s    | BaseVibration + VibrationRange × Setting × (1 − Stability)                |   5.8 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1) |  0.45 |
| Variable          | Output           | MW      | Capacity × Setting × (1 − ExcessVibration² × VibrationPenalty)            | 31.90 |
| Variable          | SteamConsumption | kg/s    | (Setting × Capacity × BaseConsumption) / Efficiency                       | 35.29 |

At the starting `Stability` of 0.4 the Turbine's most productive `Setting` is 0.76; at `MaxStability` it is 1.

### Battery

The Battery stores electricity produced by the Turbine and supplies electricity to the Pulverizer and Boiler. Power in MW is converted to stored energy in MWh using the simulation interval in seconds.

| Type              | Parameter      | Unit | Description / Formula                                                        | Value |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity       | MWh  | Maximum electricity that can be stored                                       |    10 |
| Constant          | StartingCharge | MWh  | Electricity available at the start of a new run                              |     4 |
| Variable          | Contents       | MWh  | Electricity currently stored; initially equal to StartingCharge              |     4 |
| Variable          | MinimumReserve | MWh  | Capacity × ReserveFraction; upgrades cannot spend below this                 |     1 |
| Variable          | NetFlow        | MW   | Turbine Output − Pulverizer ElectricConsumption − Boiler ElectricConsumption | 26.44 |
| Variable          | EnergyChange   | MWh  | NetFlow × DeltaTimeSeconds / 3,600                                           |     — |

A run opens with 3 MWh of spendable energy above the reserve — enough for three full Stockpiles of coal at the starting price, or for a first round of upgrades. Because the Battery starts at 40% of capacity and `TargetEnergy` is four times the starting capacity, the Battery must be upgraded before the run can be won.

`NetFlow` represents continuous generation and machine consumption. Coal purchases and upgrade costs are discrete expenses deducted directly from `Contents` when the player confirms them — upgrades limited by `SpendableEnergy`, coal by `StartupEnergy`.

## Setting and the stress curve

Each machine converts its `Setting` into a stress value — Temperature, Pressure, or Vibration — that grows linearly with the Setting and is reduced by that machine's control. Stress above the machine's safe threshold cuts output:

```text
Excess  = clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1)
Output  = Capacity × Setting × (1 − Excess² × MaxPenalty)
```

The penalty is quadratic in `Excess` and reaches a full 100% at `MaxStress`. Both properties are required for the Setting to be a real decision. Output rises linearly with `Setting` while the penalty rises faster, so each machine has a most productive Setting strictly below its maximum, and pushing past that point produces _less_, not more.

A linear penalty capped below 100% cannot do this: the Setting term would outgrow the penalty term at every point, making maximum Setting unconditionally optimal.

Raising a machine's control flattens its stress curve and moves its most productive Setting upward, until at the control's cap the machine can run at `Setting = 1` with no penalty. Control upgrades are therefore bought to unlock output the machine already has, not to add new capacity.

At the starting control value of 0.4, the three machines peak at Settings of 0.81, 0.84, and 0.76 — close to, but not exactly, the 0.8 they start at. The chain is close to balanced both at the starting Settings and at the optimal ones: the Pulverizer's output covers the Boiler's fuel draw, and the Boiler's output covers the Turbine's steam draw, with a small surplus in each case.

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

Each storage card displays its current contents, capacity, fill percentage, and capacity-upgrade cost in MWh. The Stockpile also displays coal-purchase controls, the current energy price per tonne, and the expensive price-upgrade cost. The Battery additionally displays its reserve, so the player can see why part of its contents is unspendable.

```text
┌───────────────────────────────────────────┐
│ Stockpile                                 │
├───────────────────────────────────────────┤
│ Stored       █░░░░░░░░░ {value} ({fill}%) │
│ Coal price   1 MWh/t                      │
│ Buy coal     [-] {value} t [+]            │
│              [Buy: {cost} MWh]            │
│ Capacity     [Upgrade: {cost} MWh]        │
│ Coal price   [Upgrade: {cost} MWh]        │
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
│ {Stress}   {value} ░░░█░░ (−{penalty}%)  │
│ Output     {value}                       │
└──────────────────────────────────────────┘
```

The player can decrease or increase `Setting` freely. Reducing it to zero turns the machine off; increasing it above zero enables the machine. `Capacity`, `Efficiency`, and the component-specific control (`Cooling`, `Regulation`, or `Stability`) can only be increased by spending the displayed energy cost.

Each machine card shows its stress value against its safe and maximum thresholds, and the output penalty currently being applied. Without that readout the player cannot see why raising the Setting stopped helping, and the central mechanic of the game is invisible. The most productive Setting is never labelled — finding it is the decision the machine card exists to pose.

An upgrade button is disabled whenever its cost exceeds `SpendableEnergy`.
