import {BACKLOG_THRESHOLD, STARVE_THRESHOLD, TARGET_ENERGY} from '@/game/constants'
import type {GameEngine, Strain} from '@/game/game_engine'
import type {Machine} from '@/game/machine'
import type {Storage} from '@/game/storage'
import type {ComponentStatus, RunOutcome, StressKind} from '@/game/types'
import {formatEfficiency, formatEnergy, formatMass, formatPercent, formatPower, formatPrice, formatRate, formatSeconds, formatStress, formatTime, formatWholeEnergy} from '@/view/formatting'

/**
 * The one thing components are allowed to see.
 * buildGameView reads the engine and returns a new plain object every call — no getters,
 * no class instances, no reference back into the engine — so a component can render the
 * game without being able to reach it. Every gameplay rule stays behind this wall.
 */

const STRESS_LABELS: Record<StressKind, string> = {
  temperature: 'TEMPERATURE',
  pressure: 'PRESSURE',
  vibration: 'VIBRATION',
}

const STRESS_UNITS: Record<StressKind, string> = {
  temperature: '°C',
  pressure: 'bar',
  vibration: 'mm/s',
}

/**
 * How near the threshold that punishes it a reading comes before its bar cautions, as a
 * fraction of that bar's own scale. One margin for the whole interface, so yellow means
 * the same distance from trouble wherever it is drawn (ui_ux.md §4).
 */
const CAUTION_MARGIN = 0.15

const DEPLETED_THRESHOLD = 0.1 // Stockpile fill below which the chain is about to stop

/**
 * The share of a machine's clean band that reads as caution — the last quarter of the run
 * from NominalStress to SafeStress. A fraction of the band rather than of the gauge,
 * because the three bands are not the same width: the Boiler's is 0.147 of its gauge,
 * narrower than CAUTION_MARGIN, so a margin measured against the whole scale would put it
 * in caution at rest and leave it there for every run it never strains in.
 */
const STRESS_CAUTION_SHARE = 0.25

/**
 * How near its cap a store's Flow comes before its bar cautions, and how far a machine's
 * delivery may fall short of its own Flow before the same thing happens. Much tighter than
 * CAUTION_MARGIN, because a store's Flow is deliberately close to what passes through it
 * from the first second of a run: the opening leaves the Silo 1.07× the throughput it
 * carries and the Tank 1.14× (verify_screen.vue), so a margin of 0.15 would open every
 * run with two cards already yellow and leave them there, which is the trap the machine
 * gauges avoid with STRESS_CAUTION_SHARE.
 *
 * The two uses are the same number on opposite sides of the cap, not the same reading
 * twice: a store cautions on the approach to its Flow and reddens where the cap starts
 * biting, while the machine it caps stays green until that costs it 5% of its rating.
 * So the store says the cap is biting and the machine says what it is costing, which is
 * the division of labour the alerts panel already draws between them (ui_ux.md §20).
 */
const FLOW_CAUTION_MARGIN = 0.05

// Wear has no threshold to sit a margin off — it runs from clean to tripped — so its bar
// is split in equal thirds rather than banded on one, and the bar reads as what fraction
// of a trip has been used up
const WEAR_CAUTION = 1 / 3
const WEAR_DANGER = 2 / 3

/**
 * Where a reading stands against whatever punishes it: nothing to do, close enough to
 * watch, or already costing the player something. The view model decides it rather than
 * the bar that draws it, because which end of a store hurts is a rule of the game.
 */
export type ReadingLevel = 'safe' | 'caution' | 'danger'

const LEVEL_RANK: Record<ReadingLevel, number> = {
  safe: 0,
  caution: 1,
  danger: 2,
}

/**
 * One upgrade row. Every track raises one value and erodes another, so a row carries
 * both: the marker is permanent, so the trade is never invisible, while the two
 * before-and-after readings are what a focused button reveals — specs.md §UI.
 */
export interface UpgradeRowView {
  label: string // CAPACITY | EFFICIENCY | TOLERANCE | FLOW
  costText: string
  affordable: boolean
  penaltyLabel: string // ▼TOL, ▼CAP, ▼EFF, ▼FLOW
  raisesText: string // What it buys, as `before → after`
  erodesText: string // What it costs, as `before → after`
}

