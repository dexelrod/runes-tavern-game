# RUNES — working notes for Claude

## GitHub is the live hub
- **Source of truth:** `main` on https://github.com/dexelrod/runes-tavern-game
- **Live game:** https://dexelrod.github.io/runes-tavern-game/ (GitHub Pages, deployed by `.github/workflows/pages.yml`)
- The old ChatGPT Site (runes-tavern-game.dexelrod.chatgpt.site) and the Codex publish prompts
  (`CODEX_PUBLISH_*.md`) are **legacy**. Do not publish there unless the owner asks.

## Standing rule: publish after every change
The owner wants every change we make published. After any change to the game:

1. **Bump the version** (one number, same in all four places), e.g. 78 → 79:
   - `dist/sw.js`: `const CACHE = 'runes-vNN'` and `const ASSET_VERSION = 'NN'`
   - `dist/index.html`: both `?v=NN` query strings (styles.css and app.js)
2. **Test:** `npm test` must pass (Node built-in runner, no install needed).
3. **Commit** to `main` with a message like `vNN: <what changed>`.
4. **Push** `main`. The workflow re-runs the tests and deploys `dist/` to Pages.
5. **Verify:** confirm the Actions run succeeded, then open the live URL and check the new
   version loads (`runes-vNN` cache / `?v=NN`) with no console errors.

If the tests fail, fix them before pushing. Never push a red build to `main`.

## Layout
- `dist/` — the playable static site (all paths relative; works under `/runes-tavern-game/`)
- `tests/` — `npm test`; `tests/e2e/smoke.mjs` for a browser smoke test
- `*_PASS.md`, `EDRIN_INTEGRATION.md`, `RAGNA_INTEGRATION.md` — design/implementation history notes

## Owner's local copy
The owner's Mac has a copy at `~/Downloads/Runes Card Game/site-source` with `origin` pointing at
this repo. Audio/art source files live one level up in `Runes Card Game/` (not in the repo).
