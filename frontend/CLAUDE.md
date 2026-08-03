## Project

The frontend of Overpowered — a real-time grid strategy game (Vite + Vue 3, TypeScript, Composition API with `<script setup>`, ESLint + @stylistic + type-aware typescript-eslint via @vue/eslint-config-typescript).

The game is built in the thirteen sequential stages of `docs/plan.md`, every one of which ends with a playable match. Stages 1 and 2 are done: the sim loop, the board, the HUD, and building, connecting and selling generators. `docs/plan.md` § Status is the source of truth for what has shipped.

## Reference Docs

- `docs/specs.md` — game specs: grid, generators, energy, campaign. Read when working on game rules. It rates generators 1-5 rather than in energy; `src/game/tunables.ts` holds what a rating point is worth, so the spec's tables stay the source of truth.
- `docs/plan.md` — the thirteen stages, their order and their exit criteria. Read before starting a stage.
- `docs/ui.md` — visual language, palette, type, glyphs, interaction, motion. Read when building or changing UI.
- `docs/typescript.md` — style, naming, imports. Read when editing TypeScript files.

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm run build` (typechecks first) and fix any failures, then run `/delta-review` before responding.
- **No test suite**: This project has no tests by design. TypeScript and the type-aware lint rules are the safety net — do not weaken `strict` or `noUncheckedIndexedAccess`, and do not add `any` to silence an error.
- **Fonts**: Every font must come from Google Fonts, served by its CDN via a `<link>` in `index.html`. No font files in the repo, no font packages in `package.json`, no other font source. See `docs/ui.md` § Typography.
- **TypeScript projects**: `tsconfig.json` only references `tsconfig.app.json` (browser, `src/`, extends `@vue/tsconfig/tsconfig.dom.json`) and `tsconfig.node.json` (`vite.config.ts`, extends `@tsconfig/node24`). An option the two bases don't already cover must be set in both.
- **Build output**: `npm run build` writes into `../backend/public`, the directory Firebase Hosting serves, and empties it first. Routing is history mode, which relies on the catch-all rewrite in `../backend/firebase.json`.
- **Doc Maintenance**: After changes, check if `CLAUDE.md`, `docs/specs.md`, and `docs/typescript.md` need updating.