/** How one machine's throughput is written; everything else it reads from the engine. */
interface MachineSpec {
  title: string
  unit: string // Unit its Flow and Output are quoted in
  format: (value: number) => string // How a value in that unit is written
}

const PULVERIZER_SPEC: MachineSpec = {
  title: 'PULVERIZER',
  unit: 'kg/s',
  format: formatRate,
}

const BOILER_SPEC: MachineSpec = {
  title: 'BOILER',
  unit: 'kg/s',
  format: formatRate,
}

const TURBINE_SPEC: MachineSpec = {
  title: 'TURBINE',
  unit: 'MW',
  format: formatPower,
}

/** What every storage card shows, whatever it stores. */
export interface StorageViewBase {
  title: string
  status: ComponentStatus // What its drawing says at a glance
  storedText: string // Contents against Capacity, with its unit
  fraction: number // What the fill bar draws; the STORED row carries the exact figure
  level: ReadingLevel // The colour that bar takes; each store is banded on its own ends
  flowText: string // What the store was asked to move against its Flow, with its unit
  flowFraction: number // What the flow bar draws; the FLOW row carries the exact figures
  flowLevel: ReadingLevel // The colour that row and bar take, banded on nearing the cap
  capacityUpgrade: UpgradeRowView
  flowUpgrade: UpgradeRowView
}

/** The Stockpile, which is also where coal is bought. */
export interface StockpileView extends StorageViewBase {
  priceText: string
  purchaseKilograms: number // The stepper's current amount
  purchaseAmountText: string
  purchaseCostText: string
  purchaseAffordable: boolean
}

/** The Silo and the Tank, which read out no more than any other store. */
export type BufferView = StorageViewBase

/** The Battery, which reads out no more than any other store; only its band differs. */
export type BatteryView = StorageViewBase

/** One machine card. The three differ only in the text this carries. */
export interface MachineView {
  title: string
  status: ComponentStatus // What its drawing says at a glance
  flowText: string // What the machine delivered against its Flow, with its unit
  flowFraction: number // What the flow bar draws; the FLOW row carries the exact figures
  flowLevel: ReadingLevel // The colour that row and bar take, banded on being held back
  repairText: string | null // Replaces the flow bar while tripped, on the same line
  stressLabel: string // TEMPERATURE | PRESSURE | VIBRATION
  stressText: string // Value with its unit; the gauge is drawn, so this names it
  stressFraction: number // Stress against MaxStress, 0 to 1
  stressLevel: ReadingLevel // The colour the gauge takes; it turns at SafeStress
  wearFraction: number
  wearPercentText: string // The wear bar is a drawing; this is the reading behind it
  wearLevel: ReadingLevel // The colour that bar takes, banded on how near a trip is
  flowUpgrade: UpgradeRowView
  efficiencyUpgrade: UpgradeRowView
  toleranceUpgrade: UpgradeRowView
}

/** The Power Summary of the lower dashboard. */
export interface PowerView {
  generationText: string
  consumptionText: string
  netFlowText: string
  averageText: string
  peakText: string
  netFlowHistory: number[] // Last 60 one-second samples
}

/** One line of the alerts panel. */
export interface AlertView {
  text: string
  urgent: boolean
}

/** An alert and what raises it, so the two can be read side by side. */
interface AlertRule extends AlertView {
  raised: boolean
}

/** The whole interface, as one immutable snapshot. */
export interface GameView {
  outcome: RunOutcome
  elapsedSeconds: number
  timeText: string // Time left, MM:SS
  target: {
    storedText: string
    targetText: string // TargetEnergy, to the nearest whole MWh
    fraction: number
  }
  peakStoredText: string // Highest Battery Contents this run
  bestResultText: string | null // Highest across runs, null until one ends
  stockpile: StockpileView
  silo: BufferView
  tank: BufferView
  battery: BatteryView
  pulverizer: MachineView
  boiler: MachineView
  turbine: MachineView
  power: PowerView
  alerts: AlertView[]
}

