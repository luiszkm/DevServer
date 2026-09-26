# Assets verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 8b082d5..0ad1628 (fix range b14a39c..0ad1628)
**Round**: 4 - scoped (user-authorized beyond the 3-round bound)
**Verifier**: independent sub-agent (author != verifier)

Verified at `0ad1628` (branch `feat/assets`, clean tree). Round 3 hit the three-round bound, and the user authorized this 4th round. The scope is the fix commit `0ad1628` plus every verdict that was not PASS in round 3. The fix touches only `.claude/skills/pixel-assets/scripts/test_render.py` (2 new tests, +13 lines) and `.specs/features/assets/checks.md` (1 Coverage row). It changes no production file and no web file. The round-3 verdicts that were not PASS were:

- the tile strip checker Coverage row, where the strip shape guard was unproven
- the `render.py` part of the "Decides" Test policy row
- fault F5, which survived

Rows outside that scope are marked `carried from ae38638`. Their proofs still re-ran in full at `0ad1628`. The real tree's `git status --porcelain` was empty before the run and after it (compared with `diff`).

## Binding sources

Carried from ae38638. Step 1 runs only under `ui`, and this feature was approved under `standard`. The fix did not touch any interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/assests_keyart.png` (binding for inventory and style) | not opened: step 1 is not owed under `standard`. The door-1 inventory was recomputed from disk in round 1 (see Coverage). | - | - |

## Checks

Verified at 0ad1628. All proofs re-ran at this HEAD in these batched runs:

- **R1** `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: exit 0, 20 tests ran, `OK`. That is 18 from round 3 plus `test_tile_strip_of_the_wrong_shape_warns_the_shape` and `test_anim_strip_of_the_wrong_shape_warns_the_shape`. Hits per `-k` selector: `tile` 7, `anim` 8 (6 `AnimStripTest` + 2 `hero_anim`), `fx` 2, `clip` 1, `sprite_size` 2, `hero_anim` 2. `-k tile -k anim` ran 15 tests, `OK`.
- **R2** `make art-check`: exit 0, `art ok`, 0 `ERROR`, 214 `WARN`. The WARNs are the identical-frame warnings on hero strips, the same count as rounds 1-3.
- **R3** `cd web && npx vitest run --reporter=verbose` (full suite, which contains the 16 named files): exit 0, 22 files, 582 passed, 0 failed, 0 `×`. Every `-t` selector named in C8-C48 matches at least one `✓` line. The counts are the same as round 3: `new kinds` 9, `chrome piece` 1, `button and generic icon` 1, `medal` 7, `logo` 6, `exit and skill points icons` 1, `lock icon` 3, `price icon` 3, `level medal` 5, `stat icons` 3, `sp icon` 1, `icon fails` 1, `world piece` 8, `new effect` 1, `loading fx` 5, `chest closed` 1, `chest opens` 2, `flag` 2, `teleport` 2, `npc` 2, `robot` 1, `new scene` 1, `tileset` 1, `scene background` 5, `hero strip` 1, `strip frame` 4, `advances` 1, `restarts` 1, `strip fails` 1, `reduced motion` 2, `static` 3, `hero anim` 12.
- **R4** `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts --reporter=list`: exit 0, 17 passed: 8 `scene art scale`, 5 `chrome 9-slice`, 3 `pressed`, 1 `loading loops`. Playwright did not report another dev server, so there was no blocker.
- **R5** `cd web && npx tsc --noEmit -p . && npx eslint src e2e`: exit 0.

