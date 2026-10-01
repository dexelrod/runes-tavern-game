# RUNES — Claude repair pass: live change log

Baseline: `site-source` at commit `c13446a` (app `?v=64`, SW `runes-v69`), 114/114 tests passing.
Publishing: this project has **no build step**. `dist/` is both source and publish directory (`.openai/hosting.json → static.directory = "dist"`). Every `dist/` change below is publish-relevant.

Format per entry: **Area** · problem → change · files · publish? · verified by

---

## 1. Engine / rules

**Crossbow + draw guard.** Engine allowed a DRAW while a Crossbow was loaded. That passed the turn and left the sequence loaded for the next player in a broken state. Bots never did this and the UI hid the deck, so it was latent. → `drawAction` now throws while `taki.open`; firing (END_TURN) is the only way out. · `dist/game-engine/engine.js` · publish: yes · new engine test + 4,000-game bot simulation (2/3/4/6 players: no stalls, no card loss, no illegal actions).

**Opening lead rotates.** Tavern Match and Duel always started every round with the human (QA P1 "Human always leads every round"). → `createInitialState({firstPlayerIndex})`; `match.js` `roundLeader()` rotates the lead by round (alternates in a Duel). Quick Play picks a seeded random leader. No rule text changed. · `dist/game-engine/engine.js`, `dist/game-engine/match.js` · publish: yes · tests.

## 2. Rendering / layout (the main regression source)

**Stylesheet rebuilt from scratch.** `styles.css` was 225 KB: about 60 stacked "v17…v64" override layers, 96 media queries and 2,300 rules, many targeting markup that no longer existed. It produced:
- a transparent Quick Play sheet on phones;
- the direction ring off-centre from the piles;
- the top seat floating on the back wall on desktop;
- three different home layouts;
- Duel identity boxes hidden under the menu button;
- hand cards clipped at the bottom.

→ New `styles.css` (~57 KB, 16 commented sections, mobile-first, 6 layout breakpoints). Materials are carried over from the final cascade: card face and back, wood, room, brass plaques. All card internals are now in `em`, so one card design scales from 30 px (revealed hands) to 136 px (desktop hand). `audio.css` is folded in and deleted. · `dist/styles.css`, `dist/audio.css` (deleted), `dist/index.html` · publish: yes · screenshots at 320/390/430 portrait, 844×390, 820×1180, 1180×820, 1366×768, 1920×1080, 2560×1080, in both languages.

**One seat component.** Three opponent renderers (`opponentHTML`, `quickOpponentHTML`, `duelOpponentHTML`), each with its own CSS family, are replaced by `seatHTML()`. A seat has: figure (Tavern portrait / Duel sprite / Bramm stage), name plate (house rune, name, card count), coin pile, fan of backs, revealed hand, props and speech. Seats sit along the table's far rim (`--rim`). Figures are clipped at the rim line, so the regulars sit *behind* the table instead of being pasted on it. · `dist/app.js` · publish: yes · screenshots.

**Bramm's identity box removed.** It overlapped Bramm and sat under the menu button on phones. Name, "The Unbeaten", card count and score now live on the same plate and coin pile as every other opponent. Bramm's art, expressions, voice and captions are untouched. · `dist/app.js`, `dist/styles.css` · publish: yes.

**Table geometry.** Stated as CSS variables on `.screen-game`, with one block per breakpoint (§15 of the stylesheet): `--head`, `--fig-h` (figure height above the rim), `--seat-h`, `--rim`, `--card-w`, `--pile-w`, `--back-w`, `--hand-lift`. The scene's table edge, the seats, the centre and the hand all derive from these values, so the direction ring is centred on the piles again and seats can't drift onto the wall. · `dist/styles.css` · publish: yes · e2e resize check (see Tests).

**Tavern Match characters.** Portraits were shown only for some seats. The 1-in-31 "easter egg" guest name replaced a regular's `nameKey`, which left that seat with no portrait and a stranger's name (seen in play as "Lydia", "Viren"). → Easter-egg renaming removed: the three regulars are always Aila, Ron and Bran. Portraits are cropped at the rim and dimmed when it isn't their turn (active seat at full light). There is no bobbing or sway. · `dist/game-engine/match.js`, `dist/app.js`, `dist/styles.css` · publish: yes · new test "regulars keep their own names and portraits".

