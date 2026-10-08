# Veyra — integration notes (v111: Veyra 2.0)

Veyra is the fifth authored opponent. **v111 reworks her**: a new character pack, a curated voice, a quieter schedule, and the omen system removed.

She is now a younger witch of about thirty — clever, self-assured, dry, a little dark, quietly competitive, now and then mischievous, and capable of genuine surprise. She knows curses professionally ("That is not a proper curse."), distrusts crowns, and still notices odd things (a vampire's shadow, a flame leaning away from him), but she no longer reads every card as a sign or argues with the bones. **Old Veyra was an obsessive omen-reader who shouted at you when she was right. New Veyra is a cool witch with a sharp tongue who mostly lets her face talk.**

She is a full Duel opponent and a voiced Tavern guest on the same framework as everyone else: one reaction table on the shared controller (`duel/authored-controller.js`), the shared expression stage, the speech bubble, the single Web Audio voice path and the table-wide Tavern director. There is no Veyra-specific engine.

## What changed in v111

| Area | Before (v104–v110) | Now |
|---|---|---|
| Art | 61 poses (rural witch, bones, candle) | 26 poses from `veyra_character_pack/v2` (concept A, "curse scholar"); no props |
| Omens | A per-match "omen book": declared signs, hit/miss detection, settle/expiry windows, a pending-hit retry timer, saved state, Tavern omen events, debug hooks | **Removed entirely** — code, state, persistence, timers, lines, faces, Tavern triggers and debug hooks. Nothing replaces it. |
| Voice | 55 lines, 2.5 lines/min in a Duel | 24 curated lines, ~1.9–2.2 lines/min; a few hot takes trimmed in level |
| Banter | 20 exchanges | 16 (four omen-era / shouted exchanges retired) |

## Architecture

| Piece | File | Notes |
|---|---|---|
| Veyra pack | `dist/duel/veyra.js` | Curated EN/HE script, 26-pose map, reactions, silent faces, `VEYRA_RETIRED`, `VEYRA_VOICE_TRIM`, `VEYRA_TIMING`, `VEYRA_SPEC`. |
| Shared pack helpers | `dist/duel/authored-pack.js` | `createVoiceCatalog` now takes an optional `gainFor(voice, take)`; the resolved voice carries `gain`. |
| Voice path | `dist/platform/audio.js` → `playVoice` | Applies the resolved `gain` as a trim on the one Web Audio voice path (game audio: no media element, no Now Playing). Every other character resolves to gain 1. |
| Registry | `dist/duel/characters.js` | `veyra`: default face `default`; `resultVoiceChance` / `resultFaces` (a round result may pass with only a look). `omens` flag removed. |
| Duel dispatch | `dist/app.js` → `genericDuelUpdate`, `resultSpeaks()` | One generic path for Veyra and Gorvan; no omen branch. |
| Tavern | `dist/duel/tavern-director.js`, `dist/duel/banter.js` | Curated allowlist, new faces, no omen triggers or omen allowance; retired exchanges removed. |
| AI | `dist/game-ai/veteran.js` → `CONTROL_PROFILE` / `TAVERN_CONTROL_PROFILE` | Unchanged: calm, competent, fair. |

## Art

`dist/assets/veyra/expressions/` — 26 WebP files at 640×640 (q86, ~2 MB total). Each is the same 1920 px crop (the pack's 64 px inset removed) of its 2048 px painting, scaled uniformly and bottom-centre anchored, so swaps never jump. The four banter poses the pack names after a voice stem ship as `20_banter_dry`, `21_banter_explaining`, `25_banter_correction`, `26_banter_incredulous`. The 61 old poses are gone from the game (masters stay in `Runes Card Game/veyra_character_pack/`).

Expression keys: `default`, `intro_intrigued`, `observing`, `amused`, `curious`, `surprised`, `approving`, `strong_move`, `frustrated`, `draw_considering`, `curse_disapproval`, `stop_pleased`, `king_skeptical`, `player_one_card`, `veyra_one_card`, `round_win`, `round_loss`, `match_win`, `match_loss`, `banter_dry`, `banter_explaining`, `friendly_smile`, `silent_doubt`, `silent_thinking`, `banter_correction`, `banter_incredulous`.

Mapping was chosen by looking at the paintings, not by matching old names: her resting face is `default` (relaxed, self-assured); short hands → `observing`; your last card → `player_one_card`; her last card → `veyra_one_card`. Silent reactions lean on `amused`, `observing`, `silent_thinking`, `approving`, `silent_doubt`; the biggest faces (`surprised`, `match_win`) are kept for real surprise and the end of a match.

**CSS** (`styles.css`): Duel and select sizing unchanged (the new figure fits the old frame). At a Tavern seat she is drawn a little larger (`.seat-figure.guest-veyra>img`, 1.24 × figure height) because the new figure is slimmer on the same canvas; her head now sits at the other guests' scale. Checked at phone portrait, iPad portrait, desktop 1366 and phone landscape.

**Preload**: 11 critical poses (resting face, intro, first reactions, last-card faces) decode before she sits down; the rest follow in the background.

## Voice — what she says now

Kept (EN/HE unless noted): intro 02 (EN only) "Quiet. Let me see.", 03 "Oh. This will be interesting.", 04 "The fire doesn't like you tonight." · "Oh! Clever." (EN only) · "I did not see that." · "There." · "Exactly where it was going." · "There it is." · "More. Interesting." · "Why this one?" · "One? Already?" · "Don't move. I'm thinking." · "Last card..." · "I know how this ends." · "That is not a proper curse." · "Simple. Effective." · "No. Not yet." · "I don't trust crowns." · "Again. I need to see something." · "That wasn't right." · "Again. I missed something." · "I knew it." · "Again tomorrow. I want to compare." · "I was completely wrong."

**Retired** (`VEYRA_RETIRED`, never selectable; files archived in `Runes Card Game/Veyra`, not shipped): every `omen_*`, `omen_hit_*` (incl. "I TOLD YOU!"), `omen_miss_*`; intro 01; all four idle lines ("Did you see that?", "No... that means something.", "Stop moving.", "Make up your minds."); "Yes! That's the kind of trouble I meant!"; "I knew something was coming."; "No, no, no."; "...Actually. Keep talking."; "You didn't tell me that!"; "Wait. Wait. This fits."; "Say something useful."; "Something wanted that stopped."; round win 01 and 03; "No... show me again."; match win 01; match loss 01 and 03.

How the cut was made: every take was measured (integrated loudness, momentary peak, pitch and pitch spread) against the rest of the cast, then judged with the script and the new personality. Loud / high-pitched / frantic takes went (e.g. "No, no, no." at −13 LUFS, every omen hit); lines that only make sense addressed to the bones went (several are feminine-plural in Hebrew for exactly that reason); the dry, curious, confident ones stayed. One witch's remark survives in her intro ("The fire doesn't like you tonight." — quiet, teasing).

**Level trims** (`VEYRA_VOICE_TRIM`): kept takes hotter than about −19.5 LUFS integrated or −15 LUFS momentary play 1–3 dB lower (e.g. "That is not a proper curse." ×0.79, "Don't move. I'm thinking." ×0.73, "You're covering the ward." ×0.68). The files are untouched.

**Languages**: English takes in English, Hebrew takes in Hebrew, authored Hebrew text unchanged. The two English-only lines are simply absent in Hebrew (no English fallback), in the Duel, at the Tavern and in the shared voice resolver.

## How often she talks

`VEYRA_TIMING`: ~11 s and three counted actions between casual lines; two ordinary lines a hand at most; **eight ordinary remarks a match**; no remark more than twice a match and the small asides (draws, her own good moves) once. Last-card lines have their own small allowance. A round result speaks 70% (win) / 60% (loss) of the time and never repeats the same round line in a match — otherwise she just shows her result face. The match result always speaks.

Real-time five-round Duels (phone, captions on, human-paced): **10–14 lines a match, ~1.9–2.2 a minute** (before: 16–19, ~2.5/min; Edrin 14, ~2.2/min; Bramm 21–31, 3–4/min), with 100–140 face changes. No overlapping voices.

At a Tavern table she is one of the quieter guests (`TAVERN_GUEST_TALK.veyra` .7: Edrin .6, Kesh/Ragna 1, Bramm 1.15) and has no idle chatter lines of her own — between moves she talks only in banter.

## Banter

Kept (faces remapped to the new conversational poses):

| Exchange | Notes |
|---|---|
| Veyra + Kesh "Look at that." / "I am." / "And you're just sitting there?!" | Rarer now (chance .2); her last line trimmed in level. |
| Veyra + Ragna "The flame just moved." / "Focus." | Two lines, unchanged. |
| Veyra + Ragna "You're covering the ward." … "So is mine." | English audio; Hebrew text-only. |
| Veyra + Edrin "Who moved the bones?" … "Very carefully." | English audio; Hebrew text-only. |
| Veyra + Bramm: the warning; destiny smells of ale; the cursed table ("That's not how curses work.") | English audio. |
| Veyra + Gorvan: the flame leaning away; the shadow; seven death omens; the prophecy and the rules | English audio only; Hebrew is text, every line silent — never mixed. |
| Edrin + Gorvan + Veyra "A Reasonable Concern" | Unchanged. |

Retired: Kesh "A curious omen." / "Curious? It's screaming." (shouted); Edrin's bones-and-flame lecture ("Three bones crossed…"); Gorvan "You are making the signs difficult." (fired on an omen miss); Ragna "Something followed me here tonight." (ends in a shout). Their partners' recordings for those exchanges are no longer shipped either; nothing plays half an exchange. `TAVERN_GUEST_PAIRS` follows the banter list.

## Debug (browser console)

`window.VeyraDebug`: `trigger(id)`, `triggerIn(id,'he')`, `expression(key)`, `previewExpressions(ms)`, `simulate*` (one card, Curse taken / landed, Shield taken / given, King, draws, good moves, slow player, results), `history()`, `cooldown()`, `setLanguage()`, `markVoiceMissing(voice)`, `missingAssets()`, `englishOnly`. The omen hooks are gone.

## QA (v111)

- `npm test` → `tests/veyra.test.js`: curated script and files, 26 new poses at the shared canvas, every pose reachable, no old pose name anywhere, exact bubbles, English-only rules (Duel and Tavern), **omen system gone** (exports, app state, director triggers, lines, files), retired lines never selectable in any trigger or language, anti-repetition, restraint (quieter than Ragna, ≤8 ordinary remarks a match, faces ≫ lines), one-card behaviour, results (round may be silent, match never), face mapping, banter kept/retired and played whole with the right audio policy, level trims on the one voice path, AI fairness and strength.
- Real-time browser playtests (Playwright, human-paced): Duels in English and Hebrew at phone, iPad and desktop sizes; Tavern Matches with Veyra + Gorvan (EN, HE), + Kesh (EN, HE), + Ragna, + Edrin (HE). Checked: line counts, no omen line ever, no retired line, no overlapping voices, no console errors, English-only lines never in Hebrew, Gorvan banter silent-text in Hebrew.
