import {BACKLOG_THRESHOLD, STARVE_THRESHOLD, TARGET_ENERGY} from '@/game/constants'
import type {GameEngine} from '@/game/game_engine'
import type {Machine} from '@/game/machine'
import type {Storage} from '@/game/storage'
import type {RunOutcome, StressKind} from '@/game/types'
import {formatCeiling, formatEfficiency, formatEnergy, formatMass, formatPercent, formatPower, formatPrice, formatRate, formatSeconds, formatSetting, formatStress, formatTime} from '@/view/formatting'

/**
 * The one thing components are allowed to see.
 * buildGameView reads the engine and returns a new plain object every call — no getters,
 * no class instances, no reference back into the engine — so a component can render the
 * game without being able to reach it. Every gameplay rule stays behind this wall.
 */

const BACKLOG_GLYPH = '╷' // The fill above which a producer strains
const STARVE_GLYPH = '╵' // The fill below which a consumer strains

const STRESS_LABELS: Record<StressKind, string> = {
  temperature: 'TEMP',
  pressure: 'PRESSURE',
  vibration: 'VIBRATION',
}

const STRESS_UNITS: Record<StressKind, string> = {
  temperature: '°C',
  pressure: 'bar',
  vibration: 'mm/s',
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

/** A strain threshold, drawn beneath a Silo or Tank fill bar. */
export interface StrainMark {
  fraction: number
  glyph: string
}

/** What every storage card shows, whatever it stores. */
export interface StorageViewBase {
  title: string
  storedText: string // Contents against Capacity, with its unit
  fraction: number // What the fill bar draws; the STORED row carries the exact figure
  upgradeGainText: string // Capacity the next upgrade adds, signed and with its unit
  upgradeCostText: string
  upgradeAffordable: boolean
}

/** The Stockpile, which is also where coal is bought. */
export interface StockpileView extends StorageViewBase {
  priceText: string
  priceHistory: number[] // Last 60 one-second samples
  purchaseKilograms: number // The stepper's current amount
  purchaseAmountText: string
  purchaseCostText: string
  purchaseAffordable: boolean
}

/** The Silo and the Tank, which mark the strain thresholds on their bars. */
export interface BufferView extends StorageViewBase {
  marks: StrainMark[]
}

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
  efficiencyText: string
  settingText: string
  settingSteps: number
  stressLabel: string // TEMP | PRESSURE | VIBRATION
  stressText: string // Value with its unit
  stressFraction: number // Stress against MaxStress, 0 to 1
  safeFraction: number // SafeStress against MaxStress
  cleanToText: string // The live ceiling, strain included
  wearFraction: number
  wearPercentText: string
  wearNoteText: string // What the wear is about to do
  outputText: string
  repairText: string | null // Replaces the output row while tripped
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
    targetText: string
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
 * What the wear bar is about to do, which is the only question a machine card has to
 * answer: how long can this Setting be held. Time to a trip is the headroom over the
 * current rate; time to clean is the wear over the recovery rate.
 * @param machine - The machine to read
 * @returns The note beneath its wear bar
 */
function wearNote(machine: Machine): string {
  if (machine.wear <= 0) {
    return 'CLEAN'
  }

  if (machine.wearRate > 0) {
    return `TRIPS IN ${formatSeconds((1 - machine.wear) / machine.wearRate)}S`
  }

  if (machine.wearRate < 0) {
    return `CLEARS IN ${formatSeconds(machine.wear / machine.wearRecovery)}S`
  }

  // Over its safe stress but with nothing to work on, so the wear neither grows nor sheds
  return 'HOLDING'
}

/**
 * @param title - The card's title
 * @param storage - The store to read
 * @param unit - Unit its Contents and Capacity are quoted in
 * @param format - How a value in that unit is written
 * @param spendableEnergy - MWh available for upgrades
 * @returns What every storage card shows
 */
function buildStorageView(
  title: string,
  storage: Storage,
  unit: string,
  format: (value: number) => string,
  spendableEnergy: number,
): StorageViewBase {
  const cost = storage.capacityUpgrade.cost

  return {
    title: title,
    storedText: `${format(storage.contents)} / ${format(storage.capacity)} ${unit}`,
    fraction: clamp(storage.fill, 0, 1),
    upgradeGainText: `+${format(storage.capacityGain)} ${unit}`,
    upgradeCostText: `${formatEnergy(cost)} MWh`,
    upgradeAffordable: cost <= spendableEnergy,
  }
}

/**
 * @param title - The card's title
 * @param storage - The buffer to read
 * @param marks - Its strain thresholds
 * @param spendableEnergy - MWh available for upgrades
 * @returns The Silo or Tank card
 */
function buildBufferView(title: string, storage: Storage, marks: StrainMark[], spendableEnergy: number): BufferView {
  return {
    ...buildStorageView(title, storage, 't', formatMass, spendableEnergy),
    marks: marks,
  }
}

/**
 * @param engine - The engine to read
 * @param purchaseKilograms - The coal stepper's current amount, owned by the composable
 * @returns The Stockpile card
 */
function buildStockpileView(engine: GameEngine, purchaseKilograms: number): StockpileView {
  const cost = purchaseKilograms * engine.market.pricePerKilogram

  return {
    ...buildStorageView('STOCKPILE', engine.stockpile, 't', formatMass, engine.spendableEnergy),
    priceText: `${formatPrice(engine.market.price)} MWh/t`,
    priceHistory: [...engine.market.priceHistory],
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
  return {
    ...buildStorageView('BATTERY', engine.battery, 'MWh', formatEnergy, engine.spendableEnergy),
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

  return {
    title: spec.title,
    capacityText: `${spec.format(machine.capacity)} ${spec.unit}`,
    efficiencyText: formatEfficiency(machine.efficiency),
    settingText: formatSetting(machine.setting),
    settingSteps: machine.settingSteps,
    stressLabel: STRESS_LABELS[machine.stressKind],
    stressText: `${formatStress(machine.stress(strain))} ${STRESS_UNITS[machine.stressKind]}`,
    stressFraction: clamp(machine.stress(strain) / machine.maxStress, 0, 1),
    safeFraction: clamp(machine.safeStress / machine.maxStress, 0, 1),
    cleanToText: formatCeiling(machine.cleanCeiling(strain)),
    wearFraction: clamp(machine.wear, 0, 1),
    wearPercentText: formatPercent(machine.wear),
    wearNoteText: wearNote(machine),
    outputText: `${spec.format(machine.output)} ${spec.unit}`,
    repairText: machine.isTripped ? `REPAIR ${formatSeconds(machine.repairRemaining)}S` : null,
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
      targetText: formatEnergy(TARGET_ENERGY),
      fraction: clamp(engine.battery.contents / TARGET_ENERGY, 0, 1),
    },
    peakStoredText: `${formatEnergy(engine.ledger.peakContents)} MWh`,
    bestResultText: bestResult === null ? null : `${formatEnergy(bestResult)} MWh`,
    stockpile: buildStockpileView(engine, purchaseKilograms),
    silo: buildBufferView('SILO', engine.silo, [
      {
        fraction: BACKLOG_THRESHOLD,
        glyph: BACKLOG_GLYPH,
      },
    ], engine.spendableEnergy),
    tank: buildBufferView('TANK', engine.tank, [
      {
        fraction: STARVE_THRESHOLD,
        glyph: STARVE_GLYPH,
      },
      {
        fraction: BACKLOG_THRESHOLD,
        glyph: BACKLOG_GLYPH,
      },
    ], engine.spendableEnergy),
    battery: buildBatteryView(engine),
    pulverizer: buildMachineView(PULVERIZER_SPEC, engine.pulverizer, engine.pulverizerStrain, engine.spendableEnergy),
    boiler: buildMachineView(BOILER_SPEC, engine.boiler, engine.boilerStrain, engine.spendableEnergy),
    turbine: buildMachineView(TURBINE_SPEC, engine.turbine, engine.turbineStrain, engine.spendableEnergy),
    power: buildPowerView(engine),
    alerts: buildAlerts(engine),
  }
}
