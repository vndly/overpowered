# Overpowered

## Pulverizer

The pulverizer converts raw coal supplied from the plant's stockpile into pulverized coal for the boilers.

| Type              | Parameter          | Unit  | Description / Formula                                                             | Value |
| ----------------- | ------------------ | ----- | --------------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity           | kg/s  | Maximum raw coal throughput                                                       |    50 |
| Player controlled | Efficiency         | %     | Electrical consumption performance                                                |  0.85 |
| Player controlled | Cooling            | %     | Temperature control                                                               |   0.4 |
| Player controlled | Setting            | %     | Operating level                                                                   |   0.8 |
| Constant          | BaseConsumption    | MJ/kg | Consumption required to move and crush coal                                       |   0.1 |
| Constant          | BaseTemperature    | °C    | Minimum temperature                                                               |    30 |
| Constant          | TemperatureRange   | °C    | Additional temperature as Setting rises                                           |   100 |
| Constant          | SafeTemperature    | °C    | Temperature below which there is no output penalty                                |    70 |
| Constant          | MaxTemperature     | °C    | Temperature where the output penalty reaches its maximum                          |   100 |
| Constant          | TemperaturePenalty | %     | Maximum temperature penalty                                                       |  0.25 |
| Variable          | Temperature        | °C    | BaseTemperature + TemperatureRange × Setting × (1 − Cooling)                      |    78 |
| Variable          | ExcessTemperature  | %     | clamp((Temperature − SafeTemperature) / (MaxTemperature − SafeTemperature), 0, 1) |  0.27 |
| Variable          | Output             | kg/s  | Capacity × Setting × (1 − ExcessTemperature × TemperaturePenalty)                 | 37.33 |
| Variable          | Consumption        | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                               |  4.71 |

## Boiler

| Type              | Parameter       | Unit  | Description / Formula                                                 | Value |
| ----------------- | --------------- | ----- | --------------------------------------------------------------------- | ----: |
| Player controlled | Capacity        | kg/s  | Maximum output                                                        |    50 |
| Player controlled | Efficiency      | %     | Consumption performance                                               |  0.85 |
| Player controlled | Regulation      | %     | Pressure control                                                      |   0.4 |
| Player controlled | Setting         | %     | Operating level                                                       |   0.8 |
| Constant          | BaseConsumption | MJ/kg | The base consumption                                                  |   0.1 |
| Constant          | BasePressure    | bar   | Minimum pressure                                                      |    20 |
| Constant          | PressureRange   | bar   | Additional pressure the boiler can generate as Setting rises          |   180 |
| Constant          | SafePressure    | bar   | Pressure below which the boiler operates without an output penalty    |   100 |
| Constant          | MaxPressure     | bar   | Pressure at which the pressure penalty reaches its maximum            |   200 |
| Constant          | PressurePenalty | %     | The pressure penalty                                                  |  0.25 |
| Variable          | Pressure        | bar   | BasePressure + PressureRange × Setting × (1 − Regulation)             | 106.4 |
| Variable          | ExcessPressure  | %     | clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1) | 0.064 |
| Variable          | Output          | kg/s  | Capacity × Setting × (1 − ExcessPressure × PressurePenalty)           | 39.36 |
| Variable          | Consumption     | MW    | (Setting × Capacity × BaseConsumption) / Efficiency                   |  4.71 |

## Turbine

| Type              | Parameter        | Unit    | Description / Formula                                                     | Value |
| ----------------- | ---------------- | ------- | ------------------------------------------------------------------------- | ----: |
| Player controlled | Capacity         | MW      | Maximum output                                                            |    50 |
| Player controlled | Efficiency       | %       | Consumption performance                                                   |  0.85 |
| Player controlled | Stability        | %       | Vibration control                                                         |   0.4 |
| Player controlled | Setting          | %       | Operating level                                                           |   0.8 |
| Constant          | BaseConsumption  | kg/s/MW | The base consumption                                                      |   0.8 |
| Constant          | BaseVibration    | mm/s    | Minimum vibration                                                         |     1 |
| Constant          | VibrationRange   | mm/s    | Additional vibration as Setting rises                                     |    10 |
| Constant          | SafeVibration    | mm/s    | Vibration below which there is no penalty                                 |     5 |
| Constant          | MaxVibration     | mm/s    | Vibration where penalty reaches maximum                                   |    10 |
| Constant          | VibrationPenalty | %       | Maximum vibration penalty                                                 |  0.25 |
| Variable          | Vibration        | mm/s    | BaseVibration + VibrationRange × Setting × (1 − Stability)                |   5.8 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1) |  0.16 |
| Variable          | Output           | MW      | Capacity × Setting × (1 − ExcessVibration × VibrationPenalty)             |  38.4 |
| Variable          | Consumption      | kg/s    | (Setting × Capacity × BaseConsumption) / Efficiency                       | 37.65 |
