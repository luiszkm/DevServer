# Assets verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8b082d5..ae38638 (fix range 4f66f0c..ae38638)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Verified at `ae38638` (branch `feat/assets`, clean tree). The scope is the fix commit `ae38638` plus every verdict that was not PASS in round 2. The fix touches only `.claude/skills/pixel-assets/scripts/test_render.py` (2 new tile tests, +20 lines) and `.specs/features/assets/checks.md` (1 Coverage row). It changes no production file. The round-2 verdicts that were not PASS were the tile strip checker Coverage row, the `render.py` part of the "Decides" Test policy row, and the surviving fault 4b. Rows outside that scope are marked `carried from 2335d56`. Their proofs still re-ran in full at `ae38638`. The real tree's `git status --porcelain` was empty before the run and after it (compared with `diff`).

## Binding sources

Carried from 2335d56. Step 1 runs only under `ui`, and this feature was approved under `standard`. The fix did not touch any interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/assests_keyart.png` (binding for inventory and style) | not opened: step 1 is not owed under `standard`. The door-1 inventory was recomputed from disk in round 1 (see Coverage). | - | - |

## Checks

Verified at ae38638. All proofs re-ran at this HEAD in these batched runs:

- **R1** `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: exit 0. 18 tests ran (16 in round 2, plus `test_tile_single_cell_skips_strip_rules_even_when_empty_or_odd_sized` and `test_tile_strip_with_an_empty_frame_warns_it`), `OK`. Each `-k` selector in C1-C7 matches tests in the verbose output: `tile` 6, `anim` 5, `fx` 2, `clip` 1, `sprite_size` 2, `hero_anim` 2.
- **R2** `make art-check`: exit 0, prints `art ok`, 0 `ERROR`, 214 `WARN`. The WARNs are identical-frame warnings on hero strips, the same count as rounds 1 and 2.
- **R3** `cd web && npx vitest run --reporter=verbose` (full suite, which contains the 16 named files): exit 0, 22 files, 582 passed, 0 failed. Every `-t` selector named in C8-C48 matches at least one `✓` line: `new kinds` 9, `chrome piece` 1, `button and generic icon` 1, `medal` 7, `logo` 6, `exit and skill points icons` 1, `lock icon` 3, `price icon` 3, `level medal` 5, `stat icons` 3, `sp icon` 1, `icon fails` 1, `world piece` 8, `new effect` 1, `loading fx` 5, `chest closed` 1, `chest opens` 2, `flag` 2, `teleport` 2, `npc` 2, `robot` 1, `new scene` 1, `tileset` 1, `scene background` 5, `hero strip` 1, `strip frame` 4, `advances` 1, `restarts` 1, `strip fails` 1, `reduced motion` 2, `static` 3, `hero anim` 12.
- **R4** `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts --reporter=list`: exit 0, 17 passed (including 8 `scene art scale` lines, 5 `chrome 9-slice`, 3 `pressed`, 1 `loading loops`). No other dev server was running, so there was no blocker.
- **R5** `cd web && npx tsc --noEmit -p . && npx eslint src e2e`: exit 0.

