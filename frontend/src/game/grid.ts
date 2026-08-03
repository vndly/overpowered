import type {Cell} from '@/game/cell'

/**
 * The board's cells, addressed by column and row.
 * This is the only place in the game that bounds-checks a cell address: every
 * out-of-range read returns undefined here, so no caller downstream ever needs
 * a non-null assertion to satisfy noUncheckedIndexedAccess.
 */
export class Grid {
  readonly columns: number // Cells across
  readonly rows: number // Cells down
  private readonly cells: readonly Cell[] // Row-major, columns * rows entries

  constructor(columns: number, rows: number, cells: readonly Cell[]) {
    this.columns = columns
    this.rows = rows
    this.cells = cells
  }

  /**
   * Reads the cell at a board address.
   * @param x - Column, from 0
   * @param y - Row, from 0
   * @returns The cell, or undefined if the address is off the board
   */
  cellAt(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) {
      return undefined
    }

    return this.cells[y * this.columns + x]
  }

  /**
   * Visits every cell in row-major order.
   * @param visit - Called once per cell with the cell and its address
   */
  forEachCell(visit: (cell: Cell, x: number, y: number) => void): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const cell = this.cellAt(x, y)

        if (cell !== undefined) {
          visit(cell, x, y)
        }
      }
    }
  }
}