/**
 * @param value - The value to bound
 * @param minimum - Lowest value allowed
 * @param maximum - Highest value allowed
 * @returns The value, brought inside the bounds
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

/**
 * @param value - The reading to band
 * @param caution - Where it becomes worth watching
 * @param danger - Where it starts costing the player something
 * @returns Where a reading that is punished as it rises stands
 */
function bandRising(value: number, caution: number, danger: number): ReadingLevel {
  if (value >= danger) {
    return 'danger'
  } else if (value >= caution) {
    return 'caution'
  } else {
    return 'safe'
  }
}

/**
 * @param value - The reading to band
 * @param caution - Where it becomes worth watching
 * @param danger - Where it starts costing the player something
 * @returns Where a reading that is punished as it falls stands
 */
function bandFalling(value: number, caution: number, danger: number): ReadingLevel {
  if (value <= danger) {
    return 'danger'
  } else if (value <= caution) {
    return 'caution'
  } else {
    return 'safe'
  }
}

/**
 * What a machine's drawing says. Wear is checked first: a machine that has worn far
 * enough to be in trouble is worth saying so about whether or not it is still turning,
 * and a tripped machine — which is both stopped and fully worn — is tripped *because*
 * of the wear, so that is the fact worth carrying.
 * @param machine - The machine to read
 * @param runRatio - Fraction of its requested rate it ran at last step
 * @returns Its status
 */
function machineStatus(machine: Machine, runRatio: number): ComponentStatus {
  if (machine.wear >= WEAR_DANGER) {
    return 'critical'
  }

  return runRatio > 0 ? 'normal' : 'stopped'
}

/**
 * What a store's drawing says. A store has no wear of its own, so what makes it critical
 * is its fill sitting where it costs the machine beside it something — the same band its
 * own bar already turns red on.
 * @param level - Where its fill stands against the ends that punish it
 * @param moving - Whether anything passed through it last step
 * @returns Its status
 */
function storageStatus(level: ReadingLevel, moving: boolean): ComponentStatus {
  if (level === 'danger') {
    return 'critical'
  }

  return moving ? 'normal' : 'stopped'
}

/**
 * @param first - One of the two bands
 * @param second - The other
 * @returns The worse of them, for a store that is punished at both ends
 */
function worseLevel(first: ReadingLevel, second: ReadingLevel): ReadingLevel {
  return LEVEL_RANK[first] >= LEVEL_RANK[second] ? first : second
}

/**
 * @param before - The reading now
 * @param after - The reading one purchase later
 * @param format - How a value in this unit is written
 * @param unit - The unit, or an empty string for a bare coefficient
 * @returns The move a purchase makes, as one line
 */
function transition(
  before: number,
  after: number,
  format: (value: number) => string,
  unit: string,
): string {
  const suffix = unit === '' ? '' : ` ${unit}`

  return `${format(before)} → ${format(after)}${suffix}`
}

/**
 * The Silo is punished at one end only: above BacklogThreshold the Pulverizer grinding
 * into it heats, while a Silo running low costs the Boiler throughput but no wear.
 * @param silo - The store to band
 * @returns Where its bar stands
 */
function siloLevel(silo: Storage): ReadingLevel {
  return bandRising(silo.fill, BACKLOG_THRESHOLD - CAUTION_MARGIN, BACKLOG_THRESHOLD)
}

/**
 * The Tank is punished at both ends: above BacklogThreshold the Boiler pushing into it
 * strains, and below StarveThreshold the Turbine draining it vibrates. So its bar is green
 * in the middle, which is the only bar on the screen that reads that way.
 * @param tank - The store to band
 * @returns Where its bar stands
 */
function tankLevel(tank: Storage): ReadingLevel {
  return worseLevel(
    bandRising(tank.fill, BACKLOG_THRESHOLD - CAUTION_MARGIN, BACKLOG_THRESHOLD),
    bandFalling(tank.fill, STARVE_THRESHOLD + CAUTION_MARGIN, STARVE_THRESHOLD),
  )
}

