"""Measures for the art-fidelity checks. Tracing stays in trace.py; this only scores and cleans.

Light delta is the plan's formula: mean luminance (0.2126 R + 0.7152 G + 0.0722 B) of non-ink
pixels in the top 40% of the opaque bbox, minus the same for the bottom 40%.
A specular pixel is white, or the last stop of the most common non-ink ramp.
"""
import json
import os

import png
import render
import trace

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", ".."))
ART = os.path.join(ROOT, "web", "art")
PUBLIC = os.path.join(ROOT, "web", "public", "art")
SHEETS = os.path.join(ROOT, "web", "public")
INDEX = os.path.join(ART, "sheet-index.json")

KNOCKOUT_EDGE = trace.KNOCKOUT_EDGE
DISTANCE_LIMIT = 24

# These twins are drawn as pictures. Their sheet box is a different cell (the tileset
# sample, a menu, a logo), so tracing that box replaces the object. Mask IoU cannot
# see it: a background or tile is fully opaque, and these sprites lose the silhouette.
COMPOSED_SPRITES = {
    "sprite/build-antena", "sprite/build-placa", "sprite/build-placa-code", "sprite/build-rack",
    "sprite/build-server-hut", "sprite/build-tenda",
    "sprite/extra-banco", "sprite/extra-bandeira", "sprite/extra-fogueira", "sprite/extra-lampada",
    "sprite/extra-placa",
    "sprite/prop-caixa", "sprite/prop-caixa-aberta", "sprite/prop-caneca", "sprite/prop-laptop",
    "sprite/prop-livros", "sprite/prop-macbook", "sprite/prop-modem", "sprite/prop-monitor",
    "sprite/prop-planta", "sprite/prop-rack", "sprite/prop-roteador", "sprite/prop-terminal",
    "sprite/prop-torre",
    "sprite/tile-arbusto", "sprite/tile-arvore", "sprite/tile-arvore-grande", "sprite/tile-cerca",
    "sprite/tile-flor",
}


def palette():
    return render.load_palette()


def ink_rgbs(pal):
    return {rgb for name, rgb in pal.items() if name == "ink" or name.startswith("ink.")}