**Seated portraits → WebP.** Five 900 px PNGs (4.2 MB) → 640 px WebP (372 KB). · `dist/assets/characters/table/*-seated.webp` (new), `*-seated.png` (deleted) · publish: yes.

**Bramm expressions → WebP.** 36 PNGs (17.3 MB, all preloaded before a Bramm duel) → WebP q88 (2.8 MB), visually identical. Same filenames, `.webp` extension. · `dist/assets/bramm/expressions/*.webp` (new), `*.png` (deleted), `dist/duel/bramm.js` · publish: yes · `bramm.test.js` checks the WebP header for every expression.

**Coins and score.** Coins used to render as up to 7 loose `<i>` coins floating beside the plate, and the "0" tokens sat at odd offsets. → `coinStacks(score)`: one coin per 4 points (minimum 1), stacked 4 high, at most 3 stacks (12 coins). The exact number always sits beside the pile.
- Opponents: the pile sits on the table next to their fan (below the fan on phones).
- You: the pile sits by your drink on roomy layouts; on phones, a coin chip sits in the header.

At round end, coins slide from each losing seat to the winner's pile (WAAPI, ≤ 0.9 s, skipped under reduced motion), and the winner's pile glows once. · `dist/app.js` (`coinStacks`, `coinPileHTML`, `seatScoreHTML`, `animateCoinsToWinner`), `dist/styles.css` · publish: yes · e2e verifies the displayed score equals the stored score after each round.

**Round results on the table.** Before: a dark modal "tally-board" wall. After:
- seats flip their remaining cards face-up;
- coins move;
- one parchment tally slip in the centre shows the winner, the cards-left sum (`5 + 1 + 4 = +10`), the running standings and **Next round** (focused automatically, so Enter works).

The slip animates in only the first time it's shown. Quick Play: "Hand over · Deal again". Match end: standings plus "You're the Tavern Champion!" / "Aila takes the Tavern" (Hebrew: "אתם אלופי הפונדק!" / "איילה אלופת הפונדק"). · `dist/app.js` (`summaryHTML`), `dist/styles.css` · publish: yes · full 6-round Tavern Match with sudden death and a full Bramm Duel played on phone.

**Flicker on every re-render.** The whole table is re-rendered on every state change, and status elements had entry animations. So the action strip, penalty token, speech bubbles and result slip re-ran their fade-in from opacity 0 every time a bot played or quipped (the strip and the +2 token were invisible in mid-game captures). → Entry animations now run only when content is new (`.enter` class for speech, penalty token and result slip); persistent status elements don't animate. · `dist/app.js`, `dist/styles.css` · publish: yes · regression test in `responsive.test.js`.

**Phone hand.**
- Before: on a 390 px phone, 8 cards were a hidden scroller showing about 3.5 cards. `touch-action:none` on the cards also blocked native scrolling.
- After: cards are about 78 px and overlap to a strip that keeps the corner index readable (≥ 29 px), so **up to 10 cards fit with no scrolling**. Above 10, the row scrolls natively (`touch-action:pan-x`), with fade edges and a chevron at each overflowing end.
- Gestures: selecting lifts the card vertically only (the old `.selected + .card` margin shift is gone, so the target never moves). Tap-tap or a deliberate upward drag (> 60 px, or a fast flick) plays the card. Horizontal pans scroll.
- A newly drawn card is scrolled into view.
- The hand is shown grouped by colour (Burgundy, Forest, Gold, Slate, then wild), numbers before actions. This is display order only; the engine is untouched.

· `dist/ui/hand-layout.js` (rewritten), `dist/app.js` (`layoutHand`, `bindHand`, `sortedHand`), `dist/styles.css` · publish: yes · `mobile-hand.test.js` (rewritten) plus screenshots with 3/7/10/15/26 cards.

**Desktop / tablet hand.** Fan tilt went down from up to ±12° to at most about ±7° for large hands. The rotation overflow no longer turns a fitting hand into a scroller (bug seen with 20 cards at 1920 px). Cards no longer clip at the bottom edge. · same files.