/**
 * @param title - The card's title
 * @param storage - The store to read
 * @param level - Where its fill stands against the ends that punish it
 * @param flowDemand - Throughput the store was asked for last step, in its flow unit
 * @param moving - Whether anything passed through it last step
 * @param unit - Unit its Contents and Capacity are quoted in
 * @param flowUnit - Unit its Flow is quoted in
 * @param format - How a value in the stored unit is written
 * @param formatFlow - How a value in the flow unit is written; a material store holds
 *   kilograms and displays tonnes, but its Flow is quoted in kg/s and is not converted
 * @param spendableEnergy - MWh available for upgrades
 * @returns What every storage card shows
 */
function buildStorageView(
  title: string,
  storage: Storage,
  level: ReadingLevel,
  flowDemand: number,
  moving: boolean,
  unit: string,
  flowUnit: string,
  format: (value: number) => string,
  formatFlow: (value: number) => string,
  spendableEnergy: number,
): StorageViewBase {
  const capacityCost = storage.capacityUpgrade.cost
  const flowCost = storage.flowUpgrade.cost
  // The share of its Flow the store is being asked for. A store asked for more than it
  // can pass is at its cap and no further, so the bar pegs there rather than running off
  // the card — what is past the end is the strain the machine's own gauge is reading.
  const flowLoad = flowDemand <= 0 ? 0 : clamp(flowDemand / storage.flow, 0, 1)

  return {
    title: title,
    status: storageStatus(level, moving),
    storedText: `${format(storage.contents)} / ${format(storage.capacity)} ${unit}`,
    fraction: clamp(storage.fill, 0, 1),
    level: level,
    flowText: `${formatFlow(flowDemand)} / ${formatFlow(storage.flow)} ${flowUnit}`,
    flowFraction: flowLoad,
    // Danger is the cap actually biting, which is the point the alerts panel speaks at;
    // caution is the approach to it, which nothing said before this bar drew it
    flowLevel: bandRising(flowLoad, 1 - FLOW_CAUTION_MARGIN, 1),
    capacityUpgrade: {
      label: 'CAPACITY',
      costText: `${formatEnergy(capacityCost)} MWh`,
      affordable: capacityCost <= spendableEnergy,
      penaltyLabel: '▼FLOW',
      raisesText: transition(storage.capacity, storage.capacity + storage.capacityGain, format, unit),
      erodesText: transition(storage.flow, storage.nextFlowAfterCapacity, formatFlow, flowUnit),
    },
    flowUpgrade: {
      label: 'FLOW',
      costText: `${formatEnergy(flowCost)} MWh`,
      affordable: flowCost <= spendableEnergy,
      penaltyLabel: '▼CAP',
      raisesText: transition(storage.flow, storage.flow + storage.flowGain, formatFlow, flowUnit),
      erodesText: transition(storage.capacity, storage.nextCapacityAfterFlow, format, unit),
    },
  }
}

/**
 * @param title - The card's title
 * @param storage - The buffer to read
 * @param level - Where its fill stands against the ends that punish it
 * @param flowDemand - Throughput the store was asked for last step, kg/s
 * @param moving - Whether anything passed through it last step
 * @param spendableEnergy - MWh available for upgrades
 * @returns The Silo or Tank card
 */
function buildBufferView(
  title: string,
  storage: Storage,
  level: ReadingLevel,
  flowDemand: number,
  moving: boolean,
  spendableEnergy: number,
): BufferView {
  return buildStorageView(title, storage, level, flowDemand, moving, 't', 'kg/s', formatMass, formatRate, spendableEnergy)
}

/**
 * @param engine - The engine to read
 * @param purchaseKilograms - The coal stepper's current amount, owned by the composable
 * @returns The Stockpile card
 */
function buildStockpileView(engine: GameEngine, purchaseKilograms: number): StockpileView {
  const cost = purchaseKilograms * engine.market.pricePerKilogram
  // The Stockpile has no strain rule, so its bar is banded on the one thing running out
  // of coal does: it stops the Pulverizer, and with it the whole chain
  const level = bandFalling(engine.stockpile.fill, DEPLETED_THRESHOLD + CAUTION_MARGIN, DEPLETED_THRESHOLD)

  return {
    ...buildStorageView('STOCKPILE', engine.stockpile, level, engine.flowDemands.stockpile,
      engine.runRatios.pulverizer > 0, 't', 'kg/s', formatMass, formatRate,
      engine.spendableEnergy),
    priceText: `${formatPrice(engine.market.price)} MWh/t`,
    purchaseKilograms: purchaseKilograms,
    purchaseAmountText: `${formatMass(purchaseKilograms)} t`,
    purchaseCostText: `${formatEnergy(cost)} MWh`,
    purchaseAffordable: purchaseKilograms > 0 && cost <= engine.coalBudget,
  }
}

