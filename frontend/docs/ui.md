# UI

The visual language and interaction model. `docs/specs.md` says what the UI must
communicate; this says what it looks like and how it behaves. Written before
stage 1 because `docs/plan.md` makes stage 1 commit palette, type, grid rendering
and HUD layout for all thirteen stages.

## The signature

> **A healthy grid is achromatic. Every hue on screen is a warning.**

Terrain, structures, glyphs and idle cables are drawn entirely in cool greys.
Colour enters only where the simulation is producing something — cyan where
energy is flowing, amber and red where something is dying. A board at 20% heat
is a monochrome diagram; a board in cascade is the only time the screen is loud.
That is the one memorable thing, and everything else stays quiet to protect it.

## Fixed points

Inherited, not open to redesign:

- Desktop, mouse-first (`specs.md` § Scope).
- Readable systems: pressure comes from difficult choices, not hidden
  information (`specs.md` § Design Pillars).
- Micro must be doable under fire: 1-2 click actions, hotkeys, high-readability
  alarms (`specs.md` § UI).
- Canvas for the board, DOM for HUD and menus (`specs.md` § Tech).
- No illustration assets: no sprites, no textures, no icon files. Everything on
  the board is drawn from primitives at runtime. The one binary shipped is a
  single variable font.

---

# Theme

The board is a live engineering diagram, not an illustration of a power plant.
Hairline strokes, geometric glyphs, tabular numerals, a recessed board well set
into a cold graphite ground.

This choice is load-bearing rather than decorative. Heat is the central variable
of the game and it needs to own the warm end of the spectrum by itself, which
forces the base palette to stay neutral. A schematic is the visual language that
wants a neutral base anyway, and it has native room for the readouts, rings and
route overlays the spec demands.

---

# Geometry

- Minimum viewport 1280x720. Below that the frame does not reflow; it scales
  down as a unit.
- The board **fits**: no pan, no zoom, no scroll. Cascades are only readable if
  the whole board is on screen at once.
- Layout is three fixed zones plus the board well. Nothing ever overlaps the
  board.

```
+--------------------------------------------------------------+
|  HUD STRIP                                            76px    |
+--------+--------------------------------------------+--------+
|        |                                            |        |
| BUILD  |               BOARD WELL                   |INSPECT |
| RAIL   |            square, centred, fits           | RAIL   |
| 248px  |                                            | 248px  |
|        |                                            |        |
+--------+--------------------------------------------+--------+
```

- Cell size = `floor(min(wellWidth, wellHeight) / max(cols, rows))`, floor 44px.
  A 10x10 level on 1080p gives ~80px cells; a 16x16 gives ~50px.
- Glyph diameter `0.60 x cell`. State ring radius `0.39 x cell`. Level pips sit
  in the bottom `0.14 x cell` band.
- Corner radius 2px on panels, 3px on controls. Near-square: this is an
  instrument, not a card layout.

---

# Colour

Every token is either neutral or reserved for a simulation state. There are no
decorative colours and no per-type identity colours.

| Token            | Value                    | Owns                                   |
| ---------------- | ------------------------ | -------------------------------------- |
| `surface-well`   | `#080B10`                | the board recess                       |
| `surface-base`   | `#0D1117`                | page ground                            |
| `surface-raised` | `#141A22`                | HUD strip, both rails                  |
| `rule`           | `rgba(198,210,228,0.08)` | grid lines, panel dividers             |
| `ink`            | `#C8D3E2`                | structure strokes, primary text        |
| `ink-dim`        | `#7C8899`                | idle cables, secondary text            |
| `ink-faint`      | `#4A5563`                | illegal palette entries, locked rows   |
| `energy`         | `#58C7DE`                | flowing cables, energy numerals        |
| `state-0` … `4`  | see ramp below           | heat, relay load, starvation           |
| `tint-danger`    | `rgba(223,65,58,0.12)`   | cell wash above the critical threshold |

**The state ramp** — one ramp, three meanings (see § The escalation ladder):

