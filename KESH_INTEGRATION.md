# Kesh — integration notes (v97)

Kesh, the Traveler, is the fourth authored opponent, after Bramm, Edrin and Ragna. He uses the same framework: one reaction table on the **shared controller** (`duel/authored-controller.js`), the shared expression stage, the speech bubble, and the single Web Audio voice path. There is no new dialogue engine. He also keeps his seat at the **Tavern Match** table, where the same reaction table and voice path drive his seat portrait.

His character is unchanged. He is a quiet lizardfolk traveller who reads the table through signs: roads, wind, fire and rivers. He watches everything and says little. Edrin is barely paying attention; Kesh pays very close attention and keeps it to himself.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Kesh pack | `dist/duel/kesh.js` | <ul><li>The authored EN/HE script, with acting tags stripped. The Hebrew is generated straight from `Kesh Script.txt`, not retyped.</li><li>The 40-expression map, `KESH_SPEC`, and the `keshEventFor()` (Duel) and `keshTavernEventFor()` (Tavern) classifiers.</li><li>The rune-tell helpers `keshTellFor()` and `keshDecisionIsMajor()`, and the voice library.</li></ul> |
| Registry | `dist/duel/characters.js` | Adds the `kesh` entry. `VOICED_OPPONENTS` is now `['bramm','edrin','ragna','kesh']`. |
| Omen AI | `dist/game-ai/veteran.js` → `OMEN_PROFILE`, `omenColour()` | <ul><li>Uses the same fair, public-information judgement as Edrin, without the look-ahead.</li><li>`bot.js` routes the `traveler` archetype to it. Old saves where Kesh is still `mysterious` are routed by `nameKey`.</li></ul> |
| Opponent entry | `dist/duel/opponents.js`, `game-engine/match.js` | <ul><li>`kesh` / `קֶשׁ`, male, archetype `traveler`, "The Traveler · Quiet and mysterious". His duel house is blue.</li><li>The generic pools are empty.</li></ul> |
| App wiring | `dist/app.js` | Covers the result lines, the Duel event dispatch, the Tavern seat, the reading rhythm and the rune tell (`planKeshTurn`, `stageKeshTell`), plus `window.KeshDebug`. |

### Separated from Rusk
- Kesh and Rusk used to share the `mysterious` archetype, its tavern quip pool ("The wind has changed.", "The fire knows."…) and its random +0–3 card scoring.
- Kesh now has his own archetype and AI. His Tavern seat never takes a generic line: `botLine()` returns nothing for him, and generic speakers are chosen from the other regulars.
- The `mysterious` pool is now Rusk's own trader lines ("Noted.", "Bad trade.", "Ears up."…), so Kesh's sayings come only from Kesh.
- The new Rusk Hebrew lines are unvoiced text written for this pass. They reuse Rusk's existing duel phrasing where possible, and are worth a native read.

## Assets

**Expressions**
- `dist/assets/kesh/expressions/` holds 40 WebP files at 640×640 (q86, 3.9 MB).
- Every pose is the same 1920 px crop of its 2048 px master, uniformly scaled and bottom-centre anchored, so swaps never jump. Poses are never mirrored, because the brooch sits on the viewer's right.
- The masters stay in `Runes Card Game/kesh_character_pack/`, outside the repo.

**Voice**
- `dist/assets/kesh/voice/` holds 103 MP3 files, shipped untouched. Their levels match Ragna's and Edrin's.
- `kesh_match_win_02_he` had no extension and was copied as `.mp3`.
- **There is no Hebrew take of `kesh_player_good_move_02`** ("Bold choice." / "בחירה מעניינת."). In Hebrew that line keeps its bubble but has no voice. To enable it, drop in `kesh_player_good_move_02_he.mp3` and remove the `UNRECORDED` entry in `kesh.js`.

**Retired**
- `assets/characters/table/kesh-seated.webp` is removed, along with its precache entry.
- Kesh's row on `duel-opponents.png` is no longer shown. The sheet stays because other regulars use it.
- His table props are now just the clay cup. The carved wooden token and the amulet are gone, because his rune stone lives in his hand.