/**
 * @param engine - The engine to read
 * @returns The Battery card
 */
function buildBatteryView(engine: GameEngine): BatteryView {
  // Banded on MinimumReserve rather than on empty: at the floor there is nothing left to
  // spend and the alerts panel is already saying LOW BATTERY. Taken as a fraction of
  // Capacity so the band moves with the reserve, which is live (specs.md §Spendable energy)
  const reserveFraction = clamp(engine.minimumReserve / engine.battery.capacity, 0, 1)
  const level = bandFalling(engine.battery.fill, reserveFraction + CAUTION_MARGIN, reserveFraction)

  return buildStorageView('BATTERY', engine.battery, level, engine.flowDemands.battery,
    engine.runRatios.turbine > 0, 'MWh', 'MW', formatEnergy, formatPower, engine.spendableEnergy)
}

/**
 * @param spec - How this machine's throughput is written
 * @param machine - The machine to read
 * @param strain - Strain from the store it is fighting, so the gauge is live
 * @param runRatio - Fraction of its requested rate it ran at last step
 * @param stepped - Whether the run has taken a step, so a plant at rest is not read as held back
 * @param spendableEnergy - MWh available for upgrades
 * @returns One machine card
 */
function buildMachineView(
  spec: MachineSpec,
  machine: Machine,
  strain: Strain,
  runRatio: number,
  stepped: boolean,
  spendableEnergy: number,
): MachineView {
  const flowCost = machine.flowUpgrade.cost
  const efficiencyCost = machine.efficiencyUpgrade.cost
  const toleranceCost = machine.toleranceUpgrade.cost
  // What the machine actually moved last step against what it is rated for. A machine has
  // no operating control, so the only thing this can report is the chain holding it back —
  // which is the one reading the card could not carry while it printed the rating alone
  // (ui_ux.md §12). Written and drawn exactly as a store's FLOW row is.
  const delivered = machine.flow * runRatio
  const stress = machine.stress(strain.value)
  // The gauge is drawn from NominalStress rather than from zero. A machine has no
  // operating control, so it reads its nominal stress whenever nothing is wrong and never
  // travels below it: a bar scaled from zero would sit a fixed distance along at rest, in
  // the caution band, on a run specs.md calls clean. Scaled from nominal it starts empty
  // and fills as the chain drifts, which is the only thing it now reports.
  const band = machine.maxStress - machine.nominalStress
  const stressFraction = clamp((stress - machine.nominalStress) / band, 0, 1)
  const safeFraction = clamp((machine.safeStress - machine.nominalStress) / band, 0, 1)
  const stressUnit = STRESS_UNITS[machine.stressKind]

  return {
    title: spec.title,
    status: machineStatus(machine, runRatio),
    flowText: `${spec.format(delivered)} / ${spec.format(machine.flow)} ${spec.unit}`,
    flowFraction: clamp(runRatio, 0, 1),
    // Caution once the chain is costing the machine more than FlowCautionMargin of its
    // rating — a smaller shortfall is the store's news to carry, and its row is already
    // red by then. Danger only where the machine delivers nothing, which is the point its
    // drawing goes white (ui_ux.md §9), so the card says one thing twice rather than two
    // things. Before the first step there is nothing to hold back, and a plant at rest is
    // not a plant in trouble — the whole chain reads clean, as its two other bars do.
    flowLevel: stepped ? bandFalling(runRatio, 1 - FLOW_CAUTION_MARGIN, 0) : 'safe',
    repairText: machine.isTripped ? `REPAIR ${formatSeconds(machine.repairRemaining)}S` : null,
    stressLabel: STRESS_LABELS[machine.stressKind],
    stressText: `${formatStress(stress)} ${stressUnit}`,
    stressFraction: stressFraction,
    // Nothing is drawn at SafeStress any more, so the colour is what says where it is:
    // the gauge turns red exactly where the machine starts taking wear
    stressLevel: bandRising(stressFraction, safeFraction * (1 - STRESS_CAUTION_SHARE), safeFraction),
    wearFraction: clamp(machine.wear, 0, 1),
    wearPercentText: formatPercent(machine.wear),
    wearLevel: bandRising(machine.wear, WEAR_CAUTION, WEAR_DANGER),
    flowUpgrade: {
      label: 'FLOW',
      costText: `${formatEnergy(flowCost)} MWh`,
      affordable: flowCost <= spendableEnergy,
      penaltyLabel: '▼TOL',
      raisesText: transition(machine.flow, machine.flow + machine.flowGain, spec.format, spec.unit),
      erodesText: transition(machine.safeStress, machine.nextSafeStressAfterFlow, formatStress, stressUnit),
    },
    efficiencyUpgrade: {
      label: 'EFFICIENCY',
      costText: `${formatEnergy(efficiencyCost)} MWh`,
      affordable: efficiencyCost <= spendableEnergy,
      penaltyLabel: '▼FLOW',
      raisesText: transition(machine.efficiency, machine.efficiency + machine.efficiencyGain, formatEfficiency, ''),
      erodesText: transition(machine.flow, machine.nextFlowAfterEfficiency, spec.format, spec.unit),
    },
    toleranceUpgrade: {
      label: 'TOLERANCE',
      costText: `${formatEnergy(toleranceCost)} MWh`,
      affordable: toleranceCost <= spendableEnergy,
      penaltyLabel: '▼EFF',
      raisesText: transition(machine.safeStress, machine.safeStress + machine.toleranceGain, formatStress, stressUnit),
      erodesText: transition(machine.efficiency, machine.nextEfficiencyAfterTolerance, formatEfficiency, ''),
    },
  }
}