Citations were refreshed for `test_render.py`, the only test file the fix touched. Assertions after line 102 moved by +7, and those after line 130 moved by +13. The web citations are carried from ae38638 because no web file changed in `b14a39c..0ad1628`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tile 32x32/128x32 raise no size WARN; a transparent pixel is ERROR and the run exits 1 | R1 `-k tile`: 7 ok | verified at 0ad1628: `.claude/skills/pixel-assets/scripts/test_render.py:52` `assertEqual(size_warnings(warnings), [], w)`; `:58-59` `assertEqual(len(errors), 1)` + `assertIn("transparent", errors[0])`; `:64-65` `assertEqual(run.returncode, 1)` + `assertIn("ERROR", run.stdout)`. Tile strip cases (see Coverage): `:73`, `:76-77`, `:88`, `:91-92`, `:101`, and the new shape case `:107-108` | PASS |
| C2 | anim 192x64 raises no size WARN; one WARN naming the frame for margin, empty or identical; a clean strip is ok | R1 `-k anim`: 8 ok | verified at 0ad1628: `test_render.py:121` `assertEqual(size_warnings(warnings), [])`; `:127-129` `len(warnings)==1`, `"frame 1"`, `"margin"`; `:139` `assertEqual(warnings, ["frame 2 is empty"])`; `:144-145` `len(warnings)==1`, `"frames 0 and 3 are identical"`; `:117` `assertEqual((errors, warnings), ([], []))`. New shape case `:134-135` | PASS |
| C3 | fx keeps the margin, empty and identical WARNs on 32x32 cells; a clean strip is ok | R1 `-k fx`: 2 ok | verified at 0ad1628 (lines moved +13): `test_render.py:160-164` `len(warnings)==3`, `"frame 0"`+`"margin"`, `"frame 2 is empty"`, `"frames 1 and 3 are identical"`; `:153` `assertEqual(self.check({...None}), ([], []))` | PASS |
| C4 | clip [2,3,4,5] at [10,0] copies exactly that box, and nothing outside it changes | R1 `-k clip`: 1 ok | verified at 0ad1628 (lines moved +13): `test_render.py:182` `assertEqual(out[y][x], src[y + 3][x - 8], (x, y))`; `:184` `assertEqual(out[y][x], sky, (x, y))` | PASS |
| C5 | sprite 96x96/64x64/160x64 raise no size WARN; 100x100 raises one | R1 `-k sprite_size`: 2 ok | verified at 0ad1628 (lines moved +13): `test_render.py:194` `assertEqual(size_warnings(warnings), [], (w, h))`; `:198` `assertEqual(len(size_warnings(warnings)), 1)` | PASS |
| C6 | `make art-check` exits 0 and prints `art ok` | R2 | carried from ae38638 (Makefile untouched): `Makefile:31-33` `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art && echo "art ok"`; observed at 0ad1628: exit 0 + `art ok` | PASS |
| C7 | hero_anim writes layer x 5 anim specs (anim, 192x64); an unassigned layer exits 1 naming the layer and writes nothing | R1 `-k hero_anim`: 2 ok | verified at 0ad1628 (lines moved +13): `test_render.py:222` `assertEqual(written, expected)`; `:226` `assertEqual((spec["category"], spec["size"]), ("anim", [192, 64]), f)`; `:236` `assertEqual(hero_anim.main(["--hero", d]), 1)`; `:237` `assertIn("cape", out.getvalue())`; `:238` `assertNotIn("body", out.getvalue().split(":")[-1])`; `:239` `listdir(...) == []` | PASS |
| C8 | new kinds map to icon/16 or sprite/32 (server-hut 96); the old kinds keep their paths | R3 `new kinds` 9 rows | carried from ae38638: `web/src/components/GameArt.test.tsx:61-63` `getAttribute("src")).toBe(src)`, `width`/`height` `toBe(String(size))` over 8 kinds; old kinds `GameArt.test.tsx:21-26` `address and size` (ran in R3) | PASS |
| C9 | 10 ui pieces have spec and 24x24 PNG | R3 `chrome piece, 24x24` | carried from ae38638: `web/src/lib/art.test.tsx:387-390` 10 literals via `:55-57` `existsSync(spec)`/`existsSync(png)` `toBe(true)`, `pngSize(png)).toEqual(size)` | PASS |
| C10 | 8 btn-* and 15 ic-* have spec and 16x16 PNG | R3 `button and generic icon, 16x16` | carried from ae38638: `art.test.tsx:396-398` `expect(btn).toHaveLength(8)`, `expect(ic).toHaveLength(15)`, `expectAssets(sized("icon",[16,16],...))` | PASS |
| C11 | 6 medals have spec and 16x16 PNG | R3 `medal, 16x16` | carried from ae38638: `art.test.tsx:402` `expectAssets(sized("icon", [16, 16], [...6].map(m => "medal-"+m)))` | PASS |
| C12 | logo spec and 160x64 PNG | R3 `logo, 160x64` | carried from ae38638: `art.test.tsx:406` `expectAssets([{ category: "sprite", name: "logo", size: [160, 64] }])` | PASS |
| C13 | computed border-image-source per chrome class, slice `8 fill`, pixelated | R4 `chrome 9-slice` x5 | carried from ae38638: `web/e2e/assets.spec.ts:42-44` `expect(s.source).toContain(piece)`, `expect(s.slice).toBe("8 fill")`, `expect(s.rendering).toBe("pixelated")` | PASS |
| C14 | mouse held on a button shows its `-press` piece | R4 `pressed` x3 | carried from ae38638: `assets.spec.ts:53-56` `page.mouse.down()` then `expect(s.source).toContain(piece.replace(".png", "-press.png"))` | PASS |
| C15 | GameShell header img alt DevServer, logo.png, 160x64, pixelated, no DEV/SERVER text | R3 `GameShell assets > logo` | carried from ae38638: `web/src/components/GameShell.test.tsx:148-153` `src toBe("/art/sprite/logo.png")`, `width "160"`, `height "64"`, `toContain("pixelated")`, `textContent).not.toMatch(/DEV\|SERVER/)` | PASS |
| C16 | LoginScreen h1 named DevServer holds logo 320x128 | R3 `LoginScreen > logo` | carried from ae38638: `web/src/components/LoginScreen.test.tsx:9` `getByRole("heading", { level: 1, name: "DevServer" })`; `:11-14` `src`, `width "320"`, `height "128"` | PASS |
| C17 | SAIR keeps its name and holds btn-exit; ic-star precedes SKILL PTS | R3 `exit and skill points icons` | carried from ae38638: `web/src/components/Hud.test.tsx:115-116` `getByRole("button", { name: "SAIR" })` + `expectIcon(sair.querySelector("img"), "/art/icon/btn-exit.png")`; `:118-119` `expectIcon(label.firstElementChild, ".../ic-star.png")`, `label.firstChild).toBe(label.firstElementChild)` | PASS |
| C18 | locked skill node: ic-lock before BLOQ.; unlockable: no lock | R3 `SkillsScene assets > lock icon` | carried from ae38638: `web/src/components/SkillsScene.test.tsx:185-187` `textContent).toBe("BLOQ.")`, `expectIcon(locked.firstElementChild, ...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:189` `toBeNull()` | PASS |
| C19 | region under minLevel: lock before REQUER NÍVEL n; open: none | R3 `WorldScene assets > lock icon` | carried from ae38638: `web/src/components/WorldScene.test.tsx:167-169` `toHaveTextContent("REQUER NÍVEL 5")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:170` `toBeNull()` | PASS |
| C20 | locked deploy level: lock before NÍVEL n; open: none | R3 `DeployScene assets > lock icon` | carried from ae38638: `web/src/components/DeployScene.test.tsx:404-406` `textContent).toBe("NÍVEL 3")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:407` `toBeNull()` | PASS |
| C21 | LOJA coin/gem price cards: icon before the number | R3 `ShopScene assets > price icon` | carried from ae38638: `web/src/components/ShopScene.test.tsx:498-500` `textContent).toBe("12g")`, `expectIcon(gemPrice.firstElementChild, "/art/icon/hud-gem.png")`, `expect(gemPrice.firstChild).toBe(gemPrice.firstElementChild)`; `:502-504` `"50c"`, `hud-coin`, `coinPrice.firstChild).toBe(coinPrice.firstElementChild)` | PASS |
| C22 | OFFICE coins/gems tags: icon before the number | R3 `OfficeScene assets > price icon` | carried from ae38638: `web/src/components/OfficeScene.test.tsx:356-358` `textContent).toBe("60C")`, `expectIcon(coins.firstElementChild, ".../hud-coin.png")`, `expect(coins.firstChild).toBe(coins.firstElementChild)`; `:360-362` `"60G"`, `hud-gem`, `gems.firstChild).toBe(gems.firstElementChild)` | PASS |
| C23 | SERVER component card: hud-coin before its price | R3 `ServerScene assets > price icon` | carried from ae38638: `web/src/components/ServerScene.test.tsx:313-315` `textContent).toBe("80C")`, `expectIcon(price.firstElementChild, ".../hud-coin.png")`, `expect(price.firstChild).toBe(price.firstElementChild)` | PASS |
| C24 | office levels 1..5 -> medal bronze..roxo, 32px, before the name | R3 `level medal (0..4)` 5 rows | carried from ae38638: `OfficeScene.test.tsx:377-379` `textContent).toBe(name)`, `expectIcon(level.firstElementChild, "/art/icon/medal-${medal}.png", 32)`, `firstChild).toBe(firstElementChild)`; rows `:369-373` CANTINHO->bronze .. SEDE DEVSERVE->roxo | PASS |
| C25 | POWER <- ic-chart, RAM <- ic-database, UPTIME <- ic-shield | R3 `stat icons (power/ram/uptime)` | carried from ae38638: `ServerScene.test.tsx:327-328` `expectIcon(label.firstElementChild, "/art/icon/${icon}.png")`, `label.firstChild).toBe(label.firstElementChild)` over rows `:320-322` | PASS |
| C26 | Bug Fight SP line preceded by ic-sp 16px | R3 `sp icon` | carried from ae38638: `web/src/components/BattleScene.test.tsx:509` `getAttribute("src")).toBe("/art/icon/ic-sp.png")`; `:512` `expect(sp.firstChild).toBe(img)` | PASS |
| C27 | after error on btn-exit: no img, text exactly SAIR, nothing added | R3 `icon fails` | carried from ae38638: `Hud.test.tsx:127-129` `querySelector("img")).toBeNull()`, `textContent).toBe("SAIR")`, `children).toHaveLength(0)` | PASS |
| C28 | each prop/build/mob/npc/extra has spec and native-size PNG | R3 `world piece sprites` | carried from ae38638: `art.test.tsx:413-419` literals with `build-server-hut` `[96, 96]`, the rest `[32, 32]`, via `:55-57` | PASS |
| C29 | 6 new fx have spec and 128x32 PNG | R3 `new effect strips, 128x32` | carried from ae38638: `art.test.tsx:423` `expectAssets(sized("fx", [128, 32], [6 names]))` | PASS |
| C30 | 5 loading sites: CARREGANDO... plus span.fx-loading aria-hidden, url(/art/fx/loading.png) | R3 `loading fx` x5 | carried from ae38638: `GameShell.test.tsx:159-161,169`, `Hud.test.tsx:135-137,144`, `DeployScene.test.tsx:413-415,423`, `Onboarding.test.tsx:184-186,194`; Bug Fight `BattleScene.test.tsx:519` `getAttribute("aria-hidden")).toBe("true")`, `:520` `backgroundImage...toBe("url(/art/fx/loading.png)")`, called at `:528` on `getByText("CARREGANDO...")` | PASS |
| C31 | .fx-loading infinite, pixelated; reduced motion -> animation-name none | R4 `loading loops` | carried from ae38638: `assets.spec.ts:69-72` `count).toBe("infinite")`, `rendering).toBe("pixelated")`, `name).toBe("none")` after `emulateMedia({ reducedMotion: "reduce" })` | PASS |
| C32 | ready job: COLETAR RECOMPENSA keeps its name and holds extra-bau 32px | R3 `chest closed on the claim button` | carried from ae38638: `DeployScene.test.tsx:430-434` `findByRole("button", { name: "COLETAR RECOMPENSA" })`, `src toBe("/art/sprite/extra-bau.png")`, `alt ""`, `width "32"` | PASS |
| C33 | claim 200 -> extra-bau-aberto 64px plus data-fx collect; error -> neither | R3 `chest opens after a 200 claim`, `chest opens only on success (claim error)` | carried from ae38638: `DeployScene.test.tsx:445-451` `extra-bau-aberto`, `width "64"`, `toBe("url(/art/fx/collect.png)")`; `:462-463` both `toBeNull()` | PASS |
| C34 | exactly one build-flag 32px inside .node-marker.here of player.region | R3 `flag on the current marker only` | carried from ae38638: `WorldScene.test.tsx:179-182` `toHaveLength(1)`, `closest(".node-marker.here")).toBe(marker("floresta"))`, `alt ""`, `width "32"` | PASS |
| C35 | travel 200 -> data-fx teleport in the new region's .map-node; error -> none | R3 `teleport after a 200 travel`, `teleport only on success (travel error)` | carried from ae38638: `WorldScene.test.tsx:192-194` `closest("[data-region]")...toBe("floresta")`, `toBe("url(/art/fx/teleport.png)")`; `:202` `toBeNull()` | PASS |
| C36 | LOJA npc-dev alt lojista 64px plus the bubble text; SERVER mob-robo alt robô 64px | R3 `npc with the tip bubble`, `robot beside the terminal` | carried from ae38638: `ShopScene.test.tsx:512-515` `getByRole("img", { name: "lojista" })`, `src).toBe("/art/sprite/npc-dev.png")`, `width).toBe("64")`, `getByText("FORJE GEAR COM OS DROPS DO BUG FIGHT!")).toBeInTheDocument()`; `ServerScene.test.tsx:336-338` `getByRole("img", { name: "robô" })`, `src).toBe("/art/sprite/mob-robo.png")`, `width).toBe("64")` | PASS |
| C37 | 4 scenes: spec and 320x180 PNG, every pixel alpha 255 | R3 `new scene, 320x180, opaque` | carried from ae38638: `art.test.tsx:428-429` `expectAssets(scenes)` + `expectOpaque(scenes)` -> `:381` `expect.soft(transparent, png).toBe(0)` | PASS |
| C38 | 12 tiles opaque at 32x32/128x32; 5 decals at their size | R3 `tileset tiles and decals` | carried from ae38638: `art.test.tsx:434-442` 9 at `[32,32]` + agua/agua-funda/cachoeira at `[128,32]`, `expectOpaque(tiles)`; decals `[32,32]`, `tile-arvore-grande` `[64,64]` | PASS |
| C39 | section.scene inline bg dia/noite/floresta/dungeon; browser 1280px 720px, pixelated | R3 `scene background` x4; R4 `scene art scale section.*` | carried from ae38638: `DeployScene.test.tsx:473`, `SkillsScene.test.tsx:198`, `AvatarScene.test.tsx:478`, `ShopScene.test.tsx:524` `backgroundImage...toBe("url(/art/background/scene-dungeon.png)")`; `web/e2e/art.spec.ts:27` `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C40 | every hero layer x 5 anims: spec and 192x64 PNG | R3 `hero strip per layer and anim, 192x64` | carried from ae38638: `art.test.tsx:447` layers from `readdirSync(...sprite/hero)`; `:453-455` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual([192, 64])` | PASS |
| C41 | heroFrame src, sx 48i, sy 0, 48x64, same swap, i 0..3 | R3 `strip frame 0..3` | carried from ae38638: `web/src/lib/avatar.test.tsx:157-164` `toEqual({ src: ".../anim/hair-curto-f-walk.png", sx: 48 * i, sy: 0, w: 48, h: 64, swap: {...} })` | PASS |
| C42 | anim walk: data-anim walk, data-frame 0 -> 1 -> 2 -> 3 -> 0 every 166 ms | R3 `advances a frame every 166 ms` | carried from ae38638: `web/src/components/HeroAvatar.test.tsx:68-69` `dataset.anim).toBe("walk")`, `frame).toBe("0")`; `:72` `frame).toBe(next)` for `["1","2","3","0"]` after each `advanceTimersByTimeAsync(166)` | PASS |
| C43 | walk at frame 2 -> run: frame 0, anim run, and an old-anim strip load that resolves afterwards paints nothing | R3 `restarts at frame 0 when the anim changes` | carried from ae38638: `HeroAvatar.test.tsx:84-85` `anim).toBe("run")`, `frame).toBe("0")`; `:90` `loaded.some(src => src.endsWith("-walk.png"))).toBe(true)`; `:91` `draws.every(d => d.src.endsWith("-run.png"))).toBe(true)` | PASS |
| C44 | failed strip -> that layer's static PNG at 0,0, others from strips, frame keeps advancing | R3 `draws the static layer when its strip fails` | carried from ae38638: `HeroAvatar.test.tsx:100` `toContainEqual({ src: broken, sx: 0 })`; `:101` `toContainEqual({ src: strip(other, "idle"), sx: 0 })`; `:103` `frame).toBe("1")`; `:105` `sx: 48` | PASS |
| C45 | reduced motion + anim run: static PNGs only, data-frame 0 after 1000 ms | R3 `reduced motion draws the static layers on frame 0` | carried from ae38638: `HeroAvatar.test.tsx:112` `frame).toBe("0")`; `:114` `loaded.every(src => !src.includes("/anim/"))).toBe(true)` | PASS |
| C46 | without anim: static PNGs only, no data-frame, no timer | R3 `static without anim: no frame and no timer` | carried from ae38638: `HeroAvatar.test.tsx:119` `frame).toBeUndefined()`; `:122` `vi.getTimerCount()).toBe(0)`; `:123-124` no `/anim/`, `loaded.length).toBe(layers.length)` | PASS |
| C47 | Bug Fight hero anim: lunge->run, cast->interact, won->jump, none->idle, hit->idle (plus fall/flee->idle per the added coverage row) | R3 `hero anim on beat lunge/cast/hit/fall/flee`, `with no beat is idle`, `when the battle is won is jump` | carried from ae38638: `BattleScene.test.tsx:386-390` rows `lunge`->`run`, `cast`->`interact`, `hit`->`idle`, `fall`->`idle`, `flee`->`idle`, with `:393` `expect(heroAnim()).toBe(anim)`; `:400` `toBe("idle")`; `:407` `toBe("jump")` | PASS |
| C48 | AVATAR preview idle; DEPLOY interact running / idle ready; MUNDO idle beside marker / walk pending | R3 5 `hero anim:` tests | carried from ae38638: `AvatarScene.test.tsx:487` `anim).toBe("idle")`; `DeployScene.test.tsx:484` `toBe("interact")`, `:491` `toBe("idle")`; `WorldScene.test.tsx:211-213` canvas in `data-region="floresta"` `toBe("idle")`; `:220` `toBe("walk")` | PASS |

