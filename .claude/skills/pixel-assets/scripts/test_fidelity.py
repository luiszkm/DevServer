"""Proofs for art-fidelity checks C1-C21.

    python3 .claude/skills/pixel-assets/scripts/test_fidelity.py
    python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_iou
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fidelity  # noqa: E402
import png  # noqa: E402
import render  # noqa: E402

PAL = fidelity.palette()


def _k(prefix, names):
    return [f"{prefix}/{n}" for n in names]


TWIN_KEYS = _k("ui", [
    "ui-panel", "ui-panel-wood", "ui-btn-wood", "ui-btn-wood-press", "ui-btn-dark",
    "ui-btn-dark-press", "ui-btn-green", "ui-btn-green-press", "ui-bubble", "ui-bar",
]) + _k("icon", [
    "btn-build", "btn-deploy", "btn-play", "btn-rank", "btn-start", "btn-settings", "btn-shop", "btn-exit",
    "ic-code", "ic-cloud", "ic-server", "ic-gear", "ic-trophy", "ic-star", "ic-crown", "ic-laptop",
    "ic-database", "ic-shield", "ic-lock", "ic-file", "ic-wrench", "ic-chart", "ic-sp",
    "medal-bronze", "medal-prata", "medal-ouro", "medal-azul", "medal-roxo", "medal-rubi",
    "hud-coin", "hud-gem", "hud-heart", "hud-xp",
]) + ["sprite/logo"] + _k("sprite", [
    "prop-laptop", "prop-macbook", "prop-rack", "prop-caixa", "prop-caixa-aberta", "prop-monitor",
    "prop-roteador", "prop-planta", "prop-caneca", "prop-livros", "prop-bloco-grama", "prop-terminal",
    "prop-torre", "prop-gema-pedestal", "prop-modem",
    "build-server-hut", "build-rack", "build-tenda", "build-antena", "build-placa-code", "build-flag", "build-placa",
    "mob-slime", "mob-slime-verde", "mob-monstro", "mob-robo", "npc-dev",
    "extra-placa", "extra-fogueira", "extra-lampada", "extra-banco", "extra-bau", "extra-bau-aberto", "extra-bandeira",
    "tile-arbusto", "tile-flor", "tile-arvore", "tile-arvore-grande", "tile-cerca",
]) + _k("fx", ["dust", "sparkle", "teleport", "fire", "loading", "collect"]) + _k("background", [
    "scene-dia", "scene-noite", "scene-floresta", "scene-dungeon",
]) + _k("tile", [
    "tile-grama-topo", "tile-grama", "tile-grama-borda", "tile-terra", "tile-pedra", "tile-tijolo",
    "tile-tabua", "tile-parede-madeira", "tile-areia", "tile-agua", "tile-agua-funda", "tile-cachoeira",
])

HUD = ["icon/hud-coin", "icon/hud-gem", "icon/hud-heart", "icon/hud-xp"]
GLOSSY = [
    "icon/hud-coin", "icon/hud-gem", "icon/hud-heart",
    "icon/medal-bronze", "icon/medal-prata", "icon/medal-ouro", "icon/medal-azul", "icon/medal-roxo", "icon/medal-rubi",
    "sprite/mob-slime", "sprite/mob-slime-verde", "sprite/prop-gema-pedestal",
]
ABSENT_ON_MAIN = {"icon/btn-settings": [16, 16], "icon/ic-star": [16, 16]}
BACKGROUNDS = _k("background", [
    "battle-caverna", "battle-floresta", "battle-mercado", "battle-nuvem", "battle-torre", "battle-vila",
    "region-caverna", "region-floresta", "region-mercado", "region-nuvem", "region-torre", "region-vila",
    "office", "server", "world",
])
FX_CATALOG = _k("fx", ["impact", "slash", "code", "data", "bolt", "shield", "ship", "scan", "heal"])

_SHEETS = {}
_SIZES = {}


def sheet(source):
    if source not in _SHEETS:
        _SHEETS[source] = fidelity.sheet_rows(source)
    return _SHEETS[source]


def size_on_main(key):
    if key in ABSENT_ON_MAIN:
        return ABSENT_ON_MAIN[key]
    if key not in _SIZES:
        raw = subprocess.check_output(["git", "show", f"origin/main:web/art/{key}.json"])
        _SIZES[key] = json.loads(raw)["size"]
    return _SIZES[key]


def traced(key):
    index = fidelity.load_index()
    entry = index[key]
    size = size_on_main(key)
    cat = fidelity.category_of(key)
    cells, stats = fidelity.trace_box(sheet(entry["source"]), entry["box"], size, cat, PAL)
    return cells, stats


class HudTest(unittest.TestCase):
    def test_hud_keys(self):
        index = fidelity.load_index()
        hud = sorted(k for k in index if "hud" in k)
        self.assertEqual(hud, sorted(HUD))
        for key in HUD:
            box = index[key]["box"]
            self.assertEqual(len(box), 4, key)
            self.assertEqual(index[key]["source"], "assests_keyart.png")

    def test_hud_iou(self):
        for key in HUD:
            cells, _ = traced(key)
            score = fidelity.iou(fidelity.opaque_mask_rows(fidelity.read_png(key)), fidelity.opaque_mask_cells(cells))
            self.assertGreaterEqual(score, 0.80, key)

    def test_hud_outline(self):
        for key in HUD:
            self.assertGreaterEqual(fidelity.outline_ratio(fidelity.read_png(key), PAL), 0.90, key)

    def test_hud_specular(self):
        for key in ("icon/hud-coin", "icon/hud-gem", "icon/hud-heart"):
            self.assertEqual(fidelity.specular_count(fidelity.read_png(key), PAL), 1, key)

    def test_hud_size(self):
        for key in HUD:
            with open(fidelity.spec_path(key)) as f:
                self.assertEqual(json.load(f)["size"], [16, 16], key)


class TwinTest(unittest.TestCase):
    def test_twin_keys(self):
        self.assertEqual(len(TWIN_KEYS), 105)
        self.assertEqual(len(set(TWIN_KEYS)), 105)
        self.assertEqual(set(fidelity.load_index()), set(TWIN_KEYS))

    def test_twin_iou(self):
        index = fidelity.load_index()
        for key in TWIN_KEYS:
            cells, stats = traced(key)
            self.assertTrue(fidelity.accept_trace(stats), f"{key} mean {stats.get('mean_distance')}")
            self.assertEqual(index[key]["source"], "assests_keyart.png")
            if key in fidelity.COMPOSED_SPRITES or fidelity.category_of(key) in ("background", "tile", "ui"):
                continue
            score = fidelity.iou(fidelity.opaque_mask_rows(fidelity.read_png(key)), fidelity.opaque_mask_cells(cells))
            self.assertGreaterEqual(score, 0.80, key)

    def test_composed_picture_is_not_its_sheet_cell(self):
        # Mask IoU of two full rectangles is 1, so it accepts a logo in scene-dia,
        # a jump-button in the grass tile, and a character stretched into ui-panel.
        # The picture itself must not be that cell.
        keys = [k for k in TWIN_KEYS if k in fidelity.COMPOSED_SPRITES or fidelity.category_of(k) in ("background", "tile", "ui")]
        self.assertEqual(len(keys), len(fidelity.COMPOSED_SPRITES) + 4 + 12 + 10)
        for key in keys:
            cells, _ = traced(key)
            painted = []
            for row in cells:
                painted.append(tuple(
                    (0, 0, 0, 0) if not name else tuple(PAL[name]) + (255,)
                    for name in row
                ))
            picture = tuple(tuple(row) for row in fidelity.read_png(key))
            self.assertNotEqual(picture, tuple(painted), key)

    def test_twin_outline(self):
        for key in TWIN_KEYS:
            if fidelity.category_of(key) not in ("icon", "sprite"):
                continue
            self.assertGreaterEqual(fidelity.outline_ratio(fidelity.read_png(key), PAL), 0.90, key)

    def test_twin_specular(self):
        self.assertEqual(len(GLOSSY), 12)
        for key in GLOSSY:
            self.assertEqual(fidelity.specular_count(fidelity.read_png(key), PAL), 1, key)

    def test_twin_size(self):
        for key in TWIN_KEYS:
            with open(fidelity.spec_path(key)) as f:
                self.assertEqual(json.load(f)["size"], size_on_main(key), key)

    def test_far_trace_is_rejected_and_writes_nothing(self):
        # magenta centre, sheet-coloured border: edge knockout keeps the centre, which is past 24
        border = (16, 32, 52, 255)
        rows = []
        for y in range(8):
            row = []
            for x in range(8):
                row.append(border if x in (0, 7) or y in (0, 7) else (255, 0, 255, 255))
            rows.append(row)
        _, stats = fidelity.trace_box(rows, [0, 0, 8, 8], [8, 8], "icon", PAL)
        self.assertGreater(stats["mean_distance"], 24)
        self.assertFalse(fidelity.accept_trace(stats))
        with tempfile.TemporaryDirectory() as d:
            dest = os.path.join(d, "no.json")
            wrote = fidelity.write_if_accepted(dest, {"name": "no"}, stats)
            self.assertFalse(wrote)
            self.assertFalse(os.path.exists(dest))


class ThresholdTest(unittest.TestCase):
    def test_iou_threshold(self):
        base = {(x, y) for x in range(10) for y in range(10)}  # 100
        # drop 17 cells: inter 83, union 100, IoU 0.83; drop 21: inter 79, union 100, IoU 0.79
        keep80 = set(list(base)[:83])
        keep79 = set(list(base)[:79])
        self.assertGreaterEqual(fidelity.iou(base, keep80), 0.80)
        self.assertLess(fidelity.iou(base, keep79), 0.80)
        # same mask, different colours, still IoU 1
        self.assertEqual(fidelity.iou(base, set(base)), 1.0)

    def test_outline_stays_a_warning(self):
        spec = {
            "name": "bare",
            "category": "sprite",
            "size": [32, 32],
            "layers": [{"rect": [8, 8, 16, 16], "color": "gold.2"}],
        }
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "bare.json")
            with open(path, "w") as f:
                json.dump(spec, f)
            run = subprocess.run(
                [sys.executable, os.path.join(HERE, "render.py"), path, "--out", d],
                capture_output=True, text=True,
            )
        self.assertEqual(run.returncode, 0, run.stdout)
        self.assertIn("WARN", run.stdout)
        self.assertNotIn("ERROR", run.stdout)


def catalog_keys():
    out = []
    for key in fidelity.iter_spec_keys():
        if key in set(TWIN_KEYS) or fidelity.is_hero_or_anim(key):
            continue
        out.append(key)
    return out


class CatalogTest(unittest.TestCase):
    def test_catalog_icons(self):
        changed = set(subprocess.check_output(
            ["git", "diff", "--name-only", "origin/main"], text=True).split())
        # also staged/committed on this branch
        changed |= set(subprocess.check_output(
            ["git", "diff", "--name-only", "origin/main...HEAD"], text=True).split())
        seen = 0
        for key in catalog_keys():
            with open(fidelity.spec_path(key)) as f:
                spec = json.load(f)
            if spec.get("category") not in ("icon", "sprite"):
                continue
            seen += 1
            rows = fidelity.read_png(key)
            self.assertGreaterEqual(fidelity.outline_ratio(rows, PAL), 0.90, key)
            self.assertGreater(fidelity.light_delta(rows, PAL), 0, key)
            spec_rel = f"web/art/{key}.json"
            if spec_rel not in changed:
                continue
            raw = subprocess.check_output(["git", "show", f"origin/main:web/public/art/{key}.png"])
            with tempfile.TemporaryDirectory() as d:
                path = os.path.join(d, "was.png")
                with open(path, "wb") as f:
                    f.write(raw)
                before = png.read(path)
            self.assertFalse(
                fidelity.passes_icon_sprite(before, PAL),
                f"{key} already passed on origin/main; its spec must stay",
            )
        self.assertGreater(seen, 0)

    def test_catalog_backgrounds(self):
        self.assertEqual(len(BACKGROUNDS), 15)
        for key in BACKGROUNDS:
            rows = fidelity.read_png(key)
            self.assertEqual((len(rows[0]), len(rows)), (320, 180), key)
            self.assertTrue(all(px[3] for row in rows for px in row), key)
            with open(fidelity.spec_path(key)) as f:
                spec = json.load(f)
            uses = [op for op in spec["layers"] if isinstance(op, dict) and "use" in op]
            self.assertGreaterEqual(len(uses), 1, key)

    def test_catalog_fx(self):
        self.assertEqual(len(FX_CATALOG), 9)
        for key in FX_CATALOG:
            rows = fidelity.read_png(key)
            self.assertEqual((len(rows[0]), len(rows)), (128, 32), key)
            frames = []
            for i in range(4):
                cell = []
                for y in range(32):
                    row = rows[y][i * 32:(i + 1) * 32]
                    cell.append(tuple(tuple(px) for px in row))
                    for x, px in enumerate(row):
                        if x in (0, 31) or y in (0, 31):
                            self.assertEqual(px[3], 0, f"{key} frame {i} margin")
                frames.append(tuple(cell))
            self.assertEqual(len(set(frames)), 4, key)

    def test_no_extra_tile(self):
        tiles = [k for k in fidelity.iter_spec_keys() if k.startswith("tile/")]
        self.assertEqual(len(tiles), 12)
        self.assertTrue(set(tiles) <= set(TWIN_KEYS))

    def test_catalog_size(self):
        for key in catalog_keys():
            with open(fidelity.spec_path(key)) as f:
                self.assertEqual(json.load(f)["size"], size_on_main(key), key)


class HeroTest(unittest.TestCase):
    def test_hero_anim_matches(self):
        public = os.path.join(fidelity.PUBLIC, "sprite", "hero", "anim")
        with tempfile.TemporaryDirectory() as d:
            hero = os.path.join(d, "hero")
            shutil.copytree(os.path.join(fidelity.ART, "sprite", "hero"), hero)
            # drop committed strips so hero_anim writes a fresh set
            run = subprocess.run(
                [sys.executable, os.path.join(HERE, "hero_anim.py"), "--hero", hero],
                capture_output=True, text=True,
            )
            self.assertEqual(run.returncode, 0, run.stderr or run.stdout)
            specs = [f for f in os.listdir(os.path.join(hero, "anim")) if f.endswith(".json") and not f.startswith("_")]
            pngs = [f for f in os.listdir(public) if f.endswith(".png")]
            self.assertEqual(sorted(s[:-5] for s in specs), sorted(p[:-4] for p in pngs))
            self.assertEqual(len(pngs), 325)
            out = os.path.join(d, "png")
            run = subprocess.run(
                [sys.executable, os.path.join(HERE, "render.py"), os.path.join(hero, "anim"), "--out", out],
                capture_output=True, text=True,
            )
            self.assertEqual(run.returncode, 0, run.stdout[-500:])
            # anim specs render under OUT_FOLDER sprite; the temp tree has no "sprite" ancestor, so no subdir
            for name in pngs:
                self.assertEqual(png.read(os.path.join(out, "sprite", name)), png.read(os.path.join(public, name)), name)

    def test_hero_exempt(self):
        # a hero layer and an anim strip are not catalog, even when the outline is below 0.90
        keys = fidelity.iter_spec_keys()
        self.assertTrue(any(k.startswith("sprite/hero/") and not k.startswith("sprite/hero/anim/") for k in keys))
        catalog = catalog_keys()
        self.assertFalse(any(k.startswith("sprite/hero/") for k in catalog))
        self.assertFalse(any(k.startswith("sprite/hero/anim/") for k in catalog))

    def test_layer_regenerates_five(self):
        with tempfile.TemporaryDirectory() as d:
            hero = os.path.join(d, "hero")
            shutil.copytree(os.path.join(fidelity.ART, "sprite", "hero"), hero)
            anim = os.path.join(hero, "anim")
            pal = render.load_palette()

            def rendered(name):
                path = os.path.join(anim, f"{name}.json")
                return render.to_rows(render.render_spec(path, pal))

            before = {f"{name}-{motion}": rendered(f"{name}-{motion}")
                      for name in ("body", "hair-curto")
                      for motion in ("idle", "walk", "run", "jump", "interact")}
            body = os.path.join(hero, "body.json")
            with open(body) as f:
                spec = json.load(f)
            # swap two legend characters inside the head clip so the five strips repaint
            grid = spec["layers"][0]["grid"]
            row = list(grid[10])
            row[10], row[11] = row[11], row[10]
            grid[10] = "".join(row)
            spec["layers"][0]["grid"] = grid
            with open(body, "w") as f:
                json.dump(spec, f)
            run = subprocess.run(
                [sys.executable, os.path.join(HERE, "hero_anim.py"), "--hero", hero],
                capture_output=True, text=True,
            )
            self.assertEqual(run.returncode, 0, run.stderr or run.stdout)
            for motion in ("idle", "walk", "run", "jump", "interact"):
                self.assertNotEqual(rendered(f"body-{motion}"), before[f"body-{motion}"], motion)
                self.assertEqual(rendered(f"hair-curto-{motion}"), before[f"hair-curto-{motion}"], motion)


if __name__ == "__main__":
    unittest.main()
