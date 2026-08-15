import {FACTOR_FLOOR, STORAGE_CAPACITY_GROWTH, STORAGE_CAPACITY_UPGRADE, STORAGE_FLOW_GROWTH, STORAGE_FLOW_UPGRADE, STORE_PENALTY} from '@/game/constants'
import {gapDown, UpgradeTrack} from '@/game/upgrade_track'

/**
 * A storage component: the Stockpile, Silo, Tank, or Battery.
 * Contents are clamped between zero and Capacity, and anything produced beyond the
 * remaining room is silently discarded — specs.md §Production flow. Material stores hold
 * kilograms; the Battery holds MWh.
 *
 * Its two upgrade tracks are one budget split two ways: a large vessel is slow to move
 * material through, and a wide pipe has little room to hold any. Buying either erodes the
 * other, asymptotically, so a store is always usable and never both at once.
 *
 * Which directions a store's Flow covers is not held here, because nothing in this class
 * could act on it: `flowRatio` is handed the throughput its caller wants measured, and it
 * is the engine that knows a contended store must be given what enters plus what leaves
 * while the Stockpile and Battery are given one direction — specs.md §Storage flow.
 */
export class Storage {
  contents: number // Amount currently stored
  capacityLevel: number // Capacity upgrades bought
  flowLevel: number // Flow upgrades bought
  capacityFactor: number // Eroded by every Flow upgrade, toward FactorFloor
  flowFactor: number // Eroded by every Capacity upgrade, toward FactorFloor
  readonly baseCapacity: number // Capacity before any upgrade
  readonly baseFlow: number // Flow before any upgrade
  readonly capacityUpgrade: UpgradeTrack
  readonly flowUpgrade: UpgradeTrack

  constructor(baseCapacity: number, baseFlow: number, contents = 0) {
    this.baseCapacity = baseCapacity
    this.baseFlow = baseFlow
    this.contents = contents
    this.capacityLevel = 0
    this.flowLevel = 0
    this.capacityFactor = 1
    this.flowFactor = 1
    this.capacityUpgrade = new UpgradeTrack(
      STORAGE_CAPACITY_UPGRADE.baseCost,
      STORAGE_CAPACITY_UPGRADE.costGrowth,
    )
    this.flowUpgrade = new UpgradeTrack(
      STORAGE_FLOW_UPGRADE.baseCost,
      STORAGE_FLOW_UPGRADE.costGrowth,
    )
  }

  /** Maximum that can be stored. */
  get capacity(): number {
    return this.baseCapacity * STORAGE_CAPACITY_GROWTH ** this.capacityLevel * this.capacityFactor
  }

  /** Rate material or energy can move through the store, in its own unit per second. */
  get flow(): number {
    return this.baseFlow * STORAGE_FLOW_GROWTH ** this.flowLevel * this.flowFactor
  }

  /** Fill fraction, the input every fill-strain rule reads — specs.md §Buffers and strain. */
  get fill(): number {
    return this.capacity <= 0 ? 0 : this.contents / this.capacity
  }

  /**
   * Fraction of a requested throughput the store's Flow can carry this step.
   * @param requested - Sum of what enters and what leaves for a contended store, or the
   *   single capped direction otherwise, in units per second
   * @returns FlowRatio, 0 to 1
   */
  flowRatio(requested: number): number {
    return requested <= 0 ? 1 : Math.min(1, this.flow / requested)
  }

  /**
   * Stores as much of an amount as there is room for.
   * @param amount - Amount produced this step
   * @returns The remainder that did not fit, which is discarded
   */
  add(amount: number): number {
    const stored = Math.max(0, Math.min(amount, this.capacity - this.contents))
    this.contents += stored
    return amount - stored
  }

  /**
   * Draws an amount down, never below zero.
   * @param amount - Amount consumed this step
   */
  remove(amount: number): void {
    this.contents = Math.max(0, this.contents - amount)
  }

  /** Capacity the next capacity upgrade would add; it grows with every level bought. */
  get capacityGain(): number {
    return this.capacity * (STORAGE_CAPACITY_GROWTH - 1)
  }

  /** Flow the next flow upgrade would add; it grows with every level bought. */
  get flowGain(): number {
    return this.flow * (STORAGE_FLOW_GROWTH - 1)
  }

  /** Flow after the next capacity upgrade, which erodes it to pay for itself. */
  get nextFlowAfterCapacity(): number {
    return this.baseFlow * STORAGE_FLOW_GROWTH ** this.flowLevel
      * gapDown(this.flowFactor, FACTOR_FLOOR, STORE_PENALTY)
  }

  /** Capacity after the next flow upgrade, which erodes it to pay for itself. */
  get nextCapacityAfterFlow(): number {
    return this.baseCapacity * STORAGE_CAPACITY_GROWTH ** this.capacityLevel
      * gapDown(this.capacityFactor, FACTOR_FLOOR, STORE_PENALTY)
  }

  /**
   * Buys one capacity level, multiplying Capacity by CapacityGrowth and paying for it
   * in Flow — a larger vessel is harder to move material through.
   */
  upgradeCapacity(): void {
    this.capacityUpgrade.purchase()
    this.capacityLevel += 1
    this.flowFactor = gapDown(this.flowFactor, FACTOR_FLOOR, STORE_PENALTY)
  }

  /**
   * Buys one flow level, multiplying Flow by FlowGrowth and paying for it in Capacity —
   * a wider pipe has less room to hold anything.
   */
  upgradeFlow(): void {
    this.flowUpgrade.purchase()
    this.flowLevel += 1
    this.capacityFactor = gapDown(this.capacityFactor, FACTOR_FLOOR, STORE_PENALTY)
  }
}
