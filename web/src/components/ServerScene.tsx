"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import { CONNECTION_FAILED, canPay, insufficient, priceShort } from "@/lib/gear";
import { effectsText, rackStats, slotLabel, statBonus, statValue } from "@/lib/rack";
import type { Player, Price, RackComponent } from "@/lib/types";
import { useGame } from "./GameContext";

const HELLO = "> selecione um componente para instalar no rack.";

/** The currency word the terminal uses: "coins" or "gems". */
const unit = (p: Price) => (p.currency === "gems" ? "gems" : "coins");

export function ServerScene() {
  const { player, catalog, setPlayer } = useGame();
  const { components, slots } = catalog.rack;
  const [message, setMessage] = useState(HELLO);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const rack = player.rack ?? Array.from({ length: slots }, () => null);
  const byId = (id: string) => components.find((k) => k.id === id);
  const stats = rackStats(catalog, player);

  function say(text: string, alert: string | null = null) {
    setMessage(text);
    setNotice(alert);
  }

  async function run(path: string, body: unknown, done: (p: Player) => string) {
    setPending(true);
    try {
      const r = await post<{ player: Player }>(path, body);
      if (!r.ok) return say(`> ${r.error?.message ?? CONNECTION_FAILED}`);
      setPlayer(r.data.player);
      say(done(r.data.player));
    } catch {
      say(`> ${CONNECTION_FAILED}`);
    } finally {
      setPending(false);
    }
  }

  function buy(k: RackComponent) {
    if (!rack.includes(null)) return say("> rack cheio. remova um componente antes.");
    if (!canPay(player, k.price)) return say(`> ${unit(k.price)} insuficientes para ${k.name}.`, insufficient(k.price));
    return run("/api/me/rack", { component: k.id }, (p) => {
      // The server picks the slot (first free); read it back from the new rack.
      const i = p.rack.findIndex((id, j) => id !== null && rack[j] === null);
      return `> ${k.name} instalado no slot ${slotLabel(i)} · ${effectsText(k)}`;
    });
  }

  function tapSlot(i: number) {
    const id = rack[i];
    if (!id) return say(`> slot ${slotLabel(i)} vazio. compre um componente ao lado.`);
    // A component that left the catalog is removed with no refund (AC 20).
    const k = byId(id);
    const done = k ? `> ${k.name} removido. ${k.price.amount} ${unit(k.price)} devolvidos.` : "> componente removido.";
    return run(`/api/me/rack/${i}/remove`, undefined, () => done);
  }

  return (
    <section className="scene server" aria-label="SERVER">
      <div className="server-stats" role="region" aria-label="stats do rack">
        {stats.map((s) => (
          <div key={s.stat.id} className="panel server-stat" data-stat={s.stat.id}>
            <div className="server-stat-head">
              <span className="pixel server-stat-name">{s.stat.name}</span>
              <span className="pixel server-stat-value" style={{ color: s.stat.color }}>
                {statValue(s)}
              </span>
            </div>
            <div className="server-bar">
              <div className="server-bar-fill" style={{ width: `${Math.max(0, Math.min(100, s.value))}%`, background: s.stat.color }} />
            </div>
            <span className="term server-stat-bonus">{statBonus(s)}</span>
          </div>
        ))}
      </div>

      <div className="server-body">
        <div className="panel server-rack" role="region" aria-label="RACK LOCALHOST-01">
          <span className="pixel server-title">RACK LOCALHOST-01</span>
          {rack.map((id, i) => {
            const k = id ? byId(id) : undefined;
            return (
              <button
                key={i}
                type="button"
                className={`server-slot${id ? " filled" : ""}`}
                data-slot={i}
                disabled={pending}
                onClick={() => tapSlot(i)}
              >
                <span className="pixel server-slot-glyph" style={k ? { background: k.color } : undefined}>
                  {k ? k.glyph : id ? "?" : "-"}
                </span>
                <span className="pixel server-slot-name">{k ? k.name : id ? "" : `SLOT ${slotLabel(i)} VAZIO`}</span>
                <span className="term server-slot-note">{k ? effectsText(k) : id ? "" : "livre"}</span>
              </button>
            );
          })}
        </div>

        <div className="server-right">
          <div className="panel server-shop" role="region" aria-label="LOJA DE COMPONENTES">
            <span className="pixel server-title">LOJA DE COMPONENTES</span>
            <div className="server-cards">
              {components.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="server-card"
                  data-card={k.id}
                  aria-label={k.name}
                  disabled={pending}
                  style={{ opacity: canPay(player, k.price) ? 1 : 0.45 }}
                  onClick={() => buy(k)}
                >
                  <span className="server-card-head">
                    <span className="pixel server-card-glyph" style={{ background: k.color }}>
                      {k.glyph}
                    </span>
                    <span className="pixel server-card-name">{k.name}</span>
                  </span>
                  <span className="server-card-foot">
                    <span className="term server-card-effect">{effectsText(k)}</span>
                    <span className="pixel server-card-price">{priceShort(k.price).toUpperCase()}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel server-terminal term" role="status">
            {message}
          </div>
          {notice && (
            <div className="pixel server-notice" role="alert">
              {notice}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
