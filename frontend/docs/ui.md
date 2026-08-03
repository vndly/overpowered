# UI

The visual language and interaction model. `docs/specs.md` says what the UI must
communicate; this says what it looks like and how it behaves. Written before
stage 1 because `docs/plan.md` makes stage 1 commit palette, type, grid rendering
and HUD layout for all thirteen stages.

## The signature

> **A healthy board is achromatic. Every hue on the board is a warning.**

The signature is scoped to the board, which is where it earns its keep: a
cascade is only legible if colour appearing among the cells means danger and
nothing else. The HUD strip is an instrument panel rather than terrain, and it
is allowed hue to render the race verdict — see § HUD strip. Nothing in that
concession reaches the board.

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
  the board is drawn from primitives at runtime. The build ships no binary asset
  at all.
- Every font comes from Google Fonts, served by its CDN (`CLAUDE.md` § Rules).

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
| `pace-ahead`     | `#43C07A`                | pace readout and progress bar, ahead — HUD only |
| `pace-behind`    | = `state-4`              | pace readout and progress bar, behind — HUD only |
| `hud-energy`     | `#F2C044`                | energy numerals and the mid progress band — HUD only |

`pace-ahead` is the only green in the game and the only hue that means good
news. It is held well clear of `energy` in hue so that "ahead" never reads as
merely more cyan, and it is barred from the board.

`hud-energy` is the yellow the HUD gives to energy numerals — `STORED`, `GOAL`,
and the same values on the end overlays. **`energy` cyan is unchanged and still
owns flowing cables**, so the board stays free of warm hue and heat keeps the
warm end of the spectrum to itself where it matters.

**The state ramp** — one ramp, three meanings (see § The escalation ladder):

| Stop | Value     | Reads as      |
| ---- | --------- | ------------- |
| 0.00 | `#7C8899` | no colour     |
| 0.40 | `#A9B6C6` | noticed       |
| 0.70 | `#D8A63F` | warning       |
| 0.85 | `#E0752B` | critical      |
| 1.00 | `#DF413A` | about to fail |

Two rules that must not erode:

- **Red is reserved.** `#DF413A` appears only at the top of the state ramp and
  in the two HUD readouts named below. No error text, no sell button, no
  destructive-action styling may use it, and nothing on the board may.
- **The two admitted uses**, both on the HUD strip and both meaning *you are
  losing this match*: the clock inside its final minute, and the pace readout
  while behind.

  **The cost is real and was accepted deliberately.** Levels are tuned to demand
  80-90% of practical max output (`specs.md`), so a player is behind for much of
  a normal match and the pace readout will sit red for much of it too. That is
  exactly the pressure the readout exists to convey, but it does spend some of
  red's alarm value before stage 4 needs it for overheating. If red stops reading
  as "act now" once heat ships, the first thing to try is returning the pace
  readout to neutral while behind and keeping only the green surplus.
- **Warm hues are reserved on the board.** Nothing that is not heat, load or
  starvation may be amber or orange on a cell, ever. The HUD strip and the
  overlays are exempt: they use `hud-energy` for energy numerals and the warm
  end of the progress bar. This is the narrowing that makes the rule survive —
  it protects the surface where warm hue has to mean heat, and gives up the
  surface where it never had to.

---

# Typography

One family: **IBM Plex Sans Variable** (OFL, real tabular lining figures, weight
axis 100-700). Engineered rather than neutral, which suits the instrument
reading; alternates if it needs swapping are Archivo or Inter — both, like Plex,
served as true variable fonts by Google Fonts.

