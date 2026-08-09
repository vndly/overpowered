/**
 * One purchasable upgrade track.
 * Its price grows geometrically with the number of purchases already made on it —
 * `UpgradeCost(n) = BaseCost × CostGrowth^n`, specs.md §Upgrade costs. The track counts
 * the purchases; the effect belongs to the component that owns it.
 */
export class UpgradeTrack {
  readonly baseCost: number // MWh the first purchase costs
  readonly costGrowth: number // Multiplier per purchase already made
  level: number // Purchases made on this track

  constructor(baseCost: number, costGrowth: number) {
    this.baseCost = baseCost
    this.costGrowth = costGrowth
    this.level = 0
  }

  /** MWh the next purchase on this track costs. */
  get cost(): number {
    return this.baseCost * this.costGrowth ** this.level
  }

  /**
   * Records one purchase, raising the price of the next.
   */
  purchase(): void {
    this.level += 1
  }
}