**48 of 48 proven with located evidence.**

### Precision notes

- **New in round 4: the `checks.md` Test policy evidence line is stale. This is a precision note, not a finding.** `checks.md` still counts the strip checker as "3 strip rules × 2 cell sizes". The Coverage table now names the shape guard in its row "strip shape guard (2), added after verification round 3", and the code has a proof for it. So the prose undercounts, and no member is hidden.
- **New in round 4: each new test drives one disjunct of the guard. Precision note.** The 128x48 tile test (`test_render.py:104-108`) drives `h != cell_h`. The 100x64 anim test (`:131-135`) drives `w % cell_w`. Together they cover both disjuncts, and faults F4 and F5 kill each one alone. The guard is one shared line parameterized by `STRIP_CELLS`. A tile with the wrong width or an anim with the wrong height would add a per-category case, but the decision itself would not change.
- Carried from ae38638:
  - **C36:** the robot "beside the terminal" (AC 24) and the `ui-bubble` chrome (AC 23) have no check. Both are present at `web/src/components/ServerScene.tsx:146-148` and `web/src/app/globals.css:241`.
  - **C47:** plan AC 33 does not decide whether a beat or `won` takes priority. The code gives the beat priority (`BattleScene.tsx:24-26`).
  - **C8:** the `-t "new kinds"` selector alone would miss the "old kinds keep their paths" assertion at `GameArt.test.tsx:21-26`. That assertion ran in R3.

