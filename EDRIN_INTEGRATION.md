# Edrin — integration notes (v78)

Edrin is the second authored 1v1 opponent, built on the same character framework as Bramm. There is still one dialogue system. The two characters share the expression stage, speech bubble, Web Audio voice channel, preloading, result timing and debug tools. Only their reaction tables, controllers and staging hooks are different.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Character registry | `dist/duel/characters.js` | One entry per authored character (`bramm`, `edrin`). It holds the expressions, controller factory, reaction and voice resolvers, lead beats before lines, idle behaviour, result beat and active-clock flag. `resolveCharacterVoice()` routes any character's voice. |
| Edrin pack | `dist/duel/edrin.js` | Authored EN and HE script, the 34-expression manifest, controller, `edrinEventFor()` event classifier and the voice library. |
| Shared preloader | `dist/duel/expression-preload.js` | Decodes each expression once before the duel starts. A missing image resolves to `null` and never blocks the duel. |
| App wiring | `dist/app.js` | Bramm-only hooks became generic: `isAuthoredDuel()`, `runCharacter()`, `performCharacterReaction()`, `setCharacterExpression()`, `characterArtHTML()`. The CSS classes are now `character-art*` and `character-speech`. |
| Voice | `dist/platform/audio.js` | The existing Web Audio `playVoice` path is used, with a new HIGH rank. There is no HTML media element, no Now Playing entry and no Dynamic Island. |
| Veteran AI | `dist/game-ai/veteran.js` | Used when `archetype==='veteran'`. `bot.js` routes to it. |
| Opponent entry | `dist/duel/opponents.js` | `edrin` / `אדרין`, "The Old Regular · Friendly, a little tipsy". He is featured beside Bramm on the select screen. |

## Behaviour (all data-driven in `edrin.js`)

**Casual voice timing**
- An ordinary line needs at least 3 meaningful actions **and** about 11 s of *active* play since his last line.
- The app's active clock stops while the game is paused or the tab is hidden, so resuming play never triggers an immediate line.

**Round budget**
- He has 2 casual lines per round, or 3 in a long round (40 or more events).
- Results are separate.

**Probabilities and priorities**

| Reaction | Chance | Priority |
|---|---|---|
| Player good move | 20% | MEDIUM |
| Edrin good move | 15% | LOW |
| Player draw | 12% | LOW |
| Edrin draw (bad draw) | 10% (20%) | LOW |
| Player reaches one card | 50% | HIGH |
| Edrin reaches one card | 42% | MEDIUM |
| Brutal move | 50% | MEDIUM |
| Idle | 30% | LOW |
| Results | always | CRITICAL |

**Idle lines**
- An idle line needs 18 s of quiet since his last line or the round start.
- It is never chosen while the player is on one card.
- At most 1 per round, or 2 in a very long round.

**No stacking**
- A new line only plays if it outranks the one being spoken.
- A result line owns the stage, so no later gameplay line can replace its face or bubble.
- This last fix also applies to Bramm.

**Anti-repetition and fatigue**
- The last 3 base reaction IDs are excluded whenever an alternative exists. These IDs are the same in English and Hebrew.
- He never says the same line twice in a row.
- Result lines cycle through the full set within a match before any line repeats.
- Each time a casual remark repeats within a match, its chance is halved.

**Expressions**
- Faces react much more often than he speaks: eyebrow raises, sighs, sympathy and a "focused" flash before weighty decisions.
- Silent faces are spaced at least 2.4 s apart and never change while he is speaking.
- His baseline is `default`. It switches to `player_one_card_mild_concern` while the player holds one card, and the result face holds under the result slip.

**One-card moments**
- No panic state exists.
- He stays silent if the player still has the turn and may go straight out, or if Edrin himself is mid-turn on his last card.

**Results**
- He says a round line while the match continues and a match line at the end, never both.
- The final result beat is 1.5 s.

**Intro**
- The first meeting always gets one intro line.
- After that, each match gets either a line, a look, or nothing.

**Brutal move**
Only these count as brutal:
- the player is forced to draw 4 or more,
- the player is dragged off their last card,
- or an Edrin Crossbow volley of 4 or more cards.

**Generic bot quips** are suppressed for every authored character.

## Veteran AI (fair)

**What it can see**
- It reads only its own hand, the face-up discard pile, the public log and the opponent's card count.
- It infers colours the opponent could not follow from the opponent's public draws.
- A unit test swaps the human's hidden hand and the draw pile and checks that every decision stays the same.

**Planning**
- It holds Runes and Kings for the finish and passes Curses back instead of spending the King.
- It empties a colour with the Crossbow and ends the volley on its most punishing card.
- It avoids leaving a Quickstep as its last card.
- In the late game (5 or fewer cards, or the opponent on 4 or fewer) it runs a short look-ahead. It imagines opponent hands drawn only from cards it has not seen, plays each candidate move forward 14 plies, and is capped at 35 ms of thinking time per decision.

**Mistakes**
- About 10% of the time it takes the second-best choice when two options are close.

**Strength against the existing bot profiles** (3,200 two-player hands, seeded):

| Opponent | Edrin win rate | Points |
|---|---|---|
| mercenary (Bramm's style) | 53.5% | 1593–1334 |
| hunter | 52.8% | 1554–1396 |
| bard | 54.5% | 1661–1429 |
| scholar | 55.9% | 1703–1389 |

- For scale, random legal play wins about 41% against the generic bot.

**Pacing** is the normal opponent pacing, with no fake thinking delays.

## Assets

- `dist/assets/edrin/expressions/` holds 34 WebP files at 512×768. They are converted from the 1024×1536 pack, keep the full canvas and are never trimmed.
- `dist/assets/edrin/voice/` holds 61 MP3 files. `edrin_round_loss_01_he` had no file extension and was copied with `.mp3`.
- **There is no English recording for `edrin_idle_03`.** In English that line is simply never chosen. Its Hebrew take works. If you drop in `edrin_idle_03.mp3`, delete the `UNRECORDED` entry in `edrin.js`.
- Deleted lines are not referenced anywhere: `player_one_card_03`, `round_loss_02` and `match_win_01`.

## Debug (browser console)

`window.EdrinDebug` provides:
- `trigger(id)`, `expression(key)`, `previewExpressions(ms)`, `forceState(state)`
- `simulateOneCard()`, `simulateEdrinOneCard()`, `simulateBrutal()`
- `simulateRoundWin()`, `simulateRoundLoss()`, `simulateWin()`, `simulateLoss()`, `simulateIdle()`
- `history()`, `cooldown()`, `states()`
- `setLanguage('en'|'he')`
- `markVoiceMissing(voice)`

`window.BrammDebug` is unchanged.

## Verification

**Unit tests:** `npm test` reports 137/137 passing. This is the original 112 plus 25 Edrin tests. Four existing tests were updated to the generic names.

**Browser smoke test:** `tests/e2e/smoke.mjs` passes. It now includes a Hebrew Edrin duel with a check for no generic bubbles.

**Full five-round playtests (EN and HE)**
- Edrin said about 0–2 casual lines per round, plus exactly one result line.
- Bubbles appeared in the correct language and direction.
- There were no console errors.

**Bramm regression playthrough:** his intro, gameplay lines and results are unchanged.

## Publishing

`sw.js` cache and `index.html` were bumped to v78, and the new modules were added to the service worker's precache list.
