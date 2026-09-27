# Art fidelity checks

Profile: standard
Plan: `.specs/features/art-fidelity/plan.md`

21 checks in 4 slices · 4 one-way doors · 0 open

## Checks

### S1 - HUD · 6 files · ~40 KB · ~10k

**C1** - `sheet-index.json` has a box for `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart` and `icon/hud-xp`, and no other key containing `hud` (ART-01, AC 1)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_keys`

**C2** - each of those four PNGs has opaque-mask IoU ≥ 0.80 against `trace_image` of its box at 16×16 (ART-01, AC 2)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_iou`

**C3** - each of those four has ink-ramp edge ratio ≥ 0.90 (ART-01, AC 3)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_outline`

**C4** - `hud-coin`, `hud-gem` and `hud-heart` each have exactly 1 specular pixel (white, or the last stop of the most common non-ink ramp) (ART-01, AC 4)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_specular`

**C5** - those four specs stay `[16, 16]`, and `GameArt` `kind="hud"` `id="coin"` `scale={2}` renders `width` 32 (ART-01, AC 5)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hud_size`
Proof: `cd web && npx vitest run src/components/GameArt.test.tsx -t "address and size (hud coin x2)"`

### S2 - twin set · index + specs · ~400 KB · ~100k

**C6** - the index keys are exactly the Twin set in the plan (105 keys, tiles as `tile/tile-<name>`) (ART-02, AC 6)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k twin_keys`

**C7** - every twin PNG has opaque-mask IoU ≥ 0.80 against `trace_image` of its box at the spec size on `origin/main`, except composed pictures whose box is a different cell: `fidelity.COMPOSED_SPRITES`, the four `scene-*` backgrounds, the twelve tiles and the ten `ui/*` 9-slice frames. Those must not be pixel-equal to that cell (ART-02, AC 7)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k twin_iou`

**C8** - every twin whose category is `icon` or `sprite` has ink-ramp edge ratio ≥ 0.90 (ART-02, AC 8)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k twin_outline`

**C9** - every glossy twin has exactly 1 specular pixel, same rule as C4 (ART-02, AC 9)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k twin_specular`

**C10** - every twin spec `size` equals that spec on `origin/main`; `icon/btn-settings` and `icon/ic-star` are absent there and are `[16, 16]` (ART-02, AC 10)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k twin_size`

**C11** - a trace whose mean palette distance is greater than 24 is rejected and writes no spec; a missing twin key fails the key-set check (ART-02, AC 11)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k far_trace`

**C20** - opaque-mask IoU passes at 0.80 and fails at 0.79, and a same-mask recolor still passes (door 2)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k iou_threshold`

**C21** - `render.py` on a sprite whose ink edge ratio is below 0.90 prints `WARN`, not `ERROR`, and exits 0 (door 3)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k outline_stays_a_warning`

### S3 - catalog · failing icons, sprites, backgrounds, fx · ~80 KB · ~20k

**C12** - every catalog icon and sprite (not a twin, not `sprite/hero/`, not `anim`) has ink-ramp edge ratio ≥ 0.90 and light delta > 0; a spec rewritten against `origin/main` had failed that bar there (a `use` of a twin may change the PNG while the spec stays) (ART-03, AC 12)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k catalog_icons`

**C13** - each catalog background (`battle-*`, `region-*`, `office`, `server`, `world`) is 320×180, has 0 transparent pixels, and its spec has at least 1 `use`. A cave, office or server room is darker overhead; forcing light delta > 0 repaints the picture (ART-03, AC 13)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k catalog_backgrounds`

**C14** - each catalog fx (`impact`, `slash`, `code`, `data`, `bolt`, `shield`, `ship`, `scan`, `heal`) is 128×32, four 32×32 frames, no two frames equal, no opaque pixel on the 1px frame margin (ART-03, AC 14)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k catalog_fx`

**C15** - every spec under `web/art/tile/` is one of the 12 `tile/tile-*` twin keys (ART-03, AC 15)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k no_extra_tile`

**C16** - every catalog spec `size` equals that spec on `origin/main` (ART-03, AC 16)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k catalog_size`

### S4 - hero rig · hero_anim.py · ~20 KB · ~5k

**C17** - rendering a fresh `hero_anim.py` run over `web/art/sprite/hero` matches every PNG in `web/public/art/sprite/hero/anim/` (ART-04, AC 17)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hero_anim_matches`

**C18** - the fidelity walker does not require IoU or ink edge ratio ≥ 0.90 for `sprite/hero/` layers or `anim` strips (ART-04, AC 18)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k hero_exempt`

