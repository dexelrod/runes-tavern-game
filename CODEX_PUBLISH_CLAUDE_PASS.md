# Prompt for Codex: publish Claude's RUNES repair pass

> Paste everything below this line into Codex, opened on the `site-source` folder of the RUNES project.

---

You are publishing a finished RUNES update. **Claude has already completed and tested the implementation.** The files currently on disk in `site-source/` are the authoritative, finished version.

Your job is mechanical:
1. inspect the diff so you know what changed;
2. preserve Claude's work exactly;
3. run the checks below;
4. publish the ChatGPT Site from `dist/`;
5. run the post-publish smoke test.

Rules for this task:
- **Do not** redo or "continue" the earlier QA/design pass (`RUNES_QA_Report.md`, `RUNES_Design_Review.md`). Those documents describe history.
- **Do not** "improve", restyle, rename, reformat or refactor Claude's changes. Change a file only if publishing reveals an actual defect (a missing file, a console error, a failing test), and then make the smallest possible fix and say exactly what you changed.
- **Do not** restore any deleted file. **Do not** reintroduce `audio.css`, PNG Bramm expressions, PNG seated portraits or `riposte.svg`.
- `CLAUDE_REPAIR_PASS.md` (in `site-source/`) is the detailed change log. Read it if anything below is unclear.

## 0. Before you start

- If `site-source/.git/index.lock` exists and no git process is running, delete it. It is a stale, empty lock left from an earlier session, and it blocks `git add` / `git commit`.
- The project has **no build step**. `dist/` is both the source and the publish directory (`.openai/hosting.json` → `"static": { "directory": "dist" }`). There is no bundler, no `npm install` and no generated output.
- The working tree is intentionally uncommitted, so `git status` / `git diff` show Claude's full change set against the last published commit `c13446a`.

## 1. Changed files (all relative to `site-source/`)

### Source (publish-relevant, in `dist/`)

| File | Type | What changed |
|---|---|---|
| `dist/styles.css` | source | **Rewritten from scratch** (225 KB of layered patches → ~57 KB, 16 commented sections, mobile-first). Layout runs on shared variables (`--head`, `--fig-h`, `--seat-h`, `--rim`, `--card-w`, `--pile-w`, `--back-w`, `--hand-lift`). Card internals are in `em`, so cards scale from one design. Includes the former `audio.css` deck-settle animation. |
| `dist/app.js` | source | Screen markup rewritten: `homeHTML` (physical menu), `duelSelectHTML` (Bramm hero + wall of regulars), `seatHTML` (one seat component replaces `opponentHTML` / `quickOpponentHTML` / `duelOpponentHTML`), `gameHTML`, `summaryHTML` (on-table tally slip), `sheetFrame` / `quickSheetHTML` / `pauseHTML` / `rulesHTML` / `settingsHTML`. Also: hand layout, gestures and display sort (`layoutHand`, `bindHand`, `sortedHand`); coin piles and the coin-to-winner animation (`coinStacks`, `animateCoinsToWinner`); card-travel animation (`animateOneCard`); `rejectReason`; localised announcements; bot pacing; `startNextHand` / `revealRoundResult`; read-only `window.RunesQA.snapshot()`; dead code removed. |
| `dist/ui/hand-layout.js` | source | `calculateHandLayout({count,cardWidth,available,compact})` rewritten: readable minimum strip, scroll ("browse") only above about 10 cards on phones, gentler fan. |
| `dist/ui/card.js` | source | Turnabout art path `riposte.svg` → `turnabout.svg`. |
| `dist/game-engine/engine.js` | source | `createInitialState({firstPlayerIndex})`; `drawAction` throws while a Crossbow is loaded. |
| `dist/game-engine/match.js` | source | `roundLeader()` rotates the opening lead per round; Quick Play leader is seeded; the Tavern easter-egg renaming (`tavernGuests`, `NPC_EASTER_EGGS`) is removed. |
| `dist/duel/bramm.js` | source | Expression URLs now `.webp`. |
| `dist/duel/opponents.js` | source | Ron/Kesh descriptors de-duplicated; English lines use contractions. |
| `dist/sw.js` | source | Rewritten: one install handler, `CACHE='runes-v70'`, `ASSET_VERSION='70'`, precache list updated (WebP portraits, `turnabout.svg`, only the props in use), cross-origin requests ignored. |
| `dist/index.html` | source | Loads `styles.css?v=70` and `app.js?v=70`; the `audio.css` link is removed. |

### Assets

