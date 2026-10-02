# Ragna — integration notes (v88)

Ragna is the third authored 1v1 opponent. She uses the same character framework as Bramm and Edrin: one expression stage, one speech bubble, one Web Audio voice channel, shared preloading, result timing and debug tools. This pass also moved Edrin's controller logic into a **shared controller** (`duel/authored-controller.js`). Edrin and Ragna are now both configurations of that one scheduler, so there is no third dialogue engine. All 137 earlier Edrin and Bramm tests pass unchanged.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Shared controller | `dist/duel/authored-controller.js` | Handles reaction choice, anti-repeat on the base reaction ID, result cycling, cooldowns in actions and active seconds, round budgets, priority gating and repeat fatigue. It also runs silent expression beats, table-driven baselines and two-beat follow-ups. |
| Edrin | `dist/duel/edrin.js` | Edrin's rules are now `EDRIN_SPEC` on the shared controller. His behaviour is identical, and his tests are unchanged. |
| Ragna pack | `dist/duel/ragna.js` | Holds her authored EN and HE script (acting tags stripped, Hebrew reproduced exactly), the 40-expression manifest, `RAGNA_SPEC`, the `ragnaEventFor()` classifier and her voice library. |
| Registry | `dist/duel/characters.js` | Adds the `ragna` entry and `VOICED_OPPONENTS = ['bramm','edrin','ragna']`. The slow-player wait is now a pack property, `slowPlayerAfter`: Bramm 11 s, Ragna 10 s. |
| Pressure AI | `dist/game-ai/veteran.js` → `PRESSURE_PROFILE` | Uses the same fair planner as Edrin. `bot.js` routes the `warrior` archetype to it. |
| Opponent entry | `dist/duel/opponents.js` | `ragna` / `ראגנה`, female, "The Northern Warrior". Duel house: blue. |

## Assets

- `dist/assets/ragna/expressions/` holds 40 WebP files at 640×679. They are uniform scales of the 1536×1630 masters, keep the full canvas, are bottom-centre anchored and have no per-state crops. CSS gives her stage `aspect-ratio:640/679` everywhere it is drawn.
- `dist/assets/ragna/voice/` holds 81 MP3 files.
  - `ragna_round_loss_01` had no extension and was copied as `.mp3`.
  - **`ragna_player_draw_01.mp3` is still in the source folder but is deliberately not shipped or referenced.** The tests enforce this.
  - **There is no Hebrew take of `ragna_player_one_card_03`.** In Hebrew that line keeps its bubble but has no voice. Drop in `ragna_player_one_card_03_he.mp3` and remove the `UNRECORDED` entry to enable it.

## Behaviour

**Frequency**
- She speaks more than Edrin and much less than Bramm.
- A casual line needs at least 2 meaningful actions and 8 s of active play since her last line.
- Each round allows 2 non-result lines, or 3 in a long round. Results are extra.

**Probabilities**

| Situation | Chance |
|---|---|
| Player good move | 30% (50% if big) |
| Her good move | 22% |
| Player takes a real haul | 50% |
| Her draw | 32% forced, 10% single |
| Self-mistake | 70% |
| Player reaches one card | 60% |
| She reaches one card | 45% |
| Results | always |

**Faces**
- Her face reacts much more often than she speaks.
- Anger is a short flash of about 1.1 s, then she returns to her baseline.

**Baseline expressions**

| Table state | Expression |
|---|---|
| Normal | `default_focused` |
| Both hands at 3 cards or fewer | `enjoying_challenge` |
| Player on one card | `player_one_card_focus` (energized, never panic) |
| Her own last card | `finish_strong` |

**Intro**
- She says exactly one intro line per match.
- On a first meeting it is `intro_01` or `intro_03`.
- `intro_02` ("Better. Now we have a game.") plays only when you press Rematch after she demanded double (`match_win_02` or `match_loss_02`). That is the only time stakes "rise".
- `intro_04` plays only on later meetings.

**Wager**
- The game has no wager economy, so all of her wager talk is flavour. No coins or scores ever change.

**Concentration lines**
- `idle_01` and `idle_02` only fire when you sit on your turn for 10 s or more.
- `idle_03` is rare self-talk during a quiet stretch.
- She never uses them while you are on one card.

**Tavern shouting**
- There is at most **one shout per match**. This covers `idle_04`, `noise_01` and the rarer `one_card_02`.
- Outbursts need 16 s of quiet first.
- `idle_04` is followed by `idle_05` ("Thank you.") 60% of the time, after a beat of silence. That is a single performance through `followUp` and never stacks over another line.

**Self-mistakes**
- She only says "Wrong card. My fault." or "Stupid." when two things are both true:
  1. Her own planner **knowingly took its second-best option** (the `slip` flag reported by `chooseVeteranAction`).
  2. That choice then forced her to draw.
- Bad luck and Curses from you never count, so these lines are rare by design.

**Results**
- She says a round line while the match continues and a match line at the end, never both.
- "That's it?" leans heavily on easy wins of 8 points or more.
- A close match loss favours the energized and respectful lines.

**Generic bot dialogue** is suppressed, as it is for every authored character.

## Pressure AI (fair)

**What it can see**
- Like Edrin's planner, it reads only its own hand, the face-up discards, the public log and card counts.
- The hidden-hand swap test passes for her too.

**Tuning compared with Edrin**
- She holds Curses and wilds less.
- She has extra appetite for Stop, Quickstep, Curse and Crossbow when she can follow.
- She is extra keen to punish a hand of 3 cards or fewer.
- She makes fewer slips: 7% instead of 10%.

**Results over 2,400 hands, alternating who leads**
- About 55–56% against the mercenary and hunter bots.
- About even against Edrin (51%).
- She ends hands holding fewer power cards than Edrin.

## Duel screen and menu

**Home menu**
- The order is now **Duel → Tavern Match → Quick Play**.
- The Duel entry features one voiced regular, chosen at random each visit, with their line and your record against them.

**Duel screen**
- It shows only Bramm, Edrin and Ragna, one at a time, sitting behind the table rim.
- You can switch between them by swipe, the arrows, the dots or the keyboard.
- It opens on the featured regular, which is random each visit.
- A small "Or a random regular" link starts a duel against one of the ten unvoiced regulars, never the same one twice in a row.

## UI asset requests (delivered)

- The five new seated portraits (Roderic, Lio, Mograth, Harrow, Rusk) now sit at the Tavern Match table like the original five.
- The plank, parchment and brass-plate textures are wired in.
- The masters stay in the owner's local `asset-masters/` folder, outside the repo.

## Debug (browser console)

`window.RagnaDebug` provides:
- `trigger(id)`, `expression(key)`, `previewExpressions(ms)`, `forceState(state)`, `states()`, `history()`, `cooldown()`
- `simulateOneCard()`, `simulateRagnaOneCard()`, `simulatePlayerDraw()`, `simulateRagnaDraw(forced)`, `simulateSelfMistake()`, `simulateSlowPlayer()`
- `simulateRoundWin()`, `simulateEasyRoundWin()`, `simulateRoundLoss()`, `simulateWin()`, `simulateLoss()`
- `simulateNoise()` and `simulateTavernGag()` (04, a beat, then 05)
- `setLanguage('en'|'he')`, `markVoiceMissing(voice)`
