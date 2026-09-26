"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import { CONNECTION_FAILED, canPay, insufficient, priceLong, priceShort } from "@/lib/gear";
import { furnitureBonus, officeLevel, officeStats, refundText } from "@/lib/office";
import type { Furniture, Player } from "@/lib/types";
import { GameArt, PriceArt } from "./GameArt";
import { useGame } from "./GameContext";

type Filter = "all" | string;

// Office level 1..5 -> the medal before its name (plan assumptions: office medal).
const MEDALS = ["bronze", "prata", "ouro", "azul", "roxo"];

// Each zone is tiled with its asset-sheet tile, repeated at 2x (assets-apply C17).
const ZONE_TILE: Record<string, string> = { parede: "tile-parede-madeira", piso: "tile-tabua" };

export function OfficeScene() {
  const { player, catalog, setPlayer } = useGame();
  const { zones, furniture } = catalog.office;
  const [filter, setFilter] = useState<Filter>("all");
  const [selId, setSelId] = useState(furniture[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sel = furniture.find((f) => f.id === selId);
  const byId = (id: string) => furniture.find((f) => f.id === id);
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id;
  const stats = officeStats(catalog, player);
  const { level, next } = officeLevel(catalog, stats.comfort);
  const shown = furniture.filter((f) => filter === "all" || f.zone === filter);

  async function run(path: string, body: unknown, done: string) {
    setPending(true);
    try {
      const r = await post<{ player: Player }>(path, body);
      if (!r.ok) return setMessage(r.error?.message ?? CONNECTION_FAILED);
      setPlayer(r.data.player);
      setMessage(done);
    } catch {
      setMessage(CONNECTION_FAILED);
    } finally {
      setPending(false);
    }
  }

  function tap(zone: string, position: number) {
    const current = player.office[zone]?.[position];
    if (current) {
      // Furniture that left the catalog is removed with no refund (AC 35).
      const installed = byId(current);
      const done = installed ? `GUARDADO · ${refundText(installed.price)}` : "GUARDADO";
      return run(`/api/me/office/${zone}/${position}/remove`, undefined, done);
    }
    if (!sel) return;
    if (sel.zone !== zone) return setMessage(sel.zone === "parede" ? "ESSE MÓVEL VAI NA PAREDE" : "ESSE MÓVEL VAI NO PISO");
    if (!canPay(player, sel.price)) return setMessage(insufficient(sel.price));
    return run(`/api/me/office/${zone}/${position}`, { furniture: sel.id }, `${sel.name} INSTALADO`);
  }

  const detailText = (f: Furniture) =>
    `${f.description} · ${zoneName(f.zone)} · conforto +${f.comfort}` + (f.bonus ? ` · ${furnitureBonus(f.bonus)}` : "");

  const filters: [Filter, string][] = [["all", "TODOS"], ...zones.map((z): [Filter, string] => [z.id, z.name])];

  return (
    <section className="scene office" aria-label="OFFICE">
      <div className="office-left">
        <div className="panel panel-wood office-head">
          <span className="pixel">CATÁLOGO</span>
          <span className="term">escolha e clique num espaço da sala</span>
        </div>
        <div className="panel office-catalog" role="region" aria-label="catálogo">
          <div className="office-cards">
            {shown.map((f) => (
              <button
                key={f.id}
                type="button"
                className="office-card"
                data-card={f.id}
                aria-label={f.name}
                aria-pressed={selId === f.id}
                onClick={() => setSelId(f.id)}
              >
                <span className="pixel office-glyph">
                  <GameArt kind="office" id={f.id} scale={2} alt="" fallback={f.glyph} />
                </span>
                <span className={`term office-tag ${f.price.currency}`}>
                  <PriceArt currency={f.price.currency} />
                  {priceShort(f.price).toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="office-filters">
          {filters.map(([id, label]) => (
            <button key={id} type="button" className="office-filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="panel office-detail" role="region" aria-label="detalhe">
          {sel && (
            <>
              <div className="office-detail-head">
                <span className="pixel office-detail-glyph">
                  <GameArt kind="office" id={sel.id} scale={2} alt="" fallback={sel.glyph} />
                </span>
                <span className="pixel office-detail-name">{sel.name}</span>
                <span className="term office-detail-cost">{priceLong(sel.price)}</span>
              </div>
              <span className="term office-detail-desc">{detailText(sel)}</span>
            </>
          )}
        </div>
      </div>

      <div className="panel office-room-panel">
        <div className="office-room-col">
          <div className="office-room-head">
            <span className="pixel office-level">
              <GameArt kind="medal" id={MEDALS[catalog.office.levels.indexOf(level)]} scale={2} alt="" fallback="" className="inline-icon" />
              {level.name}
            </span>
            <span className="term office-count">{`${stats.count} móveis instalados`}</span>
          </div>
          <div className="office-room" role="region" aria-label="sala" style={{ backgroundImage: "url(/art/background/office.png)" }}>
            {zones.map((z) => (
              <div key={z.id} className="office-zone" role="group" aria-label={z.name} style={{ backgroundImage: `url(/art/tile/${ZONE_TILE[z.id]}.png)` }}>
                <span className="pixel office-zone-name">{z.name}</span>
                <div className="office-cells">
                  {(player.office[z.id] ?? Array.from({ length: z.cells }, () => null)).map((id, i) => {
                    const f = id ? byId(id) : undefined;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`office-cell ${z.id}${id ? " filled" : ""}`}
                        data-cell={`${z.id}-${i}`}
                        aria-label={`${z.name} ${i}`}
                        disabled={pending}
                        onClick={() => tap(z.id, i)}
                      >
                        <span className="pixel office-cell-glyph">
                          {f ? <GameArt kind="office" id={f.id} scale={2} alt="" fallback={f.glyph} /> : id ? "?" : "+"}
                        </span>
                        <span className="term office-cell-name">{f ? f.name : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="term office-foot">
            {`${next ? `faltam ${next.min - stats.comfort} de conforto para ${next.name}` : "escritório no nível máximo de conforto"} · clicar num móvel já instalado guarda ele e devolve metade do valor.`}
          </div>
        </div>
        <div className="office-stats" role="region" aria-label="bônus do escritório">
          <Stat label="CONFORTO" value={String(stats.comfort)} tone="purple" />
          <Stat label="XP DE DEPLOY" value={`+${stats.xp}%`} tone="green" />
          <Stat label="TEMPO DE DEPLOY" value={`-${stats.deploy}%`} tone="yellow" />
          <Stat label="SP POR TURNO" value={`+${stats.spregen}`} tone="cyan" />
          <div className="panel office-message term" role="status">
            {message}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="office-stat" data-stat={label}>
      <span className="pixel office-stat-label">{label}</span>
      <span className={`pixel office-stat-value ${tone}`}>{value}</span>
    </div>
  );
}
