"""Proofs for the renderer's per-category rules (assets checks C1-C5, C7).

    python3 .claude/skills/pixel-assets/scripts/test_render.py            # all
    python3 .claude/skills/pixel-assets/scripts/test_render.py -k anim    # one group
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render  # noqa: E402

PALETTE = render.load_palette()


def write_spec(folder, name, spec):
    path = os.path.join(folder, f"{name}.json")
    with open(path, "w") as f:
        json.dump(spec, f)
    return path


def rows_of(spec):
    with tempfile.TemporaryDirectory() as d:
        return render.to_rows(render.render_spec(write_spec(d, "s", spec), PALETTE))


def size_warnings(warnings):
    return [w for w in warnings if "not a standard" in w]


def strip(cell_w, cell_h, frames, category):
    """A strip spec with one inset box per frame; `frames` maps frame index -> list of extra ops."""
    layers = []
    for i, ops in frames.items():
        layers += ops if ops is not None else [{"rect": [cell_w * i + 4, 4 + i, 6, 6], "color": "gold.2"}]
    return {"category": category, "size": [cell_w * 4, cell_h], "layers": layers}


class TileTest(unittest.TestCase):
    def test_tile_sizes_have_no_size_warning(self):
        for w in (32, 128):
            rows = rows_of({"category": "tile", "size": [w, 32], "layers": [{"fill": "grass.2"}]})
            errors, warnings = render.check(rows, "tile", PALETTE, "t")
            self.assertEqual(errors, [], w)
            self.assertEqual(size_warnings(warnings), [], w)

    def test_tile_with_a_transparent_pixel_is_an_error_and_exits_1(self):
        spec = {"category": "tile", "size": [32, 32],
                "layers": [{"fill": "grass.2"}, {"rect": [5, 5, 1, 1], "color": None}]}
        errors, _ = render.check(rows_of(spec), "tile", PALETTE, "t")
        self.assertEqual(len(errors), 1)
        self.assertIn("transparent", errors[0])
        with tempfile.TemporaryDirectory() as d:
            path = write_spec(d, "hole", spec)
            run = subprocess.run([sys.executable, os.path.join(HERE, "render.py"), path, "--out", d],
                                 capture_output=True, text=True)
        self.assertEqual(run.returncode, 1)
        self.assertIn("ERROR", run.stdout)


class AnimStripTest(unittest.TestCase):
    def check(self, frames):
        return render.check(rows_of(strip(48, 64, frames, "anim")), "anim", PALETTE, "a")

    def test_anim_clean_strip_is_ok(self):
        errors, warnings = self.check({0: None, 1: None, 2: None, 3: None})
        self.assertEqual((errors, warnings), ([], []))

    def test_anim_size_192x64_has_no_size_warning(self):
        _, warnings = self.check({0: None, 1: None, 2: None, 3: None})
        self.assertEqual(size_warnings(warnings), [])

    def test_anim_pixel_on_the_cell_margin_warns_for_that_frame(self):
        frames = {0: None, 1: None, 2: None, 3: None}
        frames[1] = [{"rect": [48 + 4, 5, 6, 6], "color": "gold.2"}, {"rect": [48, 30, 1, 1], "color": "gold.2"}]
        _, warnings = self.check(frames)
        self.assertEqual(len(warnings), 1, warnings)
        self.assertIn("frame 1", warnings[0])
        self.assertIn("margin", warnings[0])

    def test_anim_empty_frame_warns(self):
        _, warnings = self.check({0: None, 1: None, 3: None})
        self.assertEqual(warnings, ["frame 2 is empty"])

    def test_anim_identical_frames_warn(self):
        same = lambda i: [{"rect": [48 * i + 10, 10, 8, 8], "color": "code.2"}]  # noqa: E731
        _, warnings = self.check({0: same(0), 1: None, 2: None, 3: same(3)})
        self.assertEqual(len(warnings), 1, warnings)
        self.assertIn("frames 0 and 3 are identical", warnings[0])


class FxStripTest(unittest.TestCase):
    def check(self, frames):
        return render.check(rows_of(strip(32, 32, frames, "fx")), "fx", PALETTE, "f")

    def test_fx_clean_strip_is_ok(self):
        self.assertEqual(self.check({0: None, 1: None, 2: None, 3: None}), ([], []))

    def test_fx_margin_empty_and_identical_warn_on_32px_cells(self):
        frames = {0: [{"rect": [31, 10, 1, 1], "color": "gold.2"}, {"rect": [4, 4, 3, 3], "color": "gold.2"}],
                  1: [{"rect": [32 + 8, 8, 4, 4], "color": "net.2"}],
                  3: [{"rect": [96 + 8, 8, 4, 4], "color": "net.2"}]}
        _, warnings = self.check(frames)
        self.assertEqual(len(warnings), 3, warnings)
        self.assertIn("frame 0", warnings[0])
        self.assertIn("margin", warnings[0])
        self.assertIn("frame 2 is empty", warnings[1])
        self.assertIn("frames 1 and 3 are identical", warnings[2])


class ClipTest(unittest.TestCase):
    def test_clip_paints_only_the_box_at_the_offset(self):
        with tempfile.TemporaryDirectory() as d:
            # 8x8 source: a distinct colour per row so a shifted copy would show.
            ramp = ["ink", "white", "gold.1", "gold.2", "gold.3", "code.1", "code.2", "net.2"]
            write_spec(d, "src", {"size": [8, 8], "layers": [{"rect": [0, y, 8, 1], "color": ramp[y]} for y in range(8)]
                                  + [{"rect": [3, 4, 1, 1], "color": "red.2"}]})
            dst = write_spec(d, "dst", {"size": [16, 8], "layers": [
                {"fill": "sky.0"}, {"use": "src.json", "clip": [2, 3, 4, 5], "at": [10, 0]}]})
            src = render.render_spec(os.path.join(d, "src.json"), PALETTE).px
            out = render.render_spec(dst, PALETTE).px
        sky = PALETTE["sky.0"]
        for y in range(8):
            for x in range(16):
                if 10 <= x <= 13 and 0 <= y <= 4:
                    self.assertEqual(out[y][x], src[y + 3][x - 8], (x, y))
                else:
                    self.assertEqual(out[y][x], sky, (x, y))


class SpriteSizeTest(unittest.TestCase):
    def rows(self, w, h):
        return [[(0, 0, 0, 0)] * w for _ in range(h)]

    def test_sprite_size_new_sizes_have_no_size_warning(self):
        for w, h in ((96, 96), (64, 64), (160, 64)):
            _, warnings = render.check(self.rows(w, h), "sprite", PALETTE, "s")
            self.assertEqual(size_warnings(warnings), [], (w, h))

    def test_sprite_size_100x100_warns(self):
        _, warnings = render.check(self.rows(100, 100), "sprite", PALETTE, "s")
        self.assertEqual(len(size_warnings(warnings)), 1)


if __name__ == "__main__":
    unittest.main()
