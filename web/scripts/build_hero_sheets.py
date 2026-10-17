#!/usr/bin/env python3
"""Pack the painted hero poses into transparent strips for slice_cast.

Each frame is a generated JPEG in web/public/rendered/hero. The idle PNG already
in web/public/cast is only the height reference: it is not redrawn and it is not
a frame of the strip. Four frames, bottom-aligned, transparent gaps.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_idle_sheets import _fit, _sheet, _sprite  # noqa: E402
from slice_cast import save_png  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
POSES = ROOT / "web" / "public" / "rendered" / "hero"
CAST = ROOT / "web" / "public" / "cast"
OUT = ROOT / "web" / "public" / "rendered"
BODIES = ("m", "f")
ACTIONS = ("walk", "run", "attack", "interact")


def main() -> int:
    for body in BODIES:
        idle = _sprite(CAST / f"hero-{body}-idle.png")
        for action in ACTIONS:
            frames = [_fit(_sprite(POSES / f"hero-{body}-{action}-{i}.jpg"), idle.h) for i in range(1, 5)]
            sheet = _sheet(frames)
            name = f"hero-{body}-{action}.png"
            save_png(sheet, OUT / name)
            print(f"{name} {sheet.w}x{sheet.h} frames {[f'{f.w}x{f.h}' for f in frames]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