| File | Type | Change |
|---|---|---|
| `dist/assets/characters/table/{aila,bran,kesh,ron,sela}-seated.webp` | asset (new) | 640 px WebP replacements for the 900 px PNGs. |
| `dist/assets/bramm/expressions/bramm_*.webp` (36 files) | asset (new) | WebP replacements for the 36 PNG expressions, same names. |
| `dist/assets/cards/turnabout.svg` | asset (renamed) | Was `riposte.svg`; content identical. |

### Tests / docs / config (not published, keep them)

| File | Type | Change |
|---|---|---|
| `tests/engine.test.js` | test | Easter-egg test removed; new tests for the Crossbow draw guard, lead rotation, Quick Play leader, and regulars keeping their portraits. |
| `tests/bramm.test.js` | test | Expression assets are checked as WebP. |
| `tests/localization.test.js` | test | Rewritten for the current copy and RUNES vocabulary. |
| `tests/mobile-hand.test.js` | test | Rewritten for the new hand geometry. |
| `tests/responsive.test.js` | test | Rewritten as structural guards (versions, precache existence, layout variables, opaque cards, gestures, seats, results, pause, no re-render flicker). |
| `tests/e2e/smoke.mjs` | test (new) | Optional Playwright smoke test (`npm run smoke`). |
| `package.json` | config | Adds the `"smoke"` script. |
| `CLAUDE_REPAIR_PASS.md` | doc (new) | Change log. |
| `CODEX_PUBLISH_CLAUDE_PASS.md` | doc (new) | This file. |

## 2. Deleted files (intentional; do not restore)

- `dist/audio.css`. Its only rule, the deck-settle animation, now lives in `styles.css`.
- `dist/assets/cards/riposte.svg` (renamed to `turnabout.svg`).
- `dist/assets/characters/table/{aila,bran,kesh,ron,sela}-seated.png`.
- `dist/assets/bramm/expressions/bramm_*.png` (36 files; WebP versions replace them). The original PNG masters remain outside the site in `Runes Card Game/Bramm/`.
- Unused props:
  - `dist/assets/props/bonus/carved-figurine.png`
  - `dist/assets/props/food/{dried-meat,half-eaten-snack,rustic-loaf}.png`
  - `dist/assets/props/gambling/{coin-pile-small,loose-coins,scattered-coins}.png`
  - `dist/assets/props/mystical/ritual-token.png`
  - `dist/assets/props/personal/{leather-coin-pouch,small-cork}.png`
  - `dist/assets/props/tavern/parchment-scrap.png`

If any of these deleted paths still exist on disk when you start, delete them. They are not referenced anywhere.

## 3. Build requirements

There is no build. Run exactly:

```bash
cd site-source
node --version          # Node 20+ (uses structuredClone, toSorted, findLast)
npm test                # node --test tests/*.test.js → expect 102 passing, 0 failing
```

Optional but recommended, if Playwright is available (`npx playwright install chromium` once):

```bash
npm run serve &         # python3 -m http.server 4173 -d dist
npm run smoke           # expect "All smoke checks passed"
```

- Expected publish folder: `site-source/dist/`.
- Files to regenerate: none.
- Cache/version: already bumped to **70** in three places, which must stay identical:
  - `dist/index.html`: `styles.css?v=70` and `app.js?v=70`;
  - `dist/sw.js`: `const CACHE = 'runes-v70'` and `const ASSET_VERSION = '70'`.

  `tests/responsive.test.js` fails if they diverge. If you need a second publish after a fix, bump all four to `71` together.
- Service worker: the new SW deletes every old `runes-v*` cache on activate and claims clients. Code and CSS are network-first, so returning players get the new version on their next load. No migration code is needed.
- Generated assets: none.

## 4. Publication requirements

Publish the ChatGPT Site from **`site-source/dist/`** exactly as it is on disk after the deletions above, with the usual Site publish flow for this project (`.openai/hosting.json`, static directory `dist`). Commit the working tree first if that flow requires a commit. A suitable message: `Publish Claude repair pass (v70)`.

Do not upload `tests/`, `CLAUDE_REPAIR_PASS.md` or `CODEX_PUBLISH_CLAUDE_PASS.md` to the Site. They live outside `dist/`, so the static publish excludes them automatically.

## 5. Post-publish smoke test

On the published URL (`https://runes-tavern-game.dexelrod.chatgpt.site`), use a hard reload or a private window the first time.

