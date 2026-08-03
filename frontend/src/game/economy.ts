import type {Position} from '@/game/cell'
import type {Generator, GeneratorKind} from '@/game/generator'
import {generatorStats} from '@/game/generator'
import type {Match} from '@/game/match'
import {TUNABLES} from '@/game/tunables'

/**
 * Whether a structure may be built on a cell, and why not when it may not.
 * Placement and affordability are separate answers because docs/ui.md shows them
 * differently: an illegal row drops to ink-faint, an unaffordable one keeps its
 * weight and only recolours its cost.
 */
export interface BuildCheck {
  placeable: boolean // The cell accepts this structure
  affordable: boolean // The player can pay for it
  allowed: boolean // Both of the above
  reason: string | null // The first thing standing in the way, or null when nothing is
}

/**
 * Tests a placement against the board and the player's balance.
 * @param match - The match being played
 * @param kind - The generator being placed
 * @param position - The cell it would stand on
 * @returns What is and is not allowed, with the reason to print
 */
export function checkBuild(match: Match, kind: GeneratorKind, position: Position): BuildCheck {
  const stats = generatorStats(kind)
  const cell = match.grid.cellAt(position.x, position.y)
  const occupied = match.structureAt(position) !== undefined
  const onItsResource = cell !== undefined && cell.kind === 'resource' && cell.resources.includes(stats.resource)
  const placeable = onItsResource && !occupied
  const affordable = match.storedEnergy >= stats.cost

  return {
    placeable: placeable,
    affordable: affordable,
    allowed: placeable && affordable,
    reason: refusal(occupied, onItsResource, affordable, stats.name),
  }
}

/**
 * What the rail prints when a placement is blocked: the reason and nothing else.
 * @param occupied - Whether something already stands on the cell
 * @param onItsResource - Whether the cell carries the resource this generator needs
 * @param affordable - Whether the player can pay for it
 * @param name - The generator's name, which names the cell it needs
 * @returns The blocking reason, or null when nothing blocks
 */
function refusal(occupied: boolean, onItsResource: boolean, affordable: boolean, name: string): string | null {
  if (occupied) {
    return 'Already built here'
  }

  if (!onItsResource) {
    return `Needs a ${name.toLowerCase()} cell`
  }

  return affordable ? null : 'Not enough energy'
}

/**
 * What selling a generator returns. Whole units, because that is the resolution
 * the HUD reads at. The rate is one of docs/specs.md's open tuning items.
 * @param generator - The generator being sold
 * @returns Energy returned to the player
 */
export function refundFor(generator: Generator): number {
  return Math.floor(generator.cost * TUNABLES.economy.sellRefund)
}
