# Prompt for Codex: publish RUNES v80 (UI art-direction pass)

> **Legacy.** GitHub (`main` → GitHub Pages) is now the live hub — see `CLAUDE.md`. v80 was pushed and deployed there directly; use this file only if the old ChatGPT Site must be updated too.

> Paste everything below this line into Codex, opened on the `site-source` folder of the RUNES project.

---

You are publishing a finished RUNES update. The files on disk are the authoritative, finished version. Your job is to inspect the diff, keep it exactly as it is, run the checks, publish `dist/`, and run the smoke test.

**What this version contains**
- Everything up to v78 (Bramm voice update, fine-tuning pass, install icons, new sounds and regulars, and the Edrin integration described in `EDRIN_INTEGRATION.md`). If v78 was already published, only the v80 changes below are new.
- **v79 — Crossbow handover and final-Curse return rule** (commit `b7c0b06`, made in another session: `engine.js`, `veteran.js`, `app.js` crossbow/announce copy, `engine.test.js`). Publish it as committed.
- **v80 — UI art-direction pass.** Presentation only: materials, buttons, sheets, HUD, menu, duel select, settings, rules, colour choice, results, transitions. No rule, engine, AI, audio or character-logic change. Change log: `CLAUDE_REPAIR_PASS.md` → "UI Art Direction Pass (v80)".

Rules:
- Do not restyle, refactor, rename, reformat or "improve" anything.
- Do not touch, re-encode or rename any audio or art file. No assets were added or changed in v80.
- Change a file only if publishing reveals a real defect (a missing file, a console error, a failing test). If you do, make the smallest possible fix and report it.

## 0. Before you start

- If `.git/index.lock` exists and no git process is running, delete it.
- There is no build step: `dist/` is both source and publish directory (`.openai/hosting.json` → `static.directory = "dist"`).

## 1. Files changed in v80 (relative to `site-source/`)

| File | Change |
|---|---|
| `dist/styles.css` | Material palette tokens; four control families (brass plate, plank, ink, wax seal); shared parchment for sheets and result slip; place-card seat plates lit by turn; chalk round notches; wax Curse token; parchment table notes and Crossbow note with wax Fire; stone colour picker; ledger standings; duel-select bench layout; ruled Settings page with brass levers and faders; Rules with real cards in two desktop columns; screen-change light-up; removed obsolete control styles. |
| `dist/app.js` | (On top of v79's Crossbow-handover copy, which is kept as is.) Markup for the above: `roundMarkerHTML` notches, `miniTableHTML` + Quick Play table choice, pause links, Rules uses `cardHTML`, language ink-choice, home tools as text, Bramm portrait card on home, `crossbow-armed` shell class and `--taki-color`, `screen-enter` on view change, microcopy ("Name the colour", "Back to the table", "Who sits across from you?", "House rules"). Game logic untouched. |
| `dist/index.html` | `styles.css?v=79`, `app.js?v=79`. |
| `dist/sw.js` | `CACHE = 'runes-v80'`, `ASSET_VERSION = '80'`. |
| `CLAUDE_REPAIR_PASS.md`, `CODEX_PUBLISH_CLAUDE_PASS.md`, `UI_ASSET_REQUESTS.md` | Docs only. |

## 2. Checks

```bash
cd site-source
npm test                 # expect 148 passing, 0 failing
npm run serve & npm run smoke    # expect "All smoke checks passed"
```

Version must be **80** in all four places (`index.html` ×2, `sw.js` ×2). The test suite fails if they diverge.

## 3. Publish

Commit (e.g. `Publish RUNES v80 — UI art direction`) and publish the ChatGPT Site from **`site-source/dist/`** with the usual flow.

## 4. Post-publish smoke test (hard reload first)

1. **Home.** No console errors; `app.js?v=79` served. Three objects on the table (cut deck, coin stack, Bramm's portrait card), no arrows or boxes; "House rules · Settings" as plain words at the bottom.
2. **Quick Play.** Four little tables from above; the chosen one is lit; "Deal the cards" is a wooden plank.
3. **Duel select.** Characters on wooden rails with no boxes; hovering lights a character; Bramm and Edrin sit large on the top rail.
4. **Tavern Match.** Seat names are on cream place cards; the player whose turn it is is lit, others dim. Round shown as five small diamonds. Score numbers have no pills.
5. **Curse.** A red wax blob with +N on the pile.
6. **Crossbow.** Parchment note "Crossbow loaded" with a red wax "Fire" seal; pressing it fires.
7. **Rune / King colour choice.** Four rune stones on the wood above your hand; no dialog box.
8. **Round end.** Parchment slip with a dotted ledger; "Next round" works.
9. **Settings.** Brass lever switches and faders work and persist; language words switch EN/HE; Hebrew lays out right-to-left.
10. **Pause.** "Back to the table", "House rules · Settings", "Save and leave the table" all work; Rules/Settings from Pause return to Pause.
11. **Phone (390×844) and phone landscape.** Hand readable, no overlaps, no horizontal scroll.
12. Cache Storage contains only `runes-v80`.

## 5. Known intentional behaviour (do not "fix")

- Secondary actions are underlined words, not buttons. Only one plank (primary) per surface.
- Inactive opponents' place cards are deliberately dimmer; the active seat is shown by light, not a border.
- Duel-select regulars are dim until hovered/focused (on touch they are all shown at the dim level until tapped).
- Rules show real cards; the old scoring `<details>` accordion is gone on purpose.
- Hebrew body copy uses the system UI face; titles keep the serif.
- Everything listed as intentional in earlier handoffs still applies (hidden table messages by default, card names hidden below ~88 px, Bramm/Edrin behaviour, debug hooks, absolute `og:image`, manifest `orientation:any`).

## 6. Do not touch

All art and audio assets · `dist/game-engine/*` · `dist/duel/*` voice and caption mapping · `.openai/hosting.json` · anything outside §1.

Report: published URL, commit hash, `npm test` counts, smoke items 1–12, and any file you changed with the reason.