Citations were refreshed for `test_render.py`, the only test file the fix touched. Every assertion after line 81 moved down by 20 lines. The web citations are carried from 2335d56 because no web file changed in `4f66f0c..ae38638`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tile 32x32/128x32 raise no size WARN; a transparent pixel is ERROR and the run exits 1 | R1 `-k tile`: 6 tests ok | verified at ae38638: `.claude/skills/pixel-assets/scripts/test_render.py:52` `assertEqual(size_warnings(warnings), [], w)`; `:58-59` `assertEqual(len(errors), 1)` + `assertIn("transparent", errors[0])`; `:64-65` `assertEqual(run.returncode, 1)` + `assertIn("ERROR", run.stdout)`. The new tile strip cases are listed under Coverage: `:88`, `:91-92`, `:99-101` | PASS |
| C2 | anim 192x64 raises no size WARN; one WARN naming the frame for margin, empty or identical; a clean strip is ok | R1 `-k anim`: 5 ok | verified at ae38638 (lines moved +20): `test_render.py:114` `assertEqual(size_warnings(warnings), [])`; `:120-122` `len(warnings)==1`, `"frame 1"`, `"margin"`; `:126` `assertEqual(warnings, ["frame 2 is empty"])`; `:131-132` `len(warnings)==1`, `"frames 0 and 3 are identical"`; `:110` `assertEqual((errors, warnings), ([], []))` | PASS |
| C3 | fx keeps the margin, empty and identical WARNs on 32x32 cells; a clean strip is ok | R1 `-k fx`: 2 ok | verified at ae38638 (lines moved +20): `test_render.py:147-151` `len(warnings)==3`, `"frame 0"`+`"margin"`, `"frame 2 is empty"`, `"frames 1 and 3 are identical"`; `:140` `assertEqual(self.check({...None}), ([], []))` | PASS |
| C4 | clip [2,3,4,5] at [10,0] copies exactly that box, and nothing outside it changes | R1 `-k clip`: 1 ok | verified at ae38638 (lines moved +20): `test_render.py:169` `assertEqual(out[y][x], src[y + 3][x - 8], (x, y))`; `:171` `assertEqual(out[y][x], sky, (x, y))` | PASS |
| C5 | sprite 96x96/64x64/160x64 raise no size WARN; 100x100 raises one | R1 `-k sprite_size`: 2 ok | verified at ae38638 (lines moved +20): `test_render.py:181` `assertEqual(size_warnings(warnings), [], (w, h))`; `:185` `assertEqual(len(size_warnings(warnings)), 1)` | PASS |
| C6 | `make art-check` exits 0 and prints `art ok` | R2 | carried from 2335d56 (Makefile untouched): `Makefile:31-33` `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art && echo "art ok"`; observed at ae38638: exit 0 + `art ok` | PASS |
| C7 | hero_anim writes layer x 5 anim specs (anim, 192x64); an unassigned layer exits 1 naming the layer and writes nothing | R1 `-k hero_anim`: 2 ok | verified at ae38638 (lines moved +20): `test_render.py:209` `assertEqual(written, expected)`; `:213` `assertEqual((spec["category"], spec["size"]), ("anim", [192, 64]), f)`; `:223` `assertEqual(hero_anim.main(["--hero", d]), 1)`; `:224` `assertIn("cape", out.getvalue())`; `:225` `assertNotIn("body", out.getvalue().split(":")[-1])`; `:226` `listdir(...) == []` | PASS |
| C8 | new kinds map to icon/16 or sprite/32 (server-hut 96); the old kinds keep their paths | R3 `new kinds` 9 rows | carried from 2335d56: `web/src/components/GameArt.test.tsx:61-63` `getAttribute("src")).toBe(src)`, `width`/`height` `toBe(String(size))` over 8 kinds; old kinds `GameArt.test.tsx:21-26` `address and size` (ran in R3; see precision notes) | PASS |
| C9 | 10 ui pieces have spec and 24x24 PNG | R3 `chrome piece, 24x24` | carried from 2335d56: `web/src/lib/art.test.tsx:387-390` 10 literals via `:55-57` `existsSync(spec)`/`existsSync(png)` `toBe(true)`, `pngSize(png)).toEqual(size)` | PASS |
| C10 | 8 btn-* and 15 ic-* have spec and 16x16 PNG | R3 `button and generic icon, 16x16` | carried from 2335d56: `art.test.tsx:396-398` `expect(btn).toHaveLength(8)`, `expect(ic).toHaveLength(15)`, `expectAssets(sized("icon",[16,16],...))` | PASS |
| C11 | 6 medals have spec and 16x16 PNG | R3 `medal, 16x16` | carried from 2335d56: `art.test.tsx:402` `expectAssets(sized("icon", [16, 16], [...6].map(m => "medal-"+m)))` | PASS |
| C12 | logo spec and 160x64 PNG | R3 `logo, 160x64` | carried from 2335d56: `art.test.tsx:406` `expectAssets([{ category: "sprite", name: "logo", size: [160, 64] }])` | PASS |
| C13 | computed border-image-source per chrome class, slice `8 fill`, pixelated | R4 `chrome 9-slice` x5 | carried from 2335d56: `web/e2e/assets.spec.ts:42-44` `expect(s.source).toContain(piece)`, `expect(s.slice).toBe("8 fill")`, `expect(s.rendering).toBe("pixelated")` | PASS |
| C14 | mouse held on a button shows its `-press` piece | R4 `pressed` x3 | carried from 2335d56: `assets.spec.ts:53-56` `page.mouse.down()` then `expect(s.source).toContain(piece.replace(".png", "-press.png"))` | PASS |
| C15 | GameShell header img alt DevServer, logo.png, 160x64, pixelated, no DEV/SERVER text | R3 `GameShell assets > logo` | carried from 2335d56: `web/src/components/GameShell.test.tsx:148-153` `src toBe("/art/sprite/logo.png")`, `width "160"`, `height "64"`, `toContain("pixelated")`, `textContent).not.toMatch(/DEV\|SERVER/)` | PASS |
| C16 | LoginScreen h1 named DevServer holds logo 320x128 | R3 `LoginScreen > logo` | carried from 2335d56: `web/src/components/LoginScreen.test.tsx:9` `getByRole("heading", { level: 1, name: "DevServer" })`; `:11-14` `src`, `width "320"`, `height "128"` | PASS |
| C17 | SAIR keeps its name and holds btn-exit; ic-star precedes SKILL PTS | R3 `exit and skill points icons` | carried from 2335d56: `web/src/components/Hud.test.tsx:115-116` `getByRole("button", { name: "SAIR" })` + `expectIcon(sair.querySelector("img"), "/art/icon/btn-exit.png")`; `:118-119` `expectIcon(label.firstElementChild, ".../ic-star.png")`, `label.firstChild).toBe(label.firstElementChild)` | PASS |
| C18 | locked skill node: ic-lock before BLOQ.; unlockable: no lock | R3 `SkillsScene assets > lock icon` | carried from 2335d56: `web/src/components/SkillsScene.test.tsx:185-187` `textContent).toBe("BLOQ.")`, `expectIcon(locked.firstElementChild, ...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:189` `toBeNull()` | PASS |
| C19 | region under minLevel: lock before REQUER NÍVEL n; open: none | R3 `WorldScene assets > lock icon` | carried from 2335d56: `web/src/components/WorldScene.test.tsx:167-169` `toHaveTextContent("REQUER NÍVEL 5")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:170` `toBeNull()` | PASS |
| C20 | locked deploy level: lock before NÍVEL n; open: none | R3 `DeployScene assets > lock icon` | carried from 2335d56: `web/src/components/DeployScene.test.tsx:404-406` `textContent).toBe("NÍVEL 3")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:407` `toBeNull()` | PASS |
| C21 | LOJA coin/gem price cards: icon before the number | R3 `ShopScene assets > price icon` | carried from 2335d56: `web/src/components/ShopScene.test.tsx:498-500` `textContent).toBe("12g")`, `expectIcon(gemPrice.firstElementChild, "/art/icon/hud-gem.png")`, `expect(gemPrice.firstChild).toBe(gemPrice.firstElementChild)`; `:502-504` `"50c"`, `hud-coin`, `coinPrice.firstChild).toBe(coinPrice.firstElementChild)` | PASS |
| C22 | OFFICE coins/gems tags: icon before the number | R3 `OfficeScene assets > price icon` | carried from 2335d56: `web/src/components/OfficeScene.test.tsx:356-358` `textContent).toBe("60C")`, `expectIcon(coins.firstElementChild, ".../hud-coin.png")`, `expect(coins.firstChild).toBe(coins.firstElementChild)`; `:360-362` `"60G"`, `hud-gem`, `gems.firstChild).toBe(gems.firstElementChild)` | PASS |
| C23 | SERVER component card: hud-coin before its price | R3 `ServerScene assets > price icon` | carried from 2335d56: `web/src/components/ServerScene.test.tsx:313-315` `textContent).toBe("80C")`, `expectIcon(price.firstElementChild, ".../hud-coin.png")`, `expect(price.firstChild).toBe(price.firstElementChild)` | PASS |
| C24 | office levels 1..5 -> medal bronze..roxo, 32px, before the name | R3 `level medal (0..4)` 5 rows | carried from 2335d56: `OfficeScene.test.tsx:377-379` `textContent).toBe(name)`, `expectIcon(level.firstElementChild, "/art/icon/medal-${medal}.png", 32)`, `firstChild).toBe(firstElementChild)`; rows `:369-373` CANTINHO->bronze .. SEDE DEVSERVE->roxo | PASS |
| C25 | POWER <- ic-chart, RAM <- ic-database, UPTIME <- ic-shield | R3 `stat icons (power/ram/uptime)` | carried from 2335d56: `ServerScene.test.tsx:327-328` `expectIcon(label.firstElementChild, "/art/icon/${icon}.png")`, `label.firstChild).toBe(label.firstElementChild)` over rows `:320-322` | PASS |
| C26 | Bug Fight SP line preceded by ic-sp 16px | R3 `sp icon` | carried from 2335d56: `web/src/components/BattleScene.test.tsx:509` `getAttribute("src")).toBe("/art/icon/ic-sp.png")`; `:512` `expect(sp.firstChild).toBe(img)` | PASS |
| C27 | after error on btn-exit: no img, text exactly SAIR, nothing added | R3 `icon fails` | carried from 2335d56: `Hud.test.tsx:127-129` `querySelector("img")).toBeNull()`, `textContent).toBe("SAIR")`, `children).toHaveLength(0)` | PASS |
| C28 | each prop/build/mob/npc/extra has spec and native-size PNG | R3 `world piece sprites` | carried from 2335d56: `art.test.tsx:413-419` literals with `build-server-hut` `[96, 96]`, the rest `[32, 32]`, via `:55-57` | PASS |
| C29 | 6 new fx have spec and 128x32 PNG | R3 `new effect strips, 128x32` | carried from 2335d56: `art.test.tsx:423` `expectAssets(sized("fx", [128, 32], [6 names]))` | PASS |
| C30 | 5 loading sites: CARREGANDO... plus span.fx-loading aria-hidden, url(/art/fx/loading.png) | R3 `loading fx` x5 | carried from 2335d56: `GameShell.test.tsx:159-161,169`, `Hud.test.tsx:135-137,144`, `DeployScene.test.tsx:413-415,423`, `Onboarding.test.tsx:184-186,194`; Bug Fight `BattleScene.test.tsx:519` `getAttribute("aria-hidden")).toBe("true")`, `:520` `backgroundImage...toBe("url(/art/fx/loading.png)")`, called at `:528` on `getByText("CARREGANDO...")` | PASS |
| C31 | .fx-loading infinite, pixelated; reduced motion -> animation-name none | R4 `loading loops` | carried from 2335d56: `assets.spec.ts:69-72` `count).toBe("infinite")`, `rendering).toBe("pixelated")`, `name).toBe("none")` after `emulateMedia({ reducedMotion: "reduce" })` | PASS |
| C32 | ready job: COLETAR RECOMPENSA keeps its name and holds extra-bau 32px | R3 `chest closed on the claim button` | carried from 2335d56: `DeployScene.test.tsx:430-434` `findByRole("button", { name: "COLETAR RECOMPENSA" })`, `src toBe("/art/sprite/extra-bau.png")`, `alt ""`, `width "32"` | PASS |
| C33 | claim 200 -> extra-bau-aberto 64px plus data-fx collect; error -> neither | R3 `chest opens after a 200 claim`, `chest opens only on success (claim error)` | carried from 2335d56: `DeployScene.test.tsx:445-451` `extra-bau-aberto`, `width "64"`, `toBe("url(/art/fx/collect.png)")`; `:462-463` both `toBeNull()` | PASS |
| C34 | exactly one build-flag 32px inside .node-marker.here of player.region | R3 `flag on the current marker only` | carried from 2335d56: `WorldScene.test.tsx:179-182` `toHaveLength(1)`, `closest(".node-marker.here")).toBe(marker("floresta"))`, `alt ""`, `width "32"` | PASS |
| C35 | travel 200 -> data-fx teleport in the new region's .map-node; error -> none | R3 `teleport after a 200 travel`, `teleport only on success (travel error)` | carried from 2335d56: `WorldScene.test.tsx:192-194` `closest("[data-region]")...toBe("floresta")`, `toBe("url(/art/fx/teleport.png)")`; `:202` `toBeNull()` | PASS |
| C36 | LOJA npc-dev alt lojista 64px plus the bubble text; SERVER mob-robo alt robô 64px | R3 `npc with the tip bubble`, `robot beside the terminal` | carried from 2335d56: `ShopScene.test.tsx:512-515` `getByRole("img", { name: "lojista" })`, `src).toBe("/art/sprite/npc-dev.png")`, `width).toBe("64")`, `getByText("FORJE GEAR COM OS DROPS DO BUG FIGHT!")).toBeInTheDocument()`; `ServerScene.test.tsx:336-338` `getByRole("img", { name: "robô" })`, `src).toBe("/art/sprite/mob-robo.png")`, `width).toBe("64")` | PASS |
| C37 | 4 scenes: spec and 320x180 PNG, every pixel alpha 255 | R3 `new scene, 320x180, opaque` | carried from 2335d56: `art.test.tsx:428-429` `expectAssets(scenes)` + `expectOpaque(scenes)` -> `:381` `expect.soft(transparent, png).toBe(0)` | PASS |
| C38 | 12 tiles opaque at 32x32/128x32; 5 decals at their size | R3 `tileset tiles and decals` | carried from 2335d56: `art.test.tsx:434-442` 9 at `[32,32]` + agua/agua-funda/cachoeira at `[128,32]`, `expectOpaque(tiles)`; decals `[32,32]`, `tile-arvore-grande` `[64,64]` | PASS |
| C39 | section.scene inline bg dia/noite/floresta/dungeon; browser 1280px 720px, pixelated | R3 `scene background` x4; R4 `scene art scale section.*` | carried from 2335d56: `DeployScene.test.tsx:473`, `SkillsScene.test.tsx:198`, `AvatarScene.test.tsx:478`, `ShopScene.test.tsx:524` `backgroundImage...toBe("url(/art/background/scene-dungeon.png)")`; `web/e2e/art.spec.ts:27` `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C40 | every hero layer x 5 anims: spec and 192x64 PNG | R3 `hero strip per layer and anim, 192x64` | carried from 2335d56: `art.test.tsx:447` layers from `readdirSync(...sprite/hero)`; `:453-455` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual([192, 64])` | PASS |
| C41 | heroFrame src, sx 48i, sy 0, 48x64, same swap, i 0..3 | R3 `strip frame 0..3` | carried from 2335d56: `web/src/lib/avatar.test.tsx:157-164` `toEqual({ src: ".../anim/hair-curto-f-walk.png", sx: 48 * i, sy: 0, w: 48, h: 64, swap: {...} })` | PASS |
| C42 | anim walk: data-anim walk, data-frame 0 -> 1 -> 2 -> 3 -> 0 every 166 ms | R3 `advances a frame every 166 ms` | carried from 2335d56: `web/src/components/HeroAvatar.test.tsx:68-69` `dataset.anim).toBe("walk")`, `frame).toBe("0")`; `:72` `frame).toBe(next)` for `["1","2","3","0"]` after each `advanceTimersByTimeAsync(166)` | PASS |
| C43 | walk at frame 2 -> run: frame 0, anim run, and an old-anim strip load that resolves afterwards paints nothing | R3 `restarts at frame 0 when the anim changes` | carried from 2335d56: `HeroAvatar.test.tsx:84-85` `anim).toBe("run")`, `frame).toBe("0")`; `:90` `loaded.some(src => src.endsWith("-walk.png"))).toBe(true)`; `:91` `draws.every(d => d.src.endsWith("-run.png"))).toBe(true)` | PASS |
| C44 | failed strip -> that layer's static PNG at 0,0, others from strips, frame keeps advancing | R3 `draws the static layer when its strip fails` | carried from 2335d56: `HeroAvatar.test.tsx:100` `toContainEqual({ src: broken, sx: 0 })`; `:101` `toContainEqual({ src: strip(other, "idle"), sx: 0 })`; `:103` `frame).toBe("1")`; `:105` `sx: 48` | PASS |
| C45 | reduced motion + anim run: static PNGs only, data-frame 0 after 1000 ms | R3 `reduced motion draws the static layers on frame 0` | carried from 2335d56: `HeroAvatar.test.tsx:112` `frame).toBe("0")`; `:114` `loaded.every(src => !src.includes("/anim/"))).toBe(true)` | PASS |
| C46 | without anim: static PNGs only, no data-frame, no timer | R3 `static without anim: no frame and no timer` | carried from 2335d56: `HeroAvatar.test.tsx:119` `frame).toBeUndefined()`; `:122` `vi.getTimerCount()).toBe(0)`; `:123-124` no `/anim/`, `loaded.length).toBe(layers.length)` | PASS |
| C47 | Bug Fight hero anim: lunge->run, cast->interact, won->jump, none->idle, hit->idle (plus fall/flee->idle per the added coverage row) | R3 `hero anim on beat lunge/cast/hit/fall/flee`, `with no beat is idle`, `when the battle is won is jump` | carried from 2335d56: `BattleScene.test.tsx:386-390` rows `lunge`->`run`, `cast`->`interact`, `hit`->`idle`, `fall`->`idle`, `flee`->`idle`, with `:393` `expect(heroAnim()).toBe(anim)`; `:400` `toBe("idle")`; `:407` `toBe("jump")` | PASS |
| C48 | AVATAR preview idle; DEPLOY interact running / idle ready; MUNDO idle beside marker / walk pending | R3 5 `hero anim:` tests | carried from 2335d56: `AvatarScene.test.tsx:487` `anim).toBe("idle")`; `DeployScene.test.tsx:484` `toBe("interact")`, `:491` `toBe("idle")`; `WorldScene.test.tsx:211-213` canvas in `data-region="floresta"` `toBe("idle")`; `:220` `toBe("walk")` | PASS |

