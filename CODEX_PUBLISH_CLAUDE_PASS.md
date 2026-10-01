# Prompt for Codex: publish RUNES v77 (Bramm voice update + fine-tuning pass + install icons + new sounds and regulars)

> Paste everything below this line into Codex, opened on the `site-source` folder of the RUNES project.

---

You are publishing a finished RUNES update. The last published version is **v73** (commit `9de1baa`). Since then Claude has completed and tested four changes, which you publish together as **v77**:

1. **Bramm voice update.** 24 new voice files are integrated, and round and match results now use separate line pools.
2. **Fine-tuning pass.** Presentation polish and small bug fixes. No rule changes.
3. **Install icons and share image.** App icons, PNG favicons and a link-preview image, all made from existing art.
4. **New sounds and five new regulars.** King and Quickstep sounds, a fifth tavern ambience loop, and Roderic, Lio, Mograth, Harrow and Rusk from a second sprite sheet. Ron and Bran now use feminine Hebrew.

The files on disk are the authoritative, finished version. Your job is to inspect the diff, keep it exactly as it is, run the checks, publish `dist/`, and run the smoke test.

Rules:
- Do not restyle, refactor, rename, reformat or "improve" anything.
- Do not touch, re-encode or rename any audio or art file.
- Change a file only if publishing reveals a real defect (a missing file, a console error, a failing test). If you do, make the smallest possible fix and report it.
- `CLAUDE_REPAIR_PASS.md` §13, "Fine-Tuning Pass", §14, §15 and §16 are the change log.

## 0. Before you start

- If `.git/index.lock` exists and no git process is running, delete it.
- There is no build step and no generated output: `dist/` is both the source and the publish directory (`.openai/hosting.json` → `static.directory = "dist"`).
- `git status` should show exactly the files in §1. If it shows anything else, stop and report it.

## 1. Changed and new files (relative to `site-source/`)

