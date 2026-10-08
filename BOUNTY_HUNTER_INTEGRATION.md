# The Bounty Hunter — integration notes (v113)

**THE BOUNTY HUNTER** (צייד הראשים) is the seventh authored opponent and a voiced Tavern guest. He has **no personal name** — none is invented, hinted at or revealed. He is a professional with time to kill: there is a table, there are cards, and he is waiting for something else anyway. Monotone, practical, terse, a little judgemental, fully attentive and emotionally flat. His lack of enthusiasm is the character, so nothing in the integration tries to animate him.

**The helmet is his face.** It never comes off; the visor stays dark; its geometry never changes. His acting is head angle, shoulders, hands, card handling, pauses and stillness — the smallest physical range in the cast. Most of his reactions are silent, and he is the quietest voice at the table.

He is built on the shared data-driven pack (`duel/authored-pack.js`), like Veyra and Gorvan, and uses the shared controller, expression stage, speech bubble, single Web Audio voice path and Tavern director. There is no Bounty-Hunter-specific engine.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Hunter pack | `dist/duel/bounty-hunter.js` | Approved script (performance tags removed), 16-state map on 15 paintings, reactions, silent body language, `bountyHunterEventFor`, `BOUNTY_HUNTER_TIMING`, `BOUNTY_HUNTER_LOOKS`. |
| Registry | `dist/duel/characters.js` | `bounty_hunter`, `generic:true`. New shared hooks: `refineEvent` (a pack may name a few moments more precisely on top of `duelEventFor`) and `looks` (seat-aware glances). |
| Duel dispatch | `dist/app.js` → `genericDuelUpdate` | Unchanged path; now passes `opened` / `again` and applies `pack.refineEvent`. |
| Tavern | `dist/duel/tavern-director.js`, `dist/duel/banter.js` | Allowlist, faces (incl. directional `@actor` / `@current`), 13 two-person exchanges and 4 three-person sequences; new shared banter controls (below). |
| Looks | `dist/app.js` → `lookFace`, `setGuestFace(seat,'@look',ms,toward)` | Left / right / ahead from the real seating (`SEAT_LAYOUTS`), never mirrored art. |
| AI | `dist/game-ai/veteran.js` → `THREAT_PROFILE`, `TAVERN_THREAT_PROFILE`, `tableThreats` | Archetypes `bounty` (Duel) and `tavern-bounty` (Tavern). |
| Roster | `dist/game-engine/match.js` | Voiced Tavern guest (house Slate). Excluded from Quick Play names (`QUICK_NAME_EXCLUDED`). |

## Assets

**Body language** — `dist/assets/bounty_hunter/expressions/`, 15 WebP files at 640×640 (q86, 1.3 MB). Every pose is the same 1760 px crop (x 144–1904, y 160–1920 — the union of every pose's bounds) of its shared 2048 px canvas, scaled uniformly, so swaps never jump. Never mirrored. The `fixed_stare` state reuses the neutral painting (the pack's design: the irritation is only the longer hold), so 16 states ship as 15 files. `rare_amusement` is used by exactly one line ("Maybe later.").

States: `neutral`, `attention`, `approval`, `doubtful`, `fixed_stare`, `dismissal`, `focus`, `resigned`, `rare_amusement`, `partner_left`, `partner_right`, `hand_glance`, `adjustment`, `card_inspect`, `card_place`, `firm_stop`.

**Voice — English only.** 129 recordings shipped untouched: 63 of his own lines and 33 of his banter / three-person takes in `dist/assets/bounty_hunter/voice/`, and his partners' 33 takes in their own folders (`gorvan_banter_bounty_hunter_01b` → `assets/gorvan/voice/`, …). There are no `_he` files and none are looked for. Loudness matches the cast (≈ −17 to −21 LUFS); no trims.

**Hebrew** follows the established Gorvan rule: his solo lines play the English take under the supplied Hebrew bubble text; every banter and three-person sequence is **text only** in Hebrew (all lines silent — never one voiced half), and only runs when bubbles are on.

**Deleted categories** (Turnabout, Quickstep, Rune, Frost) do not exist in the script, the pack or the assets; nothing loads them. Those cards get a look at most.

## Behaviour

**Duel — responsive but sparse.** ~15 s and four counted actions between casual lines, one ordinary line a hand (two in a very long one), at most four ordinary remarks a match; last-card lines, the intro and results stand apart. Cross-category anti-repetition: a remark still among his last five never comes back ("Good." is "Good." whether it praises you, closes a round or answers Veyra) — he stays silent instead.