**Preload**
- His expressions decode before he sits down, in a Duel or at a Tavern table that includes him. Active-locale voices warm in the background.
- Preloading now has a 5 s ceiling for every authored character. A slow or failed asset never holds the table: a missing face falls back to his default, a missing voice keeps its bubble, and missing bubble text logs on localhost but never crashes.

## Behaviour

**Frequency: the quietest voice**
- Before another ordinary line he needs 3 meaningful actions and about 13 s of active play.
- He gets **one ordinary line per round, or two in a long round**.
- One-card moments have their own small HIGH allowance, so they still land.
- Results always speak.
- In the shared simulation he says about 0.9 ordinary lines per round, against Ragna's 1.4 and Edrin's 1.2. His face changes more often than either of theirs.

**Faces carry him**
- Interest, a small disappointment, a brief reconsidering look and a closer gaze in the late game all happen without a word.
- His baselines:

| Table state | Expression |
|---|---|
| Normal | `default_observant` |
| Both hands at 3 cards or fewer | `close_observation` |
| Player on one card | `player_one_card` (studying it; never panic) |
| His own last card | `kesh_one_card` ("the road is clear") |

**Probabilities** (before cooldowns and budgets)

| Situation | Chance |
|---|---|
| Player good move | 13% (28% if big) |
| His good move | 9% |
| Shield on him | 20% |
| Curse taken | 18% |
| Turnabout | 16% (lower for his own) |
| King | 24% (lower for his own) |
| Setback | 24% |
| Signs proved wrong | 50% |
| Real haul for the player | 24% |
| His draw | 16% forced, 5% single |
| Player reaches one card | 55% |
| He reaches one card | 45% |

- The same words never come back to back, even from different files. "The wind has changed." is a skip, a setback and a lost round, so anti-repetition tracks the words as well as the recording.

**Intro**
- A first meeting always gets one line.
- Later meetings get a line (50%), only a look (30%) or nothing.
- The controller enforces one intro per match.

**Idles**
- They are rare: one per round at most, only after 20 s of quiet and 14 or more actions in the round.
- "Still here, then." plays for a player who has sat on a decision for 15 s, at most once a match.

**The signs can be wrong**
- If he consulted the stone before a move and the player's answer punishes it (Curses or Shields him, or turns the colour with a King or Rune), he reconsiders. The lines are "Hm. That's new.", "It was clearer earlier." or "The sign did not show this.", and he looks down at the stone.
- "I misread that one." leans heavily on rounds where he used the stone and lost.

**Results**
- He says a round line while the match continues and a match line at the end, never both.
- He shows no anger when he loses a match.

**Generic bot dialogue** is suppressed, as it is for every authored character.

## The rune stone tell

- The tell comes from his **real decision**. His move is decided once per turn (`planKeshTurn`) and the same action is then played.
- A major decision is a Curse, King, Rune, Runed Crossbow, a Shield against a short hand, any card while someone is on one card, or his own last cards.
  - About **38%** of major decisions get the tell.
  - About **5%** of ordinary ones get it too, so it is never a reliable warning.
  - Never when he has a single legal card, never two turns running, and at most 4 per round.
- The beat: `omen_touch` about 620 ms before the card leaves his hand. Then 62% go straight back to calm, 22% go to `omen_reading` and 16% to `omen_realization`.
- About 30% of tells try for an omen line ("There you are." / "A curious sign." / "Ah. Of course."), still under cooldowns and capped at **2 per match**. Most tells are silent.
- There is no glow, particle or animation, only a pose swap. A test guards the CSS against this.
- **Changed from the brief:** the brief suggested a 250–400 ms beat. A full painted pose swap that short doesn't register on a phone, so the touch shows for about 620 ms before the card moves and holds briefly after. The probabilities keep it subtle.
- **Stage size:** at the Duel table the rim used to cut him at about 77% of his height, which hid the stone. His stage is sized (`--fig-h × 1.22`) so the rim falls below his hands. His head is about 6% smaller than Ragna's, and the stone stays visible.

## Reading rhythm

