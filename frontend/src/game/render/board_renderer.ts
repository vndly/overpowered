import type {Position, ResourceKind} from '@/game/cell'
import {checkBuild} from '@/game/economy'
import type {Generator} from '@/game/generator'
import type {Grid} from '@/game/grid'
import type {Interaction} from '@/game/interaction'
import type {Match} from '@/game/match'
import type {NetworkLink} from '@/game/network'
import type {BoardLayout, CellRect} from '@/game/render/board_layout'
import {drawAccumulatorGlyph, drawGeneratorGlyph} from '@/game/render/glyphs'
import type {GlyphStyle} from '@/game/render/glyphs'
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
 * Draws the board: terrain, then what the player has built on it.
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
   * Renders one frame, ground up: terrain, then the cursor's mark on it, then
   * cables under the structures they serve, and the ghost over everything.
   * @param match - The match to draw
   * @param interaction - What the player is pointing at and holding
   */
  draw(match: Match, interaction: Interaction): void {
    this.clear()
    this.drawPlates(match.grid)
    this.drawGridLines()
    this.drawBoardEdge()
    this.drawWaterRules(match.grid)
    this.drawObstacles(match.grid)
    this.drawResourceMarks(match.grid)
    this.drawHover(interaction)
    this.drawCables(match.network.links)
    this.drawStructures(match)
    this.drawSelection(interaction)
    this.drawGhost(match, interaction)
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

  /**
   * The cell under the cursor. An armed tool draws its ghost there instead, so
   * the cursor never says the same thing twice.
   * @param interaction - What the player is pointing at and holding
   */
  private drawHover(interaction: Interaction): void {
    if (interaction.hovered === null || interaction.armed !== null) {
      return
    }

    const rect = this.layout.cellRectAt(interaction.hovered.x, interaction.hovered.y)
    const inset = TUNABLES.structure.hoverInset

    this.ctx.strokeStyle = TUNABLES.colors.hoverOutline
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(rect.left + inset, rect.top + inset, rect.size - inset * 2, rect.size - inset * 2)
  }

  /**
   * Cables, centre to centre. Every link on the board reaches the accumulator,
   * so all of them carry flow and none is idle — the ink-dim idle state waits
   * for the relays and towers that can sit on the network doing nothing.
   * @param links - The network's links
   */
  private drawCables(links: readonly NetworkLink[]): void {
    this.ctx.strokeStyle = TUNABLES.colors.cable
    this.ctx.lineWidth = this.hairline
    this.ctx.beginPath()

    for (const link of links) {
      const from = this.layout.cellCenterAt(link.from.x, link.from.y)
      const to = this.layout.cellCenterAt(link.to.x, link.to.y)

      this.ctx.moveTo(from.centerX, from.centerY)
      this.ctx.lineTo(to.centerX, to.centerY)
    }

    this.ctx.stroke()
  }

  /** The accumulator and everything built since. Nothing here says whether a generator is connected: its cable does. */
  private drawStructures(match: Match): void {
    const style = this.structureStyle()
    const accumulator = this.layout.cellCenterAt(match.accumulator.position.x, match.accumulator.position.y)

    drawAccumulatorGlyph(this.ctx, accumulator.centerX, accumulator.centerY, this.layout.cellSize, style)

    for (const generator of match.generators) {
      this.drawGenerator(generator, style)
    }
  }

  /**
   * One generator, on the cell it stands on.
   * @param generator - The generator to draw
   * @param style - How to ink it
   */
  private drawGenerator(generator: Generator, style: GlyphStyle): void {
    const center = this.layout.cellCenterAt(generator.position.x, generator.position.y)

    drawGeneratorGlyph(this.ctx, generator.kind, center.centerX, center.centerY, this.layout.cellSize, style)
  }

  /**
   * The selected structure, marked by four corner ticks. They sit at the cell's
   * corners, clear of the glyph, so selection never obscures what is selected.
   * @param interaction - What the player is pointing at and holding
   */
  private drawSelection(interaction: Interaction): void {
    if (interaction.selected === null) {
      return
    }

    const rect = this.layout.cellRectAt(interaction.selected.x, interaction.selected.y)
    const inset = rect.size * TUNABLES.structure.selectionInset
    const length = rect.size * TUNABLES.structure.selectionMarkLength
    const left = rect.left + inset
    const right = rect.left + rect.size - inset
    const top = rect.top + inset
    const bottom = rect.top + rect.size - inset

    this.ctx.strokeStyle = TUNABLES.colors.selectionMark
    this.ctx.lineWidth = this.hairline
    this.ctx.beginPath()

    this.traceCorner(left, top, length, 1, 1)
    this.traceCorner(right, top, length, -1, 1)
    this.traceCorner(left, bottom, length, 1, -1)
    this.traceCorner(right, bottom, length, -1, -1)

    this.ctx.stroke()
  }

  /**
   * One corner tick: two arms meeting at a right angle.
   * @param cornerX - Where the arms meet
   * @param cornerY - Where the arms meet
   * @param length - How far each arm runs
   * @param towardX - Which way the horizontal arm points, 1 or -1
   * @param towardY - Which way the vertical arm points, 1 or -1
   */
  private traceCorner(cornerX: number, cornerY: number, length: number, towardX: number, towardY: number): void {
    this.ctx.moveTo(cornerX + towardX * length, cornerY)
    this.ctx.lineTo(cornerX, cornerY)
    this.ctx.lineTo(cornerX, cornerY + towardY * length)
  }

  /**
   * The armed tool's ghost on the hovered cell, and the cables it would create.
   * A refused placement is drawn in the same red as the reason printed beside it
   * in the rail, so the cursor and the rail never disagree about whether the
   * click will work.
   * @param match - The match to test the placement against
   * @param interaction - What the player is pointing at and holding
   */
  private drawGhost(match: Match, interaction: Interaction): void {
    const armed = interaction.armed
    const hovered = interaction.hovered

    if (armed === null || hovered === null) {
      return
    }

    const check = checkBuild(match, armed, hovered)
    const center = this.layout.cellCenterAt(hovered.x, hovered.y)

    this.ctx.save()
    this.ctx.globalAlpha = TUNABLES.structure.ghostAlpha

    if (check.allowed) {
      this.drawGhostCables(match, hovered)
    }

    drawGeneratorGlyph(this.ctx, armed, center.centerX, center.centerY, this.layout.cellSize, this.ghostStyle(check.allowed))

    this.ctx.restore()
  }

  /**
   * How a ghost is inked. A legal one is the structure it will become, drawn
   * faintly; a refused one is a red wash rather than a plate, so it never reads
   * as something that is already standing there.
   * @param allowed - Whether the placement would succeed
   * @returns The style to draw the ghost in
   */
  private ghostStyle(allowed: boolean): GlyphStyle {
    if (allowed) {
      return {
        stroke: TUNABLES.colors.ghostLegal,
        fill: TUNABLES.colors.structureFill,
      }
    }

    return {
      stroke: TUNABLES.colors.ghostIllegal,
      fill: TUNABLES.colors.ghostIllegalFill,
    }
  }

  /**
   * The connection route a placement would open: a cable to every structure
   * already on the network within reach. Nothing is drawn when the cell reaches
   * none of them, which reads correctly — no cable means no network.
   * @param match - The match to test the placement against
   * @param position - The cell being hovered
   */
  private drawGhostCables(match: Match, position: Position): void {
    this.ctx.strokeStyle = TUNABLES.colors.cable
    this.ctx.lineWidth = this.hairline
    this.ctx.beginPath()

    const from = this.layout.cellCenterAt(position.x, position.y)

    for (const neighbour of match.networkNeighbours(position)) {
      const to = this.layout.cellCenterAt(neighbour.x, neighbour.y)

      this.ctx.moveTo(from.centerX, from.centerY)
      this.ctx.lineTo(to.centerX, to.centerY)
    }

    this.ctx.stroke()
  }

  /** The weight every line that is not a glyph is drawn at: cables, selection marks and the ghost's route. */
  private get hairline(): number {
    return Math.max(1, this.layout.cellSize * TUNABLES.structure.cableWeight)
  }

  /** Structures are filled and stroked at full strength, so they read in front of the stroked terrain. */
  private structureStyle(): GlyphStyle {
    return {
      stroke: TUNABLES.colors.structureStroke,
      fill: TUNABLES.colors.structureFill,
    }
  }
}
