/**
 * Every tunable constant in the game, grouped by system.
 * Balance and presentation are edited here and nowhere else, so tuning a match
 * is a one-file edit that hot-reloads into a running game. There is no debug
 * overlay and no speed control: the game is only ever experienced as a player
 * experiences it.
 */
export const TUNABLES = {
  loop: {
    fixedStepSeconds: 1 / 60, // One simulation step; the sim never sees any other delta
    maxCatchUpSeconds: 0.25, // Ceiling on one frame's backlog, so a backgrounded tab cannot spiral
  },

  frame: {
    minimumWidth: 1280, // Below this the frame scales down as a unit rather than reflowing
    minimumHeight: 720, // Only these two live here; the rest of the layout is CSS (see styles.css)
  },

  // docs/specs.md rates generators 1-5 rather than in energy. These two values
  // are what a rating point is worth, so the whole roster is derived from the
  // spec's own tables and one edit re-scales every generator at once.
  economy: {
    costUnit: 10, // Energy per point of a generator's cost rating
    outputUnit: 8, // Energy per minute per point of its output rating
    sellRefund: 0.5, // Fraction of the build cost returned on a sell
  },

  // Ratings straight from docs/specs.md § Types of generators, plus the cell the
  // generator needs. One entry arrives per generator stage.
  generators: {
    biomass: {
      name: 'Biomass', // Sentence case, as the rails print it
      cost: 1,
      output: 2,
      resource: 'biomass', // The resource its cell must carry
    },
  },

  network: {
    structureReach: 1, // Cells, orthogonal only. Relays are the only thing that reaches further (docs/specs.md § Connections)
  },

  board: {
    minimumCellSize: 44, // Floor from docs/ui.md § Geometry
    wellPadding: 24, // Clearance to the well's edge, so the board reads as set into the recess
    resourceMarkWidth: 0.17, // Fractions of the cell size
    resourceMarkGap: 0.06, // Separation when a cell carries more than one resource
    resourceMarkBaseline: 0.03, // Distance of the marks' baseline from the cell's lower edge. Low enough that a 0.60-wide glyph, which reaches 0.76 down the cell, never covers a mark
    biomassHatchAngle: Math.PI / 4, // One angle per resource, so a stacked cell reads as two patches
    resourceHatchLines: 3, // Strokes across the patch, which also sets their spacing
    resourceHatchWeight: 0.11, // Stroke width as a fraction of the patch
    waterWaveAmplitude: 0.05,
    waterWaveInset: 0.22,
    waterWaveSegments: 12, // Straight segments approximating one wave stroke
    waterWaveFirstBaseline: 0.42, // Height of the upper stroke within the cell
    waterWaveSpacing: 0.20, // Drop from the upper stroke to the lower one
    obstacleRadius: 0.36, // Mean radius of the chipped mass
    obstacleJitter: 0.06, // Per-vertex radial variation, making every mass distinct
    obstacleAngleJitter: 0.35, // Radians; stays below one vertex step so the outline cannot fold
    obstacleVertices: 8,
  },

  // Every value is a fraction of the cell size, so a glyph is the same drawing
  // at any board size. Silhouettes and diameters come from docs/ui.md § Structures.
  structure: {
    glyphRadius: 0.30, // Generator hexagon: 0.60 x cell across
    accumulatorOuterRadius: 0.34, // The largest glyph on the board
    accumulatorInnerRadius: 0.21,
    strokeWeight: 0.028, // Heavier than the 1px terrain rules, so structures read forward of the ground
    markRadius: 0.15, // The type mark inside the silhouette
    cableWeight: 0.022, // Constant at stage 2: weight encodes relay load, which arrives at stage 8
    hoverInset: 0.5, // Pixels, keeping the hover outline crisp on the cell boundary
    selectionMarkLength: 0.20, // Corner ticks, drawn outside the glyph so they never obscure it
    selectionInset: 0.08,
    ghostAlpha: 0.55,
  },

  hud: {
    clockWarningSeconds: 60, // The clock turns red inside this much of the deadline
    progressLowFraction: 1 / 3, // Below this the progress bar reads red
    progressHighFraction: 2 / 3, // At or above this it reads green; between them, yellow
  },

  motion: {
    hudTweenSeconds: 0.16, // docs/ui.md § Motion: simulation values tween, 120-200ms
  },

  // docs/ui.md § Colour is the source of truth. The tokens the DOM needs are
  // mirrored as CSS custom properties in src/assets/styles.css; these are the
  // canvas side, plus the terrain values derived from them.
  colors: {
    surfaceWell: '#080B10', // The board recess, and so the canvas ground
    rule: 'rgba(198, 210, 228, 0.08)', // Grid lines
    boardEdge: 'rgba(198, 210, 228, 0.16)', // The board's outer boundary, one step up from the grid
    cellPlate: '#0A0E14', // A cell at rest: a faint recess in the well
    waterWash: '#0C1219', // Desaturated and cool, carrying no hue of its own
    waterRule: 'rgba(124, 136, 153, 0.34)', // The two-stroke wave rule
    obstacleFill: '#141A22', // Shared with surface-raised: on this board, raised is one value
    obstacleEdge: 'rgba(198, 210, 228, 0.14)',
    resourceMark: '#4A5563', // ink-faint: inlaid in the ground, never competing with a structure
    structureFill: '#141A22', // surface-raised: the same value as an obstacle, which the full-strength stroke then lifts off
    structureStroke: '#C8D3E2', // ink
    cable: '#58C7DE', // energy: a cable exists only where flow reaches the accumulator, so it is never idle at stage 2
    hoverOutline: 'rgba(198, 210, 228, 0.22)',
    selectionMark: '#C8D3E2', // ink
    ghostLegal: '#C8D3E2', // ink, drawn at ghostAlpha
    ghostIllegal: '#4A5563', // ink-faint, matching the build rail row it greys out
  },
} as const
