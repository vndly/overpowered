# Overpowered

## Production flow

```text
Stockpile -> Pulverizer -> Silo -> Boiler -> Tank -> Turbine -> Battery
```

The Stockpile, Silo, Tank, and Battery are storage components. Their stored amounts are clamped between zero and their current capacity. Output produced beyond the available storage capacity is silently discarded.

Machines have no separate enable control. A machine is enabled when `Setting > 0` and off when `Setting = 0`. Its `Running` state is derived from its Setting and the availability of its required inputs:

- When a machine's output storage is full, the machine continues running without pausing or changing its Setting. It continues consuming its normal inputs and electricity, and any output that cannot be stored is silently discarded.
- When a machine's input storage is empty, the machine stops running but its Setting remains unchanged. It resumes automatically as soon as input becomes available.
- When the Battery is empty, electricity-consuming machines stop running but their Settings remain unchanged. They resume automatically when electricity becomes available.
- A machine only consumes resources while it is running. The rates in the component tables assume that input and electricity are available; output-storage capacity does not affect those rates.
- During each simulation step, the amount added to output storage is `min(ProducedOutput, Capacity − Contents)`. The remaining `ProducedOutput` is discarded. This rule also applies to electricity produced while the Battery is full.

Storage capacities can only be increased by purchasing upgrades. All storage components start empty except the Battery, which starts with enough energy to start the production chain.

## Components

### Stockpile

The Stockpile stores raw coal purchased by the player. A purchase adds as much of the requested coal as will fit and charges only for the amount added.

| Type              | Parameter        | Unit       | Description / Formula                       | Value |
| ----------------- | ---------------- | ---------- | ------------------------------------------- | ----: |
| Player controlled | Capacity         | kg         | Maximum raw coal that can be stored         | 1,000 |
| Player controlled | CoalPrice        | credits/kg | Current purchase price                      |  1.00 |
| Constant          | PriceReduction   | %          | CoalPrice reduction from each price upgrade |  0.10 |
| Constant          | MinimumCoalPrice | credits/kg | Lowest price obtainable through upgrades    |  0.25 |
| Variable          | Contents         | kg         | Raw coal currently stored                   |     0 |
| Variable          | PurchasedCoal    | kg         | min(RequestedCoal, Capacity − Contents)     |     — |
| Variable          | PurchaseCost     | credits    | PurchasedCoal × CoalPrice                   |     — |

The player can buy any positive amount of raw coal. `Capacity` can be increased with a capacity upgrade. `CoalPrice` can be reduced with an expensive price upgrade:

`NextCoalPrice = max(MinimumCoalPrice, CoalPrice × (1 − PriceReduction))`

### Pulverizer

The Pulverizer converts raw coal supplied by the Stockpile into pulverized coal stored in the Silo.

| Type              | Parameter           | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum pulverized coal throughput                                                |     8 |
| Player controlled | Efficiency          | %     | Electrical consumption performance                                                |  0.85 |
| Player controlled | Cooling             | %     | Temperature control                                                               |   0.4 |
| Player controlled | Setting             | %     | Operating level                                                                   |   0.8 |
| Constant          | BaseConsumption     | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | PulverizedCoalYield | kg/kg | Pulverized coal produced per kg of raw coal                                       |  0.95 |
| Constant          | BaseTemperature     | °C    | Minimum temperature                                                               |    30 |
| Constant          | TemperatureRange    | °C    | Additional temperature as Setting rises                                           |   100 |
| Constant          | SafeTemperature     | °C    | Temperature below which there is no output penalty                                |    70 |
| Constant          | MaxTemperature      | °C    | Temperature where the output penalty reaches its maximum                          |   100 |
| Constant          | TemperaturePenalty  | %     | Maximum temperature penalty                                                       |  0.25 |
| Variable          | Temperature         | °C    | BaseTemperature + TemperatureRange × Setting × (1 − Cooling)                      |    78 |
| Variable          | ExcessTemperature   | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) |  0.27 |
| Variable          | Output              | kg/s  | Capacity × Setting × (1 − ExcessTemperature × TemperaturePenalty)                 |  5.97 |
| Variable          | RawCoalConsumption  | kg/s  | Output / PulverizedCoalYield                                                      |  6.29 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                               |  0.75 |

### Silo

The Silo stores pulverized coal produced by the Pulverizer and supplies it to the Boiler.

| Type              | Parameter | Unit | Description / Formula                      | Value |
| ----------------- | --------- | ---- | ------------------------------------------ | ----: |
| Player controlled | Capacity  | kg   | Maximum pulverized coal that can be stored |   500 |
| Variable          | Contents  | kg   | Pulverized coal currently stored           |     0 |

### Boiler

The Boiler burns pulverized coal supplied by the Silo to produce high-pressure steam stored in the Tank. At base conversion, one kg of pulverized coal produces eight kg of steam; Boiler efficiency reduces the fuel required to reach the requested output.

