#!/usr/bin/env python3
"""Slice web/public/rendered sheets into transparent PNGs under web/public/cast.

The checkerboard baked into the JPEGs is not an alpha channel. Background pixels
are removed only when they match the sheet key and connect to the image edge, so
interior whites (shoes, highlights) stay. Pillow is used to decode JPEG and write
PNG; it is not a web or api dependency.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHEETS = ROOT / "web" / "cast" / "sheets.json"
RENDERED = ROOT / "web" / "public" / "rendered"
OUT = ROOT / "web" / "public" / "cast"
MANIFEST = ROOT / "web" / "cast" / "manifest.json"

# Sum of absolute channel deltas. Checker JPEG noise sits well under this;
# a saturated sprite pixel does not.
KEY_TOL = 48
# Edge halo only: stricter than the flood, and only with transparent neighbours.
FRINGE_TOL = 36
MIN_AREA = 24


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


def _quant(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    return tuple((c // 8) * 8 for c in rgb)  # type: ignore[return-value]


def checker_keys(im: Raster) -> list[tuple[int, int, int]]:
    """Two colours that dominate the border (the baked checker, or a flat corner)."""
    counts: Counter[tuple[int, int, int]] = Counter()
    w, h = im.w, im.h
    pts = []
    for x in range(0, w, max(1, w // 32)):
        pts.append((x, 0))
        pts.append((x, h - 1))
    for y in range(0, h, max(1, h // 32)):
        pts.append((0, y))
        pts.append((w - 1, y))
    for x, y in pts:
        r, g, b, a = im.get(x, y)
        if a:
            counts[_quant((r, g, b))] += 1
    if not counts:
        return [(0, 0, 0)]
    return [rgb for rgb, _ in counts.most_common(2)]


def corner_key(im: Raster) -> list[tuple[int, int, int]]:
    r, g, b, _ = im.get(0, 0)
    return [(r, g, b)]


def knock_out(im: Raster, keys: list[tuple[int, int, int]]) -> None:
    """Clear key-coloured pixels that reach the border, then a short fringe."""
    w, h = im.w, im.h
    clear = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if clear[i]:
            continue
        r, g, b, a = im.get(x, y)
        if not a or not _near((r, g, b), keys, KEY_TOL):
            continue
        clear[i] = 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                q.append((nx, ny))
    for i, bit in enumerate(clear):
        if bit:
            im.px[i * 4 + 3] = 0
    for _ in range(2):
        kill: list[int] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = im.get(x, y)
                if not a or not _near((r, g, b), keys, FRINGE_TOL):
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


def _median(nums: list[int]) -> float:
    s = sorted(nums)
    n = len(s)
    if n == 0:
        return 0
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def _is_label(box: tuple[int, int, int, int, int], median_h: float) -> bool:
    _, _, bw, bh, _ = box
    return bh < median_h * 0.45 and bw > bh * 1.4


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


def slice_sheet(im: Raster, sheet: dict) -> list[dict]:
    """Return manifest rows for one sheet. Mutates a copy, not `im`."""
    work = Raster(im.w, im.h, bytearray(im.px))
    key = sheet.get("key", "checker")
    if key == "checker":
        knock_out(work, checker_keys(work))
    elif key == "corner":
        knock_out(work, corner_key(work))
    elif key != "none":
        raise ValueError(f"unknown key {key}")

    ids: list[str] = sheet["ids"]
    mode = sheet["mode"]
    if mode == "plate" or (mode == "still" and sheet.get("pick") != "largest" and key == "none"):
        return [_row(ids[0], work, 1, work.w, work.h, sheet["file"])]

    boxes = components(work)
    if not boxes and mode == "plate":
        return [_row(ids[0], work, 1, work.w, work.h, sheet["file"])]
    if sheet.get("drop") == "labels" and boxes:
        median_h = _median([b[3] for b in boxes])
        boxes = [b for b in boxes if not _is_label(b, median_h)]
    if sheet.get("pick") == "largest":
        boxes = boxes[:1]
    boxes.sort(key=lambda b: b[0] + b[2] / 2)

    if mode == "still":
        if not boxes:
            raise ValueError(f"{sheet['file']}: nothing opaque left")
        if len(boxes) == 1 or sheet.get("pick") == "largest":
            frame = _crop_box(work, boxes[0])
        else:
            x0 = min(b[0] for b in boxes)
            y0 = min(b[1] for b in boxes)
            x1 = max(b[0] + b[2] for b in boxes)
            y1 = max(b[1] + b[3] for b in boxes)
            frame = work.crop(x0, y0, x1 - x0, y1 - y0)
        return [_row(ids[0], frame, 1, frame.w, frame.h, sheet["file"])]

    if mode == "strip":
        if len(boxes) != 4:
            raise ValueError(f"{sheet['file']}: expected 4 frames, found {len(boxes)}")
        frames = [_crop_box(work, b, pad=0) for b in boxes]
        packed, cell_w, cell_h = pack_strip(frames, sheet.get("align", "bottom"))
        return [_row(ids[0], packed, 4, cell_w, cell_h, sheet["file"])]

    if mode == "variants":
        if len(boxes) != len(ids):
            raise ValueError(f"{sheet['file']}: expected {len(ids)} parts, found {len(boxes)}")
        rows = []
        for bid, box in zip(ids, boxes):
            frame = _crop_box(work, box)
            rows.append(_row(bid, frame, 1, frame.w, frame.h, sheet["file"]))
        return rows

    raise ValueError(f"unknown mode {mode}")


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
