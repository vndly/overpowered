# Implementation Plan

Thirteen sequential stages. Every stage ends with a playable game, and no stage
depends on anything a later stage introduces.

"Playable" has a fixed meaning here: **a real match** — start, the timer runs
down, you win or you lose, you can restart. That is true from stage 1, where you
always lose because nothing generates energy yet.

## Cross-cutting rules

- **The working level.** Stages 1-10 use one hand-made 10x10 level with a ~2
  minute timer and a goal scaled to match. The board is full size; only the clock
  is compressed. From stage 6 its day/night cycle is shortened to ~40s so several
  waves still fit. Stage 7 adds a second, full-length ~5 minute level whose only
  job is to show the match arc the compressed one cannot.
- **No dev tooling.** No debug overlay, no speed control, no cheats, at any
  stage. Every constant lives in one tunables module, edited and hot-reloaded.
  The game is only ever experienced as a player experiences it.
- **Visual language once, juice last.** Stage 1 commits palette, type, grid
  rendering style, HUD layout and alarm colours. Every later stage renders its
  mechanic properly in that language. Effects, animation and non-alarm audio
  batch into stage 13.
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
    generator.ts          Generator                                    (S2)
    accumulator.ts        Accumulator                                  (S2)
    network.ts            reach, chaining, obstacle blocking           (S2)
    economy.ts            build / sell / upgrade / demolish rules      (S2, S3)
    render/
      board_layout.ts     BoardLayout   — cell size, DPR, point to cell
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
accumulator is placed at start; generators auto-connect if in reach, chain through
other connected generators, and obstacles block connections. Cables are drawn.
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

## Stage 6 — Day/night, Solar and Wind

The global sine wave scaling heat generation for every generator, Solar output
following the curve, Wind losing output near obstacles, and the forecast strip in
the HUD. Tier 1 is complete.

**The match:** it acquires a rhythm — day is income and danger, night is relief
and your push window. Both remaining tier 1 generators arrive at the exact moment
their rules mean something.

## Stage 7 — The campaign shell

The `Level` type formalised (map, resources, obstacles, goal, timer, unlocks, and
environment presets for cycle length, amplitude, ambient heat and starting
energy), a level select screen, unlock gating, localStorage progression, and a
main menu. Three hand-made levels varying map, goal and timer, plus the
full-length arc-check level.

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
and growth, sell refund, demolition cost, the ambient day/night curve, and the
race margin.

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
5. Order: heat, then controls, then day/night, then relays, then cooling towers.
6. Upgrades arrive before heat, so "tall" becomes dangerous for free.
7. Campaign shell mid-spine, authored content late.
8. Generators by tier, matching the spec's own structure and the unlock gating.
9. Heat ships alone so the adjacency percentages are tuned in isolation.
10. No dev tooling, ever.
11. A compressed working level, plus one full-length level from stage 7.
12. Alarms with their danger; the rest of the audio in polish.
13. The first build stage splits in two rather than becoming the largest stage.

# Known risks

- **Stage 8 is the algorithmic risk** — routing, load accounting and cascades —
  and it sits eight stages in. A design flaw there surfaces late. This is a
  deliberate consequence of putting heat first.
- **Stage 12 is expensive without dev tooling.** Each tuning pass on a 12-15
  minute level costs 12-15 minutes of play, times several passes, times a dozen
  levels.
- **Gas has no mechanic.** Throttle was cut, so its "can rapidly adjust its
  output" note has nothing behind it. Stage 10 ships it as a stat-block unless it
  gets a rule first. (Note: the memo says this was parked at the end of
  `README.md`, which currently contains only a heading — the note is gone.)
- **Solar and Wind have nothing to stand on.** The spec says generators may only
  be built on resource cells, and empty cells take only relays and accumulators —
  so either sun and wind are resource kinds like coal, or the placement rule needs
  an exception. Stages 1-3 are unaffected (Biomass only), but stage 6 cannot start
  until this is settled.
- **Stage 13 is the least-defined stage** and will want scoping before it starts.