### Swept rows marked existing

Carried from ae38638.

- authorization: `GameShell.tsx:33` and `:73` render `<LoginScreen />` on `401` before any scene.
- `render.py` exits 1 on ERROR: `test_render.py:64`.

## Coverage

Verified at 0ad1628 for the tile strip checker row. That row's round-3 verdict was not PASS, and the fix touched its proof file. The row was re-swept here over all of `check_strip_frames` for every strip category, plus the gate in `check`. The other rows are carried from ae38638. Their authority (disk, catalog JSON, `GameArt.tsx`, `globals.css`, `HeroAvatar.tsx`, `BattleScene.tsx`, `hero_anim.py`) is unchanged in `b14a39c..0ad1628`.

The strip checker set was recomputed from `render.py` at 0ad1628. Its parts are:

- the gate at `render.py:382`, `category in STRIP_CELLS and (category != "tile" or w > STRIP_CELLS["tile"][0])`. It has 3 rows: a category outside `STRIP_CELLS` (skip), a tile no wider than 32 (skip), and a strip category otherwise (run).
- `check_strip_frames` at `render.py:387-407`, with `STRIP_CELLS = {"fx": (32, 32), "anim": (48, 64), "tile": (32, 32)}` (`:51`) and `MARGINLESS = {"tile"}` (`:52`). Its decisions are:
  - the shape guard, `:390-391`, `if h != cell_h or w % cell_w: return [...]`. It has 2 disjuncts, and its early return means no per-frame rule runs after it.
  - the margin rule, on for fx and anim and off for tiles (`:396-399`)
  - the empty-frame rule, `:401-402`
  - the identical-frames rule, `:403-406`

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door-1 assets (101 in 14 groups) | carried from ae38638: files on disk under `web/art`, `web/public/art` | C9-C12, C28, C29, C37, C38; the literals equal disk 1:1 | - |
| hero strips (61 layers x 5 anims = 305) | carried from ae38638: `ls web/public/art/sprite/hero/*.png` = 61 | C40 from disk; R2 re-renders all of them byte-identically at 0ad1628 | - |
| office levels -> medal (5) | carried from ae38638: `api/catalog/office.json` levels | C24 one row per level (`OfficeScene.test.tsx:369-373`) | - |
| rack stats -> icon (3) | carried from ae38638: `api/catalog/rack.json` stats | C25 (`ServerScene.test.tsx:320-322`) | - |
| hero beat kinds -> anim (5 beats + no beat + won = 7) | carried from ae38638: `web/src/lib/battleFx.ts:3`, `:88-91` | lunge, cast, hit, fall, flee C47 (`BattleScene.test.tsx:386-393`) · none `:400` · won `:407` | - |
| strip checker: gate + `check_strip_frames` (3 gate rows + 2 shape-guard disjuncts + margin on/off + empty + identical = 9) | verified at 0ad1628: `render.py:382`, `:387-407`, `STRIP_CELLS` `:51`, `MARGINLESS` `:52` | gate, category outside `STRIP_CELLS`: C5 `test_render.py:194`. By reading, not injected: on a mutant that drops `category in STRIP_CELLS`, `STRIP_CELLS["sprite"]` would raise `KeyError`, so that test would error · gate, tile w <= 32 skips: C1 `:81`, `:88`, `:91-92` (round-3 F1, F3, F4 killed) · gate runs: C1 `:76-77`, `:101`; C2 `:139`; C3 `:160-164` · shape guard, `h != cell_h`: C1 `:107` `assertIn("strip must be N frames of 32x32 side by side", warnings)` on a 128x48 tile, and `:108` `assertFalse([w for w in warnings if "identical" in w])` (early return). Faults F1, F2, F4 killed · shape guard, `w % cell_w`: C2 `:134` `assertIn("strip must be N frames of 48x64 side by side", warnings)` on a 100x64 anim, and `:135` no `identical` and no `empty` warning. Faults F1, F3, F5 killed · margin on: C2 `:127-129`, C3 `:161-162` · margin off for tiles: C1 `:73` `assertEqual((errors, warnings), ([], []))` · empty: C1 `:101`, C2 `:139`, C3 `:163` · identical: C1 `:76-77`, C2 `:144-145`, C3 `:164` · the fx cell size (32, 32) is pinned by C3 `:153`, a clean 128x32 fx strip that asserts `([], [])` | - |
| renderer size/opacity by category (tile, anim, sprite, fx) | carried from ae38638: `render.py:37-47` | tile C1 · anim C2 · sprite C5 · fx C3 | - |
| new ArtKinds (8) | carried from ae38638: `GameArt.tsx:10-13` | C8 one row per kind | - |
| chrome classes (5) + pressed (3) | carried from ae38638: `globals.css` | C13 x5, C14 x3 (browser) | - |
| loading sites (5) | carried from ae38638: `grep CARREGANDO src` | C30 all five | - |
| scene backgrounds (4) | carried from ae38638: `section.scene` inline styles | C39 unit x4 + browser | - |
| HeroAvatar branch points (6) | carried from ae38638: `HeroAvatar.tsx:93-96,109` | clock C42 · reset C43 · fallback C44 · reduced motion C45 · static C46 · stale-load cancel C43 `HeroAvatar.test.tsx:91` | - |
| HeroAvatar `anim` call sites (5) | carried from ae38638: `grep '<HeroAvatar' src` | C48 · C47 · static sites C46 | - |
| price sites (3 screens, 5 tags), order icon -> number | carried from ae38638: `OfficeScene.tsx:87`, `ShopScene.tsx:56`, `ServerScene.tsx:138` | Shop C21 `:500,:504` · Office C22 `:358,:362` · Server C23 `:315` | - |
| hero_anim.py outcomes (2) | carried from ae38638: `hero_anim.py:56-59` | write C7 `test_render.py:222-226` · an unassigned layer exits 1, names the layer and writes nothing, C7 `:236-239` | - |
| lock sites (3), chest states (3), travel outcomes (2) | carried from ae38638 | C18-C20 · C32-C33 · C35 | - |