| Stop | Value     | Reads as      |
| ---- | --------- | ------------- |
| 0.00 | `#7C8899` | no colour     |
| 0.40 | `#A9B6C6` | noticed       |
| 0.70 | `#D8A63F` | warning       |
| 0.85 | `#E0752B` | critical      |
| 1.00 | `#DF413A` | about to fail |

Two rules that must not erode:

- **Red is reserved.** `#DF413A` appears only at the top of the state ramp.
  No error text, no sell button, no destructive-action styling may use it.
- **Warm hues are reserved.** Nothing that is not heat, load or starvation may
  be amber or orange, anywhere, including menus.

---

# Typography

One family: **IBM Plex Sans Variable** (OFL, ~50kb woff2, real tabular lining
figures, weight axis 100-700). Engineered rather than neutral, which suits the
instrument reading; alternates if it needs swapping are Archivo or Geist.

`font-variant-numeric: tabular-nums` is set globally. Without it the energy
counter and timer shift horizontally several times a second for twelve minutes.

| Role         | Size | Weight | Notes               |
| ------------ | ---: | -----: | ------------------- |
| `hud-value`  | 30px |    600 | tabular, `-0.01em`  |
| `hud-label`  | 11px |    500 | uppercase, `0.10em` |
| `rail-title` | 13px |    600 | sentence case       |
| `readout`    | 14px |    500 | tabular             |
| `body`       | 12px |    400 | line-height 1.5     |
| `caption`    | 11px |    400 | `ink-dim`           |

**Copy.** Field labels are uppercase abbreviations: `STORED`, `GOAL`, `PACE`,
`TIME`. Structure names are sentence case: "Ventilation fan". Actions are verbs
naming their outcome — Build, Sell, Upgrade, Vent, Shut down, Restart — and keep
the same word everywhere they appear. Blocked states state the reason and
nothing else: "Needs a coal cell", "Not enough energy", "Out of reach". No
flavour text anywhere.

---

# The board

## Terrain

Achromatic, so it costs nothing from the state palette. Every cell is a faint
recess in the ground plane.

| Cell     | Treatment                                                         |
| -------- | ----------------------------------------------------------------- |
| Empty    | bare recess                                                       |
| Resource | one inlaid mark per resource present, along the cell's lower edge |
| Water    | desaturated cool wash plus a two-stroke wave rule                 |
| Obstacle | solid raised mass with a chipped outline, reading as removable    |

Resource marks sit low in the cell so a placed structure never covers them, and
stacking is native: coal + water is simply two marks. Obstacle masses are valued
to recede behind live structures.

## Structures

The outer silhouette names the family and never varies. Everything inside names
the type.

| Family        | Silhouette                                         |
| ------------- | -------------------------------------------------- |
| Generator     | flat-top hexagon                                   |
| Cooling tower | rounded square                                     |
| Relay         | diamond                                            |
| Accumulator   | double concentric ring, largest glyph on the board |

For generators the hexagon's **corner treatment encodes stability**, so the
`specs.md` category matrix is legible before the player knows the type — and the
knowledge transfers across all three tiers.

| Corner    | Stability   | Generators                      |
| --------- | ----------- | ------------------------------- |
| Rounded   | high stable | Wind, Geothermal, Hydroelectric |
| Chamfered | normal      | Solar, Oil, Coal                |
| Sharp     | low stable  | Biomass, Gas, Nuclear           |

Sharp corners belong to exactly the three generators that will kill you.

| Structure          | Inner mark                     |
| ------------------ | ------------------------------ |
| Solar              | rays radiating from a point    |
| Wind               | three blades from a hub        |
| Biomass            | sprout: stem with two leaves   |
| Oil                | droplet                        |
| Geothermal         | two rising chevrons            |
| Gas                | single asymmetric flame tongue |
| Coal               | filled lozenge                 |
| Hydroelectric      | two stacked waves              |
| Nuclear            | trefoil                        |
| Ventilation fan    | three-blade fan                |
| Heat sink          | three parallel fins            |
| Radiator array     | 2x3 fin grid                   |
| Cryogenic cooler   | six-point asterisk             |
| Basic relay        | 1 pip on the diamond's waist   |
| Intermediate relay | 2 pips                         |
| Advanced relay     | 3 pips                         |