| Turn | Think time |
|---|---|
| Quick (one legal card, a draw, inside a Crossbow) | 0.6–0.9 s |
| Ordinary | 0.85–1.5 s, with 12% getting an extra 0.6 s pause |
| Major | 1.25–2.15 s |

- Everything is capped at 2.4 s, and multiplied by 0.75 on the "quick" difficulty.

## Omen AI (fair)

- He reads only his own hand, the face-up discards, the public log and card counts. The hidden-hand swap test passes.
- **Profile:**
  - holds Runes less than Edrin (he changes colour readily);
  - keeps Curses and Kings for when they matter;
  - more jitter than Edrin;
  - picks a close second-best card 4% of the time;
  - **superstition:** the hand's *omen colour* is the colour of the first card turned up. He gives a small bonus to keeping play on it, and about one card's worth of bonus to naming it after a Rune or King. He never names a colour he doesn't hold. A habit like this is something an attentive player can learn.
- **Results over 400 hands each, alternating who leads:**
  - 48–57% against the mercenary, hunter, scholar and trader bots;
  - 44% against Edrin and 46% against Ragna;
  - in four-player Tavern hands he wins 29% (25% would be an even share).
- Balanced and beatable.

## Tavern Match

- His seat portrait is his live expression art.
- Card events at the table go through `keshTavernEventFor`. When Kesh speaks, the generic regulars stay quiet for that update, and he never talks over another voice or bubble.
- He is one regular of four there, so his casual chances are **halved**.
- He only *voices* a last card that is yours. For the other regulars he just looks.
- No generic quip may cut across his line or bubble.
- Results: he may say a round line when he wins (75%) or when you win (30%). At the end of the evening he takes a match line if he is champion, or 70% of the time if you are.
- The bubble behaves as in a Duel: captions on shows the exact line; captions off is voice only. If the voice can't play (sound off), the words still show.

## Debug (browser console)

`window.KeshDebug` provides:
- **Lines and faces:** `trigger(id)`, `triggerIn(id,'he'|'en')`, `expression(key)`, `previewExpressions(ms)`, `forceState(state)`, `states()`, `history()`, `cooldown()`, `locale()`, `setLanguage()`
- **Situations:**
  - `simulateOneCard()` / `simulatePlayerOneCard()` and `simulateKeshOneCard()`
  - `simulateCurse(n)`, `simulateSkip()`, `simulateReverse()`, `simulateKing(broke)`
  - `simulateOmenFailure()`, `simulateSetback(haul)`
  - `simulatePlayerDraw()`, `simulateKeshDraw(forced)`, `simulatePlayerGoodMove()`, `simulateKeshGoodMove()`
  - `simulateSlowPlayer()`, `simulateIdle()`
  - `simulateRoundWin()`, `simulateRoundLoss()`, `simulateWin()`, `simulateLoss()`
- **Rune tell:** `simulateRuneTell({speak,after})`, `plan()`, `tellMemory()`
- **Assets:** `markVoiceMissing(voice)` and `missingAssets()`. The latter checks all 40 faces and every voice file for the active language, and lists the unrecorded take.
- **Tavern:** `tavern()`, `tavernTrigger(id,lang)`, `tavernExpression(key)`

## QA (v97)

- `npm test`: 193 passing, including 22 Kesh tests.
- `npm run smoke`: 63 checks, including a Kesh Duel in Hebrew and English.
- **Full real-time 5-round Duels**, phone size, captions on, one in English and one in Hebrew:
  - 12 lines per match each: the intro, about one ordinary line per round, and one result line per round (never both round and match);
  - 88–104 face changes across 22–25 distinct poses;
  - the stone tell fired 4 times per match;
  - every bubble was an exact authored line with the right direction;
  - no generic bubbles and no console errors.
- **Tavern** (3 rounds, desktop):
  - Kesh said 3–7 lines while the generic regulars said 18–26;
  - every Kesh line was authored;
  - no bubble overlaps after the fix;
  - 78–95 face changes, 2–3 tells.
- **Visual:** checked on phone portrait, desktop 1366, iPad 820×1180, phone landscape, the home cameo, Duel select and the Tavern seat. The stone is visible at the Duel rim in every rune pose.