**C19** - changing one hero layer and running `hero_anim.py` rewrites that layer's five strips (`idle`, `walk`, `run`, `jump`, `interact`) and leaves another layer's strip unchanged (ART-04, AC 19)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_fidelity.py -k layer_regenerates_five`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| HUD keys (4) | hud-coin C1 · hud-gem C1 · hud-heart C1 · hud-xp C1 | - |
| HUD IoU (4) | hud-coin C2 · hud-gem C2 · hud-heart C2 · hud-xp C2 | - |
| HUD outline (4) | hud-coin C3 · hud-gem C3 · hud-heart C3 · hud-xp C3 | - |
| HUD specular (3) | hud-coin C4 · hud-gem C4 · hud-heart C4 | - |
| Twin set (105) | C6, C7, C8, C10, table-driven over all 105 | - |
| Glossy twins (12) | C9, table-driven over all 12 | - |
| IoU threshold (2) | 0.80 C20 · 0.79 C20 | - |
| Trace rejection (2) | distance > 24 C11 · absent key C6 | - |
| Outline delivery (2) | WARN text C21 · exit 0 C21 | - |
| Catalog backgrounds (15) | C13, table-driven over all 15 | - |
| Catalog fx (9) | C14, table-driven over all 9 | - |
| Tiles (12) | C15, table-driven over all 12 | - |
| Hero anim PNGs (325) | C17, table-driven over all 325 | - |
| Layer anims (5) | idle C19 · walk C19 · run C19 · jump C19 · interact C19 | - |

- No `Surface` routes in the plan
- Claims about `GameArt` width: C5 crosses that boundary in `GameArt.test.tsx`

## Test policy

Answered by `AGENTS.md` `## Test policy`; the rows below are its application here, not new rules.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Decides, reached across a boundary | one at the boundary and one at its own layer | the contract at the boundary; one asserted case per row at its own layer |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `fidelity.py` IoU gate, ink-edge ratio, light delta, specular count, distance > 24, twin-key equality: six decision points -> decides, not reached across a boundary; C2-C4, C6-C16, C20 at its own layer (`unittest`, same shape as `test_render.py`)
- `render.py` `report`: warnings do not set the exit bit -> decides; C21
- `hero_anim.py` writes one strip per assigned layer × five anims -> decides; C17, C19 (precedent: `test_render.py` `test_hero_anim_writes_a_strip_per_layer_and_anim`)
- `GameArt.tsx` `nativeSize`: icon kinds return 16, times scale -> decides, reached from the screen; C5 at the component (`GameArt.test.tsx`, precedent: game-art C1) and the spec size at `test_fidelity.py`

Cost: 21 proofs in one new `test_fidelity.py`, plus the existing `GameArt` row reused by C5. No guideline file changes.

## Swept

- validation: C10, C16 - spec `size` stays the value on `origin/main`; C7 traces at that size
- failure modes: C11 - mean distance > 24 writes nothing; C6 - a missing twin key fails the set
- idempotency: C17 - a second `hero_anim.py` render matches the committed PNGs
- authorization: existing - `/art/*` is public static; `GameShell` redirects to `/login` before any scene
- concurrency: n/a - no request handles these files; the checks read the tree in one process
- data lifecycle: n/a - no player rows; PNGs stay the build output of their specs (`make art-check`)
- dependency failure: C21 - the renderer still exits 0 when the only problem is a warning, which is the hero-layer case the plan keeps
- state transitions: C19 - one changed layer moves its five strips and does not move another layer's strip
- observability: n/a - no log or metric in the plan; `make art-check` already prints the first diff

## Handoff

Intended split, with the arithmetic, written before any code:

- S1-S4 stay one builder. `test_fidelity.py` + `fidelity.py` are ~30 KB. The twin specs, mostly the four 320×180 scene grids, are the bulk (~500 KB, ~125k tokens). Together with the index and the catalog repairs this sits against the 150k budget because the scene grids do not split without splitting one IoU result. One builder, no handoff.

- **Boundary:** C1-C21 closed in the art-fidelity redraw. `test_fidelity.py` 21 tests green; `make art-check` green; `art.test.tsx` and `GameArt.test.tsx` green.
- **Settled mid-build:** tile keys are `tile/tile-<name>` (the plan had dropped the filename prefix). `icon/btn-settings` and `icon/ic-star` are absent on `origin/main` and are 16×16. Sheet purples sit ~32 from the palette, so a sampled `gap` ramp (door in the plan) brings those traces to ≤ 24. A catalog spec that `use`s a twin keeps the old `use` as a zero-area clip so the library walker still reaches it; the pixels stay the trace.
- **Abandoned:** promoting outline warnings to errors in `render.py` (the plan already rejected that). Reordering `gap` after the specs were written (the indexes are already baked into the grids).