1. **Home loads.** The RUNES logo, three choices (Quick Play / Tavern Match / Duel with Bramm's portrait), and Rules + Settings pills appear.
2. **No console errors.** Errors (not warnings) must be zero on home and in a game.
3. **Assets resolve.** The Network tab shows no 404s, in particular:
   - `assets/characters/table/*-seated.webp`
   - `assets/bramm/expressions/bramm_01_default_smug.webp`
   - `assets/cards/turnabout.svg`
   - `styles.css?v=70`
   - `app.js?v=70`
4. **Quick Play works.** Choose 4 players, deal, play a few cards and draw once. Opponents' cards slide face-up onto the discard pile.
5. **Tavern Match score works.** Play one full round (tapping the table hurries the bots). The parchment tally slip appears in the middle of the table; coins slide to the winner; the winner's coin pile number equals the "+N" on the slip. Press **Next round**: round 2 of 5 starts, the score stays, and a different seat may lead.
6. **Duel vs Bramm works.** Duel → Bramm (the "House champion" card). Bramm sits behind the far edge of the table and his expressions change. Play one round to the tally slip.
7. **Hebrew works.** Hebrew is the default: the page is RTL, menu text is Hebrew, the Crossbow panel reads "קשת דרוכה … לירות". Switch to English in Settings: everything flips to LTR English.
8. **Mobile layout works.** At 390×844 (DevTools device mode):
   - the hand shows up to 10 cards without scrolling;
   - above 10 the hand scrolls sideways with a chevron;
   - a first tap lifts a card and a second tap plays it;
   - Pause → "Return to the table" resumes.
9. **The service worker serves the new version.** Application → Service Workers shows `sw.js` active, and Cache Storage has only `runes-v70`. Reload once more: still v70 and no errors.

## 6. Known intentional behaviour (do NOT "fix")

- The hand is **displayed** sorted by colour (Burgundy, Forest, Gold, Slate, then wild), numbers before actions. A drawn card appears in its sorted place and is scrolled into view. The engine's hand order is untouched.
- On phones the hand is **flat** (no fan) and scrolls sideways above about 10 cards. On larger screens it fans gently. This is deliberate.
- On touch devices a card needs **two taps** (select, then play) or an upward drag. Mouse users click once.
- The opening lead **rotates** every round in Tavern Match and alternates in a Duel. Quick Play picks a seeded random leader, so bots sometimes play first.
- The Tavern regulars are always **Aila, Ron and Bran**. The rare easter-egg guest rename was removed on purpose: it left a seat with no portrait.
- **Bramm stays "The Unbeaten"** even after you beat him. It is his self-appointed nickname; that is the joke.
- Quick Play opponents are anonymous strangers with no portraits.
- Unplayable cards are **darker, not transparent**.
- The Duel entry on the home screen is labelled **Duel** with Bramm as its face. It opens the full opponent list.
- Seat portraits are slightly **dimmed** when it is not that player's turn. That is the active-player light, not a rendering bug.
- Coins: 1 coin per 4 points, stacks of 4, at most 3 stacks. Large scores do **not** add more coins. The exact number is always shown beside the pile.
- Phones show your score as a coin chip in the top bar. Larger screens show it next to your tankard at the bottom corner.
- `window.RunesQA.snapshot()` and `window.BrammDebug` are intentional, read-only debug hooks used by automated playtests.
- No coin-clink sound plays when coins move. The asset doesn't exist yet (see the owner's missing-assets list); do not add a placeholder.
- `Response.error()` for missing non-code assets in `sw.js` is intentional. The old behaviour returned `index.html` as an image.

## 7. Do not touch

- `dist/styles.css`: no reformatting, no "cleanup", no reordering of sections or breakpoints.
- `dist/app.js` render functions and gesture code (`seatHTML`, `gameHTML`, `summaryHTML`, `layoutHand`, `bindHand`, `animateOneCard`).
- `dist/ui/hand-layout.js` thresholds (29 px compact minimum strip, 40 px / 42 % roomy).
- `dist/game-engine/*`: rules are locked.
- `dist/duel/bramm.js` captions and voice mapping. Bramm's Hebrew captions, including `שצ` and the `פלוס שתיים` line, are owner-approved.
- All art assets: no recompression or resizing.
- `.openai/hosting.json`.
- The version number `70`. Change it only to bump all four places together, as described above.

When you are done, report:
- the published URL;
- the commit hash (if one was made);
- `npm test` output (pass/fail counts);
- the result of each smoke-test item (1–9);
- any file you had to change, with the reason.
