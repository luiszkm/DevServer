"""Render DevServer pixel-art specs (JSON) into PNGs and check them against the style rules.

    # render every spec under web/art into web/public/art/<category>/<name>.png
    python3 render.py web/art --out web/public/art

    # render one spec and write a 4x contact sheet you can open to look at the result
    python3 render.py web/art/enemy/slime.json --out web/public/art --preview /tmp/sheet.png

    # check PNGs that were not produced from a spec (hand-edited, imported)
    python3 render.py --check web/public/art/icon/coin.png --category icon

Spec format: see references/spec-format.md. Specs whose file name starts with "_" are
partials: they are only drawn through a "use" op and never rendered on their own.
Exit code is 1 when any error is found, so the command can gate a commit.
"""
import argparse
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import png  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
PALETTE_PATH = os.path.join(HERE, "..", "references", "palette.json")

# Allowed canvas sizes per category (w, h). Anything else is a warning, not an error,
# because a boss or a panorama can legitimately break the grid.
SIZES = {
    "icon": {(16, 16), (24, 24)},
    "sprite": {(32, 32), (32, 48), (48, 48), (64, 64)},
    "background": {(320, 180), (480, 180), (640, 180)},
    "ui": {(24, 24), (48, 24), (48, 48)},
}
TRANSPARENT_CATEGORIES = {"icon", "sprite", "ui"}
OUTLINED_CATEGORIES = {"icon", "sprite"}

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def load_palette():
    with open(PALETTE_PATH) as f:
        raw = json.load(f)
    colors = {}
    for ramp, tones in raw.items():
        if ramp.startswith("_"):
            continue
        for i, hexcode in enumerate(tones):
            rgb = tuple(int(hexcode[j:j + 2], 16) for j in (1, 3, 5))
            colors[f"{ramp}.{i}"] = rgb
            if i == 0:
                colors[ramp] = rgb
    return colors


class SpecError(Exception):
    pass