**Unplayable-card reason.** "You cannot play that card now" → the reason, e.g. "Needs Gold or 7" / "צריך זהב או 7", "Only a Curse or a King answers a Curse", "The Crossbow takes only Slate", "Wait for your turn". Tapping the deck during a loaded Crossbow explains "Fire the Crossbow to end your turn". · `dist/app.js` (`rejectReason`) · publish: yes.

**Short landscape phones (≤ 500 px tall).**
- Seats become one compact row (portrait cameo · plate · fan · coins).
- A Duel keeps the opponent as a round cameo instead of hiding them.
- The Crossbow panel and notes move beside the hand.

· `dist/styles.css` · publish: yes · screenshots at 844×390.

## 3. Main Menu

**Physical menu, three consistent compositions.** Before: three different layouts (phone list, phone-landscape side panel, a tiny tablet grid in an empty table). Choices were dark modern boxes. "Bramm's challenge" opened the whole Duel roster.

After, the objects themselves are the menu: a cut deck (Quick Play), the stacked-coins prop (Tavern Match) and Bramm's round cameo (Duel). Names are carved into the wood next to them, with no boxes.
- Desktop/tablet landscape: three objects across the table, the logo over the room.
- Phone: a list with 84 px rows and chevrons.
- Short landscape: logo beside the list.

The Duel entry is now labelled **Duel / דו־קרב**, with Bramm as its face ("Bramm waits. 'Still unbeaten.'" and your record against him). Continue (when a save exists) appears first, in gold. Rules and Settings are 44 px pill buttons. · `dist/app.js` (`homeHTML`), `dist/styles.css` §13 · publish: yes.

## 4. Duel select

**Wall of regulars.**
- Bramm is the "House champion" hero card: a full portrait with title, attitude and record.
- The five regulars are one row of portrait cards on wide screens, or a 3+2 grid on phones.
- Records are plain `W–L` numbers; the old Roman-numeral tallies capped at 5.
- "Back" is a real 44 px icon button that points the right way in RTL.
- Bramm's portrait no longer shows Ron's sprite behind him. His `<img>` carried the `duel-sprite` class, so it inherited the sprite-sheet background.

· `dist/app.js` (`duelSelectHTML`, `brammArtHTML`), `dist/styles.css` §14 · publish: yes.

## 5. Settings / Rules / Pause

**Sheets.** One sheet frame shared by Quick Play, Rules, Settings and Pause: opaque parchment, a 44 px close button, a scrollable body and a dim backdrop. Backdrop click closes on touch as well.
- Quick Play's player-count control is a radio group.
- Settings:
  - switches are `role="switch"` with `aria-checked`: green track plus a check mark when on, grey with an empty ring when off;
  - sliders show their filled portion (correctly mirrored in RTL) and the % value;
  - a muted channel's slider is visibly faded.
- Labels say what the toggles do: "Character voices & reactions" / "קולות ותגובות של דמויות", and "Captions" / "כתוביות".
- Pause is a short action menu: Return to the table · House rules · Settings · Save and leave. It's no longer Settings under another title. Rules or Settings opened from Pause go back to Pause.
- Rules: one line per card with its art, the four colour runes with their names, and scoring folded into a `<details>`. The rules state that Curse takes the place of the Two, that Shield in a Duel means you play again, and that Turnabout has no effect in a Duel.

· `dist/app.js` (`sheetFrame`, `quickSheetHTML`, `pauseHTML`, `rulesHTML`, `settingsHTML`, `bind`), `dist/styles.css` §12 · publish: yes.

## 6. Copy & localisation

