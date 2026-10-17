#!/usr/bin/env python3
"""Proofs for slice_cast: checker alpha, an opaque pixel, equal strip cells, dropped labels."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from slice_cast import Raster, load_raster, slice_sheet  # noqa: E402


def checker(w: int, h: int, cell: int = 8) -> Raster:
    im = Raster(w, h)
    light, dark = (255, 255, 255), (192, 192, 192)
    for y in range(h):
        for x in range(w):
            rgb = light if ((x // cell) + (y // cell)) % 2 == 0 else dark
            im.set(x, y, *rgb)
    return im


def fill(im: Raster, x: int, y: int, w: int, h: int, rgb: tuple[int, int, int]) -> None:
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            im.set(xx, yy, *rgb)


class SliceCastTest(unittest.TestCase):
    def test_checker_corner_is_clear_and_sprite_pixel_stays(self):
        im = checker(80, 60)
        fill(im, 20, 16, 30, 28, (220, 40, 40))
        rows = slice_sheet(im, {"file": "still.jpg", "key": "checker", "mode": "still", "ids": ["blob"]})
        self.assertEqual(im.get(0, 0)[3], 255)  # the source is untouched
        out = rows[0]["_image"]
        # The cropped sprite has no checker corner; a red pixel survives.
        self.assertEqual(out.get(0, 0)[3], 0)
        reds = [
            out.get(x, y)
            for y in range(out.h)
            for x in range(out.w)
            if out.get(x, y)[:3] == (220, 40, 40) and out.get(x, y)[3] == 255
        ]
        self.assertGreater(len(reds), 0)
        self.assertEqual(rows[0]["frames"], 1)

    def test_strip_cells_are_equal(self):
        im = checker(200, 80)
        colors = [(220, 40, 40), (40, 180, 60), (40, 80, 220), (230, 180, 30)]
        # Unequal heights, so packing must pad to one cell size.
        for i, rgb in enumerate(colors):
            fill(im, 8 + i * 48, 10 + (i % 2) * 8, 28, 40 - (i % 2) * 8, rgb)
        rows = slice_sheet(
            im,
            {"file": "walk.jpg", "key": "checker", "mode": "strip", "align": "bottom", "ids": ["walk"]},
        )
        row = rows[0]
        self.assertEqual(row["frames"], 4)
        self.assertEqual(row["w"], row["cellW"] * 4)
        self.assertEqual(row["h"], row["cellH"])
        out = row["_image"]
        self.assertEqual(out.w, row["cellW"] * 4)
        self.assertEqual(out.h, row["cellH"])
        # Each cell holds its own colour and the same box.
        for i, rgb in enumerate(colors):
            cell = out.crop(i * row["cellW"], 0, row["cellW"], row["cellH"])
            hits = [
                1
                for y in range(cell.h)
                for x in range(cell.w)
                if cell.get(x, y)[:3] == rgb and cell.get(x, y)[3] == 255
            ]
            self.assertGreater(sum(hits), 0, rgb)

    def test_variants_indices_drop_a_drawing(self):
        im = checker(220, 80)
        colors = [(220, 40, 40), (40, 180, 60), (40, 80, 220), (230, 180, 30)]
        for i, rgb in enumerate(colors):
            fill(im, 10 + i * 52, 16, 32, 40, rgb)
        rows = slice_sheet(
            im,
            {
                "file": "fx.jpg",
                "key": "checker",
                "mode": "variants",
                "drawings": 4,
                "indices": [1, 2, 3],
                "ids": ["ice", "bolt", "earth"],
            },
        )
        self.assertEqual([row["id"] for row in rows], ["ice", "bolt", "earth"])
        kept = []
        for row in rows:
            out = row["_image"]
            found = {
                out.get(x, y)[:3]
                for y in range(out.h)
                for x in range(out.w)
                if out.get(x, y)[3] == 255
            }
            kept.append(found)
        self.assertNotIn((220, 40, 40), set().union(*kept))
        self.assertEqual(kept[0], {(40, 180, 60)})

    def test_label_bars_are_dropped(self):
        im = checker(200, 100)
        colors = [(180, 40, 220), (120, 40, 200), (90, 20, 180), (200, 80, 240)]
        for i, rgb in enumerate(colors):
            fill(im, 10 + i * 48, 8, 30, 50, rgb)
            fill(im, 8 + i * 48, 78, 36, 12, (20, 16, 40))
        rows = slice_sheet(
            im,
            {
                "file": "skills.jpg",
                "key": "checker",
                "mode": "variants",
                "drop": "labels",
                "ids": ["a", "b", "c", "d"],
            },
        )
        self.assertEqual([r["id"] for r in rows], ["a", "b", "c", "d"])
        for row, rgb in zip(rows, colors):
            out = row["_image"]
            self.assertTrue(
                any(out.get(x, y)[:3] == rgb for y in range(out.h) for x in range(out.w))
            )
            self.assertFalse(
                any(out.get(x, y)[:3] == (20, 16, 40) for y in range(out.h) for x in range(out.w))
            )

    def test_largest_component_only(self):
        im = checker(160, 120)
        fill(im, 40, 10, 70, 90, (80, 20, 40))
        for i in range(4):
            fill(im, 8 + (i % 2) * 130, 8 + (i // 2) * 90, 16, 14, (40, 200, 220))
        rows = slice_sheet(
            im,
            {"file": "boss.jpg", "key": "checker", "mode": "still", "pick": "largest", "ids": ["boss"]},
        )
        out = rows[0]["_image"]
        self.assertTrue(any(out.get(x, y)[:3] == (80, 20, 40) for y in range(out.h) for x in range(out.w)))
        self.assertFalse(any(out.get(x, y)[:3] == (40, 200, 220) for y in range(out.h) for x in range(out.w)))

    def test_glitch_bridge_drops_the_panel(self):
        im = checker(90, 60)
        fill(im, 16, 8, 34, 42, (40, 20, 50))
        fill(im, 70, 8, 14, 12, (20, 20, 30))
        for x in range(50, 70):
            im.set(x, 14, 40, 220, 230)
        rows = slice_sheet(
            im,
            {"file": "boss.jpg", "key": "checker", "mode": "still", "pick": "largest", "ids": ["boss"]},
        )
        out = rows[0]["_image"]
        self.assertTrue(any(out.get(x, y)[:3] == (40, 20, 50) for y in range(out.h) for x in range(out.w)))
        self.assertFalse(any(out.get(x, y)[:3] == (20, 20, 30) for y in range(out.h) for x in range(out.w)))

    def test_strip_keeps_a_spark_inside_its_frame(self):
        im = checker(200, 80)
        for i in range(4):
            fill(im, 10 + i * 50, 24, 18, 28, (220, 40, 40))
            fill(im, 14 + i * 50, 8, 4, 4, (240, 200, 40))
        rows = slice_sheet(
            im,
            {"file": "fx.jpg", "key": "checker", "mode": "strip", "align": "center", "ids": ["fx"]},
        )
        row = rows[0]
        self.assertEqual(row["frames"], 4)
        out = row["_image"]
        for i in range(4):
            cell = out.crop(i * row["cellW"], 0, row["cellW"], row["cellH"])
            red = yellow = 0
            for y in range(cell.h):
                for x in range(cell.w):
                    rgb, a = cell.get(x, y)[:3], cell.get(x, y)[3]
                    if a != 255:
                        continue
                    if rgb == (220, 40, 40):
                        red += 1
                    elif rgb == (240, 200, 40):
                        yellow += 1
            self.assertGreater(red, 0, i)
            self.assertGreater(yellow, 0, i)

    def test_jpeg_gray_ramp_clears(self):
        im = Raster(80, 48)
        for y in range(48):
            for x in range(80):
                g = 210 if ((x // 8) + (y // 8)) % 2 == 0 else 248
                im.set(x, y, g, g, g)
        fill(im, 22, 12, 28, 22, (200, 40, 40))
        rows = slice_sheet(im, {"file": "ramp.jpg", "key": "checker", "mode": "still", "ids": ["blob"]})
        out = rows[0]["_image"]
        self.assertEqual(out.get(0, 0)[3], 0)
        self.assertLess(out.w, 50)
        self.assertTrue(
            any(out.get(x, y)[:3] == (200, 40, 40) and out.get(x, y)[3] == 255 for y in range(out.h) for x in range(out.w))
        )

    def test_strip_follows_the_gap_beside_the_quarter(self):
        im = checker(200, 50)
        # The second sprite crosses x=50, where an equal quarter would cut it.
        spans = [(4, 28), (40, 78), (96, 130), (156, 190)]
        for x0, x1 in spans:
            fill(im, x0, 10, x1 - x0, 28, (220, 40, 40))
        rows = slice_sheet(
            im,
            {"file": "wide.jpg", "key": "checker", "mode": "strip", "align": "bottom", "ids": ["wide"]},
        )
        row = rows[0]
        self.assertEqual(row["frames"], 4)
        out = row["_image"]
        for i in range(4):
            cell = out.crop(i * row["cellW"], 0, row["cellW"], row["cellH"])
            reds = [
                1
                for y in range(cell.h)
                for x in range(cell.w)
                if cell.get(x, y)[:3] == (220, 40, 40) and cell.get(x, y)[3] == 255
            ]
            self.assertEqual(sum(reds), (spans[i][1] - spans[i][0]) * 28, i)

    def test_jpeg_checker_corner_clears(self):
        from PIL import Image

        im = checker(96, 64)
        fill(im, 24, 12, 40, 36, (210, 50, 40))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sheet.jpg"
            Image.frombytes("RGBA", (im.w, im.h), bytes(im.px)).convert("RGB").save(path, "JPEG", quality=95)
            loaded = load_raster(path)
            rows = slice_sheet(loaded, {"file": "sheet.jpg", "key": "checker", "mode": "still", "ids": ["blob"]})
        out = rows[0]["_image"]
        self.assertEqual(out.get(0, 0)[3], 0)
        opaque = [out.get(x, y) for y in range(out.h) for x in range(out.w) if out.get(x, y)[3] == 255]
        self.assertGreater(len(opaque), 0)
        # The sprite's red survives JPEG; a corner of the crop is the cleared checker.
        self.assertTrue(any(p[0] > 160 and p[1] < 100 for p in opaque))


if __name__ == "__main__":
    unittest.main()
