/**
 * What a single board cell is made of.
 * Terrain only: structures are tracked by the match, never by the cell they
 * stand on, so a generator exploding leaves its cell exactly as it was.
 */

/** A resource a cell can carry. One member per generator stage. */
export type ResourceKind = 'biomass'

/** Buildable ground, and the only cell an ambient generator or a relay accepts. */
export interface EmptyCell {
  kind: 'empty'
}

/** Reserved for its matching generator. It carries a list, because one cell can hold coal and water at once. */
export interface ResourceCell {
  kind: 'resource'
  resources: readonly ResourceKind[]
}

/** Hydroelectric only, and it never blocks a connection. */
export interface WaterCell {
  kind: 'water'
}

/** Nothing builds here until it is demolished, and it blocks connections until then. */
export interface ObstacleCell {
  kind: 'obstacle'
}

/** A cell, discriminated on `kind`. */
export type Cell = EmptyCell | ResourceCell | WaterCell | ObstacleCell

/** A cell address on the board. */
export interface Position {
  x: number
  y: number
}
