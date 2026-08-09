# Overpowered

## Extractor

| Type              | Parameter       | Unit  | Description / Formula                                         | Value |
| ----------------- | --------------- | ----- | ------------------------------------------------------------- | ----: |
| Player controlled | Capacity        | kg/s  | Maximum output                                                |    50 |
| Player controlled | Efficiency      | %     | Consumption performance                                       |  0.85 |
| Player controlled | Resilience      | %     | Stress control                                                |   0.4 |
| Player controlled | Setting         | %     | Operating level                                               |   0.8 |
| Constant          | BaseConsumption | MJ/kg | The base consumption                                          |   0.1 |
| Constant          | BaseStress      | %     | Minimum stress                                                |  0.05 |
| Constant          | StressRange     | %     | Additional stress as Setting rises                            |  0.95 |
| Constant          | SafeStress      | %     | Stress below which there is no penalty                        |   0.4 |
| Constant          | MaxStress       | %     | Stress where penalty reaches maximum                          |     1 |
| Constant          | StressPenalty   | %     | Maximum stress penalty                                        |  0.25 |
| Variable          | Stress          | %     | BaseStress + StressRange × Setting × (1 − Resilience)         |  0.51 |
| Variable          | ExcessStress    | %     | clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1) |  0.18 |
| Variable          | Output          | kg/s  | Capacity × Setting × (1 − ExcessStress × StressPenalty)       | 38.23 |
| Variable          | Consumption     | MW    | (Setting × Capacity × BaseConsumption) / Efficiency           |  4.71 |

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
| Constant          | BaseVibration    | °C      | Minimum vibration                                                         |     1 |
| Constant          | VibrationRange   | °C      | Additional vibration as Setting rises                                     |    10 |
| Constant          | SafeVibration    | °C      | Vibration below which there is no penalty                                 |     5 |
| Constant          | MaxVibration     | °C      | Vibration where penalty reaches maximum                                   |    10 |
| Constant          | VibrationPenalty | %       | Maximum vibration penalty                                                 |  0.25 |
| Variable          | Vibration        | °C      | BaseVibration + VibrationRange × Setting × (1 − Stability)                |   5.8 |
| Variable          | ExcessVibration  | %       | clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1) |  0.16 |
| Variable          | Output           | kg/s    | Capacity × Setting × (1 − ExcessVibration × VibrationPenalty)             |  38.4 |
| Variable          | Consumption      | MW      | (Setting × Capacity × BaseConsumption) / Efficiency                       | 37.65 |