**48 of 48 proven with located evidence.**

### Precision gaps, carried

Carried from 2335d56. The fix touched none of these surfaces.

- **C36: robot "beside the terminal" (plan AC 24) and the `ui-bubble` chrome (AC 23). Precision note, not a finding.** There is no check for either, so there is no check to contradict. Step 1 is not owed under `standard`. Both are present in the code at `web/src/components/ServerScene.tsx:146-148` and `web/src/app/globals.css:241`.
- **C47: beat vs `won` priority. Precision note.** Plan AC 33 does not decide it. The code gives the beat priority (`BattleScene.tsx:24-26`).
- **C8: the "old kinds keep their paths" selector. Precision note.** The assertion `GameArt.test.tsx:21-26` exists and ran in R3. The check's `-t "new kinds"` selector alone would miss it.

### Swept rows marked existing

Carried from 2335d56. authorization: `GameShell.tsx:33` and `:73` render `<LoginScreen />` on `401` before any scene. `render.py` exit 1 on ERROR: `test_render.py:64`.

## Coverage

Verified at ae38638 for the tile strip checker row, whose round-2 verdict was not PASS and whose proof file the fix touched. The other rows are carried from 2335d56. Their authority (disk, catalog JSON, `GameArt.tsx`, `globals.css`, `HeroAvatar.tsx`, `BattleScene.tsx`, `hero_anim.py`) is unchanged in `4f66f0c..ae38638`.

