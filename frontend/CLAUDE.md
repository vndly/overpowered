## Project

The frontend of Overpowered (Vite + Vue 3, TypeScript, Composition API with `<script setup>`, ESLint + @stylistic + type-aware typescript-eslint via @vue/eslint-config-typescript).

`src/` is a blank slate — the application code was removed and not yet rewritten. What remains is scaffolding: `main.ts` mounts `app.vue`, `router.ts` serves one empty screen (`components/screens/home_screen.vue`) at `/`, and `assets/styles.css` holds the reset plus two neutral tokens.

## Reference Docs

- `docs/specs.md` — the game design: objective, production chain, simulation rules, economy, component parameters, and UI. The source of truth for all gameplay values.
- `docs/ui_ux.md` — the interface design: CRT terminal visual direction, typography, color system, layout, per-card specs, interaction timing, and accessibility. The source of truth for all UI decisions. Read when building or changing UI.
- `docs/typescript.md` — style, naming, imports. Read when editing TypeScript files.
- `simulator/` — a Python reference implementation of `docs/specs.md`, used to measure `TargetEnergy`. A design tool, not application code: no dependencies, and nothing the frontend builds, lints, or ships. See `simulator/README.md`.

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm run build` (typechecks first) and fix any failures, then run `/delta-review` before responding.
- **No test suite**: This project has no tests by design. TypeScript and the type-aware lint rules are the safety net — do not weaken `strict` or `noUncheckedIndexedAccess`, and do not add `any` to silence an error.
- **Fonts**: Every font must come from Google Fonts, served by its CDN via a `<link>` in `index.html`. No font files in the repo, no font packages in `package.json`, no other font source.
- **TypeScript projects**: `tsconfig.json` only references `tsconfig.app.json` (browser, `src/`, extends `@vue/tsconfig/tsconfig.dom.json`) and `tsconfig.node.json` (`vite.config.ts`, extends `@tsconfig/node24`). An option the two bases don't already cover must be set in both.
- **Build output**: `npm run build` writes into `../backend/public`, the directory Firebase Hosting serves, and empties it first. Routing is history mode, which relies on the catch-all rewrite in `../backend/firebase.json`.
- **Economy changes**: After changing any gameplay constant in `docs/specs.md`, update the matching constant in `simulator/sim.py`, run `simulator/verify.py` (it checks the opening state against the spec's tables), then re-measure `TargetEnergy` with `simulator/measure.py`.
- **Doc Maintenance**: After changes, check if `CLAUDE.md`, `docs/specs.md`, `docs/ui_ux.md`, and `docs/typescript.md` need updating.
