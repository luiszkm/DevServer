#!/usr/bin/env python3
"""Lay four idle frames on a checker sheet that slice_cast can cut.

Generated poses are JPEGs in web/public/rendered/idle. The neutral frame of each
cycle is the still recovered in idle/ref, so that pose stays the reference and
is never read back from the packed strip. The kernel-panic pulse is a scale of
that still: a redraw replaced its warnings.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from slice_cast import Raster, _crop_box, _opaque_box, is_light_checker, knock_out, load_raster, save_png  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
IDLE = ROOT / "web" / "public" / "rendered" / "idle"
REF = IDLE / "ref"
OUT = ROOT / "web" / "public" / "rendered"
GAP = 64
PAD = 32


def _pil(im: Raster) -> Image.Image:
    return Image.frombytes("RGBA", (im.w, im.h), bytes(im.px))


def _raster(image: Image.Image) -> Raster:
    image = image.convert("RGBA")
    return Raster(image.width, image.height, bytearray(image.tobytes()))


def _fit(im: Raster, height: int) -> Raster:
    if im.h == height:
        return im
    scale = height / im.h
    resized = _pil(im).resize((max(1, round(im.w * scale)), height), Image.Resampling.NEAREST)
    return _raster(resized)


def _scale(im: Raster, factor: float) -> Raster:
    resized = _pil(im).resize(
        (max(1, round(im.w * factor)), max(1, round(im.h * factor))),
        Image.Resampling.NEAREST,
    )
    return _raster(resized)


def _sprite(path: Path) -> Raster:
    im = load_raster(path)
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        knock_out(im, [], checker=True)
        # A hole the checker filled in does not touch the edge, so the flood leaves it.
        px = im.px
        for i in range(im.w * im.h):
            o = i * 4
            if px[o + 3] == 0:
                continue
            if is_light_checker((px[o], px[o + 1], px[o + 2])):
                px[o + 3] = 0
    box = _opaque_box(im)
    if box is None:
        raise ValueError(f"{path.name}: nothing opaque left")
    cropped = _crop_box(im, (*box, 0), pad=0)
    opaque = sum(1 for i in range(cropped.w * cropped.h) if cropped.px[i * 4 + 3] == 255)
    if opaque < 400:
        raise ValueError(f"{path.name}: sprite collapsed ({opaque} px)")
    return cropped


def _sheet(frames: list[Raster]) -> Raster:
    """Transparent gaps, so a hole in a pose stays clear instead of filling with checker."""
    row_h = max(frame.h for frame in frames)
    width = PAD * 2 + sum(frame.w for frame in frames) + GAP * (len(frames) - 1)
    canvas = Raster(width, PAD * 2 + row_h)
    x = PAD
    for frame in frames:
        y = PAD + row_h - frame.h
        canvas.blit(frame, x, y)
        x += frame.w + GAP
    return canvas


def _cycle(neutral: Path, poses: list[Path | None], *, factors: list[float] | None = None) -> list[Raster]:
    base = _sprite(neutral)
    frames: list[Raster] = []
    for i, pose in enumerate(poses):
        if pose is None:
            frame = base if not factors else _scale(base, factors[i])
        else:
            frame = _fit(_sprite(pose), base.h)
        frames.append(frame)
    return frames


def main() -> int:
    jobs: list[tuple[str, list[Raster]]] = [
        (
            "idle-enemy-slime.png",
            _cycle(
                REF / "enemy-slime.png",
                [IDLE / "enemy-slime-squash.jpg", None, IDLE / "enemy-slime-stretch.jpg", IDLE / "enemy-slime-settle.jpg"],
            ),
        ),
        (
            "idle-enemy-slime-verde.png",
            _cycle(
                REF / "enemy-slime-verde.png",
                [
                    IDLE / "enemy-slime-verde-squash.jpg",
                    None,
                    IDLE / "enemy-slime-verde-stretch.jpg",
                    IDLE / "enemy-slime-verde-settle.jpg",
                ],
            ),
        ),
        (
            "idle-enemy-slime-dark.png",
            _cycle(
                REF / "enemy-slime-dark.png",
                [
                    IDLE / "enemy-slime-dark-squash.jpg",
                    None,
                    IDLE / "enemy-slime-dark-stretch.jpg",
                    IDLE / "enemy-slime-dark-settle.jpg",
                ],
            ),
        ),
        (
            "idle-enemy-snake.png",
            _cycle(REF / "enemy-snake.png", [IDLE / "enemy-snake-left.jpg", None, IDLE / "enemy-snake-right.jpg", None]),
        ),
        (
            "idle-enemy-spider.png",
            _cycle(REF / "enemy-spider.png", [IDLE / "enemy-spider-down.jpg", None, IDLE / "enemy-spider-up.jpg", None]),
        ),
        (
            "idle-enemy-boss-nuvem.png",
            _cycle(REF / "enemy-boss-nuvem.png", [None, None, None, None], factors=[0.92, 1, 1.08, 1]),
        ),
        (
            "idle-fx-fire.png",
            _cycle(REF / "fx-fire.png", [IDLE / "fx-fire-low.jpg", None, IDLE / "fx-fire-wide.jpg", None]),
        ),
        (
            "idle-fx-teleport.png",
            _cycle(
                REF / "fx-teleport.png",
                [IDLE / "fx-teleport-gather.jpg", None, IDLE / "fx-teleport-burst.jpg", IDLE / "fx-teleport-fade.jpg"],
            ),
        ),
    ]
    for name, frames in jobs:
        if len(frames) != 4:
            raise ValueError(f"{name}: expected 4 frames")
        sheet = _sheet(frames)
        save_png(sheet, OUT / name)
        print(f"{name} {sheet.w}x{sheet.h} frames {[f'{f.w}x{f.h}' for f in frames]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