The tile strip checker set was recomputed from `render.py` at ae38638. It has these parts:

- the gate at `render.py:382`: `category in STRIP_CELLS and (category != "tile" or w > STRIP_CELLS["tile"][0])`. It gives two rows, a tile no wider than 32 (skip) and a tile wider than 32 (run).
- `check_strip_frames` at `render.py:387-407`, run with `(32, 32, margin=False)` on tiles. Its decisions are:
  - the strip shape guard, `:390-391` `if h != cell_h or w % cell_w: return ["strip must be N frames of {cell_w}x{cell_h} side by side"]`
  - the margin rule, off for tiles through `MARGINLESS`, `:52` and `:396-399`
  - the empty-frame rule, `:401-402`
  - the identical-frames rule, `:403-406`

That makes 6 members.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door-1 assets (101 in 14 groups) | carried from 2335d56: files on disk under `web/art`, `web/public/art` | C9-C12, C28, C29, C37, C38; literals equal disk 1:1 | - |
| hero strips (61 layers x 5 anims = 305) | carried from 2335d56: `ls web/public/art/sprite/hero/*.png` = 61 | C40 from disk; R2 re-renders all byte-identically at ae38638 | - |
| office levels -> medal (5) | carried from 2335d56: `api/catalog/office.json` levels | C24 one row per level (`OfficeScene.test.tsx:369-373`) | - |
| rack stats -> icon (3) | carried from 2335d56: `api/catalog/rack.json` stats | C25 (`ServerScene.test.tsx:320-322`) | - |
| hero beat kinds -> anim (5 beats + no beat + won = 7) | carried from 2335d56: `web/src/lib/battleFx.ts:3`, `:88-91` | lunge, cast, hit, fall, flee C47 (`BattleScene.test.tsx:386-393`) · none `:400` · won `:407` | - |
| tile strip checker (6) | verified at ae38638: gate `render.py:382`; `check_strip_frames` `render.py:387-407` with `STRIP_CELLS["tile"] = (32, 32)` `:51` and `MARGINLESS = {"tile"}` `:52` | gate, skip at w <= 32: C1 `test_render.py:88` `assertEqual(warnings, [])` on a fully transparent 32x32 tile, and `:91-92` exactly one warning, `"not a standard tile size"`, on a 16x16 tile (faults F1, F3 and F4 killed) · gate, run at w > 32: C1 `:73`, `:76-77`, `:101` · margin skipped: C1 `:73` `assertEqual((errors, warnings), ([], []))` (round-2 fault 4a killed; carried) · empty frame: C1 `:101` `assertEqual(warnings, ["frame 2 is empty"])` (fault F2 killed) · identical frames: C1 `:76-77` `len(warnings)==6`, `all("identical" in w ...)` | the strip shape guard (`render.py:390-391`): no test asserts `"strip must be N frames of ..."` for any category (`rg "strip must be" test_render.py` finds 0 hits). Fault F5 (`if h != cell_h or w % cell_w:` -> `if False:`) survived the full `test_render.py`, 18/18 ok. At HEAD a 128x48 tile or a 100x32 tile warns `strip must be N frames of 32x32 side by side`. On the mutant, the same tiles get per-frame `identical` warnings instead. Plan door 2 decides that "o checker de strip recebe o tamanho do frame (`fx` 32x32, `anim` 48x64, `tile` 32x32)", and this guard is the rule that rejects a strip not made of those frames. The feature rewrote it from `FX_CELL` to `cell_w`/`cell_h`, so its `anim` and `tile` rows are new |
| renderer size/opacity by category (tile, anim, sprite, fx) | carried from 2335d56: `render.py:37-47` | tile C1 · anim C2 · sprite C5 · fx C3 | - |
| new ArtKinds (8) | carried from 2335d56: `GameArt.tsx:10-13` | C8 one row per kind | - |
| chrome classes (5) + pressed (3) | carried from 2335d56: `globals.css` | C13 x5, C14 x3 (browser) | - |
| loading sites (5) | carried from 2335d56: `grep CARREGANDO src` | C30 all five | - |
| scene backgrounds (4) | carried from 2335d56: `section.scene` inline styles | C39 unit x4 + browser | - |
| HeroAvatar branch points (6) | carried from 2335d56: `HeroAvatar.tsx:93-96,109` | clock C42 · reset C43 · fallback C44 · reduced motion C45 · static C46 · stale-load cancel C43 `HeroAvatar.test.tsx:91` | - |
| HeroAvatar `anim` call sites (5) | carried from 2335d56: `grep '<HeroAvatar' src` | C48 · C47 · static sites C46 | - |
| price sites (3 screens, 5 tags), order icon -> number | carried from 2335d56: `OfficeScene.tsx:87`, `ShopScene.tsx:56`, `ServerScene.tsx:138` | Shop C21 `:500,:504` · Office C22 `:358,:362` · Server C23 `:315` | - |
| hero_anim.py outcomes (2) | carried from 2335d56: `hero_anim.py:56-59` | write C7 `test_render.py:209-213` · unassigned exits 1, names the layer, writes nothing C7 `:223-226` | - |
| lock sites (3), chest states (3), travel outcomes (2) | carried from 2335d56 | C18-C20 · C32-C33 · C35 | - |