- The Hebrew winner line addresses the player in the plural: "ניצחתם בסיבוב" (was "ניצחת"). Bots get gendered verbs ("איילה לקחה 2 קלפים", "רון משחק שוב").
- "לידכם" / "ליד של" phrasing → "לקחתם 4 קלפים", "משכתם קלף". "עונש המשיכה הצטבר ל-4" → "הקללה עלתה ל־+4".
- English: "You take 4", "Ron drew a card", "The Curse grows: +4", "Colour is now Gold", "Ron played Gold 7".
- Stale "קוויקסטפ" → "צעד זריז". The dead pre-pause rules sheet, with its runtime `.replaceAll()` copy patches, is deleted.
- Crossbow panel: "Crossbow loaded / Keep playing Gold cards / Fire" · "קשת דרוכה / אפשר להמשיך עם קלפי זהב / לירות". Bots get gendered Hebrew ("איילה ממשיכה עם זהב").
- Colour picker and rules list colours as Burgundy, Forest, Gold, Slate, each with its rune.
- English bot and duel lines use contractions ("Don't smile yet.", "That'll cost you."). Sela keeps her formal voice on purpose.
- Duplicate descriptors fixed: Ron "Playful and charming / שובב ומשעשע", Kesh "Quiet and mysterious / שקט ומסתורי".
- Asset `riposte.svg` renamed to `turnabout.svg`; no "Riposte" remains anywhere.

· `dist/app.js`, `dist/duel/opponents.js`, `dist/ui/card.js`, `dist/assets/cards/turnabout.svg` · publish: yes · `localization.test.js` (rewritten).

## 7. Animation & pacing

- Card travel was a 5-keyframe arc with up to 30 px of lift, ±2° wobble and brightness flashes. It's now a slide over wood: it leaves fast, carries momentum and drags to a stop with a small final turn (±1.6°). There's no arc and no overshoot. Durations: human play 340 ms, opponent play 480 ms (the face-up flip happens in flight), draws 380 ms with a 90 ms stagger. · `dist/app.js` (`animateOneCard`).
- The draw target for your own hand is the card nearest the visible centre of the hand, not the last card (which may be scrolled away).
- Bot thinking time: normal 780 → 680 ms base. Obvious single-choice moves are snappier, and hesitation before big cards is kept. Tap-the-table-to-hurry still works. A new round blocks the AI for 1.3 s so a bot leader doesn't play during the shuffle.
- Removed: perpetual portrait sway, seat breathing, table-card idle jitter and coin settle loops. The only ambient motion left is the fire-glow breathing (opacity only).
- The old `deck-settle` keyframes from `audio.css` were moved into the stylesheet.

## 8. Audio

- Last-card music duck softened (to 42% of level instead of 26%) so it reads as tension, not as a bug.
- No new sounds added. See "Missing assets" in the final summary for the coin sound.

## 9. Service worker & versioning

`sw.js` rewritten:
- one `install` handler (there were two);
- `CACHE = 'runes-v70'` and `ASSET_VERSION = '70'`, matching `index.html`'s `?v=70`. Before this, `index.html` loaded `v=64` while the SW precached `v=69` URLs, so offline start served stale or missing code;
- precaches the new WebP portraits, `turnabout.svg` and only the props in use;
- ignores cross-origin requests;
- returns `Response.error()` for a missing non-code asset instead of `index.html`.

· `dist/sw.js`, `dist/index.html` · publish: yes · test: every precached path exists, and the versions match.

## 10. Cleanup

- Removed dead code: `queueDraw`, `opponentSlot`, `flightsHTML`, `drawFlights`, `scoreBoardHTML`, `rawSheetHTML`, `takiTimer`, `turnCueUntil`, three opponent renderers, the runtime copy `.replaceAll` patches.
- Removed unused prop PNGs: coin-pile-small, loose-coins, scattered-coins, dried-meat, half-eaten-snack, rustic-loaf, leather-coin-pouch, small-cork, ritual-token, parchment-scrap, carved-figurine.
- Added `window.RunesQA.snapshot()`: a read-only state snapshot for automated playtests. It exposes no controls.

## 11. Tests

- `npm test`: engine (new: Crossbow draw guard, leader rotation, Quick leader, regulars keep portraits), Bramm (WebP), localisation (rewritten for current copy), mobile hand (rewritten), responsive (rewritten as structural guards: versions, precache, layout variables, opaque cards, gestures, seats, results, pause, no re-render flicker).
- New optional `npm run smoke` (`tests/e2e/smoke.mjs`, Playwright). It plays real rounds and checks: pause freezes the table; the table fits after resizing across 5 viewports; reload resumes the exact turn; Tavern scores add up and persist; Bramm round completes; no console errors. It isn't part of `npm test` because it needs a browser.
