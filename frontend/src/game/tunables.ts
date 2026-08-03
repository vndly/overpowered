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

  board: {
    minimumCellSize: 44, // Floor from docs/ui.md § Geometry
    wellPadding: 24, // Clearance to the well's edge, so the board reads as set into the recess
    resourceMarkWidth: 0.22, // Fractions of the cell size
    resourceMarkGap: 0.06, // Separation when a cell carries more than one resource
    resourceMarkBaseline: 0.13, // Distance of the marks' baseline from the cell's lower edge
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

  hud: {
    // The pace track runs from 0 to this multiple of the required pace, which
    // parks the required mark at 80% and leaves overproduction somewhere to show
    paceTrackHeadroom: 1.25,
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
  },
} as const
