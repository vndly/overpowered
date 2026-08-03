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
 *
 * It refunds the build cost and nothing else, whatever the generator has been
 * upgraded to: levels are sunk the moment they are bought, so going tall is a
 * commitment rather than a place to park energy (docs/specs.md § Generators).
 * @param generator - The generator being sold
 * @returns Energy returned to the player
 */
export function refundFor(generator: Generator): number {
  return Math.floor(generator.cost * TUNABLES.economy.sellRefund)
}

/**
 * What the generator's next level costs: the build cost, multiplied once for
 * every level already bought. Whole units, at the resolution the HUD reads at.
 *
 * A generator at the cap has no next level, and this still prices one — callers
 * ask checkUpgrade, or the generator itself, before showing or charging it.
 * @param generator - The generator being upgraded
 * @returns Energy the upgrade costs
 */
export function upgradeCostFor(generator: Generator): number {
  const growth = TUNABLES.economy.upgradeCostGrowth ** (generator.level - 1)

  return Math.round(generator.cost * TUNABLES.economy.upgradeCostBase * growth)
}

/**
 * What the generator would make one level up: the other half of the upgrade
 * decision, since a price says nothing on its own about what it buys.
 * @param generator - The generator being upgraded
 * @returns Energy per minute at its next level
 */
export function upgradedOutputFor(generator: Generator): number {
  return generator.output * TUNABLES.economy.outputGrowth
}

/**
 * Whether a generator may be upgraded, and why not when it may not.
 * The shape mirrors BuildCheck: one flag per rule, so the rail can ink the price
 * by affordability while the cap speaks for itself.
 */
export interface UpgradeCheck {
  upgradeable: boolean // It has a level left to buy
  affordable: boolean // The player can pay for it
  allowed: boolean // Both of the above
  reason: string | null // The first thing standing in the way, or null when nothing is
}

/**
 * Tests an upgrade against the generator's cap and the player's balance.
 * @param match - The match being played
 * @param generator - The generator being upgraded
 * @returns What is and is not allowed, with the reason to print
 */
export function checkUpgrade(match: Match, generator: Generator): UpgradeCheck {
  const upgradeable = !generator.isMaxLevel
  const affordable = match.storedEnergy >= upgradeCostFor(generator)

  return {
    upgradeable: upgradeable,
    affordable: affordable,
    allowed: upgradeable && affordable,
    reason: upgradeRefusal(upgradeable, affordable),
  }
}

/**
 * What the rail prints when an upgrade is blocked.
 * @param upgradeable - Whether the generator has a level left to buy
 * @param affordable - Whether the player can pay for it
 * @returns The blocking reason, or null when nothing blocks
 */
function upgradeRefusal(upgradeable: boolean, affordable: boolean): string | null {
  if (!upgradeable) {
    return 'Already at the highest level'
  }

  return affordable ? null : 'Not enough energy'
}
