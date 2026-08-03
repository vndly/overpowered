import type {Position} from '@/game/cell'
import type {GeneratorKind} from '@/game/generator'

/**
 * What the player is pointing at and holding. It belongs to neither side of the
 * sim/render boundary: the simulation must never know about it, and both the
 * board and the rails have to read it.
 *
 * It is replaced rather than mutated, so a shallowRef can carry it to the rails
 * while the renderer still reads a plain object with no proxy in the way.
 */
export interface Interaction {
  armed: GeneratorKind | null // The build tool in hand. It stays armed after placing.
  hovered: Position | null // The cell under the cursor
  selected: Position | null // The structure being inspected. It outranks the hover in the rail, so it holds still while the cursor crosses the board
}

/** Nothing armed, nothing pointed at, nothing selected. */
export function idleInteraction(): Interaction {
  return {
    armed: null,
    hovered: null,
    selected: null,
  }
}
