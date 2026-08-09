# Overpowered

## Extractor

Player controled	Unit	Description	Value
Capacity	kg/s	Maximum output	50
Efficiency	%	Consumption performance	0.85
Resilience	%	Stress control	0.4
Setting	%	Operating level	0.8
			
Constant	Unit	Description	Value
BaseConsumption	MJ/kg	The base consumption	0.1
BaseStress	%	Minimum stress	0.05
StressRange	%	Additional stress as Setting rises	0.95
SafeStress	%	Stress below which there is no penalty	0.4
MaxStress	%	Stress where penalty reaches maximum	1
StressPenalty	%	Maximum stress penalty	0.25
			
Variable	Unit	Formula	Value
Stress	%	BaseStress + StressRange × Setting × (1 − Resilience)	0.51
ExcessStress	%	clamp((Stress − SafeStress) / (MaxStress − SafeStress), 0, 1)	0.18
Output	kg/s	Capacity × Setting × (1 − ExcessStress × StressPenalty)	38.23
Consumption	MW	(Setting × Capacity × BaseConsumption) / Efficiency	4.71

## Boiler

Player controled	Unit	Description	Value
Capacity	kg/s	Maximum output	50
Efficiency	%	Consumption performance	0.85
Regulation	%	Pressure control	0.4
Setting	%	Operating level	0.8
			
Constant	Unit	Description	Value
BaseConsumption	MJ/kg	The base consumption	0.1
BasePressure	bar	Minimum pressure	20
PressureRange	bar	Additional pressure the boiler can generate as Setting rises	180
SafePressure	bar	Pressure below which the boiler operates without an output penalty	100
MaxPressure	bar	Pressure at which the pressure penalty reaches its maximum	200
PressurePenalty	%	The pressure penalty	0.25
			
Variable	Unit	Formula	Value
Pressure	bar	BasePressure + PressureRange × Setting × (1 − Regulation)	106.4
ExcessPressure	%	clamp((Pressure − SafePressure) / (MaxPressure − SafePressure), 0, 1)	0.064
Output	kg/s	Capacity × Setting × (1 − ExcessPressure × PressurePenalty)	39.36
Consumption	MW	(Setting × Capacity × BaseConsumption) / Efficiency	4.71

## Turbine

Player controled	Unit	Description	Value
Capacity	MW	Maximum output	50
Efficiency	%	Consumption performance	0.85
Stability	%	Vibration control	0.4
Setting	%	Operating level	0.8
			
Constant	Unit	Description	Value
BaseConsumption	kg/s/MW	The base consumption	0.8
BaseVibration	°C	Minimum vibration	1
VibrationRange	°C	Additional vibration as Setting rises	10
SafeVibration	°C	Vibration below which there is no penalty	5
MaxVibration	°C	Vibration where penalty reaches maximum	10
VibrationPenalty	%	Maximum vibration penalty	0.25
			
Variable	Unit	Formula	Value
Vibration	°C	BaseVibration + VibrationRange × Setting × (1 − Stability)	5.8
ExcessVibration	%	clamp((Vibration − SafeVibration) / (MaxVibration − SafeVibration), 0, 1)	0.16
Output	kg/s	Capacity × Setting × (1 − ExcessVibration × VibrationPenalty)	38.4
Consumption	MW	(Setting × Capacity × BaseConsumption) / Efficiency	37.65