def _lum(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def opaque_mask_rows(rows):
    return {(x, y) for y, row in enumerate(rows) for x, px in enumerate(row) if px[3]}


def opaque_mask_cells(cells):
    return {(x, y) for y, row in enumerate(cells) for x, key in enumerate(row) if key}


def iou(a, b):
    union = len(a | b)
    if union == 0:
        return 1.0
    return len(a & b) / union


def outline_ratio(rows, pal):
    """Share of edge pixels (4-neighbour touches transparency or the canvas) whose rgb is in the ink ramp."""
    ink = ink_rgbs(pal)
    h, w = len(rows), len(rows[0])
    edge = inked = 0
    for y in range(h):
        for x in range(w):
            px = rows[y][x]
            if px[3] == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or rows[ny][nx][3] == 0:
                    edge += 1
                    inked += px[:3] in ink
                    break
    return 1.0 if edge == 0 else inked / edge


def light_delta(rows, pal):
    ink = ink_rgbs(pal)
    pts = [(x, y, px[:3]) for y, row in enumerate(rows) for x, px in enumerate(row) if px[3] and px[:3] not in ink]
    if not pts:
        return 0.0
    y0 = min(p[1] for p in pts)
    y1 = max(p[1] for p in pts)
    bh = y1 - y0 + 1
    top = [p for p in pts if p[1] <= y0 + bh * 0.4]
    bot = [p for p in pts if p[1] >= y1 - bh * 0.4]
    if not top or not bot:
        return 0.0
    return sum(_lum(p[2]) for p in top) / len(top) - sum(_lum(p[2]) for p in bot) / len(bot)


def _ramp_of(name):
    return name.split(".", 1)[0]


def _top_name(ramp, pal):
    indexes = []
    for name in pal:
        if _ramp_of(name) == ramp and "." in name:
            indexes.append(int(name.split(".", 1)[1]))
    if not indexes:
        return ramp
    return f"{ramp}.{max(indexes)}"


def dominant_top_rgb(cells_or_rows, pal, from_rows=False):
    """Last stop of the most common non-ink ramp. `cells_or_rows` are palette keys, unless from_rows."""
    counts = {}
    if from_rows:
        rgb_name = {}
        for name, rgb in pal.items():
            if "." in name:
                rgb_name.setdefault(rgb, name)
        ink = ink_rgbs(pal)
        for row in cells_or_rows:
            for px in row:
                if px[3] == 0 or px[:3] in ink:
                    continue
                name = rgb_name.get(px[:3])
                if not name:
                    continue
                ramp = _ramp_of(name)
                counts[ramp] = counts.get(ramp, 0) + 1
    else:
        for row in cells_or_rows:
            for key in row:
                if not key or _ramp_of(key) == "ink":
                    continue
                ramp = _ramp_of(key)
                counts[ramp] = counts.get(ramp, 0) + 1
    if not counts:
        return pal["white"]
    ramp = max(counts, key=counts.get)
    return pal[_top_name(ramp, pal)]


def specular_count(rows, pal):
    white = pal["white"]
    top = dominant_top_rgb(rows, pal, from_rows=True)
    n = 0
    for row in rows:
        for px in row:
            if px[3] and (px[:3] == white or px[:3] == top):
                n += 1
    return n


def edge_keys(cells):
    h, w = len(cells), len(cells[0])
    out = set()
    for y in range(h):
        for x in range(w):
            if not cells[y][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or not cells[ny][nx]:
                    out.add((x, y))
                    break
    return out


def clean_cells(cells, pal, glossy):
    """Recolor the existing opaque cells: edge becomes ink; glossy keeps exactly one specular. Mask unchanged."""
    edge = edge_keys(cells)
    cleaned = [row[:] for row in cells]
    for y, row in enumerate(cleaned):
        for x, key in enumerate(row):
            if (x, y) in edge:
                row[x] = "ink"
    if not glossy:
        return cleaned
    counts = {}
    for row in cleaned:
        for key in row:
            if key and _ramp_of(key) != "ink":
                ramp = _ramp_of(key)
                counts[ramp] = counts.get(ramp, 0) + 1
    ramp = max(counts, key=counts.get) if counts else "gold"
    top = _top_name(ramp, pal)
    indexes = [int(n.split(".")[1]) for n in pal if _ramp_of(n) == ramp and "." in n]
    mid = f"{ramp}.{max(indexes) - 1}" if indexes and max(indexes) > 0 else "ink.1"
    if mid not in pal:
        mid = "ink.1"
    white = pal["white"]
    top_rgb = pal[top]
    for row in cleaned:
        for x, key in enumerate(row):
            if not key:
                continue
            rgb = pal[key]
            if rgb == white or rgb == top_rgb:
                row[x] = mid
    placed = False
    for y, row in enumerate(cleaned):
        for x, key in enumerate(row):
            if key and (x, y) not in edge:
                row[x] = "white"
                placed = True
                break
        if placed:
            break
    return cleaned


def cells_to_spec(name, category, size, cells, source):
    """One grid layer per 60 colours. '.' stays unpainted so later layers can fill the rest."""
    alphabet = trace.ALPHABET
    h, w = len(cells), len(cells[0])
    colors = []
    seen = set()
    for row in cells:
        for key in row:
            if key and key not in seen:
                seen.add(key)
                colors.append(key)
    layers = []
    for start in range(0, max(1, len(colors)), 60):
        group = set(colors[start:start + 60])
        legend = {}
        chars = {}
        grid = []
        for row in cells:
            line = []
            for key in row:
                if key not in group:
                    line.append(".")
                    continue
                if key not in chars:
                    chars[key] = alphabet[len(chars)]
                    legend[chars[key]] = key
                line.append(chars[key])
            grid.append("".join(line))
        if legend:
            layers.append({"grid": grid, "legend": legend})
    if not layers:
        layers = [{"grid": ["." * w for _ in range(h)], "legend": {".": None}}]
    return {
        "name": name,
        "category": category,
        "size": list(size),
        "_from": source,
        "layers": layers,
    }


def render_spec_rows(spec):
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "s.json")
        with open(path, "w") as f:
            json.dump(spec, f)
        canvas = render.render_spec(path, palette())
        return render.to_rows(canvas)


def category_of(key):
    return key.split("/", 1)[0]


def knockout_of(category):
    return "edge" if category in KNOCKOUT_EDGE else "none"


def load_index():
    with open(INDEX) as f:
        return json.load(f)


def sheet_rows(source):
    return png.read(os.path.join(SHEETS, source))


def trace_box(rows, box, size, category, pal):
    return trace.trace_image(rows, tuple(box), tuple(size), pal, knockout_of(category), 32)


def accept_trace(stats):
    """AC 11: mean distance > 24 is a rejection. None distance (empty trace) is a rejection too."""
    mean = stats.get("mean_distance")
    if mean is None or mean > DISTANCE_LIMIT:
        return False
    return True


def write_if_accepted(dest, spec, stats):
    """Write the spec only when the trace is inside the distance limit. A rejection leaves the path untouched."""
    if not accept_trace(stats):
        return False
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    with open(dest, "w") as f:
        json.dump(spec, f)
        f.write("\n")
    return True


def spec_path(key):
    return os.path.join(ART, key + ".json")


def png_path(key):
    return os.path.join(PUBLIC, key + ".png")


def read_png(key):
    return png.read(png_path(key))


def iter_spec_keys():
    keys = []
    for dirpath, _, files in os.walk(ART):
        for name in files:
            if not name.endswith(".json") or name.startswith("_") or name == "sheet-index.json":
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ART)[:-5]
            keys.append(rel)
    return sorted(keys)


def is_hero_or_anim(key, spec=None):
    if key.startswith("sprite/hero/"):
        return True
    if spec is None:
        path = spec_path(key)
        if not os.path.isfile(path):
            return False
        with open(path) as f:
            spec = json.load(f)
    return spec.get("category") == "anim"


def passes_icon_sprite(rows, pal):
    return outline_ratio(rows, pal) >= 0.90 and light_delta(rows, pal) > 0
