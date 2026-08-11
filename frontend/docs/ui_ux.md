# OVERPOWERED — UI/UX Specification

## Purpose

This document defines the **UI/UX, visual language, layout, interaction patterns, and implementation rules** for the OVERPOWERED prototype.

It is intended for an AI coding agent implementing the interface.

This document is **not** a gameplay, economy, balance, or simulation specification. The UI should consume game-state values provided by the application and present them clearly without owning gameplay logic.

---

## Reference Mockup

`docs/mockup.png` is a rendered prototype mockup of the interface.

**It is a reference, not a target.** It is an image made to communicate the intended feel, not a screenshot of a correct implementation, and it is not pixel-authoritative. Take from it what makes sense; where it and this document disagree, **this document wins**, and where this document is silent but `docs/specs.md` is not, `docs/specs.md` wins.

What the mockup gets right and should be followed:

- the overall composition — header, one-row production chain, four-panel lower dashboard
- the seven cards in one row with arrows between them — though they now all take the same width, rather than the mockup's narrower storage cards (see [General Layout](#5-general-layout))
- the internal card order: title, icon, divider, values, controls, divider, upgrades
- the inline `[-] value [+]` stepper, the outlined buttons, the horizontal `SAFE`/`MAX` stress gauge
- the primitive instrumentation look of the net-flow graph
- black background, thin borders, and a palette held to the minimum — though the mockup's single green is now split by [Color System](#4-color-system)

Known places where it diverges and should **not** be copied:

- Silo and Tank fill bars carry no strain marks. They are required — see [Strain markers](#strain-markers).
- Machine cards show a third parameter row (`COOLING`, `REGULATION`, `STABILITY`). No such parameter exists; machines have `Capacity` and `Efficiency` only.
- `CLEAN TO` is missing and the penalty is folded into the stress row. Follow [Machine Cards](#12-machine-cards).
- There is no wear gauge or trip countdown. Follow `docs/specs.md`.
- The `RESERVES` panel offers a reserve stepper and a manual/auto mode. `MinimumReserve` is derived, not player-set.
- Letterforms are inconsistently cased (`StoreD`, `CAPAcity`, `SETTIng`) and the outer frame is slightly rounded. Both are artifacts of how the image was produced. Casing follows [Typography Rules](#3-typography-rules); corners are square everywhere.

Treat anything else in the mockup that contradicts a rule below the same way: the rule is the specification, the mockup is a sketch of it.

---

# 1. Visual Direction

OVERPOWERED should look like an **old industrial power-plant operator interface** displayed on a monochrome CRT terminal.

The target visual language is:

- black background
- phosphor white foreground, with green kept for the readings ([Color System](#4-color-system))
- monochrome presentation
- IBM PC / DOS terminal influence
- old industrial operator console / SCADA influence
- flat 2D vector graphics
- thin rectangular borders
- simple engineering-style diagrams
- dense but readable numerical information
- minimal decoration
- no modern dashboard styling

The interface should feel like **real control-room software from an older industrial system**, not like a modern game HUD.

Avoid:

- gradients
- glassmorphism
- rounded cards
- drop shadows
- glossy controls
- 3D UI
- modern SaaS styling
- cyberpunk neon effects
- excessive animation
- decorative particles
- unnecessary color

---

# 2. Typography — Mandatory

## Font

Use a **Code Page 437 / IBM PC VGA bitmap font**.

The visual target is the classic IBM PC DOS / VGA text appearance.

**Mandatory font requirement:**

> Use a Code Page 437 (CP437) IBM PC/VGA-style bitmap font for all UI text.

A suitable implementation is:

- **PxPlus IBM VGA8**
- or another faithful IBM VGA / CP437 bitmap-font recreation

If multiple weights are unavailable, use the same bitmap font everywhere and create hierarchy through:

- font size
- uppercase text
- spacing
- borders
- inverted foreground/background states

Do **not** replace it with a generic modern monospace font unless CP437 is unavailable.

Recommended fallback stack:

```css
font-family:
  "PxPlus IBM VGA8",
  "IBM VGA",
  "Perfect DOS VGA 437",
  monospace;
```

Where possible, render the bitmap font without smoothing:

```css
-webkit-font-smoothing: none;
font-smooth: never;
```

The interface should preserve the visibly pixelated edges of the font.

Type sizes are multiples of the 16px cell. Whole multiples are strictly crisp, and the
two-cell size the title, the clock and the header's settings control take is the one
step up the interface uses. The run overlay's target and time limit are the single
exception at one and a half cells: two cells swamped a panel read on its own, and 1.5
is the one fraction that still lands a pair of rows on a whole number of character
lines. Nothing else takes a fractional size.

---

# 3. Typography Rules

Use uppercase for:

- component names
- section headings
- major status labels
- navigation
- alerts

Examples:

```text
OVERPOWERED
STOCKPILE
PULVERIZER
BOILER
BATTERY
POWER SUMMARY
NET FLOW
ALERTS
UPGRADES
```

Normal labels may use title case or sentence case if readability benefits.

Numeric values must use the same CP437 monospaced font.

Prefer fixed-width numeric formatting so changing values do not cause the layout to jump.

Example:

```text
CAPACITY      50.0 MW
EFFICIENCY     0.70
SETTING        0.80
OUTPUT         31.9 MW
```

Avoid unnecessary decimal precision.

What shipped: readings carry two decimals below ten and one at or above it, so a column
holds its width as a value grows. The run's target is the exception and is quoted as a
whole number of MWh — `docs/specs.md` fixes it at one, and it is the only figure on
screen that is neither measured nor changing.

---

# 4. Color System

The UI should be essentially monochrome.

Recommended design tokens:

```css
:root {
  --ui-bg: #000000;
  --ui-green: #39ff14;
  --ui-green-dim: rgba(57, 255, 20, 0.55);
  --ui-green-faint: rgba(57, 255, 20, 0.25);
  --ui-green-disabled: rgba(57, 255, 20, 0.30);
}
```

Primary use:

```text
Background         black
Primary text       bright green
Borders            bright green
Icons              bright green
Secondary text     dim green
Grid lines         faint green
Disabled controls  dim/faint green
```

Do not introduce additional colors for normal operation.

What shipped: the same two-value monochrome, with the two values split by role rather than by brightness. The console — every border, rule, title, label, button, arrow, grid line and axis scale — is phosphor white. Green is kept for what the plant is actually reading: **values and their units, the bars that draw them, and the clocks**. Nothing that merely labels, frames, or explains a reading takes it.

```css
:root {
  --bg: #000000;
  --fg: #e8e8e8;                          /* the console */
  --fg-dim: rgba(232, 232, 232, 0.55);
  --fg-faint: rgba(232, 232, 232, 0.25);
  --fg-disabled: rgba(232, 232, 232, 0.30);

  --data: #39ff14;                        /* the readout */
  --data-dim: rgba(57, 255, 20, 0.55);
}
```

This is still one accent on black for everything the plant runs on, and the split is the one an instrument panel makes between its printed legend and its lit readout — so the rules below hold unchanged: no color-coded state, no heat map, and warnings still carry rank by inversion, blinking, symbols and words. The alerts panel is the one thing outside the two values, and it is set out below. Where any other section of this document names green for something the list above does not cover — a border, an arrow, a grid line, an icon — read it as the console color. This section is the authority on which of the two anything takes.

Yellow is reserved for a later pass on values and indicators, and is not in the interface yet. Red is in, in one place: the alerts panel writes every alert in it ([§20](#20-alerts-panel)). Nothing else on the screen may take it, so red on this interface means one thing — the plant is interrupting.

```css
:root {
  --alert: #ff5555;                       /* an alert on the console's black */
  --alert-inverted: #aa0000;              /* the same words on an inverted line */
}
```

Both are the CP437 palette's own reds, the palette the interface font comes out of, and there are two because an urgent alert blinks between black and white and one red cannot stay legible on both.

Warnings should preferably use:

- blinking text
- inverted colors
- symbols
- stronger brightness
- labels such as WARNING or LOW

instead of red/yellow.

---

# 5. General Layout

Primary target:

```text
16:9 widescreen
1920 × 1080 reference resolution
```

The interface should fill the application window.

Main structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ PRODUCTION CHAIN                                             │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ POWER SUMMARY │ NET FLOW │ RESERVES │ ALERTS                │
├──────────────────────────────────────────────────────────────┤
│ OPTIONAL BOTTOM NAVIGATION                                   │
└──────────────────────────────────────────────────────────────┘
```

The production chain is the primary visual focus.

Use a consistent grid.

Avoid large decorative empty areas except where needed to maintain alignment.

---

# 6. Header

The header spans the full width.

Required elements:

```text
OVERPOWERED
TIME
STORED ENERGY
TARGET PROGRESS BAR
SETTINGS
```

Reference layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ OVERPOWERED       TIME 07:12   STORED 12.4 / 40 MWh      [☼] │
│                                █████░░░░░░░░░░               │
└──────────────────────────────────────────────────────────────┘
```

Design rules:

- title aligned left
- timer and stored-energy readout grouped together at the center
- timer set at two character cells, as the title is: the countdown is the run's
  headline number, and a bitmap face only stays crisp at whole multiples of its cell
- horizontal progress bar next to or below stored-energy value
- settings control aligned right, drawn as CP437's `☼` — the face has no gear glyph,
  and §9's decision against new image assets covers icons too
- the settings control is the one thing in the header a run overlay leaves reachable,
  so the display can be changed before the first run as well as during one
- no decorative logo required
- keep header height compact
- information should be readable at a glance

---

# 7. Production Chain

Display the main process horizontally:

```text
[STOCKPILE]
     →
[PULVERIZER]
     →
[SILO]
     →
[BOILER]
     →
[TANK]
     →
[TURBINE]
     →
[BATTERY]
```

Use simple green arrows between cards.

All cards should align vertically and use the same border style.

Storage cards may be narrower than machine cards, but the overall row should feel balanced.

What shipped: one width for all seven, 28 character cells (242px with padding and border). 28 is the widest that holds — machine cards need 21 cells at their busiest, so the two cells they give up cost nothing, and the storage cards gain four.

The arrow column between them takes the width the cards cannot. A card grows only in whole cells, and at 29 cells seven of them overflow the 1920px reference, so the row would always have ended short of the screen. Four cells of arrow closes it instead: `7 × 242 + 6 × 32 = 1886px` against the 1888px that reference leaves once the screen's own padding is taken. Every gap stays a whole multiple of the character cell, which is what keeps each card's left edge — and so the bitmap text inside it — on a whole pixel.

Two things follow from this and have to move with it. The lower dashboard's three panels are sized to end on the chain's edge (`components/game/secondary_dashboard.vue`). And the fit is now exact to 2px, so anything that eats horizontal room at 1920 — a vertical scrollbar, a zoom step — puts the chain into the scroll §26 asks for rather than overflowing the screen.

Each card consists of:

```text
TITLE
VECTOR ICON
DIVIDER
PRIMARY VALUES
CONTROLS / STATUS
DIVIDER
UPGRADES / SECONDARY CONTROLS
```

---

# 8. Card Style

Cards should use:

```css
background: #000;
border: 1px solid var(--ui-green);
border-radius: 0;
```

Do not use rounded corners.

Internal separators can use:

```text
solid thin line
or
dashed green line
```

The rule closing the head of a card — the one under the equipment drawing — carries a blank line beneath it, so the first reading is not read as sitting on the rule. It is the only rule that does, and it is set once in `components/terminal/section_divider.vue` rather than per card: the seven cards stand side by side, and their heads have to come to the same height or their readings stop lining up across the chain (§25).

The upgrade section at the foot of a card is the exception: a blank line opens it, not a rule of its own. Its title carries the rule instead — centred on its line with a hairline running out to either edge, drawn by `components/terminal/section_label.vue`. It comes to two character cells: the title's own line, with half a cell of air above and below so the break reads as a break rather than as one more row. The title is turned down a step so it reads as quieter than the readings above it. A separate rule as well would crowd a card this compact.

Inside that section each upgrade is a value row naming what it buys, and a button carrying only the price:

```text
───── UPGRADES ─────
CAPACITY     +0.50 t
[    0.02 MWh      ]
```

A quarter-cell of air stands between every row of the section, so a price is read off the label above it rather than butting straight against it. Where a card offers two upgrades, the second opens on a blank line: run together, the four rows read as one list of prices rather than as two things to choose between.

The gain is right-aligned into the same numeric column as every other reading on the card, and neither figure is a constant — a capacity upgrade multiplies capacity, so its gain grows with each level bought, and an efficiency upgrade closes a share of the remaining gap, so its gain shrinks. Both are read live from the view model. Name and gain will not fit beside the price on a storage card, which is why the price stands alone.

Recommended card padding:

```text
12–20 px
```

Recommended spacing between cards:

```text
12–20 px
```

Card title:

- centered
- uppercase
- slightly larger than body text

---

# 9. Equipment Graphics

The seven equipment illustrations ship as **PNG line drawings**, one per component, in `src/assets/icons/`. They are the artwork the game was designed around, so they are used as drawn rather than re-cut as SVG. This section originally required vector assets; that requirement is dropped for these seven, and still holds for anything else drawn later.

What the raster form costs, and how each cost is paid:

- **They cannot follow `currentColor`.** The drawings are green on transparent, and green now belongs to the readings ([Color System](#4-color-system)) — a drawing is not one. The card recolours them with a filter rather than re-cutting the art: `brightness(0) invert(1) brightness(var(--fg-level))` flattens the strokes and brings them back up to `--fg`, and the alpha channel keeps the silhouette, so one copy of each drawing serves every state.
- **They cannot be scaled up.** Each drawing is 56–190 px wide, and the icon band is six character cells (96 px) tall so every one renders at or near its native size. Do not enlarge them.

One component, `components/game/equipment_icon.vue`, picks the drawing for a component id; there is no component per icon.

Required visual assets:

- stockpile / coal conveyor
- pulverizer
- silo
- boiler
- tank
- turbine
- battery
- arrows
- small navigation icons
- optional warning symbols

The arrows are text glyphs, not assets. Any vector drawn later follows these rules:

```css
fill: none;
stroke: currentColor;
stroke-width: 1.5px;
stroke-linecap: square;
stroke-linejoin: round;
```

The artwork should resemble simplified:

- engineering diagrams
- control-panel symbols
- technical line drawings

Avoid:

- photorealism
- shading
- 3D perspective
- gradients
- detailed textures

Icons should remain understandable at relatively small sizes.

Use `currentColor` so any SVG inherits the colour of what it sits in — the console colour unless it is drawing a reading ([Color System](#4-color-system)).

---

# 10. Storage Cards

Storage cards include:

```text
STOCKPILE
SILO
TANK
BATTERY
```

Generic layout:

```text
┌──────────────────────┐
│        TITLE         │
│                      │
│      [SVG ICON]      │
│                      │
├──────────────────────┤
│ STORED  0.7 / 1.0 t  │
│ ██████████████░░░░░░ │
│                      │
│ additional values    │
│                      │
│                      │
│       UPGRADES       │
│ CAPACITY     +0.5 t  │
│ [    0.02 MWh      ] │
└──────────────────────┘
```

The fill bar is 20 characters wide, so one character is 5% of `Capacity`, and it carries no percentage beside it — the `STORED` row above already gives the exact figure, and 5% is as fine as a reading anyone takes off a bar. Twenty is also what puts both strain marks on an exact character: `StarveThreshold` at 30% is the sixth, `BacklogThreshold` at 70% the fourteenth.

What shipped: twenty on the Silo, the Tank and the Battery, and the card's full 28 characters on the Stockpile, where one character is 1/28 of `Capacity`. A bar that stops short of the card it is drawn in reads as a bar that is not full, and the Stockpile is the one storage card with no strain marks to keep on exact characters. Any bar that carries marks stays at twenty.

## Strain markers

The Silo and Tank fill bars carry tick marks for the points at which a neighbouring machine begins to wear:

```text
SILO                          TANK
STORED  0.7 / 1.0 t           STORED  1.4 / 3.0 t
██████████████░░░░░░          █████████░░░░░░░░░░
              ╷                     ╵       ╷
              ╷backlog               ╵starve ╷backlog
```

- Silo: one mark at `BacklogThreshold`. Above it the Pulverizer heats.
- Tank: two marks, at `StarveThreshold` and `BacklogThreshold`. Below the first the Turbine vibrates; above the second the Boiler strains.
- Stockpile and Battery carry no marks — neither has a strain rule.

The marks sit on their own line beneath the bar, with a dim legend line under that naming them: printed inline a mark overwrites a fill character, which is the one thing the bar exists to show. Keep the marks in the same green as the bar outline and thinner than the fill blocks. They are a scale, not an alarm; the alarm is the machine card's stress gauge. Without them the player watches a machine start to wear with nothing on screen explaining why, so they are required, not decorative.

---

# 11. Stockpile Card

Recommended structure:

```text
STOCKPILE

[coal/conveyor SVG]

STORED      0.7 / 1.0 t
███████████████████░░░░░░░░░

PRICE       1.0 MWh/t

[-]          0.5 t          [+]

[         BUY: 0.5 MWh         ]

UPGRADES
CAPACITY                 +0.5 t
[          0.02 MWh           ]
```

`Capacity` is the Stockpile's only upgrade: `docs/specs.md` states that the coal price cannot be upgraded, because it is set by the market.

Interaction controls should remain rectangular.

The numeric amount stepper should use clearly separated minus and plus buttons.

---

# 12. Machine Cards

Machine cards:

```text
PULVERIZER
BOILER
TURBINE
```

These cards display more information than storage cards.

Generic layout:

```text
TITLE

[SVG ICON]

CAPACITY
EFFICIENCY

SETTING       [-] 0.80 [+]

--------------------------------

STRESS TYPE
[STRESS GAUGE]

STRESS        62%
CLEAN TO      0.69

WEAR   ███░░░░░░░  31%
       TRIPS IN 12S

OUTPUT        value

UPGRADES
```

`CAPACITY` and `EFFICIENCY` are the only upgradable rows. There is no control row: wear headroom is bought as Silo and Tank capacity on the storage cards, not on the machine.

This layout originally carried a `PENALTY` row. `docs/specs.md` levies no output penalty for running above the rating — "pushing past the rating is not penalised in output, it damages the machine" — so the row is dropped and the wear bar carries the whole cost of overdriving.

What shipped:

```text
TITLE

[SVG ICON]
--------------------------------
CAPACITY            8.00 kg/s

OUTPUT             16.00 kg/s

SETTING       [-] 0.80 [+]
--------------------------------
TEMPERATURE
████████████|░░░░░░░░░░░░░░░

WEAR
████████░░░░░░░░░░░░░░░░░░░░

           UPGRADES
```

What changed from the layout above it, and nothing else moves:

- Every reading opens on a blank line, the spacing [§8](#8-card-style) gives a card's sections and the Stockpile gives its `PRICE`. Run together they read as a table of figures rather than as separate answers.
- `OUTPUT` sits under `CAPACITY` rather than at the foot of the card: what the machine is doing is read against what it is rated for, and the pair above the `SETTING` is what the player steps the `SETTING` to change.
- The `EFFICIENCY` reading is dropped. It is a coefficient the player never sets and cannot read a decision off — what it buys is on the card already, in the `OUTPUT` it produces from the same `CAPACITY` and in the gain quoted beside its upgrade.
- The card carries two bars and no numbers off them. The `STRESS` row under the gauge is dropped — the gauge already draws where the machine is running between `SafeStress` and `MaxStress`, and a figure beside it is the same fact twice, in a unit the player never sets anything in.
- `CLEAN TO` goes with it. The gauge's `SAFE` marker is that ceiling drawn instead of written: the fill left of the marker accrues no wear, and the marker holds still while the fill moves under strain, which is the drift the row existed to show. What the player does about either is the same — bring the `SETTING` down, or take the wear.
- The wear bar sits under its label rather than beside it, and spans the card's 28 characters like the Stockpile's does — one character is 1/28 of a trip on all three machines. The percentage beside it is dropped: the bar is the reading, and no other bar in the interface carries a number of its own. The figure stays in the accessibility tree, because the bar itself is a drawing (`role="img"`).
- The note beneath the bar is dropped with it. It read `TRIPS IN {n}S` while wear was growing, `CLEARS IN {n}S` while it was shedding, `CLEAN` at zero and `HOLDING` at neither: a countdown that changed its wording four ways under a bar that was already moving. What it answered — how long can this Setting be held — is what the bar and its rate of travel show.

A tripped machine replaces its `OUTPUT` row with `REPAIR {n}S`, inverted, inside a card whose border fills in to a solid green frame. State is never signalled by brightness alone (§28), and a trip is the loudest thing that happens to a machine, so it is the one place a card inverts.

`CLEAN TO` is the highest `SETTING` that accrues no wear right now. It is not a constant — it falls as the store beside the machine moves toward its strain threshold, so it can come down to meet a `SETTING` the player never touched. Render it as a live value and let it move.

It shipped that way and was then dropped, as above. The rule it named is still on the card: a machine wears whenever its fill is right of the gauge's `SAFE` marker, and a strained store pushes the fill right without the `SETTING` moving. The player reads the ceiling off the gauge and finds it by stepping, rather than being quoted a number to two decimals.

Use the component-specific stress names:

```text
PULVERIZER → TEMPERATURE
BOILER     → PRESSURE
TURBINE    → VIBRATION
```

`TEMP` shipped as `TEMPERATURE`: it is the name of a reading, the card has the width for it, and the other two are not abbreviated.

---

# 13. Machine Setting Control

Machine setting uses a simple stepper:

```text
SETTING      [-] 0.80 [+]
```

UX requirements:

- minus and plus controls must be obvious, and are square: a one-glyph label is given the button's own height as its width, so the two keys read as a pair of keys rather than as two narrow buttons
- value remains visible at all times, with two character cells of air on either side of it so the figure stands clear of the two keys moving it
- controls should respond immediately
- button press may briefly invert colors
- optionally support click-and-hold
- keyboard interaction is encouraged

Do not use a modern rounded slider unless explicitly requested.

The control should look like an old terminal control, not a mobile UI widget.

---

# 14. Stress Gauge

Use a compact horizontal gauge.

Example:

```text
TEMPERATURE

SAFE                      MAX
██████████████|██████░░░░░░░
```

The gauge is 20 characters wide, so one character is 5% of `MaxStress`, and the `SAFE` marker overwrites the character it lands on rather than taking one of its own — a gauge that shifted by a character as the fill passed its marker would be unreadable.

What shipped: 28 characters, the card's full width, so one character is 1/28 of `MaxStress`. The gauge carries no marks that have to land on exact characters, and it is the reading now that the `STRESS` row beneath it is gone ([§12](#12-machine-cards)) — so it is drawn at the size of a reading. The marker still overwrites its character, and the fill still pegs at the right-hand end.

The `SAFE` and `MAX` labels above the bar are dropped with it. A bar filling left to right has its ends where every other bar in the interface has them, and the marker is the only thing on the gauge that has to be found — naming the two ends spent a line of the card on what the drawing already says. The marker keeps its meaning from the alerts panel, which says the same news in words when the fill crosses it ([§20](#20-alerts-panel)).

The gauge should communicate:

- current stress position
- safe region
- maximum region

The `SAFE` marker is fixed but the fill is not bounded by `MAX`: a machine straining against a backed-up or empty store can read past its maximum. Peg the fill at the right-hand end rather than letting it overflow the gauge.

Recommended visual construction:

```text
outlined rectangle
filled green segment
vertical marker
SAFE label at left
MAX label at right
```

Do not use:

- circular gauges
- modern speedometers
- gradients
- multi-color heat maps

The most important requirement is immediate readability.

---

# 15. Battery Card

The Battery should visually receive slightly more emphasis because it is a major status component.

Recommended layout:

```text
BATTERY

[battery SVG]

STORED
12.4 / 40 MWh
██████░░░░░░░░░

SPENDABLE      8.4 MWh
RESERVED       4.0 MWh

--------------------------------

NET FLOW      +26.4 MW

--------------------------------

UPGRADES

[           CAPACITY           ]
```

Use the same styling as the rest of the interface.

The upgrade section follows [§8](#8-card-style) like every other card: a blank line opens it rather than a rule, and `CAPACITY` is a gain row above a button carrying only the price.

Do not introduce a separate accent color.

---

# 16. Progress Bars

Progress bars should use simple rectangular geometry.

Preferred:

```text
████████░░░░░░
```

or an outlined rectangle with a solid green fill.

Optional CP437-style fill characters may be used if they render reliably:

```text
█
▓
▒
░
```

Using CP437 block characters is encouraged because it reinforces the visual style.

Avoid:

- rounded progress bars
- animated gradients
- glossy fills
- bouncing transitions

---

# 17. Lower Dashboard

Below the production chain, include a compact secondary information area.

Recommended panels:

```text
POWER SUMMARY
NET FLOW
RESERVES
ALERTS
```

These should not visually compete with the production chain.

Use shorter height and smaller typography than the main cards.

---

# 18. Power Summary

Example layout:

```text
POWER SUMMARY

GENERATION        31.9 MW
CONSUMPTION        5.5 MW
--------------------------
NET FLOW          +26.4 MW

AVERAGE           +24.8 MW
PEAK               27.6 MW
```

Use aligned label/value columns.

The monospaced CP437 font should make numeric scanning easy.

---

# 19. Net Flow Graph

Use an intentionally primitive graph style.

Example:

```text
NET FLOW (MW)

 40 ┤
 20 ┤    ╱╲   ╱──╲
  0 ┼──────╲─╯──────
-20 ┤
    └────────────────
     60  45  30  15  0
```

Graph styling:

- black background
- green line
- faint green grid
- no area fill
- no gradients
- no chart library default styling
- square corners
- minimal labels

The graph should appear like instrumentation, not analytics software.

The trace ships as **inline SVG** rather than as the box-drawing characters sketched above. A character-cell chart quantises the line to whole cells, and at this update rate a reading that sits between two cells flickers between them several times a second. Every rule this section states still holds — green line, faint green grid, no fill, no gradient, square corners, minimal labels — and `components/game/net_flow_graph.vue` is the one component to change if a character chart is ever preferred.

The value axis rescales to the window rather than to a fixed range, with zero always on it, so the trace fills its band at any output and the sign of the flow is never in doubt. The axis never narrows below 2 MW, so a plant sitting at nothing reads as a flat line instead of amplified rounding error.

---

# 20. Alerts Panel

Normal state:

```text
ALERTS

NO ALERTS
```

Alerts should use concise operator-style wording.

Examples:

```text
LOW BATTERY
STOCKPILE EMPTY
SILO FULL
TANK FULL
TANK LOW
HIGH TEMPERATURE
HIGH PRESSURE
HIGH VIBRATION
```

`SILO FULL`, `TANK FULL`, and `TANK LOW` fire on the strain thresholds rather than on the store actually reaching an end, because that is the point at which they start costing the player something.

For higher-priority warnings, use:

- blink
- inverse colors
- `!` or CP437 symbols
- stronger border

Avoid adding new colors.

What shipped: every alert is written in red, the one colour [§4](#4-color-system) admits beyond the console's white and the readings' green, and the only place on the screen that takes it. Rank is still not carried by the colour — both ranks are the same red, and an urgent alert is marked with a `!`, inverted, and blinking as before. The blink swaps the background between the console's white and black and leaves the words red throughout, which is why §4 defines two: `--alert` on black, `--alert-inverted` on white. `NO ALERTS` is not an alert and stays the console's own dim white.

---

# 21. Buttons

All buttons should be rectangular.

Normal state:

```text
green outline
green text
black background
```

Hover state:

```text
slightly brighter border/text
```

Pressed state:

```text
green background
black text
```

Selected state:

```text
green background
black text
```

Disabled state:

```text
dim green border
dim green text
black background
```

The disabled border keeps its solid stroke and only dims. This is a deliberate exception to §28, which forbids a state told apart by brightness alone. A dashed border was used here first; the judgment against it is that a chain of cards whose buttons break into dashes as costs rise reads as a damaged frame rather than as controls out of reach. The exception is narrow: a button is disabled because its cost is above `SpendableEnergy`, which the Battery card states outright, so the state is legible from the numbers as well as from the dimming.

A disabled button keeps its label and its place in the tab order. It carries `aria-disabled="true"` rather than the `disabled` attribute, so a player can reach it and read the price they cannot yet pay instead of finding a dimmed mystery.

Suggested CSS concept:

```css
.control-button {
  color: var(--ui-green);
  background: #000;
  border: 1px solid currentColor;
  border-radius: 0;
  font: inherit;
}

.control-button:active,
.control-button[aria-pressed="true"] {
  color: #000;
  background: var(--ui-green);
}
```

Avoid long easing animations.

Input feedback should feel nearly instantaneous.

---

# 22. Interaction Timing

Controls should feel mechanical and immediate.

Recommended transition durations:

```text
0–80 ms
```

Avoid:

```text
300–500 ms modern UI transitions
spring animations
elastic effects
overshoot
```

A short terminal-like click or brief inversion is preferable.

---

# 23. Navigation

If bottom navigation is included, use a segmented full-width bar.

Example:

```text
[ OVERVIEW ] [ PRICES ] [ UPGRADES ] [ RESEARCH ] [ STATS ] [ OPTIONS ] [ MENU ]
```

Each item may include a simple line icon.

Selected page:

```text
green background
black text/icon
```

Unselected page:

```text
black background
green text/icon
```

If those pages do not exist in the prototype, omit the navigation entirely rather than creating nonfunctional controls.

---

# 24. CRT Styling

CRT styling is optional and must remain subtle.

Possible effects:

- very light scanlines
- tiny glow, in the text's own colour
- minimal screen flicker
- subtle pixel texture

Example glow:

```css
text-shadow: 0 0 2px currentColor;
```

Example scanline overlay:

```css
.crt-overlay {
  pointer-events: none;
  background:
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.10),
      rgba(0, 0, 0, 0.10) 1px,
      transparent 1px,
      transparent 3px
    );
}
```

The CRT effect must never make text difficult to read.

Provide a way to disable flicker if flicker is implemented.

---

# 25. Spacing and Density

The interface should be compact.

Recommended hierarchy:

```text
Panel title        20–24 px
Primary values     16–20 px
Secondary values   14–18 px
Small labels       12–16 px
```

Exact dimensions depend on the bitmap font.

Prefer using integer multiples of the bitmap font's native pixel grid.

Avoid fractional positioning where possible.

Align:

- text baselines
- numerical columns
- card tops
- card bottoms
- progress bars
- button heights

The UI should look constructed on a rigid grid.

---

# 26. Responsive Behaviour

Desktop is the primary target.

At large widths:

```text
all seven production cards should remain in one row
```

If the viewport becomes too narrow:

1. preserve font readability
2. preserve card width
3. allow horizontal scrolling of the production chain

Do **not** aggressively shrink the entire UI until the CP437 text becomes unreadable.

Recommended minimum card widths:

```text
Storage card: 170–200 px
Machine card: 200–240 px
```

---

# 27. Keyboard UX

Keyboard interaction is encouraged because it fits the terminal/operator aesthetic.

Possible shortcuts:

```text
Arrow keys / +/-  adjust focused numeric controls
Enter             activate focused button
Tab               move focus
Escape            close modal/menu
```

Focus must be visible.

Recommended focus state:

```text
double border
or
inverse colors
```

Do not rely on browser-default blue focus outlines if they break the monochrome appearance.

Maintain accessibility semantics.

What shipped: a 2px solid outline in the console colour on every focusable element, and a stepper that steps from either of its buttons — `ArrowUp` / `ArrowRight` / `+` up, `ArrowDown` / `ArrowLeft` / `-` down, with the key claimed so an arrow never scrolls the chain out from under the control. A modified press is left to the browser, so `Ctrl` and the sign keys still zoom. `Escape` is unclaimed and stays that way until there is a menu to close.

The run overlay makes the chain and the dashboard behind it inert while it is up, so the only things `Tab` can reach are its own button and the header's settings control. That one exception is why it is a plain `role="dialog"` rather than `aria-modal`: the settings have to be reachable before a first run has ever been started. The settings panel itself is `aria-modal`, and is one in fact — the header goes inert behind it too.

The bars, gauges and sparklines drawn in block glyphs are hidden from assistive technology. Read aloud they are noise, and each one draws a number that is written out in the row beside it.

---

# 28. Accessibility

Even though the UI is monochrome, state must not be communicated by brightness alone. The disabled button is the single exception, and §21 records why.

Use combinations of:

- text
- symbols
- border changes
- fill patterns
- labels
- inversion

Examples:

```text
! WARNING
LOW BATTERY
DISABLED
```

Recommended options:

```text
UI scale
CRT effects on/off
flicker on/off
reduced animation
```

Use semantic HTML controls when possible.

What shipped: a SETTINGS panel of three toggles — CRT EFFECTS, GLOW nested under it, and
REDUCED ANIMATION — opened from the header's `☼` control and reachable at any time,
including under a run in progress. The run keeps running behind it: nothing in the panel
touches the plant, and a panel that stopped the clock would be a way to stop the clock.

---

# 29. Data Presentation Rules

The UI receives values from application state and renders them.

Do not embed gameplay calculations into presentation components.

Preferred architecture:

```text
game/application state
        ↓
UI view model
        ↓
rendered components
```

UI components should primarily receive already-computed values such as:

```ts
{
  stored: 12.4,
  capacity: 40,
  netFlow: 26.4,
  setting: 0.8,
  stress: 62,
  cleanTo: 0.69,
  penalty: 7,
}
```

Presentation components should not own simulation rules.

---

# 30. Suggested UI Component Structure

Example:

```text
GameInterface
├── Header
│   ├── GameTitle
│   ├── TimerDisplay
│   └── TargetProgress
│
├── ProductionChain
│   ├── StorageCard
│   ├── FlowArrow
│   ├── MachineCard
│   ├── FlowArrow
│   └── ...
│
├── SecondaryDashboard
│   ├── PowerSummary
│   ├── NetFlowChart
│   ├── ReservePanel
│   └── AlertPanel
│
└── BottomNavigation
```

Reusable primitives:

```text
TerminalPanel
TerminalButton
ValueRow
ProgressBar
StressGauge
NumericStepper
SvgMachineIcon
FlowArrow
SectionDivider
AlertMessage
```

Keep visual primitives reusable so spacing and styling remain consistent.

---

# 31. CSS / Design Token Approach

Centralize styling through variables.

Example:

```css
:root {
  --bg: #000;
  --fg: #e8e8e8;
  --fg-dim: rgba(232,232,232,.55);
  --fg-faint: rgba(232,232,232,.25);

  --data: #39ff14;
  --data-dim: rgba(57,255,20,.55);

  --border: 1px solid var(--fg);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
}
```

Do not hard-code slightly different whites, greens or border styles throughout individual components. Which of the two colors anything takes is decided in [Color System](#4-color-system); a component picks a token, it does not pick a hue.

---

# 32. Reference Look

The final interface should evoke:

```text
IBM PC terminal
DOS-era operator software
industrial SCADA
power-station control panel
monochrome CRT
engineering console
```

It should **not** evoke:

```text
modern web dashboard
iOS / Android UI
cyberpunk nightclub
spaceship cockpit
fantasy game HUD
modern finance dashboard
```

The distinction is important.

---

# 33. Implementation Priority

Implement visual elements in this order:

## Phase 1 — Structure

```text
CP437 font
black/white/green theme
header
production-chain grid
cards
borders
spacing
```

## Phase 2 — Reusable Controls

```text
buttons
numeric steppers
progress bars
value rows
stress gauges
disabled states
focus states
```

## Phase 3 — Vector Assets

```text
stockpile SVG
pulverizer SVG
silo SVG
boiler SVG
tank SVG
turbine SVG
battery SVG
arrows
```

## Phase 4 — Secondary Dashboard

```text
power summary
net-flow chart
alerts
optional navigation
```

## Phase 5 — Polish

```text
CRT scanlines
tiny text glow
operator-style sound feedback
keyboard shortcuts
responsive refinements
```

Do not begin with heavy CRT effects.

Typography, layout, and readability are more important.

---

# 34. Acceptance Criteria

The implementation is visually successful if:

- the entire interface uses a **Code Page 437 / IBM VGA-style bitmap font**
- the background is black
- the foreground follows [Color System](#4-color-system): phosphor white, with green kept for the readings
- cards use thin square borders
- the production chain is immediately understandable left-to-right
- all equipment icons are vector/SVG line drawings
- machine/status values are easy to scan
- controls look like old operator-console controls
- hover, pressed, selected, disabled, and focus states are clear
- no modern gradients, shadows, or rounded-card styling are present
- the interface remains readable at the target 16:9 resolution
- CRT effects, if used, remain subtle
- UI components display application state rather than owning gameplay simulation logic

The final impression should be:

> **An old power-plant operator terminal implemented as a clean game interface.**