| Type              | Parameter           | Unit  | Description / Formula                                                 | Value |
| ----------------- | ------------------- | ----- | --------------------------------------------------------------------- | ----: |
| Player controlled | Capacity            | kg/s  | Maximum steam output                                                  |    50 |
| Player controlled | Efficiency          | %     | Fuel and electrical consumption performance                           |  0.85 |
| Player controlled | Regulation          | %     | Pressure control                                                      |   0.4 |
| Player controlled | Setting             | %     | Operating level                                                       |   0.8 |
| Constant          | BaseConsumption     | MJ/kg | Electrical consumption per kg of requested steam                      |   0.1 |
| Constant          | SteamYield          | kg/kg | Base steam produced per kg of pulverized coal                         |     8 |
| Constant          | BasePressure        | bar   | Minimum pressure                                                      |    20 |
| Constant          | PressureRange       | bar   | Additional pressure the Boiler can generate as Setting rises          |   180 |
| Constant          | SafePressure        | bar   | Pressure below which the Boiler operates without an output penalty    |   100 |
| Constant          | MaxPressure         | bar   | Pressure at which the pressure penalty reaches its maximum            |   200 |
| Constant          | PressurePenalty     | %     | Maximum pressure penalty                                              |  0.25 |
| Variable          | Pressure            | bar   | BasePressure + PressureRange × Setting × (1 − Regulation)             | 106.4 |
| Variable          | ExcessPressure      | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1) | 0.064 |
| Variable          | Output              | kg/s  | Capacity × Setting × (1 − ExcessPressure × PressurePenalty)           | 39.36 |
| Variable          | FuelConsumption     | kg/s  | Output / (SteamYield × Efficiency)                                    |  5.79 |
| Variable          | ElectricConsumption | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                   |  4.71 |

### Tank

The Tank stores high-pressure steam produced by the Boiler and supplies it to the Turbine.

| Type              | Parameter | Unit | Description / Formula                          | Value |
| ----------------- | --------- | ---- | ---------------------------------------------- | ----: |
| Player controlled | Capacity  | kg   | Maximum high-pressure steam that can be stored | 3,000 |
| Variable          | Contents  | kg   | High-pressure steam currently stored           |     0 |

### Turbine

The Turbine converts high-pressure steam supplied by the Tank into electrical power stored in the Battery.

| Type              | Parameter        | Unit    | Description / Formula                                                     | Value |
| ----------------- | ---------------- | ------- | ------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | MW      | Maximum output                                                            |    50 |
| Player controlled | Efficiency       | %       | Steam consumption performance                                             |  0.85 |
| Player controlled | Stability        | %       | Vibration control                                                         |   0.4 |
| Player controlled | Setting          | %       | Operating level                                                           |   0.8 |
| Constant          | BaseConsumption  | kg/s/MW | Steam consumption per MW                                                  |   0.8 |
| Constant          | BaseVibration    | mm/s    | Minimum vibration                                                         |     1 |
| Constant          | VibrationRange   | mm/s    | Additional vibration as Setting rises                                     |    10 |
| Constant          | SafeVibration    | mm/s    | Vibration below which there is no penalty                                 |     5 |
| Constant          | MaxVibration     | mm/s    | Vibration where penalty reaches maximum                                   |    10 |
| Constant          | VibrationPenalty | %       | Maximum vibration penalty                                                 |  0.25 |
| Variable          | Vibration        | mm/s    | BaseVibration + VibrationRange × Setting × (1 − Stability)                |   5.8 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1) |  0.16 |
| Variable          | Output           | MW      | Capacity × Setting × (1 − ExcessVibration × VibrationPenalty)             |  38.4 |
| Variable          | SteamConsumption | kg/s    | (Setting × Capacity × BaseConsumption) / Efficiency                       | 37.65 |

### Battery

The Battery stores electricity produced by the Turbine and supplies electricity to the Pulverizer and Boiler. Power in MW is converted to stored energy in MWh using the simulation interval in seconds.

| Type              | Parameter      | Unit | Description / Formula                                                        | Value |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity       | MWh  | Maximum electricity that can be stored                                       |    10 |
| Constant          | StartingCharge | MWh  | Electricity available at the start of a new game                             |     1 |
| Variable          | Contents       | MWh  | Electricity currently stored; initially equal to StartingCharge              |     1 |
| Variable          | NetFlow        | MW   | Turbine Output − Pulverizer ElectricConsumption − Boiler ElectricConsumption | 32.94 |
| Variable          | EnergyChange   | MWh  | NetFlow × DeltaTimeSeconds / 3,600                                           |     — |

The starting charge can run the Pulverizer and Boiler at their initial settings for roughly eleven minutes without Turbine output, which provides ample time for steam production to begin.

## UI

```text
[Stockpile] -> [Pulverizer] -> [Silo] -> [Boiler] -> [Tank] -> [Turbine] -> [Battery]
```

Each storage card displays its current contents, capacity, fill percentage, and capacity-upgrade cost. The Stockpile also displays coal-purchase controls, the current price per kg, and the expensive price-upgrade cost.

```text
┌──────────────────────────────────────┐
│ Stockpile                            │
├──────────────────────────────────────┤
│ Stored       0 / 1,000 kg        0%  │
│ Coal price   1.00 credits/kg         │
│ Buy coal     [-]      100 kg     [+] │
│              [Buy: 100 credits]      │
│ Capacity     [Upgrade: {cost}]       │
│ Coal price   [Upgrade: {high cost}]  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Silo / Tank / Battery                │
├──────────────────────────────────────┤
│ Stored       {amount} / {capacity}   │
│ Fill         {percentage}%           │
│ Capacity     [Upgrade: {cost}]       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Pulverizer / Boiler / Turbine        │
├──────────────────────────────────────┤
│ Status     {Running/Waiting/Off}     │
│ Capacity   {value} [Upgrade: {cost}] │
│ Efficiency {value} [Upgrade: {cost}] │
│ Control    {value} [Upgrade: {cost}] │
│ Setting    [-]      {value}      [+] │
└──────────────────────────────────────┘
```

The player can decrease or increase `Setting` freely. Reducing it to zero turns the machine off; increasing it above zero enables the machine. `Capacity`, `Efficiency`, and the component-specific control (`Cooling`, `Regulation`, or `Stability`) can only be increased by purchasing an upgrade at the displayed `{cost}`.