**Sourcing.** Every font comes from Google Fonts, served by its CDN. No font
file lives in the repo and no font package is added to `package.json`. The
family is requested once from `index.html`, with `display=block` so numerals
never render in a fallback metric and reflow the HUD mid-match:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100..700&display=block" rel="stylesheet">
```

Choosing a replacement family therefore means choosing from the Google Fonts
catalogue, and the axis range must be confirmed against the CDN before it is
written into the type scale.

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

**A resource mark is a hatched patch**, the way a drawing has always said "this
is a material", with one hatch angle per resource. That keeps the terrain
vocabulary generative — a ninth resource is a ninth angle, not a ninth picture —
and it separates cleanly from the structures below, because:

> **Terrain is stroked. Structures own the fills and the silhouettes.**

No hatch can ever be misread as a hexagon, a rounded square, a diamond or a ring
at any cell size, which a small filled resource glyph could.

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

- Drawn centre to centre as straight hairlines. Connections are orthogonal only,
  so every cable is a horizontal or vertical run and a diagonal never appears on
  the board. The line drawn is the logical link — there is no routing or
  detouring.
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

**Centred**, matching the board beneath it. The pause control sits at the right
end; the strip is otherwise readouts only.

Left to right: `STORED` (large, tabular, `energy`-coloured), `GOAL`, `PACE`,
`TIME`.

Both numerals are `hud-energy` yellow.

**Stored and goal share a progress bar** running beneath both. They are one
question — how far along am I — so they are one group, and the bar answers it
without arithmetic. It is banded in thirds, so the colour alone gives the
answer:

| Filled      | Colour        |
| ----------- | ------------- |
| under 1/3   | `pace-behind` |
| 1/3 to 2/3  | `hud-energy`  |
| 2/3 and up  | `pace-ahead`  |

Note that this makes the bar red at the opening of every match, since every
match starts at zero. The bar reports position, not danger.

**Pace is a signed whole number**, not a track: the surplus or shortfall against
what the clock demands, e.g. `+10/m`, `-2/m`. It is truncated toward zero rather
than floored, so a shortfall of half a unit is never reported as a whole one.

- **Required** = `(goal - stored) / remainingMinutes`, in ⚡/m. It rises as the
  match runs, which is the pressure made visible.
- **Actual** = live net rate, income minus consumption, in ⚡/m — not an average.
  It must fall the instant a generator dies, because reading a cascade early is
  the entire point of the readout; a rolling window would hide the first seconds
  of one. The HUD tween supplies the smoothing instead.
- **Shown value** = `actual - required`. The sign is the whole reading, so it is
  always written, and the number answers "by how much" second.
- **The sign is colour-coded**: `pace-ahead` above zero, `pace-behind` below it.
  Exactly on pace stays neutral, so the colour only appears when there is a side
  to be on. Colour and numeral are both derived from the same truncated value,
  so a surplus too small to print can never still be printed green.

**The clock turns `state-4` inside its final minute** — and goes neutral again
once the match is over, because red warns that you are about to fail, not that
you did.

Both of these spend reserved colour; § Colour records what that costs and what
to unwind first if it stops paying.

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
state, the connection route to the accumulator, the relay reach cross, the
cooling radius, and an outline on every neighbour that will gain heat.

**Rendered in the rail** (numeric): cost and resulting balance, delivered output
after hop loss, heat penalty percentage, cooling received, and relay load after
placement.

---

# Interaction

**Armed tool, stays armed.** Click a build row or press its number to arm it. A
ghost follows the cursor showing legality and the full preview; clicking places;
the tool stays armed, so a relay chain is click-click-click. Right-click
disarms.

Clicking a structure with nothing armed selects it. Clicking empty ground with
nothing armed clears the selection.

**`Esc` backs out of whatever is in front of the player**, in this order: a
question being asked (the restart confirmation), then an armed tool, then a
selection, and only then the match itself. That makes it the pause key at stage
1, and it keeps that meaning at stage 2 — disarming simply sits ahead of pause in
the same chain. One key, one idea, no retrofit.

**Hotkeys ship with the action they trigger** (`plan.md`), so this table fills
in over the stages rather than landing at once.

| Key         | Action                       | Stage |
| ----------- | ---------------------------- | ----- |
| `1-9`       | arm build slot               | 2     |
| `Esc`       | pause (look-only)            | 1     |
| `R`         | restart (confirms)           | 1     |
| Right-click | disarm                       | 2     |
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
|                       | screen transitions       |

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
|     1 | frame and three zones, tokens, font, terrain, HUD (stored/goal + progress bar, pace, clock), tween utility, pause and end overlays |
|     2 | build rail, armed tool and ghost, cables, inspect rail, preview lines 1-2, sell                                  |
|     3 | level pips, upgrade and demolish actions                                                                         |
|     4 | escalation ladder (first use), heat ring, danger tint, warning pip, heat-penalty preview line, audio harness     |
|     5 | off / transitioning states, vent action and its cost readout                                                     |
|     6 | Solar and Wind glyphs                                                                                            |
|     7 | main menu, level select, locked rows                                                                             |
|     8 | relay glyphs, reach cross, route ghost, load ring, cable weight, load-after-placement line                       |
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
9. Straight orthogonal runs with weight encoding flow, so cascades are visible.
10. Simulation values tween from stage 1; only decoration waits for stage 13.
11. One danger ladder shared by heat, relay load and starvation.