class Canvas:
    def __init__(self, w, h, palette, recolor=None):
        self.w, self.h, self.palette = w, h, palette
        self.recolor = recolor or {}
        self.px = [[None] * w for _ in range(h)]

    def key(self, name):
        if name is None:
            return None
        ramp, dot, idx = name.partition(".")
        if ramp in self.recolor:
            name = self.recolor[ramp] + dot + idx
        if name not in self.palette:
            raise SpecError(f"unknown color '{name}' (not in references/palette.json)")
        return self.palette[name]

    def put(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = color


def _rng(op):
    return random.Random(op.get("seed", 1))


def op_fill(c, op, ctx):
    color = c.key(op["fill"])
    for y in range(c.h):
        for x in range(c.w):
            c.px[y][x] = color


def op_rect(c, op, ctx):
    x0, y0, w, h = op["rect"]
    color = c.key(op["color"])
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c.put(x, y, color)


def op_frame(c, op, ctx):
    x0, y0, w, h = op["frame"]
    color = c.key(op["color"])
    for x in range(x0, x0 + w):
        c.put(x, y0, color)
        c.put(x, y0 + h - 1, color)
    for y in range(y0, y0 + h):
        c.put(x0, y, color)
        c.put(x0 + w - 1, y, color)


def op_line(c, op, ctx):
    x0, y0, x1, y1 = op["line"]
    color = c.key(op["color"])
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        c.put(x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def op_ellipse(c, op, ctx):
    cx, cy, rx, ry = op["ellipse"]
    color = c.key(op["color"])
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1:
                c.put(x, y, color)


def op_poly(c, op, ctx):
    pts = op["poly"]
    color = c.key(op["color"])
    ys = [p[1] for p in pts]
    for y in range(min(ys), max(ys) + 1):
        yc = y + 0.5
        xs = []
        for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
            if (ay <= yc < by) or (by <= yc < ay):
                xs.append(ax + (yc - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(math.ceil(a - 0.5), math.floor(b - 0.5) + 1):
                c.put(x, y, color)


def op_bands(c, op, ctx):
    """Vertical gradient in flat bands, with ordered dithering `dither` px above each seam."""
    x0, y0, w, h = op["bands"]
    colors = [c.key(k) for k in op["colors"]]
    d = op.get("dither", 2)
    n = len(colors)
    seams = [y0 + round(h * i / n) for i in range(1, n)]
    for y in range(y0, y0 + h):
        band = sum(1 for s in seams if y >= s)
        nxt = None
        if band < n - 1:
            dist = seams[band] - y
            if 1 <= dist <= d:
                nxt = (d - dist + 1) / (d + 1)
        for x in range(x0, x0 + w):
            use_next = nxt is not None and BAYER4[y % 4][x % 4] / 16 < nxt
            c.put(x, y, colors[band + 1] if use_next else colors[band])


def op_ridge(c, op, ctx):
    """Jagged silhouette filled down to the bottom of the box: city blocks or round canopies."""
    x0, y0, w, h = op["ridge"]
    color = c.key(op["color"])
    rnd = _rng(op)
    lo, hi = op.get("heights", [h // 3, h])
    top = [y0 + h] * w
    if op.get("mode", "blocks") == "blocks":
        wmin, wmax = op.get("widths", [4, 10])
        x = 0
        while x < w:
            bw, bh = rnd.randint(wmin, wmax), rnd.randint(lo, hi)
            for i in range(x, min(w, x + bw)):
                top[i] = y0 + h - bh
            x += bw + op.get("gap", 0)
    else:
        rmin, rmax = op.get("radii", [4, 9])
        x = -rmax
        while x < w + rmax:
            r = rnd.randint(rmin, rmax)
            cy = y0 + h - rnd.randint(lo, hi) + r
            for i in range(max(0, x - r), min(w, x + r + 1)):
                t = cy - math.sqrt(max(0, r * r - (i - x) ** 2))
                top[i] = min(top[i], round(t))
            x += r + rnd.randint(1, r)
    for i, t in enumerate(top):
        for y in range(max(y0, t), y0 + h):
            c.put(x0 + i, y, color)
    lights = op.get("lights")
    if lights:
        lc = c.key(lights["color"])
        for i in range(1, w - 1, 2):
            for y in range(top[i] + 2, y0 + h - 1, 3):
                if rnd.random() < lights.get("density", 0.15):
                    c.put(x0 + i, y, lc)


def op_scatter(c, op, ctx):
    x0, y0, w, h = op["scatter"]
    colors = op["colors"] if "colors" in op else [op["color"]]
    colors = [c.key(k) for k in colors]
    rnd = _rng(op)
    only_on = c.key(op["on"]) if "on" in op else None
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if rnd.random() < op.get("density", 0.05):
                if only_on is None or (0 <= x < c.w and 0 <= y < c.h and c.px[y][x] == only_on):
                    c.put(x, y, rnd.choice(colors))


def _expand_row(row, mirror):
    if mirror is True:
        return row + row[::-1]
    if mirror == "odd":
        return row + row[-2::-1]
    return row


def op_grid(c, op, ctx):
    legend = dict(ctx["legend"])
    legend.update(op.get("legend", {}))
    x0, y0 = op.get("at", [0, 0])
    rows = [_expand_row(r, op.get("mirror")) for r in op["grid"]]
    if op.get("flip") == "h":
        rows = [r[::-1] for r in rows]
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch in (".", " "):
                continue
            if ch not in legend:
                raise SpecError(f"grid char '{ch}' has no legend entry")
            if legend[ch] is not None:
                c.put(x0 + dx, y0 + dy, c.key(legend[ch]))


def op_use(c, op, ctx):
    path = os.path.normpath(os.path.join(ctx["dir"], op["use"]))
    recolor = dict(op.get("recolor", {}))
    recolor.update(c.recolor)
    sub = render_spec(path, c.palette, ctx["stack"], recolor)
    x0, y0 = op.get("at", [0, 0])
    flip = op.get("flip") == "h"
    for y, row in enumerate(sub.px):
        cols = row[::-1] if flip else row
        for x, color in enumerate(cols):
            if color is not None:
                c.put(x0 + x, y0 + y, color)


def op_outline(c, op, ctx):
    """1px outline on every transparent pixel that touches an opaque one (4-neighbourhood)."""
    color = c.key(op["outline"])
    hits = []
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is not None:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < c.w and 0 <= ny < c.h and c.px[ny][nx] is not None:
                    hits.append((x, y))
                    break
    for x, y in hits:
        c.px[y][x] = color


OPS = {
    "fill": op_fill, "rect": op_rect, "frame": op_frame, "line": op_line,
    "ellipse": op_ellipse, "poly": op_poly, "bands": op_bands, "ridge": op_ridge,
    "scatter": op_scatter, "grid": op_grid, "use": op_use, "outline": op_outline,
}


def render_spec(path, palette, stack=(), recolor=None):
    if path in stack:
        raise SpecError(f"'use' cycle: {' -> '.join(stack + (path,))}")
    with open(path) as f:
        spec = json.load(f)
    w, h = spec["size"]
    merged = dict(spec.get("recolor", {}))
    merged.update(recolor or {})
    c = Canvas(w, h, palette, merged)
    ctx = {"legend": spec.get("legend", {}), "dir": os.path.dirname(path), "stack": stack + (path,)}
    for i, op in enumerate(spec.get("layers", [])):
        kind = next((k for k in op if k in OPS), None)
        if kind is None:
            raise SpecError(f"{path}: layer {i} has no known op (keys: {list(op)})")
        try:
            OPS[kind](c, op, ctx)
        except SpecError as e:
            raise SpecError(f"{path}: layer {i} ({kind}): {e}") from None
    c.spec = spec
    return c


def to_rows(canvas, scale=1):
    rows = []
    for row in canvas.px:
        out = []
        for color in row:
            px = (0, 0, 0, 0) if color is None else color + (255,)
            out.extend([px] * scale)
        rows.extend([out] * scale)
    return rows


def check(rows, category, palette, label):
    """Return (errors, warnings) for a rendered image against the style rules."""
    errors, warnings = [], []
    h, w = len(rows), len(rows[0])
    allowed = set(palette.values())
    ink = palette["ink"]
    if category in SIZES and (w, h) not in SIZES[category]:
        sizes = ", ".join(f"{a}x{b}" for a, b in sorted(SIZES[category]))
        warnings.append(f"{w}x{h} is not a standard {category} size ({sizes})")
    off, partial, transparent = set(), 0, 0
    for row in rows:
        for r, g, b, a in row:
            if a == 0:
                transparent += 1
            elif a != 255:
                partial += 1
            elif (r, g, b) not in allowed:
                off.add((r, g, b))
    if partial:
        errors.append(f"{partial} semi-transparent pixels (pixel art uses alpha 0 or 255 only)")
    if off:
        sample = ", ".join(f"#{r:02x}{g:02x}{b:02x}" for r, g, b in sorted(off)[:5])
        errors.append(f"{len(off)} colors outside the palette: {sample}")
    if category == "background" and transparent:
        errors.append(f"background has {transparent} transparent pixels; it must be fully opaque")
    if category in TRANSPARENT_CATEGORIES and rows[0][0][3] != 0:
        warnings.append("top-left pixel is opaque; sprites, icons and UI pieces should sit on transparency")
    if category in OUTLINED_CATEGORIES:
        edge = inked = 0
        for y in range(h):
            for x in range(w):
                if rows[y][x][3] == 0:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or rows[ny][nx][3] == 0:
                        edge += 1
                        inked += rows[y][x][:3] == ink
                        break
        if edge and inked / edge < 0.9:
            warnings.append(f"outline is {inked * 100 // edge}% ink; the key art outlines every foreground shape in 'ink'")
    return errors, warnings


def contact_sheet(images, path):
    """Lay images out left to right at a readable zoom on the page background colour."""
    bg, gap = (7, 11, 17, 255), 8
    scaled = []
    for rows in images:
        s = 2 if len(rows[0]) > 128 else 4
        scaled.append([[px for px in row for _ in range(s)] for row in rows for _ in range(s)])
    max_w = 1400
    lines, line, lw = [], [], gap
    for img in scaled:
        iw = len(img[0])
        if line and lw + iw + gap > max_w:
            lines.append(line)
            line, lw = [], gap
        line.append(img)
        lw += iw + gap
    lines.append(line)
    width = max(gap + sum(len(i[0]) + gap for i in ln) for ln in lines)
    height = gap + sum(max(len(i) for i in ln) + gap for ln in lines)
    sheet = [[bg] * width for _ in range(height)]
    y = gap
    for ln in lines:
        x = gap
        for img in ln:
            for dy, row in enumerate(img):
                for dx, px in enumerate(row):
                    if px[3]:
                        sheet[y + dy][x + dx] = px
            x += len(img[0]) + gap
        y += max(len(i) for i in ln) + gap
    png.write(path, sheet)


def collect(paths):
    specs = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                specs += [os.path.join(root, f) for f in sorted(files) if f.endswith(".json") and not f.startswith("_")]
        else:
            specs.append(p)
    return specs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", help="spec files or directories (or PNGs with --check)")
    ap.add_argument("--out", help="output root; each spec lands at <out>/<category>/<name>.png")
    ap.add_argument("--scale", type=int, default=1, help="integer upscale baked into the PNG (default 1: let CSS scale)")
    ap.add_argument("--preview", help="also write a zoomed contact sheet of everything rendered")
    ap.add_argument("--check", action="store_true", help="only check existing PNGs")
    ap.add_argument("--category", help="category for --check (icon, sprite, background, ui)")
    args = ap.parse_args()
    palette = load_palette()
    failed, rendered = False, []

    if args.check:
        for p in args.paths:
            rows = png.read(p)
            cat = args.category or os.path.basename(os.path.dirname(p))
            errors, warnings = check(rows, cat, palette, p)
            failed |= report(p, errors, warnings)
            rendered.append(rows)
    else:
        if not args.out:
            ap.error("--out is required when rendering")
        for path in collect(args.paths):
            try:
                canvas = render_spec(os.path.abspath(path), palette)
            except (SpecError, KeyError, ValueError) as e:
                print(f"ERROR {path}: {e}")
                failed = True
                continue
            spec = canvas.spec
            cat = spec.get("category", "sprite")
            name = spec.get("name") or os.path.splitext(os.path.basename(path))[0]
            out = os.path.join(args.out, cat, f"{name}.png")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            errors, warnings = check(to_rows(canvas), cat, palette, path)
            png.write(out, to_rows(canvas, args.scale))
            rendered.append(to_rows(canvas))
            failed |= report(out, errors, warnings)

    if args.preview and rendered:
        contact_sheet(rendered, args.preview)
        print(f"preview -> {args.preview}")
    sys.exit(1 if failed else 0)


def report(label, errors, warnings):
    status = "ERROR" if errors else ("WARN " if warnings else "ok   ")
    print(f"{status} {label}")
    for e in errors:
        print(f"      error: {e}")
    for w in warnings:
        print(f"      warn:  {w}")
    return bool(errors)


if __name__ == "__main__":
    main()
