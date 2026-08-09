import {CAPACITY_GROWTH, STORAGE_CAPACITY_UPGRADE} from '@/game/constants'
import {UpgradeTrack} from '@/game/upgrade_track'

/**
 * A storage component: the Stockpile, Silo, Tank, or Battery.
 * Contents are clamped between zero and Capacity, and anything produced beyond the
 * remaining room is silently discarded — specs.md §Production flow. Material stores hold
 * kilograms; the Battery holds MWh.
 */
export class Storage {
  contents: number // Amount currently stored
  capacity: number // Maximum that can be stored
  readonly capacityUpgrade: UpgradeTrack

  constructor(capacity: number, contents = 0) {
    this.capacity = capacity
    this.contents = contents
    this.capacityUpgrade = new UpgradeTrack(
      STORAGE_CAPACITY_UPGRADE.baseCost,
      STORAGE_CAPACITY_UPGRADE.costGrowth,
    )
  }

  /** Fill fraction, the input every strain rule reads — specs.md §Buffers and strain. */
  get fill(): number {
    return this.capacity <= 0 ? 0 : this.contents / this.capacity
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

  /**
   * Buys one capacity level, multiplying Capacity by CapacityGrowth.
   */
  upgradeCapacity(): void {
    this.capacityUpgrade.purchase()
    this.capacity *= CAPACITY_GROWTH
  }
}