**Level** is a row of 3px ticks below the glyph, up to five; beyond five they
stack into a second row. No numerals appear on a cell at any size.

## Cables

- Drawn centre to centre as straight hairlines, diagonals included. The line
  drawn is the logical link — there is no routing or detouring.
- **Idle or unrouted:** `ink-dim` at low opacity. **Carrying flow:** `energy`.
- **Stroke weight scales with the energy on that segment**, 1.0px to 4.0px
  device-independent, mapped against the segment's capacity. Relay load becomes
  spatially readable without selecting anything, and a reroute is visible as
  flow thickening on the survivor.
- **A structure with no line is not on the network.** That is the whole
  disconnection signal; nothing else is needed.

## The escalation ladder

The board is calm when the grid is healthy. One ladder covers every way the grid
can kill you, so it is learned once at stage 4 and costs nothing to teach again
at stages 8 and 9.

| Band        | Ring                            | Colour          | Cell                        | Audio                   |
| ----------- | ------------------------------- | --------------- | --------------------------- | ----------------------- |
| `< 0.40`    | not drawn                       | —               | —                           | —                       |
| `0.40-0.70` | arc, opacity ramps in 0.40-0.48 | `state-0` → `1` | —                           | —                       |
| `0.70-0.85` | arc + warning pip               | `state-2`       | —                           | warning SFX on crossing |
| `>= 0.85`   | arc + warning pip               | `state-3` → `4` | `tint-danger` + 900ms pulse | alarm SFX on crossing   |

What the ring measures, per family:

| Structure     | Ring value                    | Stage |
| ------------- | ----------------------------- | ----- |
| Generator     | temperature / max temperature | 4     |
| Relay         | load / max capacity           | 8     |
| Cooling tower | energy available to it        | 9     |

The arc's **sweep angle is proportional across the whole range**, so the value
is never encoded in colour alone. Thresholds live in `tunables.ts`.

---

# The frame

## HUD strip

Left to right: `STORED` (large, tabular, `energy`-coloured), `GOAL`, `PACE`, and
`TIME`. Pace shows actual against required as two marks on one short track, so
"am I falling behind" is a glance, not arithmetic. The day/night forecast strip
(stage 6) occupies the right end, scrolling right to left with now at the left
edge.

## Build rail (left)

One row per buildable structure: glyph, name, cost. Rows are ordered by unlock.

- Unaffordable: cost in `state-2`, row otherwise normal.
- **Illegal on the hovered cell:** the whole row drops to `ink-faint`. This is
  how the resource matrix is taught — by pointing, not by memorising. It costs
  no tutorial and no extra screen.

## Inspect rail (right)

Strict precedence, highest first:

1. **Armed tool** — the placement preview for the hovered cell.
2. **Hovered cell** — what is there and its live numbers.
3. **Selected structure** — its readouts and its actions.

Selection persists while nothing is armed or hovered. There are no floating
tooltips or popovers anywhere in the game.

## The placement preview

`specs.md` requires five things at placement time. They split by kind, because
nothing may overlap the board:

**Drawn on the board** (ghost layer): the ghost glyph in its legal or illegal
state, the connection route to the accumulator, the relay reach ring, the
cooling radius, and an outline on every neighbour that will gain heat.

**Rendered in the rail** (numeric): cost and resulting balance, delivered output
after hop loss, heat penalty percentage, cooling received, and relay load after
placement.

---

# Interaction

**Armed tool, stays armed.** Click a build row or press its number to arm it. A
ghost follows the cursor showing legality and the full preview; clicking places;
the tool stays armed, so a relay chain is click-click-click. Esc or right-click
disarms.

Clicking a structure with nothing armed selects it. Clicking empty ground with
nothing armed clears the selection.

**Hotkeys ship with the action they trigger** (`plan.md`), so this table fills
in over the stages rather than landing at once.

