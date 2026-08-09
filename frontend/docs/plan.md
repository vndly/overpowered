# Implementation Plan — Overpowered

This plan tells a coding agent how to build the game described in [`docs/specs.md`](docs/specs.md)
and [`docs/ui_ux.md`](docs/ui_ux.md) into this Vite + Vue 3 application.

**Read before starting:** [`docs/specs.md`](docs/specs.md) (gameplay, the source of truth for every
number), [`docs/ui_ux.md`](docs/ui_ux.md) (interface), [`docs/typescript.md`](docs/typescript.md)
(style), [`CLAUDE.md`](CLAUDE.md) (project rules), and
[`simulator/sim.py`](simulator/sim.py) (a working reference implementation of the simulation).

---

## Progress

Tick a box only when the stage's acceptance criteria hold and its
[Per-stage commands](#per-stage-commands) have passed.

- [ ] [Stage 1 — Foundations: font, tokens, character grid, terminal primitives](#stage-1--foundations-font-tokens-character-grid-terminal-primitives)
- [ ] [Stage 2 — The engine](#stage-2--the-engine) — not tickable on its own; Stage 3 is its proof
- [ ] [Stage 3 — Verification screen](#stage-3--verification-screen)
- [ ] [Stage 4 — Loop, view model, run lifecycle](#stage-4--loop-view-model-run-lifecycle)
- [ ] [Stage 5 — Storage cards](#stage-5--storage-cards)
- [ ] [Stage 6 — Machine cards](#stage-6--machine-cards)
- [ ] [Stage 7 — Battery card and run header](#stage-7--battery-card-and-run-header)
- [ ] [Stage 8 — SVG icons](#stage-8--svg-icons)
- [ ] [Stage 9 — Lower dashboard](#stage-9--lower-dashboard)
- [ ] [Stage 10 — Keyboard, focus, accessibility](#stage-10--keyboard-focus-accessibility)
- [ ] [Stage 11 — Optional polish](#stage-11--optional-polish) — may be skipped; tick it or strike it out

---

## How to use this plan

- Stages are ordered. Do not start a stage until the previous one meets its acceptance criteria.
- Each stage lists the exact files it creates or modifies. Do not create files it does not list.
- **Gameplay formulas are never copied into this plan.** Where a rule is needed, this plan cites
  the `specs.md` section that defines it. Read the section; do not work from memory. The economy
  is already duplicated across `specs.md` and `sim.py`, and a third copy would rot.
- Where `specs.md` is silent or ambiguous, this plan pins the value under
  [Global pinned values](#global-pinned-values) or in the stage itself. Those values are decisions,
  not derivations — implement them exactly.
- **The ASCII card sketches are illustrative, not measurements.** They show what each card
  contains and in what order. The card widths in the pinned table govern the actual layout.
- Finish every stage with the commands under [Per-stage commands](#per-stage-commands).

### Architecture in one paragraph

A framework-free TypeScript engine under `src/game/` owns all state and every rule and imports
nothing from Vue. A composable under `src/view/` drives it with a fixed-step accumulator and
publishes an immutable view model into a `shallowRef` once per animation frame. Vue components
receive that view model as props, render it, and emit player intent back. No component computes a
gameplay rule. This is `ui_ux.md` §29 taken literally, and it is what lets the engine be read
side by side with `sim.py`.

### Coding conventions that will bite

From `eslint.config.js` and `docs/typescript.md`. Getting these wrong means a lint failure on
every file:

- No semicolons. Single quotes. Two-space indent. Trailing commas on multiline.
- **`object-shorthand: never`** — write `{contents: contents}`, never `{contents}`.
- **`object-curly-newline` with `minProperties: 1`** — every object literal with at least one
  property must be multiline.
- **`array-bracket-newline` / `array-element-newline` with `minItems: 2`** — every array literal
  with two or more elements must put each element on its own line.
- `object-curly-spacing: never` — `{createApp}`, not `{ createApp }`.
- Imports always use the `@/` alias, never a relative path, never a file extension.
- Files `snake_case`; classes, interfaces and type aliases `PascalCase`; functions `camelCase`.
- One class per file. Prefer getters over parameterless methods that only read state.
- `strict` and `noUncheckedIndexedAccess` are on. Indexing an array or `Record` yields
  `T | undefined` — handle the miss with `?? fallback`, never with `!`. Never add `any`.
- Use `import type` for type-only imports.
- Comment conventions: JSDoc block on every class, JSDoc on non-trivial methods, end-of-line
  comments on field declarations.

### Global pinned values

These apply across stages. Every one of them is a decision this plan makes because the specs do
not.

| Name                | Value                                                          | Note                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeltaTimeSeconds`  | `0.05`                                                         | `specs.md` never fixes it. At 0.05 the spec's per-step market and `sim.py`'s fixed `MARKET_DT` grid coincide, so the simulator's "one deliberate deviation" disappears.                                                                                          |
| Catch-up clamp      | `0.25 s`                                                       | Maximum accumulated time processed in one frame (5 steps). Prevents a spiral after a stall.                                                                                                                                                                      |
| Tab hidden          | Run pauses                                                     | `document.visibilitychange`. An unattended tab must not burn the 600 s clock.                                                                                                                                                                                    |
| Setting granularity | `0.1`, range `0.0–2.0`                                         | Stored as an integer step count `0–20`, exposed as `steps / 10`. Never accumulate floats.                                                                                                                                                                        |
| Coal purchase step  | `0.1 t` (100 kg)                                               | Plus a `FILL` button, see Stage 5.                                                                                                                                                                                                                               |
| Internal mass unit  | kilograms                                                      | All storage contents and capacities in kg. Tonnes exist only in the view model and the coal price.                                                                                                                                                               |
| Internal energy     | MWh; power in MW                                               | As `specs.md`.                                                                                                                                                                                                                                                   |
| Body font size      | `16px`                                                         | PxPlus IBM VGA8 is an 8×16 bitmap. Only integer multiples stay crisp, so the type scale is 16px body / 32px app title, and hierarchy otherwise comes from uppercase, borders and inversion — exactly what `ui_ux.md` §2 says to do when weights are unavailable. |
| Character cell      | `--cell-width: 8px`, `--cell-height: 16px`                     | Every width, gap and padding is a whole multiple of these.                                                                                                                                                                                                       |
| Storage card width  | 24 cells (192px) content                                       | Plus 8px padding each side.                                                                                                                                                                                                                                      |
| Machine card width  | 30 cells (240px) content                                       | Plus 8px padding each side.                                                                                                                                                                                                                                      |
| Chain spacing       | 24px arrow column, no additional gap                           | The arrow column _is_ the gap. Chain totals `4 × 208 + 3 × 256 + 6 × 24 = 1744px`, inside the 1920px reference.                                                                                                                                                  |
| Best result storage | `localStorage`, key `overpowered.best_result`, a number in MWh | `specs.md` says "recorded", not where.                                                                                                                                                                                                                           |
| Run seed            | `Math.floor(Math.random() * 2 ** 32)` at run start             | Not surfaced in the UI. Fixed seeds only in the verification screen.                                                                                                                                                                                             |

### Two `ui_ux.md` rows that contradict `specs.md`

`specs.md` is the gameplay source of truth, so both are dropped and `ui_ux.md` is corrected in the
stage that touches the relevant card:

- §12 and §14 show a `PENALTY -7%` row on machine cards. `specs.md` has no penalty concept —
  "Pushing past the rating is not penalised in output. It damages the machine." **Dropped**
  (Stage 6).
- §11 shows a `[COAL PRICE]` upgrade button on the Stockpile. `specs.md`: "The price itself
  cannot be upgraded — it is set by the market." **Dropped** (Stage 5).

### Per-stage commands

Run at the end of every stage, from `frontend/`:

```sh
npm run lint:fix     # then fix anything left by hand
npm run build        # vue-tsc --build && vite build; must exit 0
```

Then run `/delta-review` before reporting the stage complete, per `CLAUDE.md`. Once it is
complete, tick the stage's box under [Progress](#progress).

---

## Stage 1 — Foundations: font, tokens, character grid, terminal primitives

**Goal.** The CRT terminal look exists and a static seven-panel production chain renders on a
character grid. No game logic.

### Files

Created:

```
src/assets/fonts/PxPlus_IBM_VGA8.woff2
src/assets/fonts/LICENSE.txt
src/components/terminal/terminal_panel.vue
src/components/terminal/terminal_button.vue
src/components/terminal/section_divider.vue
src/components/terminal/value_row.vue
src/components/terminal/fill_bar.vue
src/components/terminal/numeric_stepper.vue
src/components/terminal/flow_arrow.vue
```

Modified: `index.html`, `src/assets/styles.css`, `src/components/screens/home_screen.vue`,
`CLAUDE.md`.

### The font

`ui_ux.md` §2 makes a CP437 / IBM PC VGA bitmap font mandatory and names **PxPlus IBM VGA8**. It is
not on Google Fonts, so it is self-hosted, and `CLAUDE.md`'s font rule is amended to permit exactly
this one exception (below).

1. Obtain PxPlus IBM VGA8 from VileR's Oldschool PC Font Pack — <https://int10h.org/oldschool-pc-fonts/>
   (download page: `/oldschool-pc-fonts/download/`). Prefer the web-font package and take the
   `.woff2`; if only TrueType is published, take `PxPlus_IBM_VGA8.ttf` and either convert it to
   `.woff2` or ship the `.ttf` and adjust the `@font-face` `format()`. The file is tens of
   kilobytes either way. Verify the actual filename at download time — do not assume it.
2. Take the **PxPlus** variant, not **Px437**. PxPlus carries the extended Unicode coverage this
   UI needs: `█ ▓ ▒ ░` (U+2588, U+2593, U+2592, U+2591) and the box-drawing set (U+2500–U+257F).
3. The pack is licensed **CC BY-SA 4.0**. Write `src/assets/fonts/LICENSE.txt` naming the font,
   its author (VileR), the source URL, and the licence, and stating that the file is unmodified.

`@font-face` goes in `styles.css`, referencing the file with a relative URL from the stylesheet so
Vite fingerprints it into the build.

### `styles.css`

Replace the file. It must contain, in this order:

1. The `@font-face` block.
2. `:root` tokens — take the names from `ui_ux.md` §31 and the values from §4:
   `--bg: #000000`, `--fg: #39ff14`, `--fg-dim: rgba(57, 255, 20, 0.55)`,
   `--fg-faint: rgba(57, 255, 20, 0.25)`, `--fg-disabled: rgba(57, 255, 20, 0.30)`,
   `--border: 1px solid var(--fg)`, the `--space-1` … `--space-5` scale from §31, plus
   `--cell-width: 8px` and `--cell-height: 16px`.
3. The existing universal box-sizing reset and `html, body, #app { height: 100% }`.
4. `body`: `font-family: 'PxPlus IBM VGA8', monospace`, `font-size: 16px`, `line-height: 16px`,
   `background: var(--bg)`, `color: var(--fg)`, `-webkit-font-smoothing: none`,
   `font-smooth: never`, `text-rendering: geometricPrecision`.
5. `:focus-visible` — **not** the browser default. `ui_ux.md` §27 asks for a double border or
   inverted colours. Use `outline: 2px solid var(--fg); outline-offset: 0`.

Delete the two neutral tokens (`--surface-base`, `--ink`) and the IBM Plex Sans family; nothing
should reference them afterwards.

### `index.html`

Remove the Google Fonts `<link>` and the `preconnect` — no font is fetched over the network any
more. Keep the title and description.

### Terminal primitives

All are presentational, take props, own no state beyond focus, and emit events. All use `<script
setup lang="ts">` with `defineProps<...>()` / `defineEmits<...>()` type-only declarations.

| Component         | Props                                                                            | Behaviour                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal_panel`  | `title: string`, `widthCells: number`                                            | 1px `var(--fg)` border, `border-radius: 0`, black background, 8px padding, `width: calc(widthCells * var(--cell-width) + 16px)`. Title centred, uppercase. A `<slot>` for the body. `ui_ux.md` §8.                                                                                                                                                      |
| `section_divider` | `dashed?: boolean`                                                               | A 1px full-width rule in `var(--fg-faint)`; dashed variant per §8.                                                                                                                                                                                                                                                                                      |
| `value_row`       | `label: string`, `value: string`, `dim?: boolean`                                | Label left, value right-aligned, both on one 16px line. This is the only way a label/value pair is ever rendered — `ui_ux.md` §3 wants numeric columns to line up.                                                                                                                                                                                      |
| `terminal_button` | `label: string`, `disabled?: boolean`, `widthCells?: number`                     | A real `<button>`. States per `ui_ux.md` §21: normal green-on-black outline, hover brighter, `:active` and `[aria-pressed="true"]` inverted, disabled `var(--fg-disabled)` with `aria-disabled`. Transitions 0–80 ms (§22). Emits `press`.                                                                                                              |
| `fill_bar`        | `fraction: number`, `cells?: number` (default 10), `marks?: {fraction, glyph}[]` | Renders `cells` characters: `█` for each whole filled cell, `▓` if the remainder ≥ 0.5, `░` for the rest. When `marks` is non-empty, renders a second 16px line beneath, `cells` characters wide, with each mark's glyph placed at index `Math.round(fraction * cells)` clamped to `cells - 1`, spaces elsewhere. The marker line uses `var(--fg-dim)`. |
| `numeric_stepper` | `value: string`, `disabledDown?`, `disabledUp?`                                  | `[-] value [+]` on one line using two `terminal_button`s. Emits `step` with `-1` or `+1`. Hold-to-repeat: after 400 ms, repeat every 80 ms while held (`pointerdown`/`pointerup`/`pointercancel`/`blur`).                                                                                                                                               |
| `flow_arrow`      | none                                                                             | A 24px-wide column containing `→`, vertically centred, `var(--fg-dim)`.                                                                                                                                                                                                                                                                                 |

`fill_bar`'s mark row is the mechanism `ui_ux.md` §10 requires for the Silo and Tank strain
markers. §10 sketches the marks both inline and beneath the bar; **use the row beneath** — an
inline mark overwrites a fill cell and destroys information.

### `home_screen.vue`

A static shell: a full-width row of seven `terminal_panel`s in chain order separated by six
`flow_arrow`s, each panel containing placeholder `value_row`s and a `fill_bar` so the grid can be
judged. `overflow-x: auto` on the row per `ui_ux.md` §26 — the cards never shrink.

### `CLAUDE.md` amendment

Replace the **Fonts** rule with:

> - **Fonts**: The interface font is PxPlus IBM VGA8, the CP437 / IBM VGA bitmap face required by
>   `docs/ui_ux.md` §2. Google Fonts does not serve a faithful CP437 font, so this one is
>   self-hosted in `src/assets/fonts/` with its CC BY-SA 4.0 attribution beside it — it is the
>   only font permitted to live in the repo. Any additional font must come from Google Fonts,
>   served by its CDN via a `<link>` in `index.html`. No font packages in `package.json`.

### Acceptance

- `npm run dev` shows seven bordered panels in one row on a black background in bright green.
- The text is visibly pixelated with hard edges; `█` and `░` render as solid blocks with no gaps
  between adjacent cells.
- No network request for a font (check the Network tab).
- At 1920×1080 the chain fits without a horizontal scrollbar; narrowing the window produces a
  scrollbar rather than shrinking a card.
- Tabbing to a `terminal_button` shows a green outline, never a blue one.

---

## Stage 2 — The engine

**Goal.** A complete, framework-free implementation of every rule in `specs.md`. No Vue imports
anywhere under `src/game/`. No UI.

This stage has no runtime surface. **Stage 3 is its proof — treat the two as a pair and do not
report Stage 2 as verified on its own.**

### Method

Port [`simulator/sim.py`](simulator/sim.py) — specifically the `State` class and the body of
`run()`. It is a verified implementation of `specs.md` and it resolves every ordering question the
prose leaves open. Read it before writing anything.

**What to port:** `State.__init__`, `price`, `startup_energy`, `reserve`, `spendable`, `strains`,
`ceilings`, `cost_of`, `apply`; the helpers `backlog` and `starve`; the entire step body of `run()`
including the wear loop and the stall check; `market_path`.

**What NOT to port:** `settings`, `purchase`, `buy_coal`, `band`, `deliverable`, `income`,
`clone_with`, `sweep`. These are the greedy _policy_ — a design tool for measuring
`TargetEnergy`, not game rules. The player is the policy.

**One trap:** `sim.py`'s `buy_coal` applies a policy-specific floor (`s.reserve()` when the
stockpile is above 20% full) and refuses coal it cannot burn before the timer. Neither is a game
rule. The rule is in `specs.md` §Spendable energy: a coal purchase is limited by
`max(0, Contents − StartupEnergy)` and is automatically reduced to what the player can afford.

### Files

All created, all under `src/game/`:

| File               | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts`     | Every constant from `specs.md`'s tables as one `as const` export per group: `TARGET_ENERGY`, `TIME_LIMIT`, `MAX_SETTING`, `STRAIN_GAIN`, `BACKLOG_THRESHOLD`, `STARVE_THRESHOLD`, `CAPACITY_GROWTH`, `UPGRADE_GAIN`, `MAX_EFFICIENCY`, `RESERVE_FRACTION`, `STARTUP_SECONDS`, `RESTART_MULTIPLE`, `STARTING_CHARGE`, the market group, the three machine groups, the four starting storage capacities, and the upgrade cost table. Each group carries a comment naming its `specs.md` section. Storage capacities in **kg** (Stockpile 1000, Silo 500, Tank 3000) and the Battery in MWh (10).                                                                                                                          |
| `types.ts`         | `MachineId = 'pulverizer' \| 'boiler' \| 'turbine'`; `StorageId = 'stockpile' \| 'silo' \| 'tank' \| 'battery'`; `UpgradeTrackId` (ten members: `${MachineId}_capacity`, `${MachineId}_efficiency`, `${StorageId}_capacity`); `RunOutcome = 'idle' \| 'running' \| 'won' \| 'timeout' \| 'stalled'`; `StressKind = 'temperature' \| 'pressure' \| 'vibration'`. No classes.                                                                                                                                                                                                                                                                                                                                             |
| `random.ts`        | `class Random` — mulberry32, seeded in the constructor. `next(): number` in `[0, 1)`, `uniform(minimum, maximum): number`. No dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `upgrade_track.ts` | `class UpgradeTrack` — constructed with `baseCost` and `costGrowth`; fields `level`; getter `cost` per `specs.md` §Upgrade costs; `purchase(): void` increments `level`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `storage.ts`       | `class Storage` — `contents`, `capacity`, a `UpgradeTrack`; getter `fill` (`contents / capacity`, `0` when capacity ≤ 0); `add(amount)` applying the `min(produced, capacity − contents)` clamp of `specs.md` §Production flow and returning the discarded remainder; `remove(amount)` clamped at 0; `upgradeCapacity()` multiplying by `CAPACITY_GROWTH`.                                                                                                                                                                                                                                                                                                                                                              |
| `machine.ts`       | `abstract class Machine` — `capacity`, `efficiency`, `settingSteps` (integer 0–20), `wear`, `repairRemaining`, `tripCount`, and its capacity + efficiency `UpgradeTrack`s. Getters: `setting` (`settingSteps / 10`), `isTripped`, `output` (`capacity * setting`), `electricConsumption` (0 for the Turbine). Methods taking `strain`: `stress(strain)`, `excess(strain)`, `cleanCeiling(strain)`, `advanceWear(strain, runRatio, deltaSeconds)`. Stress constants (`baseStress`, `stressRange`, `safeStress`, `maxStress`) and wear constants (`wearGrowth`, `wearRecovery`, `repairSeconds`) are `abstract readonly` and supplied by subclasses from `constants.ts`. Formulas: `specs.md` §Setting, stress, and wear. |
| `pulverizer.ts`    | `class Pulverizer extends Machine` — getters `rawCoalConsumption`, `pulverizedOutput`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `boiler.ts`        | `class Boiler extends Machine` — getters `fuelConsumption`, `steamOutput`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `turbine.ts`       | `class Turbine extends Machine` — getters `steamConsumption`, `powerOutput`; `electricConsumption` returns 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `coal_market.ts`   | `class CoalMarket` — constructed with a seed; holds `market` and `elapsedSeconds`; getters `trend`, `price` (MWh per tonne) and `pricePerKilogram` (`price / 1000`); `step(deltaSeconds)` advancing drift, noise and the clamp per `specs.md` §The coal market; a `priceHistory` ring buffer of the last 60 one-second samples for the Stockpile card.                                                                                                                                                                                                                                                                                                                                                                  |
| `energy_ledger.ts` | `class EnergyLedger` — running totals `generated`, `discarded`, `machineUse`, `coalCost`, `upgradeSpend`, plus `peakContents`, and rolling series for the Power Summary: `netFlowHistory` (60 one-second samples), `averageNetFlow`, `peakNetFlow`. Exists so Stage 3 can assert conservation and Stage 9 can render §18 and §19 without recomputation.                                                                                                                                                                                                                                                                                                                                                                 |
| `game_engine.ts`   | `class GameEngine` — everything below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### `GameEngine` public surface

Implement exactly this. Later stages depend on these names.

```ts
class GameEngine {
  constructor(seed: number);

  // state, all readonly to callers
  get elapsedSeconds(): number;
  get remainingSeconds(): number;
  get outcome(): RunOutcome;
  readonly stockpile: Storage;
  readonly silo: Storage;
  readonly tank: Storage;
  readonly battery: Storage;
  readonly pulverizer: Pulverizer;
  readonly boiler: Boiler;
  readonly turbine: Turbine;
  readonly market: CoalMarket;
  readonly ledger: EnergyLedger;

  // derived, per specs.md §Spendable energy
  get startupEnergy(): number;
  get minimumReserve(): number;
  get spendableEnergy(): number;
  get coalBudget(): number; // max(0, battery.contents - startupEnergy)

  // strain, per specs.md §Buffers and strain
  get pulverizerStrain(): number;
  get boilerStrain(): number;
  get turbineStrain(): number;

  // simulation
  start(): void; // idle -> running
  step(deltaSeconds: number): void; // no-op unless running

  // player actions
  setSettingSteps(machine: MachineId, steps: number): void; // clamped 0..20
  buyCoal(kilograms: number): number; // returns kg actually bought
  upgradeCost(track: UpgradeTrackId): number;
  canAfford(track: UpgradeTrackId): boolean;
  purchaseUpgrade(track: UpgradeTrackId): boolean;
}
```

`step` takes `deltaSeconds` rather than reading a constant so Stage 3 can run the same engine at
several step sizes. Production always passes `DeltaTimeSeconds`.

### Step order

Follow `run()` in `sim.py` exactly. In particular:

1. Advance the market to the current time **before** anything reads the price.
2. Compute every machine's requested rates from start-of-step state.
3. `ElectricityRatio` from the summed request of the Pulverizer and Boiler, **excluding tripped
   machines**, against start-of-step Battery contents.
4. `RunRatio` per machine as `min(InputRatio, ElectricityRatio)`; the Turbine has no electricity
   term; a tripped machine is 0.
5. Read all three strains **before** any storage write.
6. Apply storage writes, all from start-of-step contents.
7. Advance wear for all three machines, then decrement `repairRemaining` on already-tripped
   machines, then trip any machine whose wear reached 1. The trip and the decrement are mutually
   exclusive in the same step — see the `if/elif` in `sim.py`.
8. Advance the clock, update `ledger.peakContents`.
9. Check outcomes in this order: **stall** (`specs.md` §Stalling), then **win**
   (`battery.contents >= TARGET_ENERGY`), then **timeout** (`elapsedSeconds >= TIME_LIMIT`).

### Determinism

`Random` is mulberry32 so the market is reproducible **within this implementation**. It will not
reproduce `sim.py`'s price path for the same seed, because that would require Python's Mersenne
Twister. Cross-language per-seed parity is an explicit non-goal — say so in a comment on
`CoalMarket`, mirroring how `simulator/README.md` states its own non-claims.

### `CLAUDE.md` amendment

Extend the **Economy changes** rule so the new constants file is kept in sync:

> - **Economy changes**: After changing any gameplay constant in `docs/specs.md`, update the
>   matching constant in `src/game/constants.ts` **and** in `simulator/sim.py`, run
>   `simulator/verify.py` (it checks the opening state against the spec's tables), then re-measure
>   `TargetEnergy` with `simulator/measure.py`.

### Acceptance

- `npm run build` exits 0.
- `grep -r "vue" src/game/` returns nothing.
- Every constant in `constants.ts` has been checked one by one against the tables in `specs.md`.
- The `buy_coal` trap above was not copied.

---

## Stage 3 — Verification screen

**Goal.** A development-only screen that proves the engine matches `specs.md`, porting the intent
of [`simulator/verify.py`](simulator/verify.py).

`verify.py`'s checks 4, 5 and 6 are driven by its greedy policy. Those three properties belong to
the **engine**, not to any policy — energy must be conserved under _any_ input sequence — so here
they are driven by a fixed deterministic script instead. The policy is not ported.

### Files

Created: `src/game/scripted_run.ts`, `src/components/screens/verify_screen.vue`.
Modified: `src/router.ts`.

### `scripted_run.ts`

```ts
interface ScriptedRunResult {
  engine: GameEngine;
  residual: number; // conservation residual, must be 0
  worstReserveGap: number; // max(startupEnergy - minimumReserve) seen, must be <= 0
}

function runScript(seed: number, deltaSeconds: number): ScriptedRunResult;
```

The script is fixed, deterministic and exercises every subsystem. Once per simulated second, in
this order:

1. At `t = 0`, set all three machines to 6 steps (0.6).
2. Buy coal to fill the Stockpile, limited by `coalBudget`.
3. Every 30 s, attempt one upgrade, cycling through all ten tracks in a fixed order, skipping any
   the player cannot afford.
4. At `t = 120`, raise all three machines to 18 steps (1.8) — deliberately into the wear band, so
   trips and repairs are exercised.
5. At `t = 300`, drop all three to 4 steps (0.4), so wear recovery is exercised.

Track `worstReserveGap` every step. Compute `residual` at the end as
`(STARTING_CHARGE + ledger.generated) − (battery.contents + ledger.machineUse + ledger.coalCost +
ledger.upgradeSpend)`.

### `verify_screen.vue`

Renders a `<pre>`-style report in the terminal font: one line per check,
`ok  <name>  got <value>  spec <value>`, `FAIL` where it does not hold, and a final
`ALL CHECKS PASSED` or `FAILED: <names>`. Runs synchronously on mount. Checks, in order:

| Group            | Checks                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening state    | The 15 rows of `verify.py`'s `SPEC_OPENING`, at the starting Setting of 0.6, tolerance `max(0.005, 0.002 × expected)`. Take the expected values from the tables in `specs.md`, not from this plan.   |
| Clean ceilings   | The 3 machines × {slack store, fully strained}, tolerance 0.002. Build one state per machine as `verify.py`'s `at()` does — no single state strains all three.                                       |
| Max stress       | Each machine's stress at `MaxSetting` with a slack store equals its `MaxTemperature` / `MaxPressure` / `MaxVibration`, tolerance 0.05.                                                               |
| Energy balance   | `runScript(1, 0.1).residual` is 0 within `1e-6`.                                                                                                                                                     |
| Step convergence | `runScript` over seeds 0–15 at `dt ∈ {0.2, 0.1, 0.05}`: the relative spread of the median peak is ≤ 0.06 and of total upgrade levels ≤ 0.02. Report `dt = 0.4` for contrast without asserting on it. |
| Restart floor    | `worstReserveGap ≤ 0` across seeds 0–11 at `dt = 0.1`. This is `specs.md`'s guarantee that `MinimumReserve` never sinks below a restart.                                                             |
| Stall            | A purpose-built run — all machines at 0.6 with the Turbine at 0 and no coal purchased — reaches `outcome === 'stalled'` before the timer.                                                            |
| Market bounds    | Over a 600 s walk, `Market` never leaves `[1 − MarketRange, 1 + MarketRange]`, and its mean over 32 seeds is within 2% of 1.                                                                         |

### Routing

Add the route only in development, so it cannot ship:

```ts
if (import.meta.env.DEV) {
  router.addRoute({
    path: "/verify",
    name: "verify",
    component: () => import("@/components/screens/verify_screen.vue"),
  });
}
```

A dynamic import keeps the screen out of the production bundle.

### Acceptance

- `npm run dev` then `/verify` shows every check `ok` and `ALL CHECKS PASSED`.
- `npm run build` produces no chunk containing `verify_screen`.
- If any check fails, **fix the engine, not the check.** A tolerance is only widened with a written
  reason.

---

## Stage 4 — Loop, view model, run lifecycle

**Goal.** The engine runs in real time behind an immutable view model, and a run can be started,
won, lost and restarted.

### Files

Created: `src/view/view_model.ts`, `src/view/formatting.ts`, `src/view/use_game.ts`,
`src/components/game/run_overlay.vue`.
Modified: `src/components/screens/home_screen.vue`.

### `formatting.ts`

Pure functions, no state. Values are right-aligned by the consuming component; these produce the
text only.

| Function                         | Rule                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| `formatTime(seconds)`            | `MM:SS`, zero-padded.                                                  |
| `formatEnergy(mwh)`              | 2 decimals below 10, otherwise 1.                                      |
| `formatPower(mw, signed?)`       | 2 decimals below 10, otherwise 1. `signed` prefixes `+` when positive. |
| `formatMass(kilograms)`          | Converts to tonnes: 2 decimals below 10 t, otherwise 1.                |
| `formatRate(kilogramsPerSecond)` | 2 decimals.                                                            |
| `formatPrice(mwhPerTonne)`       | 2 decimals.                                                            |
| `formatSetting(setting)`         | 1 decimal.                                                             |
| `formatEfficiency(efficiency)`   | 2 decimals.                                                            |
| `formatPercent(fraction)`        | Rounded integer, no `%` sign (the caller adds it).                     |
| `formatSeconds(seconds)`         | Rounded integer.                                                       |

### `view_model.ts`

Exports the `GameView` type tree and one pure function `buildGameView(engine: GameEngine):
GameView`. It reads the engine and returns a **new plain object every call** — no getters, no
references back into engine instances, no class instances. Components must never be able to reach
the engine.

Shape (fields are already-formatted strings where they are displayed verbatim, and raw numbers
where a component needs to compute geometry such as a bar width):

```ts
interface GameView {
  outcome: RunOutcome;
  elapsedSeconds: number;
  timeText: string; // MM:SS remaining
  target: { storedText: string; targetText: string; fraction: number };
  bestResultText: string | null;
  stockpile: StockpileView;
  silo: BufferView;
  tank: BufferView;
  battery: BatteryView;
  pulverizer: MachineView;
  boiler: MachineView;
  turbine: MachineView;
  power: PowerView;
  alerts: AlertView[];
}

interface StorageViewBase {
  title: string;
  storedText: string; // "0.70 / 1.00 t"
  fraction: number;
  fillPercentText: string;
  upgradeCostText: string;
  upgradeAffordable: boolean;
}

interface StockpileView extends StorageViewBase {
  priceText: string;
  priceHistory: number[]; // last 60 one-second samples
  purchaseKilograms: number; // the stepper's current amount, owned by use_game
  purchaseAmountText: string;
  purchaseCostText: string;
  purchaseAffordable: boolean;
}

interface BufferView extends StorageViewBase {
  marks: { fraction: number; glyph: string }[]; // Silo: backlog. Tank: starve + backlog.
}

interface BatteryView extends StorageViewBase {
  spendableText: string;
  reservedText: string;
  netFlowText: string;
}

interface MachineView {
  title: string;
  capacityText: string;
  efficiencyText: string;
  settingText: string;
  settingSteps: number;
  stressLabel: string; // TEMP | PRESSURE | VIBRATION
  stressText: string; // value with unit
  stressFraction: number; // clamp(stress / maxStress, 0, 1)
  safeFraction: number; // safeStress / maxStress
  cleanToText: string; // live, including strain
  wearFraction: number;
  wearPercentText: string;
  wearNoteText: string; // "TRIPS IN 12S" | "CLEARS IN 40S" | "CLEAN"
  outputText: string;
  repairText: string | null; // "REPAIR 34S" while tripped; replaces the output row
  capacityUpgradeCostText: string;
  capacityUpgradeAffordable: boolean;
  efficiencyUpgradeCostText: string;
  efficiencyUpgradeAffordable: boolean;
}

interface PowerView {
  generationText: string;
  consumptionText: string;
  netFlowText: string;
  averageText: string;
  peakText: string;
  netFlowHistory: number[];
}

interface AlertView {
  text: string;
  urgent: boolean;
}
```

`wearNoteText` and `repairText` come from the engine's current wear rate: time to a trip is
`(1 − wear) / wearRate` when the rate is positive, time to clear is `wear / wearRecovery` when it
is negative. `cleanToText` uses the **strained** ceiling, per `ui_ux.md` §12 — it is a live value
and must move as the neighbouring store moves.

Leave `alerts` as an empty array in this stage; Stage 9 fills it.

### `use_game.ts`

One composable, `useGame()`. It owns:

- A `GameEngine` instance and a `shallowRef<GameView>`.
- The `requestAnimationFrame` loop with a fixed-step accumulator: add the frame delta, consume
  whole `DeltaTimeSeconds` steps, clamp the accumulated time to 0.25 s before consuming, then
  rebuild the view model **once** and assign it to the `shallowRef`. Never rebuild per step.
- `document.visibilitychange`: on hidden, stop consuming time and reset the accumulator; on
  visible, resume. Registered in `onMounted`, removed in `onUnmounted`.
- The Stockpile purchase amount (steps of 100 kg, clamped to remaining capacity), since it is UI
  state and not engine state.
- Best result: read from `localStorage` on mount; on a run ending, write
  `max(previous, ledger.peakContents)`.
- Actions forwarded to the engine: `startRun()`, `newRun()` (constructs a fresh `GameEngine` with a
  fresh seed), `stepSetting(machine, direction)`, `stepPurchaseAmount(direction)`,
  `fillPurchaseAmount()`, `buyCoal()`, `purchaseUpgrade(track)`.

The loop must stop scheduling frames once `outcome` is not `'running'`.

### `run_overlay.vue`

A centred `terminal_panel` over a dimmed chain, driven by `outcome`:

| `outcome` | Title            | Body                                                             | Button      |
| --------- | ---------------- | ---------------------------------------------------------------- | ----------- |
| `idle`    | `OVERPOWERED`    | Objective line, the target, the time limit, and the best result. | `START RUN` |
| `won`     | `TARGET REACHED` | Time taken, peak stored energy, best result.                     | `NEW RUN`   |
| `timeout` | `TIME EXPIRED`   | Peak stored energy, best result.                                 | `NEW RUN`   |
| `stalled` | `PLANT STALLED`  | A line naming why (`specs.md` §Stalling), peak, best result.     | `NEW RUN`   |

Not shown while `running`. The button is auto-focused so Enter works immediately.

### Acceptance

- Pressing `START RUN` starts a 600 s countdown that runs in real time.
- The Battery drains at the opening Settings with an empty chain, then recovers once coal is
  bought — matching `specs.md`'s account of the opening.
- Backgrounding the tab for 30 s and returning does not consume 30 s of run time.
- Reaching `TargetEnergy` shows `TARGET REACHED` instantly, not at the next second boundary.
- The best result survives a page reload.

---

## Stage 5 — Storage cards

**Goal.** The Stockpile, Silo and Tank render real data and the Stockpile's controls work.

### Files

Created: `src/components/game/production_chain.vue`, `src/components/game/stockpile_card.vue`,
`src/components/game/buffer_card.vue`, `src/components/game/price_history.vue`.
Modified: `src/components/screens/home_screen.vue`, `docs/ui_ux.md`.

`buffer_card.vue` serves both the Silo and the Tank — `ui_ux.md` §10 draws them as one card type,
differing only in their marks.

### Layout

`production_chain.vue` owns the seven-slot row and the six `flow_arrow`s, takes the whole
`GameView` as a prop, and emits every player action upward. Card order is
`specs.md`'s: Stockpile → Pulverizer → Silo → Boiler → Tank → Turbine → Battery. Machine and
Battery slots hold placeholders until Stages 6 and 7.

### `stockpile_card.vue`

Per `ui_ux.md` §11, minus the dropped `[COAL PRICE]` upgrade:

```
STOCKPILE
[icon slot — empty until Stage 8]
────────────────────────────
STORED       0.70 / 1.00 t
███████░░░  (70%)
COAL PRICE   1.00 MWh/t
[price history sparkline]
[-]  0.5 t  [+]      [FILL]
[      BUY: 0.50 MWh      ]
- - - - - - - - - - - - - -
UPGRADES
[     CAPACITY: 0.02      ]
```

- The stepper moves the purchase amount by 0.1 t, clamped to `[0, capacity − contents]`.
- `FILL` sets the amount to `min(capacity − contents, coalBudget / pricePerKilogram)` — the largest
  purchase that is both storable and affordable.
- `BUY` is disabled when the amount is 0 or the cost exceeds `coalBudget`. Its label always shows
  the cost of the currently selected amount.
- `CAPACITY` is disabled when its cost exceeds `spendableEnergy` (`specs.md` §Spendable energy —
  upgrades are limited by `SpendableEnergy`, coal by `StartupEnergy`; these are different floors
  and must not be conflated).

`price_history.vue` renders the 60-sample series as a single 24-cell line of CP437 block glyphs
(`▁▂▃▄▅▆▇█` mapped over the min–max range of the window) followed by `▲` or `▼` for the direction
of the last sample, as sketched in `specs.md` §UI.

### `buffer_card.vue`

Props: `view: BufferView`. Renders title, stored text, a `fill_bar` with `marks`, the fill
percentage, and the capacity upgrade button. The marks come from the view model:

- Silo: one mark at `BacklogThreshold`, glyph `╷`.
- Tank: `StarveThreshold` glyph `╵`, `BacklogThreshold` glyph `╷`.

Beneath the mark row, a single dim legend line: `╵starve ╷backlog` on the Tank, `╷backlog` on the
Silo. `ui_ux.md` §10 requires the marks; without a legend they are unexplained.

### `docs/ui_ux.md` correction

In §11, remove `[ COAL PRICE ]` from the Stockpile's upgrade list and add a one-line note that
`specs.md` makes the price non-upgradable.

### Acceptance

- Buying coal reduces the Battery by exactly the displayed cost and raises the Stockpile by the
  displayed amount.
- With the Battery at `MinimumReserve`, `CAPACITY` is disabled but `BUY` is not — the two floors
  behave differently, as `specs.md` intends.
- Running the plant drives the Silo past 70%; the mark sits at the point where the fill crosses it.
- The Tank's two marks sit at 30% and 70% of the bar and stay there when Tank capacity is upgraded.

---

## Stage 6 — Machine cards

**Goal.** All three machines render and are controllable, with a live stress gauge and wear
readout.

### Files

Created: `src/components/game/machine_card.vue`, `src/components/terminal/stress_gauge.vue`.
Modified: `src/components/game/production_chain.vue`, `docs/ui_ux.md`.

### `stress_gauge.vue`

Props: `label: string`, `valueText: string`, `fraction: number`, `safeFraction: number`.
Per `ui_ux.md` §14: a 20-cell outlined horizontal bar, `SAFE` label left, `MAX` right, a fill in
`█`, and a `|` marker at `safeFraction`. **The fill is pegged at the right-hand end** — a strained
machine reads past `MaxStress` and must not overflow the gauge. No circular gauge, no gradient,
no second colour.

### `machine_card.vue`

Props: `view: MachineView`. One component for all three; the differences (`TEMP` / `PRESSURE` /
`VIBRATION`, units, output unit) arrive through the view model.

```
PULVERIZER
[icon slot — empty until Stage 8]
──────────────────────────────
CAPACITY        8.0 kg/s
EFFICIENCY          0.70
SETTING      [-] 0.6 [+]
──────────────────────────────
TEMP (°C)
SAFE            MAX
██████████|████░░░░░
STRESS              66.0
CLEAN TO            0.67
WEAR   ███░░░░░░░    31%
       TRIPS IN 12S
OUTPUT      4.80 kg/s
- - - - - - - - - - - - - -
UPGRADES
[    CAPACITY: 0.02     ]
[  EFFICIENCY: 0.05     ]
```

The two upgrade buttons sit in their own bottom section, as `ui_ux.md` §12's generic layout puts
them, rather than on the `CAPACITY` and `EFFICIENCY` rows — at 30 cells a four-digit capacity and
an inline button do not both fit.

- `SETTING` uses `numeric_stepper`, one press = 0.1, range 0.0–2.0. Disabled down at 0, up at 2.0.
- `CLEAN TO` is the strained ceiling and must visibly fall as the neighbouring store approaches its
  threshold (`ui_ux.md` §12). Render it live.
- The wear bar is a 10-cell `fill_bar`. The note line beneath shows `TRIPS IN {n}S` while wear is
  growing, `CLEARS IN {n}S` while it is shedding, and `CLEAN` at zero wear.
- While tripped, the `OUTPUT` row is replaced by `REPAIR {n}S` and the card border is rendered
  inverted (black on green) — `ui_ux.md` §28 forbids signalling state by brightness alone.
- Both upgrade buttons are disabled when their cost exceeds `spendableEnergy`.

### `docs/ui_ux.md` correction

Remove the `PENALTY -7%` row from the §12 layout sketch and from the §14 example, and add a note
that `specs.md` levies no output penalty for exceeding the rating — the cost is wear.

### Acceptance

- At the opening state the Turbine shows a Vibration of 9.1 against a `SafeVibration` of 6 and its
  wear climbs, exactly as `specs.md` describes the run's first decision.
- Dropping the Turbine's Setting until steam banks clears its wear to zero.
- Filling the Silo past 70% visibly lowers the Pulverizer's `CLEAN TO` without the player touching
  its throttle.
- Driving a machine to wear 1.0 trips it: output is replaced by a countdown, it produces and
  consumes nothing, and it resumes at the same Setting with wear reduced by exactly
  `RepairSeconds × WearRecovery`.

---

## Stage 7 — Battery card and run header

**Goal.** The two components that answer the invest-or-bank question.

### Files

Created: `src/components/game/battery_card.vue`, `src/components/game/run_header.vue`.
Modified: `src/components/screens/home_screen.vue`,
`src/components/game/production_chain.vue`.

### `run_header.vue`

Per `ui_ux.md` §6: `OVERPOWERED` at 32px on the left, `TIME MM:SS` centred, stored energy against
`TargetEnergy` on the right with a 24-cell `fill_bar` beneath it. Full width, compact, no logo.
The header is outside `production_chain` and always visible.

### `battery_card.vue`

Per `ui_ux.md` §15 and `specs.md` §UI:

```
BATTERY
[icon slot]
──────────────────────
STORED   12.4 / 40 MWh
██████░░░░  (31%)
SPENDABLE     11.4 MWh
RESERVED       1.0 MWh
──────────────────────
NET FLOW      +25.0 MW
──────────────────────
UPGRADES
[    CAPACITY: 0.02   ]
```

`RESERVED` is `MinimumReserve` and it moves once `StartupEnergy × RestartMultiple` overtakes
`Capacity × ReserveFraction` — `specs.md` §Spendable energy explicitly requires the player to be
able to watch it move. Do not render it as a constant.

`NET FLOW` is signed and uses the same green as everything else — `ui_ux.md` §15 forbids an accent
colour.

### Acceptance

- `SPENDABLE + RESERVED` equals `STORED` whenever stored energy is above the reserve, and
  `SPENDABLE` reads 0 below it.
- Raising machine Settings far above the Battery's size makes `RESERVED` grow.
- The header progress bar reaches full exactly when the win overlay appears.

---

## Stage 8 — SVG icons

**Goal.** Seven line-drawing equipment icons, per `ui_ux.md` §9.

### Files

Created, one component each:

```
src/components/icons/stockpile_icon.vue
src/components/icons/pulverizer_icon.vue
src/components/icons/silo_icon.vue
src/components/icons/boiler_icon.vue
src/components/icons/tank_icon.vue
src/components/icons/turbine_icon.vue
src/components/icons/battery_icon.vue
```

Modified: the four card components, to fill their icon slots.

### Rules

Inline `<svg>`, no external files, `viewBox="0 0 64 48"`, rendered at 64×48 CSS pixels (whole
multiples of the 8×16 cell). Every path: `fill: none`, `stroke: currentColor`,
`stroke-width: 1.5`, `stroke-linecap: square`, `stroke-linejoin: round`. Inherit colour via
`currentColor` so the icon follows the card, including the inverted tripped state. Each icon
carries `role="img"` and an `<title>` naming the component.

Draw them as simplified engineering diagrams — a conveyor and a heap, a crusher drum with a feed
chute, a cylindrical silo with a conical base, a fire-tube boiler with a stack, a horizontal
pressure vessel with saddles, a turbine rotor with blades and a shaft, a cell with terminals. No
shading, no perspective, no gradient, no fill.

### Acceptance

- Every icon is legible at 64×48 and its outline still reads at 32×24.
- Icons turn black when a tripped machine card inverts, with no CSS changes to the icon itself.
- No `<img>`, no data URI, no file under `public/`.

---

## Stage 9 — Lower dashboard

**Goal.** The secondary information area of `ui_ux.md` §17–§20.

### Files

Created: `src/components/game/secondary_dashboard.vue`, `src/components/game/power_summary.vue`,
`src/components/game/net_flow_graph.vue`, `src/components/game/alerts_panel.vue`,
`src/components/terminal/alert_message.vue`.
Modified: `src/view/view_model.ts` (fill `alerts`), `src/components/screens/home_screen.vue`.

Shorter height and the same 16px type as the chain, laid out so it does not compete with it
(`ui_ux.md` §17).

### `power_summary.vue`

`ui_ux.md` §18: `GENERATION`, `CONSUMPTION`, a rule, `NET FLOW`, then `AVERAGE` and `PEAK`.
Generation is the Turbine's actual output after `RunRatio`; consumption is the Pulverizer's plus
the Boiler's actual draw. All from `EnergyLedger`; the component computes nothing.

### `net_flow_graph.vue`

An inline SVG line chart of the last 60 seconds of net flow: green polyline, `var(--fg-faint)`
grid, no area fill, no gradient, square corners, axis labels in the bitmap font.

**A deliberate departure:** §19 sketches the graph in box-drawing characters. A real-time ASCII
line chart quantises to whole cells and jitters badly at this update rate. The SVG satisfies every
_rule_ §19 states (green line, faint grid, no fill, minimal labels, instrument-like) while staying
readable. If a character-cell chart is preferred, this is the one component to change.

Y-axis auto-scales to the window's min and max with zero always included, so the sign of net flow
is always visible.

### `alerts_panel.vue` and alerts

`ui_ux.md` §20. `NO ALERTS` when the list is empty. Built in `view_model.ts` in this priority
order; `urgent` alerts blink or invert (never a new colour, §20):

| Condition                           | Text                | Urgent |
| ----------------------------------- | ------------------- | ------ |
| Machine tripped                     | `<MACHINE> TRIPPED` | yes    |
| Battery contents ≤ `MinimumReserve` | `LOW BATTERY`       | yes    |
| `Excess > 0` on the Pulverizer      | `HIGH TEMPERATURE`  | no     |
| `Excess > 0` on the Boiler          | `HIGH PRESSURE`     | no     |
| `Excess > 0` on the Turbine         | `HIGH VIBRATION`    | no     |
| Tank fill ≤ `StarveThreshold`       | `TANK LOW`          | no     |
| Tank fill ≥ `BacklogThreshold`      | `TANK FULL`         | no     |
| Silo fill ≥ `BacklogThreshold`      | `SILO FULL`         | no     |
| Stockpile contents = 0              | `STOCKPILE EMPTY`   | no     |

`SILO FULL`, `TANK FULL` and `TANK LOW` fire on the **strain thresholds**, not on the store
actually reaching an end — `ui_ux.md` §20 is explicit that this is the point at which they start
costing the player something.

### Acceptance

- `GENERATION − CONSUMPTION` equals the Battery card's `NET FLOW` at all times.
- The graph's line crosses its zero axis exactly when the Battery stops charging.
- Backing the Silo up past 70% raises `SILO FULL` at the same instant the Pulverizer's `CLEAN TO`
  starts falling.
- With nothing wrong, the panel reads `NO ALERTS`.

---

## Stage 10 — Keyboard, focus, accessibility

**Goal.** The interface is fully operable from the keyboard and states are never signalled by
brightness alone. `ui_ux.md` §27–§28.

### Files

Modified: the terminal primitives, `machine_card.vue`, `stockpile_card.vue`, `run_overlay.vue`,
`src/assets/styles.css`.

### Work

- Every control is a real `<button>` in a sensible DOM order, so Tab order follows the chain
  left to right and top to bottom within a card. No `tabindex` above 0.
- Focused `numeric_stepper`: `ArrowUp` / `ArrowRight` / `+` step up, `ArrowDown` / `ArrowLeft` /
  `-` step down. `Enter` activates a focused button. `Escape` is reserved for a future modal.
- Focus is a 2px solid green outline everywhere, never the browser default.
- Disabled buttons carry `aria-disabled="true"` and dim green text, **and** their label reads
  `CAPACITY: 0.03` unchanged, so a player can see the price they cannot pay rather than a
  greyed-out mystery.
- The tripped state is signalled by an inverted border _and_ the `REPAIR {n}S` text, never by
  brightness alone.
- Each card is a `<section>` with an `aria-label`; the chain is a `<nav>`-free plain region with
  an `aria-label` of `PRODUCTION CHAIN`.
- Live regions: the alerts panel is `aria-live="polite"`; the run overlay is `role="dialog"` with
  `aria-modal="true"` and focus moved to its button on open.
- `prefers-reduced-motion: reduce` disables the alert blink.

### Acceptance

- A full run can be played without touching the mouse.
- Every focusable element shows a visible green focus ring.
- No state in the interface is distinguishable only by how bright it is.

---

## Stage 11 — Optional polish

**Goal.** The subtle CRT layer and an options panel. `ui_ux.md` §24 and §28. **This stage may be
skipped** — the game is complete without it, and §33 is explicit that CRT effects come last.

### Files

Created: `src/components/game/crt_overlay.vue`, `src/components/game/options_panel.vue`,
`src/view/use_options.ts`.
Modified: `src/assets/styles.css`, `src/components/screens/home_screen.vue`.

### Work

- `crt_overlay.vue`: a fixed, `pointer-events: none` element with the repeating-linear-gradient
  scanline from `ui_ux.md` §24, plus `text-shadow: 0 0 2px currentColor` applied to the app root.
  Both must stay subtle enough that no text becomes harder to read.
- `options_panel.vue`: a small panel toggled from the run overlay, with CRT effects on/off,
  glow on/off, and reduced animation. Persisted in `localStorage` under
  `overpowered.options`. Defaults: CRT on, glow on, animation normal.
- Sound is **out of scope**. If it is added later, generate it with the Web Audio API — short
  square-wave blips for button presses and a lower tone for a trip. No audio files: the repo has
  no asset pipeline and `CLAUDE.md` has no rule permitting one.

### Acceptance

- Turning CRT effects off removes every overlay and shadow, leaving flat green on black.
- Options survive a reload.
- Text legibility is unchanged with effects on.

---

## Documentation to update

Do these in the stage that causes them, not at the end:

| Document        | Change                                                                                                                                  | Stage                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `CLAUDE.md`     | Font rule amended to permit the self-hosted PxPlus IBM VGA8.                                                                            | 1                                |
| `CLAUDE.md`     | Economy rule extended to include `src/game/constants.ts`.                                                                               | 2                                |
| `CLAUDE.md`     | Project section rewritten — `src/` is no longer a blank slate. Describe `game/`, `view/`, `components/`, and the dev-only verify route. | 11 (or the last stage completed) |
| `docs/ui_ux.md` | §11: drop the `[COAL PRICE]` upgrade.                                                                                                   | 5                                |
| `docs/ui_ux.md` | §12 and §14: drop the `PENALTY` row.                                                                                                    | 6                                |
| `docs/ui_ux.md` | §19: note that the net-flow graph ships as SVG rather than character cells, and why.                                                    | 9                                |

`docs/specs.md` is **not** modified by this plan — no gameplay constant changes, so `simulator/`
is untouched too.

## What this plan deliberately does not do

- **No test suite.** `CLAUDE.md` rules it out by design. The verification screen (Stage 3) covers
  the engine's structural properties; TypeScript and the type-aware lint rules cover the rest.
- **No cross-language determinism.** A seed reproduces a run within this implementation only, not
  against `sim.py`. See Stage 2.
- **No difficulty settings, no tutorial, no save/resume mid-run, no leaderboard.** None appear in
  either specification. Only the single best result persists.
- **The matched-chain ratio is never surfaced**, per `specs.md` §Oversupply and the matched chain —
  the stores report the symptom, the UI never names the ratio. With the Setting granularity pinned
  at 0.1 the exact ratio (0.791 : 0.886 : 1) is unreachable anyway; 0.8 : 0.9 : 1 is the closest
  the player can hold, which leaves a small permanent discard. That is intended, not a bug.
