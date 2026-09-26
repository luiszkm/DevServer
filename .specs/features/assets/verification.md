# Assets verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8b082d5..b79056f
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Verified at `b79056f` (branch `feat/assets`, clean tree). All 48 checks in the set. Real-tree `git status --porcelain` was empty before the run and is still empty after it.

## Binding sources

Step 1 runs only under `ui`. This feature was approved under `standard`, so no step-1 comparison was owed or performed.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/assests_keyart.png` (binding for inventory and style) | not opened: step 1 is not owed under `standard`. The door-1 inventory was recomputed from the files on disk instead (see Coverage). | - | - |

## Checks

Proof runs, batched per target:

- **R1** `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 14 tests ran, `OK`. Every `-k` selector named in C1-C7 matches at least one test in the verbose output.
- **R2** `make art-check`: exit 0, prints `art ok`, 0 `ERROR` lines, 214 `WARN` lines (all "frames i and j are identical" on hero strips).
- **R3** `cd web && npx vitest run <the 16 named files> --reporter=verbose`: exit 0, 474 passed. Each `-t` name below appears in the output as passed.
- **R4** `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts --reporter=list`: exit 0, 17 passed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tile 32x32/128x32 raise no size WARN; a transparent pixel is ERROR and the run exits 1 | R1 `-k tile`: 2 tests ok | `.claude/skills/pixel-assets/scripts/test_render.py:50` `assertEqual(size_warnings(warnings), [], w)`; `:56-57` `assertEqual(len(errors), 1)` + `assertIn("transparent", errors[0])`; `:62-63` `assertEqual(run.returncode, 1)` + `assertIn("ERROR", run.stdout)` | PASS |
| C2 | anim 192x64 raises no size WARN; one WARN naming the frame for margin, empty or identical; a clean strip is ok | R1 `-k anim`: 5 tests ok | `test_render.py:76` `assertEqual(size_warnings(warnings), [])`; `:82-84` `len(warnings)==1`, `"frame 1"`, `"margin"`; `:88` `assertEqual(warnings, ["frame 2 is empty"])`; `:93-94` `"frames 0 and 3 are identical"`; `:72` `assertEqual((errors, warnings), ([], []))` | PASS |
| C3 | fx keeps the margin, empty and identical WARNs on 32x32 cells; a clean strip is ok | R1 `-k fx`: 2 tests ok | `test_render.py:109-113` `len(warnings)==3`, `"frame 0"`+`"margin"`, `"frame 2 is empty"`, `"frames 1 and 3 are identical"`; `:102` `assertEqual(self.check(...), ([], []))` | PASS |
| C4 | clip [2,3,4,5] at [10,0] copies exactly that box, and nothing outside it changes | R1 `-k clip`: 1 test ok | `test_render.py:131` `assertEqual(out[y][x], src[y + 3][x - 8])` for x 10..13, y 0..4; `:133` `assertEqual(out[y][x], sky)` everywhere else | PASS |
| C5 | sprite 96x96/64x64/160x64 raise no size WARN; 100x100 raises one | R1 `-k sprite_size`: 2 tests ok | `test_render.py:143` `assertEqual(size_warnings(warnings), [], (w, h))`; `:147` `assertEqual(len(size_warnings(warnings)), 1)` | PASS |
| C6 | `make art-check` exits 0 and prints `art ok` | R2 | `Makefile:31-33` `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art && echo "art ok"`; observed exit 0 + `art ok` | PASS |
| C7 | hero_anim writes layer x 5 anim specs (anim, 192x64); an unassigned layer exits 1 **naming the layer** and writes nothing | R1 `-k hero_anim`: 2 tests ok | `test_render.py:171` `assertEqual(written, expected)`; `:175` `(spec["category"], spec["size"]) == ("anim", [192, 64])`; `:183` `assertEqual(hero_anim.main(...), 1)`; `:184` `assertEqual([...listdir...], [])`. **The layer name is never asserted.** `hero_anim.py:58` prints it, but no test reads stdout. | FAIL - "naming the layer" unproven |
| C8 | new kinds map to icon/16 or sprite/32 (server-hut 96); the old kinds keep their paths | R3 `new kinds`: 9 rows passed | `web/src/components/GameArt.test.tsx:61-63` `getAttribute("src")).toBe(src)`, `width`/`height` `toBe(String(size))` over the 8 kinds; old kinds `GameArt.test.tsx:24-26` ("address and size", ran in R3 but is outside the `-t "new kinds"` selector) | PASS |
| C9 | 10 ui pieces have spec and 24x24 PNG | R3 `chrome piece, 24x24` | `web/src/lib/art.test.tsx:387-390` list of 10 literals, via `:55-57` `existsSync(spec)`/`existsSync(png)` `toBe(true)`, `pngSize(png)).toEqual(size)` | PASS |
| C10 | 8 btn-* and 15 ic-* have spec and 16x16 PNG | R3 `button and generic icon, 16x16` | `art.test.tsx:396-398` `expect(btn).toHaveLength(8)`, `expect(ic).toHaveLength(15)`, `expectAssets(sized("icon",[16,16],...))` | PASS |
| C11 | 6 medals have spec and 16x16 PNG | R3 `medal, 16x16` | `art.test.tsx:402` `expectAssets(sized("icon", [16, 16], [...6].map(m => "medal-"+m)))` | PASS |
| C12 | logo spec and 160x64 PNG | R3 `logo, 160x64` | `art.test.tsx:406` `expectAssets([{ category: "sprite", name: "logo", size: [160, 64] }])` | PASS |
| C13 | computed border-image-source per chrome class, slice `8 fill`, pixelated | R4 `chrome 9-slice` x5 passed | `web/e2e/assets.spec.ts:42-44` `expect(s.source).toContain(piece)`, `expect(s.slice).toBe("8 fill")`, `expect(s.rendering).toBe("pixelated")` over the 5 classes (`:30-36`) | PASS |
| C14 | mouse held on a button shows its `-press` piece | R4 `pressed` x3 passed | `assets.spec.ts:53-56` `page.mouse.down()` then `expect(s.source).toContain(piece.replace(".png", "-press.png"))` | PASS |
| C15 | GameShell header img alt DevServer, logo.png, 160x64, pixelated, no DEV/SERVER text | R3 `GameShell assets > logo` | `web/src/components/GameShell.test.tsx:148-153` `src toBe("/art/sprite/logo.png")`, `width "160"`, `height "64"`, `toContain("pixelated")`, `closest("header").textContent).not.toMatch(/DEV\|SERVER/)` | PASS |
| C16 | LoginScreen h1 named DevServer holds logo 320x128 | R3 `LoginScreen > logo` | `web/src/components/LoginScreen.test.tsx:9` `getByRole("heading", { level: 1, name: "DevServer" })`; `:11-14` `src`, `width "320"`, `height "128"`, `h1.textContent).toBe("")` | PASS |
| C17 | SAIR keeps its name and holds btn-exit; ic-star precedes SKILL PTS | R3 `exit and skill points icons` | `web/src/components/Hud.test.tsx:115-116` `getByRole("button", { name: "SAIR" })` + `expectIcon(sair.querySelector("img"), "/art/icon/btn-exit.png")`; `:118-119` `expectIcon(label.firstElementChild, ".../ic-star.png")`, `label.firstChild).toBe(label.firstElementChild)` | PASS |
| C18 | locked skill node: ic-lock before BLOQ.; unlockable node: no lock | R3 `SkillsScene assets > lock icon` | `web/src/components/SkillsScene.test.tsx:185-187` `textContent).toBe("BLOQ.")`, `expectIcon(locked.firstElementChild, ".../ic-lock.png")`, `firstChild).toBe(firstElementChild)`; `:189` unlockable `querySelector('img[src=".../ic-lock.png"]')).toBeNull()` | PASS |
| C19 | region under minLevel: lock before REQUER NÍVEL n; open region: none | R3 `WorldScene assets > lock icon` | `web/src/components/WorldScene.test.tsx:167-169` `toHaveTextContent("REQUER NÍVEL 5")`, `expectIcon(locked.firstElementChild, ...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:170` open `toBeNull()` | PASS |
| C20 | locked deploy level: lock before NÍVEL n; open level: none | R3 `DeployScene assets > lock icon` | `web/src/components/DeployScene.test.tsx:404-406` `textContent).toBe("NÍVEL 3")`, `expectIcon(tag.firstElementChild, ...ic-lock)`, `firstChild).toBe(firstElementChild)`; `:407` `toBeNull()` | PASS |
| C21 | LOJA coin/gem price cards: icon **before the number** | R3 `ShopScene assets > price icon` | `web/src/components/ShopScene.test.tsx:498-502` `textContent).toBe("12g")` + `expectIcon(gemPrice.firstElementChild, ".../hud-gem.png")`; `"50c"` + `hud-coin`. **No `firstChild === firstElementChild`**, so an icon after the number also passes (same shape as the C22 survivor). | FAIL - "before the number" unasserted |
| C22 | OFFICE coins/gems tags: icon **before the number** | R3 `OfficeScene assets > price icon` | `web/src/components/OfficeScene.test.tsx:356-360` `textContent).toBe("60C")` + `expectIcon(coins.firstElementChild, ".../hud-coin.png")`; `"60G"` + `hud-gem`. Order unasserted; **fault 5 survived** | FAIL - surviving mutant |
| C23 | SERVER component card: hud-coin **before its price** | R3 `ServerScene assets > price icon` | `web/src/components/ServerScene.test.tsx:313-314` `textContent).toBe("80C")` + `expectIcon(price.firstElementChild, ".../hud-coin.png")`. Order unasserted (same shape as the C22 survivor) | FAIL - "before its price" unasserted |
| C24 | office levels 1..5 -> medal bronze/prata/ouro/azul/roxo, 32px, before the name, table-driven | R3 `level medal (0..4)`: 5 rows passed | `OfficeScene.test.tsx:375-377` `textContent).toBe(name)`, `expectIcon(level.firstElementChild, "/art/icon/medal-"+medal+".png", 32)`, `firstChild).toBe(firstElementChild)`; rows `:366-370` CANTINHO..SEDE DEVSERVE -> bronze..roxo | PASS |
| C25 | POWER <- ic-chart, RAM <- ic-database, UPTIME <- ic-shield | R3 `stat icons (power/ram/uptime)` | `ServerScene.test.tsx:325-327` `textContent).toBe(name)`, `expectIcon(label.firstElementChild, "/art/icon/"+icon+".png")`, `firstChild).toBe(firstElementChild)` over 3 rows | PASS |
| C26 | Bug Fight SP line preceded by ic-sp 16px | R3 `sp icon` | `web/src/components/BattleScene.test.tsx:507-510` `src toBe("/art/icon/ic-sp.png")`, `alt ""`, `width "16"`, `sp.firstChild).toBe(img)` | PASS |
| C27 | after error on btn-exit: no img, text exactly SAIR, nothing added | R3 `icon fails` | `Hud.test.tsx:127-129` `querySelector("img")).toBeNull()`, `textContent).toBe("SAIR")`, `children).toHaveLength(0)` | PASS |
| C28 | each prop/build/mob/npc/extra has spec and native-size PNG | R3 `world piece sprites` | `art.test.tsx:413-419` 15 prop + `build-server-hut` `[96, 96]` + 6 build + 4 mob + npc-dev + 7 extra at `[32, 32]`, via `:55-57` | PASS |
| C29 | 6 new fx have spec and 128x32 PNG | R3 `new effect strips, 128x32` | `art.test.tsx:423` `expectAssets(sized("fx", [128, 32], [6 names]))` | PASS |
| C30 | GameShell, Hud, Bug Fight, DEPLOY, Onboarding: CARREGANDO... plus span.fx-loading aria-hidden, url(/art/fx/loading.png) | R3 `loading fx` x5 passed | helper `GameShell.test.tsx:159-161` (the same helper sits at `Hud.test.tsx:135-137`, `BattleScene.test.tsx:516-518`, `DeployScene.test.tsx:413-415`, `Onboarding.test.tsx:184-186`) `aria-hidden toBe("true")`, `backgroundImage toBe("url(/art/fx/loading.png)")`; called on `getByText("CARREGANDO...")` at `GameShell.test.tsx:169`, `Hud.test.tsx:144`, `BattleScene.test.tsx:526`, `DeployScene.test.tsx:423`, `Onboarding.test.tsx:194` | PASS |
| C31 | .fx-loading infinite, pixelated; reduced motion -> animation-name none | R4 `loading loops` | `assets.spec.ts:69-72` `count).toBe("infinite")`, `rendering).toBe("pixelated")`, after `emulateMedia({ reducedMotion: "reduce" })` `name).toBe("none")` | PASS |
| C32 | ready job: COLETAR RECOMPENSA keeps its name and holds extra-bau 32px | R3 `chest closed on the claim button` | `DeployScene.test.tsx:430-434` `findByRole("button", { name: "COLETAR RECOMPENSA" })`, `src toBe("/art/sprite/extra-bau.png")`, `alt ""`, `width "32"` | PASS |
| C33 | claim 200 -> extra-bau-aberto 64px plus data-fx collect; error -> neither | R3 `chest opens after a 200 claim`, `chest opens only on success (claim error)` | `DeployScene.test.tsx:445-451` `extra-bau-aberto` present, `width "64"`, `backgroundImage toBe("url(/art/fx/collect.png)")`; `:462-463` both `toBeNull()` after 409 | PASS |
| C34 | exactly one build-flag 32px, inside .node-marker.here of player.region | R3 `flag on the current marker only` | `WorldScene.test.tsx:179-182` `toHaveLength(1)`, `closest(".node-marker.here")).toBe(marker("floresta"))`, `alt ""`, `width "32"` | PASS |
| C35 | travel 200 -> data-fx teleport in the new region's .map-node; error -> none | R3 `teleport after a 200 travel`, `teleport only on success` | `WorldScene.test.tsx:192-194` `closest("[data-region]")...toBe("floresta")` (the `.map-node` carries `data-region`, `WorldScene.tsx:59-61`), `toBe("url(/art/fx/teleport.png)")`; `:202` `toBeNull()` after 422 | PASS |
| C36 | LOJA npc-dev alt lojista 64px plus the bubble text; SERVER mob-robo alt robô 64px | R3 `npc with the tip bubble`, `robot beside the terminal` | `ShopScene.test.tsx:510-513` `getByRole("img", { name: "lojista" })`, `src`, `width "64"`, `getByText("FORJE GEAR COM OS DROPS DO BUG FIGHT!")`; `ServerScene.test.tsx:335-337` `name: "robô"`, `src .../mob-robo.png`, `width "64"` | PASS |
| C37 | 4 scenes: spec and 320x180 PNG, every pixel alpha 255 | R3 `new scene, 320x180, opaque` | `art.test.tsx:428-429` `expectAssets(scenes)` + `expectOpaque(scenes)` -> `:381` `expect.soft(transparent, png).toBe(0)` | PASS |
| C38 | 12 tiles opaque at 32x32/128x32; 5 decals at their size | R3 `tileset tiles and decals` | `art.test.tsx:434-442` 9 at `[32,32]` + agua/agua-funda/cachoeira at `[128,32]`, `expectOpaque(tiles)`; decals `[32,32]` and `tile-arvore-grande` `[64,64]` | PASS |
| C39 | section.scene inline bg: dia/noite/floresta/dungeon; browser: 1280px 720px, pixelated | R3 `scene background` x4; R4 `scene art scale section.deploy/.skills/.avatar/.shop` | `DeployScene.test.tsx:473`, `SkillsScene.test.tsx:198`, `AvatarScene.test.tsx:478`, `ShopScene.test.tsx:522` `backgroundImage...toBe("url(/art/background/scene-<x>.png)")`; `web/e2e/art.spec.ts:27` `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` over `:12-15` | PASS |
| C40 | every hero layer x 5 anims: spec and 192x64 PNG | R3 `hero strip per layer and anim, 192x64` | `art.test.tsx:447` layers from `readdirSync(web/public/art/sprite/hero)`; `:453-455` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual([192, 64])` | PASS |
| C41 | heroFrame src, sx 48i, sy 0, 48x64, same swap, i 0..3 | R3 `strip frame 0..3` | `web/src/lib/avatar.test.tsx:157-164` `toEqual({ src: ".../anim/hair-curto-f-walk.png", sx: 48 * i, sy: 0, w: 48, h: 64, swap: {...} })` | PASS |
| C42 | anim walk: data-anim walk, data-frame 0 -> 1 -> 2 -> 3 -> 0 every 166 ms | R3 `advances a frame every 166 ms` | `web/src/components/HeroAvatar.test.tsx:65-70` `dataset.anim).toBe("walk")`, `frame).toBe("0")`, then per `advanceTimersByTimeAsync(166)` `frame).toBe(next)` for `["1","2","3","0"]` | PASS |
| C43 | walk at frame 2 -> run: frame 0, anim run, **and a strip load of the old anim that resolves afterwards paints nothing** | R3 `restarts at frame 0 when the anim changes` | `HeroAvatar.test.tsx:80-81` `anim).toBe("run")`, `frame).toBe("0")`; `:84` `draws.every(d => d.src.endsWith("-run.png"))`. The walk loads already resolved (cached, t=1ms) before the rerender, so no old load resolves "afterwards". **Fault 3 (guard removed) survived.** | FAIL - surviving mutant |
| C44 | a failed strip -> that layer's static PNG at 0,0, others from strips, frame keeps advancing | R3 `draws the static layer when its strip fails` | `HeroAvatar.test.tsx:93` `toContainEqual({ src: broken, sx: 0 })`; `:94` others `toContainEqual({ src: strip(other,"idle"), sx: 0 })`; `:96` `frame).toBe("1")`; `:98` `sx: 48` | PASS |
| C45 | reduced motion + anim run: static PNGs only, data-frame 0 after 1000 ms | R3 `reduced motion draws the static layers on frame 0` | `HeroAvatar.test.tsx:105-107` `frame).toBe("0")`, `loaded.every(src => !src.includes("/anim/"))` | PASS |
| C46 | without anim: static PNGs only, no data-frame, no timer | R3 `static without anim: no frame and no timer` | `HeroAvatar.test.tsx:112` `frame).toBeUndefined()`; `:115` `vi.getTimerCount()).toBe(0)`; `:116-117` no `/anim/`, `loaded.length).toBe(layers.length)` | PASS |
| C47 | Bug Fight hero anim: lunge->run, cast->interact, won->jump, none->idle, hit->idle | R3 `hero anim on beat lunge/cast/hit`, `with no beat is idle`, `when the battle is won is jump` | `BattleScene.test.tsx:386-391` rows + `expect(heroAnim()).toBe(anim)`; `:398` `toBe("idle")`; `:405` `toBe("jump")` | PASS |
| C48 | AVATAR preview idle; DEPLOY interact running / idle ready; MUNDO idle beside marker / walk while pending | R3 `hero anim: the preview idles`, `interact while the job runs`, `idle when the job is ready`, `idle beside the current marker`, `walk while the travel is pending` | `AvatarScene.test.tsx:487` `anim).toBe("idle")`; `DeployScene.test.tsx:484` `toBe("interact")`, `:491` `toBe("idle")`; `WorldScene.test.tsx:211-213` one canvas in `data-region="floresta"`, `toBe("idle")`; `:220` `toBe("walk")` | PASS |

**43 of 48 proven.** C7, C21, C22, C23 and C43 are not.

Precision gaps. These are findings about the checks, and none of them fails a check on its own:

- C36 and plan AC 24: the plan says the robot sits "ao lado do terminal". The check dropped that, and nothing asserts adjacency. Plan AC 23 and the assumptions put the bubble on `ui-bubble`. The check asserts only the text, never the bubble chrome.
- C47: the plan never decides which wins when `battle.status === "won"` while a `lunge`/`cast` beat is on stage. The code gives the beat priority (`BattleScene.tsx:25`), and nothing proves that.
- C8: the "old kinds keep their paths" half is proven only by a test (`GameArt.test.tsx:21`) that the check's own `-t "new kinds"` selector excludes.

Swept rows marked existing, re-read against the code:

- authorization: present. `GameShell.tsx:33` sets `unauthenticated` on `401` and `:73` renders `<LoginScreen />` before any scene. It renders the login screen in place rather than redirecting, but the constraint the row cites holds.
- `render.py` exit code: present. The exit `1` on `ERROR` is exercised by C1 (`test_render.py:62`).

## Coverage

Each set was recomputed from its authority, not from the author's table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door-1 assets (101 in 14 groups) | files on disk: `git diff --name-status 8b082d5..HEAD -- web/art web/public/art` gives 101 PNG + 101 spec (+ `_medal.json` part), all `A` | ui 10 C9 · btn 8 + ic 15 C10 · medal 6 C11 · logo C12 · prop 15, build 7, mob 4, npc 1, extra 7 C28 · fx 6 C29 · scene 4 C37 · tile 12 C38 · decal 5 C38. Test literals equal the disk set 1:1 | - |
| hero strips (61 layers x 5 anims = 305) | `ls web/public/art/sprite/hero/*.png` = 61; `anim/*.png` = 305; `anim/*.json` (excl. `_poses`) = 305 | C40 reads the layers from disk (`art.test.tsx:447`); R2 re-renders all 305 byte-identically | - |
| office levels -> medal (5) | `api/catalog/office.json` `levels`: CANTINHO 0, HOME OFFICE 30, ESTÚDIO 70, LAB DEV 120, SEDE DEVSERVE 180 | C24 one row per level (`OfficeScene.test.tsx:366-370`) | - |
| rack stats -> icon (3) | `api/catalog/rack.json` `stats`: power, ram, uptime | C25 one row each (`ServerScene.test.tsx:320-322`) | - |
| hero beat kinds -> anim (5 beats + no beat + won) | `web/src/lib/battleFx.ts:3` `HeroAnim = "lunge" \| "hit" \| "cast" \| "fall" \| "flee"`; the plan's anim-per-screen assumption names `hit`/`fall`/`flee` -> `idle` | lunge C47 · cast C47 · hit C47 · none C47 · won C47 | `fall`, `flee` (named in plan prose, no proof) |
| strip checker per strip category (3) | `render.py:51-52` `STRIP_CELLS` fx/anim/tile, `MARGINLESS = {"tile"}`, gate `render.py:382` (`tile` only when `w > 32`); plan Landing door 2 names `tile` 32x32 | fx C3 (margin, empty, identical) · anim C2 (margin, empty, identical) | `tile` (margin skipped, empty, identical on 128x32; the `w > 32` gate) |
| renderer size/opacity by category (tile, anim, sprite, fx) | `render.py:37-47` `SIZES`, `TRANSPARENT_/OPAQUE_CATEGORIES` | tile size + opacity C1 (fault 1 killed) · anim size C2 · sprite new sizes C5 · fx C3 | - |
| new ArtKinds (8) | `GameArt.tsx:10-13` union + `SPRITE_KINDS`, `BIG_SPRITES` | C8 one row per kind (fault 2 killed) | - |
| chrome classes (5) + pressed (3) | `globals.css` `.panel`, `.hud-card`, `.btn-yellow/-dark/-green` and `:active` | C13 x5, C14 x3 in the browser | - |
| loading sites (5) | `grep CARREGANDO src`: `Hud.tsx:22`, `BattleScene.tsx:142`, `Onboarding.tsx:69`, `DeployScene.tsx:181`; GameShell's loading is the Hud's | C30 all five | - |
| scene backgrounds (4) | `section.scene` inline styles in Deploy/Skills/Avatar/Shop | C39 unit x4 + browser x4 | - |
| HeroAvatar branch points (6) | `HeroAvatar.tsx`: playing vs static (`:79`), frame clock (`:86`), anim reset (`:82`), strip fallback (`:38-42`), reduced motion (`:78`), stale-load cancel (`:96`) | clock C42 · reset C43 · fallback C44 · reduced motion C45 · static C46 | stale-load cancel `HeroAvatar.tsx:96` (fault 3 survived) |
| HeroAvatar `anim` call sites (5) | `grep '<HeroAvatar' src`: Avatar preview `:139`, Deploy `:259`, Battle `:265`, World `:69` (+ static sites Shop/Avatar grid/Onboarding) | C48 · C47 · static sites via C46 | - |
| lock sites (3), price sites (3 screens), chest states (3), travel outcomes (2) | Skills/World/Deploy lock JSX; `PriceArt` users Shop/Office/Server; Deploy claim; World travel | C18-C20 · C21-C23 (presence; order under Checks) · C32-C33 · C35 | - |

3 of 14 sets have unproven members, 4 members in all: `fall` and `flee`, the `tile` strip checker, and the stale-load cancel.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `render.py` (SIZES, opacity, strip checker), `hero_anim.py`, `GameArt.tsx` artSrc/nativeSize, `HeroAvatar.tsx`, `BattleScene.tsx` BEAT_ANIM, `OfficeScene.tsx` MEDALS | own layer: C1-C5, C7, C8, C42-C46, C47, C24 | no - `render.py` strip checker's `tile` rows (`render.py:51-52,382`) have no asserted case (checks.md counts "3 strip rules x 2 cell sizes", but the code has 3 cell sizes); the `HeroAvatar.tsx:96` cancel branch has no case that kills it. GameArt, BEAT_ANIM (every code row: lunge, cast, other-beat, none, won) and MEDALS (5 rows) are met |
| Instrumentation, pass-throughs | `LoadingFx.tsx` (LoadingFx, FxOnce), `Logo.tsx`, `PriceArt` in `GameArt.tsx`, screen wiring of fixed icons | none of its own; covered by consumer proofs | yes - C30/C33/C35 cover LoadingFx and FxOnce, C15/C16 cover Logo, C21-C23 cover PriceArt's src/alt/width. The icon's placement relative to the number is the checks' claim, not this row's, and is recorded under C21-C23 |

## Faults injected

All faults ran in a scratch `git worktree add --detach <scratchpad>/wt HEAD` with `web/node_modules` symlinked, then removed. The real-tree porcelain was empty before and after.

| Mutation | Location | Killed |
| --- | --- | --- |
| tile no longer opaque: `OPAQUE_CATEGORIES = {"background"}` | `.claude/skills/pixel-assets/scripts/render.py:47` | yes - `test_render.py -k tile`: `test_tile_with_a_transparent_pixel...` failed `0 != 1` |
| `npc` dropped from `SPRITE_KINDS` (npc -> icon/16) | `web/src/components/GameArt.tsx:13` | yes - `GameArt.test.tsx -t "new kinds"`: `new kinds (npc dev)` failed |
| stale-load guard removed: `if (cancelled) return;` -> `void cancelled;` | `web/src/components/HeroAvatar.tsx:96` | no - survived: `HeroAvatar.test.tsx` 5/5 passed, `restarts at frame 0` included (C43) |
| beat table `cast: "interact"` -> `cast: "run"` | `web/src/components/BattleScene.tsx:23` | yes - `BattleScene.test.tsx -t "hero anim"`: `hero anim on beat cast` failed |
| price icon moved after the number in the office tag | `web/src/components/OfficeScene.tsx:86-87` | no - survived: `OfficeScene.test.tsx -t "price icon"` 1/1 passed (C22; C21/C23 share the assertion shape) |

## Gate

- `python3 .claude/skills/pixel-assets/scripts/test_render.py -v`: 14 passed, 0 failed.
- `make art-check`: exit 0, `art ok`, 0 ERROR, 214 WARN (identical-frame warnings on hero strips; allowed).
- `cd web && npx vitest run <16 named files>`: 474 passed, 0 failed. The full `npx vitest run` is 22 files, 580 passed, 0 failed.
- `cd web && npx playwright test e2e/assets.spec.ts e2e/art.spec.ts`: 17 passed, 0 failed.
- `cd web && npx tsc --noEmit -p .`: exit 0.
- `npx eslint src e2e`: exit 0.

The suites are green, but the verdict is FAIL. There are 2 surviving mutants, 5 checks without an assertion on their claimed value, 4 unproven coverage members and 1 unmet Test policy row.

Ranked gaps:

1. **C43**, surviving mutant. With the stale-load guard removed, the test still passes. The walk strips resolve (cached) before the anim switch, so "an old load that resolves afterwards" is never constructed. Location: `web/src/components/HeroAvatar.tsx:96`, test `web/src/components/HeroAvatar.test.tsx:73-85`.
2. **C22** (and **C21**, **C23**), surviving mutant. "Before the number" is not asserted: the price tests check `firstElementChild` and `textContent` but not `firstChild === firstElementChild`. Locations: `web/src/components/OfficeScene.test.tsx:356-360`, `web/src/components/ShopScene.test.tsx:498-502`, `web/src/components/ServerScene.test.tsx:313-314`.
3. **Coverage, C47**. Hero beats `fall` and `flee`, which the plan names as `idle`, have no proof. Set from `web/src/lib/battleFx.ts:3`, test `web/src/components/BattleScene.test.tsx:385-391`.
4. **Coverage and Test policy, render.py**. The `tile` strip checker (margin skipped, empty/identical checks on 128x32, the `w > 32` gate) is named in Landing door 2 but untested. Location: `.claude/skills/pixel-assets/scripts/render.py:51-52,382`.
5. **C7**. "Exits 1 naming the layer": the name is printed at `.claude/skills/pixel-assets/scripts/hero_anim.py:58`, but `.claude/skills/pixel-assets/scripts/test_render.py:183-184` never asserts it.

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py assets` exits 1, as expected for a FAIL verdict. Its output:

    ERROR assets: verdict is FAIL - route the ranked gaps back as fixes, then re-verify
    validate_verification: 1 error(s), 0 warning(s) across [assets]
