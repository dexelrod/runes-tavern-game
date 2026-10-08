# Voiced guests at the Tavern — integration notes (v101, updated v103, v104, v105, v106, v107, v108, v109)

Now and then Bramm, Edrin, Ragna, Kesh, Veyra or Gorvan happens to be playing at a Tavern Match, usually in company. They say a handful of approved lines, pull faces at what happens around them, and, rarely, two of them trade lines. The aim is "Bramm happened to be in tonight", not a character mode.

Only existing recordings are used. No new dialogue or audio was created.

**v105: more banter.** The guests trade lines far more readily. Base odds are up (`banterChance` .13 → .22, `idleBanterChance` .14 → .28), each exchange's own authored odds are multiplied by `banterBoost` 1.6 (capped at .85), a match can hold up to **four** exchanges (was two) with a **25 s** gap (was 40 s), at most one a hand. An exchange no longer waits on the per-guest line cap or on a casual line already said this hand; it still needs the table quiet (`casualGap`, `casualEvents`) and every line still has to be literally true. Measured on the test event stream: about **1.5 exchanges per two-guest match** (v104: 0.4), and over 90% of two-guest matches now have at least one (v104: 40%). Most pairs now play through all the exchanges they have, so a pair's exchanges come back more often across evenings. The ordinary regulars' text chatter after a plain card is also up (`TABLE_BANTER_CHANCE` in `app.js`, .1 → .18). Who sits down is unchanged.

**v106: thirteen new exchanges** (owner-written, English recordings only; in Hebrew they run as the authored Hebrew text, silent, with bubbles on — the same rule as the Gorvan exchanges). Every pair of guests now has at least two exchanges, so the seating weights in `TAVERN_GUEST_PAIRS` were updated and the three pairs that used to be rare (Bramm+Veyra, Edrin+Kesh, Kesh+Ragna) now sit down as often as the rest. Exchanges can now run four lines. Kesh now and then sits over his stone a while at a Tavern table (dawdle .05, like Edrin and Gorvan), so Ragna's "Is the stone playing for you?" has a real moment. Measured: about 1.8 exchanges per two-guest match.

| Exchange | Lines | When |
|---|---|---|
| `veyra_bramm_warning` | Veyra "The cards are warning you." → Bramm "They ought to warn the others." | Bramm makes a strong move |
| `veyra_bramm_destiny` | Bramm "One card. That's what destiny looks like." → Veyra "Destiny doesn't usually smell of ale." → Bramm "Mine does." | Bramm reaches one card |
| `edrin_kesh_stone` | Edrin "Does that stone know who's winning?" → Kesh "No." → Edrin "Lovely. Neither do I." | Quiet stretch |
| `edrin_kesh_strategy` | Edrin "Was that part of the prophecy?" → Kesh "No. That was strategy." → Edrin "Ah. Dangerous stuff." | Kesh makes a strong move |
| `ragna_kesh_thinking` | Ragna "Is the stone playing for you?" → Kesh "I'm thinking." → Ragna "Then think faster." | Kesh is slow |
| `ragna_kesh_course` | Kesh "You've changed the course." → Ragna "That's what the card does." → Kesh "I meant something else." → Ragna "Of course you did." | Ragna plays a Turnabout |
| `veyra_ragna_sacred` | Veyra "You're covering the ward." → Ragna "With my ale." → Veyra "It's sacred." → Ragna "So is mine." | Quiet stretch |
| `veyra_edrin_bones` | Veyra "Who moved the bones?" → Edrin "I needed room for my drink." → Veyra "You moved the bones?" → Edrin "Very carefully." | Quiet stretch |
| `gorvan_bramm_speech` | Gorvan "One curse, and you're already giving a speech." → Bramm "IT WAS FOUR CARDS!" → Gorvan "An impressive speech, then." | Bramm takes exactly four from a Curse |
| `gorvan_ragna_hurry` | Ragna "Do you ever hurry?" → Gorvan "I did once." → Ragna "And?" → Gorvan "Didn't suit me." | Gorvan is slow |
| `gorvan_edrin_wine` | Edrin "Would you like some wine?" → Gorvan "No, thank you." → Edrin "Good. It's awful." | Quiet stretch |
| `gorvan_kesh_future` | Kesh "I cannot read your future." → Gorvan "How refreshing." | Right after Kesh reads his stone, or a quiet stretch |
| `gorvan_veyra_seven` | Veyra "There are seven death omens around your chair." → Gorvan "That seems excessive." | Gorvan's own brutal Curse |

**v107: the player joins the conversation; the guests talk more; three guests is the usual company.**

*Player exchanges* (English recordings only; Hebrew as subtitle text). At most **one a hand** (`playerBanterPerRound`). When an exchange ends, a listener gives the player a silent glance (`glance` on the exchange; the app shows the face once the last line ends). Whoever addresses the player uses a face that looks out at the table.

