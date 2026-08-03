import type {Match} from '@/game/match'
import {TUNABLES} from '@/game/tunables'

/**
 * The fixed-timestep driver for a match.
 * It accumulates real elapsed time and runs the sim at a fixed step as many
 * times as that allows, then renders once. A frame's delta is clamped, so a
 * backgrounded tab returns to a clamped catch-up rather than a death spiral.
 *
 * Look-only pause falls out of this for free: the loop keeps rendering and
 * stops accumulating, and the sim needs no special case at all.
 */
export class MatchLoop {
  private readonly match: Match
  private readonly onFrame: (deltaSeconds: number) => void // Renders, then publishes the HUD snapshot
  private accumulatedSeconds: number // Sim time owed but not yet stepped
  private lastTimestamp: number
  private frameHandle: number // 0 when the loop is not running
  private isPaused: boolean

  constructor(match: Match, onFrame: (deltaSeconds: number) => void) {
    this.match = match
    this.onFrame = onFrame
    this.accumulatedSeconds = 0
    this.lastTimestamp = 0
    this.frameHandle = 0
    this.isPaused = false
  }

  start(): void {
    if (this.frameHandle !== 0) {
      return
    }

    this.lastTimestamp = performance.now()
    this.frameHandle = requestAnimationFrame(this.advance)
  }

  stop(): void {
    if (this.frameHandle === 0) {
      return
    }

    cancelAnimationFrame(this.frameHandle)
    this.frameHandle = 0
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
  }

  get paused(): boolean {
    return this.isPaused
  }

  /**
   * One animation frame: catch the sim up, then render.
   * @param timestamp - The frame time supplied by requestAnimationFrame
   */
  private advance = (timestamp: number): void => {
    this.frameHandle = requestAnimationFrame(this.advance)

    const deltaSeconds = Math.min((timestamp - this.lastTimestamp) / 1000, TUNABLES.loop.maxCatchUpSeconds)
    this.lastTimestamp = timestamp

    if (!this.isPaused) {
      this.accumulatedSeconds += deltaSeconds

      while (this.accumulatedSeconds >= TUNABLES.loop.fixedStepSeconds) {
        this.match.tick(TUNABLES.loop.fixedStepSeconds)
        this.accumulatedSeconds -= TUNABLES.loop.fixedStepSeconds
      }
    }

    // The real frame delta, not the fixed step: tweens are render-time, not sim-time
    this.onFrame(deltaSeconds)
  }
}