One of 16 sets has an unproven member. The round-2 gaps (the `w > 32` gate and the tile empty-frame WARN) are closed, and each has a killed mutant. The new `checks.md` row "tile strip gate and empty frame (2)" matches the code for the members it names. The shape guard is a member that none of the three tile rows in `checks.md` names.

## Test policy rows

Verified at ae38638 for the "Decides" row, which was unmet in round 2 and classifies `render.py`, the file whose tests the fix touched. The Instrumentation row is carried from 2335d56.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `render.py` (SIZES, opacity, strip checker), `hero_anim.py`, `GameArt.tsx` artSrc/nativeSize, `HeroAvatar.tsx`, `BattleScene.tsx` BEAT_ANIM/heroAnim, `OfficeScene.tsx` MEDALS | own layer: C1-C5, C7, C8, C42-C46, C47, C24 | no. `render.py`'s tile gate (`:382`) and tile empty-frame rule (`:401-402`) are now met, and their mutants F1-F4 were killed. `check_strip_frames`' shape-guard row (`render.py:390-391`) has no asserted case in any category, and fault F5 survived. The `checks.md` Test policy evidence counts "3 strip rules × 2 cell sizes" and leaves this row out. `hero_anim.py`, `GameArt.tsx`, `HeroAvatar.tsx`, `BattleScene.tsx` and MEDALS are carried from 2335d56 as met |
| Instrumentation, pass-throughs | `LoadingFx.tsx`, `Logo.tsx`, `PriceArt` in `GameArt.tsx`, screen wiring of fixed icons | none of its own; covered by consumer proofs | yes (carried from 2335d56): C30/C33/C35, C15/C16, C21-C23 |

