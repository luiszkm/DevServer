"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import {
  CONNECTION_FAILED,
  bonusLong,
  bonusShort,
  canPay,
  insufficient,
  isEquipped,
  priceLong,
  priceShort,
  quantity,
} from "@/lib/gear";
import type { Gear, Item, Player, Price, Skin } from "@/lib/types";
import { GameArt } from "./GameArt";
import { useGame } from "./GameContext";
import { HeroSprite } from "./HeroSprite";

type Selection = { kind: "item" | "gear" | "skin"; id: string };

export function ShopScene() {
  const { player, catalog, setPlayer } = useGame();
  const forSale = catalog.items.filter((i): i is Item & { price: Price } => !!i.price);
  const [sel, setSel] = useState<Selection>({ kind: "item", id: forSale[0]?.id ?? "" });
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

  const slotName = (id: string) => catalog.gearSlots.find((s) => s.id === id)?.name ?? id;
  const gearStatus = (g: Gear) =>
    isEquipped(player, g.id, g.slot) ? "EQUIPADO" : player.gear.includes(g.id) ? "NO INVENTÁRIO" : priceShort(g.price);
  const skinStatus = (s: Skin) =>
    player.skin === s.id ? "EQUIPADA" : player.skins.includes(s.id) ? "NO GUARDA-ROUPA" : priceShort(s.price);
  const picked = (kind: Selection["kind"], id: string) => sel.kind === kind && sel.id === id;

  return (
    <section className="scene shop" aria-label="LOJA">
      <div className="shop-main">
        <div className="panel shop-head">
          <span className="pixel">LOJA DEVSERVER</span>
          <span className="pixel shop-gems">{`GEMS: ${player.gems}`}</span>
        </div>
        <div className="panel shop-section" role="region" aria-label="POÇÕES">
          <span className="pixel shop-section-title">POÇÕES</span>
          <div className="shop-grid shop-grid-2">
            {forSale.map((it) => (
              <button
                key={it.id}
                type="button"
                className="shop-card"
                data-card={it.id}
                aria-pressed={picked("item", it.id)}
                onClick={() => setSel({ kind: "item", id: it.id })}
              >
                <span className="pixel shop-glyph">
                  <GameArt kind="item" id={it.id} scale={2} alt="" fallback={it.glyph} />
                </span>
                <span className="shop-card-text">
                  <span className="pixel shop-card-name">{it.name}</span>
                  <span className="term">{`possui: ${quantity(player, it.id)}`}</span>
                </span>
                <span className="pixel shop-price">{priceShort(it.price)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel shop-section" role="region" aria-label="EQUIPAMENTOS DO DEV">
          <span className="pixel shop-section-title">EQUIPAMENTOS DO DEV</span>
          <div className="shop-grid shop-grid-3">
            {catalog.gear.map((g) => (
              <button
                key={g.id}
                type="button"
                className="shop-card"
                data-card={g.id}
                aria-pressed={picked("gear", g.id)}
                onClick={() => setSel({ kind: "gear", id: g.id })}
              >
                <span className="pixel shop-glyph">
                  <GameArt kind="gear" id={g.id} scale={2} alt="" fallback={g.glyph} />
                </span>
                <span className="shop-card-text">
                  <span className="pixel shop-card-name">{g.name}</span>
                  <span className="term shop-bonus">{bonusShort(g.bonus)}</span>
                </span>
                <span className="pixel shop-status">{gearStatus(g)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel shop-section" role="region" aria-label="SKINS DO AVATAR">
          <span className="pixel shop-section-title">SKINS DO AVATAR</span>
          <div className="shop-grid shop-grid-4">
            {catalog.skins.map((s) => (
              <button
                key={s.id}
                type="button"
                className="shop-card shop-skin"
                data-card={s.id}
                aria-pressed={picked("skin", s.id)}
                onClick={() => setSel({ kind: "skin", id: s.id })}
              >
                <HeroSprite filter={s.filter} className="shop-skin-sprite" />
                <span className="pixel shop-card-name">{s.name}</span>
                <span className="term shop-bonus">{bonusShort(s.bonus)}</span>
                <span className="pixel shop-status">{skinStatus(s)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="shop-side">
        <div className="panel shop-detail" role="region" aria-label="detalhe">
          {detail()}
        </div>
        <div className="panel shop-message term" role="status">
          {message ?? "Skins são recolors do mesmo sprite — a troca reflete no AVATAR e no Bug Fight."}
        </div>
      </div>
    </section>
  );

  function detail() {
    if (sel.kind === "item") {
      const it = forSale.find((i) => i.id === sel.id);
      if (!it) return null;
      const afford = canPay(player, it.price);
      return (
        <>
          <span className="pixel shop-detail-glyph">
            <GameArt kind="item" id={it.id} scale={4} alt="" fallback={it.glyph} />
          </span>
          <span className="pixel shop-rarity">{it.rarity}</span>
          <span className="pixel shop-detail-name">{it.name}</span>
          <span className="term shop-desc">{it.description}</span>
          <span className="term">{`você possui: ${quantity(player, it.id)} · custo: ${priceLong(it.price)}`}</span>
          <div className="shop-spacer" />
          <button type="button" className={`btn ${afford ? "btn-green" : "btn-locked"}`} disabled={pending || !afford}
            onClick={() => run(`/api/me/shop/items/${it.id}`, `+1 ${it.name}`)}>
            {afford ? "COMPRAR" : insufficient(it.price)}
          </button>
        </>
      );
    }
    if (sel.kind === "gear") {
      const g = catalog.gear.find((x) => x.id === sel.id)!;
      const owned = player.gear.includes(g.id);
      const equipped = isEquipped(player, g.id, g.slot);
      const afford = canPay(player, g.price);
      const label = equipped ? "EQUIPADO" : owned ? "EQUIPAR" : afford ? "COMPRAR E EQUIPAR" : insufficient(g.price);
      const action = owned
        ? () => run(`/api/me/gear/${g.id}/equip`, "ITEM EQUIPADO")
        : () => run(`/api/me/shop/gear/${g.id}`, "ITEM COMPRADO E EQUIPADO");
      return (
        <>
          <span className="pixel shop-detail-glyph">
            <GameArt kind="gear" id={g.id} scale={4} alt="" fallback={g.glyph} />
          </span>
          <span className="pixel shop-rarity">{`${g.rarity} · ${slotName(g.slot)}`}</span>
          <span className="pixel shop-detail-name">{g.name}</span>
          <span className="term shop-desc">{g.description}</span>
          <span className="term shop-bonus">{`bônus: ${bonusLong(g.bonus)}`}</span>
          <span className="term">{`custo: ${owned ? "já possui" : priceLong(g.price)}`}</span>
          {equipped && (
            <button type="button" className="btn btn-dark" disabled={pending}
              onClick={() => run(`/api/me/gear/${g.id}/unequip`, "ITEM REMOVIDO")}>
              REMOVER EQUIPAMENTO
            </button>
          )}
          <div className="shop-spacer" />
          <button type="button" className={`btn ${!equipped && (owned || afford) ? "btn-green" : "btn-locked"}`}
            disabled={pending || equipped || (!owned && !afford)} onClick={action}>
            {label}
          </button>
        </>
      );
    }
    const s = catalog.skins.find((x) => x.id === sel.id)!;
    const owned = player.skins.includes(s.id);
    const worn = player.skin === s.id;
    const afford = canPay(player, s.price);
    const label = worn ? "EQUIPADA" : owned ? "EQUIPAR" : afford ? "COMPRAR E EQUIPAR" : insufficient(s.price);
    const action = owned
      ? () => run(`/api/me/skins/${s.id}/equip`, "SKIN EQUIPADA")
      : () => run(`/api/me/shop/skins/${s.id}`, "SKIN COMPRADA E EQUIPADA");
    return (
      <>
        <HeroSprite filter={s.filter} className="shop-detail-sprite" />
        <span className="pixel shop-rarity">{s.rarity}</span>
        <span className="pixel shop-detail-name">{s.name}</span>
        <span className="term shop-desc">{s.description}</span>
        <span className="term shop-bonus">{`bônus: ${bonusLong(s.bonus)}`}</span>
        <span className="term">{`custo: ${owned ? "já possui" : priceLong(s.price)}`}</span>
        <div className="shop-spacer" />
        <button type="button" className={`btn ${!worn && (owned || afford) ? "btn-green" : "btn-locked"}`}
          disabled={pending || worn || (!owned && !afford)} onClick={action}>
          {label}
        </button>
      </>
    );
  }
}
