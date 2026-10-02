# RUNES — UI asset requests (after the v79 art-direction pass)

Only assets that would raise the visual ceiling beyond what CSS and the existing art can do. Everything else from the pass was built in code. Four requests, in priority order.

All raster art: match the existing tavern illustration style (painterly, warm candle light from above-front, slightly desaturated, hand-painted texture, no outlines, no text unless stated).

---

## 1. Seated portraits for the five newer regulars

### Asset name
`roderic-seated.webp`, `lio-seated.webp`, `mograth-seated.webp`, `harrow-seated.webp`, `rusk-seated.webp`

### Where it appears
Tavern Match table, opponent seats (`dist/assets/characters/table/`). Wire-up: add the keys to `TAVERN_FIGURES` in `app.js`.

### Purpose
Aila, Ron, Bran, Sela and Kesh sit *at* the table, arms on the wood, at a consistent scale. Roderic, Lio, Mograth, Harrow and Rusk only have a small sprite bust from the duel sheet, so on 3 of every 5 evenings one or more seats look visibly lower-fidelity and smaller than their neighbours. This is the single most noticeable inconsistency left on the main game screen.

### Required format
PNG master (transparent) → we convert to WebP q88.

### Dimensions / aspect ratio
900 × 900 px master (shipped at 640 px), same framing as `aila-seated`: head near the top quarter, forearms resting on a table edge that sits on the bottom ~8 % of the canvas.

### Transparency
Yes — everything outside the figure transparent. The table edge itself should NOT be painted (the game draws its own rim).

### Art direction
Same camera height and lens as the existing seated portraits: eye level, looking across the table at the player. Torso cut by the bottom edge, forearms and hands resting forward as if on a table. Expression: their idle personality (Roderic smug, Lio grinning, Mograth sour, Harrow unimpressed, Rusk watchful). Lit from above-front, warm.

### Variants
None needed.

### Priority
**High**

### Prompt
> Painterly fantasy tavern character portrait, [CHARACTER DESCRIPTION FROM THE DUEL SPRITE], seated at a wooden card table seen from across the table at eye level, torso and head, forearms resting forward on the table edge, hands loosely together, [EXPRESSION], warm candle light from above and slightly in front, soft shadows, muted earthy palette, hand-painted texture, consistent with a cozy medieval tavern card game, transparent background, no table drawn, no text, no frame, 900×900, figure centred, head in upper third.

(Replace the bracketed parts per character, using the duel sprite sheet `duel-opponents-2.webp` as the visual reference so they stay recognisable.)

---

## 2. Table wood "plank" texture for primary actions

### Asset name
`ui-plank.webp`

### Where it appears
Every primary action (Deal the cards, Next round, Back to the table, Rematch, Another evening). Currently the plank reuses a crop of `table-wood-v37.jpg`, which works but shows random knots at different crops and has no cut end grain.

### Purpose
Gives the main action a believable cut-wood edge with chamfered ends and consistent grain — the most-pressed control in the game.

### Required format
WebP (or PNG), used as `border-image` / background with 9-slice.

### Dimensions / aspect ratio
960 × 120 px (8:1). Ends (first and last 60 px) contain the cut/chamfered ends; the middle must tile horizontally.

### Transparency
Yes (outside the plank's slightly irregular silhouette).

### Art direction
A short board of the same dark walnut as the table, horizontal grain, lightly worn on the top edge (paler where hands touch), chamfered ends, two tiny dark nail heads near each end. No text, no carving. Lit from above.

### Variants
None.

### Priority
**Nice to have**

### Prompt
> Single short wooden plank, dark walnut matching an old tavern table, horizontal wood grain, slightly worn and paler along the top edge, chamfered cut ends with visible end grain, two small dark iron nail heads near each end, top-down warm lighting, hand-painted texture, transparent background, 960×120, no text, no carving, middle section evenly tileable horizontally.

---

## 3. Parchment sheet texture

### Asset name
`ui-parchment.webp`

### Where it appears
All sheets (Quick Play, Settings, Rules, Pause), the round-result slip, and the small table notes.

### Purpose
The parchment is currently a CSS gradient plus an inner vignette. It reads as paper, but flat. A real fibre texture with faint stains and handled edges would make every overlay feel physical, especially on desktop where sheets are large.

### Required format
WebP, seamless tile.

### Dimensions / aspect ratio
1024 × 1024 seamless.

### Transparency
No.

### Art direction
Warm cream parchment (centre ≈ #ead8ad), subtle fibres, very faint water rings and thumb smudges, no strong blotches, no burnt edges (edges are handled in CSS). Low contrast so text stays perfectly legible.

### Variants
None.

### Priority
**High**

### Prompt
> Seamless tileable texture of old cream parchment paper, colour around #ead8ad, subtle paper fibres, very faint water stains and light thumb smudges, low contrast, evenly lit, no burnt edges, no text, no folds, 1024×1024, photorealistic but soft, suitable as a background behind dark ink text.

---

## 4. Engraved brass corner for the menu / back plate

### Asset name
`ui-brass-plate.webp`

### Where it appears
The pause/menu button on the table and the back button on Duel Select (`.icon-button`).

### Purpose
The brass plate is a CSS gradient; at 44–54 px it's fine, but a small cast plate with a worn engraved border would make the only permanent HUD control feel like hardware on the table.

### Required format
PNG / WebP with alpha.

### Dimensions / aspect ratio
128 × 128 (1:1), displayed at 44–54 px.

### Transparency
Yes.

### Art direction
Small square aged-brass plate, slightly rounded corners, thin engraved border line, two tiny rivets at top corners, worn bright on the edges, darker in the recesses. Empty centre (the icon is drawn on top).

### Variants
Pressed state not needed (handled in CSS).

### Priority
**Nice to have**

### Prompt
> Small square aged brass plate, 128×128, slightly rounded corners, thin engraved border line inset from the edge, two tiny rivets at the top corners, worn and brighter on the raised edges, darker patina in the engraved lines, warm overhead light, empty plain centre, transparent background, hand-painted game UI asset, no text.
