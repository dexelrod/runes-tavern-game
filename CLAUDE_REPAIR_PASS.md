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

## 12. Follow-up (owner request, same pass): unused assets, Bramm intro, table-message setting

**Tavern Match rotates its regulars.** Kesh's and Sela's seated portraits shipped but were never shown, because Tavern always seated Aila, Ron and Bran. → Each evening seats 3 of the 5 regulars (Aila, Ron, Bran, Sela, Kesh). The choice is seeded from the match seed, so a saved match always restores the same table. Kesh (`mysterious`) gets tavern quips in Hebrew and English; until now that archetype had none. · `dist/game-engine/match.js` (`TAVERN_REGULARS`, `tavernGuestsFor`), `dist/app.js` (dialogue) · publish: yes · engine test: three distinct regulars, all five appear across seeds, and the same seed gives the same table.

**Bramm's four unused expressions are wired in.**
- `36_mug_stops_midair`: the instant you reach your last card, a 0.7 s beat before his "…No." line.
- `34_drinking_relaxed` / `35_drinking_nervous`: his idle moments when he isn't taunting. Relaxed when he has the same number of cards as you or fewer, nervous when he has more.
- `32_angry_at_spectators`: when he's forced to take 4 or more cards.

His idle timer went from 44 s to 26 s (+ up to 9 s jitter), so he visibly lives at the table. · `dist/app.js` (`runBramm`, `scheduleDuelIdle`), `dist/duel/bramm.js` (`observe(trigger,context)`), `dist/duel/opponents.js` · publish: yes · test: every expression in the manifest is reachable.

**Bramm intro every match.** The voiced intro played only on the very first Bramm duel ever (`duelRecords.bramm.played===0`), so returning players never heard it. → Every **new** match against Bramm opens with `intro_01` or `intro_02`, voiced in the current language 1.25 s after the deal. Resuming a saved match doesn't repeat it. Verified in the browser: the intro voice buffer starts in both EN and HE for a player with 3 prior Bramm duels. · `dist/app.js` · publish: yes · test.

**Bramm's seat drops the tankard prop.** He drinks from his own mug in the art. · `dist/styles.css`.

**New setting: "Hide table messages" / "הסתרת הודעות שולחן" (ON by default).** It hides the play-by-play line ("Nothing matches — draw a card", "Bramm is down to the last card", skip/reverse/colour notes) and the caption announcements ("Bramm takes 2", "You played Gold 7").

These stay visible because they're controls or state:
- the Crossbow panel with its Fire button;
- the +N Curse token on the pile;
- the glowing deck when you must draw;
- the "why can't I play this" hint when you tap an unplayable card;
- character speech bubbles;
- Bramm's spoken-line captions (still controlled by "Captions").

The screen-reader live region still announces everything. · `dist/platform/storage.js` (`hideTableMessages:true`), `dist/app.js` · publish: yes · test.

**Smoke test made race-free.** The test now pauses before reading the turn for the reload check. Before, a bot could move between the read and the reload. · `tests/e2e/smoke.mjs`.

Still unused on purpose: the Halden pack (owner: unfinished, not voiced) and `assets/brand/runes-wordmark.svg` (alternate logo; harmless). `bramm_intro_03` is scripted but never recorded, and the Hebrew `bramm_win_05` doesn't exist (the caption shows without audio).

