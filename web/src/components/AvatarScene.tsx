"use client";

import { type ReactNode, useState } from "react";
import { post } from "@/lib/api";
import { CONNECTION_FAILED, bonusLong, isEquipped, quantity, skinFilter, totalBonus } from "@/lib/gear";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { useGame } from "./GameContext";
import { HeroSprite } from "./HeroSprite";

type Bag = "equip" | "pocao" | "loot" | "skin";
type Entry = { kind: "gear" | "item" | "skin"; id: string; name: string; glyph: string; tag: string; active: boolean; filter?: string };

const BAGS: { id: Bag; label: string; hint: string }[] = [
  { id: "equip", label: "EQUIP", hint: "clique para equipar" },
  { id: "pocao", label: "POÇÕES", hint: "use no Bug Fight" },
  { id: "loot", label: "LOOT", hint: "material de craft" },
  { id: "skin", label: "SKINS", hint: "clique para vestir" },
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

  async function run(path: string, done: string) {
    setPending(true);
    try {
      const r = await post<{ player: Player }>(path);
      if (!r.ok) return setMessage(r.error?.message ?? CONNECTION_FAILED);
      setPlayer(r.data.player);
      setMessage(done);
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

  const entries: Entry[] =
    bag === "equip"
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
              return { kind: "skin", id: s.id, name: s.name, glyph: "", tag: on ? "EM USO" : s.name.replace("DEV ", "").slice(0, 7).toLowerCase(), active: on, filter: s.filter };
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
                <HeroSprite filter={e.filter ?? "none"} className="avatar-cell-sprite" />
              ) : e.kind === "item" ? (
                <GameArt kind="item" id={e.id} scale={2} alt={e.name} fallback={e.glyph} />
              ) : (
                <span className="pixel">{e.glyph}</span>
              )}
              <span className="term avatar-cell-tag">{e.tag}</span>
            </button>
          ))}
        </div>
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
                    <HeroSprite filter={owned ? s.filter : "grayscale(1) brightness(.5)"} className={owned ? "" : "avatar-skin-locked"} />
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
            <HeroSprite filter={skinFilter(catalog, player.skin)} className="avatar-hero" />
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
        <span className="pixel avatar-slot-glyph">{g ? g.glyph : "[ ]"}</span>
        <span className="term avatar-slot-label">{g ? g.name : name}</span>
      </button>
    );
  }

  function detail() {
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
          <DetailHead icon={g.glyph} name={g.name} rarity={g.rarity} />
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
