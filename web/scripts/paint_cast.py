#!/usr/bin/env python3
"""Paint the cast catalog when web/public/rendered/*.jpg is not in the tree.

`slice_cast.py` replaces every PNG from the real sheets. These drawings keep the
same ids, strip layout and manifest so the game can address them until then.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from slice_cast import Raster, _row, emit, pack_strip  # noqa: E402

SCALE = 4
SKIN = (236, 196, 154)
SKIN_DARK = (196, 142, 102)
HAIR_M = (28, 30, 38)
HAIR_F = (122, 72, 40)
HOOD = (46, 52, 74)
HOOD_DARK = (28, 32, 48)
CODE = (64, 220, 120)
JEAN = (52, 92, 186)
JEAN_DARK = (32, 58, 128)
SHOE = (240, 240, 246)
SHOE_DARK = (36, 38, 48)
EDGE = (16, 16, 22)


def ellipse(im: Raster, cx: float, cy: float, rx: float, ry: float, rgb: tuple[int, int, int]) -> None:
    if rx <= 0 or ry <= 0:
        return
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                im.set(x, y, *rgb)


def rect(im: Raster, x: int, y: int, w: int, h: int, rgb: tuple[int, int, int]) -> None:
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            im.set(xx, yy, *rgb)


def blob(im: Raster, cx: float, cy: float, rx: float, ry: float, fill: tuple[int, int, int], edge: tuple[int, int, int] = EDGE) -> None:
    ellipse(im, cx, cy, rx + 1, ry + 1, edge)
    ellipse(im, cx, cy, rx, ry, fill)


def up(im: Raster, scale: int = SCALE) -> Raster:
    out = Raster(im.w * scale, im.h * scale)
    for y in range(im.h):
        for x in range(im.w):
            r, g, b, a = im.get(x, y)
            if not a:
                continue
            for dy in range(scale):
                for dx in range(scale):
                    out.set(x * scale + dx, y * scale + dy, r, g, b, a)
    return out


def still(id_: str, image: Raster) -> dict:
    image = up(image)
    return _row(id_, image, 1, image.w, image.h, "stand-in")


def strip(id_: str, frames: list[Raster], align: str) -> dict:
    packed, cell_w, cell_h = pack_strip([up(f) for f in frames], align)
    return _row(id_, packed, 4, cell_w, cell_h, "stand-in")


def laptop(im: Raster, x: int, y: int, open_: bool) -> None:
    if open_:
        rect(im, x, y, 16, 11, (24, 26, 32))
        rect(im, x + 1, y + 1, 14, 8, (70, 76, 88))
        rect(im, x + 2, y + 2, 12, 6, (18, 24, 32))
        rect(im, x + 3, y + 4, 2, 2, CODE)
        rect(im, x + 6, y + 4, 5, 2, CODE)
        rect(im, x, y + 9, 16, 3, (48, 52, 62))
    else:
        rect(im, x, y, 12, 9, (24, 26, 32))
        rect(im, x + 1, y + 1, 10, 7, (58, 64, 76))
        rect(im, x + 3, y + 3, 4, 3, CODE)


def hero(frame: int, action: str, female: bool) -> Raster:
    im = Raster(56, 72)
    bob = 0
    lean = 0
    if action in ("walk", "run"):
        bob = [0, 1, 0, 1][frame]
    if action == "run":
        lean = 2
    if action == "crouch":
        bob = [8, 4, 0, 6][frame]
    y = bob
    hair = HAIR_F if female else HAIR_M
    # Torso sits behind the legs so a stride stays readable.
    blob(im, 28 + lean, 40 + y, 12, 12, HOOD, HOOD_DARK)
    rect(im, 22 + lean, 34 + y, 6, 3, (220, 220, 226))
    rect(im, 24 + lean, 38 + y, 3, 4, CODE)
    rect(im, 28 + lean, 38 + y, 2, 4, CODE)
    if action == "idle":
        steps = [(0, 0), (7, 0)]
    elif action == "walk":
        cycle = [(-5, 0), (0, -1), (5, 0), (0, 1)]
        steps = [cycle[frame], cycle[(frame + 2) % 4]]
    elif action == "run":
        cycle = [(-8, -1), (-2, -3), (9, 0), (3, 1)]
        steps = [cycle[frame], cycle[(frame + 2) % 4]]
    elif action == "crouch":
        steps = [(2, 4), (8, 4)]
    else:
        steps = [(1, 1), (8, 0)]
    for ox, oy in steps:
        rect(im, 20 + lean + ox, 46 + y + oy, 6, 16 - (4 if action == "crouch" else 0), JEAN_DARK)
        rect(im, 21 + lean + ox, 46 + y + oy, 4, 14 - (4 if action == "crouch" else 0), JEAN)
        rect(im, 19 + lean + ox, 58 + y + oy - (2 if action == "crouch" else 0), 8, 4, SHOE_DARK)
        rect(im, 20 + lean + ox, 58 + y + oy - (2 if action == "crouch" else 0), 6, 3, SHOE)
    # Head.
    blob(im, 30 + lean, 20 + y, 9, 9, SKIN, SKIN_DARK)
    ellipse(im, 30 + lean, 16 + y, 10, 7, hair)
    if female:
        ellipse(im, 16 + lean, 22 + y, 5, 8, hair)
        ellipse(im, 14 + lean, 30 + y, 3, 5, hair)
    else:
        ellipse(im, 22 + lean, 12 + y, 3, 3, hair)
        ellipse(im, 34 + lean, 11 + y, 3, 4, hair)
    # Eye and mouth, facing right.
    im.set(35 + lean, 20 + y, 20, 24, 28)
    im.set(36 + lean, 20 + y, 20, 24, 28)
    im.set(36 + lean, 23 + y, 160, 70, 70)
    # Arms and laptop.
    if action == "attack":
        arm = [(8, 8), (4, -2), (18, -4), (26, 2)][frame]
        rect(im, 30 + lean, 36 + y, 8, 4, HOOD)
        laptop(im, 28 + arm[0], 30 + y + arm[1], open_=frame >= 2)
        if frame == 2:
            # Swing trail.
            for i, col in enumerate(((220, 230, 240), (180, 190, 200), (140, 150, 160))):
                rect(im, 46 + i * 2, 28 + y, 2, 10 - i * 2, col)
    elif action == "crouch" and frame in (0, 3):
        rect(im, 34 + lean, 40 + y, 8, 4, HOOD)
        laptop(im, 36, 44 + y, open_=True)
    elif action == "crouch":
        rect(im, 34 + lean, 36 + y, 8, 4, HOOD)
        laptop(im, 34, 28 + y - (4 if frame == 2 else 0), open_=True)
    elif female and action in ("idle", "walk", "run"):
        rect(im, 34 + lean, 36 + y, 6, 4, SKIN)
        laptop(im, 36 + lean, 32 + y, open_=True)
    else:
        rect(im, 14 + lean, 38 + y, 8, 4, HOOD)
        laptop(im, 6 + lean, 36 + y, open_=False)
        rect(im, 36 + lean, 40 + y, 6, 4, SKIN)
    return im


def slime(color: tuple[int, int, int], dark: tuple[int, int, int], tail: bool) -> Raster:
    im = Raster(48, 40)
    blob(im, 22, 20, 16, 13, color, dark)
    if tail:
        ellipse(im, 36, 26, 5, 4, dark)
        ellipse(im, 38, 28, 3, 3, color)
    ellipse(im, 16, 14, 6, 3, (255, 255, 255))
    im.set(16, 14, 255, 255, 255)
    for dx in (0, 1):
        im.set(16 + dx, 20, 16, 16, 20)
        im.set(26 + dx, 20, 16, 16, 20)
        im.set(16 + dx, 19, 255, 255, 255)
        im.set(26 + dx, 19, 255, 255, 255)
    for dx in range(6):
        im.set(18 + dx, 26, 16, 16, 20)
    return im


def boss() -> Raster:
    im = Raster(56, 80)
    blob(im, 28, 48, 20, 26, (36, 18, 58), (16, 8, 28))
    ellipse(im, 28, 22, 12, 10, (24, 12, 40))
    ellipse(im, 28, 24, 8, 8, (8, 4, 16))
    im.set(23, 22, 255, 40, 48)
    im.set(24, 22, 255, 80, 70)
    im.set(32, 22, 255, 40, 48)
    im.set(33, 22, 255, 80, 70)
    ellipse(im, 28, 48, 8, 8, (120, 16, 32))
    ellipse(im, 28, 48, 5, 5, (255, 48, 56))
    ellipse(im, 28, 48, 2, 2, (255, 220, 180))
    for i in range(6):
        rect(im, 12 + i * 5, 68, 3, 8, (48, 12, 32))
    return im


def spider() -> Raster:
    im = Raster(64, 56)
    for side, dx in ((-1, 0), (1, 0)):
        for i, yy in enumerate((18, 28, 38)):
            rect(im, 30 + side * (8 + i), yy, 14, 3, (120, 50, 180))
    blob(im, 32, 26, 14, 16, (48, 52, 68), (20, 22, 32))
    ellipse(im, 26, 24, 4, 4, (80, 220, 255))
    ellipse(im, 38, 24, 4, 4, (80, 220, 255))
    rect(im, 31, 8, 2, 8, (40, 44, 56))
    im.set(31, 7, 80, 220, 255)
    return im


def cat() -> Raster:
    im = Raster(40, 40)
    blob(im, 20, 24, 12, 10, (24, 24, 28), (8, 8, 10))
    ellipse(im, 12, 12, 4, 5, (24, 24, 28))
    ellipse(im, 28, 12, 4, 5, (24, 24, 28))
    ellipse(im, 16, 24, 3, 4, (250, 250, 252))
    ellipse(im, 26, 24, 3, 4, (250, 250, 252))
    im.set(16, 24, 16, 16, 20)
    im.set(26, 24, 16, 16, 20)
    im.set(21, 28, 240, 180, 180)
    rect(im, 14, 32, 12, 4, (250, 250, 252))
    return im


def snake() -> Raster:
    im = Raster(48, 48)
    ellipse(im, 26, 30, 14, 10, (24, 70, 170))
    ellipse(im, 26, 30, 8, 5, (240, 200, 40))
    ellipse(im, 16, 16, 8, 7, (24, 70, 170))
    ellipse(im, 14, 16, 5, 5, (240, 200, 40))
    im.set(12, 15, 16, 16, 20)
    im.set(13, 15, 16, 16, 20)
    return im


def slash() -> Raster:
    im = Raster(64, 64)
    for i in range(28):
        x, y = 8 + i, 50 - i
        rect(im, x, y, 4, 3, (255, 80 + i * 4, 30))
        if i % 3 == 0:
            im.set(x - 2, y + 3, 255, 40, 20)
    return im


def arc() -> Raster:
    im = Raster(64, 64)
    for i in range(24):
        x = 10 + i
        y = 40 - int((i - 12) ** 2 / 8)
        rect(im, x, y, 3, 6, (255, 120, 30))
    return im


def burst(core: tuple[int, int, int], mid: tuple[int, int, int], bits: tuple[int, int, int]) -> Raster:
    im = Raster(64, 64)
    blob(im, 32, 32, 16, 16, mid, bits)
    blob(im, 32, 32, 8, 8, core, mid)
    for ox, oy in ((0, -22), (16, -14), (22, 4), (12, 18), (-4, 22), (-18, 12), (-22, -4), (-14, -16)):
        rect(im, 32 + ox, 32 + oy, 3, 3, bits)
    return im


def code_burst() -> Raster:
    im = burst((255, 220, 80), (220, 40, 30), (120, 16, 16))
    rect(im, 24, 28, 4, 2, (255, 240, 160))
    rect(im, 30, 28, 2, 6, (255, 240, 160))
    rect(im, 34, 28, 4, 2, (255, 240, 160))
    return im


def bolt() -> Raster:
    im = Raster(64, 64)
    pts = [(32, 6), (24, 28), (34, 28), (22, 58), (40, 30), (30, 30), (42, 8)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for s in range(steps + 1):
            x = x0 + (x1 - x0) * s // steps
            y = y0 + (y1 - y0) * s // steps
            rect(im, x, y, 3, 3, (255, 230, 80))
    return im


def element(kind: str) -> Raster:
    im = Raster(64, 64)
    if kind == "fire":
        blob(im, 32, 40, 16, 8, (80, 30, 16))
        blob(im, 32, 28, 12, 16, (255, 90, 20), (160, 30, 10))
        blob(im, 32, 24, 6, 10, (255, 220, 80), (255, 140, 20))
    elif kind == "ice":
        blob(im, 32, 34, 14, 16, (80, 190, 255), (20, 80, 180))
        for ang in range(0, 8):
            rect(im, 30, 10 + ang * 3, 4, 3, (220, 245, 255))
    elif kind == "earth":
        blob(im, 32, 40, 18, 8, (90, 60, 30))
        for ox in (-8, 0, 8, 14, -14):
            ellipse(im, 32 + ox, 28 + abs(ox) // 4, 4, 3, (120, 80, 40))
    return im


def shield(crowned: bool) -> Raster:
    im = Raster(64, 64)
    blob(im, 32, 36, 16, 18, (80, 170, 60) if crowned else (230, 190, 60), (40, 90, 30) if crowned else (140, 90, 20))
    rect(im, 30, 24, 4, 18, (255, 230, 120))
    rect(im, 24, 30, 16, 4, (255, 230, 120))
    if crowned:
        ellipse(im, 32, 12, 6, 4, (255, 200, 40))
        rect(im, 30, 8, 4, 4, (255, 220, 80))
    return im


def heal(crowned: bool) -> Raster:
    im = Raster(64, 64)
    blob(im, 32, 40, 10, 14, (80, 220, 90), (20, 120, 40))
    rect(im, 28, 18, 8, 28, (255, 220, 60))
    rect(im, 20, 26, 24, 8, (255, 220, 60))
    if crowned:
        ellipse(im, 32, 10, 6, 4, (255, 200, 40))
    return im


def crit() -> Raster:
    im = Raster(64, 64)
    blob(im, 32, 34, 8, 18, (180, 60, 255), (80, 20, 140))
    blob(im, 32, 34, 18, 6, (180, 60, 255), (80, 20, 140))
    ellipse(im, 32, 34, 4, 4, (255, 240, 255))
    return im


def glitch() -> Raster:
    im = Raster(64, 64)
    for i, col in enumerate(((40, 0, 60), (120, 0, 180), (180, 40, 255), (0, 200, 220))):
        rect(im, 14, 12 + i * 10, 36 - (i % 3) * 6, 6, col)
    return im


def stealth() -> Raster:
    im = Raster(64, 64)
    blob(im, 28, 36, 12, 16, (40, 16, 70))
    ellipse(im, 24, 28, 6, 5, (20, 8, 36))
    im.set(22, 28, 200, 80, 255)
    rect(im, 34, 40, 10, 2, (180, 80, 255))
    return im


def teleport() -> Raster:
    im = Raster(64, 64)
    blob(im, 32, 36, 14, 16, (90, 20, 160))
    for i in range(8):
        ellipse(im, 32, 44 - i, 12 - i, 3, (180, 80, 255))
    return im


def vortex(frame: int, turn: float = 0) -> Raster:
    im = Raster(64, 64)
    phase = frame * math.pi / 2 + turn
    for y in range(64):
        for x in range(64):
            dx, dy = x - 32, y - 32
            r = math.hypot(dx, dy)
            if r < 4 or r > 28:
                continue
            a = math.atan2(dy, dx)
            band = abs(math.sin(a * 3 - r * 0.35 + phase))
            if band > 0.55:
                shade = int(80 + 160 * (1 - r / 28))
                im.set(x, y, 40, shade, 255)
            if 8 < r < 26 and abs(math.sin(a * 2 + phase)) > 0.92:
                im.set(x, y, 180, 230, 255)
    # Orbiting cubes.
    for i in range(5):
        ang = phase + i * 1.2
        cx = int(32 + math.cos(ang) * (14 + (i % 3) * 4))
        cy = int(32 + math.sin(ang) * (14 + (i % 3) * 4))
        rect(im, cx - 2, cy - 2, 5, 5, (20, 40, 120))
        rect(im, cx - 1, cy - 1, 3, 3, (80, 160, 255))
    return im


def meadow() -> Raster:
    im = Raster(96, 64)
    rect(im, 0, 0, 96, 36, (70, 150, 230))
    rect(im, 0, 36, 96, 28, (70, 170, 60))
    ellipse(im, 16, 12, 5, 5, (255, 220, 60))
    ellipse(im, 70, 16, 10, 6, (245, 248, 255))
    ellipse(im, 20, 40, 8, 10, (30, 120, 40))
    ellipse(im, 78, 42, 8, 10, (30, 120, 40))
    hero_small = hero(0, "idle", False)
    im.blit(hero_small, 24, 8)
    return im


def panic_plate() -> Raster:
    im = Raster(72, 96)
    rect(im, 0, 0, 72, 96, (8, 6, 16))
    fig = boss()
    im.blit(fig, 8, 8)
    for x, y in ((4, 4), (40, 8), (4, 70), (40, 74)):
        rect(im, x, y, 26, 14, (16, 40, 48))
        rect(im, x + 2, y + 3, 18, 2, (255, 60, 70))
        rect(im, x + 2, y + 7, 12, 2, (80, 220, 200))
    return im


def build() -> list[dict]:
    rows: list[dict] = []
    for female, prefix in ((False, "hero-m"), (True, "hero-f")):
        rows.append(still(f"{prefix}-idle", hero(0, "idle", female)))
        rows.append(strip(f"{prefix}-walk", [hero(i, "walk", female) for i in range(4)], "bottom"))
        rows.append(strip(f"{prefix}-run", [hero(i, "run", female) for i in range(4)], "bottom"))
        rows.append(strip(f"{prefix}-attack", [hero(i, "attack", female) for i in range(4)], "bottom"))
    rows.append(strip("hero-m-crouch", [hero(i, "crouch", False) for i in range(4)], "bottom"))
    rows.append(still("enemy-slime", slime((170, 90, 220), (90, 30, 140), False)))
    rows.append(still("enemy-slime-verde", slime((80, 200, 70), (20, 110, 30), True)))
    rows.append(still("enemy-slime-dark", slime((150, 70, 210), (70, 20, 120), False)))
    rows.append(still("enemy-spider", spider()))
    rows.append(still("enemy-cat", cat()))
    rows.append(still("enemy-snake", snake()))
    rows.append(still("enemy-boss-nuvem", boss()))
    rows.append(still("fx-fire", element("fire")))
    rows.append(still("fx-ice", element("ice")))
    rows.append(still("fx-bolt", bolt()))
    rows.append(still("fx-earth", element("earth")))
    rows.append(still("fx-slash", slash()))
    rows.append(still("fx-arc", arc()))
    rows.append(still("fx-impact", burst((255, 180, 40), (220, 40, 20), (100, 10, 10))))
    rows.append(still("fx-code", code_burst()))
    rows.append(still("fx-stealth", stealth()))
    rows.append(still("fx-teleport", teleport()))
    rows.append(still("fx-crit", crit()))
    rows.append(still("fx-glitch", glitch()))
    rows.append(still("fx-shield", shield(False)))
    rows.append(still("fx-shield-crown", shield(True)))
    rows.append(still("fx-heal", heal(False)))
    rows.append(still("fx-heal-crown", heal(True)))
    rows.append(strip("fx-data", [vortex(i) for i in range(4)], "center"))
    rows.append(strip("fx-vortex", [vortex(i, turn=0.8) for i in range(4)], "center"))
    rows.append(still("plate-meadow", meadow()))
    rows.append(still("plate-battle-panic", panic_plate()))
    return rows


def main() -> None:
    rows = build()
    emit(rows)
    print(f"painted {len(rows)} stand-ins")


if __name__ == "__main__":
    main()
