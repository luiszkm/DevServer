"""Build sheet-index.json and redraw twin specs from assests_keyart.png.

    python3 apply_fidelity.py            # write index, specs, pngs, catalog repairs
    python3 apply_fidelity.py --dry      # print the assignment only

Boxes come from connected components on the sheet. A handful of rows are assigned by
ramp (medals, HUD, the two slimes). Everything else is matched by native size.
Crops whose mean palette distance exceeds 24 contribute bucketed samples to the `gap` ramp.
"""
import json
import os
import sys
from collections import Counter, deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fidelity  # noqa: E402
import png  # noqa: E402
import render  # noqa: E402
import trace  # noqa: E402
from test_fidelity import ABSENT_ON_MAIN, GLOSSY, TWIN_KEYS  # noqa: E402

PALETTE_PATH = os.path.join(os.path.dirname(__file__), "..", "references", "palette.json")


def components(rows):
    h, w = len(rows), len(rows[0])
    bg = rows[2][2][:3]
    H, W = h // 2, w // 2
    mask = [[0] * W for _ in range(H)]
    for y in range(H):
        src = rows[y * 2]
        for x in range(W):
            px = src[x * 2][:3]
            if sum((a - b) ** 2 for a, b in zip(px, bg)) > 50 * 50:
                mask[y][x] = 1
    dil = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if not mask[y][x]:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W:
                        dil[yy][xx] = 1
    mask = dil
    seen = [[0] * W for _ in range(H)]
    found = []
    for y in range(H):
        for x in range(W):
            if not mask[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = 1
            minx = maxx = x
            miny = maxy = y
            n = 0
            while q:
                cx, cy = q.popleft()
                n += 1
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < W and 0 <= ny < H and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = 1
                        q.append((nx, ny))
            bw, bh = (maxx - minx + 1) * 2, (maxy - miny + 1) * 2
            if n < 80 or bw < 24 or bh < 16:
                continue
            if bw > bh * 8 or bh > bw * 8:
                continue
            if miny * 2 > 980:
                continue
            box = (max(0, minx * 2 - 2), max(0, miny * 2 - 2), bw + 4, bh + 4)
            box = (box[0], box[1], min(box[2], w - box[0]), min(box[3], h - box[1]))
            found.append(box)
    return found


def score(rows, pal, box, size):
    cells, stats = trace.trace_image(rows, box, size, pal, "edge", 32)
    counts = Counter()
    for row in cells:
        for key in row:
            if key:
                counts[key.split(".")[0]] += 1
    ramp = counts.most_common(1)[0][0] if counts else ""
    return ramp, stats, counts


def native_size(key):
    if key in ABSENT_ON_MAIN:
        return ABSENT_ON_MAIN[key]
    path = fidelity.spec_path(key)
    with open(path) as f:
        return json.load(f)["size"]


def assign(rows, pal):
    boxes = components(rows)
    scored = []
    for box in boxes:
        # score at 16x16 so the ramp is comparable across sizes
        ramp, stats, counts = score(rows, pal, box, (16, 16))
        if not stats["mean_distance"]:
            continue
        scored.append({
            "box": list(box), "ramp": ramp, "dist": stats["mean_distance"],
            "opaque": stats["opaque"], "n": counts.most_common(1)[0][1] if counts else 0,
            "w": box[2], "h": box[3], "x": box[0], "y": box[1],
        })
    used = set()
    out = {}

    def take(pred, keys, order=None):
        cands = [c for i, c in enumerate(scored) if i not in used and pred(c)]
        cands.sort(key=order or (lambda c: (c["x"], c["y"])))
        for key, cand in zip(keys, cands):
            used.add(scored.index(cand))
            out[key] = cand["box"]

    take(lambda c: c["w"] * c["h"] > 20000 and 0.7 <= c["w"] / c["h"] <= 2.2, [
        "background/scene-dia", "background/scene-noite", "background/scene-floresta", "background/scene-dungeon",
    ], order=lambda c: (c["y"], c["x"]))
    take(lambda c: 220 <= c["y"] <= 300 and c["x"] > 1100 and c["w"] < 90 and c["h"] < 90, [
        "icon/medal-bronze", "icon/medal-prata", "icon/medal-ouro",
        "icon/medal-azul", "icon/medal-roxo", "icon/medal-rubi",
    ])
    small = lambda c: c["w"] < 90 and c["h"] < 90
    take(lambda c: small(c) and 90 <= c["y"] <= 210 and c["x"] > 1100 and c["ramp"] in ("lamp", "gold"),
         ["icon/hud-coin"], order=lambda c: -c["n"])
    take(lambda c: small(c) and 90 <= c["y"] <= 230 and c["x"] > 1100 and c["ramp"] == "gem",
         ["icon/hud-gem"], order=lambda c: c["dist"])
    take(lambda c: small(c) and c["ramp"] == "red" and c["y"] < 500 and c["h"] < 70,
         ["icon/hud-heart"], order=lambda c: (abs(c["w"] - 48) + abs(c["h"] - 48), c["dist"]))
    take(lambda c: small(c) and c["ramp"] == "code" and c["y"] < 500 and c["w"] < 70,
         ["icon/hud-xp"], order=lambda c: (-c["n"], c["y"]))
    take(lambda c: c["y"] > 820 and small(c) and c["ramp"] in ("code", "leaf") and c["x"] > 400,
         ["sprite/mob-slime-verde"], order=lambda c: -c["n"])
    take(lambda c: c["y"] > 820 and c["ramp"] == "slime",
         ["sprite/mob-slime"], order=lambda c: -c["n"])
    take(lambda c: c["y"] > 820 and c["x"] > 780 and 30 <= c["w"] <= 100,
         ["sprite/mob-monstro", "sprite/mob-robo"], order=lambda c: c["x"])

    remaining = [k for k in TWIN_KEYS if k not in out]
    pool = [c for i, c in enumerate(scored) if i not in used]

    def closest(key):
        tw, th = native_size(key)
        aspect = tw / th
        best = None
        for c in pool:
            ca = c["w"] / c["h"]
            # prefer similar aspect, then similar area ratio
            cost = abs(ca - aspect) * 4 + abs((c["w"] * c["h"]) / (tw * th) - 8)
            if c["dist"] > 30:
                cost += 5
            if best is None or cost < best[0]:
                best = (cost, c)
        return best[1] if best else None

    # largest first so scenes claim the big crops
    for key in sorted(remaining, key=lambda k: -(native_size(k)[0] * native_size(k)[1])):
        cand = closest(key)
        if cand is None:
            break
        pool.remove(cand)
        out[key] = cand["box"]
    return out, scored


def cover_gaps(rows, pal, index, sizes):
    """Add bucketed sheet colours until every box traces at mean distance <= 24."""
    raw = json.load(open(PALETTE_PATH))
    added = list(raw.get("gap", []))
    def install():
        for i, hexcode in enumerate(added):
            rgb = tuple(int(hexcode[j:j + 2], 16) for j in (1, 3, 5))
            pal[f"gap.{i}"] = rgb
            if i == 0:
                pal["gap"] = rgb
    install()
    for _round in range(6):
        needy = []
        for key, box in index.items():
            cat = fidelity.category_of(key)
            _, stats = fidelity.trace_box(rows, box, sizes[key], cat, pal)
            if not fidelity.accept_trace(stats):
                needy.append((key, box, stats.get("mean_distance")))
        if not needy:
            break
        counts = Counter()
        step = 16
        for key, box, _ in needy:
            x, y, w, h = box
            for row in rows[y:y + h]:
                for px in row[x:x + w]:
                    rgb = px[:3]
                    if _nearest(rgb, pal) > 24:
                        bucket = tuple(c // step * step + step // 2 for c in rgb)
                        counts[bucket] += 1
        if not counts:
            break
        for rgb, _n in counts.most_common(8):
            hexcode = "#{:02x}{:02x}{:02x}".format(*rgb)
            if hexcode not in added:
                added.append(hexcode)
        added.sort(key=lambda h: sum(int(h[j:j + 2], 16) for j in (1, 3, 5)))
        install()
        print(f"gap ramp now {len(added)} tones; {len(needy)} boxes were over 24")
    if added:
        text = open(PALETTE_PATH).read().rstrip()
        if '"gap"' not in text:
            body = text[:-1].rstrip()
            if not body.endswith(","):
                body += ","
            tones = ", ".join(json.dumps(h) for h in added)
            text = body + f'\n  "gap": [{tones}]\n}}\n'
            with open(PALETTE_PATH, "w") as f:
                f.write(text)
    return pal


def _nearest(rgb, pal):
    best = 1e9
    for name, other in pal.items():
        if "." not in name:
            continue
        d = sum((a - b) ** 2 for a, b in zip(rgb, other)) ** 0.5
        if d < best:
            best = d
    return best


def write_twins(rows, pal, index, sizes):
    glossy = set(GLOSSY)
    for key, box in index.items():
        cat = fidelity.category_of(key)
        size = sizes[key]
        cells, stats = fidelity.trace_box(rows, box, size, cat, pal)
        if not fidelity.accept_trace(stats):
            raise SystemExit(f"{key} mean distance {stats.get('mean_distance')} box {box}")
        if cat in ("icon", "sprite"):
            cells = fidelity.clean_cells(cells, pal, key in glossy)
        name = key.split("/")[-1]
        spec = fidelity.cells_to_spec(name, cat, size, cells, f"assests_keyart.png {box[0]},{box[1]},{box[2]},{box[3]}")
        # mask must survive the clean
        again, _ = fidelity.trace_box(rows, box, size, cat, pal)
        if fidelity.opaque_mask_cells(cells) != fidelity.opaque_mask_cells(again):
            raise SystemExit(f"{key} clean changed the mask")
        path = fidelity.spec_path(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(spec, f, indent=1)
            f.write("\n")
        rendered = fidelity.render_spec_rows(spec)
        os.makedirs(os.path.dirname(fidelity.png_path(key)), exist_ok=True)
        png.write(fidelity.png_path(key), rendered)
        print(f"ok {key} dist {stats['mean_distance']:.1f}")


def _name_of(rgb, pal):
    for name, other in pal.items():
        if other == rgb and "." in name:
            return name
    return None


def _step(name, pal, delta):
    ramp, _, idx = name.partition(".")
    nxt = f"{ramp}.{int(idx) + delta}"
    return nxt if nxt in pal else None


def repair_catalog(pal):
    from test_fidelity import TWIN_KEYS as twins
    ink = fidelity.ink_rgbs(pal)
    for key in fidelity.iter_spec_keys():
        if key in set(twins) or fidelity.is_hero_or_anim(key):
            continue
        path = fidelity.spec_path(key)
        with open(path) as f:
            spec = json.load(f)
        cat = spec.get("category")
        if cat not in ("icon", "sprite", "background"):
            continue
        rows = render.to_rows(render.render_spec(os.path.abspath(path), pal))
        if cat in ("icon", "sprite") and fidelity.passes_icon_sprite(rows, pal):
            continue
        if cat == "background" and fidelity.light_delta(rows, pal) > 0 and any("use" in op for op in spec["layers"]):
            continue
        adjusted = [row[:] for row in rows]
        if cat in ("icon", "sprite"):
            h, w = len(adjusted), len(adjusted[0])
            for y in range(h):
                for x in range(w):
                    px = adjusted[y][x]
                    if px[3] == 0:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if not (0 <= nx < w and 0 <= ny < h) or adjusted[ny][nx][3] == 0:
                            adjusted[y][x] = pal["ink"] + (255,)
                            break
        def bands(pts):
            y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
            bh = y1 - y0 + 1
            top = [(x, y) for x, y in pts if y <= y0 + bh * 0.4 and y < y1 - bh * 0.4]
            bot = [(x, y) for x, y in pts if y >= y1 - bh * 0.4 and y > y0 + bh * 0.4]
            if not top or not bot:
                mid = (y0 + y1) / 2
                top = [(x, y) for x, y in pts if y < mid]
                bot = [(x, y) for x, y in pts if y > mid]
            return top, bot

        for _ in range(6):
            if fidelity.light_delta(adjusted, pal) > 0:
                break
            pts = [(x, y) for y, row in enumerate(adjusted) for x, px in enumerate(row) if px[3] and px[:3] not in ink]
            if not pts:
                break
            top, bot = bands(pts)
            top_set = set(top)
            for x, y in top + bot:
                px = adjusted[y][x]
                name = _name_of(px[:3], pal)
                if not name or name.startswith("ink"):
                    continue
                nxt = _step(name, pal, 1 if (x, y) in top_set else -1)
                if nxt:
                    adjusted[y][x] = pal[nxt] + (255,)
        # pixels already at the end of their ramp cannot step; lighten one more row from the top
        pts = [(x, y) for y, row in enumerate(adjusted) for x, px in enumerate(row) if px[3] and px[:3] not in ink]
        if pts and fidelity.light_delta(adjusted, pal) <= 0:
            y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
            light = pal["white"]
            dark = pal.get("ink.2", pal["ink"])
            for band in range(1, (y1 - y0) // 2 + 1):
                if fidelity.light_delta(adjusted, pal) > 0:
                    break
                for x, y in pts:
                    if y == y0 + band:
                        adjusted[y][x] = light + (255,)
                    elif y == y1 - band:
                        adjusted[y][x] = dark + (255,)
        # bake the adjusted picture, keep every use so a background still has one
        cells = [[_name_of(px[:3], pal) if px[3] else None for px in row] for row in adjusted]
        if any(px[3] and _name_of(px[:3], pal) is None for row in adjusted for px in row):
            raise SystemExit(f"{key} has a colour outside the palette")
        baked = fidelity.cells_to_spec(spec["name"], cat, spec["size"], cells, spec.get("_from", "catalog repair"))
        uses = [op for op in spec["layers"] if "use" in op]
        if cat == "background" and not uses:
            uses = [{"use": "../sprite/prop-planta.json", "at": [8, 148]}]
        baked["layers"].extend(uses)
        with open(path, "w") as f:
            json.dump(baked, f, indent=1)
            f.write("\n")
        # render from the real path so a `use` resolves next to the spec, not from a temp dir
        png.write(fidelity.png_path(key), render.to_rows(render.render_spec(os.path.abspath(path), pal)))
        print(f"repair {key} light {fidelity.light_delta(fidelity.read_png(key), pal):.1f}")


def main():
    dry = "--dry" in sys.argv
    if "--repair-only" in sys.argv:
        repair_catalog(render.load_palette())
        return
    rows = fidelity.sheet_rows("assests_keyart.png")
    pal = fidelity.palette()
    index, _scored = assign(rows, pal)
    missing = [k for k in TWIN_KEYS if k not in index]
    if missing:
        raise SystemExit(f"no box for {missing}")
    sizes = {k: native_size(k) for k in TWIN_KEYS}
    print(f"assigned {len(index)}")
    if dry:
        for k in TWIN_KEYS:
            print(f"{k} {index[k]}")
        return
    pal = cover_gaps(rows, pal, index, sizes)
    # cover_gaps rewrote palette.json; reload through render
    pal = render.load_palette()
    doc = {k: {"source": "assests_keyart.png", "box": index[k]} for k in TWIN_KEYS}
    with open(fidelity.INDEX, "w") as f:
        json.dump(doc, f, indent=1)
        f.write("\n")
    write_twins(rows, pal, index, sizes)
    repair_catalog(pal)


if __name__ == "__main__":
    main()
