import {EFFICIENCY_PENALTY, FACTOR_FLOOR, FLOW_PENALTY, MACHINE_EFFICIENCY_UPGRADE, MACHINE_FLOW_GROWTH, MACHINE_FLOW_UPGRADE, MACHINE_TOLERANCE_UPGRADE, MAX_EFFICIENCY, MIN_EFFICIENCY, TOLERANCE_GAIN, TOLERANCE_PENALTY, UPGRADE_GAIN} from '@/game/constants'
import type {StressKind} from '@/game/types'
import {gapDown, gapUp, UpgradeTrack} from '@/game/upgrade_track'

/**
 * A machine in the production chain.
 * There is no operating control: a machine always runs and its Output is its Flow — the
 * rate it is rated for, in its own unit per second. A machine holds nothing, which is why
 * the word is Flow here and Capacity is left to the stores, where it means an amount held.
 * The only thing that can raise its stress is Strain — being out of step with the chain
 * around it — so wear is the readout of an unbalanced plant, not of a throttle the player
 * pushed. See specs.md §Stress and wear.
 *
 * Its three upgrade tracks form a cycle, each raising one value and eroding the next:
 * Flow → SafeStress → Efficiency → Flow. Every penalty is asymptotic, so a lopsided
 * machine is reachable and a broken one is not.
 */
export abstract class Machine {
  abstract readonly stressKind: StressKind // Which stress its Strain turns into
  abstract readonly baseConsumption: number // Consumption per unit of output
  abstract readonly baseFlow: number // Flow before any upgrade
  abstract readonly nominalStress: number // Stress running clean, at any Flow
  abstract readonly maxTolerance: number // Highest SafeStress upgrades reach
  abstract readonly minTolerance: number // Floor SafeStress is eroded toward
  abstract readonly maxStress: number // Stress at which wear accrues fastest
  abstract readonly wearGrowth: number // Wear per second at Excess 1, 1/s
  abstract readonly wearRecovery: number // Wear shed per second while clean, 1/s
  abstract readonly repairSeconds: number // Time offline after a trip

  flowLevel: number // Flow upgrades bought
  flowFactor: number // Eroded by every Efficiency upgrade, toward FactorFloor
  efficiency: number // Consumption performance, between MinEfficiency and MaxEfficiency
  safeStress: number // Stress below which no wear accrues; raised by Tolerance
  wear: number // Damage from running strained, 0 to 1
  wearRate: number // Wear per second over the last step, negative while shedding
  repairRemaining: number // Seconds left of the current repair, 0 while running
  tripCount: number // Trips so far this run
  readonly flowUpgrade: UpgradeTrack
  readonly efficiencyUpgrade: UpgradeTrack
  readonly toleranceUpgrade: UpgradeTrack

  protected constructor(efficiency: number, safeStress: number) {
    this.flowLevel = 0
    this.flowFactor = 1
    this.efficiency = efficiency
    this.safeStress = safeStress
    this.wear = 0
    this.wearRate = 0
    this.repairRemaining = 0
    this.tripCount = 0
    this.flowUpgrade = new UpgradeTrack(
      MACHINE_FLOW_UPGRADE.baseCost,
      MACHINE_FLOW_UPGRADE.costGrowth,
    )
    this.efficiencyUpgrade = new UpgradeTrack(
      MACHINE_EFFICIENCY_UPGRADE.baseCost,
      MACHINE_EFFICIENCY_UPGRADE.costGrowth,
    )
    this.toleranceUpgrade = new UpgradeTrack(
      MACHINE_TOLERANCE_UPGRADE.baseCost,
      MACHINE_TOLERANCE_UPGRADE.costGrowth,
    )
  }

  /** Rated throughput, which is also what the machine delivers when nothing holds it back. */
  get flow(): number {
    return this.baseFlow * MACHINE_FLOW_GROWTH ** this.flowLevel * this.flowFactor
  }

  /** Whether wear has taken the machine offline for repair. */
  get isTripped(): boolean {
    return this.repairRemaining > 0
  }

  /** Output, in the machine's own unit. A machine always runs at its Flow. */
  get output(): number {
    return this.flow
  }

  /** Electricity drawn while running, MW. The Turbine draws none. */
  get electricConsumption(): number {
    return (this.flow * this.baseConsumption) / this.efficiency
  }

  /**
   * Stress under a given strain. Not clamped: a machine under full strain can read well
   * past its maximum and the gauge pegs there.
   * @param strain - Strain from the store this machine is fighting
   * @returns Temperature, Pressure, or Vibration in the machine's own unit
   */
  stress(strain: number): number {
    return this.nominalStress * (1 + strain)
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

  /** Flow the next flow upgrade would add; it grows with every level bought. */
  get flowGain(): number {
    return this.flow * (MACHINE_FLOW_GROWTH - 1)
  }

  /** Efficiency the next efficiency upgrade would add; it shrinks as the gap closes. */
  get efficiencyGain(): number {
    return (MAX_EFFICIENCY - this.efficiency) * UPGRADE_GAIN
  }

  /** SafeStress the next tolerance upgrade would add; it shrinks as the gap closes. */
  get toleranceGain(): number {
    return (this.maxTolerance - this.safeStress) * TOLERANCE_GAIN
  }

  /** SafeStress after the next flow upgrade, which erodes it to pay for the rate. */
  get nextSafeStressAfterFlow(): number {
    return gapDown(this.safeStress, this.minTolerance, FLOW_PENALTY)
  }

  /** Efficiency after the next tolerance upgrade, which erodes it to pay for itself. */
  get nextEfficiencyAfterTolerance(): number {
    return gapDown(this.efficiency, MIN_EFFICIENCY, TOLERANCE_PENALTY)
  }

  /** Flow after the next efficiency upgrade, which erodes it to pay for itself. */
  get nextFlowAfterEfficiency(): number {
    return this.baseFlow * MACHINE_FLOW_GROWTH ** this.flowLevel
      * gapDown(this.flowFactor, FACTOR_FLOOR, EFFICIENCY_PENALTY)
  }

  /**
   * Buys one flow level. A faster machine runs closer to its limits, so it is paid for in
   * SafeStress — specs.md §Every upgrade has a downside.
   */
  upgradeFlow(): void {
    this.flowUpgrade.purchase()
    this.flowLevel += 1
    this.safeStress = gapDown(this.safeStress, this.minTolerance, FLOW_PENALTY)
  }

  /**
   * Buys one efficiency level, closing UpgradeGain of the gap to MaxEfficiency.
   * A lean tune cannot hold its peak, so it is paid for in Flow.
   */
  upgradeEfficiency(): void {
    this.efficiencyUpgrade.purchase()
    this.efficiency = gapUp(this.efficiency, MAX_EFFICIENCY, UPGRADE_GAIN)
    this.flowFactor = gapDown(this.flowFactor, FACTOR_FLOOR, EFFICIENCY_PENALTY)
  }

  /**
   * Buys one tolerance level, closing ToleranceGain of the gap to MaxTolerance.
   * Derating and armouring a machine wastes energy, so it is paid for in Efficiency.
   */
  upgradeTolerance(): void {
    this.toleranceUpgrade.purchase()
    this.safeStress = gapUp(this.safeStress, this.maxTolerance, TOLERANCE_GAIN)
    this.efficiency = gapDown(this.efficiency, MIN_EFFICIENCY, TOLERANCE_PENALTY)
  }
}
