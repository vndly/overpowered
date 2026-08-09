/**
 * Every gameplay constant, one group per table in docs/specs.md.
 * Nothing here is derived or guessed: when a value changes it changes in docs/specs.md
 * first, then here and in simulator/sim.py — see the Economy changes rule in CLAUDE.md.
 */

// Objective — specs.md §Objective
export const TARGET_ENERGY = 1290 // MWh of stored energy that wins the run
export const TIME_LIMIT = 600 // Seconds available to reach it

// Simulation — specs.md §Simulation step. The spec never fixes DeltaTimeSeconds; 0.05 is
// the value pinned by docs/plan.md, where the spec's per-step market and the simulator's
// fixed market grid coincide.
export const DELTA_TIME_SECONDS = 0.05
export const SECONDS_PER_HOUR = 3600 // Converts MW over a step into MWh
export const SECONDS_PER_MINUTE = 60 // The coal trend compounds per minute
export const KILOGRAMS_PER_TONNE = 1000 // Storage is kg internally, tonnes on screen

// Setting, stress, and wear — specs.md §Setting, stress, and wear
export const MAX_SETTING = 2 // Highest Setting any machine accepts
export const STRAIN_GAIN = 1.25 // Largest fractional increase strain adds to stress
export const BACKLOG_THRESHOLD = 0.7 // Output-store fill above which a producer strains
export const STARVE_THRESHOLD = 0.3 // Input-store fill below which a consumer strains

// A Setting is held as an integer count of 0.1 steps, so the player's increments never
// accumulate float error (docs/plan.md §Global pinned values).
export const SETTING_STEPS_PER_UNIT = 10
export const MAX_SETTING_STEPS = MAX_SETTING * SETTING_STEPS_PER_UNIT
export const STARTING_SETTING_STEPS = 6 // Setting 0.6, where every machine opens

// Upgrades — specs.md §Upgrade costs
export const CAPACITY_GROWTH = 1.5 // Capacity multiplier per capacity upgrade
export const UPGRADE_GAIN = 0.25 // Share of the remaining Efficiency gap an upgrade closes
export const MAX_EFFICIENCY = 0.95 // Highest Efficiency obtainable through upgrades

export const MACHINE_CAPACITY_UPGRADE = {
  baseCost: 0.02, // MWh
  costGrowth: 1.7,
} as const

export const MACHINE_EFFICIENCY_UPGRADE = {
  baseCost: 0.05, // MWh
  costGrowth: 1.3,
} as const

export const STORAGE_CAPACITY_UPGRADE = {
  baseCost: 0.02, // MWh
  costGrowth: 1.55,
} as const

// Spendable energy — specs.md §Spendable energy
export const RESERVE_FRACTION = 0.1 // Share of Battery Capacity held back from upgrades
export const STARTUP_SECONDS = 30 // Machine runtime the restart floor must cover
export const RESTART_MULTIPLE = 2 // Restarts the upgrade floor must leave affordable

// Battery — specs.md §Battery
export const STARTING_CHARGE = 4 // MWh the Battery holds at the start of a run

// The coal market — specs.md §The coal market
export const MARKET = {
  startPrice: 1, // MWh/t at the start of a run
  priceGrowth: 1.06, // Trend multiplier applied to the price each minute
  range: 0.25, // Largest deviation from the trend the market can reach
  volatility: 0.03, // Half-width of each random market step, 1/√s
  reversion: 0.01, // Rate the market is pulled back towards the trend, 1/s
} as const

// Starting storage capacities — specs.md §Stockpile, §Silo, §Tank, §Battery.
// Material stores are held in kilograms; the Battery in MWh.
export const STORAGE_CAPACITY = {
  stockpile: 1000,
  silo: 500,
  tank: 3000,
  battery: 10,
} as const

// Pulverizer — specs.md §Pulverizer
export const PULVERIZER = {
  capacity: 8, // Pulverized coal throughput, kg/s
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.1, // Electricity to move and crush coal, MJ/kg
  pulverizedCoalYield: 0.95, // Pulverized coal per kg of raw coal, kg/kg
  baseStress: 30, // BaseTemperature, °C
  stressRange: 60, // TemperatureRange, °C
  safeStress: 70, // SafeTemperature, °C
  maxStress: 150, // MaxTemperature, °C
  wearGrowth: 0.1, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.008, // Wear shed per second below SafeTemperature, 1/s
  repairSeconds: 8, // Time offline after a trip
} as const

// Boiler — specs.md §Boiler
export const BOILER = {
  capacity: 50, // Steam output, kg/s
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.1, // Electricity per kg of requested steam, MJ/kg
  steamYield: 10, // Base steam per kg of pulverized coal, kg/kg
  baseStress: 20, // BasePressure, bar
  stressRange: 108, // PressureRange, bar
  safeStress: 95, // SafePressure, bar
  maxStress: 236, // MaxPressure, bar
  wearGrowth: 0.04, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.004, // Wear shed per second below SafePressure, 1/s
  repairSeconds: 40, // Time offline after a trip
} as const

// Turbine — specs.md §Turbine
export const TURBINE = {
  capacity: 50, // Output, MW
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.62, // Steam per MW, kg/s/MW
  baseStress: 1, // BaseVibration, mm/s
  stressRange: 6, // VibrationRange, mm/s
  safeStress: 6, // SafeVibration, mm/s
  maxStress: 13, // MaxVibration, mm/s
  wearGrowth: 0.067, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.02, // Wear shed per second below SafeVibration, 1/s
  repairSeconds: 20, // Time offline after a trip
} as const
