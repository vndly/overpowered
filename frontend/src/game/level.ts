import type {Cell, Position} from '@/game/cell'

/**
 * An authored level: the board, the race it sets, and where the free
 * accumulator starts. Stage 7 adds unlocks and the environment preset; nothing
 * before then needs them.
 */
export interface Level {
  id: string
  name: string
  columns: number
  rows: number
  cells: readonly Cell[] // Row-major, columns * rows entries
  startingEnergy: number // Energy the player opens with, in energy units
  goal: number // Stored energy that wins the match
  durationSeconds: number // Time before the clock runs out and the match is lost
  accumulator: Position // The free accumulator, placed before the match starts
}

/**
 * Map symbols. A row string is read left to right, top row first.
 * `.` empty   `b` biomass   `~` water   `#` obstacle
 */
function cellFromSymbol(symbol: string): Cell {
  switch (symbol) {
    case '.':
      return {
        kind: 'empty',
      }
    case 'b':
      return {
        kind: 'resource',
        resources: ['biomass'],
      }
    case '~':
      return {
        kind: 'water',
      }
    case '#':
      return {
        kind: 'obstacle',
      }
    default:
      throw new Error(`Unknown map symbol: ${symbol}`)
  }
}

/**
 * Turns a hand-written map into row-major cells, failing loudly on a ragged map.
 * @param rows - One string per board row, all the same length
 * @returns The parsed cells
 */
function parseMap(rows: readonly string[]): Cell[] {
  const columns = rows[0]?.length ?? 0
  const cells: Cell[] = []

  for (const row of rows) {
    if (row.length !== columns) {
      throw new Error(`Ragged map: expected ${columns} columns, found ${row.length}`)
    }

    for (const symbol of row) {
      cells.push(cellFromSymbol(symbol))
    }
  }

  return cells
}

/**
 * The working level for stages 1-10: a full-size board on a compressed clock,
 * so a whole match fits inside one testing pass.
 *
 * Its shape is what stage 2 is tuned against. Reach is one orthogonal cell, so
 * the only biomass a player can ever light up is a run of cells joined edge to
 * edge back to the accumulator: seventeen of the twenty-five here, and only one
 * of them — (2,5) — is adjacent to the accumulator itself, so every match opens
 * on the same seed and grows from there.
 * A river of water splits the board top to bottom and nothing crosses it until
 * relays arrive, leaving the eastern eight in plain sight and out of play.
 */
const WORKING_LEVEL_MAP = [
  '..b...#~.b',
  '.bb....~.b',
  '..b.#..~..',
  '..bbb.~~bb',
  '..b.b.~..b',
  '..b.b.~...',
  '..b#bb~.#.',
  '..b#..~~.b',
  '#.bb...~..',
  '....b#.~.b',
]

/*
 * The race, derived rather than guessed. Biomass costs 10⚡ and delivers 16⚡/m,
 * so it pays for itself in 37.5s and reinvestment compounds: opening with six
 * generators and rebuilding the moment each 10⚡ lands fills all seventeen cells
 * by t≈41s and banks 357⚡ by the whistle. The goal is 84% of that, inside
 * docs/specs.md's 80-90% band, and idling on the opening six banks only 192⚡ —
 * a mathematical loss, which is what the band exists to guarantee.
 * Stage 12 re-measures this across the authored campaign.
 */
export const WORKING_LEVEL: Level = {
  id: 'working',
  name: 'Working level',
  columns: 10,
  rows: 10,
  cells: parseMap(WORKING_LEVEL_MAP),
  startingEnergy: 60,
  goal: 300,
  durationSeconds: 120,
  accumulator: {
    x: 1,
    y: 5,
  },
}
