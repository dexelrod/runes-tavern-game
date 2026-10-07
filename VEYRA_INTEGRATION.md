# Veyra — integration notes (v104)

Veyra, the omen-reader, is the fifth authored opponent. She is a rural witch of about forty: intelligent, obsessive, superstitious and a little unstable. She reads meaning into carved bones, a candle flame, colours, cards and coincidences, and she argues with all of them. **Kesh watches the universe; Veyra argues with it.**

She is a full Duel opponent and a voiced Tavern guest, on the same framework as everyone else: one reaction table on the **shared controller** (`duel/authored-controller.js`), the shared expression stage, the speech bubble, the single Web Audio voice path and the table-wide Tavern director. There is no Veyra dialogue engine.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Shared pack helpers (new) | `dist/duel/authored-pack.js` | <ul><li>`lineFactory` builds a reaction table from a script; `createVoiceCatalog` builds the voice library and the EN/HE resolvers from **one rule per character**: which take, if any, plays for a line in each UI language.</li><li>`duelEventFor` is the shared Duel classifier, named from the character's side (`own_*`, `player_*`, `curse_taken` / `curse_landed`, `stop_taken` / `stop_given`, `king`).</li><li>Veyra and Gorvan are built on these; the older packs are unchanged.</li></ul> |
| Veyra pack | `dist/duel/veyra.js` | The authored EN/HE script (directions removed), the 61-pose map, reactions, silent faces, the **omen book** and `VEYRA_SPEC`. |
| Registry | `dist/duel/characters.js` | `veyra` entry with `generic:true` and `omens:true`. `VOICED_OPPONENTS` is now six. |
| Duel dispatch | `dist/app.js` → `genericDuelUpdate`, result dispatch `isGenericDuel()` | One generic path for data-driven packs: no per-character branch. |
| AI | `dist/game-ai/veteran.js` → `CONTROL_PROFILE`, `TAVERN_CONTROL_PROFILE`; `bot.js` | Archetypes `witch` (Duel) and `tavern-witch` (Tavern). |
| Opponent entry | `dist/duel/opponents.js`, `game-engine/match.js` | `veyra` / `ויירה`, female, house green, generic pools empty. |
| Tavern | `dist/duel/tavern-director.js`, `dist/duel/banter.js` | Her allowlist, faces, omen lines, and her banter with Kesh, Ragna, Edrin (and Gorvan). |

## Assets

