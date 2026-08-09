import {PULVERIZER} from '@/game/constants'
import {Machine} from '@/game/machine'
import type {StressKind} from '@/game/types'

/**
 * The Pulverizer converts raw coal from the Stockpile into pulverized coal in the Silo,
 * and strains when the Silo backs up — specs.md §Pulverizer.
 */
export class Pulverizer extends Machine {
  readonly stressKind: StressKind = 'temperature'
  readonly baseConsumption = PULVERIZER.baseConsumption
  readonly baseStress = PULVERIZER.baseStress
  readonly stressRange = PULVERIZER.stressRange
  readonly safeStress = PULVERIZER.safeStress
  readonly maxStress = PULVERIZER.maxStress
  readonly wearGrowth = PULVERIZER.wearGrowth
  readonly wearRecovery = PULVERIZER.wearRecovery
  readonly repairSeconds = PULVERIZER.repairSeconds

  constructor() {
    super(PULVERIZER.capacity, PULVERIZER.efficiency)
  }

  /** Pulverized coal produced, kg/s. */
  get pulverizedOutput(): number {
    return this.output
  }

  /** Raw coal drawn from the Stockpile, kg/s. */
  get rawCoalConsumption(): number {
    return this.output / PULVERIZER.pulverizedCoalYield
  }
}
