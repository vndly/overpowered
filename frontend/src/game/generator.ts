import type {Position, ResourceKind} from '@/game/cell'
import {TUNABLES} from '@/game/tunables'

/** A generator type. One member per generator stage; stage 6 adds Solar and Wind. */
export type GeneratorKind = 'biomass'

/** Every generator the player may build, in unlock order — the build rail's row order. */
export const GENERATOR_KINDS: readonly GeneratorKind[] = ['biomass']

/**
 * A generator type's stats in game units.
 * docs/specs.md rates generators 1-5; this is that rating multiplied out, so the
 * spec's tables stay the source of truth and rebalancing is one edit in tunables.
 */
export interface GeneratorStats {
  name: string // Sentence case, as the rails print it
  cost: number // Energy to build
  output: number // Energy per minute delivered when connected
  resource: ResourceKind // The resource its cell must carry
}

/**
 * Looks up what a generator type costs and produces.
 * @param kind - The generator type
 * @returns Its stats in energy and energy per minute
 */
export function generatorStats(kind: GeneratorKind): GeneratorStats {
  const rating = TUNABLES.generators[kind]

  return {
    name: rating.name,
    cost: rating.cost * TUNABLES.economy.costUnit,
    output: rating.output * TUNABLES.economy.outputUnit,
    resource: rating.resource,
  }
}

/**
 * One generator standing on the board.
 * Plain TypeScript with no knowledge of Vue or canvas. It carries only what it
 * owns: its type, where it stands and how far it has been taken. Temperature
 * arrives at stage 4.
 */
export class Generator {
  readonly kind: GeneratorKind // Which generator this is
  readonly position: Position // The cell it stands on
  private readonly stats: GeneratorStats // Looked up once: its type cannot change
  private currentLevel: number // From 1, capped at TUNABLES.economy.maxLevel

  constructor(kind: GeneratorKind, position: Position) {
    this.kind = kind
    this.position = position
    this.stats = generatorStats(kind)
    this.currentLevel = 1
  }

  /**
   * Takes the generator up one level.
   * Whether it may happen, and what it costs, are economy.ts's answers — this
   * only records the level, the way build() only records the placement.
   */
  upgrade(): void {
    this.currentLevel++
  }

  get name(): string {
    return this.stats.name
  }

  get level(): number {
    return this.currentLevel
  }

  /** Whether it has run out of levels to buy. */
  get isMaxLevel(): boolean {
    return this.currentLevel >= TUNABLES.economy.maxLevel
  }

  /** What it cost to build, and the only thing a sale refunds against: levels are sunk. */
  get cost(): number {
    return this.stats.cost
  }

  /** Energy per minute at its current level. It counts towards the global total only while connected. */
  get output(): number {
    return this.stats.output * TUNABLES.economy.outputGrowth ** (this.currentLevel - 1)
  }
}