## Faults injected

Verified at ae38638. Each fault ran in a scratch `git worktree add --detach <scratchpad>/wt3 HEAD`, and F5 ran in `wt4`. Each fault was reverted with `git checkout` in the scratch before the next one, and both worktrees were removed. `git worktree list` shows only the real tree. The real tree's porcelain was empty before and after, compared with `diff`. Faults F1-F4 target the two surfaces the fix added assertions for. F5 targets the remaining decision of the recomputed tile strip checker set.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: the tile gate dropped, `(category != "tile" or w > STRIP_CELLS["tile"][0])` -> `True` | `.claude/skills/pixel-assets/scripts/render.py:382` | yes. `test_render.py -k tile` failed `test_tile_single_cell_skips_strip_rules_even_when_empty_or_odd_sized` at `:88` (`['frame 0 is empty'] != []`) |
| F2: the empty-frame WARN removed (`:401-402` deleted) | `.claude/skills/pixel-assets/scripts/render.py:401-402` | yes. `-k tile` failed `test_tile_strip_with_an_empty_frame_warns_it` at `:101` (`[] != ['frame 2 is empty']`) |
| F3: gate boundary, `w > 32` -> `w >= 32` | `.claude/skills/pixel-assets/scripts/render.py:382` | yes. `-k tile` failed at `:88` (`['frame 0 is empty'] != []`) |
| F4: gate, `w > 32` -> `w != 32` (strip rules run on a 16x16 tile only) | `.claude/skills/pixel-assets/scripts/render.py:382` | yes. `-k tile` failed at `:91` (`2 != 1`), which is the 16x16 half of the new test |
| F5: strip shape guard disabled, `if h != cell_h or w % cell_w:` -> `if False:` | `.claude/skills/pixel-assets/scripts/render.py:390` | no. It survived the full `test_render.py`, 18/18 ok. A probe shows that the mutant is not equivalent: at HEAD a 128x48 or a 100x32 tile warns `strip must be N frames of 32x32 side by side`, and on the mutant it gets `frames i and j are identical` warnings instead |

