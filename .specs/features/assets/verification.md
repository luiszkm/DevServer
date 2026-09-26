# Assets verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8b082d5..2335d56 (fix range 366f47d..2335d56)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Verified at `2335d56` (branch `feat/assets`, clean tree). The scope is the fix commit `2335d56` (it touches `test_render.py`, `checks.md` Coverage, `BattleScene.test.tsx`, `HeroAvatar.test.tsx`, `OfficeScene.test.tsx`, `ServerScene.test.tsx`, `ShopScene.test.tsx`; no production file) plus every verdict that was not PASS in round 1. Rows outside that scope are marked `carried from b79056f`. Their proofs were still re-run in full at `2335d56`. The real tree's `git status --porcelain` was empty before the run and is still empty after it.

## Binding sources

Carried from b79056f. Step 1 runs only under `ui`, and this feature was approved under `standard`. The fix did not touch any interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/assests_keyart.png` (binding for inventory and style) | not opened: step 1 is not owed under `standard`. The door-1 inventory was recomputed from disk in round 1 (see Coverage). | - | - |

## Checks

Verified at 2335d56. All proofs re-ran at this HEAD in these batched runs:

- **R1** `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 16 tests ran (14 in round 1, plus 2 new tile tests), `OK`. Each `-k` selector in C1-C7 matches tests in the verbose output: `tile` 4, `anim` 5, `fx` 2, `clip` 1, `sprite_size` 2, `hero_anim` 2.
- **R2** `make art-check`: exit 0, prints `art ok`, 0 `ERROR`, 214 `WARN` (identical-frame warnings on hero strips; the same as round 1).
- **R3** `cd web && npx vitest run <the 16 named files> --reporter=verbose`: exit 0, 476 passed (474 in round 1, plus `hero anim on beat fall` and `hero anim on beat flee`). Each `-t` name below appears in the output as `✓`.
- **R4** `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts --reporter=list`: exit 0, 17 passed. No other dev server was running, so there was no blocker.

