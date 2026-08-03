# Implementation Plan

Thirteen sequential stages. Every stage ends with a playable game, and no stage
depends on anything a later stage introduces.

"Playable" has a fixed meaning here: **a real match** — start, the timer runs
down, you win or you lose, you can restart. That is true from stage 1, where you
always lose because nothing generates energy yet.

## Status

A stage is ticked only once it has passed its exit criteria, including a full
match played start to finish.

- [x] 1 — The match shell
- [x] 2 — Build, sell, connect
- [ ] 3 — Upgrades and demolition
- [ ] 4 — Heat
- [ ] 5 — Generator controls
- [ ] 6 — Solar and Wind
- [ ] 7 — The campaign shell
- [ ] 8 — Relays and routing
- [ ] 9 — Cooling towers
- [ ] 10 — Tier 2
- [ ] 11 — Tier 3
- [ ] 12 — Campaign content and race tuning
- [ ] 13 — Polish

## Cross-cutting rules

- **The working level.** Stages 1-10 use one hand-made 10x10 level with a ~2
  minute timer and a goal scaled to match. The board is full size; only the clock
  is compressed. Stage 7 adds a second, full-length ~5 minute level whose only
  job is to show the match arc the compressed one cannot.
- **No dev tooling.** No debug overlay, no speed control, no cheats, at any
  stage. Every constant lives in one tunables module, edited and hot-reloaded.
  The game is only ever experienced as a player experiences it.
- **Visual language once, juice last.** Stage 1 commits palette, type, grid
  rendering style, HUD layout and alarm colours. Every later stage renders its
  mechanic properly in that language. Effects, decoration and non-alarm audio
  batch into stage 13 — but *not* animation: `docs/ui.md` § Motion amends this,
  tweening anything that renders a simulation value from stage 1, because
  escalation only communicates if it can be seen rising.
- **Alarms are not polish.** Warning and alarm SFX ship in the stage that
  introduces the danger they announce, because the spec classifies them as
  gameplay-critical readability.
- **The placement preview accretes.** Each stage adds its own line to it:
  connection route (2), delivered output (2), nearby heat penalty (4), cooling
  received (9), relay load after placement (8/9).
- **Hotkeys ship with the action they trigger**, never retrofitted.
- **Architecture.** No new dependencies. Canvas for the board, DOM for HUD and
  menus, per the spec. See the section below.
- **Stage exit criteria.** `npm run lint:fix`, `npm run build`, `/delta-review`,
  then play a full match start to finish.

---

# Architecture (stages 1-3)

Scoped to what the first three stages actually build. Later systems get designed
when they are forced, not now.

## Module layout

```
src/
  game/
    tunables.ts           every constant, grouped by system
    level.ts              Level interface + the working level
    cell.ts               Cell union, CellKind, ResourceKind
    grid.ts               Grid          — bounds-checked access, neighbours
    match.ts              Match         — match state + tick
    match_loop.ts         MatchLoop     — fixed-timestep driver
    format.ts             energy, pace and clock strings for the DOM
    generator.ts          Generator                                    (S2)
    accumulator.ts        Accumulator                                  (S2)
    network.ts            reach, chaining, obstacle blocking           (S2)
    economy.ts            build / sell / upgrade / demolish rules      (S2, S3)
    render/
      tween.ts            Tween         — eases one rendered simulation value
      board_layout.ts     BoardLayout   — cell size, centring, point to cell
      board_renderer.ts   BoardRenderer — grid, structures, cables
  composables/
    use_match.ts          owns Match + MatchLoop, exposes HUD snapshot and actions
  components/
    screens/
      match_screen.vue    route '/', replaces home_screen.vue
    game/
      board_canvas.vue    owns <canvas>, resize and DPR, emits cell pointer events
      hud_panel.vue       stored energy, goal, timer, required pace
      match_overlay.vue   pause, win, lose, restart
      build_bar.vue       structure palette                            (S2)
      structure_panel.vue selected structure: sell, upgrade            (S2, S3)
```

Per `docs/typescript.md`: `snake_case` files, one class per file, `@` imports
with no relative paths, getters for parameterless computed reads.

## The sim/render boundary

The rule is that **Vue never observes the sim**. `Match`, `Grid` and every
structure are plain TypeScript that knows nothing about Vue or canvas.

- `Match.tick(deltaSeconds)` advances the match by exactly one fixed step.
- `MatchLoop` drives `requestAnimationFrame`, accumulates real elapsed time, and
  runs `tick` at a fixed step as many times as the accumulator allows, clamped so
  a backgrounded tab cannot spiral. It then renders once.
- **Look-only pause falls out of this for free:** the loop keeps rendering and
  stops accumulating. No special case anywhere in the sim.
