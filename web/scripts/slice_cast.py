#!/usr/bin/env python3
"""Slice web/public/rendered sheets into transparent PNGs under web/public/cast.

The checkerboard baked into the JPEGs is not an alpha channel. Light-gray pixels
that reach the image edge are cleared, so interior whites (shoes, highlights) stay.
A strip or a row of effects is grouped by drawing, so a spark stays with the
pose it belongs to and a wide laptop is not sliced on a column line. Pillow is used to decode JPEG and write PNG; it is not a web or api dependency.
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHEETS = ROOT / "web" / "cast" / "sheets.json"
RENDERED = ROOT / "web" / "public" / "rendered"
OUT = ROOT / "web" / "public" / "cast"
MANIFEST = ROOT / "web" / "cast" / "manifest.json"

# Sum of absolute channel deltas for a flat corner (the dark slime sheet).
KEY_TOL = 48
# Edge halo only: stricter than the flood, and only with transparent neighbours.
FRINGE_TOL = 36
MIN_AREA = 24
# The baked checker is light gray, not two flat colours. JPEG swings a cell
# from about 190 to 255 while keeping it nearly neutral. A saturated pixel,
# or a dark shoe, is not the board.
CHECKER_CHROMA = 18
CHECKER_MIN = 185


class Raster:
    def __init__(self, w: int, h: int, px: bytearray | None = None):
        self.w = w
        self.h = h
        self.px = px if px is not None else bytearray(w * h * 4)

    def _i(self, x: int, y: int) -> int:
        return (y * self.w + x) * 4

    def get(self, x: int, y: int) -> tuple[int, int, int, int]:
        i = self._i(x, y)
        p = self.px
        return p[i], p[i + 1], p[i + 2], p[i + 3]

    def set(self, x: int, y: int, r: int, g: int, b: int, a: int = 255) -> None:
        if x < 0 or y < 0 or x >= self.w or y >= self.h:
            return
        i = self._i(x, y)
        self.px[i : i + 4] = bytes((r, g, b, a))

    def alpha_at(self, x: int, y: int) -> int:
        return self.px[self._i(x, y) + 3]

    def blit(self, src: Raster, ox: int, oy: int) -> None:
        for y in range(src.h):
            for x in range(src.w):
                r, g, b, a = src.get(x, y)
                if a:
                    self.set(ox + x, oy + y, r, g, b, a)

    def crop(self, x0: int, y0: int, w: int, h: int) -> Raster:
        out = Raster(w, h)
        for y in range(h):
            for x in range(w):
                out.set(x, y, *self.get(x0 + x, y0 + y))
        return out


def _dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def _near(rgb: tuple[int, int, int], keys: list[tuple[int, int, int]], tol: int) -> bool:
    return any(_dist(rgb, k) <= tol for k in keys)


def is_light_checker(rgb: tuple[int, int, int]) -> bool:
    """Nearly neutral and bright: the JPEG checker, not the sprite."""
    r, g, b = rgb
    return max(r, g, b) - min(r, g, b) <= CHECKER_CHROMA and min(r, g, b) >= CHECKER_MIN


def corner_key(im: Raster) -> list[tuple[int, int, int]]:
    r, g, b, _ = im.get(0, 0)
    return [(r, g, b)]


def knock_out(im: Raster, keys: list[tuple[int, int, int]], *, checker: bool = False) -> None:
    """Clear background pixels that reach the border, then a short fringe.

    `checker` matches the whole light-gray ramp. Otherwise `keys` is a flat
    corner colour within KEY_TOL. Interior whites stay when they do not touch
    that background.
    """
    w, h = im.w, im.h
    px = im.px

    def matches(i: int) -> bool:
        if px[i + 3] == 0:
            return False
        rgb = (px[i], px[i + 1], px[i + 2])
        if checker:
            return is_light_checker(rgb)
        return _near(rgb, keys, KEY_TOL)

    clear = bytearray(w * h)
    q: deque[int] = deque()
    for x in range(w):
        q.append(x * 4)
        q.append(((h - 1) * w + x) * 4)
    for y in range(h):
        q.append((y * w) * 4)
        q.append((y * w + w - 1) * 4)
    while q:
        i = q.popleft()
        p = i // 4
        if clear[p] or not matches(i):
            continue
        clear[p] = 1
        x, y = p % w, p // w
        if x > 0:
            q.append(i - 4)
        if x + 1 < w:
            q.append(i + 4)
        if y > 0:
            q.append(i - w * 4)
        if y + 1 < h:
            q.append(i + w * 4)
    for i, bit in enumerate(clear):
        if bit:
            px[i * 4 + 3] = 0
    for _ in range(2):
        kill: list[int] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = im.get(x, y)
                if not a:
                    continue
                rgb = (r, g, b)
                if checker:
                    if not is_light_checker(rgb):
                        continue
                elif not _near(rgb, keys, FRINGE_TOL):
                    continue
                trans = 0
                for ny in range(y - 1, y + 2):
                    for nx in range(x - 1, x + 2):
                        if nx == x and ny == y:
                            continue
                        if nx < 0 or ny < 0 or nx >= w or ny >= h or im.alpha_at(nx, ny) == 0:
                            trans += 1
                if trans >= 3:
                    kill.append(im._i(x, y) + 3)
        for i in kill:
            im.px[i] = 0


def components(im: Raster) -> list[tuple[int, int, int, int, int]]:
    """Opaque 8-connected boxes as (x, y, w, h, area), largest first, specks dropped."""
    w, h = im.w, im.h
    seen = bytearray(w * h)
    found: list[tuple[int, int, int, int, int]] = []
    for start in range(w * h):
        if seen[start] or im.px[start * 4 + 3] == 0:
            continue
        q = deque([start])
        seen[start] = 1
        minx = miny = 10**9
        maxx = maxy = -1
        area = 0
        while q:
            i = q.popleft()
            x, y = i % w, i // w
            area += 1
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
            for ny in range(y - 1, y + 2):
                for nx in range(x - 1, x + 2):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if seen[j] or im.px[j * 4 + 3] == 0:
                        continue
                    seen[j] = 1
                    q.append(j)
        if area >= MIN_AREA:
            found.append((minx, miny, maxx - minx + 1, maxy - miny + 1, area))
    found.sort(key=lambda b: b[4], reverse=True)
    return found


def _keep_largest(im: Raster) -> None:
    """Drop every component but the biggest, including ones inside its box."""
    w, h = im.w, im.h
    px = im.px
    seen = bytearray(w * h)
    best = bytearray(w * h)
    best_area = 0
    for start in range(w * h):
        if seen[start] or px[start * 4 + 3] == 0:
            continue
        q: deque[int] = deque([start])
        seen[start] = 1
        mark = bytearray(w * h)
        mark[start] = 1
        area = 0
        while q:
            i = q.popleft()
            area += 1
            x, y = i % w, i // w
            for ny in range(y - 1, y + 2):
                for nx in range(x - 1, x + 2):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if seen[j] or px[j * 4 + 3] == 0:
                        continue
                    seen[j] = 1
                    mark[j] = 1
                    q.append(j)
        if area >= MIN_AREA and area > best_area:
            best = mark
            best_area = area
    if best_area == 0:
        return
    for i in range(w * h):
        if not best[i]:
            px[i * 4 + 3] = 0


def _is_label(box: tuple[int, int, int, int, int], largest: tuple[int, int, int, int, int]) -> bool:
    """A caption sits under the main figure: short, wide, and below it."""
    _, y, bw, bh, _ = box
    _, ly, _, lh, _ = largest
    return bh < lh * 0.4 and bw > bh * 1.4 and y > ly + lh * 0.55


def pack_strip(frames: list[Raster], align: str) -> tuple[Raster, int, int]:
    cell_w = max(f.w for f in frames)
    cell_h = max(f.h for f in frames)
    out = Raster(cell_w * len(frames), cell_h)
    for i, frame in enumerate(frames):
        ox = i * cell_w + (cell_w - frame.w) // 2
        oy = cell_h - frame.h if align == "bottom" else (cell_h - frame.h) // 2
        out.blit(frame, ox, oy)
    return out, cell_w, cell_h


def _crop_box(im: Raster, box: tuple[int, int, int, int, int], pad: int = 1) -> Raster:
    x, y, bw, bh, _ = box
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(im.w, x + bw + pad)
    y1 = min(im.h, y + bh + pad)
    return im.crop(x0, y0, x1 - x0, y1 - y0)


def _opaque_box(im: Raster) -> tuple[int, int, int, int] | None:
    minx = miny = 10**9
    maxx = maxy = -1
    w = im.w
    px = im.px
    for y in range(im.h):
        row = y * w * 4
        for x in range(w):
            if px[row + x * 4 + 3] == 0:
                continue
            if x < minx:
                minx = x
            if x > maxx:
                maxx = x
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y
    if maxx < 0:
        return None
    return minx, miny, maxx - minx + 1, maxy - miny + 1


def _component_pixels(im: Raster, min_area: int = MIN_AREA) -> list[tuple[tuple[int, int, int, int, int], list[int]]]:
    """Opaque 8-connected pieces as (box, pixel indices), largest first."""
    w, h = im.w, im.h
    px = im.px
    seen = bytearray(w * h)
    found: list[tuple[tuple[int, int, int, int, int], list[int]]] = []
    for start in range(w * h):
        if seen[start] or px[start * 4 + 3] == 0:
            continue
        q: deque[int] = deque([start])
        seen[start] = 1
        pixels = [start]
        minx = maxx = start % w
        miny = maxy = start // w
        while q:
            i = q.popleft()
            x, y = i % w, i // w
            for ny in range(y - 1, y + 2):
                for nx in range(x - 1, x + 2):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if seen[j] or px[j * 4 + 3] == 0:
                        continue
                    seen[j] = 1
                    pixels.append(j)
                    q.append(j)
                    if nx < minx:
                        minx = nx
                    if nx > maxx:
                        maxx = nx
                    if ny < miny:
                        miny = ny
                    if ny > maxy:
                        maxy = ny
        if len(pixels) >= min_area:
            box = (minx, miny, maxx - minx + 1, maxy - miny + 1, len(pixels))
            found.append((box, pixels))
    found.sort(key=lambda item: item[0][4], reverse=True)
    return found


def _raster_from_pixels(im: Raster, groups: list[list[int]]) -> Raster:
    w = im.w
    xs: list[int] = []
    ys: list[int] = []
    for pixels in groups:
        for i in pixels:
            xs.append(i % w)
            ys.append(i // w)
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    out = Raster(x1 - x0 + 1, y1 - y0 + 1)
    px = im.px
    for pixels in groups:
        for i in pixels:
            x, y = i % w, i // w
            src = i * 4
            out.set(x - x0, y - y0, px[src], px[src + 1], px[src + 2], px[src + 3])
    return out


def _row_frames(im: Raster, n: int, drop_labels: bool) -> list[Raster]:
    """Group every piece with the nearest of the n largest drawings.

    A vertical cut slices a laptop that crosses the next pose. Pieces stay whole
    and follow the drawing whose centre is closest.
    """
    parts = _component_pixels(im, min_area=8)
    if len(parts) < n:
        raise ValueError(f"expected {n} drawings, found {len(parts)}")
    seeds = sorted(parts[:n], key=lambda item: item[0][0] + item[0][2] / 2)
    seed_x = [box[0] + box[2] / 2 for box, _ in seeds]
    groups: list[list[tuple[tuple[int, int, int, int, int], list[int]]]] = [[] for _ in range(n)]
    for part in parts:
        cx = part[0][0] + part[0][2] / 2
        groups[min(range(n), key=lambda i: abs(cx - seed_x[i]))].append(part)
    frames: list[Raster] = []
    for group in groups:
        if drop_labels and len(group) >= 2:
            largest = max(group, key=lambda item: item[0][4])
            group = [item for item in group if item is largest or not _is_label(item[0], largest[0])]
        if not group:
            raise ValueError("empty frame")
        frames.append(_raster_from_pixels(im, [pixels for _, pixels in group]))
    return frames


def _sever_glitch(im: Raster) -> None:
    """Clear thin cyan and hot-red dashes so a corner panel does not join the figure."""
    w, h = im.w, im.h
    px = im.px
    kill: list[int] = []
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 4
            if px[i + 3] == 0:
                continue
            r, g, b = px[i], px[i + 1], px[i + 2]
            cyan = g > 140 and b > 140 and r < 90 and g > r + 50
            hot = r > 170 and g < 100 and b < 150 and r > g + 70
            if not (cyan or hot):
                continue
            trans = 0
            for ny in range(y - 1, y + 2):
                for nx in range(x - 1, x + 2):
                    if nx == x and ny == y:
                        continue
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or px[(ny * w + nx) * 4 + 3] == 0:
                        trans += 1
            if trans >= 3:
                kill.append(i + 3)
    for i in kill:
        px[i] = 0


def slice_sheet(im: Raster, sheet: dict) -> list[dict]:
    """Return manifest rows for one sheet. Mutates a copy, not `im`."""
    work = Raster(im.w, im.h, bytearray(im.px))
    key = sheet.get("key", "checker")
    if key == "checker":
        knock_out(work, [], checker=True)
    elif key == "corner":
        knock_out(work, corner_key(work))
    elif key != "none":
        raise ValueError(f"unknown key {key}")

    ids: list[str] = sheet["ids"]
    mode = sheet["mode"]
    if mode == "plate" or (mode == "still" and sheet.get("pick") != "largest" and key == "none"):
        return [_row(ids[0], work, 1, work.w, work.h, sheet["file"])]

    if mode in ("strip", "variants"):
        # `drawings` is the count on the sheet when `ids` keeps only some of them.
        n = 4 if mode == "strip" else int(sheet.get("drawings", len(ids)))
        try:
            frames = _row_frames(work, n, sheet.get("drop") == "labels")
        except ValueError as exc:
            raise ValueError(f"{sheet['file']}: {exc}") from None
        if mode == "strip":
            if len(frames) != 4:
                raise ValueError(f"{sheet['file']}: strip needs 4 drawings, found {len(frames)}")
            packed, cell_w, cell_h = pack_strip(frames, sheet.get("align", "bottom"))
            return [_row(ids[0], packed, n, cell_w, cell_h, sheet["file"])]
        indices = sheet.get("indices")
        if indices is not None:
            frames = [frames[i] for i in indices]
        if len(frames) != len(ids):
            raise ValueError(f"{sheet['file']}: {len(frames)} frames for {len(ids)} ids")
        return [
            _row(bid, frame, 1, frame.w, frame.h, sheet["file"])
            for bid, frame in zip(ids, frames)
        ]

    if mode != "still":
        raise ValueError(f"unknown mode {mode}")

    if sheet.get("pick") == "largest":
        _sever_glitch(work)
        _keep_largest(work)
        box = _opaque_box(work)
        if box is None:
            raise ValueError(f"{sheet['file']}: nothing opaque left")
        frame = _crop_box(work, (*box, 0))
        return [_row(ids[0], frame, 1, frame.w, frame.h, sheet["file"])]

    boxes = components(work)
    if not boxes:
        raise ValueError(f"{sheet['file']}: nothing opaque left")
    if len(boxes) == 1:
        frame = _crop_box(work, boxes[0])
    else:
        x0 = min(b[0] for b in boxes)
        y0 = min(b[1] for b in boxes)
        x1 = max(b[0] + b[2] for b in boxes)
        y1 = max(b[1] + b[3] for b in boxes)
        frame = work.crop(x0, y0, x1 - x0, y1 - y0)
    return [_row(ids[0], frame, 1, frame.w, frame.h, sheet["file"])]


def _row(id_: str, image: Raster, frames: int, cell_w: int, cell_h: int, source: str) -> dict:
    return {
        "id": id_,
        "src": f"/cast/{id_}.png",
        "w": image.w,
        "h": image.h,
        "frames": frames,
        "cellW": cell_w,
        "cellH": cell_h,
        "source": source,
        "_image": image,
    }


def save_png(image: Raster, path: Path) -> None:
    from PIL import Image

    Image.frombytes("RGBA", (image.w, image.h), bytes(image.px)).save(path, "PNG")


def write_manifest(rows: list[dict], path: Path = MANIFEST) -> None:
    items = [{k: v for k, v in row.items() if k != "_image"} for row in rows]
    items.sort(key=lambda r: r["id"])
    path.write_text(json.dumps({"items": items}, indent=2) + "\n")


def load_raster(path: Path) -> Raster:
    from PIL import Image

    im = Image.open(path).convert("RGBA")
    return Raster(im.width, im.height, bytearray(im.tobytes()))


def slice_all(spec: dict, rendered: Path = RENDERED) -> list[dict]:
    rows: list[dict] = []
    missing: list[str] = []
    for sheet in spec["sheets"]:
        path = rendered / sheet["file"]
        if not path.exists():
            missing.append(sheet["file"])
            continue
        rows.extend(slice_sheet(load_raster(path), sheet))
    if missing:
        raise FileNotFoundError("missing rendered sheets: " + ", ".join(missing))
    return rows


def emit(rows: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for row in rows:
        save_png(row["_image"], OUT / f"{row['id']}.png")
    write_manifest(rows)


def main() -> int:
    spec = json.loads(SHEETS.read_text())
    try:
        rows = slice_all(spec)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1
    emit(rows)
    print(f"cast {len(rows)} -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
