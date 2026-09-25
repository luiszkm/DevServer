"use client";

import { useState } from "react";
import { type ApiResult, post, put } from "@/lib/api";
import { availableFor } from "@/lib/avatar";
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
import type { AvatarOption, Gear, Item, Player, Price, Recipe, Skin } from "@/lib/types";
import { GameArt, PriceArt } from "./GameArt";
import { useGame } from "./GameContext";
import { HeroAvatar } from "./HeroAvatar";

type Selection = { kind: "item" | "gear" | "skin" | "look" | "recipe"; id: string };

// What a forge recipe can do for this player, in the button's priority order.
function forgeState(player: Player, r: Recipe) {
  const owned = r.output.kind === "gear" && player.gear.includes(r.output.id);
  const materials = r.ingredients.every((i) => quantity(player, i.item) >= i.quantity);
  const afford = !r.price || canPay(player, r.price);
  return { owned, materials, afford, ready: !owned && materials && afford };
}

export function ShopScene() {
  const { player, catalog, setPlayer } = useGame();
  const forSale = catalog.items.filter((i): i is Item & { price: Price } => !!i.price);
  const [sel, setSel] = useState<Selection>({ kind: "item", id: forSale[0]?.id ?? "" });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(path: string, done: string, request: () => Promise<ApiResult<{ player: Player }>> = () => post(path)) {
    setPending(true);
    try {
      const r = await request();
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
  const price = (p: Price) => (
    <>
      <PriceArt currency={p.currency} />
      {priceShort(p)}
    </>
  );
  const gearStatus = (g: Gear) =>
    isEquipped(player, g.id, g.slot) ? "EQUIPADO" : player.gear.includes(g.id) ? "NO INVENTÁRIO" : g.price ? price(g.price) : "FORJA";
  const skinStatus = (s: Skin) =>
    player.skin === s.id ? "EQUIPADA" : player.skins.includes(s.id) ? "NO GUARDA-ROUPA" : price(s.price);
  // Only the styles this dev's body can wear are for sale here.
  const looks = catalog.avatar.options.filter((o): o is AvatarOption & { price: Price } => !!o.price && availableFor(o, player.body));
  const partName = (id: string) => catalog.avatar.parts.find((p) => p.id === id)?.name ?? id;
  const lookStatus = (o: AvatarOption & { price: Price }) =>
    player.appearance[o.part] === o.id ? "EM USO" : player.looks.includes(o.id) ? "NO GUARDA-ROUPA" : price(o.price);
  const picked = (kind: Selection["kind"], id: string) => sel.kind === kind && sel.id === id;
  const output = (r: Recipe) =>
    r.output.kind === "gear" ? catalog.gear.find((g) => g.id === r.output.id) : catalog.items.find((i) => i.id === r.output.id);
  const itemName = (id: string) => catalog.items.find((i) => i.id === id)?.name ?? id;
  const recipeStatus = (r: Recipe) => {
    const st = forgeState(player, r);
    return st.owned ? "JÁ POSSUI" : st.ready ? "PRONTO" : "FALTAM MATERIAIS";
  };

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
                <span className="pixel shop-price">{price(it.price)}</span>
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
                <HeroAvatar look={{ ...player, skin: s.id }} scale={1} className="shop-skin-sprite" />
                <span className="pixel shop-card-name">{s.name}</span>
                <span className="term shop-bonus">{bonusShort(s.bonus)}</span>
                <span className="pixel shop-status">{skinStatus(s)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel shop-section" role="region" aria-label="ESTILOS DO AVATAR">
          <span className="pixel shop-section-title">ESTILOS DO AVATAR</span>
          <div className="shop-grid shop-grid-4">
            {looks.map((o) => (
              <button
                key={o.id}
                type="button"
                className="shop-card shop-skin"
                data-card={o.id}
                aria-pressed={picked("look", o.id)}
                onClick={() => setSel({ kind: "look", id: o.id })}
              >
                <HeroAvatar look={wearing(o)} scale={1} className="shop-skin-sprite" />
                <span className="pixel shop-card-name">{o.name}</span>
                <span className="term shop-bonus">{partName(o.part)}</span>
                <span className="pixel shop-status">{lookStatus(o)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel shop-section" role="region" aria-label="FORJA">
          <span className="pixel shop-section-title">FORJA</span>
          <div className="shop-grid shop-grid-3">
            {catalog.recipes.map((r) => {
              const out = output(r);
              return (
                <button
                  key={r.id}
                  type="button"
                  className="shop-card"
                  data-recipe={r.id}
                  aria-pressed={picked("recipe", r.id)}
                  onClick={() => setSel({ kind: "recipe", id: r.id })}
                >
                  <span className="pixel shop-glyph">
                    <GameArt kind={r.output.kind} id={r.output.id} scale={2} alt="" fallback={out?.glyph ?? "?"} />
                  </span>
                  <span className="shop-card-text">
                    <span className="pixel shop-card-name">{out?.name ?? r.output.id}</span>
                  </span>
                  <span className="pixel shop-status">{recipeStatus(r)}</span>
                </button>
              );
            })}
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
    if (sel.kind === "recipe") return recipeDetail();
    if (sel.kind === "look") {
      const o = looks.find((x) => x.id === sel.id);
      return o ? lookDetail(o) : null;
    }
    if (sel.kind === "gear") {
      const g = catalog.gear.find((x) => x.id === sel.id)!;
      const owned = player.gear.includes(g.id);
      const equipped = isEquipped(player, g.id, g.slot);
      const afford = !!g.price && canPay(player, g.price);
      const label = equipped ? "EQUIPADO" : owned ? "EQUIPAR" : !g.price ? "SÓ NA FORJA" : afford ? "COMPRAR E EQUIPAR" : insufficient(g.price);
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
          <span className="term">{`custo: ${owned ? "já possui" : g.price ? priceLong(g.price) : "só na forja"}`}</span>
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
    return skinDetail(s);
  }

  function recipeDetail() {
    const r = catalog.recipes.find((x) => x.id === sel.id);
    const out = r && output(r);
    if (!r || !out) return null;
    const st = forgeState(player, r);
    const gear = r.output.kind === "gear" ? (out as Gear) : null;
    const label = st.ready
      ? gear ? "FORJAR E EQUIPAR" : "FORJAR"
      : st.owned ? "JÁ POSSUI" : !st.materials ? "FALTAM MATERIAIS" : insufficient(r.price!);
    return (
      <>
        <span className="pixel shop-detail-glyph">
          <GameArt kind={r.output.kind} id={out.id} scale={4} alt="" fallback={out.glyph} />
        </span>
        <span className="pixel shop-rarity">{out.rarity}</span>
        <span className="pixel shop-detail-name">{out.name}</span>
        <span className="term shop-desc">{out.description}</span>
        {gear && <span className="term shop-bonus">{`bônus: ${bonusLong(gear.bonus)}`}</span>}
        <ul className="forge-materials" aria-label="materiais">
          {r.ingredients.map((i) => (
            <li key={i.item} className="term">{`${itemName(i.item)} ${quantity(player, i.item)}/${i.quantity}`}</li>
          ))}
        </ul>
        {r.price && <span className="term">{`custo: ${priceLong(r.price)}`}</span>}
        <div className="shop-spacer" />
        <button type="button" className={`btn ${st.ready ? "btn-green" : "btn-locked"}`} disabled={pending || !st.ready}
          onClick={() => run(`/api/me/forge/${r.id}`, gear ? "ITEM FORJADO E EQUIPADO" : `+1 ${out.name}`)}>
          {label}
        </button>
      </>
    );
  }

  // The player's own hero with this option on, the way the avatar editor previews it.
  function wearing(o: AvatarOption): Player {
    return { ...player, appearance: { ...player.appearance, [o.part]: o.id } };
  }

  function lookDetail(o: AvatarOption & { price: Price }) {
    const owned = player.looks.includes(o.id);
    const worn = player.appearance[o.part] === o.id;
    const afford = canPay(player, o.price);
    const label = worn ? "EM USO" : owned ? "USAR" : afford ? "COMPRAR E USAR" : insufficient(o.price);
    const action = owned
      ? () => run("/api/me/appearance", "VISUAL SALVO", () => put("/api/me/appearance", { appearance: { [o.part]: o.id } }))
      : () => run(`/api/me/shop/looks/${o.id}`, `${o.name} COMPRADO`);
    return (
      <>
        <HeroAvatar look={wearing(o)} scale={2} className="shop-detail-sprite" />
        <span className="pixel shop-rarity">{partName(o.part)}</span>
        <span className="pixel shop-detail-name">{o.name}</span>
        <span className="term shop-desc">Estilo extra para o seu dev. Troque quando quiser no AVATAR → VISUAL.</span>
        <span className="term">{`custo: ${owned ? "já possui" : priceLong(o.price)}`}</span>
        <div className="shop-spacer" />
        <button type="button" className={`btn ${!worn && (owned || afford) ? "btn-green" : "btn-locked"}`}
          disabled={pending || worn || (!owned && !afford)} onClick={action}>
          {label}
        </button>
      </>
    );
  }

  function skinDetail(s: Skin) {
    const owned = player.skins.includes(s.id);
    const worn = player.skin === s.id;
    const afford = canPay(player, s.price);
    const label = worn ? "EQUIPADA" : owned ? "EQUIPAR" : afford ? "COMPRAR E EQUIPAR" : insufficient(s.price);
    const action = owned
      ? () => run(`/api/me/skins/${s.id}/equip`, "SKIN EQUIPADA")
      : () => run(`/api/me/shop/skins/${s.id}`, "SKIN COMPRADA E EQUIPADA");
    return (
      <>
        <HeroAvatar look={{ ...player, skin: s.id }} scale={2} className="shop-detail-sprite" />
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