- Intro: a first meeting is always "Hello."; later, a line about half the time, otherwise a look or nothing. No entrance cue of his own.
- Player good move: "Good." / "Competent." / "Clean." / "That works."; "Didn't expect that." only for a genuinely big play, with the attentive look (not surprise).
- His own good move: functional ("Done." "That works." "Better." "Next."), card-placing hand, no satisfaction.
- Draws: a minor inconvenience; "Another." only on his second draw in a row; "Could be worse." leans on a haul.
- Player's last card: relaxed → professional focus (hands ready). His own: quiet progress; "Your move." only when it is.
- Specials: his Curse ("Take two." only when it is literally two), Curse received, Shield, Crossbow (opening / a volley of three or more), Runed Crossbow, his King.
- Results: round results speak half the time (otherwise the look); a match result always speaks. Round or match, never both. "I'll remember that." keeps the neutral state — not a threat.

**Tavern — very sparse.** Talk weight .32 (lowest in the cast; Gorvan .5), at most 3 ordinary lines a match alone and 2 with company, one chatter line, results .8. He mostly reacts with his helmet: `@actor` turns it toward whoever played (left, right, or out at the player), `@current` toward whoever is taking their time; a last card anywhere gets professional focus. His Crossbow lines, "Your move." and the idle "Good." stay at the Duel table (at a four-seat table they could address the wrong person).

## Banter

| Partner | Exchange | When |
|---|---|---|
| Gorvan | "Are you wanted anywhere?" / "Currently?" / "That's not reassuring." | Start of the evening or a quiet stretch — Gorvan thread |
| Gorvan | "Still don't understand why they let you in." / "I pay." / "That's everyone's answer." | Quiet stretch — Gorvan thread |
| Gorvan | "Do I make you uncomfortable?" / "No." / "Disappointed." / "You'll manage." | Quiet stretch — Gorvan thread |
| Edrin | "You ever take that thing off?" / "Yes." / "Where?" / "Not here." | Quiet stretch or a new hand |
| Edrin | "Does no one find that concerning?" … "Oh. Gorvan's alright." / "...Right." | Gorvan thread; Gorvan must be seated |
| Ragna | "You fight for coin?" / "I collect people for coin." / "Better." | Start, quiet stretch or a new hand |
| Ragna | "You trust the vampire?" … "It's a good standard." | Gorvan thread; Gorvan must be seated |
| Kesh | "The road behind you feels crowded." / "Usually is." / "And ahead?" / "Working on it." | Quiet stretch |
| Kesh | "Hard to read a man with no face." / "That's useful." / "I imagine so." | Start or a quiet stretch |
| Veyra | "Your helmet is blocking everything." / "Good." / "That was not a compliment." / "I know." | Quiet stretch |
| Veyra | "I can't read your face." / "That's the point." / "I can read the rest of you." / "Maybe later." | Its own subject, open on few evenings, rarer once heard |
| Bramm | "Alright, helmet. How much am I worth?" / "Currently?" / "...Currently?" / "Not much." | Quiet stretch, or after Bramm's own good move |
| Bramm | "…they call me Bramm the Unbeaten." / "Who does?" / "Me." / "Right." | Start or a quiet stretch (shares a subject with "Bramm the Unbeaten" Vol. 3) |

**Three-person sequences** (atomic, rarer than any pair): Hunter + Edrin + Gorvan ("He's a vampire." … "I can hear you." / "I know."), Veyra + Gorvan ("His shadow is wrong." / "Finally." / "This again." / "You see?"), Bramm + Ragna (the orc), Kesh + Veyra ("Nothing. I get absolutely nothing from him." / "Perhaps that is the sign." / "Perhaps not.").

**Shared banter controls (new in v113, available to any exchange):**
- `topic` — exchanges on one subject share an evening: at most one a match, and a subject is only open on some evenings (`TAVERN_TOPIC_ODDS`: Gorvan thread .45, "Maybe later" .2, three-person .35; rolled once per match, saved with it, never re-rolled on restore). `TAVERN_TOPIC_HEARD_SCALE` makes "Maybe later" rarer once heard.
- `needs` — someone who must be at the table though they do not speak (the vampire gossip needs Gorvan present).
- `TAVERN_BANTER_GUEST_CAP` — exchanges a guest takes part in, a match (the Hunter: 2).
- `pauseScale` — per-exchange pause scaling (his: .85, so the pauses stay spacious; the table default is .5).
- The v110 stall rule respects all of the above.

The Gorvan thread is professional risk assessment: never fear, never a mechanic, and he never recoils. "Maybe later." uses only `rare_amusement` — no follow-up, no state, nothing remembers it except the ordinary "heard" list.