| File | Type | Change |
|---|---|---|
| `dist/duel/bramm.js` | source | New reactions: `one_card_05/06/07`, `round_win_01–04`, `match_loss_01–03`, `idle_01/02`, with their Hebrew captions. `loss_01` is now the round-loss line. Adds `ONE_CARD_WEIGHTS`, an idle budget per round, and round-loss variation. |
| `dist/app.js` | source | Bramm result routing (`round_win` / `round_loss` / `win` / `match_loss`, from `session.phase`). One-card context and the contextual `one_card_03`. Idle gate. Fine-tuning: sheets and the colour picker animate only when they open; sheets keep their scroll position across re-renders; the score glow plays once; zero-stake seats are hidden; revealed hands show at most 4 cards on phones; hand width is measured inside the frame padding; card-face SVGs preload at boot; Continue and opponent taps are guarded against double-starting; gendered Hebrew verbs for Quick Play strangers. v77: King and Quickstep sound hooks; sprite seats in the Tavern for the new regulars; per-character Hebrew gender (`CHARACTER_GENDER`, `voicedLine`). |
| `dist/styles.css` | source | Fine-tuning: card label band and contrast; labels hidden below about 88 px; height-scaled desktop and ultrawide home and duel select; tablet-portrait sizing; duel-select wrapping and head layout; larger piles; 6-player phone seats; laptop-height trims; short-landscape notes; pause backdrop; desktop hover and press feedback. v77: `--sprite-sheet` support, Tavern sprite seats, a duel-select layout for 10 regulars. |
| `dist/ui/card.js` | source | Removed the Curse "two strokes" decoration. |
| `dist/assets/bramm/voice/` — 24 new files | asset (new) | `bramm_player_one_card_0{5,6,7}`, `bramm_round_win_0{1–4}`, `bramm_match_loss_0{1–3}`, `bramm_idle_0{1,2}`, each as `.mp3` and `_he.mp3`. Owner-supplied and unmodified. |
| `dist/index.html` | source | `styles.css?v=77`, `app.js?v=77`. PNG favicon and Apple touch icon links replace `favicon.svg`. Adds `og:*` and `twitter:card` meta tags for link previews. |
| `dist/manifest.webmanifest` | source | `icons` filled (192, 512, maskable 512). `orientation`: `portrait` → `any`. |
| `dist/assets/brand/icons/{favicon-32,favicon-48,apple-touch-icon,icon-192,icon-512,icon-maskable-512}.png` | asset (new, 6) | Generated from the existing seal and wood art. |
| `dist/assets/brand/share.jpg` | asset (new) | 1200×630 link-preview image. |
| `dist/sw.js` | source | `CACHE = 'runes-v77'`, `ASSET_VERSION = '77'`. Precaches the 6 icons and `assets/duel-opponents-2.webp`, and no longer lists `favicon.svg`. |
| `dist/platform/audio.js` | source | Registers `kingPlay` and `quickstepPlay`, and adds `tavern-loop-5.wav` to the ambience rotation. |
| `dist/duel/opponents.js` | source | Five new opponents (sheet b, `gender`, Hebrew and English dialogue), `DUEL_SHEETS`, and `--sprite-sheet` in `duelSpriteStyle`. |
| `dist/game-engine/match.js` | source | 10 Tavern regulars, houses and restore keys for the new characters. Rules unchanged. |
| `dist/assets/duel-opponents-2.webp` | asset (new) | Second regulars sprite sheet: owner art, re-gridded into uniform 280 px cells (figures not retouched). |
| `dist/assets/audio/{king-play,quickstep-play,tavern-loop-5}.wav` | asset (new, 3) | Owner-supplied and unmodified. |
| `tests/audio.test.js`, `tests/engine.test.js`, `tests/localization.test.js` | test | New cues, 5 ambience loops, 10-regular pool, second-sheet opponents, full English for every opponent. |
| `tests/responsive.test.js` | test | New test: icons, favicons and the share image exist and are declared. |
| `tests/bramm.test.js` | test | 41 voices, plus tests for result pools, one-card variety, the absence of 04, idle rarity, language-independent anti-repeat and round-loss variation. |
| `CLAUDE_REPAIR_PASS.md`, `CODEX_PUBLISH_CLAUDE_PASS.md` | docs | Change log and this prompt. |

**Deleted:** `dist/favicon.svg`. It was a byte-identical copy of `dist/assets/brand/runes-seal.svg`, which remains. Do not restore it. `../Bramm/Bramm Script.txt` (outside `site-source`) is documentation only.

## 2. Checks

```bash
cd site-source
npm test                 # expect 112 passing, 0 failing
# optional, if Playwright is installed:
npm run serve & npm run smoke    # expect "All smoke checks passed"
```

The version must be **77** in all four places:
- `index.html`: `styles.css?v=77` and `app.js?v=77`;
- `sw.js`: `runes-v77` and `ASSET_VERSION = '77'`.

The test suite fails if they diverge. The service worker deletes old caches on activate. Voice files load on demand, so no precache change is needed.

## 3. Publish

Commit (for example `Publish RUNES v77`) and publish the ChatGPT Site from **`site-source/dist/`** with the usual flow.

## 4. Post-publish smoke test (hard reload first)

1. **Home.** No console errors, and `app.js?v=77` is served. The browser tab shows the wax-seal favicon. On a desktop window, the three menu objects (cards, coins, Bramm) are large and evenly spaced across the table. Hovering lifts an object slightly.
2. **Cards.** On desktop, special cards show their name on a small parchment band above the bottom border, not crossed by the frame line. On a phone, the hand shows no printed names; that is intended.
3. **Tavern Match.** Play one round. The tally slip appears, coins move, and **Next round** works. Seats with 0 points show no coin token.
4. **Duel vs Bramm** (turn Captions on in Settings to see bubbles):
   - he speaks an intro;
   - at the end of round 1 he says exactly one line: a round-win line if he won ("There. Order restored.", etc.), or "…Again." or an excuse if you won;
   - when you reach one card, his reaction varies across rounds.