None of the 16 sets has an unproven member. The round-3 gap is closed: the strip shape guard now has an asserted case for each disjunct and for each new cell size (tile, anim). Every mutant on it was killed. The new `checks.md` row "strip shape guard (2)" matches the code: tile 128x48 is C1 at `:104-108`, and anim 100x64 is C2 at `:131-135`. C1's selector `-k tile` and C2's selector `-k anim` both pick up the new tests (R1).

## Test policy rows

Verified at 0ad1628 for the "Decides" row. That row was unmet in round 3, and it classifies `render.py`, whose tests the fix touched. The Instrumentation row is carried from ae38638.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `render.py` (SIZES, opacity, strip gate and `check_strip_frames`), `hero_anim.py`, `GameArt.tsx` artSrc/nativeSize, `HeroAvatar.tsx`, `BattleScene.tsx` BEAT_ANIM/heroAnim, `OfficeScene.tsx` MEDALS | own layer: C1-C5, C7, C8, C42-C46, C47, C24 | yes. Every row of `render.py`'s strip decision table now has an asserted case (see the strip checker Coverage row). The shape guard left open in round 3 is now asserted at `test_render.py:107-108` (tile) and `:134-135` (anim). All 5 round-4 mutants on it were killed. `hero_anim.py`, `GameArt.tsx`, `HeroAvatar.tsx`, `BattleScene.tsx` and MEDALS are carried from ae38638 as met |
| Instrumentation, pass-throughs | `LoadingFx.tsx`, `Logo.tsx`, `PriceArt` in `GameArt.tsx`, screen wiring of fixed icons | none of its own; covered by consumer proofs | yes (carried from ae38638): C30/C33/C35, C15/C16, C21-C23 |

