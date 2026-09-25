"use client";

import { type ReactNode, useState } from "react";
import { type ApiResult, post, put } from "@/lib/api";
import { resolveLook } from "@/lib/avatar";
import { CONNECTION_FAILED, bonusLong, canPay, insufficient, isEquipped, priceLong, priceShort, quantity, totalBonus } from "@/lib/gear";
import type { AvatarOption, Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { useGame } from "./GameContext";
import { HeroAvatar } from "./HeroAvatar";

type Bag = "equip" | "pocao" | "loot" | "skin" | "visual";
type Entry = { kind: "gear" | "item" | "skin"; id: string; name: string; glyph: string; tag: string; active: boolean };

const BAGS: { id: Bag; label: string; hint: string }[] = [
  { id: "equip", label: "EQUIP", hint: "clique para equipar" },
  { id: "pocao", label: "POÇÕES", hint: "use no Bug Fight" },
  { id: "loot", label: "LOOT", hint: "material de craft" },
  { id: "skin", label: "SKINS", hint: "clique para vestir" },
  { id: "visual", label: "VISUAL", hint: "monte o seu dev" },
];

const SLOT_TAG: Record<string, string> = { setup: "setup", bebida: "bebida", vestuario: "roupa", acessorio: "acess" };
const LEFT_SLOTS = ["setup", "vestuario"];
const RIGHT_SLOTS = ["acessorio", "bebida"];

export function AvatarScene() {
  const { player, catalog, setPlayer } = useGame();
  const [bag, setBag] = useState<Bag>("equip");
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Unsaved avatar picks, shown on the preview until SALVAR or DESFAZER.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [part, setPart] = useState(catalog.avatar.parts[0].id);

  async function run(path: string, done: string, request: () => Promise<ApiResult<{ player: Player }>> = () => post(path), after?: () => void) {
    setPending(true);
    try {
      const r = await request();
      if (!r.ok) return setMessage(r.error?.message ?? CONNECTION_FAILED);
      setPlayer(r.data.player);
      setMessage(done);
      after?.();
    } catch {
      setMessage(CONNECTION_FAILED);
    } finally {
      setPending(false);
    }
  }

  function openBag(b: Bag, id: string | null = null) {
    setBag(b);
    setPicked(id);
  }

  const preview: Player = { ...player, appearance: { ...player.appearance, ...draft } };
  const entries: Entry[] =
    bag === "visual"
      ? []
      : bag === "equip"
      ? catalog.gear
          .filter((g) => player.gear.includes(g.id))
          .map((g) => {
            const on = isEquipped(player, g.id, g.slot);
            return { kind: "gear", id: g.id, name: g.name, glyph: g.glyph, tag: on ? "EQUIP" : (SLOT_TAG[g.slot] ?? g.slot), active: on };
          })
      : bag === "skin"
        ? catalog.skins
            .filter((s) => player.skins.includes(s.id))
            .map((s) => {
              const on = player.skin === s.id;
              return { kind: "skin", id: s.id, name: s.name, glyph: "", tag: on ? "EM USO" : s.name.replace("DEV ", "").slice(0, 7).toLowerCase(), active: on };
            })
        : catalog.items
            // Shop items are the potions tab; everything else is loot from the Bug Fight.
            .filter((i) => (bag === "pocao") === !!i.price && quantity(player, i.id) > 0)
            .map((i) => ({ kind: "item", id: i.id, name: i.name, glyph: i.glyph, tag: `x${quantity(player, i.id)}`, active: false }));
  const current = entries.find((e) => e.id === picked) ?? entries[0];
  const skin = catalog.skins.find((s) => s.id === player.skin);
  const hint = BAGS.find((b) => b.id === bag)!.hint;

  return (
    <section className="scene avatar" aria-label="AVATAR">
      <div className="avatar-bag">
        <div className="panel avatar-bag-head">
          <span className="pixel">INVENTÁRIO</span>
          <span className="term">{hint}</span>
        </div>
        {bag === "visual" ? editor() : cells()}
        <div className="avatar-tabs" role="tablist" aria-label="abas da mochila">
          {BAGS.map((b) => (
            <button key={b.id} type="button" role="tab" aria-selected={bag === b.id} className="avatar-tab pixel" onClick={() => openBag(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="panel avatar-detail" role="region" aria-label="detalhe do item">
          {detail()}
        </div>
      </div>

      <div className="panel avatar-doll">
        <div className="avatar-col">
          <div className="avatar-skins">
            <span className="pixel avatar-skins-title">SKINS</span>
            <div className="avatar-skins-grid" role="group" aria-label="SKINS">
              {catalog.skins.map((s) => {
                const owned = player.skins.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="avatar-skin"
                    data-strip={s.id}
                    aria-label={s.name}
                    aria-pressed={player.skin === s.id}
                    aria-disabled={!owned}
                    disabled={pending && owned}
                    onClick={() => {
                      if (!owned) return setMessage("SKIN BLOQUEADA — COMPRE NA LOJA");
                      openBag("skin", s.id);
                      run(`/api/me/skins/${s.id}/equip`, "SKIN EQUIPADA");
                    }}
                  >
                    <HeroAvatar look={{ ...player, skin: s.id }} scale={0.5} className={owned ? "" : "avatar-skin-locked"} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="avatar-slots" role="group" aria-label="slots à esquerda">
            {LEFT_SLOTS.map(slotButton)}
          </div>
        </div>

        <div className="avatar-center">
          <div className="avatar-preview">
            <HeroAvatar look={preview} className="avatar-hero" />
          </div>
          <div className="avatar-name">
            <span className="pixel">{player.devName}</span>
            <span className="term avatar-skin-name">{skin?.name}</span>
          </div>
        </div>

        <div className="avatar-col">
          <div className="avatar-stats" aria-label="atributos">
            <span className="term">{`HP máx ${player.hpMax}`}</span>
            <span className="term">{`dano +${totalBonus(catalog, player, "dmg")}%`}</span>
            <span className="term">{`SP +${totalBonus(catalog, player, "sp")}`}</span>
          </div>
          <div className="avatar-slots" role="group" aria-label="slots à direita">
            {RIGHT_SLOTS.map(slotButton)}
          </div>
        </div>
      </div>
      <div className="panel avatar-message term" role="status">
        {message ?? "vista skins e equipe o que comprou na Loja."}
      </div>
    </section>
  );

  function slotButton(slot: string) {
    const id = player.equipment[slot];
    const g = id ? catalog.gear.find((x) => x.id === id) : undefined;
    const name = catalog.gearSlots.find((s) => s.id === slot)?.name ?? slot;
    return (
      <button key={slot} type="button" className="avatar-slot" data-slot={slot} data-filled={!!g} onClick={() => openBag("equip", g?.id ?? null)}>
        <span className="pixel avatar-slot-glyph">
          {g ? <GameArt kind="gear" id={g.id} scale={2} alt="" fallback={g.glyph} /> : "[ ]"}
        </span>
        <span className="term avatar-slot-label">{g ? g.name : name}</span>
      </button>
    );
  }

  function cells() {
    return (
      <div className="panel avatar-cells" role="region" aria-label="mochila">
        {entries.map((e) => (
          <button
            key={e.id}
            type="button"
            className="avatar-cell"
            data-entry={e.id}
            data-active={e.active}
            aria-pressed={current?.id === e.id}
            onClick={() => setPicked(e.id)}
          >
            {e.kind === "skin" ? (
              <HeroAvatar look={{ ...player, skin: e.id }} scale={0.5} className="avatar-cell-sprite" />
            ) : (
              <GameArt kind={e.kind} id={e.id} scale={2} alt={e.name} fallback={e.glyph} />
            )}
            <span className="term avatar-cell-tag">{e.tag}</span>
          </button>
        ))}
      </div>
    );
  }

  function editor() {
    const options = catalog.avatar.options.filter((o) => o.part === part && !o.gearOnly);
    const kind = catalog.avatar.parts.find((p) => p.id === part)!.kind;
    return (
      <div className="panel avatar-editor" role="region" aria-label="editor visual">
        <div className="avatar-parts" role="group" aria-label="partes">
          {catalog.avatar.parts.map((p) => (
            <button key={p.id} type="button" className="avatar-part pixel" data-part={p.id} aria-pressed={part === p.id} onClick={() => setPart(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className={`avatar-options avatar-options-${kind}`} role="group" aria-label="opções">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="avatar-option"
              data-option={o.id}
              data-locked={locked(o)}
              aria-label={o.name}
              aria-pressed={preview.appearance[part] === o.id}
              onClick={() => setDraft((d) => ({ ...d, [part]: o.id }))}
            >
              {o.ramp ? (
                <span className="avatar-swatch" aria-hidden="true">
                  {o.ramp.map((hex) => (
                    <span key={hex} style={{ background: hex }} />
                  ))}
                </span>
              ) : (
                <HeroAvatar look={{ ...preview, appearance: { ...preview.appearance, [part]: o.id } }} scale={1} />
              )}
              <span className="term avatar-option-name">{o.name}</span>
              {locked(o) && <span className="pixel avatar-option-price">{priceShort(o.price!)}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function locked(o: AvatarOption) {
    return !!o.price && !player.looks.includes(o.id);
  }

  function visualDetail() {
    const p = catalog.avatar.parts.find((x) => x.id === part)!;
    const o = catalog.avatar.options.find((x) => x.id === preview.appearance[part]);
    const source = resolveLook(preview, catalog).parts[part];
    const lockedDraft = catalog.avatar.options.filter((x) => draft[x.part] === x.id && locked(x));
    const dirty = Object.entries(draft).some(([k, v]) => player.appearance[k] !== v);
    let note: string | null = null;
    if (source.by === "gear") {
      const g = catalog.gear.find((x) => x.id === player.equipment[p.gearSlot!])!;
      note = `em uso: ${g.name} — remova o item para usar a sua escolha.`;
    } else if (source.by === "skin") {
      note = `a skin ${catalog.skins.find((s) => s.id === player.skin)!.name} define esta cor.`;
    }
    return (
      <>
        <DetailHead icon="VIS" name={`${p.name} · ${o?.name ?? ""}`} rarity={o && locked(o) ? priceLong(o.price!) : o?.price ? "COMPRADO" : "GRÁTIS"} />
        {note && <span className="term avatar-visual-note">{note}</span>}
        {o && locked(o) && (
          <button
            type="button"
            className={`btn ${canPay(player, o.price!) ? "btn-yellow" : "btn-locked"}`}
            disabled={pending || !canPay(player, o.price!)}
            onClick={() =>
              run(`/api/me/shop/looks/${o.id}`, `${o.name} COMPRADO`, undefined, () =>
                setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== o.part))),
              )
            }
          >
            {canPay(player, o.price!) ? `COMPRAR · ${priceLong(o.price!)}` : insufficient(o.price!)}
          </button>
        )}
        <div className="avatar-visual-actions">
          <button
            type="button"
            className="btn btn-green"
            disabled={pending || !dirty || lockedDraft.length > 0}
            onClick={() => run("/api/me/appearance", "VISUAL SALVO", () => put("/api/me/appearance", { appearance: draft }), () => setDraft({}))}
          >
            SALVAR
          </button>
          <button type="button" className="btn btn-dark" disabled={pending || !dirty} onClick={() => setDraft({})}>
            DESFAZER
          </button>
        </div>
        {lockedDraft.length > 0 && <span className="term">{`compre ${lockedDraft.map((x) => x.name).join(", ")} para salvar.`}</span>}
      </>
    );
  }

  function detail() {
    if (bag === "visual") return visualDetail();
    if (!current) {
      return (
        <>
          <span className="pixel avatar-detail-name">MOCHILA VAZIA</span>
          <span className="term">nada nesta aba ainda — derrote bugs e compre na Loja.</span>
        </>
      );
    }
    if (current.kind === "gear") {
      const g = catalog.gear.find((x) => x.id === current.id)!;
      const slot = catalog.gearSlots.find((s) => s.id === g.slot)?.name ?? g.slot;
      return (
        <>
          <DetailHead icon={<GameArt kind="gear" id={g.id} scale={2} alt="" fallback={g.glyph} />} name={g.name} rarity={g.rarity} />
          <span className="term">{`${g.description} · ${slot} · ${bonusLong(g.bonus)}`}</span>
          {current.active ? (
            <button type="button" className="btn btn-dark" disabled={pending} onClick={() => run(`/api/me/gear/${g.id}/unequip`, "ITEM REMOVIDO")}>
              REMOVER
            </button>
          ) : (
            <button type="button" className="btn btn-green" disabled={pending} onClick={() => run(`/api/me/gear/${g.id}/equip`, "ITEM EQUIPADO")}>
              EQUIPAR
            </button>
          )}
        </>
      );
    }
    if (current.kind === "skin") {
      const s = catalog.skins.find((x) => x.id === current.id)!;
      return (
        <>
          <DetailHead icon="SKN" name={s.name} rarity={s.rarity} />
          <span className="term">{s.description}</span>
          <button
            type="button"
            className={`btn ${current.active ? "btn-locked" : "btn-green"}`}
            disabled={pending || current.active}
            onClick={() => run(`/api/me/skins/${s.id}/equip`, "SKIN EQUIPADA")}
          >
            {current.active ? "EM USO" : "VESTIR"}
          </button>
        </>
      );
    }
    const it = catalog.items.find((x) => x.id === current.id)!;
    return (
      <>
        <DetailHead icon={<GameArt kind="item" id={it.id} scale={2} alt="" fallback={it.glyph} />} name={it.name} rarity={it.rarity} />
        <span className="term">{it.description}</span>
        <span className="term">{`quantidade: ${quantity(player, it.id)}`}</span>
        <button type="button" className="btn btn-dark" disabled={pending} onClick={() => run(`/api/me/items/${it.id}/discard`, `-1 ${it.name}`)}>
          DESCARTAR 1
        </button>
      </>
    );
  }
}

function DetailHead({ icon, name, rarity }: { icon: ReactNode; name: string; rarity: string }) {
  return (
    <div className="avatar-detail-head">
      <span className="pixel avatar-detail-glyph">{icon}</span>
      <span className="pixel avatar-detail-name">{name}</span>
      <span className="term">{rarity}</span>
    </div>
  );
}