5. **Final round vs Bramm.** If he loses the match, you hear a `match_loss` line ("Fine. One match. Means nothing." / "Enjoy it…" / "Nobody writes this down!") and not "…Again.".
6. **Hebrew.** Repeat 3–5 in Hebrew: Hebrew audio, exactly matching Hebrew bubbles, right-to-left.
7. **Settings.** Toggle a switch while scrolled down: the sheet stays in place and doesn't re-animate. Reload, and the value persisted.
8. **Mobile (390×844).** The hand shows up to 10 cards without scrolling; Pause → Return works. On a 6-player Quick Play, the five opponents' fans don't merge.
9. Cache Storage contains only `runes-v77`.
10. **Icons and preview.**
    - `/manifest.webmanifest` lists 3 icons and they load.
    - On a phone, "Add to Home Screen" shows the seal-on-wood icon.
    - `/assets/brand/share.jpg` loads.
    - Pasting the site URL into a chat shows the RUNES tavern preview. Preview caches can take a while to refresh; that's not a defect.
11. **New regulars and sounds.**
    - Duel select shows 10 regulars in two rows of 5 on desktop, without scrolling.
    - A duel vs Mograth shows his sprite and in-character bubbles.
    - Playing a King and a Quickstep each plays its new sound.
    - In Hebrew, Harrow uses masculine verbs ("הארו ניצח"), and Ron and Bran use feminine ones ("רון ניצחה", titles הפייטנית and שכירת החרב).

## 5. Known intentional behaviour (do not "fix")

**Table and cards**
- Card names are hidden on small cards (phone hand, revealed hands). The art and corner identify the card.
- The Curse card no longer has two small strokes under its art.
- Opponents with 0 points show no coin pile.
- On phones, revealed losing hands show up to 4 cards plus "+N".
- The hand is displayed sorted by colour. On phones it's flat and scrolls sideways above about 10 cards; on desktop it fans gently.
- Touch devices need two taps (or an upward drag) to play a card.
- Each Tavern evening seats 3 of the 10 regulars. Roderic, Lio, Mograth, Harrow and Rusk sit as a sprite bust (no seated art exists for them yet).
- In duels the regulars also use the shared tavern banter lines, besides their own.
- Ron and Bran are female in Hebrew (feminine verbs and titles). Their names are unchanged.
- On large landscape screens the duel-select cards show name and title only; the attitude line is hidden so 10 regulars fit.

**Settings**
- "Hide table messages" is ON by default.

**Bramm**
- He speaks his intro at the start of every new match.
- Idle lines are rare: at most one per round, sometimes none.
- When he loses rounds in a row, "…Again." may be replaced by "That doesn't count." or "House rule.".
- `bramm_player_one_card_03` plays only later, while you're still on one card.
- `bramm_player_one_card_04` does not exist.
- He keeps "The Unbeaten" even when beaten.
- `bramm_intro_03` was never recorded, and the Hebrew `bramm_win_05` doesn't exist (its caption shows without audio).

**Not used**
- Halden's pack and `assets/brand/runes-wordmark.svg` are intentionally unused.

**Debug hooks**
- `window.RunesQA` and `window.BrammDebug` are intentional, read-only debug hooks.
- `og:image` deliberately uses the absolute published URL; link-preview crawlers need it.
- The manifest `orientation` is `any` on purpose (tablet landscape is a supported layout).

## 6. Do not touch

- All art and audio assets.
- `dist/styles.css` structure and breakpoints.
- `dist/game-engine/*` (rules are locked).
- Bramm captions and voice mapping.
- `.openai/hosting.json`.
- Anything outside §1.

Report:
- the published URL;
- the commit hash;
- `npm test` counts;
- the result of smoke items 1–11;
- any file you changed, with the reason.
