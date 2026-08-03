import {Accumulator} from '@/game/accumulator'
import type {Position} from '@/game/cell'
import {samePosition} from '@/game/cell'
import {checkBuild, checkUpgrade, refundFor, upgradeCostFor} from '@/game/economy'
import type {GeneratorKind} from '@/game/generator'
import {Generator} from '@/game/generator'
import {Grid} from '@/game/grid'
import type {Level} from '@/game/level'
import type {Network} from '@/game/network'
import {cellsInReach, traceNetwork} from '@/game/network'
import {TUNABLES} from '@/game/tunables'

/** Where a match stands. Pause is not here: it belongs to the loop, not the sim. */
export type MatchStatus = 'running' | 'won' | 'lost'

/** Anything standing on a cell. Discriminated with `instanceof`, since these are classes. */
export type Structure = Generator | Accumulator

/**
 * One playthrough of a level: its board, its clock and its energy.
 * Plain TypeScript with no knowledge of Vue or canvas, advanced only by
 * MatchLoop and read only by the renderer and the HUD snapshot.
 */
export class Match {
  readonly level: Level // The level being played
  readonly grid: Grid // Its board
  readonly accumulator: Accumulator // Placed free before the match starts, and the network's root
  private readonly builtGenerators: Generator[]
  private tracedNetwork: Network // Cached: routing depends on topology, not on time
  private elapsedSeconds: number // Time since the match started
  private energy: number // Stored energy, the currency and the objective
  private currentStatus: MatchStatus

  constructor(level: Level) {
    this.level = level
    this.grid = new Grid(level.columns, level.rows, level.cells)
    this.accumulator = new Accumulator(level.accumulator)
    this.builtGenerators = []
    this.elapsedSeconds = 0
    this.energy = level.startingEnergy
    this.currentStatus = 'running'
    this.tracedNetwork = this.trace()
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

    // Output is quoted per minute, and only what reaches the accumulator counts
    this.energy += this.tracedNetwork.deliveredOutput * (deltaSeconds / 60)

    // Win is checked first, so reaching the goal on the final step is a win
    if (this.energy >= this.level.goal) {
      this.currentStatus = 'won'

      return
    }

    if (this.elapsedSeconds >= this.level.durationSeconds) {
      this.currentStatus = 'lost'
    }
  }

  /**
   * Builds a generator, charging the player for it.
   * The rules live in economy.ts and are checked here rather than trusted from
   * the caller, so no path into the sim can spend energy it does not have.
   * @param kind - The generator to build
   * @param position - The cell it stands on
   * @returns Whether it was built
   */
  build(kind: GeneratorKind, position: Position): boolean {
    if (this.isOver || !checkBuild(this, kind, position).allowed) {
      return false
    }

    const generator = new Generator(kind, position)

    this.energy -= generator.cost
    this.builtGenerators.push(generator)
    this.tracedNetwork = this.trace()

    return true
  }

  /**
   * Upgrades a generator, charging the player for it.
   * The network is retraced even though nothing moved: delivered output is
   * summed when the trace runs, so a generator that grows has to be counted
   * again or the HUD keeps reading the rate it had before.
   * @param position - The cell the generator stands on
   * @returns Whether it was upgraded
   */
  upgrade(position: Position): boolean {
    const generator = this.generatorAt(position)

    if (this.isOver || generator === undefined || !checkUpgrade(this, generator).allowed) {
      return false
    }

    this.energy -= upgradeCostFor(generator)
    generator.upgrade()
    this.tracedNetwork = this.trace()

    return true
  }

  /**
   * Sells a generator, refunding part of what it cost.
   * Whatever the chain behind it carried goes with it: the network is retraced,
   * so selling a link disconnects everything that reached through it.
   * @param position - The cell the generator stands on
   * @returns Whether it was sold
   */
  sell(position: Position): boolean {
    const generator = this.generatorAt(position)

    if (this.isOver || generator === undefined) {
      return false
    }

    this.builtGenerators.splice(this.builtGenerators.indexOf(generator), 1)
    this.energy += refundFor(generator)
    this.tracedNetwork = this.trace()

    return true
  }

  /**
   * The generator standing on a cell.
   * @param position - The cell to read
   * @returns The generator, or undefined if none stands there
   */
  generatorAt(position: Position): Generator | undefined {
    return this.builtGenerators.find((generator) => samePosition(generator.position, position))
  }

  /**
   * Whatever stands on a cell, the free accumulator included — so nothing can be
   * built on top of it.
   * @param position - The cell to read
   * @returns The structure, or undefined if the cell is bare
   */
  structureAt(position: Position): Structure | undefined {
    if (samePosition(this.accumulator.position, position)) {
      return this.accumulator
    }

    return this.generatorAt(position)
  }

  /**
   * Whether a generator's output reaches the accumulator.
   * @param generator - The generator to test
   * @returns Whether it is on the network
   */
  isConnected(generator: Generator): boolean {
    return this.tracedNetwork.connected.has(generator)
  }

  /**
   * The structures already on the network that a placement here would join.
   * It answers both halves of the placement preview at once: the board draws a
   * cable to each of these, and an empty result is what makes a placement read
   * as delivering nothing.
   * @param position - The cell being considered
   * @returns The cells holding those structures
   */
  networkNeighbours(position: Position): Position[] {
    return cellsInReach(this.grid, position, TUNABLES.network.structureReach).filter((neighbour) => {
      const generator = this.generatorAt(neighbour)

      return generator === undefined
        ? samePosition(neighbour, this.accumulator.position)
        : this.isConnected(generator)
    })
  }

  /** Retraces from the accumulator. Called on topology change only, never per tick. */
  private trace(): Network {
    return traceNetwork(this.grid, this.accumulator.position, (position) => this.generatorAt(position))
  }

  get generators(): readonly Generator[] {
    return this.builtGenerators
  }

  get network(): Network {
    return this.tracedNetwork
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
   * Nothing consumes energy before stage 9, so it is what the network delivers.
   */
  get actualPace(): number {
    return this.tracedNetwork.deliveredOutput
  }
}
