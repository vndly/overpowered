import {Grid} from '@/game/grid'
import type {Level} from '@/game/level'

/** Where a match stands. Pause is not here: it belongs to the loop, not the sim. */
export type MatchStatus = 'running' | 'won' | 'lost'

/**
 * One playthrough of a level: its board, its clock and its energy.
 * Plain TypeScript with no knowledge of Vue or canvas, advanced only by
 * MatchLoop and read only by the renderer and the HUD snapshot.
 */
export class Match {
  readonly level: Level // The level being played
  readonly grid: Grid // Its board
  private elapsedSeconds: number // Time since the match started
  private energy: number // Stored energy, the currency and the objective
  private currentStatus: MatchStatus

  constructor(level: Level) {
    this.level = level
    this.grid = new Grid(level.columns, level.rows, level.cells)
    this.elapsedSeconds = 0
    this.energy = level.startingEnergy
    this.currentStatus = 'running'
  }

  /**
   * Advances the match by exactly one fixed step.
   * @param deltaSeconds - The fixed step, never a real frame delta
   */
  tick(deltaSeconds: number): void {
    if (this.currentStatus !== 'running') {
      return
    }

    this.elapsedSeconds += deltaSeconds

    // Win is checked first, so reaching the goal on the final step is a win
    if (this.energy >= this.level.goal) {
      this.currentStatus = 'won'

      return
    }

    if (this.elapsedSeconds >= this.level.durationSeconds) {
      this.currentStatus = 'lost'
    }
  }

  get status(): MatchStatus {
    return this.currentStatus
  }

  get isOver(): boolean {
    return this.currentStatus !== 'running'
  }

  get storedEnergy(): number {
    return this.energy
  }

  get remainingSeconds(): number {
    return Math.max(0, this.level.durationSeconds - this.elapsedSeconds)
  }

  /**
   * The rate that still reaches the goal in the time left, in energy per minute.
   * It climbs as the match runs, which is the pressure made visible.
   */
  get requiredPace(): number {
    const remaining = this.remainingSeconds

    if (remaining <= 0) {
      return 0
    }

    return Math.max(0, this.level.goal - this.energy) / (remaining / 60)
  }

  /**
   * The live net rate the player is actually earning, in energy per minute.
   * Nothing generates or consumes energy before stage 2, so it is flat zero.
   */
  get actualPace(): number {
    return 0
  }
}
