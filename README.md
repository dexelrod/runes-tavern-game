# RUNES — Tavern Card Game

A browser card game (installable as a PWA) with AI tavern opponents.

**Play:** https://dexelrod.github.io/runes-tavern-game/

## Layout
- `dist/` — the playable static site (this folder is what gets published)
- `tests/` — Node test suite (`npm test`), plus `tests/e2e/smoke.mjs`

## Run locally
```
npm run serve   # http://localhost:4173
npm test
```

## Publishing
Every push to `main` runs the tests and, if they pass, deploys `dist/` to GitHub Pages
(see `.github/workflows/pages.yml`).
