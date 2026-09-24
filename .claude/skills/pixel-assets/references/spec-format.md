# Spec format

A spec is one JSON file that `scripts/render.py` turns into one PNG. Specs are the source
of truth: they live in `web/art/<category>/<name>.json`, the PNGs in
`web/public/art/<category>/<name>.png` are build output, and you change a PNG by changing
its spec and re-rendering.

```json
{
  "name": "slime",
  "category": "sprite",
  "size": [32, 32],
  "legend": {"o": "ink", "b": "slime.2"},
  "recolor": {"slime": "red"},
  "layers": [ { "<op>": ... }, ... ]
}
```

| Field | Meaning |
| --- | --- |
| `name` | Output file name (defaults to the spec file name). |
| `category` | `icon`, `sprite`, `background` or `ui`. Picks the output folder and the checks. |
| `size` | `[w, h]` in art pixels (1 art pixel = 1 PNG pixel; CSS does the zoom). |
| `legend` | Default char → color map for every `grid` op. `null` means transparent. |
| `recolor` | Ramp → ramp swap applied to every color in this spec, e.g. `{"slime": "red"}`. |
| `layers` | Ops, painted in order; later ops paint over earlier ones. |

Colors are always palette keys, `ramp.index` from `references/palette.json` (`"gold.2"`;
a bare `"gold"` means `gold.0`). Raw hex is refused on purpose: every pixel must come from
the key art's palette. `null` as a color erases (paints transparency).

## Ops

Coordinates are integers, origin top-left. Boxes are `[x, y, w, h]`.

| Op | Shape | Use it for |
| --- | --- | --- |
| `{"grid": [rows], "at": [x,y], "legend": {...}, "mirror": true\|"odd", "flip": "h"}` | Chars mapped through the legend; `.` and space are skipped. `mirror: true` appends each row reversed (even width); `"odd"` appends it reversed without repeating the centre column. | Characters, icons, faces: anything where each pixel is a decision. |
| `{"rect": [x,y,w,h], "color": k}` | Filled rectangle. | Blocks, panels, erasing (`"color": null`). |
| `{"frame": [x,y,w,h], "color": k}` | 1px rectangle border. | Panel borders, windows, screens. |
| `{"line": [x0,y0,x1,y1], "color": k}` | Bresenham line. | Cables, poles, antennas. |
| `{"ellipse": [cx,cy,rx,ry], "color": k}` | Filled ellipse. | Blobs, clouds, bushes, stacked for shading. |
| `{"poly": [[x,y], ...], "color": k}` | Filled polygon. | Roofs, paths, mountains, flags. |
| `{"bands": [x,y,w,h], "colors": [k...], "dither": n}` | Top-to-bottom flat bands with `n` rows of ordered dithering above each seam. | Skies, the only gradient the style allows. |
| `{"ridge": [x,y,w,h], "mode": "blocks"\|"round", "color": k, "heights": [lo,hi], "widths": [a,b], "radii": [a,b], "seed": s, "lights": {"color": k, "density": d}}` | A jagged skyline filled down to the box bottom. `blocks` = city buildings (`widths`), `round` = tree canopies/hills (`radii`). `lights` sprinkles lit windows (blocks). Round mode leaves gaps between bumps; paint something under it. | Parallax layers of backgrounds. |
| `{"scatter": [x,y,w,h], "colors": [k...], "density": d, "seed": s, "on": k}` | Random pixels; with `on`, only over pixels already of that color. | Grass/soil texture, stars, sparkles. |
| `{"use": "other.json", "at": [x,y], "flip": "h", "recolor": {...}}` | Paints another spec (path relative to this file) onto this one. | Placing props in a scene, variants of an enemy. |
| `{"outline": k}` | Adds a 1px outline on every transparent pixel touching an opaque one. Put it after the shape is complete. | Sprites and icons built from ellipses/rects. |

Seeds make `ridge` and `scatter` deterministic: same spec, same PNG. Change the seed to
get a different arrangement.

Files named `_something.json` are partials: rendered only through `use`, never on their own.

## Running

```bash
S=.claude/skills/pixel-assets/scripts
python3 $S/render.py web/art --out web/public/art                       # everything
python3 $S/render.py web/art/sprite/slime.json --out web/public/art \
        --preview /tmp/preview.png                                      # one, plus a 4x sheet
python3 $S/render.py --check some.png --category icon                   # check a PNG not built from a spec
python3 $S/sample_colors.py web/public/keyart.png 1245,755,45,60        # pull tones from the key art
```

`ok` = passes; `WARN` = style rule bent (fix it or say why); `ERROR` = off-palette color,
semi-transparent pixel, transparent background, bad spec. Exit code 1 on any error.
