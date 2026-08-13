/**
 * Closes a share of the distance to a ceiling — the shape every raising upgrade uses.
 * It approaches the ceiling without ever reaching it, so a track never runs out.
 * @param value - Current value
 * @param ceiling - Bound the value rises toward
 * @param share - Fraction of the remaining gap to close
 * @returns The raised value
 */
export function gapUp(value: number, ceiling: number, share: number): number {
  return value + (ceiling - value) * share
}

/**
 * Closes a share of the distance to a floor — the shape every penalty uses.
 * It approaches the floor without ever reaching it, so no track can drive a stat to
 * nothing and no purchase can leave a machine unable to run — specs.md §Upgrade costs.
 * @param value - Current value
 * @param floor - Bound the value falls toward
 * @param share - Fraction of the remaining gap to close
 * @returns The eroded value
 */
export function gapDown(value: number, floor: number, share: number): number {
  return value - (value - floor) * share
}

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
