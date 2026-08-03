import type {GeneratorKind} from '@/game/generator'
import {TUNABLES} from '@/game/tunables'

/**
 * How a glyph is inked. The board draws structures at full strength and ghosts
 * at less; the rails reuse the same drawings with their own values.
 */
export interface GlyphStyle {
  stroke: string
  fill: string | null // null leaves the terrain showing through, which is what a ghost wants
}

/**
 * The structure glyphs, drawn from primitives at runtime — the build ships no
 * illustration assets at all (docs/ui.md § Fixed points).
 *
 * The outer silhouette names the family and never varies; everything inside
 * names the type. Shared by the board and the rails, so the drawing a player
 * learns in the build rail is the same one they then look for on the board.
 *
 * Every dimension is a fraction of the cell size, so one function serves an
 * 80px board cell and a 34px rail swatch.
 */

/**
 * A generator: flat-top hexagon with its type mark inside.
 * docs/ui.md § Structures gives the hexagon's corners the spec's stability
 * category. Biomass is low stable, so its corners are sharp; the chamfered and
 * rounded treatments arrive with the generators that carry them at stage 6.
 * @param ctx - The context to draw into
 * @param kind - The generator type, which chooses the inner mark
 * @param centerX - Glyph centre
 * @param centerY - Glyph centre
 * @param cellSize - The cell edge the glyph is scaled against
 * @param style - How to ink it
 */
export function drawGeneratorGlyph(
  ctx: CanvasRenderingContext2D,
  kind: GeneratorKind,
  centerX: number,
  centerY: number,
  cellSize: number,
  style: GlyphStyle,
): void {
  const radius = cellSize * TUNABLES.structure.glyphRadius

  ctx.lineWidth = strokeWidth(cellSize)
  ctx.lineJoin = 'miter'
  ctx.beginPath()

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const pointX = centerX + Math.cos(angle) * radius
    const pointY = centerY + Math.sin(angle) * radius

    if (i === 0) {
      ctx.moveTo(pointX, pointY)
    } else {
      ctx.lineTo(pointX, pointY)
    }
  }

  ctx.closePath()
  inkPath(ctx, style)

  switch (kind) {
    case 'biomass':
      drawSprout(ctx, centerX, centerY, cellSize, style.stroke)
      break
  }
}

/**
 * The accumulator: a double concentric ring, and the largest glyph on the board.
 * @param ctx - The context to draw into
 * @param centerX - Glyph centre
 * @param centerY - Glyph centre
 * @param cellSize - The cell edge the glyph is scaled against
 * @param style - How to ink it
 */
export function drawAccumulatorGlyph(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cellSize: number,
  style: GlyphStyle,
): void {
  const outerRadius = cellSize * TUNABLES.structure.accumulatorOuterRadius
  const innerRadius = cellSize * TUNABLES.structure.accumulatorInnerRadius

  ctx.lineWidth = strokeWidth(cellSize)

  ctx.beginPath()
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
  inkPath(ctx, style)

  ctx.beginPath()
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * A structure's level: one tick per level, in a row along the bottom of the
 * silhouette. The row is never empty, because a structure is level 1 the moment
 * it is built, and it is never numerals — nothing on a cell is ever read.
 *
 * It sits inside the glyph rather than under it: the bottom of the cell belongs
 * to the resource marks, which are drawn low precisely so a structure never
 * covers them (docs/ui.md § Geometry).
 * @param ctx - The context to draw into
 * @param centerX - Glyph centre
 * @param centerY - Glyph centre
 * @param cellSize - The cell edge the row is scaled against
 * @param level - The structure's level, from 1
 * @param stroke - The ink to draw it in
 */
export function drawLevelPips(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cellSize: number,
  level: number,
  stroke: string,
): void {
  const weight = Math.max(1, cellSize * TUNABLES.structure.levelPipWeight)
  const height = cellSize * TUNABLES.structure.levelPipHeight
  const gap = cellSize * TUNABLES.structure.levelPipGap
  const baseline = centerY + cellSize * TUNABLES.structure.levelPipOffset
  const step = weight + gap
  let pipX = centerX - (level - 1) * step / 2

  ctx.strokeStyle = stroke
  ctx.lineWidth = weight
  ctx.beginPath()

  for (let i = 0; i < level; i++) {
    ctx.moveTo(pipX, baseline - height / 2)
    ctx.lineTo(pipX, baseline + height / 2)
    pipX += step
  }

  ctx.stroke()
}

/**
 * Biomass's mark: a stem with two leaves. Each leaf is one curve closing against
 * the stem, so the whole thing is three strokes and survives a 44px cell.
 * @param ctx - The context to draw into
 * @param centerX - Mark centre
 * @param centerY - Mark centre
 * @param cellSize - The cell edge the mark is scaled against
 * @param stroke - The ink to draw it in
 */
function drawSprout(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cellSize: number,
  stroke: string,
): void {
  const radius = cellSize * TUNABLES.structure.markRadius

  ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth(cellSize)
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(centerX, centerY + radius)
  ctx.lineTo(centerX, centerY - radius)
  traceLeaf(ctx, centerX, centerY, radius, -1)
  traceLeaf(ctx, centerX, centerY, radius, 1)
  ctx.stroke()

  ctx.lineCap = 'butt'
}

/**
 * One leaf: a single curve leaving the stem and closing against it higher up,
 * so the stem itself is the leaf's other edge.
 * @param ctx - The context holding the path
 * @param centerX - Mark centre
 * @param centerY - Mark centre
 * @param radius - Half the mark's height
 * @param side - -1 for the left leaf, 1 for the right
 */
function traceLeaf(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  side: number,
): void {
  ctx.moveTo(centerX, centerY + radius * 0.35)
  ctx.quadraticCurveTo(
    centerX + side * radius * 1.1,
    centerY - radius * 0.35,
    centerX,
    centerY - radius * 0.6,
  )
}

/**
 * Fills a silhouette if it has a fill, then strokes it.
 * @param ctx - The context holding the path
 * @param style - How to ink it
 */
function inkPath(ctx: CanvasRenderingContext2D, style: GlyphStyle): void {
  if (style.fill !== null) {
    ctx.fillStyle = style.fill
    ctx.fill()
  }

  ctx.strokeStyle = style.stroke
  ctx.stroke()
}

/**
 * A structure's stroke weight. It scales with the cell so a glyph keeps its
 * proportions, with a floor so it never thins below the terrain rules it has to
 * read in front of.
 * @param cellSize - The cell edge the glyph is scaled against
 * @returns The line width in CSS pixels
 */
function strokeWidth(cellSize: number): number {
  return Math.max(1.25, cellSize * TUNABLES.structure.strokeWeight)
}