- `use_match.ts` writes a plain snapshot — stored energy, goal, remaining
  seconds, required pace, status — into a `shallowRef` after each rendered frame.
  That snapshot is the only thing the HUD ever sees, so a 100-cell board carries
  no reactive proxy overhead and the sim stays deterministic.
- `BoardRenderer` reads `Match` directly each frame. Nothing reactive sits in the
  render path.

## Core types

Behaviour lives in classes; pure data lives in types and interfaces.

- `Cell` is a discriminated union on `kind` — `empty`, `resource` (carrying a
  list of `ResourceKind`, since a cell can hold coal *and* water), `water`,
  `obstacle`. `ResourceKind` starts as a single member and gains one per
  generator stage.
- `Grid` stores cells row-major and exposes `cellAt(x, y): Cell | undefined`.
  The `noUncheckedIndexedAccess` miss is handled once at that boundary, so no
  caller downstream ever needs `!`.
- `Level` is a plain interface: id, name, dimensions, cells, starting energy,
  goal, duration, and the free accumulator's position. Stage 7 adds `unlocks` and
  the environment preset; nothing before then needs them.
- `Match` owns level, grid, elapsed time, stored energy, structures and status,
  with getters for remaining time and required pace.

## How stages 2 and 3 attach

Stage 2 adds `Generator`, `Accumulator`, `network.ts` and `economy.ts`.
`Match.tick` gains an income step that asks the network which generators are
connected; `BoardRenderer` gains structures and cables.

Stage 3 adds **no new modules** — a level field on `Generator`, upgrade and
demolition rules in `economy.ts`, and actions in `structure_panel.vue`. That it
needs nothing new is the main evidence this shape is right.

---

# Stages

## Stage 1 — The match shell

The sim loop, match state (stored energy, goal, timer, required pace), the 10x10
board rendered on canvas with all four cell types, the HUD, look-only pause,
restart, and win/lose end screens. Boots straight into the working level; there is
no menu yet.

**The match:** the clock runs out and you lose, every time. Nothing here is
throwaway — the shell carries all thirteen stages.

## Stage 2 — Build, sell, connect

Biomass only. Resource cells accept only their matching generator. The free
accumulator is placed at start; generators auto-connect within 1 cell (the 4
orthogonal neighbours), chain through other connected generators, and obstacles
block connections. Cables are drawn.
**A disconnected generator contributes nothing.** Income accrues to stored energy.
Sell refunds at a lower rate.

**The match:** the first one you can win. Spend your starting energy on generators
you can actually reach, and the decision is where and when.

## Stage 3 — Upgrades and demolition

Generator levels from 1, exponential upgrade cost, output scaling per level, and
obstacle demolition for energy.

**The match:** wide versus tall becomes the whole game — another generator needs a
free resource cell in reach, an upgrade needs no space but costs exponentially
more, and demolishing a blocker buys you reach. One new idea, tuned alone.

## Stage 4 — Heat

Per-generator heat rate and temperature, adjacency spread (+10% orthogonal, +5%
diagonal on heat generation), faster overheating while disconnected, and
overheat explosions that destroy only the generator and leave the cell buildable.
Heat scales with level. Board heat visualisation, per-generator readout, and the
overheat warning SFX (with a minimal audio harness).

**The match:** the first dangerous one. Your only answers are spacing, restraint
about upgrading, and selling a generator before it dies. That isolates the single
most important number in the game — the adjacency percentages — against nothing
else.

## Stage 5 — Generator controls

Turn off and on with transition time. Venting: instant heat removal, cost
proportional to level, escalating with repeated use. Hotkeys and alarm states.

**The match:** micro under fire. Tuned against a heat curve you already trust.

## Stage 6 — Solar and Wind

Solar — Biomass's price for half its output and half its heat — and Wind, losing
output near obstacles. Tier 1 is complete.

Both build on empty cells, so this stage hands the player a second way to extend
the network: a hot, cheap chain of ambient generators competing with the cool,
lossy, expensive relays that arrive at stage 8. Expect the economy to need a pass
here.

**The match:** the board stops being resource cells with dead space between them.
Every empty cell is buildable now, so reach becomes something you buy with
generators two stages before relays offer to sell it to you.

## Stage 7 — The campaign shell

The `Level` type formalised (map, resources, obstacles, goal, timer, unlocks, and
environment presets for ambient heat and starting energy), a level select screen,
unlock gating, localStorage progression, and a main menu. Three hand-made levels
varying map, goal and timer, plus the full-length arc-check level.

**The match:** it stops being one level and becomes a campaign you progress
through. Everything after this lands into a real structure — there is never a
retrofit stage.

## Stage 8 — Relays and routing

