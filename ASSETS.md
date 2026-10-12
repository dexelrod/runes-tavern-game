# RUNES — asset formats and audit (v118)

## Formats (keep new assets in these)
- **Music and ambience:** MP3 (music 160 kbps, ambience 128 kbps), one file per track. Not WAV
  (10–40× larger) and not AAC/.m4a (open-source Chromium builds cannot decode it). Browsers trim
  MP3 encoder padding on decode, so the ambience loops stay sample-exact and gapless
  (checked in Chromium: decoded length equals the WAV master's).
- **Short SFX:** WAV. They are small, and WAV starts with no decoder delay.
- **Voices:** MP3, as delivered in the character packs.
- **Raster art:** WebP (q86–88). PNG only for the PWA/brand icons, which need it.
- The full-quality masters (WAV, PNG) stay in the owner's `Runes Card Game/` folder, outside the repo.

## v118 audit
- Every file under `dist/assets` is now reachable from the code. The three leftovers
  (`bramm_player_one_card_02` EN/HE, retired v87; `brand/runes-white.svg`, never referenced) were removed.
- Audio 134 MB → 18 MB: `runes-round`, `soundtrack-3`, `soundtrack-4` (formerly 4 WAV chunks
  each, now one MP3 each), `gambit-by-the-hearth` (re-encoded from the WAV master `Soundtrack_2.wav`),
  and the five `tavern-loop-*` files. `AudioSystem.loadTrack()` still joins an array of chunks.
- `duel-opponents.png` 2.6 MB → `.webp` 0.56 MB; the 24 table props PNG 2.4 MB → WebP 0.6 MB.
  Both are in the service worker's install precache, so a first visit is ~4 MB lighter.
- New: two more card-draw takes from the owner's folder (`Card Draw 2/3.wav` →
  `card-draw-variation-1/2.wav`). `audioSystem.playCardDraw()` rotates the three takes (never the
  same twice running, one shared 80 ms cooldown); variation 2 is ~7 dB hotter and plays at .3.
- Source files in the owner's folder that are deliberately not in the game: Veyra's v111 retirements
  (`VEYRA_RETIRED` and four exchanges), `ragna_player_draw_01` (deleted from the script), the
  Halden pack (unfinished, not voiced), older card SVG drafts, and reference/contact sheets.
