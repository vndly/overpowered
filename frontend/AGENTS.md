## Project

The frontend of Overpowered — a real-time grid strategy game (Vite + Vue 3, TypeScript, Composition API with `<script setup>`, ESLint + @stylistic + type-aware typescript-eslint via @vue/eslint-config-typescript).

The app is a scaffold: routing, tooling and the build are wired end to end, and the one screen it has renders nothing. No game code exists yet.

## Reference Docs

- `docs/specs.md` — game specs: grid, generators, energy, campaign. Read when working on game rules.
- `docs/typescript.md` — style, naming, imports. Read when editing TypeScript files.

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm run build` (typechecks first) and fix any failures, then run `/delta-review` before responding.
- **No test suite**: This project has no tests by design. TypeScript and the type-aware lint rules are the safety net — do not weaken `strict` or `noUncheckedIndexedAccess`, and do not add `any` to silence an error.
- **TypeScript projects**: `tsconfig.json` only references `tsconfig.app.json` (browser, `src/`, extends `@vue/tsconfig/tsconfig.dom.json`) and `tsconfig.node.json` (`vite.config.ts`, extends `@tsconfig/node24`). An option the two bases don't already cover must be set in both.
- **Build output**: `npm run build` writes into `../backend/public`, the directory Firebase Hosting serves, and empties it first. Routing is history mode, which relies on the catch-all rewrite in `../backend/firebase.json`.
- **Doc Maintenance**: After changes, check if `CLAUDE.md`, `docs/specs.md`, and `docs/typescript.md` need updating.