/**
 * @param engine - The engine to read
 * @returns The Power Summary
 */
function buildPowerView(engine: GameEngine): PowerView {
  const ledger = engine.ledger

  return {
    generationText: `${formatPower(ledger.generationPower)} MW`,
    consumptionText: `${formatPower(ledger.consumptionPower)} MW`,
    netFlowText: `${formatPower(ledger.netFlow, true)} MW`,
    averageText: `${formatPower(ledger.averageNetFlow, true)} MW`,
    peakText: `${formatPower(ledger.peakNetFlow, true)} MW`,
    netFlowHistory: [...ledger.netFlowHistory],
  }
}

/**
 * Every alert the interface can raise, in the order ui_ux.md §20 ranks them: a machine
 * that has stopped first, then the Battery, then the stresses, then the stores that are
 * costing the player something. The store alerts fire on the strain thresholds rather
 * than on a store actually reaching an end, because that is where the cost starts.
 *
 * The flow lines are what a single stress gauge cannot say. A machine held back by a
 * store's Flow reads exactly like one grinding into a full store, and the two have
 * different answers — buy Flow, or buy the stage that is out of step — so the panel
 * names which in words (specs.md §Buffers and strain).
 * @param engine - The engine to read
 * @returns Each alert, and whether it is raised
 */