5 faults were injected, the cap. 4 were killed and 1 survived.

## Gate

Verified at ae38638.

- `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 18 passed, 0 failed.
- `make art-check`: exit 0, `art ok`, 0 ERROR, 214 WARN (identical-frame warnings on hero strips; allowed, unchanged).
- `cd web && npx vitest run` (full suite): 22 files, 582 passed, 0 failed.
- `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts`: 17 passed, 0 failed.
- `cd web && npx tsc --noEmit -p .`: exit 0.
- `cd web && npx eslint src e2e`: exit 0.

The suites are green, 48/48 checks are proven, and both round-2 gaps are closed with killed mutants (F1-F4). The verdict is still FAIL because of one surviving mutant on the tile strip checker. That same gap leaves one Coverage member unproven and one Test policy row unmet. This is round 3, the last round the three-round bound allows, so the gap goes to the user rather than back to a builder.

Ranked gaps:

1. **Surviving mutant, Coverage and Test policy: the strip shape guard in `check_strip_frames`** (`.claude/skills/pixel-assets/scripts/render.py:390-391`). No test asserts `strip must be N frames of {cell_w}x{cell_h} side by side`. The feature rewrote this guard from `FX_CELL` to per-category cells, `tile` 32x32 and `anim` 48x64. Fault F5, which disables the guard, passes all 18 renderer tests. A distinguishing case would be a 128x48 (or 100x32) tile that asserts a warning list containing `strip must be N frames of 32x32 side by side` and no `identical` warning. The same could be done for an anim strip that is not 48x64-based. The `checks.md` Test policy evidence ("3 strip rules × 2 cell sizes") and its tile Coverage rows leave this member out.

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py assets` exits 1, which is the right result for a FAIL verdict.
