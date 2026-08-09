/**
 * Mulberry32, a small seeded pseudo-random generator.
 * The coal market draws its noise from one of these, so a run replays identically from
 * its seed and two runs sharing a seed face the same market — specs.md §The coal market.
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
