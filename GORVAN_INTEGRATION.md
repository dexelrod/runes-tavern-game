# Gorvan — integration notes (v104)

Gorvan — formally Lord Gorvan; he would rather you didn't — is the sixth authored opponent. A non-human vampire of Sela's kind, he **looks and sounds like a classic villain and behaves like an extraordinarily calm, polite, dry man who wants to sit in a tavern and play cards.** The contrast is the joke, so it is never pushed: the smallest emotional range in the cast, acting in the eyes, a brow and the angle of the head, and more silence than anyone else.

He is built on the same data-driven pack as Veyra (`duel/authored-pack.js`) and uses the shared controller, expression stage, speech bubble, single Web Audio voice path and Tavern director. See `VEYRA_INTEGRATION.md` for the shared pieces.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Gorvan pack | `dist/duel/gorvan.js` | Authored script (directions removed), 24-pose map, reactions, silent glances, the title progression, `GORVAN_SPEC`. |
| Registry | `dist/duel/characters.js` | `gorvan` entry, `generic:true`. Duel dispatch is the generic path (`genericDuelUpdate`). |
| AI | `dist/game-ai/veteran.js` → `PATIENT_PROFILE`, `TAVERN_PATIENT_PROFILE` | Archetypes `noble` (Duel) and `tavern-noble` (Tavern). |
| Sound accents | `dist/platform/audio.js` (`gorvan*` in `SOUND_LIBRARY`), `dist/app.js` → `gorvanAccents` | SFX channel, presentation only. |
| Tavern | `dist/duel/tavern-director.js`, `dist/duel/banter.js` | Allowlist, faces, and all twelve conversations. |

## Assets

**Expressions** — `dist/assets/gorvan/expressions/`, 24 WebP files at 640×640 (1.7 MB). Every pose is the same 1700 px square crop of its 2048 px master (his seated bust, forearms resting on the shared baseline), uniformly scaled. Never trimmed per pose, never mirrored (his markings belong to his right side). The Duel rim falls at his chest, as it does for Ragna. 22–24 are the silent glances (a look down at a card, a look at you, a narrower assessment); most of his reactions are these.

**Voice — English only.** `dist/assets/gorvan/voice/`: 59 recordings, shipped untouched. There are no `_he` files and none are looked for or invented. **In Hebrew he speaks in English under the authored Hebrew bubble text** (`audioFor:()=>'en'` in his catalog; the bubble is RTL Hebrew). Deleted: `gorvan_reverse_01/02` (not present, not referenced).

The owner-edited canonical lines are the script's current text: "Hm. I wonder." (idle_03), "Nevermind, nevermind..." (idle_05), "Impressive. Most impressive." (player_good_move_02), "That was pleasant." (match_win_01).

## Behaviour

**The quietest voice in the cast**
- ~16 s and four meaningful actions between casual lines, one ordinary line a hand, and **at most four ordinary remarks a match** (his last-card lines, his introduction and his results stand apart). When he speaks, it matters.
- Real-time five-round Duels: **7–9 lines a match** including the intro and the results; his face changes constantly, in small ways.
- Two-beat performances, each one performance: "You have a very steady pulse." → "Nevermind, nevermind..."; "I remember when the rules were different." → "No. Before your time." (the second beat only ever follows the first). Rare flavour at most twice a match; "I've had sieges end sooner than this." only in a long hand.
- "Take your time. I have plenty." for a player who sits on a decision (once a match).

**Contextual lines** — a Curse on him: "Rude." or "A curse. How quaint."; his Curse on you: "Effective." or the almost-apologetic "Unfortunate."; a haul: "My condolences."; his Shield when you are close: "Not yet."; your Shield on him: "Sensible."; your King: "Ah. Royalty." — or, when it breaks his Curse, "I have had enough of kings."

**One-card states** — your last card: attentive, never alarmed ("Ah. We should address that.", "Nearly there.", "Now this is interesting.", "One card. Very good."). His own: "One remains.", "Nearly finished.", or the quiet confidence of "Do try to stop me." One line at most.

**Results** — round or match, never both; a result waits for a line in progress to finish. Calm in defeat ("Congratulations.", "I have survived worse."), mild in victory ("That was pleasant.").

## "Lord Gorvan"

- First meeting: always "Gorvan. Just Gorvan."
- The Duel select kicker reads *The house insists on "Lord"*. On a later meeting, now and then (35%), he answers the house with the next step of the title progression, remembered across sessions: "Gorvan is fine." (tired) → "Please. Not the title." (patient) → "Do not call me that." (firmer) → "We are not doing this again." (resigned). After the fourth, the house has been told.
- At the Tavern the title lines are kept for the people who use the title: Bramm and Ragna (below). He never explodes over it.

## Sound accents (presentation, never spells)

