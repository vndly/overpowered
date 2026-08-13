import {TURBINE} from '@/game/constants'
import {Machine} from '@/game/machine'
import type {StressKind} from '@/game/types'

/**
 * The Turbine converts steam from the Tank into electricity in the Battery, and strains
 * when the Tank runs dry — specs.md §Turbine. It is the only pure consumer of the chain,
 * which is why its strain inverts and why it draws no electricity: any steam left in the
 * Tank is always convertible back into energy.
 */
export class Turbine extends Machine {
  readonly stressKind: StressKind = 'vibration'
  readonly baseConsumption = TURBINE.baseConsumption
  readonly baseCapacity = TURBINE.capacity
  readonly nominalStress = TURBINE.nominalStress
  readonly maxTolerance = TURBINE.maxTolerance
  readonly minTolerance = TURBINE.minTolerance
  readonly maxStress = TURBINE.maxStress
  readonly wearGrowth = TURBINE.wearGrowth
  readonly wearRecovery = TURBINE.wearRecovery
  readonly repairSeconds = TURBINE.repairSeconds

  constructor() {
    super(TURBINE.efficiency, TURBINE.safeStress)
  }

  /** The Turbine consumes no electricity. */
  override get electricConsumption(): number {
    return 0
  }

  /** Electricity produced, MW. */
  get powerOutput(): number {
    return this.output
  }

  /** Steam drawn from the Tank, kg/s. */
  get steamConsumption(): number {
    return (this.capacity * this.baseConsumption) / this.efficiency
  }
}
