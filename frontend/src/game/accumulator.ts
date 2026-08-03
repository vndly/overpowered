import type {Position} from '@/game/cell'

/**
 * The collector every generator must reach for its output to count.
 * One is placed free before the match starts, and it is the root the network is
 * traced from. Stage 8 makes more of them buildable, which is when a second root
 * starts shortening relay chains.
 */
export class Accumulator {
  readonly position: Position // The cell it stands on

  constructor(position: Position) {
    this.position = position
  }
}
