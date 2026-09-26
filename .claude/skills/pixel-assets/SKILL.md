---
name: pixel-assets
description: "Generate DevServer game art (sprites, enemies, bosses, item/HUD icons, scene backgrounds, UI panels, battle hit effects) as pixel art traced from the matching keyart (web/public/keyart.png, female_keyart.png, assests_keyart.png, boss_screen_keyart), drawn from JSON specs by a stdlib-only Python renderer that locks every pixel to the key art's palette and checks outline, size and transparency. Use whenever the user wants a new or changed game image: \"gera um sprite\", \"cria o inimigo\", \"ícone da poção\", \"fundo da cena\", \"asset\", \"arte do jogo\", \"pixel art\", replace an emoji/glyph with a picture, add an enemy/item that needs art, or make art match the key art, even if they never say 'asset'. Do NOT use for CSS-only styling, editing the keyart files themselves, or non-game images (diagrams, charts, screenshots)."
---

# pixel-assets

Make game art that looks like it was traced off the matching keyart. You can't paint
pixels by hand in an image editor, but you can write them: each asset is a small JSON spec
(a character grid and/or drawing ops) that `scripts/render.py` turns into a PNG. The
renderer only accepts colors from `references/palette.json` (sampled from the keyarts) and
flags broken outlines, wrong sizes and stray transparency, so the style holds across many
assets made in many sessions. The pictures themselves are upscaled illustrations; fidelity
is the silhouette, the light and the materials at the asset's native size, not a copy of
their anti-aliased pixels.

Paths below are relative to this skill's folder unless they start with `web/`.

## Before drawing

1. **Open the picture that contains this object.** The table is at the top of
   `references/style-guide.md`. Read that image and find the object: masculine hero, HUD,
   hut, coin, gem and meadow in `web/public/keyart.png`; feminine hero in
   `web/public/female_keyart.png`; icons, props, tiles, scenes, mobs, effects and UI in
   `web/public/assests_keyart.png`; boss, corruption and the side-view lunge in
   `web/public/boss_screen_keyart`. If it is not in the picture, use the closest relative
   that is and keep that silhouette's language.
2. **Read `references/style-guide.md`**: the rules, per category, and the sizes.
3. **Find where the asset goes.** Read the component that will show it (e.g. `enemy.glyph`
   in `web/src/components/BattleScene.tsx`, the catalog in `web/src/lib/`) to learn its
   display size and neighbours, and whether several variants are needed (one per enemy,
   per region, per item).
4. **Trace the crop** onto that native size. Leave a margin of backdrop inside the box
   so the border colour is the backdrop, not the object:

```bash
python3 .claude/skills/pixel-assets/scripts/trace.py web/public/assests_keyart.png x,y,w,h \
  --size 32x32 --name <name> --category sprite \
  --out web/art/sprite/<name>.json --preview <scratchpad>/trace.png
```

   Read the trace preview. If the knockout ate the subject, rerun with a larger
   `--threshold` or `--knockout none` and erase the backdrop in the grid. If the report
   says the crop sits far from the palette, sample a ramp with `scripts/sample_colors.py`
   and add it before cleaning. The op list is in `references/spec-format.md`.

## Drawing loop

The trace is the silhouette, not the finished asset. Clean the spec:

- close the outline in `ink` (inner detail stays the darkest tone of the material)
- light from the top-left; one specular pixel on anything glossy
- 1–2px of transparent margin so the outline does not touch the canvas edge
- eyes, `</>` marks and hands edited in the grid
- a cell that snapped to the wrong material (`leaf` and `grass` share a green, `ink` and
  `soil` share a dark) moved onto the ramp the object is actually made of
- a background is ops, not a 320x180 grid: build the layers the crop shows, at the density
  of `examples/meadow.json`, and `use` traced props

Then render with a preview:

```bash
python3 .claude/skills/pixel-assets/scripts/render.py web/art/<category>/<name>.json \
  --out web/public/art --preview <scratchpad>/preview.png
```

**Read the preview next to the reference crop.** Silhouette the same object? Light from
the top-left? Outline closed? Same materials? Fix the spec and render again. Expect 2–3
passes; the first render is rarely the best. Stop when the validator prints `ok` (or a
`WARN` you can justify) and the preview reads as that crop at native size. The validator
checks palette, outline, size and alpha. It does not check likeness. Likeness is the
preview against the crop.

How to choose between grid and ops:

- **The traced grid is the silhouette** of a sprite, icon, prop or boss. Edit pixels in it
  (eyes, `</>` markings, hands, the specular). `"mirror"` is for a shape you are drawing
  when the crop has no usable backdrop, not a reason to skip the trace.
- **Ops** shade a volume or build a background: stacked `ellipse`s, `bands`, `ridge` and
  `scatter`. They do not replace a traced outline.
- Mixed is normal: the traced grid, then a small op for the highlight, then `{"outline": "ink"}`
  when the trace has no closed ink edge.

For a set (all enemies, all shop items), render them in one command with one `--preview`
so you can compare them side by side and keep them consistent.

## Wiring into the game

Only when the user asks for it (making the art and using it are separate asks):

- `<img src="/art/<category>/<name>.png" className="pixelated" alt="..." />`, scaled by a
  whole number (32px sprite → 128px). See "Displaying assets" in the style guide.
- `fx` strips are not `<img>`s: they are a CSS background stepped with `steps(4)`; see
  "fx: battle effects" in the style guide.
- It's a normal code change: follow the test policy in `AGENTS.md`. Existing tests may
  assert the old glyph or markup (e.g. `BattleScene.test.tsx`); update them to what the
  spec says, not to whatever the new markup happens to render.

## Finishing

Tell the user, briefly:

- the spec and PNG paths you created or changed, and which keyart the trace came from,
- the validator result (quote any `WARN` and why you kept it), and the trace's mean
  distance when it reported the crop sits far from the palette,
- the preview image path, so they can look at it themselves.

Commit specs and PNGs together; the PNG is only reproducible from its spec.
