"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { useGame } from "./GameContext";

// Map positions are presentation only; the regions themselves come from the catalog.
const POSITIONS: Record<string, { x: string; y: string }> = {
  vila: { x: "20%", y: "64%" },
  floresta: { x: "40%", y: "34%" },
  mercado: { x: "61%", y: "72%" },
  caverna: { x: "74%", y: "30%" },
  torre: { x: "86%", y: "58%" },
  nuvem: { x: "48%", y: "12%" },
};

// A region above the player's level shows its marker greyed out (plan assumptions: marker states).
const LOCKED = "grayscale(1) brightness(.6)";

export function WorldScene() {
  const { player, catalog, setPlayer } = useGame();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const current = catalog.regions.find((r) => r.id === player.region);

  async function travel(id: string) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player }>("/api/me/travel", { region: id });
      if (r.ok) setPlayer(r.data.player);
      else setMessage(r.error?.message ?? "erro ao viajar");
    } catch {
      setMessage("SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="scene world" aria-label="MUNDO">
      <div className="world-map" style={{ backgroundImage: "url(/art/background/world.png)" }}>
        {catalog.regions.map((r) => {
          const pos = POSITIONS[r.id] ?? { x: "50%", y: "50%" };
          const here = r.id === player.region;
          const open = player.level >= r.minLevel;
          return (
            <div
              key={r.id}
              className="map-node"
              style={{ left: pos.x, top: pos.y }}
              data-region={r.id}
              aria-current={here ? "location" : undefined}
            >
              <span className={`node-marker${here ? " here" : ""}`} style={open ? undefined : { filter: LOCKED }}>
                <GameArt kind="region" id={r.id} scale={2} alt="" fallback={r.tag} />
              </span>
              <span className={`pixel node-chip${here ? " here" : ""}`}>{r.name}</span>
            </div>
          );
        })}
        <div className="term world-current">{`região atual: ${current?.name ?? player.region}`}</div>
      </div>
      <div className="world-list">
        {message && (
          <p role="alert" className="term field-error">
            {message}
          </p>
        )}
        {catalog.regions.map((r) => {
          const open = player.level >= r.minLevel;
          return (
            <article key={r.id} className="panel region-card" aria-label={r.name}>
              <div className="region-head">
                <span className="pixel chip chip-green">{r.tag}</span>
                <span className="term">{`NÍVEL ${r.minLevel}+`}</span>
              </div>
              <span className="pixel region-name">{r.name}</span>
              <span className="term region-desc">{r.description}</span>
              <button
                type="button"
                className={`btn ${open ? "btn-green" : "btn-locked"}`}
                disabled={!open || pending}
                onClick={() => travel(r.id)}
              >
                {open ? "VIAJAR ATÉ AQUI" : `REQUER NÍVEL ${r.minLevel}`}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
