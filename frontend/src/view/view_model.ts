import {BACKLOG_THRESHOLD, STARVE_THRESHOLD, TARGET_ENERGY} from '@/game/constants'
import type {GameEngine} from '@/game/game_engine'
import type {Machine} from '@/game/machine'
import type {Storage} from '@/game/storage'
import type {RunOutcome, StressKind} from '@/game/types'
import {formatEfficiency, formatEnergy, formatMass, formatPercent, formatPower, formatPrice, formatRate, formatSeconds, formatSetting, formatStress, formatTime, formatWholeEnergy} from '@/view/formatting'

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

/** How one machine's throughput is written; everything else it reads from the engine. */
interface MachineSpec {
  title: string
  unit: string // Unit its Capacity and Output are quoted in
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
  storedText: string // Contents against Capacity, with its unit
  fraction: number // What the fill bar draws; the STORED row carries the exact figure
  level: ReadingLevel // The colour that bar takes; each store is banded on its own ends
  upgradeGainText: string // Capacity the next upgrade adds, signed and with its unit
  upgradeCostText: string
  upgradeAffordable: boolean
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

/** The Battery, which also answers what of its contents can be spent. */
export interface BatteryView extends StorageViewBase {
  spendableText: string
  reservedText: string
  netFlowText: string
}

/** One machine card. The three differ only in the text this carries. */
export interface MachineView {
  title: string
  capacityText: string
  outputText: string
  repairText: string | null // Replaces the output row while tripped
  settingText: string
  settingSteps: number
  stressLabel: string // TEMPERATURE | PRESSURE | VIBRATION
  stressText: string // Value with its unit; the gauge is drawn, so this names it
  stressFraction: number // Stress against MaxStress, 0 to 1
  safeFraction: number // SafeStress against MaxStress
  stressLevel: ReadingLevel // The colour the gauge takes, banded on the SafeStress marker
  wearFraction: number
  wearPercentText: string // The wear bar is a drawing; this is the reading behind it
  wearLevel: ReadingLevel // The colour that bar takes, banded on how near a trip is
  capacityUpgradeGainText: string // What the next upgrade adds, signed and with its unit
  capacityUpgradeCostText: string
  capacityUpgradeAffordable: boolean
  efficiencyUpgradeGainText: string
  efficiencyUpgradeCostText: string
  efficiencyUpgradeAffordable: boolean
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
 * @param first - One of the two bands
 * @param second - The other
 * @returns The worse of them, for a store that is punished at both ends
 */
function worseLevel(first: ReadingLevel, second: ReadingLevel): ReadingLevel {
  return LEVEL_RANK[first] >= LEVEL_RANK[second] ? first : second
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
 * @param unit - Unit its Contents and Capacity are quoted in
 * @param format - How a value in that unit is written
 * @param spendableEnergy - MWh available for upgrades
 * @returns What every storage card shows
 */
function buildStorageView(
  title: string,
  storage: Storage,
  level: ReadingLevel,
  unit: string,
  format: (value: number) => string,
  spendableEnergy: number,
): StorageViewBase {
  const cost = storage.capacityUpgrade.cost

  return {
    title: title,
    storedText: `${format(storage.contents)} / ${format(storage.capacity)} ${unit}`,
    fraction: clamp(storage.fill, 0, 1),
    level: level,
    upgradeGainText: `+${format(storage.capacityGain)} ${unit}`,
    upgradeCostText: `${formatEnergy(cost)} MWh`,
    upgradeAffordable: cost <= spendableEnergy,
  }
}

/**
 * @param title - The card's title
 * @param storage - The buffer to read
 * @param level - Where its fill stands against the ends that punish it
 * @param spendableEnergy - MWh available for upgrades
 * @returns The Silo or Tank card
 */
function buildBufferView(title: string, storage: Storage, level: ReadingLevel, spendableEnergy: number): BufferView {
  return buildStorageView(title, storage, level, 't', formatMass, spendableEnergy)
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
    ...buildStorageView('STOCKPILE', engine.stockpile, level, 't', formatMass, engine.spendableEnergy),
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

  return {
    ...buildStorageView('BATTERY', engine.battery, level, 'MWh', formatEnergy, engine.spendableEnergy),
    spendableText: `${formatEnergy(engine.spendableEnergy)} MWh`,
    reservedText: `${formatEnergy(engine.minimumReserve)} MWh`,
    netFlowText: `${formatPower(engine.ledger.netFlow, true)} MW`,
  }
}

/**
 * @param spec - How this machine's throughput is written
 * @param machine - The machine to read
 * @param strain - Strain from the store it is fighting, so CLEAN TO is live
 * @param spendableEnergy - MWh available for upgrades
 * @returns One machine card
 */
function buildMachineView(spec: MachineSpec, machine: Machine, strain: number, spendableEnergy: number): MachineView {
  const capacityCost = machine.capacityUpgrade.cost
  const efficiencyCost = machine.efficiencyUpgrade.cost
  const stress = machine.stress(strain)
  const stressFraction = clamp(stress / machine.maxStress, 0, 1)
  const safeFraction = clamp(machine.safeStress / machine.maxStress, 0, 1)

  return {
    title: spec.title,
    capacityText: `${spec.format(machine.capacity)} ${spec.unit}`,
    outputText: `${spec.format(machine.output)} ${spec.unit}`,
    repairText: machine.isTripped ? `REPAIR ${formatSeconds(machine.repairRemaining)}S` : null,
    settingText: formatSetting(machine.setting),
    settingSteps: machine.settingSteps,
    stressLabel: STRESS_LABELS[machine.stressKind],
    stressText: `${formatStress(stress)} ${STRESS_UNITS[machine.stressKind]}`,
    stressFraction: stressFraction,
    safeFraction: safeFraction,
    // The marker is the threshold, so the gauge reddens exactly where wear starts
    stressLevel: bandRising(stressFraction, safeFraction - CAUTION_MARGIN, safeFraction),
    wearFraction: clamp(machine.wear, 0, 1),
    wearPercentText: formatPercent(machine.wear),
    wearLevel: bandRising(machine.wear, WEAR_CAUTION, WEAR_DANGER),
    capacityUpgradeGainText: `+${spec.format(machine.capacityGain)} ${spec.unit}`,
    capacityUpgradeCostText: `${formatEnergy(capacityCost)} MWh`,
    capacityUpgradeAffordable: capacityCost <= spendableEnergy,
    efficiencyUpgradeGainText: `+${formatEfficiency(machine.efficiencyGain)}`,
    efficiencyUpgradeCostText: `${formatEnergy(efficiencyCost)} MWh`,
    efficiencyUpgradeAffordable: efficiencyCost <= spendableEnergy,
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
 * that has stopped first, then the Battery, then the stresses and the stores that are
 * costing the player something. The store alerts fire on the strain thresholds rather
 * than on a store actually reaching an end, because that is where the cost starts.
 * @param engine - The engine to read
 * @returns Each alert, and whether it is raised
 */
function alertRules(engine: GameEngine): AlertRule[] {
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
      raised: engine.pulverizer.excess(engine.pulverizerStrain) > 0,
    },
    {
      text: 'HIGH PRESSURE',
      urgent: false,
      raised: engine.boiler.excess(engine.boilerStrain) > 0,
    },
    {
      text: 'HIGH VIBRATION',
      urgent: false,
      raised: engine.turbine.excess(engine.turbineStrain) > 0,
    },
    {
      text: 'TANK LOW',
      urgent: false,
      raised: engine.tank.fill <= STARVE_THRESHOLD,
    },
    {
      text: 'TANK FULL',
      urgent: false,
      raised: engine.tank.fill >= BACKLOG_THRESHOLD,
    },
    {
      text: 'SILO FULL',
      urgent: false,
      raised: engine.silo.fill >= BACKLOG_THRESHOLD,
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
    silo: buildBufferView('SILO', engine.silo, siloLevel(engine.silo), engine.spendableEnergy),
    tank: buildBufferView('TANK', engine.tank, tankLevel(engine.tank), engine.spendableEnergy),
    battery: buildBatteryView(engine),
    pulverizer: buildMachineView(PULVERIZER_SPEC, engine.pulverizer, engine.pulverizerStrain, engine.spendableEnergy),
    boiler: buildMachineView(BOILER_SPEC, engine.boiler, engine.boilerStrain, engine.spendableEnergy),
    turbine: buildMachineView(TURBINE_SPEC, engine.turbine, engine.turbineStrain, engine.spendableEnergy),
    power: buildPowerView(engine),
    alerts: buildAlerts(engine),
  }
}
