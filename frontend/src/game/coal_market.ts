import {KILOGRAMS_PER_TONNE, MARKET, SECONDS_PER_MINUTE} from '@/game/constants'
import {Random} from '@/game/random'

const HISTORY_SAMPLES = 60 // One minute of price history, for the Stockpile card
const SAMPLE_INTERVAL_SECONDS = 1

/**
 * The coal market: a trend that compounds for the whole run, with a mean-reverting
 * random deviation on top — specs.md §The coal market. Its noise comes from a seeded
 * Random, so a run replays identically from its seed.
 *
 * That determinism holds within this implementation only. simulator/sim.py draws from
 * Python's Mersenne Twister, so the same seed does not reproduce its price path here.
 * Cross-language parity is an explicit non-goal, as simulator/README.md says of its own
 * claims; what both implementations share is the rule, not the sequence.
 */
export class CoalMarket {
  market: number // Deviation from the trend, 1 at the start of a run
  elapsedSeconds: number // Run time the market has been advanced to
  private readonly random: Random
  private readonly samples: number[] // One-second price samples, oldest first
  private secondsSinceSample: number

  constructor(seed: number) {
    this.market = 1
    this.elapsedSeconds = 0
    this.random = new Random(seed)
    this.samples = [MARKET.startPrice]
    this.secondsSinceSample = 0
  }

  /** The trend the price follows before the market deviation, MWh per tonne. */
  get trend(): number {
    return MARKET.startPrice * MARKET.priceGrowth ** (this.elapsedSeconds / SECONDS_PER_MINUTE)
  }

  /** Current coal price, MWh per tonne. */
  get price(): number {
    return this.trend * this.market
  }

  /** Current coal price in the unit storage is held in, MWh per kilogram. */
  get pricePerKilogram(): number {
    return this.price / KILOGRAMS_PER_TONNE
  }

  /** The last minute of one-second price samples, oldest first. */
  get priceHistory(): readonly number[] {
    return this.samples
  }

  /**
   * Advances the trend and the random walk by one step.
   * @param deltaSeconds - Length of the step
   */
  step(deltaSeconds: number): void {
    const drift = (1 - this.market) * MARKET.reversion * deltaSeconds
    const noise = this.random.uniform(-MARKET.volatility, MARKET.volatility) * Math.sqrt(deltaSeconds)
    const walked = this.market + drift + noise

    this.market = Math.max(1 - MARKET.range, Math.min(1 + MARKET.range, walked))
    this.elapsedSeconds += deltaSeconds
    this.sample(deltaSeconds)
  }

  /**
   * Records one price sample per second of run time, keeping the last minute.
   * @param deltaSeconds - Length of the step
   */
  private sample(deltaSeconds: number): void {
    this.secondsSinceSample += deltaSeconds

    if (this.secondsSinceSample < SAMPLE_INTERVAL_SECONDS) {
      return
    }

    this.secondsSinceSample -= SAMPLE_INTERVAL_SECONDS
    this.samples.push(this.price)

    if (this.samples.length > HISTORY_SAMPLES) {
      this.samples.shift()
    }
  }
}