All four are SFX-channel sounds (they follow Game sounds and its volume; his voice follows Character voices), each with a cooldown so none can stack.

| Cue | When | Level |
|---|---|---|
| `gorvan_sfx_entrance_sting` | Once as he sits down for a new Duel (not on a restore, not again on a rematch within 8 minutes); at a Tavern table once an app session. The intro line waits for it. | 0.5 |
| `gorvan_sfx_curse` | His own Curse only — never one played on him, never anyone else's — layered under the ordinary Curse sound. | 0.36 |
| `gorvan_sfx_brutal_card_accent` (filename kept) | One weighty King or Shield of his a hand: a King breaking a Curse or with someone on two cards or fewer, a Shield against a short hand. Never on top of his Curse sound. | 1.0 (the file itself is restrained, ~10 dB under the King sound) |
| `gorvan_sfx_one_card_pulse` | Duel only: when either hand first reaches its last card, once per side per hand, 9 s apart. Off at the Tavern (a crowded table has enough going on). | 0.3 |

## AI — patient and fair

`PATIENT_PROFILE`: the shared public-information planner with a short look-ahead. He is the most reluctant of the cast to spend a Rune, a King or a Curse early, rarely panics, and answers precisely when a hand becomes dangerous. Very steady (low jitter), 5% slips.

- Hidden-hand swap test: identical choices whatever the hidden cards are. No vampire mechanics: the rules know nothing about him.
- Over 400 hands each: ~50–56% against the mercenary and hunter bots, ~46–48% against Edrin and Ragna, even with Veyra.
- At the Tavern (`TAVERN_PATIENT_PROFILE`): without the look-ahead, a few more slips. Now and then (6%) he takes his time over a card, which is what makes Ragna's "Are you going to play before sunrise?" true.

## Banter — English recordings only

Every Gorvan conversation was recorded in English only, his partner's line included. In English it is voiced. **In Hebrew it runs as the authored Hebrew text only, every line silent — never one voiced half — and only when bubbles are on** (`audio:'en'` in `TAVERN_BANTER`). Gorvan answers with recordings he already has; no duplicate banter files were made.

| Partner | Line → Gorvan | When |
|---|---|---|
| Bramm | "Lord Gorvan." → "Gorvan is fine." | Start of the evening, or a quiet stretch |
| Bramm | "What, too noble to drink with the rest of us?" → "Rude." | A quiet stretch |
| Bramm | "My lord." → "We are not doing this again." | Only after "Lord Gorvan." has been heard on some evening |
| Ragna | "Lord Gorvan." → "Do not call me that." | Start of the evening, or a quiet stretch |
| Ragna | "Are you going to play before sunrise?" → "Take your time. I have plenty." | Gorvan is taking his time |
| Edrin | "Do you always sound like that?" → "Hm. I wonder." | A quiet stretch, after Gorvan has spoken |
| Edrin | "You ever relax?" → "The evening is still young." | A quiet stretch |
| Kesh | "The night sits comfortably around you." → "Hm. I wonder." | A quiet stretch |
| Kesh | "You are very patient." → "Take your time. I have plenty." | Someone else is taking their time |
| ~~Veyra~~ | ~~"You are making the signs difficult." → "Nevermind, nevermind..."~~ | Retired in v111 with Veyra's omens |
| Veyra | "Why is the flame leaning away from you?" → "Hm. I wonder." | A quiet stretch |
| Veyra | "You don't have a normal shadow." → "Nevermind, nevermind..." | Start of the evening, or a quiet stretch |

Energy hits a wall of calm. Her energy does not change his range, and his calm does not quiet her.

## Debug (browser console)

`window.GorvanDebug`: the shared hooks (`trigger`, `triggerIn`, `expression`, `previewExpressions`, `simulate*`, `history`, `cooldown`, `setLanguage`, `markVoiceMissing`, `missingAssets`) plus `simulateTitle(step)`, `titleStep()`, `sfx('entrance'|'pulse'|'accent'|'curse')` and `sfxMemory()`.

## QA (v104)

- `npm test`: `tests/gorvan.test.js` (assets, English-only audio with Hebrew bubbles, canonical lines, restraint against Kesh and Veyra, two-beat lines, title progression, result pools, SFX rules, banter data and the Hebrew text-only policy, AI fairness and strength); `tests/audio.test.js` covers his SFX entries.
- `npm run smoke`: a Gorvan Duel round in Hebrew and English (Hebrew bubbles over English voice), and Gorvan with Veyra at one Tavern table.
- Real-time playtests: Duels in English and Hebrew; Tavern Matches with Bramm, Ragna (Hebrew: the text-only sunrise exchange), Kesh, Edrin (Hebrew, bubbles off), Veyra, and Veyra + Kesh at one table. 0 overlapping voices, 0 console errors.