Citations were refreshed for the files the fix touched: `test_render.py`, `HeroAvatar.test.tsx`, `BattleScene.test.tsx`, `OfficeScene.test.tsx`, `ServerScene.test.tsx`, `ShopScene.test.tsx`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tile 32x32/128x32 raise no size WARN; a transparent pixel is ERROR and the run exits 1 | R1 `-k tile`: 4 tests ok | verified at 2335d56: `.claude/skills/pixel-assets/scripts/test_render.py:52` `assertEqual(size_warnings(warnings), [], w)`; `:58-59` `assertEqual(len(errors), 1)` + `assertIn("transparent", errors[0])`; `:64-65` `assertEqual(run.returncode, 1)` + `assertIn("ERROR", run.stdout)` | PASS |
| C2 | anim 192x64 raises no size WARN; one WARN naming the frame for margin, empty or identical; a clean strip is ok | R1 `-k anim`: 5 ok | verified at 2335d56 (lines moved): `test_render.py:94` `assertEqual(size_warnings(warnings), [])`; `:100-102` `len(warnings)==1`, `"frame 1"`, `"margin"`; `:106` `assertEqual(warnings, ["frame 2 is empty"])`; `:111-112` `"frames 0 and 3 are identical"`; `:90` `assertEqual((errors, warnings), ([], []))` | PASS |
| C3 | fx keeps the margin, empty and identical WARNs on 32x32 cells; a clean strip is ok | R1 `-k fx`: 2 ok | verified at 2335d56: `test_render.py:127-131` `len(warnings)==3`, `"frame 0"`+`"margin"`, `"frame 2 is empty"`, `"frames 1 and 3 are identical"`; `:120` `assertEqual(self.check({...None}), ([], []))` | PASS |
| C4 | clip [2,3,4,5] at [10,0] copies exactly that box, and nothing outside it changes | R1 `-k clip`: 1 ok | verified at 2335d56: `test_render.py:149` `assertEqual(out[y][x], src[y + 3][x - 8], (x, y))`; `:151` `assertEqual(out[y][x], sky, (x, y))` | PASS |
| C5 | sprite 96x96/64x64/160x64 raise no size WARN; 100x100 raises one | R1 `-k sprite_size`: 2 ok | verified at 2335d56: `test_render.py:161` `assertEqual(size_warnings(warnings), [], (w, h))`; `:165` `assertEqual(len(size_warnings(warnings)), 1)` | PASS |
| C6 | `make art-check` exits 0 and prints `art ok` | R2 | carried from b79056f (Makefile untouched): `Makefile:31-33` `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art && echo "art ok"`; observed at 2335d56: exit 0 + `art ok` | PASS |
| C7 | hero_anim writes layer x 5 anim specs (anim, 192x64); an unassigned layer exits 1 naming the layer and writes nothing | R1 `-k hero_anim`: 2 ok | verified at 2335d56: `test_render.py:189` `assertEqual(written, expected)`; `:193` `assertEqual((spec["category"], spec["size"]), ("anim", [192, 64]), f)`; `:203` `assertEqual(hero_anim.main(["--hero", d]), 1)`; **`:204` `assertIn("cape", out.getvalue())`**, `:205` `assertNotIn("body", out.getvalue().split(":")[-1])`; `:206` `listdir(...) == []`. Fault 5 was killed. | PASS |
| C8 | new kinds map to icon/16 or sprite/32 (server-hut 96); the old kinds keep their paths | R3 `new kinds` 9 rows | carried from b79056f: `web/src/components/GameArt.test.tsx:61-63` `getAttribute("src")).toBe(src)`, `width`/`height` `toBe(String(size))` over 8 kinds; old kinds `GameArt.test.tsx:21-26` `address and size` (ran in R3; see precision notes) | PASS |
| C9 | 10 ui pieces have spec and 24x24 PNG | R3 `chrome piece, 24x24` | carried from b79056f: `web/src/lib/art.test.tsx:387-390` 10 literals via `:55-57` `existsSync(spec)`/`existsSync(png)` `toBe(true)`, `pngSize(png)).toEqual(size)` | PASS |
| C10 | 8 btn-* and 15 ic-* have spec and 16x16 PNG | R3 `button and generic icon, 16x16` | carried from b79056f: `art.test.tsx:396-398` `expect(btn).toHaveLength(8)`, `expect(ic).toHaveLength(15)`, `expectAssets(sized("icon",[16,16],...))` | PASS |
| C11 | 6 medals have spec and 16x16 PNG | R3 `medal, 16x16` | carried from b79056f: `art.test.tsx:402` `expectAssets(sized("icon", [16, 16], [...6].map(m => "medal-"+m)))` | PASS |
| C12 | logo spec and 160x64 PNG | R3 `logo, 160x64` | carried from b79056f: `art.test.tsx:406` `expectAssets([{ category: "sprite", name: "logo", size: [160, 64] }])` | PASS |
| C13 | computed border-image-source per chrome class, slice `8 fill`, pixelated | R4 `chrome 9-slice` x5 | carried from b79056f: `web/e2e/assets.spec.ts:42-44` `expect(s.source).toContain(piece)`, `expect(s.slice).toBe("8 fill")`, `expect(s.rendering).toBe("pixelated")` | PASS |
| C14 | mouse held on a button shows its `-press` piece | R4 `pressed` x3 | carried from b79056f: `assets.spec.ts:53-56` `page.mouse.down()` then `expect(s.source).toContain(piece.replace(".png", "-press.png"))` | PASS |
| C15 | GameShell header img alt DevServer, logo.png, 160x64, pixelated, no DEV/SERVER text | R3 `GameShell assets > logo` | carried from b79056f: `web/src/components/GameShell.test.tsx:148-153` `src toBe("/art/sprite/logo.png")`, `width "160"`, `height "64"`, `toContain("pixelated")`, `textContent).not.toMatch(/DEV\|SERVER/)` | PASS |
| C16 | LoginScreen h1 named DevServer holds logo 320x128 | R3 `LoginScreen > logo` | carried from b79056f: `web/src/components/LoginScreen.test.tsx:9` `getByRole("heading", { level: 1, name: "DevServer" })`; `:11-14` `src`, `width "320"`, `height "128"` | PASS |
| C17 | SAIR keeps its name and holds btn-exit; ic-star precedes SKILL PTS | R3 `exit and skill points icons` | carried from b79056f: `web/src/components/Hud.test.tsx:115-116` `getByRole("button", { name: "SAIR" })` + `expectIcon(sair.querySelector("img"), "/art/icon/btn-exit.png")`; `:118-119` `expectIcon(label.firstElementChild, ".../ic-star.png")`, `label.firstChild).toBe(label.firstElementChild)` | PASS |
| C18 | locked skill node: ic-lock before BLOQ.; unlockable: no lock | R3 `SkillsScene assets > lock icon` | carried from b79056f: `web/src/components/SkillsScene.test.tsx:185-187` `textContent).toBe("BLOQ.")`, `expectIcon(locked.firstElementChild, ...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:189` `toBeNull()` | PASS |
| C19 | region under minLevel: lock before REQUER NÍVEL n; open: none | R3 `WorldScene assets > lock icon` | carried from b79056f: `web/src/components/WorldScene.test.tsx:167-169` `toHaveTextContent("REQUER NÍVEL 5")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:170` `toBeNull()` | PASS |
| C20 | locked deploy level: lock before NÍVEL n; open: none | R3 `DeployScene assets > lock icon` | carried from b79056f: `web/src/components/DeployScene.test.tsx:404-406` `textContent).toBe("NÍVEL 3")`, `expectIcon(...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:407` `toBeNull()` | PASS |
| C21 | LOJA coin/gem price cards: icon before the number | R3 `ShopScene assets > price icon` | verified at 2335d56: `web/src/components/ShopScene.test.tsx:498-500` `textContent).toBe("12g")`, `expectIcon(gemPrice.firstElementChild, "/art/icon/hud-gem.png")`, **`expect(gemPrice.firstChild).toBe(gemPrice.firstElementChild)`**; `:502-504` `"50c"`, `hud-coin`, **`coinPrice.firstChild).toBe(coinPrice.firstElementChild)`**. Fault 2 was killed at `:500`. | PASS |
| C22 | OFFICE coins/gems tags: icon before the number | R3 `OfficeScene assets > price icon` | verified at 2335d56: `web/src/components/OfficeScene.test.tsx:356-358` `textContent).toBe("60C")`, `expectIcon(coins.firstElementChild, ".../hud-coin.png")`, **`expect(coins.firstChild).toBe(coins.firstElementChild)`**; `:360-362` `"60G"`, `hud-gem`, **`gems.firstChild).toBe(gems.firstElementChild)`**. Fault 2 was killed at `:358`. | PASS |
| C23 | SERVER component card: hud-coin before its price | R3 `ServerScene assets > price icon` | verified at 2335d56: `web/src/components/ServerScene.test.tsx:313-315` `textContent).toBe("80C")`, `expectIcon(price.firstElementChild, ".../hud-coin.png")`, **`expect(price.firstChild).toBe(price.firstElementChild)`**. Fault 2 was killed at `:315`. | PASS |
| C24 | office levels 1..5 -> medal bronze..roxo, 32px, before the name | R3 `level medal (0..4)` 5 rows | verified at 2335d56 (lines moved): `OfficeScene.test.tsx:377-379` `textContent).toBe(name)`, `expectIcon(level.firstElementChild, "/art/icon/medal-${medal}.png", 32)`, `firstChild).toBe(firstElementChild)`; rows `:369-373` CANTINHO->bronze .. SEDE DEVSERVE->roxo | PASS |
| C25 | POWER <- ic-chart, RAM <- ic-database, UPTIME <- ic-shield | R3 `stat icons (power/ram/uptime)` | verified at 2335d56 (lines moved): `ServerScene.test.tsx:327-328` `expectIcon(label.firstElementChild, "/art/icon/${icon}.png")`, `label.firstChild).toBe(label.firstElementChild)` over rows `:320-322` | PASS |
| C26 | Bug Fight SP line preceded by ic-sp 16px | R3 `sp icon` | verified at 2335d56 (lines moved): `web/src/components/BattleScene.test.tsx:509` `getAttribute("src")).toBe("/art/icon/ic-sp.png")`; `:512` `expect(sp.firstChild).toBe(img)` | PASS |
| C27 | after error on btn-exit: no img, text exactly SAIR, nothing added | R3 `icon fails` | carried from b79056f: `Hud.test.tsx:127-129` `querySelector("img")).toBeNull()`, `textContent).toBe("SAIR")`, `children).toHaveLength(0)` | PASS |
| C28 | each prop/build/mob/npc/extra has spec and native-size PNG | R3 `world piece sprites` | carried from b79056f: `art.test.tsx:413-419` literals with `build-server-hut` `[96, 96]`, the rest `[32, 32]`, via `:55-57` | PASS |
| C29 | 6 new fx have spec and 128x32 PNG | R3 `new effect strips, 128x32` | carried from b79056f: `art.test.tsx:423` `expectAssets(sized("fx", [128, 32], [6 names]))` | PASS |
| C30 | 5 loading sites: CARREGANDO... plus span.fx-loading aria-hidden, url(/art/fx/loading.png) | R3 `loading fx` x5 | carried from b79056f for GameShell/Hud/Deploy/Onboarding (`GameShell.test.tsx:159-161,169`, `Hud.test.tsx:135-137,144`, `DeployScene.test.tsx:413-415,423`, `Onboarding.test.tsx:184-186,194`); verified at 2335d56 for Bug Fight (lines moved): `BattleScene.test.tsx:519` `getAttribute("aria-hidden")).toBe("true")`, `:520` `backgroundImage...toBe("url(/art/fx/loading.png)")`, called at `:528` on `getByText("CARREGANDO...")` | PASS |
| C31 | .fx-loading infinite, pixelated; reduced motion -> animation-name none | R4 `loading loops` | carried from b79056f: `assets.spec.ts:69-72` `count).toBe("infinite")`, `rendering).toBe("pixelated")`, `name).toBe("none")` after `emulateMedia({ reducedMotion: "reduce" })` | PASS |
| C32 | ready job: COLETAR RECOMPENSA keeps its name and holds extra-bau 32px | R3 `chest closed on the claim button` | carried from b79056f: `DeployScene.test.tsx:430-434` `findByRole("button", { name: "COLETAR RECOMPENSA" })`, `src toBe("/art/sprite/extra-bau.png")`, `alt ""`, `width "32"` | PASS |
| C33 | claim 200 -> extra-bau-aberto 64px plus data-fx collect; error -> neither | R3 `chest opens after a 200 claim`, `chest opens only on success (claim error)` | carried from b79056f: `DeployScene.test.tsx:445-451` `extra-bau-aberto`, `width "64"`, `toBe("url(/art/fx/collect.png)")`; `:462-463` both `toBeNull()` | PASS |
| C34 | exactly one build-flag 32px inside .node-marker.here of player.region | R3 `flag on the current marker only` | carried from b79056f: `WorldScene.test.tsx:179-182` `toHaveLength(1)`, `closest(".node-marker.here")).toBe(marker("floresta"))`, `alt ""`, `width "32"` | PASS |
| C35 | travel 200 -> data-fx teleport in the new region's .map-node; error -> none | R3 `teleport after a 200 travel`, `teleport only on success (travel error)` | carried from b79056f: `WorldScene.test.tsx:192-194` `closest("[data-region]")...toBe("floresta")`, `toBe("url(/art/fx/teleport.png)")`; `:202` `toBeNull()` | PASS |
| C36 | LOJA npc-dev alt lojista 64px plus the bubble text; SERVER mob-robo alt robô 64px | R3 `npc with the tip bubble`, `robot beside the terminal` | verified at 2335d56 (lines moved): `ShopScene.test.tsx:512-515` `getByRole("img", { name: "lojista" })`, `src).toBe("/art/sprite/npc-dev.png")`, `width).toBe("64")`, `getByText("FORJE GEAR COM OS DROPS DO BUG FIGHT!")).toBeInTheDocument()`; `ServerScene.test.tsx:336-338` `getByRole("img", { name: "robô" })`, `src).toBe("/art/sprite/mob-robo.png")`, `width).toBe("64")` | PASS |
| C37 | 4 scenes: spec and 320x180 PNG, every pixel alpha 255 | R3 `new scene, 320x180, opaque` | carried from b79056f: `art.test.tsx:428-429` `expectAssets(scenes)` + `expectOpaque(scenes)` -> `:381` `expect.soft(transparent, png).toBe(0)` | PASS |
| C38 | 12 tiles opaque at 32x32/128x32; 5 decals at their size | R3 `tileset tiles and decals` | carried from b79056f: `art.test.tsx:434-442` 9 at `[32,32]` + agua/agua-funda/cachoeira at `[128,32]`, `expectOpaque(tiles)`; decals `[32,32]`, `tile-arvore-grande` `[64,64]` | PASS |
| C39 | section.scene inline bg dia/noite/floresta/dungeon; browser 1280px 720px, pixelated | R3 `scene background` x4; R4 `scene art scale section.*` x4 | carried from b79056f for `DeployScene.test.tsx:473`, `SkillsScene.test.tsx:198`, `AvatarScene.test.tsx:478`, `web/e2e/art.spec.ts:27` `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })`; verified at 2335d56 for `ShopScene.test.tsx:524` `backgroundImage...toBe("url(/art/background/scene-dungeon.png)")` | PASS |
| C40 | every hero layer x 5 anims: spec and 192x64 PNG | R3 `hero strip per layer and anim, 192x64` | carried from b79056f: `art.test.tsx:447` layers from `readdirSync(...sprite/hero)`; `:453-455` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual([192, 64])` | PASS |
| C41 | heroFrame src, sx 48i, sy 0, 48x64, same swap, i 0..3 | R3 `strip frame 0..3` | carried from b79056f: `web/src/lib/avatar.test.tsx:157-164` `toEqual({ src: ".../anim/hair-curto-f-walk.png", sx: 48 * i, sy: 0, w: 48, h: 64, swap: {...} })` | PASS |
| C42 | anim walk: data-anim walk, data-frame 0 -> 1 -> 2 -> 3 -> 0 every 166 ms | R3 `advances a frame every 166 ms` | verified at 2335d56 (lines moved): `web/src/components/HeroAvatar.test.tsx:68-69` `dataset.anim).toBe("walk")`, `frame).toBe("0")`; `:72` `frame).toBe(next)` for `["1","2","3","0"]` after each `advanceTimersByTimeAsync(166)` | PASS |
| C43 | walk at frame 2 -> run: frame 0, anim run, and an old-anim strip load that resolves afterwards paints nothing | R3 `restarts at frame 0 when the anim changes` | verified at 2335d56: `SLOW = /-walk\.png$/` (walk loads resolve at 1000 ms, after the switch at 332 ms); `HeroAvatar.test.tsx:84-85` `anim).toBe("run")`, `frame).toBe("0")`; `:90` `loaded.some(src => src.endsWith("-walk.png"))).toBe(true)`; **`:91` `draws.every(d => d.src.endsWith("-run.png"))).toBe(true)`** after `advanceTimersByTimeAsync(1000)`. Fault 1 (guard removed) was killed at `:91`. | PASS |
| C44 | failed strip -> that layer's static PNG at 0,0, others from strips, frame keeps advancing | R3 `draws the static layer when its strip fails` | verified at 2335d56 (lines moved): `HeroAvatar.test.tsx:100` `toContainEqual({ src: broken, sx: 0 })`; `:101` `toContainEqual({ src: strip(other, "idle"), sx: 0 })`; `:103` `frame).toBe("1")`; `:105` `sx: 48` | PASS |
| C45 | reduced motion + anim run: static PNGs only, data-frame 0 after 1000 ms | R3 `reduced motion draws the static layers on frame 0` | verified at 2335d56 (lines moved): `HeroAvatar.test.tsx:112` `frame).toBe("0")`; `:114` `loaded.every(src => !src.includes("/anim/"))).toBe(true)` | PASS |
| C46 | without anim: static PNGs only, no data-frame, no timer | R3 `static without anim: no frame and no timer` | verified at 2335d56 (lines moved): `HeroAvatar.test.tsx:119` `frame).toBeUndefined()`; `:122` `vi.getTimerCount()).toBe(0)`; `:123-124` no `/anim/`, `loaded.length).toBe(layers.length)` | PASS |
| C47 | Bug Fight hero anim: lunge->run, cast->interact, won->jump, none->idle, hit->idle (and fall/flee->idle per the added coverage row) | R3 `hero anim on beat lunge/cast/hit/fall/flee`, `with no beat is idle`, `when the battle is won is jump` | verified at 2335d56: `BattleScene.test.tsx:386-390` rows `lunge`->`run`, `cast`->`interact`, `hit`->`idle`, **`fall` (`defeat` event)->`idle`, `flee` (`fled` event)->`idle`**, with `:393` `expect(heroAnim()).toBe(anim)`; `:400` `toBe("idle")`; `:407` `toBe("jump")`. Fault 3 was killed at `:393` for both new rows. | PASS |
| C48 | AVATAR preview idle; DEPLOY interact running / idle ready; MUNDO idle beside marker / walk pending | R3 5 `hero anim:` tests | carried from b79056f: `AvatarScene.test.tsx:487` `anim).toBe("idle")`; `DeployScene.test.tsx:484` `toBe("interact")`, `:491` `toBe("idle")`; `WorldScene.test.tsx:211-213` canvas in `data-region="floresta"` `toBe("idle")`; `:220` `toBe("walk")` | PASS |

**48 of 48 proven with located evidence.** Round 1's C7, C21, C22, C23 and C43 now pass, and each has a killed mutant behind it.

### Precision gaps from round 1, re-judged

The fix did not touch any of these three surfaces, so they are carried from b79056f and re-judged at 2335d56.

- **C36: robot "beside the terminal" (plan AC 24) and the `ui-bubble` chrome (AC 23 / assumptions). Precision note, not a finding.** No check was written for either, so there is no check it could contradict. Under `standard`, step 1 (binding-source and arrangement enumeration) is not owed. Both are present in the code: `web/src/components/ServerScene.tsx:146-148` puts the `mob-robo` `GameArt` as a sibling of `.server-terminal` inside `.server-terminal-row`, and `web/src/app/globals.css:241` gives `.shop-bubble` the `url(/art/ui/ui-bubble.png) 8 fill` border-image (`ShopScene.tsx:82`). No test asserts either one. If the feature is re-run under `ui`, this becomes an arrangement finding.
- **C47: beat vs `won` priority. Precision note.** Plan AC 33 does not decide which one wins when `battle.status === "won"` while a `lunge`/`cast` beat is on stage. The code gives the beat priority (`BattleScene.tsx:24-26`, `(beat?.hero && BEAT_ANIM[beat.hero]) || (status === "won" ? "jump" : "idle")`). There is no spec value to prove against, so this is a gap in the plan, not in the proof.
- **C8: "old kinds keep their paths" selector. Precision note.** The assertion exists and ran at 2335d56 (`GameArt.test.tsx:21-26` `address and size` rows, inside the same file R3 runs). Only the check's `-t "new kinds"` selector would miss it when run alone. The evidence is located, and the proof command should name both describes.

### Swept rows marked existing

Carried from b79056f. The fix touched none of them. authorization: `GameShell.tsx:33` and `:73` render `<LoginScreen />` on `401` before any scene. `render.py` exit 1 on ERROR: `test_render.py:64`.

## Coverage

Verified at 2335d56 for the rows whose authority the fix touched: beats, the tile strip checker, HeroAvatar branches, price sites and hero_anim. The other rows are carried from b79056f; their authority (disk, catalog JSON, `GameArt.tsx`, `globals.css`) is untouched by `2335d56`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door-1 assets (101 in 14 groups) | carried from b79056f: files on disk under `web/art`, `web/public/art` | C9-C12, C28, C29, C37, C38; literals equal disk 1:1 | - |
| hero strips (61 layers x 5 anims = 305) | carried from b79056f: `ls web/public/art/sprite/hero/*.png` = 61 | C40 from disk; R2 re-renders all byte-identically at 2335d56 | - |
| office levels -> medal (5) | carried from b79056f: `api/catalog/office.json` levels | C24 one row per level (`OfficeScene.test.tsx:369-373`) | - |
| rack stats -> icon (3) | carried from b79056f: `api/catalog/rack.json` stats | C25 (`ServerScene.test.tsx:320-322`) | - |
| hero beat kinds -> anim (5 beats + no beat + won = 7) | verified at 2335d56: `web/src/lib/battleFx.ts:3` `HeroAnim = "lunge" \| "hit" \| "cast" \| "fall" \| "flee"`; `defeat`->`fall` `battleFx.ts:88-89`, `fled`->`flee` `:90-91`; plan assumptions: `hit`/`fall`/`flee` -> idle | lunge, cast, hit, **fall, flee** C47 (`BattleScene.test.tsx:386-393`, fault 3 killed) · none C47 `:400` · won C47 `:407` | - |
| tile strip checker (4 rules) | verified at 2335d56: `render.py:51-52` `STRIP_CELLS["tile"] = (32, 32)`, `MARGINLESS = {"tile"}`; gate `render.py:382` (strip rules on `tile` only when `w > 32`); rules in `check_strip_frames` `render.py:397-406` (margin, empty, identical) | margin skipped on 128x32 C1 `test_render.py:73` (fault 4a killed) · identical frames on 128x32 C1 `:76-77` · single 32x32 tile runs no strip rules C1 `:81` | `w > 32` gate: fault 4b survived. `test_render.py:79-81` uses a filled 32x32 tile, and the strip rules give `[]` on it with or without the gate. The gate is observable: without it, a fully transparent 32x32 tile adds `frame 0 is empty`, and a 16x16 tile adds `strip must be N frames of 32x32`. Tile empty-frame WARN (`render.py:401-402`, reachable on a 128x32 tile with one transparent frame): named among the tile rules in round 1, left out of the author's new row, and no case asserts it |
| renderer size/opacity by category (tile, anim, sprite, fx) | carried from b79056f: `render.py:37-47` | tile C1 · anim C2 · sprite C5 · fx C3 | - |
| new ArtKinds (8) | carried from b79056f: `GameArt.tsx:10-13` | C8 one row per kind | - |
| chrome classes (5) + pressed (3) | carried from b79056f: `globals.css` | C13 x5, C14 x3 (browser) | - |
| loading sites (5) | carried from b79056f: `grep CARREGANDO src` | C30 all five | - |
| scene backgrounds (4) | carried from b79056f: `section.scene` inline styles | C39 unit x4 + browser x4 | - |
| HeroAvatar branch points (6) | verified at 2335d56: `HeroAvatar.tsx` playing/static, frame clock, anim reset, strip fallback, reduced motion, stale-load cancel `:93-96,109` | clock C42 · reset C43 · fallback C44 · reduced motion C45 · static C46 · **stale-load cancel C43 `HeroAvatar.test.tsx:91`** (fault 1 killed) | - |
| HeroAvatar `anim` call sites (5) | carried from b79056f: `grep '<HeroAvatar' src` | C48 · C47 · static sites C46 | - |
| price sites (3 screens, 5 tags), order icon -> number | verified at 2335d56: `PriceArt` users `OfficeScene.tsx:87`, `ShopScene.tsx:56`, `ServerScene.tsx:138` | Shop gem/coin C21 `:500,:504` · Office coins/gems C22 `:358,:362` · Server C23 `:315` (fault 2 killed x3) | - |
| hero_anim.py outcomes (2) | verified at 2335d56: `hero_anim.py:56-59` (unassigned -> print names, return 1), else write | write C7 `test_render.py:189-193` · unassigned exits 1, names the layer, writes nothing C7 `:203-206` (fault 5 killed) | - |
| lock sites (3), chest states (3), travel outcomes (2) | carried from b79056f | C18-C20 · C32-C33 · C35 | - |

One of 16 sets has unproven members: the tile strip checker's `w > 32` gate and its tile empty-frame WARN.

## Test policy rows

Verified at 2335d56. This round re-judges the row that was unmet in round 1 and the Instrumentation row, whose files' tests the fix touched.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `render.py` (SIZES, opacity, strip checker), `hero_anim.py`, `GameArt.tsx` artSrc/nativeSize, `HeroAvatar.tsx`, `BattleScene.tsx` BEAT_ANIM/heroAnim, `OfficeScene.tsx` MEDALS | own layer: C1-C5, C7, C8, C42-C46, C47, C24 | no - `HeroAvatar.tsx` is now met (the stale-load cancel is asserted, fault 1 killed); `BattleScene.tsx` is met over all 7 beat rows; `hero_anim.py` is met. `render.py`'s strip checker still has two tile decision rows with no discriminating case: the `w > 32` gate (`render.py:382`, fault 4b survived against `test_render.py:79-81`) and the empty-frame rule on a tile (`render.py:401-402`, no case). GameArt and MEDALS are carried from b79056f as met |
| Instrumentation, pass-throughs | `LoadingFx.tsx`, `Logo.tsx`, `PriceArt` in `GameArt.tsx`, screen wiring of fixed icons | none of its own; covered by consumer proofs | yes - C30/C33/C35 (LoadingFx/FxOnce), C15/C16 (Logo), C21-C23 now also assert placement before the number (PriceArt) |

## Faults injected

Verified at 2335d56. All faults ran in a scratch `git worktree add --detach <scratchpad>/wt HEAD` with `/Users/luissoares/Repos/DevServer-1/web/node_modules` symlinked in. Each fault was reverted with `git checkout` inside the scratch before the next one. The worktree was then removed (`git worktree list` shows only the real tree). The real tree's porcelain was empty before and after, compared with `diff`. Every fault targets a surface the fix added an assertion for. Fault 4 has two variants because the fix added two separate tile tests.

| Mutation | Location | Killed |
| --- | --- | --- |
| stale-load guard removed: `if (cancelled) return;` -> `void cancelled;` | `web/src/components/HeroAvatar.tsx:96` | yes - `HeroAvatar.test.tsx -t "restarts"` failed (`expected false to be true`, `:91` `draws.every(...-run.png)`) |
| price icon moved after the number in all three scenes (`{priceShort(...)}` before `<PriceArt/>`) | `web/src/components/OfficeScene.tsx:87-88`, `web/src/components/ShopScene.tsx:56-57`, `web/src/components/ServerScene.tsx:138-139` | yes - all three `price icon` tests failed, each on its new order assertion: `OfficeScene.test.tsx:358`, `ShopScene.test.tsx:500`, `ServerScene.test.tsx:315` |
| beat table gains `fall: "jump", flee: "run"` | `web/src/components/BattleScene.tsx:23` | yes - `hero anim on beat fall` and `hero anim on beat flee` failed at `BattleScene.test.tsx:393` |
| margin rule applied to tiles: `MARGINLESS = set()` | `.claude/skills/pixel-assets/scripts/render.py:52` | yes - `test_tile_strip_skips_the_margin_but_warns_identical_frames` failed (`frame 0: 124 pixels on the 1px cell margin` != `[]`) |
| `w > 32` tile gate dropped: `if category in STRIP_CELLS:` | `.claude/skills/pixel-assets/scripts/render.py:382` | no - survived: `test_render.py -k tile` 4/4 ok. A probe on the mutant shows different output for a transparent 32x32 tile (extra `frame 0 is empty`) and for a 16x16 tile (extra `strip must be N frames of 32x32 side by side`), so the mutant is not equivalent |
| hero_anim stops naming the layer: prints `{len(unassigned)} layer(s)` instead of the names | `.claude/skills/pixel-assets/scripts/hero_anim.py:58` | yes - `test_hero_anim_unassigned_layer_exits_1_and_writes_nothing` failed at `test_render.py:204` (`'cape' not found`) |

This round ran six faults against a cap of five. The brief named five surfaces as the minimum, and the fix added two distinct tile tests, which is why fault 4 has two variants. 5 of 6 were killed.

## Gate

Verified at 2335d56.

- `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 16 passed, 0 failed.
- `make art-check`: exit 0, `art ok`, 0 ERROR, 214 WARN (identical-frame warnings on hero strips; allowed, unchanged).
- `cd web && npx vitest run <16 named files>`: 476 passed, 0 failed.
- `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts`: 17 passed, 0 failed.
- `cd web && npx tsc --noEmit -p .`: exit 0.
- `cd web && npx eslint src e2e`: exit 0.

The suites are green and 48/48 checks are proven, but the verdict is FAIL. There is 1 surviving mutant, 1 coverage set with unproven members and 1 unmet Test policy row, all on the same surface. Round 1's five ranked gaps (C43, C21-C23, `fall`/`flee`, C7, and the tile strip's margin and identical rules) are closed. The only open item is the rest of that tile-strip gap.

Ranked gaps:

1. **Surviving mutant, Coverage and Test policy: the `render.py` tile strip gate.** Dropping `w > 32` at `.claude/skills/pixel-assets/scripts/render.py:382` passes `test_tile_single_32px_tile_runs_no_strip_rules` (`.claude/skills/pixel-assets/scripts/test_render.py:79-81`). A filled 32x32 tile yields `[]` from the strip rules either way, so the author's coverage member "single 32x32 tile runs none" is asserted on an input that cannot tell. A distinguishing case would be a fully transparent 32x32 tile asserting `warnings == []` next to its ERROR, or a 16x16 tile asserting exactly one size WARN.
2. **Coverage and Test policy: the tile empty-frame WARN.** `render.py:401-402` runs on tiles, and nothing asserts it. For example, a 128x32 tile with one transparent frame should warn `frame i is empty`. Round 1 named it, and the added row in `.specs/features/assets/checks.md` (Coverage, "tile strip rules (3)") left it out.

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py assets` exits 1, which is the right result for a FAIL verdict. Its output:

    ERROR assets: verdict is FAIL - route the ranked gaps back as fixes, then re-verify
    validate_verification: 1 error(s), 0 warning(s) across [assets]
