/**
 * Mulberry32, a small seeded pseudo-random generator.
 * No rule draws from one at the moment — the coal market did until its price became a
 * fixed curve (specs.md §The coal market), and every other rule is deterministic too.
 * It is kept, with the seed each run is built from, for the rule that needs randomness.
 */
export class Random {
  private state: number // 32-bit generator state, advanced on every draw

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /**
   * Draws the next value in the sequence.
   * @returns A number in [0, 1)
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(this.state ^ (this.state >>> 15), this.state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Draws uniformly from a range.
   * @param minimum - Lowest value the draw can take
   * @param maximum - Value the draw stays below
   * @returns A number in [minimum, maximum)
   */
  uniform(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next()
  }
}