function alertRules(engine: GameEngine): AlertRule[] {
  const flow = engine.flowRatios

  return [
    {
      text: 'PULVERIZER TRIPPED',
      urgent: true,
      raised: engine.pulverizer.isTripped,
    },
    {
      text: 'BOILER TRIPPED',
      urgent: true,
      raised: engine.boiler.isTripped,
    },
    {
      text: 'TURBINE TRIPPED',
      urgent: true,
      raised: engine.turbine.isTripped,
    },
    {
      text: 'LOW BATTERY',
      urgent: true,
      raised: engine.battery.contents <= engine.minimumReserve,
    },
    {
      text: 'HIGH TEMPERATURE',
      urgent: false,
      raised: engine.pulverizer.excess(engine.pulverizerStrain.value) > 0,
    },
    {
      text: 'HIGH PRESSURE',
      urgent: false,
      raised: engine.boiler.excess(engine.boilerStrain.value) > 0,
    },
    {
      text: 'HIGH VIBRATION',
      urgent: false,
      raised: engine.turbine.excess(engine.turbineStrain.value) > 0,
    },
    {
      text: 'SILO FLOW LIMIT',
      urgent: false,
      raised: flow.silo < 1,
    },
    {
      text: 'TANK FLOW LIMIT',
      urgent: false,
      raised: flow.tank < 1,
    },
    {
      text: 'CHARGE LIMIT',
      urgent: false,
      raised: flow.battery < 1,
    },
    {
      text: 'STOCKPILE FLOW LIMIT',
      urgent: false,
      raised: flow.stockpile < 1,
    },
    {
      text: 'TANK LOW',
      urgent: false,
      raised: engine.tank.fill < STARVE_THRESHOLD,
    },
    {
      text: 'TANK FULL',
      urgent: false,
      raised: engine.tank.fill > BACKLOG_THRESHOLD,
    },
    {
      text: 'SILO FULL',
      urgent: false,
      raised: engine.silo.fill > BACKLOG_THRESHOLD,
    },
    {
      text: 'STOCKPILE EMPTY',
      urgent: false,
      raised: engine.stockpile.contents <= 0,
    },
  ]
}

/**
 * @param engine - The engine to read
 * @returns The alerts standing right now, most urgent first
 */
function buildAlerts(engine: GameEngine): AlertView[] {
  return alertRules(engine)
    .filter((rule) => rule.raised)
    .map((rule) => ({
      text: rule.text,
      urgent: rule.urgent,
    }))
}

/**
 * Reads the whole engine into one snapshot for the components to render.
 * @param engine - The engine to read
 * @param purchaseKilograms - The coal stepper's current amount, which is UI state
 * @param bestResult - Highest stored energy across runs, MWh, or null when there is none
 * @returns A new view model; the previous one is never mutated
 */
export function buildGameView(engine: GameEngine, purchaseKilograms: number, bestResult: number | null): GameView {
  const demand = engine.flowDemands
  const run = engine.runRatios
  // A step, not the outcome: start() flips the run to running and the view is published
  // before the first step lands, so an outcome test would report every machine as
  // delivering nothing for the frames in between — on the very frame the overlay lifts.
  // Only step() writes a RunRatio, and only step() advances the clock.
  const stepped = engine.elapsedSeconds > 0

  return {
    outcome: engine.outcome,
    elapsedSeconds: engine.elapsedSeconds,
    timeText: formatTime(engine.remainingSeconds),
    target: {
      storedText: formatEnergy(engine.battery.contents),
      targetText: formatWholeEnergy(TARGET_ENERGY),
      fraction: clamp(engine.battery.contents / TARGET_ENERGY, 0, 1),
    },
    peakStoredText: `${formatEnergy(engine.ledger.peakContents)} MWh`,
    bestResultText: bestResult === null ? null : `${formatEnergy(bestResult)} MWh`,
    stockpile: buildStockpileView(engine, purchaseKilograms),
    silo: buildBufferView('SILO', engine.silo, siloLevel(engine.silo), demand.silo,
      run.pulverizer > 0 || run.boiler > 0, engine.spendableEnergy),
    tank: buildBufferView('TANK', engine.tank, tankLevel(engine.tank), demand.tank,
      run.boiler > 0 || run.turbine > 0, engine.spendableEnergy),
    battery: buildBatteryView(engine),
    pulverizer: buildMachineView(PULVERIZER_SPEC, engine.pulverizer, engine.pulverizerStrain,
      run.pulverizer, stepped, engine.spendableEnergy),
    boiler: buildMachineView(BOILER_SPEC, engine.boiler, engine.boilerStrain,
      run.boiler, stepped, engine.spendableEnergy),
    turbine: buildMachineView(TURBINE_SPEC, engine.turbine, engine.turbineStrain,
      run.turbine, stepped, engine.spendableEnergy),
    power: buildPowerView(engine),
    alerts: buildAlerts(engine),
  }
}