| Key         | Action                       | Stage |
| ----------- | ---------------------------- | ----- |
| `1-9`       | arm build slot               | 2     |
| `Esc`       | disarm, else clear selection | 2     |
| Right-click | disarm                       | 2     |
| `Space`     | pause (look-only)            | 1     |
| `R`         | restart (confirms)           | 1     |
| `S`         | sell selected                | 2     |
| `U`         | upgrade selected             | 3     |
| `D`         | demolish selected obstacle   | 3     |
| `O`         | toggle selected on/off       | 5     |
| `V`         | vent selected                | 5     |

---

# Motion

**One rule: if it renders a simulation value, it is tweened from stage 1. If it
is decoration, it waits for stage 13.**

| Tweened from stage 1  | Deferred to stage 13     |
| --------------------- | ------------------------ |
| ring sweep and colour | explosion bursts         |
| cable weight          | build flourishes         |
| danger tint and pulse | flow dashes along cables |
| HUD numerals          | screen shake             |
| forecast strip scroll | screen transitions       |

Escalation only communicates if it can be seen rising, and a cascade is only
readable if flow can be watched moving onto the survivor. A ring that snaps from
39% to 41% is not escalation.

> **This amends `plan.md`.** Its cross-cutting rule reads "Effects, animation and
> non-alarm audio batch into stage 13"; stage 13's remit is narrowed here to
> _effects and decoration_.

Tweens are short — 120-200ms, ease-out — except the critical pulse at 900ms.

---

# Non-match screens

Main menu and level select (stage 7) use the same ground, type and rail widths;
the board well simply holds content instead of a board. Level select is a single
vertical list, because campaign unlocks are linear and there is no branching to
draw. Locked rows sit at `ink-faint` with their unlock condition as the caption.
No progress bars, no medals, no percentages — `specs.md` rules out grading.

---

# Accessibility

- Every state encoded in colour is also encoded in geometry: ring sweep angle,
  warning pip presence, cable existence and weight. No mechanic is
  colour-only, so no separate colourblind mode is needed.
- `prefers-reduced-motion` drops tween durations to zero and disables the
  critical pulse, keeping the final rendered values. The escalation ladder still
  reads, statically.
- Visible keyboard focus on every rail control. Text meets 4.5:1 against its
  surface.
- Pause is look-only and always available, which is itself the accessibility
  affordance for reaction speed.

---

# What each stage adds

| Stage | UI introduced                                                                                                    |
| ----: | ---------------------------------------------------------------------------------------------------------------- |
|     1 | frame and three zones, tokens, font, terrain, HUD (stored/goal/pace/time), tween utility, pause and end overlays |
|     2 | build rail, armed tool and ghost, cables, inspect rail, preview lines 1-2, sell                                  |
|     3 | level pips, upgrade and demolish actions                                                                         |
|     4 | escalation ladder (first use), heat ring, danger tint, warning pip, heat-penalty preview line, audio harness     |
|     5 | off / transitioning states, vent action and its cost readout                                                     |
|     6 | forecast strip, Solar and Wind glyphs                                                                            |
|     7 | main menu, level select, locked rows                                                                             |
|     8 | relay glyphs, reach ring, route ghost, load ring, cable weight, load-after-placement line                        |
|     9 | tower glyphs, radius ring, cooling-received line, starvation ring                                                |
| 10-11 | six remaining generator glyphs                                                                                   |
|    12 | nothing new                                                                                                      |
|    13 | effects, transitions, settings screen                                                                            |

---

# Decisions this rests on

1. Technical schematic, because heat must own the warm end of the spectrum alone.
2. Cells are calm at rest and escalate — a quiet board means a healthy grid.
3. Identity is shape, never colour: family silhouette plus type mark, with
   generator corners carrying the stability matrix.
4. A fixed three-zone frame; nothing ever overlaps the board.
5. Cold graphite ground with one ice accent; red and the warm ramp are reserved.
6. Armed tool that stays armed, with palette dimming teaching legality.
7. One bundled variable font with tabular figures, rather than a system stack
   that would look accidental on two platforms out of three.
8. Achromatic terrain, so the strategic map costs nothing from the state palette.
9. Straight chords with weight encoding flow, so cascades are visible.
10. Simulation values tween from stage 1; only decoration waits for stage 13.
11. One danger ladder shared by heat, relay load and starvation.
