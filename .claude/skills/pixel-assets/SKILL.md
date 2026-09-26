---
name: pixel-assets
description: "Generate DevServer game art (sprites, enemies, item/HUD icons, scene backgrounds, UI panels, battle hit effects) as pixel art in the style of web/public/keyart.png, drawn from JSON specs by a stdlib-only Python renderer that locks every pixel to the key art's palette and checks outline, size and transparency. Use whenever the user wants a new or changed game image: \"gera um sprite\", \"cria o inimigo\", \"ícone da poção\", \"fundo da cena\", \"asset\", \"arte do jogo\", \"pixel art\", replace an emoji/glyph with a picture, add an enemy/item that needs art, or make art match the key art, even if they never say 'asset'. Do NOT use for CSS-only styling, editing keyart.png itself, or non-game images (diagrams, charts, screenshots)."
---

# pixel-assets

Make game art that looks like it came out of `web/public/keyart.png`. You can't paint
pixels by hand in an image editor, but you can write them: each asset is a small JSON spec
(a character grid and/or drawing ops) that `scripts/render.py` turns into a PNG. The
renderer only accepts colors from `references/palette.json` (sampled from the key art) and
flags broken outlines, wrong sizes and stray transparency, so the style holds across many
assets made in many sessions.

Paths below are relative to this skill's folder unless they start with `web/`.

## Before drawing

1. **Look at the key art.** Read `web/public/keyart.png`. If the thing you're drawing (or
   something like it) is in there, zoom in mentally on it: the hero, slime, gem, coin, heart,
   signs, server hut, trees, HUD panels. Match that, not a generic idea of pixel art.
2. **Read `references/style-guide.md`**: the rules, per category, and the sizes.
3. **Find where the asset goes.** Read the component that will show it (e.g. `enemy.glyph`
   in `web/src/components/BattleScene.tsx`, the catalog in `web/src/lib/`) to learn its
   display size and neighbours, and whether several variants are needed (one per enemy,
   per region, per item).
4. **Start from the closest example** in `examples/` (`coin` icon, `slime` sprite,
   `slime-red` recolor variant, `panel` 9-slice UI, `meadow` background; for an `fx`
   4-frame effect strip, start from `web/art/fx/slash.json`). The op list is in
   `references/spec-format.md`.

## Drawing loop

Write the spec at `web/art/<category>/<name>.json`, then render with a preview:

```bash
python3 .claude/skills/pixel-assets/scripts/render.py web/art/<category>/<name>.json \
  --out web/public/art --preview <scratchpad>/preview.png
```

Then **Read the preview image and critique it** against the key art. Silhouette readable?
Light from the top-left? Outline closed? Does it sit next to the key art without looking
out of place? Fix the spec and render again. Expect 2–3 passes; the first render is rarely
the best. Stop when the validator prints `ok` (or a `WARN` you can justify) and the
preview looks like it belongs in the key art.

How to choose between grid and ops:

- **Grid** for sprites and icons: each pixel is a decision (eyes, `</>` markings, hands).
  Use `"mirror"` for symmetric shapes to halve the work, then break the symmetry with a
  small op afterwards (highlight on the left, a scar, a held item).
- **Ops** for blobs and backgrounds: stacked `ellipse`s make shaded volumes fast; `bands`,
  `ridge` and `scatter` build a parallax scene in ~15 lines.
- Mixed is normal: ellipses for the body, a grid for the face, then `{"outline": "ink"}`.

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

- the spec and PNG paths you created or changed,
- the validator result (quote any `WARN` and why you kept it),
- the preview image path, so they can look at it themselves.

Commit specs and PNGs together; the PNG is only reproducible from its spec.
