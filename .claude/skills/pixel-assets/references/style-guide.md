# DevServer style guide

Everything here was read off `web/public/keyart.png`. When a rule and the key art disagree,
the key art wins: open it and look.

## What the key art looks like

- **16-bit JRPG pixel art**, bright and saturated: deep blue sky, lush greens, gold, cyan,
  purple. Friendly, not grim.
- **Theme = developer life as an adventure.** Recurring motifs: the `</>` glyph in terminal
  green, dark server racks with little green/blue LEDs, laptops, terminal screens (green
  on near-black), clouds as "deploy", bugs and slimes as enemies, gems and coins as currency.
- **Every foreground shape has a 1px `ink` outline** (`#060612`). Inner detail lines use the
  darkest tone of the material's own ramp, never ink, so forms don't turn into cutouts.
- **Light comes from the top-left.** Highlight the top/left edges, shade the bottom/right.
  Glossy things (slime, gem, coin, screen) get a single `white` or top-tone specular pixel.
- **3–4 tones per material**, straight from a ramp. No gradients except the dithered sky
  (`bands`). No anti-aliasing against transparency; no semi-transparent pixels.
- **Depth by atmosphere**: far layers are bluer (`sky.0`/`sky.1`), flat, low contrast and
  have no outline; near layers get the full ramp and the outline.

## Palette

`references/palette.json`. Ramps are named by material (`wood`, `stone`, `leaf`, `gold`,
`gem`, `slime`, `code`, `net`, `skin`, `hoodie`, ...), darkest first. `ui` mirrors the CSS
tokens in `web/src/app/globals.css` so art and chrome agree. If you need a tone that isn't
there, sample it from the key art with `scripts/sample_colors.py` and add a ramp; don't
invent hex values.

## Per category

### sprite: characters, enemies, props

- Sizes: 32x32 (enemy, prop), 32x48 (humanoid), 48x48 / 64x64 (boss, big prop).
- Chibi proportions, like the hero: head about 40% of the height, big simple eyes (2x2 or
  2x3 ink with one white pixel), short legs.
- The silhouette must read at 1x. Test it: squint at the preview. If you can't tell what it
  is from the outline alone, simplify.
- Leave 1–2px of transparent margin so the outline never touches the canvas edge.
- Enemies are dev bugs made cute and threatening: slimes, beetles with `</>` markings,
  corrupted-data blobs, a "null pointer" ghost. Tie the design to the enemy's name.
- Variants (colour, level) are a `use` with `recolor`, not a copied grid.
- Draw facing right. Flip in CSS (`transform: scaleX(-1)`) or with `flip: "h"`.

### icon: items, currency, HUD, skills

- 16x16 (default) or 24x24. Shown at 2x–3x.
- One object, centred, filling ~80% of the canvas, full outline.
- Currency matches the HUD: coin = `gold` ramp, gem = `gem` ramp, HP = `red` heart,
  XP/level = `code` green.
- Icons in one set share the same light direction, outline weight and fill ratio. Render
  the whole set with one `--preview` and compare them side by side.

### background: scenes

- 320x180 (16:9); wider (480/640 x 180) only for scrolling scenes. Fully opaque.
- Build back to front: sky `bands` → clouds → far city `ridge` (blocks, `sky.1`, lit
  windows `net.3`) → nearer city (`sky.0`) → tree lines (`ridge` round, `leaf.0` then
  `leaf.1`) → ground (`grass` with a lighter top line, `scatter` texture) → `soil` strip.
- Leave the middle band calm (where sprites stand) and push detail to the edges and the back.
- Scene props (server hut, sign, tree) are separate sprite specs placed with `use`, so they
  can be reused.
- Match the scene to the game area: world = meadow + city (the key art); office = indoor
  desks, monitors, `wood` floor; server room = dark `stone`/`metal`, racks with LEDs,
  `lamp` glow; deploy = sky/clouds.

### ui: panels, frames, buttons

- 9-slice pieces: 24x24 with 8px corners (or 48x24 for a button with states side by side).
  Use as CSS `border-image: url(/art/ui/panel.png) 8 fill / 24px round;` with
  `image-rendering: pixelated`.
- Two families from the key art: **dark HUD panel** (`ink` edge, `ui.3` fill, `ui.5` top-left
  bevel, `ui.1` bottom-right shadow, 1px-cut corners) and **wooden sign** (`wood` ramp,
  `wood.0` plank seams, `metal.2` nail pixels).
- **Never bake text into an image.** Labels are HTML in the pixel font (`.pixel`), so they
  stay translatable, accessible and crisp.

### fx: battle effects

- One 128x32 PNG = a horizontal strip of **4 frames, each 32x32**; frame `i` occupies
  x = `32*i` .. `32*i+31`. Frames read left to right as **start → peak → fade → almost gone**,
  and every frame must differ from the others.
- Keep each frame's content inside its own 32x32 cell with a **1px clear margin**: nothing on
  the cell's border row/column, nothing bleeding into the neighbour frame (the renderer
  warns about both, and about identical or empty frames).
- Transparent background, like sprites. The ink outline is optional: effects are light and
  energy, so the edge is the darkest tone of the effect's own ramp (`gold.1`, `code.0`,
  `net.0`...) or nothing. An `{"outline": ...}` op runs over the whole strip, so put it right
  after the frames it should touch and before the others.
- One ramp per effect, keyed to its source: generic hit = `gold` + `white`, enemy hit = `red`
  + `gold`, frontend = `code`, backend = `net`, infra = `gold`, weakness/scan = `slime` +
  `gem`, heal = `code`, defense = `net`.
- The peak frame fills most of the cell; the last frame is a few pixels or specks.
- Shown at 3x (a 96x96 box) as a CSS sprite: `background: url(/art/fx/slash.png) 0 0 / 384px
  96px; image-rendering: pixelated; animation: fx 400ms steps(4) forwards;` with
  `@keyframes fx { to { background-position: -384px 0; } }`.

## Displaying assets

- Put `className="pixelated"` on the `<img>` (it already exists in `globals.css`).
- Scale by whole numbers only (width = native width x 2, 3, 4...). Non-integer scaling
  makes uneven pixels, which reads as blur.
- Meaningful `alt` text in Portuguese, like the existing `alt="herói"`; `alt=""` for
  decoration.
