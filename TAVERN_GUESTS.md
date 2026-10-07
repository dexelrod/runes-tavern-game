# Voiced guests at the Tavern — integration notes (v101)

Now and then Bramm, Edrin, Ragna or Kesh happens to be playing at a Tavern Match. They say a handful of approved lines, pull faces at what happens around them, and, rarely, two of them trade lines. The aim is "Bramm happened to be in tonight", not a character mode.

Only existing recordings are used. No new dialogue or audio was created.

## Turning it off / reverting

| Level | How | Effect |
|---|---|---|
| Player | Settings → Table → **Voiced characters at the Tavern** (`settings.tavernGuests`, on by default) | Off: new Tavern Matches seat only the nine ordinary regulars. Guests already seated in a match in progress stay in their seats but fall silent (faces only). |
| Code | `TAVERN_GUESTS_ENABLED=false` in `dist/game-engine/match.js` | No guests are seated for anyone. Saved matches that already contain guests keep them, and they still talk unless the player turns the setting off. |
| Git | Revert the v101 commit | Back to v100, which also puts Kesh back among the ordinary regulars. |

## Architecture

| Piece | File | Notes |
|---|---|---|
| Guest roster and odds | `dist/game-engine/match.js` | <ul><li>`VOICED_TAVERN_GUESTS`, `TAVERN_GUEST_ODDS` (one 30%, two 7%, never three) and `TAVERN_GUESTS_ENABLED`.</li><li>`tavernGuestsFor(seed,{voiced,guests})` seeds the guests and shuffles the seats, so a saved match restores the same table.</li><li>The ordinary regulars are now the nine unvoiced ones. Kesh moved to the guests.</li></ul> |
| Director | `dist/duel/tavern-director.js` | <ul><li>One table-wide speech coordinator. Each guest is data: their Tavern allowlist (`TAVERN_GUEST_POOLS`), talkativeness (`TAVERN_GUEST_TALK`) and faces (`FACES`, `RESULT_FACES`).</li><li>Table events (`move`, `good_move`, `draw`, `penalty`, `skip`, `king`, `reverse`, `one_card`, `idle`, `slow`, `intro`, `round_end`, `match_end`, Kesh's `omen` / `omen_failed`) arrive with *who did it* and *who it hit*. Each seat reads the event from its own side (`own_*` / `other_*`).</li><li>The director returns **at most one line or one banter per event**, plus silent faces.</li></ul> |
| App wiring | `dist/app.js` | <ul><li>`setupTavernGuests`, `tavernObserve` (one table update becomes one event with actor and victim) and `tavernEvent`.</li><li>`performGuestLines` plays lines one at a time through the single `speakCharacterVoice` path; a banter's second line waits for the first to end.</li><li>Guest seat faces, the idle tick, Edrin's occasional dawdle, and the director's memory saved with the match.</li></ul> |
| AI | `dist/game-ai/veteran.js`, `bot.js` | <ul><li>`TAVERN_VETERAN_PROFILE` (Edrin) and `TAVERN_PRESSURE_PROFILE` (Ragna): their Duel judgement without the look-ahead, plus a few more slips.</li><li>Bramm plays his usual mercenary style; Kesh his omen profile.</li></ul> |
| Settings | `dist/platform/storage.js`, `app.js` | `tavernGuests:true` default, with a toggle under **Table**. |
| Styles | `dist/styles.css` | Per-guest seat framing: `.seat-figure.guest-<id>`. |
| Audio | `dist/platform/audio.js` | Exposes `voiceName` and an interruption counter for QA. Playback behaviour is unchanged: Web Audio game sound, no media element, no Now Playing. |
| Kesh | `dist/duel/kesh.js` | His Tavern-only code (`keshTavernEventFor` and the Tavern damping) was removed. He now uses the shared guest system like the others. |

## Who sits down

- About **30%** of new Tavern Matches have one voiced guest, and about **7%** have two. Never three.
- Seats are shuffled, so a guest can sit anywhere.
- The odds are constants in `match.js`.
- Kesh's presence drops from about 30% of evenings (when he was a regular) to about 11%. That's deliberate: every voiced character is equally special now.

## How often they speak

- **One** table-wide director makes every decision. A moment that makes a guest eligible to speak does not mean they speak.
- **Gates**
  - At most one ordinary line per hand for the whole table, and at most one "last card" line.
  - About 15 s and 3 actions between casual lines.
  - Each guest has a per-match cap on non-result lines: **3** with one guest, **2** each with two.
  - Nothing starts while a voice is playing or a guest bubble is showing.
- **Repeats:** every recording is heard at most once a match, and identical words never come back, even from a different file.
- **Shared moments:** two guests share the moments. Each roll is scaled by 0.6 and one roll serves the whole table.
- **Talkativeness:** Edrin is the quietest (0.6×); Bramm is a little louder (1.15×).
- **Generic regulars' text quips** never come from a guest's seat, never start while a guest is speaking, and are skipped for any update where a guest spoke.
- **Results**
  - The winning guest may speak at round end (35%).
  - A losing guest rarely does (12%).
  - At the end of the match, the champion guest usually speaks (85%) and a losing guest sometimes does (50%).
  - Never a round line and a match line for the same result.
- **Measured over full five-round matches in a real browser:**
  - one guest: **4–5 lines a match**, including results;
  - two guests: **5–7 lines between them**, about 3 each;
  - **0** overlapping voices, **0** missing audio, **0** console errors.

## Tavern allowlists

These follow the owner's list exactly, with the deviations below.

- **Kesh:** every line except the three omen lines, which play only during a real rune-stone tell at the table.
- **Edrin:**
  - intro 01–03, idle 01–03;
  - player good move 01–03, good move 01–03;
  - player draw 01, draw 01–02;
  - player one card 01–02, one card 01–02;
  - round win 01–03, round loss 01 and 03;
  - match win 02–03, match loss 01–03;
  - brutal move 01–02.
- **Ragna:**
  - intro 03, idle 01–05;
  - player good move 01–03, good move 01–03;
  - player draw 02, draw 01–03;
  - player one card 01–04, one card 01–03;
  - round win 01, 02, 04; round loss 01–03;
  - match win 01 and 03, match loss 01 and 03;
  - noise 01, self mistake 01.
  - No wager lines.
- **Bramm:**
  - intro 01–02, idle 01–02;
  - taunt 01–02, mock move 01–02;
  - player good move 01–02, player draw 01;
  - bramm good move 01–02, bramm draw 02;
  - excuse 01–02;
  - player one card 01, 03, 05, 06, 07;
  - loss 01, round win 01–04;
  - win 01, 02, 04, 06, 07, 09, 10;
  - match loss 01–03.

## Banter (two beats, existing recordings only)

**The rules:**
- Speaker A plays to the end; after a natural 0.6–1.5 s pause, B answers.
- Each exchange happens at most once a match, and at most two exchanges per match. There's a 40 s gap between exchanges.
- **Every line must be literally true at that moment**, or the exchange doesn't run.

| # | Exchange | When |
|---|---|---|
| 1 | Ragna "QUIET! THERE'S A GAME ON!" → Edrin "Got any ale or mead?" | A quiet stretch at the table (counts as Ragna's one shout for the match) |
| 2 | Ragna "Eyes on the table." → Edrin "Could've sworn I had a drink." | Edrin is the current player and dawdling |
| 3 | Ragna "DON'T DISTRACT ME." → Edrin "Got any ale or mead?" | Ragna reaches one card (10%) |
| 4 | Bramm "Did you SEE that? Course you did." → Kesh "Interesting." | Bramm makes a strong move |
| 5 | Bramm "Good ale. Terrible company." → Edrin "Nice tavern, mostly." | A quiet stretch. **Hebrew only** (see deviations) |
| 6 | Ragna "Keep up." → Bramm "That doesn't count." | Ragna's strong move hits Bramm |
| 7 | Ragna "Good." → Bramm "Lucky." | A third player makes a strong move |
| 8 | Edrin "Sorry about that." → Bramm "That doesn't count." | Edrin's brutal Curse lands on Bramm |
| 9 | Edrin "Oh dear." → Ragna "Damn it." | Edrin's brutal Curse lands on Ragna |
| 10 | Bramm "Someone get me another ale! Victory's thirsty work!" → Edrin "Never mind. Ale." | Bramm wins the match (40%); replaces the result lines |
| 11 | Bramm "Any day now. Ale's getting warm." → Ragna "QUIET! THERE'S A GAME ON!" | You take a long turn (12 s) |
| 12 | Bramm "House rule." → Kesh "Really?" | A Shield, King or 4+ Curse lands on Bramm |

**Chances:**
- A banter has a 13% chance at an eligible moment (14% at a quiet or slow moment), within the gates above.
- In simulation, a match gets a banter about 10–12% of the time with Bramm and another guest, and about half the time with Ragna and Edrin. Kesh with Ragna or with Edrin has no banter in the approved set.
- Since two-guest evenings are about 7% of matches, banter is a genuinely rare treat.

## Deliberate changes from the brief

- **`bramm_player_one_card_02` is left out.** It was retired from the game in v87 ("You've got two").
- **Ragna's "Stupid." (`ragna_draw_02`) and "Wrong card. My fault."** play only after her own knowing second-best card cost her a draw, as in a Duel. Bad luck never earns self-blame.
- **Ragna's "Thank you." (`ragna_idle_05`)** plays only as the follow-up to "QUIET! THERE'S A GAME ON!" (60%).
- **Bramm's "Still lucky." (`bramm_player_good_move_02`)** only follows his own "Lucky." earlier in the same match.
- **Edrin's "Nice tavern, mostly." (`edrin_idle_03`) has no English recording**, so banter 5 runs only in Hebrew.
- **"Edrin is taking long" (banter 2):** AI turns never naturally take long. About 7% of Edrin's Tavern turns he dawdles for an extra 2.8 s, which creates the moment.
- **Banters 8 and 9** need a genuinely brutal Curse (4+ cards, or one that drags a near-empty hand back up), not any +2.
- **Banter 12** is triggered by a real setback for Bramm: a Shield, a King, or a 4+ Curse.
- **Kesh** is no longer an ordinary Tavern regular; he appears only as a voiced guest.
- **Turning the setting off mid-match** doesn't remove guests already seated, since that would rewrite the table. They go quiet.

## Debug (browser console)

`window.TavernDebug` provides:
- `startWith(['bramm','ragna'])`: a fresh Tavern Match with those guests.
- `guests()`, `state()` (lines used, banters, log), `cooldown()`.
- `event(type, context)`: replay an event through the director.
- `say(voice)`, `banter(id)`, `face(seat, expression)`.
- `setLanguage('en'|'he')`.
- `missingAssets()`: every face and allowlisted voice for the seated guests.

`window.RunesQA.snapshot()` also reports the seated guests, the current voice and voice interruptions.
