# OVERPOWERED — UI/UX Specification

## Purpose

This document defines the **UI/UX, visual language, layout, interaction patterns, and implementation rules** for the OVERPOWERED prototype.

It is intended for an AI coding agent implementing the interface.

This document is **not** a gameplay, economy, balance, or simulation specification. The UI should consume game-state values provided by the application and present them clearly without owning gameplay logic.

---

# 1. Visual Direction

OVERPOWERED should look like an **old industrial power-plant operator interface** displayed on a monochrome CRT terminal.

The target visual language is:

- black background
- bright green foreground
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
EFFICIENCY     0.85
STABILITY      0.40
OUTPUT         31.9 MW
```

Avoid unnecessary decimal precision.

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
```

Reference layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ OVERPOWERED        TIME 07:12        STORED 12.4 / 40 MWh  │
│                                           █████░░░░░░░░░░   │
└──────────────────────────────────────────────────────────────┘
```

Design rules:

- title aligned left
- timer near center
- stored-energy readout aligned right
- horizontal progress bar next to or below stored-energy value
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

# 9. Vector Graphics

All equipment illustrations should be **vector assets**, preferably SVG.

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

SVG design rules:

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

Use `currentColor` so all SVGs inherit the UI green.

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
│ ███████░░░           │
│                      │
│ additional values    │
│                      │
├ - - - - - - - - - - ┤
│       UPGRADES       │
│ [     CAPACITY     ] │
└──────────────────────┘
```

The fill bar should always make current storage visually obvious.

---

# 11. Stockpile Card

Recommended structure:

```text
STOCKPILE

[coal/conveyor SVG]

STORED      0.7 / 1.0 t
███████░░░

COAL PRICE  1.0 MWh/t

[-]          0.5 t          [+]

[         BUY: 0.5 MWh         ]

--------------------------------

UPGRADES

[           CAPACITY           ]
[         COAL PRICE           ]
```

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
CONTROL

SETTING       [-] 0.80 [+]

--------------------------------

STRESS TYPE
[STRESS GAUGE]

STRESS        62%
PENALTY       -7%

OUTPUT        value

--------------------------------

UPGRADES
```

Use the component-specific control names:

```text
PULVERIZER → COOLING
BOILER     → REGULATION
TURBINE    → STABILITY
```

Use the component-specific stress names:

```text
PULVERIZER → TEMP
BOILER     → PRESSURE
TURBINE    → VIBRATION
```

---

# 13. Machine Setting Control

Machine setting uses a simple stepper:

```text
SETTING      [-] 0.80 [+]
```

UX requirements:

- minus and plus controls must be obvious
- value remains visible at all times
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
TEMP (°C)

SAFE                 MAX
██████████|████░░░░░

STRESS        62%
PENALTY       -7%
```

The gauge should communicate:

- current stress position
- safe region
- maximum region
- current penalty

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
HIGH TEMPERATURE
HIGH PRESSURE
HIGH VIBRATION
```

For higher-priority warnings, use:

- blink
- inverse colors
- `!` or CP437 symbols
- stronger border

Avoid adding new colors.

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
- tiny green glow
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

---

# 28. Accessibility

Even though the UI is monochrome, state must not be communicated by brightness alone.

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
  setting: 0.80,
  stress: 62,
  penalty: 7
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
  --fg: #39ff14;
  --fg-dim: rgba(57,255,20,.55);
  --fg-faint: rgba(57,255,20,.25);

  --border: 1px solid var(--fg);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
}
```

Do not hard-code slightly different greens or border styles throughout individual components.

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
black/green theme
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
- the foreground is monochrome green
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
