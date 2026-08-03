import type {ResourceKind} from '@/game/cell'
import type {Grid} from '@/game/grid'
import type {Match} from '@/game/match'
import type {BoardLayout, CellRect} from '@/game/render/board_layout'
import {TUNABLES} from '@/game/tunables'

/**
 * A stable value in [0, 1) for a cell, so a mass keeps the same silhouette
 * every frame and every match without any of it being stored.
 * @param x - Column
 * @param y - Row
 * @param salt - Distinguishes several values drawn for the same cell
 * @returns The generated value
 */
function noise(x: number, y: number, salt: number): number {
  const scaled = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453

  return scaled - Math.floor(scaled)
}

/**
 * Draws the board: terrain now, structures and cables from stage 2.
 * It reads the Match directly each frame — nothing reactive sits in the render
 * path — and works entirely in CSS pixels, the canvas transform having already
 * absorbed the device pixel ratio.
 *
 * Terrain is achromatic by design (docs/ui.md): a healthy grid is a monochrome
 * diagram, so every hue on screen is free to mean danger.
 */
export class BoardRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private readonly layout: BoardLayout

  constructor(ctx: CanvasRenderingContext2D, layout: BoardLayout) {
    this.ctx = ctx
    this.layout = layout
  }

  /**
   * Renders one frame.
   * @param match - The match to draw
   */
  draw(match: Match): void {
    this.clear()
    this.drawPlates(match.grid)
    this.drawGridLines()
    this.drawBoardEdge()
    this.drawWaterRules(match.grid)
    this.drawObstacles(match.grid)
    this.drawResourceMarks(match.grid)
  }

  /** Clears in device pixels, the one place the canvas transform is stepped around. */
  private clear(): void {
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.fillStyle = TUNABLES.colors.surfaceWell
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.ctx.restore()
  }

  /** Every cell is a faint recess in the well; water reads cool without a hue. */
  private drawPlates(grid: Grid): void {
    grid.forEachCell((cell, x, y) => {
      const rect = this.layout.cellRectAt(x, y)

      this.ctx.fillStyle = cell.kind === 'water' ? TUNABLES.colors.waterWash : TUNABLES.colors.cellPlate
      this.ctx.fillRect(rect.left, rect.top, rect.size, rect.size)
    })
  }

  private drawGridLines(): void {
    const cellSize = this.layout.cellSize
    const originX = this.layout.originX
    const originY = this.layout.originY

    this.ctx.strokeStyle = TUNABLES.colors.rule
    this.ctx.lineWidth = 1
    this.ctx.beginPath()

    for (let i = 0; i <= this.layout.columns; i++) {
      const lineX = originX + i * cellSize + 0.5

      this.ctx.moveTo(lineX, originY)
      this.ctx.lineTo(lineX, originY + this.layout.boardHeight)
    }

    for (let j = 0; j <= this.layout.rows; j++) {
      const lineY = originY + j * cellSize + 0.5

      this.ctx.moveTo(originX, lineY)
      this.ctx.lineTo(originX + this.layout.boardWidth, lineY)
    }

    this.ctx.stroke()
  }

  /** One step up from the grid, so the board reads as a machined plate. */
  private drawBoardEdge(): void {
    this.ctx.strokeStyle = TUNABLES.colors.boardEdge
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(
      this.layout.originX + 0.5,
      this.layout.originY + 0.5,
      this.layout.boardWidth,
      this.layout.boardHeight,
    )
  }

  private drawWaterRules(grid: Grid): void {
    this.ctx.strokeStyle = TUNABLES.colors.waterRule
    this.ctx.lineWidth = 1

    grid.forEachCell((cell, x, y) => {
      if (cell.kind === 'water') {
        this.drawWaveRule(this.layout.cellRectAt(x, y))
      }
    })
  }

  /** Two strokes, enough to say "water" without spending anything on colour. */
  private drawWaveRule(rect: CellRect): void {
    const amplitude = rect.size * TUNABLES.board.waterWaveAmplitude
    const inset = rect.size * TUNABLES.board.waterWaveInset
    const span = rect.size - inset * 2
    const segments = TUNABLES.board.waterWaveSegments

    for (let i = 0; i < 2; i++) {
      const baseY = rect.top + rect.size * (TUNABLES.board.waterWaveFirstBaseline + i * TUNABLES.board.waterWaveSpacing)

      this.ctx.beginPath()

      for (let j = 0; j <= segments; j++) {
        const fraction = j / segments
        const pointX = rect.left + inset + span * fraction
        const pointY = baseY + Math.sin(fraction * Math.PI * 2) * amplitude

        if (j === 0) {
          this.ctx.moveTo(pointX, pointY)
        } else {
          this.ctx.lineTo(pointX, pointY)
        }
      }

      this.ctx.stroke()
    }
  }

  private drawObstacles(grid: Grid): void {
    grid.forEachCell((cell, x, y) => {
      if (cell.kind === 'obstacle') {
        this.drawObstacleMass(this.layout.cellRectAt(x, y), x, y)
      }
    })
  }

  /**
   * A raised mass with a chipped outline, so it reads as rock to be removed
   * rather than as part of the board.
   * @param rect - The cell's square
   * @param x - Column, seeding this mass's silhouette
   * @param y - Row, seeding this mass's silhouette
   */
  private drawObstacleMass(rect: CellRect, x: number, y: number): void {
    const centerX = rect.left + rect.size / 2
    const centerY = rect.top + rect.size / 2
    const meanRadius = rect.size * TUNABLES.board.obstacleRadius
    const jitter = rect.size * TUNABLES.board.obstacleJitter
    const vertices = TUNABLES.board.obstacleVertices

    this.ctx.beginPath()

    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * Math.PI * 2 + noise(x, y, i) * TUNABLES.board.obstacleAngleJitter
      const radius = meanRadius + (noise(x, y, i + vertices) - 0.5) * 2 * jitter
      const pointX = centerX + Math.cos(angle) * radius
      const pointY = centerY + Math.sin(angle) * radius

      if (i === 0) {
        this.ctx.moveTo(pointX, pointY)
      } else {
        this.ctx.lineTo(pointX, pointY)
      }
    }

    this.ctx.closePath()
    this.ctx.fillStyle = TUNABLES.colors.obstacleFill
    this.ctx.fill()
    this.ctx.strokeStyle = TUNABLES.colors.obstacleEdge
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  /**
   * Resource marks are drawn in strokes and never filled. Structures own the
   * filled silhouettes — hexagon, rounded square, diamond, concentric rings —
   * so ground and structure can never be read for one another at any cell size.
   */
  private drawResourceMarks(grid: Grid): void {
    this.ctx.strokeStyle = TUNABLES.colors.resourceMark
    this.ctx.lineCap = 'round'

    grid.forEachCell((cell, x, y) => {
      if (cell.kind === 'resource') {
        this.drawResourceRow(cell.resources, this.layout.cellRectAt(x, y))
      }
    })

    this.ctx.lineCap = 'butt'
  }

  /**
   * Lays a cell's resource marks along its lower edge, where a structure placed
   * on top will never cover them. Stacking is native: two resources, two marks.
   * @param resources - Everything the cell carries
   * @param rect - The cell's square
   */
  private drawResourceRow(resources: readonly ResourceKind[], rect: CellRect): void {
    const markWidth = rect.size * TUNABLES.board.resourceMarkWidth
    const gap = rect.size * TUNABLES.board.resourceMarkGap
    const rowWidth = resources.length * markWidth + (resources.length - 1) * gap
    const baseline = rect.top + rect.size * (1 - TUNABLES.board.resourceMarkBaseline)
    let left = rect.left + (rect.size - rowWidth) / 2

    for (const resource of resources) {
      switch (resource) {
        case 'biomass':
          this.drawHatchMark(left, baseline, markWidth, TUNABLES.board.biomassHatchAngle)
          break
      }

      left += markWidth + gap
    }
  }

  /**
   * A hatched patch, the way a drawing has always said "this is a material".
   * Each resource takes its own angle, so a cell holding two of them reads as
   * two patches without either needing a picture of itself.
   * @param left - Left edge of the patch
   * @param baseline - Bottom edge of the patch
   * @param size - Patch edge length
   * @param angle - Hatch direction in radians
   */
  private drawHatchMark(left: number, baseline: number, size: number, angle: number): void {
    const lines = TUNABLES.board.resourceHatchLines
    const top = baseline - size
    const spacing = size / lines
    const runX = Math.cos(angle) * size * 2
    const runY = -Math.sin(angle) * size * 2

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(left, top, size, size)
    this.ctx.clip()

    this.ctx.lineWidth = Math.max(1, size * TUNABLES.board.resourceHatchWeight)
    this.ctx.beginPath()

    // Drawn wider than the patch and clipped back to it, so the hatch reaches
    // both corners whatever angle the resource takes
    for (let i = -lines + 1; i <= lines - 1; i++) {
      const startX = left + i * spacing

      this.ctx.moveTo(startX, baseline)
      this.ctx.lineTo(startX + runX, baseline + runY)
    }

    this.ctx.stroke()
    this.ctx.restore()
  }
}
