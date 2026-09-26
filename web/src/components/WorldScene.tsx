"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { HeroAvatar } from "./HeroAvatar";
import { FxOnce } from "./LoadingFx";
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

// Boss and endgame regions wear the crown on their tag (assets-apply assumptions).
const CROWNED = ["CHEFE", "ENDGAME"];

export function WorldScene() {
  const { player, catalog, setPlayer } = useGame();
  const [pending, setPending] = useState(false);
  // The region just reached by a successful travel; `key` replays the teleport strip.
  const [arrived, setArrived] = useState<{ region: string; key: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const current = catalog.regions.find((r) => r.id === player.region);

  async function travel(id: string) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player }>("/api/me/travel", { region: id });
      if (r.ok) {
        setArrived((a) => ({ region: r.data.player.region, key: (a?.key ?? 0) + 1 }));
        setPlayer(r.data.player);
      }
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
                {here && <GameArt kind="build" id="flag" scale={1} alt="" fallback="" className="node-flag" />}
              </span>
              {arrived?.region === r.id && <FxOnce key={arrived.key} id="teleport" />}
              {here && <HeroAvatar look={player} scale={1} anim={pending ? "walk" : "idle"} className="map-hero" />}
              <span className={`pixel node-chip${here ? " here" : ""}`}>{r.name}</span>
            </div>
          );
        })}
        {/* the campfire of the world background (art 112,126) burns in a loop */}
        <span className="fx-fire" aria-hidden="true" style={{ backgroundImage: "url(/art/fx/fire.png)" }} />
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
                <span className="pixel chip chip-green">
                  {CROWNED.includes(r.tag) && <GameArt kind="ic" id="crown" scale={1} alt="" fallback="" className="inline-icon" />}
                  {r.tag}
                </span>
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
                <GameArt kind={open ? "btn" : "ic"} id={open ? "start" : "lock"} scale={1} alt="" fallback="" className="inline-icon" />
                {open ? "VIAJAR ATÉ AQUI" : `REQUER NÍVEL ${r.minLevel}`}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
