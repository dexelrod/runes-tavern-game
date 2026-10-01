# Prompt for Codex: publish Claude's RUNES follow-up (v73)

> Paste everything below this line into Codex, opened on the `site-source` folder of the RUNES project.

---

You are publishing a small, finished RUNES follow-up.

**Current state.** Claude's main repair pass is already published:
- commit `525cb25` "Publish Claude repair pass (v70)";
- commit `43392f1` "Merge latest Site source and publish v72".

Since then, Claude has made a follow-up on top of `43392f1`. It is complete and tested, and the files on disk are the authoritative version. Your job is to inspect the diff, keep it exactly as it is, run the checks, publish `dist/` as **v73**, and run the smoke test.

Rules:
- Do not redo or "improve" anything, and do not restyle, rename, reformat or refactor.
- Change a file only if publishing reveals a real defect (a missing file, a console error, a failing test). If you do, make the smallest possible fix and report it.
- `CLAUDE_REPAIR_PASS.md` §12 is the change log for this follow-up.

## 0. Before you start

- If `site-source/.git/index.lock` exists and no git process is running, delete it.
- There is no build step: `dist/` is both the source and the publish directory (`.openai/hosting.json` → `static.directory = "dist"`).
- `git status` should show only the files in §1 as modified. If `git diff` shows anything else, stop and report it.

## 1. Changed files (all relative to `site-source/`)

| File | Type | What changed |
|---|---|---|
| `dist/game-engine/match.js` | source | Tavern Match now seats **3 of 5 regulars** each evening (Aila, Ron, Bran, Sela, Kesh), seeded from the match seed: new `TAVERN_REGULARS`, `tavernGuestsFor(seed)`; `createTavernMatch` uses them. Before, Kesh's and Sela's seated portraits shipped but were never shown. |
| `dist/app.js` | source | Tavern quips for Kesh's `mysterious` archetype (HE/EN). Bramm's four unused expressions are wired in: `36_mug_stops_midair` (your last card), `34_drinking_relaxed` / `35_drinking_nervous` (idle, ahead or behind), `32_angry_at_spectators` (he takes 4+). His voiced intro now plays at the start of **every new** Bramm match, not only the first ever. New setting **"Hide table messages" / "הסתרת הודעות שולחן"** hides the play-by-play line and caption announcements. The `round-complete` shell class from the v72 merge is kept. |
| `dist/duel/bramm.js` | source | `observe(trigger, context)` returns `32_angry_at_spectators` for `bramm_draw` with `amount >= 4`. |
| `dist/duel/opponents.js` | source | Bramm `idleFrequency` 44000 → 26000. |
| `dist/platform/storage.js` | source | New default setting `hideTableMessages: true`. |
| `dist/styles.css` | source | One rule appended: Bramm's seat hides the table props (he drinks from his own mug in the art). |
| `dist/index.html` | source | `styles.css?v=73`, `app.js?v=73` (was 72). |
| `dist/sw.js` | source | `CACHE = 'runes-v73'`, `ASSET_VERSION = '73'` (was 72). Nothing else changed. |
| `tests/engine.test.js` | test | Tavern regulars test now checks 3 of 5, all five appear, and the seat choice is seeded. |
| `tests/bramm.test.js` | test | New: every Bramm expression is reachable; the intro plays on every new match. |
| `tests/localization.test.js` | test | New: table messages are optional and hidden by default. |
| `tests/e2e/smoke.mjs` | test | Pauses before the reload check (removes a race). |
| `CLAUDE_REPAIR_PASS.md`, `CODEX_PUBLISH_CLAUDE_PASS.md` | docs | Change log §12 and this prompt. |

There are no new or deleted assets in this follow-up. Every image it uses (`kesh-seated.webp`, `sela-seated.webp`, `bramm_32/34/35/36_*.webp`) is already published.

## 2. Build and checks

```bash
cd site-source
npm test                # expect 105 passing, 0 failing
# optional, if Playwright is installed:
npm run serve & npm run smoke   # expect "All smoke checks passed"
```

The version must be **73** in all four places:
- `dist/index.html`: `styles.css?v=73` and `app.js?v=73`;
- `dist/sw.js`: `runes-v73` and `ASSET_VERSION = '73'`.

`tests/responsive.test.js` fails if they diverge. The service worker deletes old caches on activate; nothing else is needed.

## 3. Publish

Commit the working tree (for example `Publish Claude follow-up (v73)`), then publish the ChatGPT Site from **`site-source/dist/`** with the project's usual flow.

## 4. Post-publish smoke test (hard reload first)

1. Home loads with no console errors, and `app.js?v=73` and `styles.css?v=73` are served.
2. **Tavern Match:**
   - start 3–4 new matches (Leave the table → Tavern Match);
   - the three opponents vary between evenings and include Sela or Kesh at least once;
   - each one has a seated portrait.
3. **Duel vs Bramm:**
   - within about 1.5 s of the deal, Bramm speaks his intro ("Bramm. Bramm the Unbeaten." or "Oi! Come watch this…"), also in Hebrew;
   - leaving and starting a new Bramm match plays it again;
   - resuming a saved match does not.
4. **Table messages:**
   - with default settings, no message appears under the piles: no "Nothing matches — draw a card", no "Bramm takes 2";
   - Settings → turn off "Hide table messages" → the line appears;
   - the Crossbow panel with its **Fire** button and the +N Curse token always appear.
5. Mobile at 390×844: a Tavern round plays to the tally slip, and Pause → Return works.
6. Application → Cache Storage contains only `runes-v73`.

## 5. Known intentional behaviour (do not "fix")

- "Hide table messages" is **ON by default** (owner's request).
- Bramm's intro plays on **every new match**, by design.
- Tavern regulars rotate per evening, and a saved match restores the same three.
- Bramm's seat shows no table props; that is intentional.
- Halden's character pack and `assets/brand/runes-wordmark.svg` are intentionally unused.

## 6. Do not touch

- Everything outside the files in §1.
- Bramm's captions and voice mapping, and all art and audio assets.
- `.openai/hosting.json`.

Report:
- the published URL;
- the commit hash;
- `npm test` counts;
- the result of smoke items 1–6;
- any file you changed, with the reason.
