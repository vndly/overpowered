import type {Position} from '@/game/cell'
import {TUNABLES} from '@/game/tunables'

/** A cell's square in canvas coordinates, in CSS pixels. */
export interface CellRect {
  left: number
  top: number
  size: number
}

/** A cell's midpoint, where a glyph is centred and a cable terminates. */
export interface CellCenter {
  centerX: number
  centerY: number
}

/**
 * Where the board sits inside the well, and how big each cell is.
 * The board always fits: there is no pan, no zoom and no scroll, because a
 * cascade is only readable if the whole board is on screen at once.
 */
export class BoardLayout {
  readonly columns: number
  readonly rows: number
  private size: number // Cell edge in CSS pixels
  private left: number // Board's left edge inside the well
  private top: number // Board's top edge inside the well

  constructor(columns: number, rows: number) {
    this.columns = columns
    this.rows = rows
    this.size = TUNABLES.board.minimumCellSize
    this.left = 0
    this.top = 0
  }

  /**
   * Recomputes cell size and centring for a well of the given size.
   * @param wellWidth - The well's width in CSS pixels
   * @param wellHeight - The well's height in CSS pixels
   */
  fit(wellWidth: number, wellHeight: number): void {
    const span = Math.max(this.columns, this.rows)
    const available = Math.min(wellWidth, wellHeight) - TUNABLES.board.wellPadding * 2

    this.size = Math.max(TUNABLES.board.minimumCellSize, Math.floor(available / span))
    this.left = Math.round((wellWidth - this.boardWidth) / 2)
    this.top = Math.round((wellHeight - this.boardHeight) / 2)
  }

  get cellSize(): number {
    return this.size
  }

  get originX(): number {
    return this.left
  }

  get originY(): number {
    return this.top
  }

  get boardWidth(): number {
    return this.size * this.columns
  }

  get boardHeight(): number {
    return this.size * this.rows
  }

  /**
   * The canvas square a cell occupies.
   * @param x - Column, from 0
   * @param y - Row, from 0
   * @returns The cell's rectangle in CSS pixels
   */
  cellRectAt(x: number, y: number): CellRect {
    return {
      left: this.left + x * this.size,
      top: this.top + y * this.size,
      size: this.size,
    }
  }

  /**
   * The centre of a cell, where a glyph is drawn and where a cable terminates.
   * @param x - Column, from 0
   * @param y - Row, from 0
   * @returns The centre point in CSS pixels
   */
  cellCenterAt(x: number, y: number): CellCenter {
    return {
      centerX: this.left + (x + 0.5) * this.size,
      centerY: this.top + (y + 0.5) * this.size,
    }
  }

  /**
   * The cell under a point on the canvas.
   * @param pointX - Distance from the canvas's left edge, in CSS pixels
   * @param pointY - Distance from the canvas's top edge, in CSS pixels
   * @returns The cell address, or undefined if the point misses the board
   */
  positionAt(pointX: number, pointY: number): Position | undefined {
    const x = Math.floor((pointX - this.left) / this.size)
    const y = Math.floor((pointY - this.top) / this.size)

    if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) {
      return undefined
    }

    return {
      x: x,
      y: y,
    }
  }
}
