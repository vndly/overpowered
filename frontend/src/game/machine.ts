import {CAPACITY_GROWTH, MACHINE_CAPACITY_UPGRADE, MACHINE_EFFICIENCY_UPGRADE, MAX_EFFICIENCY, SETTING_STEPS_PER_UNIT, STARTING_SETTING_STEPS, UPGRADE_GAIN} from '@/game/constants'
import type {StressKind} from '@/game/types'
import {UpgradeTrack} from '@/game/upgrade_track'

/**
 * A machine in the production chain.
 * Capacity is a rating rather than a ceiling: a Setting above it is allowed, is not
 * penalised in output, and is paid for in wear — specs.md §Setting, stress, and wear.
 * Subclasses supply their own stress and wear constants from constants.ts and name the
 * resources they move.
 */
export abstract class Machine {
  abstract readonly stressKind: StressKind // Which stress its Setting turns into
  abstract readonly baseConsumption: number // Consumption per unit of output
  abstract readonly baseStress: number // Stress at Setting 0
  abstract readonly stressRange: number // Stress added at Setting 1 with no strain
  abstract readonly safeStress: number // Stress below which no wear accrues
  abstract readonly maxStress: number // Stress at which wear accrues fastest
  abstract readonly wearGrowth: number // Wear per second at Excess 1, 1/s
  abstract readonly wearRecovery: number // Wear shed per second while clean, 1/s
  abstract readonly repairSeconds: number // Time offline after a trip

  capacity: number // Rated throughput
  efficiency: number // Consumption performance, up to MaxEfficiency
  settingSteps: number // Setting in tenths, 0 to MaxSettingSteps
  wear: number // Overdrive damage, 0 to 1
  wearRate: number // Wear per second over the last step, negative while shedding
  repairRemaining: number // Seconds left of the current repair, 0 while running
  tripCount: number // Trips so far this run
  readonly capacityUpgrade: UpgradeTrack
  readonly efficiencyUpgrade: UpgradeTrack

  protected constructor(capacity: number, efficiency: number) {
    this.capacity = capacity
    this.efficiency = efficiency
    this.settingSteps = STARTING_SETTING_STEPS
    this.wear = 0
    this.wearRate = 0
    this.repairRemaining = 0
    this.tripCount = 0
    this.capacityUpgrade = new UpgradeTrack(
      MACHINE_CAPACITY_UPGRADE.baseCost,
      MACHINE_CAPACITY_UPGRADE.costGrowth,
    )
    this.efficiencyUpgrade = new UpgradeTrack(
      MACHINE_EFFICIENCY_UPGRADE.baseCost,
      MACHINE_EFFICIENCY_UPGRADE.costGrowth,
    )
  }

  /** Operating level, 0 to MaxSetting. */
  get setting(): number {
    return this.settingSteps / SETTING_STEPS_PER_UNIT
  }

  /** Whether wear has taken the machine offline for repair. */
  get isTripped(): boolean {
    return this.repairRemaining > 0
  }

  /** Output at the current Setting, in the machine's own unit. */
  get output(): number {
    return this.capacity * this.setting
  }

  /** Electricity drawn while running, MW. The Turbine draws none. */
  get electricConsumption(): number {
    return (this.setting * this.capacity * this.baseConsumption) / this.efficiency
  }

  /**
   * Stress at the current Setting under a given strain. Not clamped: a machine at
   * MaxSetting under full strain reads well past its maximum and the gauge pegs there.
   * @param strain - Strain from the store this machine is fighting
   * @returns Temperature, Pressure, or Vibration in the machine's own unit
   */
  stress(strain: number): number {
    return this.baseStress + this.stressRange * this.setting * (1 + strain)
  }

  /**
   * How far into the wear band the machine is running.
   * @param strain - Strain from the store this machine is fighting
   * @returns 0 below SafeStress, rising to 1 at MaxStress
   */
  excess(strain: number): number {
    const band = (this.stress(strain) - this.safeStress) / (this.maxStress - this.safeStress)
    return Math.max(0, Math.min(1, band))
  }

  /**
   * Highest Setting that accrues no wear. It falls as the neighbouring store moves
   * toward its threshold, which is what a card reports as CLEAN TO.
   * @param strain - Strain from the store this machine is fighting
   * @returns The wear-free Setting ceiling
   */
  cleanCeiling(strain: number): number {
    return (this.safeStress - this.baseStress) / (this.stressRange * (1 + strain))
  }

  /**
   * Advances wear by one step, then the repair that wear may have caused.
   * Wear grows quadratically in Excess and is scaled by RunRatio — a machine starved of
   * input is not doing the work that damages it — and sheds at a flat rate while clean
   * or tripped. Serving a repair and starting one are mutually exclusive within a step,
   * so a machine that trips always serves the whole of its RepairSeconds.
   * @param strain - Strain from the store this machine is fighting
   * @param runRatio - Fraction of its requested rate the machine ran at
   * @param deltaSeconds - Length of the step
   */
  advanceWear(strain: number, runRatio: number, deltaSeconds: number): void {
    const excess = this.excess(strain)
    this.wearRate = this.isTripped || excess === 0
      ? -this.wearRecovery
      : this.wearGrowth * excess * excess * runRatio
    this.wear = Math.max(0, Math.min(1, this.wear + this.wearRate * deltaSeconds))

    if (this.isTripped) {
      this.repairRemaining = Math.max(0, this.repairRemaining - deltaSeconds)
    } else if (this.wear >= 1) {
      this.repairRemaining = this.repairSeconds
      this.tripCount += 1
    }
  }

  /**
   * Buys one capacity level, multiplying Capacity by CapacityGrowth.
   */
  upgradeCapacity(): void {
    this.capacityUpgrade.purchase()
    this.capacity *= CAPACITY_GROWTH
  }

  /**
   * Buys one efficiency level, closing UpgradeGain of the gap to MaxEfficiency.
   */
  upgradeEfficiency(): void {
    this.efficiencyUpgrade.purchase()
    this.efficiency += (MAX_EFFICIENCY - this.efficiency) * UPGRADE_GAIN
  }
}