**Versioning for the follow-up.** Codex published the main pass as v70, then v72 (commit `43392f1`, which also added a harmless `round-complete` class to the game shell; it's preserved). This follow-up bumps `index.html` and `sw.js` to **v73**. · `dist/index.html`, `dist/sw.js`, `dist/app.js`.

## 13. Bramm voice expansion (v74)

24 new owner-supplied voice files (12 lines × EN/HE) are integrated into Bramm's existing reaction table. There's no second mapping system. Files were copied **unmodified** from `Runes Card Game/Bramm/` into `dist/assets/bramm/voice/`.

**Result lines now follow the real match state** (`session.phase` after `finishRound`, never UI text or timers). Exactly one result line per hand:

| Situation | Trigger | Pool |
|---|---|---|
| Bramm wins a round, match continues | `round_win` | `round_win_01–04` (new) |
| Bramm loses a round, match continues | `round_loss` | `loss_01` ("…Again."). If that was among his last 3 lines, an excuse (`excuse_01/02`, "That doesn't count." / "House rule.") instead, so a losing streak doesn't repeat the same line. |
| Bramm wins the match | `win` | existing `win_01–10` (unchanged) |
| Bramm loses the match | `match_loss` | `match_loss_01–03` (new); `loss_01` is no longer used here |

- Sudden-death hands count as rounds until the match is actually decided.
- Ordinary Bramm reactions are suppressed on the move that ends a hand, so a result line never stacks on a move line.
- Before this change, Bramm said nothing at all when a non-final round ended.

**Player reaches one card.**
- One immediate line, chosen from `01, 02, 05, 06, 07`, weighted by context:
  - first scare of the match → mostly "…No.";
  - later scares → denial, the audience line or talking himself down;
  - Bramm holding 5+ cards → "Nobody panic";
  - Bramm was ahead → "How did we get here?"
- The existing 3-voice anti-repeat applies (tested: no back-to-back repeats; all five occur).
- `03` ("Come on. Curse…") is now contextual. It plays only while you're still on one card and Bramm draws, or after about 9.5 s of you sitting on one card. It's no longer an instant reaction.
- `player_one_card_04` doesn't exist anywhere.

**Idle lines** `idle_01/02`:
- LOW priority, probability .35, ≥ 18 s since his last line, at least 2 game events since he last spoke.
- Only when you're not on one card, nothing is animating, he isn't already speaking and no bubble is up.
- Budget: at most one per round, and a second only in a very long round (≥ 45 events).
- Measured: in a 170 s stalled turn, one idle line in Hebrew and none in English.

**Expressions** (existing art only):

| Line | Expression |
|---|---|
| one-card 05 | `22_fake_calm_after_panic` |
| one-card 06 | `29_defeated_disbelief` |
| one-card 07 | `32_angry_at_spectators` |
| round win 01 / 02 / 03 / 04 | `10_satisfied_good_move` / `27_smug_unbeaten` / `03_calling_to_tavern` / `34_drinking_relaxed` |
| match loss 01 / 02 / 03 | `29_defeated_disbelief` / `30_defeated_sulk` / `32_angry_at_spectators` |
| idle 01 / 02 | `33_muttering` / `34_drinking_relaxed` |

**Captions.** Hebrew captions are added to `BRAMM_HE_CAPTIONS`; English text is in each reaction. Acting directions are removed. Bubble timing still follows the actual voice length, and Hebrew bubbles render RTL. All voice goes through the same Web Audio voice channel (no `<audio>` / media session).

**Playtested** in 2 full Bramm duels per language at phone size (20 hands). Every hand produced exactly one correct result line, with no match-win line after a round win and no `loss_01` on a match loss. 24 one-card events covered all five variants.

Files:
- `dist/duel/bramm.js`: reactions, captions, `ONE_CARD_WEIGHTS`, idle budget, round-loss variation;
- `dist/app.js`: result routing, one-card context, contextual `03`, idle gate, `BrammDebug.simulateRoundWin/RoundLoss/Idle`;
- `dist/assets/bramm/voice/` (24 new files);
- `dist/index.html`, `dist/sw.js` (v74);
- `tests/bramm.test.js` (6 new tests).

`Runes Card Game/Bramm/Bramm Script.txt` now lists all the new lines and marks `loss_01` as round-only.

---

# Fine-Tuning Pass (v75, the "director pass"; published together with the §13 Bramm voice update)

Rules and mechanics are untouched. This pass works only on presentation, feel and small bugs. Verified by screenshots at 320×568, 360×740, 375×667, 393×852, 390×844, 852×393, 844×390, 820×1180, 1180×820, 1366×768, 1920×1080 and 2560×1080 in HE and EN, an automated overlap checker (piles vs. notes, hand clipping, plate/fan collisions, header collisions, horizontal scroll) across 13 viewports × 6 table states × 2 languages, a misuse script, and full played matches.

**Cards as a system.**
- The printed name (Shield, Curse…) was struck through by the inner frame line, and in Hebrew it sat on the border. It now sits on a soft parchment band inside the frame.
- Label colour is darkened from the suit colour, so Turnabout's gold label is now readable.
- "Curse" was the only lower-case label; now all labels match.
- Below about 88 px card width (phone hand, revealed hands, piles on small phones), the printed name hides via a container query. At that size it was unreadable 6 px noise, and the art and corner carry the card.
- Removed the two faint tally strokes under the Curse art. They read as a stray mark at large sizes and were invisible at play size. The printed "+2" art and the rules line ("Curse takes the place of the Two") carry the idea.

· `dist/styles.css`, `dist/ui/card.js` · verified on a QA sheet at 150/102/78/40 px in HE and EN.

**Main menu.** The desktop and ultrawide menu was a small cluster in a big empty table. The three objects, labels, logo and Rules/Settings now scale with window height (`vh` clamps), so 1366×768, 1920×1080 and 2560×1440 frame the same shot. Hover lifts the object 3 px and tightens its shadow; pressing sets it down. On tablet portrait the menu was undersized (31 px titles, 120 px objects). Bramm's cameo no longer pushes the Duel row's text out of line with the other rows. On phone landscape the menu sits on the table. A Resume or Bramm tap acknowledges instantly (dimmed, busy) while Bramm's art decodes, and can't be double-fired. · `dist/styles.css`, `dist/app.js`.

**Duel select.**
- 320 px EN: the heading overlapped the back button and ran into Bramm's card (flex children were shrinking). Fixed by reserving the button's space and setting `flex-shrink:0`.
- Bramm's card hugs its content (no empty half on desktop).
- The regulars wrap as centred rows of three (3+2) on phones and tablets, five across on wide screens.
- Desktop type scales with height.
- Under 420 px, the third descriptor line hides so cards stay even.

· `dist/styles.css`.

**Table composition.**
- Piles are larger on phones (up to 110 px) and desktops (up to 15 vh), so the eye rests in the centre instead of on empty wood.
- On 6-player phones the five fans merged into one band of backs. They're now smaller, and the name plates stack name over count consistently.
- An opponent with no stake shows nothing instead of a lone "0" token.
- Desktop seat plates, scores, round marker and menu button scale with height.
- Your tankard and stake on desktop are larger.
- The hand keeps clear of your stake corner. A layout bug measured the frame including its padding, so 12 cards overflowed at 1366 px.
- On laptop heights (≤ 820 px), the figure band and piles trim so the Crossbow panel never sits on the discard pile (it did at 1366×768).
- In short landscape, the notes panel is width-limited so it can't reach the piles.

· `dist/styles.css`, `dist/app.js`.

**Round results.**
- On phones, revealed hands show at most 4 cards plus "+N" (the edge seats' hands ran off-screen).
- The winner's pile glow plays once, not on every re-render.

· `dist/app.js`, `dist/styles.css`.

**Pause.** The backdrop is lighter (less dim, 1.5 px blur instead of 3), so the table is visibly *waiting* behind the menu. · `dist/styles.css`.

**Feedback.**
- Desktop: legal cards lift 12 px on hover with a tightened raised shadow, and press down on click.
- Unplayable cards use the default cursor.
- Regulars lift 2 px on hover.
- Touch devices get no hover rules, so nothing sticks.

· `dist/styles.css`.

**Small bugs found and fixed.**
- Toggling any setting re-ran the sheet's slide-in animation and jumped the sheet back to the top. Sheets now animate only when they open, and keep their scroll position across re-renders.
- The colour picker re-faded every time a quip timer re-rendered the table.
- A newly drawn card restarted its arrival animation if the table re-rendered mid-arrival. It now resumes mid-motion.
- Card-face SVGs could paint blank for a frame the first time a card type appeared (seen as empty parchment cards in a Bramm hand). All 16 faces now warm at boot.
- Double-tapping an opponent, or Continue, could start two sessions while Bramm's art preloaded. Both are now guarded.

Verified with a misuse script: rules open/close ×8, duel in/out ×5, player-count spam ×24, double-click Bramm, draw spam ×10, language switching inside Pause → Settings, resizing during animation, keyboard input mid-animation, leave and resume, audio toggle spam. No console errors; the table always settled (`motionLocked` false, the correct player's turn).

**Removed.** The Curse tally strokes, printed card names at tiny sizes, the lone zero-stake tokens, and the re-running entry animations on sheets, colour picker and score glow.

**Final director playtest** (played as a player, no code inspection):
- Quick Play 1v1 (phone, HE), 4 players (phone, EN) and 6 players (desktop, HE);
- full Tavern Match on phone HE and desktop EN;
- full Duels vs Bramm (phone EN, desktop HE), Aila (desktop EN) and Kesh (phone HE).

Every match ran to its final slip with zero console errors. Punch-list fix from this playtest: Quick Play strangers Myra, Leva, Alva and Runa got masculine Hebrew verbs ("מירא ניצח ביד") → now feminine.

Versioning: `index.html` and `sw.js` are at **v75**. v74 was never published, so v75 includes §13. The `__qa_cards.html` test sheet was removed before handoff.

## 14. Install icons and share image (v76)

**Problem.** The manifest had `"icons": []`, so "Add to Home Screen" showed a blank or generic icon. The favicon was the 571 KB seal SVG. There was no link-preview image, so links shared in WhatsApp or social media appeared without a picture. The manifest locked installed apps to portrait, which broke the supported tablet-landscape layout.

**Change.** Generated from existing art only: the wax-seal mark on the table wood with a warm centre light, and a share card made from the tavern room, table rim, white RUNES logo, the cut deck, the coin stack and Bramm's cameo.

New files in `dist/assets/brand/icons/`:
- `icon-192.png` and `icon-512.png` (`purpose:any`);
- `icon-maskable-512.png` (seal at 66 %, inside the Android safe zone);
- `apple-touch-icon.png` (180 px);
- `favicon-32.png` and `favicon-48.png` (transparent).

Also new: `dist/assets/brand/share.jpg` (1200×630, 147 KB).

The 512 px icons are quantized to 256 colours, visually identical (≈200 KB instead of 350 KB).

`index.html` now has:
- PNG favicons, the Apple touch icon and `apple-mobile-web-app-title`;
- `og:` title, description, URL and image (absolute URL to the published site);
- `twitter:card=summary_large_image`.

`manifest.webmanifest` lists the three icons, and `orientation` changed `portrait` → `any`. `dist/favicon.svg` is deleted; it was a byte-identical copy of `assets/brand/runes-seal.svg`, which remains. `sw.js` precaches the new icons and no longer lists `favicon.svg`. The version is bumped to **v76**.

Files:
- `dist/index.html`, `dist/manifest.webmanifest`, `dist/sw.js`;
- `dist/assets/brand/icons/*` (new), `dist/assets/brand/share.jpg` (new), `dist/favicon.svg` (deleted);
- `tests/responsive.test.js` (new test: icons, favicons and share image exist and are declared).

Verified: 111 tests pass, no 404s on load, and the precache list resolves.

Note: `og:image` uses the absolute URL `https://runes-tavern-game.dexelrod.chatgpt.site/assets/brand/share.jpg`. If the site ever moves domain, update it.

## 15. New sounds and five new regulars (v77)

**Sounds (owner-supplied, unmodified).**
- `king-play.wav` → `kingPlay`. Plays whenever a King is played, on top of the normal card-placement sound.
- `quickstep-play.wav` → `quickstepPlay`. Plays on the Quickstep "play again" event.
- `tavern-loop-5.wav` joins the ambience rotation, which now has 5 loops.

Both cues are on the sfx channel with `maxVoices:1` and a 220 ms cooldown, and use the same `effectDelay` as the other special-card cues.

**Characters.** Roderic, Lio, Mograth, Harrow and Rusk come from the owner's second sprite sheet, `dist/assets/duel-opponents-2.webp`. It is the delivered PNG saved as WebP q90 with no edits.
- Same 5×5 layout and column order as the first sheet: drink, pleased, idle, annoyed, surprised.
- Each character has a Hebrew and English name and descriptor, an AI style, and in-character pleased, annoyed, surprised and drink lines in both languages.

| Character | Archetype | AI style | House |
|---|---|---|---|
| Roderic / רודריק | mercenary | aggressive | red |
| Lio / ליאו | bard | playful | yellow |
| Mograth / מוגרת׳ | mercenary | aggressive | green |
| Harrow / הארו | hunter | conservative | blue |
| Rusk / ראסק | mysterious | balanced | yellow |

- **Duel.** The select screen now lists 10 regulars plus Bramm:
  - 4 columns on phones and 5 on tablet and desktop;
  - the champion card is slimmer and attitude lines are hidden on laptop-height screens, so the whole screen fits without scrolling on desktop, laptop and tablet.
- **Tavern Match.** The regulars pool grew from 5 to 10, and each evening still seats 3. The five new characters sit as their idle sprite, because no seated art exists for them yet. If seated webps are delivered later, add the keys to `TAVERN_FIGURES`.
- **Hebrew gender.** Opponents carry `gender`, and `isFeminine()` uses a per-character map before the old archetype and name heuristic. This was needed because Harrow is a `hunter` and is male. Aila and Sela are `f`; all others are `m`.
- **Sprite sheet selection.** `duelSpriteStyle()` emits `--sprite-sheet` for sheet b, and CSS uses `var(--sprite-sheet, url(sheet a))`.

**Corrected sheet b (same pass).** The owner sent a corrected sheet: figures no longer overlap, but the grid is uneven (columns 239–275 px wide) and the sheet is still 1254 px.
- I re-gridded it without retouching any figure. Each figure was cut out along the empty separator lines, specks under 2 % of the figure's size were dropped, and near-zero alpha haze was cleared.
- Each figure was placed into a uniform 280 px cell (1400×1400): bottom-aligned on the same table line and centred on the head.
- The earlier bottom fade on select portraits is removed; it's no longer needed.
- The source PNG is kept in the conversation, not the repo.


Files:
- `dist/platform/audio.js`, `dist/app.js`, `dist/styles.css`, `dist/duel/opponents.js`, `dist/game-engine/match.js`, `dist/sw.js` (precaches sheet b), `dist/index.html`;
- new assets: `dist/assets/duel-opponents-2.webp` and the 3 WAVs;
- tests: `tests/audio.test.js`, `tests/engine.test.js` (new test for the second sheet and the 10-regular pool), `tests/localization.test.js` (every opponent has full English).

Verified:
- 112 tests and the smoke test pass;
- duel rounds played against Harrow (Hebrew: "הארו ניצח") and Mograth (English) with no console errors;
- Tavern evenings checked with mixed and all-new seatings on desktop, tablet and phone.

## 16. Ron and Bran use feminine Hebrew (v77, owner request)

Their art reads as female, so their Hebrew grammar now matches:
- `gender:'f'` in `opponents.js` and in `CHARACTER_GENDER`;
- descriptors: הפייטנית · שובבה ומשעשעת, and שכירת החרב · ישירה ותחרותית;
- their own lines: "אני צריכה עוד משקה." and "את זה אני מחזירה לך.".

All "won" and "keeps playing" texts follow automatically. Names (Hebrew and English) are unchanged; English needed no change.

Bug fixed along the way: the shared tavern banter and archetype lines were masculine for every speaker, including Aila and Sela. `showQuip` now runs lines through `voicedLine()`, which turns אני צריך / אני חושב / אני מחזיר into feminine forms when the speaker is female.

---

# UI Art Direction Pass (v80)

Goal: remove what still read as "themed web app" and make every surface answer *what is this made of?* No rule, engine, AI, audio or character-logic change. Verified with a screenshot harness covering 24 screens/states × up to 8 viewports (320×568 → 2560×1080) in EN and HE, the smoke test, and `npm test`.

**Materials and palette.** `:root` now names the world's materials instead of generic UI colours: ink / ink-soft, parchment, chalk, cream, brass (hi/lo), iron, wood / wood-dark, wax / wax-hi. Dropped the unused `--line`, `--charcoal`, `--charcoal-2` and `--shadow-plaque` (the "dark plaque with a thin gold stroke" material that had no physical answer). Added `--shadow-object` (one overhead lamp, short shadows toward the player), `--engrave` and `--lit` (light text on dark wood). Card colours remain reserved for cards.

**Control families (four, by material).**
- *Brass plate* — menu, back: a small cast square, no outline, tiny radius.
- *Plank* — the one primary action on a surface: a cut piece of the table-wood texture, nearly square corners. Replaces the brown gradient pill.
- *Ink* — every secondary action (House rules, Settings, Leave the table, Another opponent, Done): words with a soft underline, no box. `.secondary-button` and `.text-button` share one rule.
- *Wax seal* — the Crossbow's Fire. The only pressable seal in the game.
Removed: `.segmented` (iOS segmented control), `.tool-button` pills and their CSS-drawn gear/book icons, home chevrons, `.field-label`.

**Paper.** One parchment material shared by sheets and the result slip: cut square, edges browned by handling, no double inner border. Sheets are pinned with a brass tack, tilt slightly, drop in from above (no fade+scale), and the backdrop dims the room instead of blurring it. Title underline is a hand-ruled ink line. Close is an ink ×, not a white circle.

**HUD.**
- Seat plates (dark rectangles + gold border) → folded place cards: house rune inked, name, card count pencilled after a rule. Inactive seats sit in shadow; the active seat is lit by a lamp pool behind it — no gold outline glow. Last card: the count turns wax-red with a drop of wax.
- Round label box → five chalk notches (played filled, current lit) with an italic line under them; sudden death tints the notches.
- Score chips/pills → plain lit numerals beside the coin piles. Your score at 0 shows an empty coin ring rather than a lone "0" pill.
- Deck count plate → chalked number on the wood.
- Curse token → pressed red wax blob, stamped number; arrives with a stamp (scale down + settle) instead of a pop-in.
- Table messages, hints, captions, your quips → parchment scraps slid onto the table (were dark rounded pills).
- Speech bubbles → paper notes, italic serif, no outline.
- Crossbow panel (dark box with coloured glow) → parchment note in the loaded colour's ink + wax Fire seal; the pile area takes on the loaded colour's light (`.crossbow-armed`).
- Round results: remaining-hand coins move under the revealed hands so they don't collide with cards; props fade back while hands are shown.

**Cards.** Playable cards no longer get a gold outline + coloured glow: they sit slightly proud with a deeper shadow and catch the light. Selected = lifted higher with a big soft shadow, no ring. Desktop hover = lift without outline. When nothing is playable, the deck rises and the lamp pools under it (was a neon ring).

**Colour choice.** The dark dialog card with four boxed gems is gone. The room dims, and four irregular rune stones are laid on the open wood between the piles and your hand, dropping in one after another. Title "Name the colour".

**Results.** Standings are a ledger (name, dotted leader, score; winner marked with a wax dot) instead of striped rows with rank numbers. Typography is the display serif throughout.

**Main Menu.** No chevrons or row hover-boxes. Objects carry contact shadows. Bramm is now his own portrait card propped on the table (was a circular avatar with a gold ring). Rules/Settings are words burnt into the near edge of the table, separated by a dot. Record reads "You 0 · Bramm 0", chalked.

**Quick Play.** "Select number of players" segmented control → four miniature tables seen from above, one card-back chair per player (yours a brass coin). The chosen table is in full colour and lit; the others are faded. Lede asks "How crowded is the table?". The redundant Back link is gone (× and backdrop remain).

**Duel Select.** Rebuilt from a card-grid marketplace into a bench: no boxes, borders or panel backgrounds. The regulars sit in rows along a wooden rail, dim until you look at them (hover/focus/chosen lights them). Bramm and Edrin sit life-size on the top rail with their names written beside them. Records are chalked `W – L`. Title "Who sits across from you?".

**Settings.** A ruled page: italic section labels with a fading ink rule, labels running into dotted leaders, brass lever switches in a slot (dark when on), faders as engraved grooves with a brass slide, language as two inked words with the chosen one underscored in wax red. Footer is an ink action. Audio rows keep label and control on one line on phones.

**Rules.** Real RUNES cards (rendered by `cardHTML`) instead of loose icon images, slightly tilted like cards laid on the sheet. Colours shown as the same rune stones used by the colour picker. Scoring is a plain section (the `<details>` accordion is removed). Two columns on desktop. Footer reads "Got it" from the menu, "Back to the table" in game.

**Pause.** Centred short menu: plank "Back to the table", then "House rules · Settings" as ink links on one line, then "Save and leave the table".

**Transitions.** Changing screen (home ↔ duel select ↔ table) comes up out of darkness (brightness, .42 s) with the menu layer settling 8 px; no slide or scale.

**Hebrew.** Running copy (ledes, labels, captions, notes) uses the UI face in Hebrew so it doesn't fall back to an unpredictable serif; titles and names keep the display face.

**Microcopy.** "Choose a colour" → "Name the colour"; "Return to the table" → "Back to the table"; "Save and leave" (pause) → "Save and leave the table" / "לשמור ולקום מהשולחן"; Settings footer from Pause → "Back to the pause menu"; home "Rules" → "House rules" / "חוקי הבית".

**Source hygiene.** Obsolete rules removed with their replacements (no override layers): segmented control, tool icons, choice arrows, gem box, old switch/slider, rule-card image sizing, Edrin champion box tint, `.hand-frame-wrap`, `.round-revealed`, three `!important`s. `!important` now appears only in the reduced-motion rules. Still 13 `@media` blocks; stylesheet 75 KB (< 80 KB guard).

**Files:** `dist/styles.css`, `dist/app.js`, `dist/index.html`, `dist/sw.js` (v80). No asset added or changed. Tests unchanged; all UI-contract tests pass.

## v81 — New colour emblems

Owner-supplied silhouettes replace the four stroked colour runes everywhere: Burgundy = flame, Forest = sprout, Gold = sun, Slate = wave. Traced from the owner's PNG into filled 64×64 SVG paths in a new shared module, `dist/ui/runes.js` (`RUNE_PATHS`, `runeSVG`), used by both `ui/card.js` (card corners, number-card watermark) and `app.js` (`colorRuneHTML`: seat place cards, active-colour stone, colour picker stones, Crossbow note, Rules). CSS for those classes switched from stroke to fill. `sw.js` precaches `ui/runes.js`; version v81. No rule change.