All three relay types (Basic, Intermediate, Advanced). One deterministic path per
generator — fewest hops to its nearest accumulator, stable tie-break. Per-hop
loss. Relay load as the sum of routed flows. The 80% alarm with its SFX, and
overload destroying the relay while leaving the cell buildable. Routes recompute
only on topology change. Extra accumulators as new network roots.

**The match:** logistics becomes the subject, and failure learns to cascade — a
dying relay dumps its flows onto survivors.

## Stage 9 — Cooling towers

All four types, with radius, effectiveness shared across generators in range,
consumption, and levels. Full network consumers: they must be connected, their
draw loads relays, they idle when disconnected, and they starve at 0⚡ stored.

**The match:** the complete stability toolkit — and, for the first time, emergent
grid collapse. Run out of stored energy and the towers die, heat climbs, and
generators start going with them.

## Stage 10 — Tier 2

Oil (venting costs more), Geothermal (obstacle penalty), Gas. Gated by campaign
unlocks.

## Stage 11 — Tier 3

Coal, Hydroelectric (on water, stronger beside adjacent water cells), Nuclear
(narrow safety margin). The roster is complete.

## Stage 12 — Campaign content and race tuning

The full authored level set, biome presets (desert, storm coast, arctic), goals
and timers set at 80-90% of measured practical max output, and the match length
ramp from ~5 to ~12-15 minutes. Resolves the spec's open tuning list: upgrade caps
and growth, sell refund, demolition cost, and the race margin.

**The match:** the actual game.

## Stage 13 — Polish

Explosion, venting and build effects. Cable flow animation. Remaining SFX and
music. A settings screen persisted to localStorage. Menu and transition polish. A
final readability pass.

---

# Decisions this rests on

1. Every stage is a real match with win, loss and restart — not a demo.
2. The first build stage already requires connection; relays only extend a rule
   that was always true, so no later stage invalidates a learned layout.
3. Visual language early, juice batched last.
4. One generator to start; each later one arrives with the system that gives it a
   rule.
5. Order: heat, then controls, then ambient generators, then relays, then cooling
   towers.
6. Upgrades arrive before heat, so "tall" becomes dangerous for free.
7. Campaign shell mid-spine, authored content late.
8. Generators by tier, matching the spec's own structure and the unlock gating.
9. Heat ships alone so the adjacency percentages are tuned in isolation.
10. No dev tooling, ever.
11. A compressed working level, plus one full-length level from stage 7.
12. Alarms with their danger; the rest of the audio in polish.
13. The first build stage splits in two rather than becoming the largest stage.

# Resolved

Written into `docs/specs.md`, which stays the source of truth:

- **Connections are orthogonal only.** Reach is counted along the row and the
  column, never diagonally, so no cable ever runs diagonally and a relay's reach
  is a cross rather than a square. Turning a corner costs another relay.
- **Reach is 1 cell** for generators, cooling towers and accumulators — the 4
  orthogonal neighbours. Only relays reach further. The spec had given relays a
  distance but never defined anyone else's, which stage 2 could not have been
  built without.
- **Free chaining no longer dominates relays.** Chained links have no hop loss and
  no capacity limit, and routing counts only relay hops, so a chain reaching the
  accumulator directly used to cost nothing. Reach 1 closes it with a mechanic
  that already exists: a chain is a line of orthogonally adjacent generators, so
  every link pays the full +10% adjacency heat spread. Chains still transmit at no
  energy loss — they run hot instead. Hop loss remains relay-only.
- **Solar and Wind build on empty cells.** Resource cells stay reserved for their
  matching generator.
- **Gas keeps no special rule.** Its orphaned "rapidly adjust output" note is
  gone. Cost 2 / output 3 / max temp 2 / heat 3 is already the sharpest risk-reward
  profile in tier 2, and Biomass and Coal carry no note either.

# Accepted costs

Consequences of decisions already taken, not open problems:

- **Stage 12 tuning is slow without dev tooling** — but far less slow than it
  looks. A level's practical max output is computable from its resource cells and
  generator stats, so goals get set analytically and played once to confirm, not
  discovered by trial.
- **Stage 13 is deliberately unscoped.** Polish is scoped at the end of stage 12,
  when the game exists and it is clear what needs juice.

# Known risks

- **Stage 8 carries the algorithmic risk** — deterministic routing, load
  accounting and reroute cascades — eight stages in, so a flaw in the routing
  model surfaces late. Partly mitigated: the connection graph itself (reach,
  chaining, obstacle blocking) lands at stage 2, so only routing *over* an
  already-proven graph is new at stage 8.
- **Stage 6 may destabilise the economy.** Solar and Wind on empty cells give the
  player a cheap, hot alternative to relays for extending the network, arriving
  two stages before relays do. Budget an economy pass in that stage.