| Exchange | Lines | When | Glance |
|---|---|---|---|
| `bramm_ragna_lucky_again` | Bramm "Lucky." → Ragna "That's the third time you've said that." → Bramm "Long streak." | The player makes a strong move, and Bramm has already called the player lucky this match (so Ragna's line is true) | Ragna, impressed |
| `ragna_edrin_play_already` | Ragna "The cards won't play themselves." → Edrin "I've tried. They really won't." | The player is taking too long | Ragna, impatient |
| `kesh_edrin_balance` | Kesh "One card left. The balance shifts." → Edrin "Should we stop that?" → Kesh "It would be wise." | The player reaches one card | Edrin, noticing |
| `veyra_gorvan_prophecy` | Veyra "That wasn't in the prophecy." → Gorvan "Perhaps the prophecy should learn the rules." | The player plays a King | Veyra, reconsidering |

Gorvan × Bramm "Don't Encourage It" (the player wins a round) is written but has no recordings yet, so it is not in the game.

*More talk.* `TAVERN_TIMING`: 10 s and 2 actions between casual lines (was 15 s / 3); two casual moments a hand (was one); 5 lines per guest a match, 4 in company (was 3 / 2); up to six exchanges a match, two a hand. Shared-moment scaling `TWO_GUEST_SCALE` .8, `THREE_GUEST_SCALE` .65 (was .6 / .45). Measured on the test event stream: one guest about 6.6 lines a match (was 4.6), two about 12 (was 8.7), three about 19 (was 13).

*Who sits down.* `TAVERN_GUEST_ODDS`: **Sometimes** one 4%, two 8%, three 23% (still about a third of evenings, but now usually a full voiced table); **Every evening** two 15%, three 85% (was 75 / 25).

**v108: chatter between moves.** Guests now talk now and then about nothing in particular while play goes on, not only after a move or in a lull. Every 16–24 s of play (`TAVERN_CHATTER_MS` in `app.js`) the table gets an `idle` chance; a card in flight or a voice in progress postpones it by a second or two instead of throwing it away. Chatter has its own allowance in the director: two a hand (`chatterPerRound`), 8 s of quiet first (`chatterGap`), up to three per guest a match (two for Edrin and Gorvan, `TAVERN_CHATTER_CAP`), and it no longer spends the hand's two casual moments or the per-guest cap. Odds: a solo idle line .45 (was .3), an idle exchange .4 (was .28). Lines come from each guest's idle pool and the quiet-stretch exchanges. Measured: one guest about 8.8 lines a match, two about 15.6, three about 22.8.

The limit is material: the free-floating pools are small (Ragna 1 line, Bramm 2, Edrin 3, Kesh 3, Veyra 4, Gorvan 5), and every line plays once a match, so chatter thins out after the first hands. More ambient lines are the way to grow it.

**v109: Tavern Conversations Vol. 3, quicker exchanges, quicker Edrin and Kesh.**

Nine owner-written conversations (53 English recordings; Hebrew as subtitle text), two of them three-handed:

| Exchange | Who | When |
|---|---|---|
| `vampire_concern` "A Reasonable Concern" | Edrin, Gorvan, Veyra | Start of the match or of a hand, all three seated (chance .3) |
| `gorvan_ragna_bedtime` "Bedtime Stories" | Gorvan, Ragna | Start of the match / a hand, or a quiet stretch. Ragna cuts him off (60 ms) |
| `bramm_unbeaten` "The Unbeaten" | Bramm, Ragna, Edrin | Start of the match (chance .35) |
| `veyra_ragna_followed` "Something Followed Me" | Veyra, Ragna | Start of the match or of a hand |
| `gorvan_kesh_old_tavern` "The Old Tavern" | Kesh, Gorvan | Start of the match / a hand, or a quiet stretch |
| `edrin_ragna_wager` "The Wager" | Edrin, Ragna | Start of the match |
| `edrin_kesh_interesting_stone` "A Very Interesting Stone" | Edrin, Kesh | Quiet stretch, or right after Kesh reads his stone |
| `bramm_veyra_cursed_table` "A Cursed Table" | Bramm, Veyra | Quiet stretch, once Bramm has taken two setbacks (a Curse, Shield or King on him) this match |
| `gorvan_edrin_remembering` "Remembering Faces" | Edrin, Gorvan | Quiet stretch, round 3 or later |

- **Start of a hand** is a new table moment (`round_start`, 1.5 s after the deal), with the chatter allowance.
- **Long conversations** (4+ lines) never start when anyone is down to two cards or fewer (`longBanterMinCards`).
- **Shorter gaps inside exchanges**: authored pauses × .5 (`banterPauseScale`), and the next speaker comes in 120 ms after a line ends (was 450 ms).
- **Edrin and Kesh play faster**: their deliberate dawdles are rarer and shorter (Edrin .035, Gorvan .03, Kesh .025; +1.3 s, was +2.8 s), and Kesh's thinking pause is shorter (weighty card 0.8–1.3 s, capped 1.5 s; was 1.25–2.15 s, capped 2.4 s). Measured in a browser: Edrin 1.6 s and Kesh 1.8 s a turn, the same as Ragna.

**v104:** Veyra and Gorvan joined the guests (see `VEYRA_INTEGRATION.md` and `GORVAN_INTEGRATION.md`). Banter is now a data-driven **sequence of any length** (`lines`), played as one performance, with dedicated banter recordings catalogued in `dist/duel/banter.js`. Exchanges recorded only in English (every Gorvan conversation) run as Hebrew text only in Hebrew. With voiced guests at the table, the ordinary regulars' text quips come half as often.

## Turning it off / reverting

| Level | How | Effect |
|---|---|---|
| Player | Settings → Table → **Voiced characters at the Tavern: Off · Sometimes · Every evening** (`settings.tavernGuestMode`, default `sometimes`) | **Off:** new Tavern Matches seat only the nine ordinary regulars; guests already seated in a match in progress stay but fall silent (faces only). **Every evening:** every new match seats two guests, or three. An older v101–v102 "off" switch is migrated to Off. |
| Code | `TAVERN_GUESTS_ENABLED=false` in `dist/game-engine/match.js` | No guests are seated for anyone. Saved matches that already contain guests keep them, and they still talk unless the player turns the setting off. |
| Git | Revert the v101 commit | Back to v100, which also puts Kesh back among the ordinary regulars. |

## Architecture

| Piece | File | Notes |
|---|---|---|
| Guest roster and odds | `dist/game-engine/match.js` | <ul><li>`VOICED_TAVERN_GUESTS`, `TAVERN_GUEST_MODES`, `TAVERN_GUEST_ODDS` (per mode), `TAVERN_GUEST_PAIRS` (banter exchanges per pair), `TAVERN_PAIR_CHEMISTRY` (v104: a little extra weight for Veyra + Kesh) and `TAVERN_GUESTS_ENABLED`.</li><li>`tavernGuestsFor(seed,{mode,guests})` seeds the guests and shuffles the seats, so a saved match restores the same table.</li><li>The ordinary regulars are now the nine unvoiced ones. Kesh moved to the guests.</li></ul> |
| Banter catalog (v104) | `dist/duel/banter.js` | Dedicated banter recordings: speaker, exact authored text in both languages, the speaker's face for the line, and which takes exist. `resolveCharacterVoice` falls back to it, so banter plays through the one voice path. |
| Director | `dist/duel/tavern-director.js` | <ul><li>One table-wide speech coordinator. Each guest is data: their Tavern allowlist (`TAVERN_GUEST_POOLS`), talkativeness (`TAVERN_GUEST_TALK`) and faces (`FACES`, `RESULT_FACES`, `FACE_RATE`).</li><li>`VOICE_WHEN` holds lines that are only true in a particular moment (Veyra's omen lines, Gorvan's "enough of kings").</li><li>Table events (`move`, `good_move`, `draw`, `penalty`, `skip`, `king`, `reverse`, `one_card`, `idle`, `slow`, `intro`, `round_end`, `match_end`, Kesh's `omen` / `omen_failed`) arrive with *who did it* and *who it hit*. Each seat reads the event from its own side (`own_*` / `other_*`).</li><li>The director returns **at most one line or one banter per event**, plus silent faces.</li></ul> |
| App wiring | `dist/app.js` | <ul><li>`setupTavernGuests`, `tavernObserve` (one table update becomes one event with actor and victim) and `tavernEvent`.</li><li>`performGuestLines` plays lines one at a time through the single `speakCharacterVoice` path; a banter's second line waits for the first to end.</li><li>Guest seat faces, the idle tick, Edrin's occasional dawdle, and the director's memory saved with the match.</li></ul> |
| AI | `dist/game-ai/veteran.js`, `bot.js` | <ul><li>`TAVERN_VETERAN_PROFILE` (Edrin), `TAVERN_PRESSURE_PROFILE` (Ragna), `TAVERN_CONTROL_PROFILE` (Veyra) and `TAVERN_PATIENT_PROFILE` (Gorvan): their Duel judgement without the look-ahead, plus a few more slips.</li><li>Bramm plays his usual mercenary style; Kesh his omen profile.</li></ul> |
| Settings | `dist/platform/storage.js`, `app.js` | `tavernGuestMode:'sometimes'` default (with migration from the old boolean), and a three-way ink choice under **Table**. |
| Styles | `dist/styles.css` | Per-guest seat framing: `.seat-figure.guest-<id>`. |
| Audio | `dist/platform/audio.js` | Exposes `voiceName` and an interruption counter for QA. Playback behaviour is unchanged: Web Audio game sound, no media element, no Now Playing. |
| Kesh | `dist/duel/kesh.js` | His Tavern-only code (`keshTavernEventFor` and the Tavern damping) was removed. He now uses the shared guest system like the others. |

## Who sits down (v104: six guests)

With six guests, a two-guest evening in "Sometimes" is one of: Edrin + Ragna 13%, Veyra + Kesh 10%, Bramm + Gorvan 10%, Bramm + Edrin 9%, Bramm + Ragna 9%, Veyra + Gorvan 9%, Bramm + Kesh 8%, Gorvan + Kesh 7%, Edrin + Gorvan 7%, Gorvan + Ragna 7%, Veyra + Ragna 4%, Veyra + Edrin 4%; the three pairs with no banter about 1% each. The table below is unchanged.

### Original notes (v103)

| Setting | No guest | One | Two | Three |
|---|---|---|---|---|
| **Sometimes** (default) | 65% | 8% | 27% | — |
| **Every evening** | — | — | 75% | 25% |
| **Off** | 100% | — | — | — |

- Guests usually come as **company**: a pair is about three times as likely as one alone.
- **Pairs who share banter are strongly preferred.** Each group is weighted by its pairs, 1 + 3 × that pair's banter exchanges (`TAVERN_GUEST_PAIRS`; a test keeps it in step with the banter list). About 96% of pairs can trade lines: Ragna+Edrin about 30%, Bramm+Ragna and Bramm+Edrin about 25% each, Bramm+Kesh about 16%. Kesh+Ragna and Kesh+Edrin, who share no banter, are about 2% each.
- Seats are shuffled, so a guest can sit anywhere. The odds are constants in `match.js`.

## How often they speak

- **One** table-wide director makes every decision. A moment that makes a guest eligible to speak does not mean they speak.
- **Gates**
  - At most one ordinary line per hand for the whole table, and at most one "last card" line.
  - About 15 s and 3 actions between casual lines.
  - Each guest has a per-match cap on non-result lines: **3** with one guest, **2** each with two or three.
  - Nothing starts while a voice is playing or a guest bubble is showing.
- **Repeats:** every recording is heard at most once a match, and identical words never come back, even from a different file.
- **Shared moments:** two or three guests share the moments. Each roll is scaled by 0.6 for two guests and 0.45 for three, and one roll serves the whole table.
- **Talkativeness:** Gorvan is the quietest (0.5×), then Edrin (0.6×); Bramm is a little louder (1.15×).
- **Veyra's omens** (v104) keep their own small allowance (they don't spend her two or three ordinary lines), but still wait their turn on the single voice: a declaration is the hand's one ordinary line; a miss may come later in the same hand; a sign that lands waits for any voice in progress, then plays.
- **Generic regulars' text quips** never come from a guest's seat, never start while a guest is speaking, and are skipped for any update where a guest spoke.
- **Results**
  - The winning guest may speak at round end (35%).
  - A losing guest rarely does (12%).
  - At the end of the match, the champion guest usually speaks (85%) and a losing guest sometimes does (50%).
  - Never a round line and a match line for the same result.
- **Measured over full five-round matches in a real browser:**
  - one guest: **4–5 lines a match**, including results;
  - two guests: **5–7 lines between them**, about 3 each;
  - three guests (simulated): **about 8 lines between them**, under 3 each;
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

## Banter (authored sequences, each one performance)

**The rules:**
- Each line plays to the end; after a natural pause (0.6–1.5 s, or the authored timing — Kesh's "[after a pause]"), the next speaker answers. The table's one voice is reserved for the whole exchange: nothing else starts until its last line ends.
- v104 exchanges (Veyra with Kesh, Ragna and Edrin; Gorvan with all five) are listed in `VEYRA_INTEGRATION.md` and `GORVAN_INTEGRATION.md`.
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

## Seat framing (v102–v103)

- **No side cropping (v102).** A portrait wider than its seat (on phones) shrinks to fit (`max-width:100%`, `object-fit:contain`). It scales about the line where the table rim crosses it (`object-position` = 100% − the seat's `translate`), so the figure stays seated.
- **No top cropping (v103).** Each seat height obeys *height ≤ 1 ÷ (rim line − top of the art)*, using the highest point across all of a character's poses.
  - Ragna's art touches the top of its canvas, so she is now 1.10× (was 1.22×).
  - Kesh is 1.09× (was 1.20×).
  - Bramm and Edrin are 1.84× (was 1.90×), for a safety margin.
  - The ordinary regulars already fit.
