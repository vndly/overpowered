import type {Position} from '@/game/cell'
import type {Generator} from '@/game/generator'
import type {Grid} from '@/game/grid'
import {TUNABLES} from '@/game/tunables'

/** One logical link between two structures. Always a horizontal or vertical run. */
export interface NetworkLink {
  from: Position
  to: Position
}

/**
 * What is on the network, and the cables that say so.
 * A generator not in `connected` contributes nothing and is drawn with no cable,
 * which docs/ui.md makes the whole disconnection signal.
 */
export interface Network {
  connected: ReadonlySet<Generator>
  links: readonly NetworkLink[]
  deliveredOutput: number // Energy per minute reaching the accumulator
}

/** Orthogonal only: a diagonal neighbour is never connected, at any distance. */
const DIRECTIONS: readonly Position[] = [
  {
    x: 1,
    y: 0,
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: 0,
    y: -1,
  },
]

/**
 * Every cell a structure at `from` can reach, stepping outward along its row and
 * its column. An obstacle stops the ray, so everything behind it is out of
 * reach; water never does (docs/specs.md § Grid).
 *
 * At reach 1 an obstacle can only ever be the stopped cell itself, which could
 * not have held a structure anyway — obstacle blocking earns its keep when
 * relays reach further at stage 8.
 * @param grid - The board
 * @param from - Where the structure stands
 * @param reach - How many cells it reaches along each direction
 * @returns The reachable cells, nearest first within each direction
 */
export function cellsInReach(grid: Grid, from: Position, reach: number): Position[] {
  const found: Position[] = []

  for (const direction of DIRECTIONS) {
    for (let step = 1; step <= reach; step++) {
      const x = from.x + direction.x * step
      const y = from.y + direction.y * step
      const cell = grid.cellAt(x, y)

      if (cell === undefined || cell.kind === 'obstacle') {
        break
      }

      found.push({
        x: x,
        y: y,
      })
    }
  }

  return found
}

/**
 * Traces the network outward from the accumulator.
 * Connectivity chains: a generator in reach of a connected generator is itself
 * connected, and chained links carry no loss. Anything the trace never arrives
 * at is off the network however many generators it touches.
 * @param grid - The board
 * @param root - The accumulator's cell
 * @param generatorAt - Looks up the generator standing on a cell, if any
 * @returns The connected set, the cables to draw, and the delivered output
 */
export function traceNetwork(
  grid: Grid,
  root: Position,
  generatorAt: (position: Position) => Generator | undefined,
): Network {
  const connected = new Set<Generator>()
  const members: Position[] = [root]
  let cursor = 0

  while (cursor < members.length) {
    const from = members[cursor]
    cursor++

    if (from === undefined) {
      continue
    }

    for (const to of cellsInReach(grid, from, TUNABLES.network.structureReach)) {
      const generator = generatorAt(to)

      if (generator === undefined || connected.has(generator)) {
        continue
      }

      connected.add(generator)
      members.push(to)
    }
  }

  return {
    connected: connected,
    links: linksBetween(grid, members),
    deliveredOutput: totalOutput(connected),
  }
}

/**
 * Every link among the structures on the network, not just the ones the trace
 * arrived through: two adjacent connected structures can transmit between them,
 * so a cable belongs there (docs/specs.md § Connections).
 *
 * Each pair is found from both of its ends, so only the run heading right or
 * down is kept and every cable is emitted exactly once.
 * @param grid - The board
 * @param members - Every cell on the network, the accumulator included
 * @returns The cables to draw
 */
function linksBetween(grid: Grid, members: readonly Position[]): NetworkLink[] {
  const memberCells = new Set<number>()
  const links: NetworkLink[] = []

  for (const member of members) {
    memberCells.add(member.y * grid.columns + member.x)
  }

  for (const from of members) {
    for (const to of cellsInReach(grid, from, TUNABLES.network.structureReach)) {
      if (to.x < from.x || to.y < from.y) {
        continue
      }

      if (memberCells.has(to.y * grid.columns + to.x)) {
        links.push({
          from: from,
          to: to,
        })
      }
    }
  }

  return links
}

/**
 * What the network delivers. There is no hop loss to apply until relays arrive
 * at stage 8: a chain transmits everything it carries.
 * @param connected - The generators on the network
 * @returns Energy per minute reaching the accumulator
 */
function totalOutput(connected: ReadonlySet<Generator>): number {
  let total = 0

  for (const generator of connected) {
    total += generator.output
  }

  return total
}
