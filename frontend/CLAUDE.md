## Project

The frontend of Overpowered (Vite + Vue 3, TypeScript, Composition API with `<script setup>`, ESLint + @stylistic + type-aware typescript-eslint via @vue/eslint-config-typescript).

`src/` is layered, and the layers only ever talk downwards (`docs/ui_ux.md` §29):

- `game/` — the simulation. Framework-free TypeScript that owns all state and every rule in `docs/specs.md`, and imports nothing from Vue. `game_engine.ts` is the whole public surface; `constants.ts` holds every number the spec fixes.
- `view/` — the seam. `use_game.ts` drives the engine with a fixed-step accumulator off `requestAnimationFrame` and publishes an immutable view model (`view_model.ts`, formatted by `formatting.ts`) into a `shallowRef` once per frame. `use_options.ts` owns the display options, which are not part of a run.
- `components/terminal/` — presentational primitives: panel, button, divider, value row, fill bar, stepper, stress gauge, alert line, arrow. They take props and emit intent.
- `components/game/` — the cards built from those primitives, plus the run header, the lower dashboard, and the two overlays. No component computes a gameplay rule.
- `components/screens/` — `home_screen.vue`, the only screen. `verify_screen.vue` is a development tool that asserts the engine against `docs/specs.md`; `router.ts` adds its `/verify` route under `import.meta.env.DEV` only, behind a dynamic import, so it never reaches the bundle.

`docs/plan.md` is the staged build order this implementation followed, and records the decisions the two specs left open.

## Reference Docs

- `docs/specs.md` — the game design: objective, production chain, simulation rules, economy, component parameters, and UI. The source of truth for all gameplay values.
- `docs/ui_ux.md` — the interface design: CRT terminal visual direction, typography, color system, layout, per-card specs, interaction timing, and accessibility. The source of truth for all UI decisions. Read when building or changing UI.
- `docs/mockup.png` — a rendered prototype mockup of the interface. A reference for the intended feel, not a target: it is not pixel-authoritative and diverges from the spec in known places. See [Reference Mockup](docs/ui_ux.md#reference-mockup) before using it.
- `docs/typescript.md` — style, naming, imports. Read when editing TypeScript files.
- `simulator/` — a Python reference implementation of `docs/specs.md`, used to measure `TargetEnergy`. A design tool, not application code: no dependencies, and nothing the frontend builds, lints, or ships. See `simulator/README.md`.

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm run build` (typechecks first) and fix any failures, then run `/delta-review` before responding.
- **No test suite**: This project has no tests by design. TypeScript and the type-aware lint rules are the safety net — do not weaken `strict` or `noUncheckedIndexedAccess`, and do not add `any` to silence an error.
- **Fonts**: The interface font is PxPlus IBM VGA8, the CP437 / IBM VGA bitmap face required by `docs/ui_ux.md` §2. Google Fonts does not serve a faithful CP437 font, so this one is self-hosted in `src/assets/fonts/` with its CC BY-SA 4.0 attribution beside it — it is the only font permitted to live in the repo. Any additional font must come from Google Fonts, served by its CDN via a `<link>` in `index.html`. No font packages in `package.json`.
- **Images**: The seven equipment drawings in `src/assets/icons/` are the only images in the repo. They are supplied artwork, used as drawn: do not enlarge them, do not re-cut them as SVG, and do not add more raster assets — see `docs/ui_ux.md` §9, which the PNG decision overrode. They are imported by `components/game/equipment_icon.vue` so Vite fingerprints them; nothing goes in `public/`.
- **TypeScript projects**: `tsconfig.json` only references `tsconfig.app.json` (browser, `src/`, extends `@vue/tsconfig/tsconfig.dom.json`) and `tsconfig.node.json` (`vite.config.ts`, extends `@tsconfig/node24`). An option the two bases don't already cover must be set in both.
- **Build output**: `npm run build` writes into `../backend/public`, the directory Firebase Hosting serves, and empties it first. Routing is history mode, which relies on the catch-all rewrite in `../backend/firebase.json`.
- **Economy changes**: After changing any gameplay constant in `docs/specs.md`, update the matching constant in `src/game/constants.ts` **and** in `simulator/sim.py`, run `simulator/verify.py` (it checks the opening state against the spec's tables), then re-measure `TargetEnergy` with `simulator/measure.py`.
- **Doc Maintenance**: After changes, check if `CLAUDE.md`, `docs/specs.md`, `docs/ui_ux.md`, and `docs/typescript.md` need updating.