**Expressions** — `dist/assets/veyra/expressions/`, 61 WebP files at 640×640 (q86, 6.7 MB). Every pose is the same 1920 px crop of its 2048 px master (the pack's clear 64 px inset removed), uniformly scaled and bottom-centre anchored, so swaps never jump. Masters stay in `Runes Card Game/veyra_character_pack/`.

**Props follow the words.** The bones appear only in poses where she consults them (01 03 09 21 25 27 34 35 36 46 53 60); the candle only for flame lines (05 08 28 56 59 60). The default holds the bones, as the pack specifies. No glow, particle or animation is attached to any of them (a test guards the CSS). The loudest poses (31 "I TOLD YOU!", 32 "THERE!") are kept for omens that land.

**Voice** — `dist/assets/veyra/voice/`, shipped untouched: 55 lines (108 takes), her 6 banter lines in both languages, and her 3 English-only Gorvan banter lines. Levels sit inside the range of the existing cast (her quiet lines are quiet by performance; nothing was normalised).

**Deliberate exceptions**
- `veyra_intro_02` ("Quiet. Let me see.") and `veyra_player_good_move_01` ("Oh! Clever.") exist **only in English**. In Hebrew they are simply not in the candidate pool — no English fallback, no translation (`VEYRA_ENGLISH_ONLY`; the controller, the Tavern director and the shared voice resolver all agree).
- Deleted and never referenced: King 01, both Reverse lines, `ragna_banter_veyra_01b`, `veyra_banter_ragna_01c`. Sequence gaps were not filled.

**Preload** — 23 critical poses (resting face, intro, first reactions, omen poses) decode before she sits down; the rest decode straight after in the background, four at a time. Voices warm intro-first, then six at a time.

## Behaviour

**How much she talks**
- More than Kesh, still well short of constant: ~11 s and three meaningful actions between casual lines, two ordinary lines a hand (three in a long one).
- In real-time five-round Duels (phone, captions on): **12–16 lines a match** including the intro and one result line per hand; **55–110 face changes**; 0–1 omen declarations a hand.
- Her face does a lot of the work: interest, suspicion, a look at the bones or the flame, a reconsidering glance — most moments get a look and no words.

**Contextual card lines** (not a rulebook narrator; most of these moments get only a face)

| Moment | Line | Chance |
|---|---|---|
| A Curse lands on her | "That is not a proper curse." | 30% |
| Her Curse lands on you | "Simple. Effective." | 22% |
| Her Shield stops you | "No. Not yet." (more likely when you are close) | 24% |
| Your Shield stops her | "Something wanted that stopped." | 24% |
| Your King (esp. breaking her Curse) | "I don't trust crowns." | 30% (55%) |

**One-card states** — when you reach one card she is suddenly alert (one strong line, 60%: alarm, the bones, "This fits.", "Don't move. I'm thinking."); her baseline becomes a fixated stare. On her own last card the pattern is resolving ("Last card...", "Say something useful.", "I know how this ends."). Never more than one line.

**Results** — a round line while the match continues, a match line at the end, never both. A result line now waits for a line in progress to finish instead of cutting it off (shared improvement, all characters). Win: the pattern made sense. Loss: fascinated by what she misread. **"Wait. Unless losing was the sign."** is weighted heavily after an omen failed her this match (and is common otherwise).

## The omen book

Character presentation, never a rule. It reads public facts only, changes nothing in the game, and nothing in the engine or AI reads it (a test checks).

1. Now and then, in a quiet moment, she declares an omen. Only an omen the table actually heard is remembered.
2. The book watches ordinary public events. The table has to move on first (3–4 actions and ~7 s) — an omen that "comes true" on the very next card feels like cheating.
3. **Hit:** her biggest moment ("I TOLD YOU!" for the first of a match, then "Exactly! Exactly!", "The bones don't lie."). If someone is mid-line, the payoff waits for the voice to end (a few seconds at most) — it is never lost to timing.
4. **Miss:** after the window runs out she argues with the bones ("No. You were very clear.", "Oh, shut up.", "I read it too early.", "The meaning changed."). If the hand ends first, the omen lapses silently (the result line owns that moment) and still counts as a failed sign for her final line.

| Omen | Line | Close enough |
|---|---|---|
| draw | "Someone is drawing before this is over." | A Curse is taken; someone nearly out has to draw. |
| red | "Red brings trouble tonight." | A Burgundy Curse or Shield hurts someone; someone cannot follow Burgundy. |
| turn | "This game will turn on itself." | A Turnabout, a Curse thrown back, a King breaking a Curse, the lead changing hands. |
| regret | "Someone is going to regret a Curse." | A Curse thrown back or broken by a King; whoever cursed this hand ends up drawing. |

**Tuning** (`VEYRA_OMEN_TUNING`): one omen a hand at most, never two hands running, each omen once a match, three a match in a Duel and two at a Tavern table. Measured over simulated matches: **~2.3 omens a Duel match and ~1.9 a Tavern match; about half land** (Duel ~52%, Tavern ~55%). Real-time playtests matched: some evenings she is right, some she argues with the bones, and a few produce both.

## AI — control, competent, fair

`CONTROL_PROFILE`: the same public-information planner as Edrin, Ragna and Kesh, with a short look-ahead (fewer imagined hands than Edrin). She keeps a Shield, a Curse or a King back while the table is calm and spends them hard when someone gets close (`holdStop`, `disrupt`), and at a busy table she turns the order away from a player about to go out (`redirect`). Few slips (6%). Her madness is presentation; her card choices are calm.

- Hidden-hand swap test: identical choices whatever the hidden cards are.
- Over 400 hands each: ~52% against the mercenary and hunter bots, ~45–49% against Edrin and Ragna, ~55% against Kesh.
- At the Tavern (`TAVERN_CONTROL_PROFILE`): the same judgement without the look-ahead and a few more slips.

## Tavern Match

- She joins the guest roster (`VOICED_TAVERN_GUESTS`), seated by the same odds as everyone else; her seat portrait is her live expression art.
- Her allowlist is her whole set (the two English-only lines drop out in Hebrew by themselves). Omen lines use their own small allowance so the story can finish, but still wait their turn on the table's single voice and its pacing.
- Generic regulars' text quips never come from her seat; with voiced guests at the table they now come half as often (16 s apart) so the table stays readable.

## Banter (each exchange is one performance)

| Exchange | When | Notes |
|---|---|---|
| Veyra "Kesh. Look at that." → Kesh "I am." → Veyra "And you're just sitting there?!" | A quiet stretch | Kesh's face goes to the fire. |
| Kesh "A curious omen." → Veyra "Curious? It's screaming." → Kesh "You often say that." | A Turnabout, a King, or Kesh reading his stone | Kesh's reply comes after a deliberate pause. |
| Veyra "The flame just moved." → Ragna "Focus." | A quiet or slow moment | Deliberately two lines. |
| Veyra "Three bones crossed… and then the King appeared. Do you understand?" → Edrin "No idea, Veyra." → Veyra "Good. Neither do I." | Right after a King | Dry timing: Edrin answers after a pause. |

Veyra + Kesh is weighted a little higher when guests are seated (`TAVERN_PAIR_CHEMISTRY`), so the pair everyone wants to hear sits down about one evening in ten that has company.

## Debug (browser console)

`window.VeyraDebug`: `trigger(id)`, `triggerIn(id,'he')`, `expression(key)`, `previewExpressions(ms)`, `simulate*` (one card, Curse taken / landed, Shield taken / given, King, draws, good moves, slow player, results), **`declareOmen(kind)`, `omens()`, `simulateOmenHit()`, `simulateOmenMiss()`**, `history()`, `cooldown()`, `setLanguage()`, `markVoiceMissing(voice)`, `missingAssets()` (lists every face and voice for the active language, and the lines excluded in it), `englishOnly`.

## QA (v104)

- `npm test`: unit tests for the script, assets, language rules, omen book (settle, hit, miss, lapse, once each, frequency), AI fairness and strength, banter order, and restraint against Kesh and Ragna (`tests/veyra.test.js`).
- `npm run smoke`: a Veyra Duel round in Hebrew and English (her own lines only; English-only lines never play in Hebrew), and Veyra with Gorvan at one Tavern table.
- Real-time playtests in a browser: full five-round Duels in English and Hebrew; Tavern Matches with Kesh, Ragna, Edrin, Gorvan, and Gorvan + Bramm / Kesh; bubbles on and off; reload mid-match with an open omen (restored, no stale voice). 0 overlapping voices, 0 console errors.
- Visual: phone portrait, iPad portrait, desktop 1366, phone landscape, the home cameo, Duel select and Tavern seats. Her props stay above the Duel rim.
