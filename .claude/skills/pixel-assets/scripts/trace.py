"""Turn a crop of a keyart into a palette-locked grid spec.

The keyarts are upscaled illustrations. This collapses a box of that picture onto
the asset's native grid and snaps every cell to references/palette.json, so the
silhouette starts from the reference instead of from memory. Clean the spec after:
ink outline, top-left light, one specular on anything glossy.

    python3 trace.py web/public/assests_keyart.png 40,80,70,70 \
        --size 32x32 --name mob-slime --category sprite \
        --out web/art/sprite/mob-slime.json --preview /tmp/trace.png

Leave a margin of backdrop inside the box. `--knockout edge` (the default for
sprites, icons, ui, fx and anim) drops cells that match the border colour.
Backgrounds and tiles keep every cell (`--knockout none`).
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import png  # noqa: E402
import render  # noqa: E402

ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
KNOCKOUT_EDGE = {"icon", "sprite", "ui", "fx", "anim"}
PAGE = (7, 11, 17, 255)


def _dotted(palette):
    """rgb -> palette key. Index 0 is the bare ramp name ('ink'), later indices stay 'ramp.i'."""
    out = {}
    for name, rgb in palette.items():
        if "." not in name:
            continue
        ramp, _, idx = name.partition(".")
        out.setdefault(rgb, ramp if idx == "0" else name)
    return out


def _median_rgb(pixels):
    channels = [[p[i] for p in pixels] for i in range(3)]
    return tuple(sorted(ch)[len(ch) // 2] for ch in channels)


def _dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def _nearest(rgb, by_rgb):
    best_d, best = None, None
    for key_rgb, name in by_rgb.items():
        d = _dist2(rgb, key_rgb)
        if best_d is None or d < best_d:
            best_d, best = d, (name, key_rgb)
    return best[0], best_d ** 0.5


def _span(i, n_out, n_in):
    a = min(n_in - 1, i * n_in // n_out)
    b = min(n_in, max(a + 1, (i + 1) * n_in // n_out))
    return a, b


def trace_image(rows, box, size, palette, knockout, threshold):
    """Return (cells, stats). cells[y][x] is a palette key or None.

    A cell is empty when knockout is on and more than half its source pixels sit
    within `threshold` of the crop border's median colour. Otherwise the cell is
    the average of the pixels that are not backdrop, snapped to the nearest key.
    """
    x, y, w, h = box
    tw, th = size
    if w < 1 or h < 1 or tw < 1 or th < 1:
        raise ValueError(f"box and size must be positive, got box {box} size {size}")
    ih, iw = len(rows), len(rows[0])
    if x < 0 or y < 0 or x + w > iw or y + h > ih:
        raise ValueError(f"box {box} is outside the image ({iw}x{ih})")
    by_rgb = _dotted(palette)
    border = []
    for yy in range(y, y + h):
        for xx in (x, x + w - 1):
            border.append(rows[yy][xx][:3])
    for xx in range(x + 1, x + w - 1):
        for yy in (y, y + h - 1):
            border.append(rows[yy][xx][:3])
    backdrop = _median_rgb(border) if knockout == "edge" else None
    limit = threshold * threshold
    cells, dists, dropped = [], [], 0
    for j in range(th):
        y0, y1 = _span(j, th, h)
        row = []
        for i in range(tw):
            x0, x1 = _span(i, tw, w)
            acc = [0, 0, 0]
            total = kept = 0
            for yy in range(y + y0, y + y1):
                src = rows[yy]
                for xx in range(x + x0, x + x1):
                    total += 1
                    rgb = src[xx][:3]
                    if backdrop is not None and _dist2(rgb, backdrop) <= limit:
                        continue
                    for c in range(3):
                        acc[c] += rgb[c]
                    kept += 1
            if kept * 2 < total:
                row.append(None)
                dropped += 1
                continue
            avg = tuple(acc[c] / kept for c in range(3))
            name, dist = _nearest(avg, by_rgb)
            row.append(name)
            dists.append(dist)
        cells.append(row)
    stats = {
        "mean_distance": (sum(dists) / len(dists)) if dists else None,
        "knockout_cells": dropped,
        "backdrop": None if backdrop is None else "#{:02x}{:02x}{:02x}".format(*backdrop),
        "opaque": len(dists),
    }
    return cells, stats


def spec_from(name, category, size, cells, source):
    legend, chars = {}, {}
    grid = []
    for row in cells:
        line = []
        for key in row:
            if key is None:
                line.append(".")
                continue
            if key not in chars:
                if len(chars) >= len(ALPHABET):
                    raise ValueError(
                        f"trace uses {len(chars) + 1} colours; a grid holds {len(ALPHABET)}. Crop tighter."
                    )
                chars[key] = ALPHABET[len(chars)]
                legend[chars[key]] = key
            line.append(chars[key])
        grid.append("".join(line))
    return {
        "name": name,
        "category": category,
        "size": list(size),
        "_from": source,
        "layers": [{"grid": grid, "legend": legend}],
    }


def _preview(cells, palette, path):
    by_name = palette
    scale = 4 if max(len(cells[0]), len(cells)) <= 64 else 2
    bg = PAGE
    rows = []
    for row in cells:
        out = []
        for key in row:
            px = bg if key is None else by_name[key] + (255,)
            out.extend([px] * scale)
        rows.extend([out] * scale)
    png.write(path, rows)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("box", help="x,y,w,h of the crop, in image pixels")
    ap.add_argument("--size", required=True, help="native WxH, e.g. 32x32")
    ap.add_argument("--name", required=True)
    ap.add_argument("--category", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview")
    ap.add_argument("--knockout", choices=("edge", "none"))
    ap.add_argument("--threshold", type=float, default=32)
    args = ap.parse_args(argv)
    try:
        box = tuple(int(n) for n in args.box.split(","))
        tw, th = (int(n) for n in args.size.lower().split("x"))
        if len(box) != 4:
            raise ValueError
    except ValueError:
        print(f"ERROR {args.image}: box is x,y,w,h and size is WxH", file=sys.stderr)
        return 1
    knockout = args.knockout or ("edge" if args.category in KNOCKOUT_EDGE else "none")
    try:
        cells, stats = trace_image(png.read(args.image), box, (tw, th), render.load_palette(), knockout, args.threshold)
        source = f"traced from {args.image} {args.box} at {tw}x{th}, knockout {knockout}"
        spec = spec_from(args.name, args.category, (tw, th), cells, source)
    except (ValueError, OSError) as e:
        print(f"ERROR {args.image}: {e}", file=sys.stderr)
        return 1
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(spec, f, indent=2)
        f.write("\n")
    if args.preview:
        _preview(cells, render.load_palette(), args.preview)
        print(f"preview -> {args.preview}")
    mean = stats["mean_distance"]
    mean_s = "n/a" if mean is None else f"{mean:.1f}"
    print(
        f"traced {args.name}: {stats['opaque']} cells, {stats['knockout_cells']} knocked out, "
        f"mean distance {mean_s}, backdrop {stats['backdrop']}"
    )
    if mean is not None and mean > 24:
        print("crop sits far from the palette; sample a ramp with sample_colors.py before trusting this trace")
    print(f"spec -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
