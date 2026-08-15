import {BOILER} from '@/game/constants'
import {Machine} from '@/game/machine'
import type {StressKind} from '@/game/types'

/**
 * The Boiler burns pulverized coal from the Silo into steam in the Tank, and strains
 * when the Tank backs up — specs.md §Boiler.
 */
export class Boiler extends Machine {
  readonly stressKind: StressKind = 'pressure'
  readonly baseConsumption = BOILER.baseConsumption
  readonly baseFlow = BOILER.flow
  readonly nominalStress = BOILER.nominalStress
  readonly maxTolerance = BOILER.maxTolerance
  readonly minTolerance = BOILER.minTolerance
  readonly maxStress = BOILER.maxStress
  readonly wearGrowth = BOILER.wearGrowth
  readonly wearRecovery = BOILER.wearRecovery
  readonly repairSeconds = BOILER.repairSeconds

  constructor() {
    super(BOILER.efficiency, BOILER.safeStress)
  }

  /** Steam produced, kg/s. */
  get steamOutput(): number {
    return this.output
  }

  /** Pulverized coal drawn from the Silo, kg/s. */
  get fuelConsumption(): number {
    return this.output / (BOILER.steamYield * this.efficiency)
  }
}
