import {KILOGRAMS_PER_TONNE, MARKET, SECONDS_PER_MINUTE} from '@/game/constants'

/**
 * The coal market: a price that compounds for the whole run and never deviates from
 * that curve — specs.md §The coal market. It carries no randomness, so the price at a
 * given second of a run is the same price in every run, and what a purchase costs is a
 * question about the clock alone.
 */
export class CoalMarket {
  elapsedSeconds: number // Run time the market has been advanced to

  constructor() {
    this.elapsedSeconds = 0
  }

  /** Current coal price, MWh per tonne. */
  get price(): number {
    return MARKET.startPrice * MARKET.priceGrowth ** (this.elapsedSeconds / SECONDS_PER_MINUTE)
  }

  /** Current coal price in the unit storage is held in, MWh per kilogram. */
  get pricePerKilogram(): number {
    return this.price / KILOGRAMS_PER_TONNE
  }

  /**
   * Advances the price by one step.
   * @param deltaSeconds - Length of the step
   */
  step(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds
  }
}
