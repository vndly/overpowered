/**
 * Every gameplay constant, one group per table in docs/specs.md.
 * Nothing here is derived or guessed: when a value changes it changes in docs/specs.md
 * first, then here and in simulator/sim.py — see the Economy changes rule in CLAUDE.md.
 */

// Objective — specs.md §Objective
export const TARGET_ENERGY = 210 // MWh of stored energy that wins the run
export const TIME_LIMIT = 600 // Seconds available to reach it

// Simulation — specs.md §Simulation step. The spec never fixes DeltaTimeSeconds; 0.05 is
// the value pinned by docs/plan.md, where the spec's per-step market and the simulator's
// fixed market grid coincide.
export const DELTA_TIME_SECONDS = 0.05
export const SECONDS_PER_HOUR = 3600 // Converts MW over a step into MWh
export const SECONDS_PER_MINUTE = 60 // The coal trend compounds per minute
export const KILOGRAMS_PER_TONNE = 1000 // Storage is kg internally, tonnes on screen

// Stress and wear — specs.md §Stress and wear. Machines have no operating control, so
// Strain is the only term that raises a machine's stress above its nominal reading.
export const STRAIN_GAIN = 1.25 // Largest fractional increase strain adds to stress
export const BACKLOG_THRESHOLD = 0.7 // Output-store fill above which a producer strains
export const STARVE_THRESHOLD = 0.3 // Input-store fill below which a consumer strains

// Upgrades — specs.md §Upgrade costs. Flow and Capacity grow geometrically and are eroded
// through a factor; Efficiency and SafeStress both rise and fall by closing a share of the
// gap to a bound. Every penalty is asymptotic, so no track can ever brick a machine.
// There are three geometric tracks, not two, and each is its own knob: a machine's Flow,
// a store's Capacity, and a store's Flow. The first two carry the same number today and
// are still separate constants — one is how far a stage jumps out of step with its
// neighbours, the other is how much room the store beside it has to absorb that.
// A store's Flow level is the bigger step on purpose. Raising what the plant delivers
// means raising all seven stages, and the four store flow tracks are the bulk of that
// bill; a step that covers more than one round is what keeps a round affordable without
// pricing rate so cheaply that the economy runs away — specs.md §The round.
export const MACHINE_FLOW_GROWTH = 1.5 // Flow multiplier per machine flow upgrade
export const STORAGE_CAPACITY_GROWTH = 1.5 // Capacity multiplier per store capacity upgrade
export const STORAGE_FLOW_GROWTH = 2.25 // Flow multiplier per store flow upgrade
export const UPGRADE_GAIN = 0.25 // Share of the remaining Efficiency gap an upgrade closes
export const TOLERANCE_GAIN = 0.25 // Share of the remaining SafeStress gap an upgrade closes
export const MAX_EFFICIENCY = 0.95 // Highest Efficiency obtainable through upgrades
export const MIN_EFFICIENCY = 0.4 // Floor Efficiency is eroded toward
export const FACTOR_FLOOR = 0.55 // Floor every Flow and Capacity factor is eroded toward

export const FLOW_PENALTY = 0.1 // Share of the SafeStress gap a machine Flow upgrade takes
export const TOLERANCE_PENALTY = 0.08 // Share of the Efficiency gap a Tolerance upgrade takes
export const EFFICIENCY_PENALTY = 0.06 // Share of the FlowFactor gap Efficiency takes
export const STORE_PENALTY = 0.1 // Share of the opposite factor's gap a store upgrade takes

// Raising what the plant delivers takes a level on each of seven stages rather than one
// purchase, so every track is priced far more gently than it was when a throttle existed —
// specs.md §The round. These four numbers sit on the edge of a cliff and are measured,
// never guessed: 1.40 is the cheapest price at which the strongest policies stop running
// away, and anything below it produces peaks that swing 100%+ with the simulation step —
// a number, but not a measurement. Re-measure after any change to the economy.
export const MACHINE_FLOW_UPGRADE = {
  baseCost: 0.02, // MWh
  costGrowth: 1.4,
} as const

export const MACHINE_EFFICIENCY_UPGRADE = {
  baseCost: 0.05, // MWh
  costGrowth: 1.3,
} as const