## Faults injected

Verified at 0ad1628. All faults ran in one scratch, `git worktree add --detach <scratchpad>/wt4 HEAD`. Each fault was applied with `sed`, its diff was printed, `test_render.py -k tile -k anim` ran, and `git checkout` reverted the scratch before the next fault. Before each fault, the scratch's `git status --porcelain` was confirmed empty.

The first pass ran F3 while F2 was still applied. Its output matched F2, so that run was discarded. F1 through F5 were then re-run one at a time from a clean scratch, and the results below come from that clean re-run.

The worktree was removed afterwards, and `git worktree list` shows only the real tree. The real tree's porcelain was empty before and after, compared with `diff`. The round-3 faults F1-F4 were on the gate and on the empty-frame rule, which the fix did not touch. They are carried from ae38638 as killed.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: shape guard disabled, `if h != cell_h or w % cell_w:` -> `if False:` (the round-3 survivor) | `.claude/skills/pixel-assets/scripts/render.py:390` | yes. `-k tile -k anim`: 2 failures. `test_tile_strip_of_the_wrong_shape_warns_the_shape` failed at `test_render.py:107`: the message is missing, and 6 `identical` warnings appear instead. `test_anim_strip_of_the_wrong_shape_warns_the_shape` failed at `:134`: the message is missing, and `frame 1 is empty` appears instead |
| F2: tile cell size `"tile": (32, 32)` -> `(32, 48)` | `.claude/skills/pixel-assets/scripts/render.py:51` | yes. 3 failures: the new shape test at `:107`, plus `:73` and `:101` (the 128x32 tile strips now warn `strip must be N frames of 32x48`) |
| F3: anim cell size `"anim": (48, 64)` -> `(50, 64)` | `.claude/skills/pixel-assets/scripts/render.py:51` | yes. 5 failures: the new shape test at `:134` (the 100x64 anim now passes the guard), plus `:117`, `:128`, `:139`, `:145` |
| F4: height disjunct dropped, `if h != cell_h or w % cell_w:` -> `if w % cell_w:` | `.claude/skills/pixel-assets/scripts/render.py:390` | yes. 1 failure: `test_tile_strip_of_the_wrong_shape_warns_the_shape` at `:107`. This is the only test that drives `h != cell_h` |
| F5: width disjunct dropped, `if h != cell_h or w % cell_w:` -> `if h != cell_h:` | `.claude/skills/pixel-assets/scripts/render.py:390` | yes. 1 failure: `test_anim_strip_of_the_wrong_shape_warns_the_shape` at `:134`. This is the only test that drives `w % cell_w` |

5 faults were injected, which is the cap, and all 5 were killed. Each new assertion surface (`:107-108`, `:134-135`) was made to fail at least once, by F4 and F5 alone.

## Gate

Verified at 0ad1628.

- `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 20 passed, 0 failed.
- `make art-check`: exit 0, `art ok`, 0 ERROR, 214 WARN. The WARNs are identical-frame warnings on hero strips, which are allowed, and the count is unchanged.
- `cd web && npx vitest run` (full suite): 22 files, 582 passed, 0 failed.
- `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts`: 17 passed, 0 failed.
- `cd web && npx tsc --noEmit -p .`: exit 0.
- `cd web && npx eslint src e2e`: exit 0.

The verdict is PASS:

- The suites are green.
- 48 of 48 checks are proven with located evidence.
- 16 Coverage sets were recomputed and none has an unproven member.
- Both Test policy rows are met.
- 5 of 5 faults were killed.
- The round-3 gap is closed. The strip shape guard at `render.py:390-391` is asserted for tile (`test_render.py:107-108`) and anim (`:134-135`), and the fault that disables it is now killed.

The only open item is a precision note: the `checks.md` Test policy evidence still reads "3 strip rules × 2 cell sizes", and the shape guard now sits in its Coverage table instead.