**Looks**: during an exchange the Hunter turns toward whoever is speaking, and his own lines turn toward whoever they address — resolved from the real seating, so a partner on his left gets `partner_left` whatever the pack's staging default said.

## AI — threat assessment, fair

`THREAT_PROFILE`: the shared public-information planner with a short look-ahead, tuned to identify the current threat and deal with it efficiently. `tableThreats` scores each opponent from public facts only (card count, plus cards visibly shed or taken over the last turns). A Shield or a Curse is judged by **the player it would actually hit**: spent readily on the threat, kept back when the next player is harmless while someone else is about to go out; a Turnabout is valued by turning the order away from the threat. It shifts as the threat moves. No hidden hands, no deck knowledge, no bounty rules, no marked targets — and names never enter into it (Gorvan in a seat changes nothing). Very few slips; at the Tavern (`TAVERN_THREAT_PROFILE`) without the look-ahead.

## Debug (browser console)

`window.BountyHunterDebug`: the shared pack hooks (`trigger`, `triggerIn`, `expression`, `previewExpressions`, `simulate*`, `history`, `cooldown`, `setLanguage`, `markVoiceMissing`, `missingAssets`) plus `simulateOwnCurse(amount)`, `simulateCrossbow()`, `simulateRunedCrossbow()`, `simulateOwnKing(broke)`, `look(target)` (at a Tavern table: a guest id, a seat id or `'player'`) and `topics()`.

## Seat plates

A long display name ("The Bounty Hunter") wraps onto two tight lines on a narrow Tavern seat plate instead of being cut off (`.seat-name.long-name`; "The\u00a0Bounty" is kept together). Hebrew "צייד הראשים" fits on one line.

## QA (v113)

- `npm test` → `tests/bounty-hunter.test.js` (15 tests): assets and the shared canvas, English-only audio with Hebrew bubbles, approved text with no performance tags, deleted categories absent, special-card refinement ("Take two." only for two), quieter than Gorvan and Kesh with far more looks than lines, cross-category anti-repetition, intro, results (never both), the rare look belongs to "Maybe later." alone, all 17 exchanges whole and in order with the Hebrew text-only rule, the Gorvan thread (only with Gorvan present, ≤ 1 a match, open on some evenings, saved on restore), the Tavern caps, seat-aware looks, AI fairness (hidden-hand swap), strength, and threat targeting (Shield on the real threat, kept when the next player is harmless, name-blind). Counts in the Gorvan, Kesh, Ragna, Edrin, engine and Quick Play tests were updated for the new files and the seventh opponent.
- `npm run smoke`: a Bounty Hunter Duel round in Hebrew and English ("Hello." bubble in the active language, only his own lines), and the Hunter + Gorvan + Edrin three-person sequence (voiced in English; text-only, nothing voiced, in Hebrew) followed by a round with no overlapping voices.
- Real-time playtests (Playwright, human-paced, captions on): five-round Duels in English (phone) and Hebrew (iPad) — 7–8 lines a match including intro and results, 50–90 body-language changes; Tavern Matches with Hunter + Gorvan + Edrin (EN, phone), + Veyra + Kesh (HE, iPad: "Maybe later." ran text-only with the rare look), + Bramm + Ragna (EN, desktop: "Bramm the Unbeaten" → "Right."). The Hunter said 1–4 things a match at the Tavern; his helmet turned toward the actual speaker's side. 0 console errors, 0 failed requests.
- Save / restore: seats, the evening's open subjects and used exchanges restore; an exchange cut off by a reload never resumes; no intro replays.
- AI: Duel win rates over 120 games ≈ 51–55% against the hunter/mercenary bots, Edrin, Ragna and Gorvan, ≈ 43% against Veyra; at a four-seat table ≈ 26% (Gorvan 28.5%, Veyra 26.5%).
- Layout checked at 320×568, 390×844, 820×1180, 1366×768 and 844×390 in both languages: he is drawn a touch under Gorvan's scale, never clipped, bubbles clear of the helmet.

## Not in the supplied script

The brief mentions work/bounty flavour lines ("I'm not working tonight.", "Waiting is most of the job."…), general chit-chat ("No contract tonight. Just cards."…) and solo Gorvan gossip ("They just let him sit here."…). None of these are in the approved script or the 129 recordings, so none were added; the Gorvan thread lives in the supplied exchanges ("He's a vampire." is the three-person sequence). The pack is ready for them: a solo line is one `line(...)` entry, a paired line one `followUp`.