export const MACHINE_TOLERANCE_UPGRADE = {
  baseCost: 0.04, // MWh
  costGrowth: 1.35,
} as const

export const STORAGE_CAPACITY_UPGRADE = {
  baseCost: 0.02, // MWh
  costGrowth: 1.4,
} as const

export const STORAGE_FLOW_UPGRADE = {
  baseCost: 0.02, // MWh
  costGrowth: 1.85,
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
  priceGrowth: 1.06, // Multiplier applied to the price each minute
} as const

// Starting storage capacities and flows — specs.md §Stockpile, §Silo, §Tank, §Battery.
// The Silo is small and tight on purpose: the chain does not open matched, so it gains a
// kilogram a second and backs up about seventy seconds in, and its Flow carries the
// opening rate with 7% to spare — the first Pulverizer upgrade breaks it.
// Material stores are held in kilograms; the Battery in MWh and MW. The Silo and Tank
// contend — what enters plus what leaves must fit inside one Flow — while the Stockpile
// caps delivery only and the Battery caps charge only.
export const STORAGE = {
  stockpile: {
    capacity: 500,
    flow: 12,
  },
  silo: {
    capacity: 100,
    flow: 7.5,
  },
  tank: {
    capacity: 1500,
    flow: 48,
  },
  battery: {
    capacity: 10,
    flow: 28,
  },
} as const

// The Tank opens half full rather than empty. Everything downstream of an empty Tank is a
// Turbine at full strain with no throttle to answer it, and opening exactly on
// StarveThreshold is barely better: strain is zero there, but the store sits on the line
// its own bar bands on, so the first frame of a run that specs.md calls matched and clean
// reads as a warning. Half is clear of both thresholds — specs.md §Tank.
export const TANK_STARTING_FILL = 0.5

// Pulverizer — specs.md §Pulverizer
export const PULVERIZER = {
  flow: 4, // Pulverized coal throughput, kg/s
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.1, // Electricity to move and crush coal, MJ/kg
  pulverizedCoalYield: 0.95, // Pulverized coal per kg of raw coal, kg/kg
  nominalStress: 70, // NominalTemperature, °C
  safeStress: 85, // Starting SafeTemperature, °C
  maxTolerance: 140, // Highest SafeTemperature upgrades reach, °C
  minTolerance: 45, // Floor SafeTemperature is eroded toward, °C
  maxStress: 150, // MaxTemperature, °C
  wearGrowth: 0.1, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.008, // Wear shed per second below SafeTemperature, 1/s
  repairSeconds: 8, // Time offline after a trip
} as const

// Boiler — specs.md §Boiler
export const BOILER = {
  flow: 21, // Steam output, kg/s
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.1, // Electricity per kg of steam, MJ/kg
  steamYield: 10, // Base steam per kg of pulverized coal, kg/kg
  nominalStress: 100, // NominalPressure, bar
  safeStress: 120, // Starting SafePressure, bar
  maxTolerance: 220, // Highest SafePressure upgrades reach, bar
  minTolerance: 70, // Floor SafePressure is eroded toward, bar
  maxStress: 236, // MaxPressure, bar
  wearGrowth: 0.04, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.004, // Wear shed per second below SafePressure, 1/s
  repairSeconds: 40, // Time offline after a trip
} as const

// Turbine — specs.md §Turbine
export const TURBINE = {
  flow: 23.7, // Output, MW
  efficiency: 0.7, // Starting Efficiency
  baseConsumption: 0.62, // Steam per MW, kg/s/MW
  nominalStress: 5, // NominalVibration, mm/s
  safeStress: 6.5, // Starting SafeVibration, mm/s
  maxTolerance: 12, // Highest SafeVibration upgrades reach, mm/s
  minTolerance: 3.5, // Floor SafeVibration is eroded toward, mm/s
  maxStress: 13, // MaxVibration, mm/s
  wearGrowth: 0.067, // Wear per second at Excess 1, 1/s
  wearRecovery: 0.02, // Wear shed per second below SafeVibration, 1/s
  repairSeconds: 20, // Time offline after a trip
} as const
