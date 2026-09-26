"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const FALLBACK_POS = { x: "50%", y: "50%" };

// A region above the player's level shows its marker greyed out (plan assumptions: marker states).
const LOCKED = "grayscale(1) brightness(.6)";

// Boss and endgame regions wear the crown on their tag (assets-apply assumptions).
const CROWNED = ["CHEFE", "ENDGAME"];

function posOf(id: string) {
  return POSITIONS[id] ?? FALLBACK_POS;
}

export function WorldScene() {
  const { player, catalog, setPlayer } = useGame();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // The region just reached by a successful travel; `key` replays the teleport strip.
  const [arrived, setArrived] = useState<{ region: string; key: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Marker the player opened on the map (info panel + walk target).
  const [focus, setFocus] = useState<string | null>(null);
  // Where the hero stands on the map (may lead player.region while walking to a preview).
  const [heroAt, setHeroAt] = useState(player.region);
  const [walking, setWalking] = useState(false);
  const current = catalog.regions.find((r) => r.id === player.region);
  const focused = focus ? catalog.regions.find((r) => r.id === focus) : null;
  const heroPos = posOf(heroAt);

  useEffect(() => {
    setHeroAt(player.region);
    setWalking(false);
  }, [player.region]);

  function goTo(id: string) {
    if (pending || walking) return;
    setMessage(null);
    setFocus(id);
    if (id === heroAt) return;
    setWalking(true);
    // Start the CSS transition from the current spot on the next frame. A hidden hero (the phone
    // map) never fires transitionend, which would leave ENTRAR disabled.
    requestAnimationFrame(() => {
      setHeroAt(id);
      requestAnimationFrame(() => {
        const hero = document.querySelector(".map-hero");
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        // jsdom loads no stylesheet, so only a hero the page actually hides (the phone map) skips the walk.
        if (reduce || (hero && getComputedStyle(hero).display === "none")) setWalking(false);
      });
    });
  }

  async function travel(id: string) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player }>("/api/me/travel", { region: id });
      if (r.ok) {
        setArrived((a) => ({ region: r.data.player.region, key: (a?.key ?? 0) + 1 }));
        setPlayer(r.data.player);
        setFocus(r.data.player.region);
        router.push(`/mundo/${r.data.player.region}`);
      } else setMessage(r.error?.message ?? "erro ao viajar");
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
          const pos = posOf(r.id);
          const here = r.id === player.region;
          const open = player.level >= r.minLevel;
          const selected = r.id === focus;
          return (
            <div
              key={r.id}
              className={`map-node${selected ? " selected" : ""}`}
              style={{ left: pos.x, top: pos.y }}
              data-region={r.id}
              aria-current={here ? "location" : undefined}
            >
              <button
                type="button"
                className={`node-marker${here ? " here" : ""}`}
                style={open ? undefined : { filter: LOCKED }}
                aria-label={r.name}
                aria-pressed={selected}
                disabled={pending || walking}
                onClick={() => goTo(r.id)}
              >
                <GameArt kind="region" id={r.id} scale={2} alt="" fallback={r.tag} />
                {here && <GameArt kind="build" id="flag" scale={1} alt="" fallback="" className="node-flag" />}
              </button>
              {arrived?.region === r.id && <FxOnce key={arrived.key} id="teleport" />}
              <span className={`pixel node-chip${here ? " here" : ""}`}>{r.name}</span>
            </div>
          );
        })}
        <div
          className={`map-hero${walking ? " walking" : ""}`}
          style={{ left: heroPos.x, top: heroPos.y }}
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.propertyName === "left" || e.propertyName === "top") setWalking(false);
          }}
        >
          <HeroAvatar look={player} scale={1} anim={walking || pending ? "walk" : "idle"} />
        </div>
        {/* the campfire of the world background (art 112,126) burns in a loop */}
        <span className="fx-fire" aria-hidden="true" style={{ backgroundImage: "url(/art/fx/fire.png)" }} />
        <div className="term world-current">{`região atual: ${current?.name ?? player.region}`}</div>
        {focused && (
          <aside className="world-panel panel" role="dialog" aria-label={focused.name}>
            <div className="region-head">
              <span className="pixel chip chip-green">
                {CROWNED.includes(focused.tag) && (
                  <GameArt kind="ic" id="crown" scale={1} alt="" fallback="" className="inline-icon" />
                )}
                {focused.tag}
              </span>
              <span className="term">{`NÍVEL ${focused.minLevel}+`}</span>
            </div>
            <span className="pixel region-name">{focused.name}</span>
            <span className="term region-desc">{focused.description}</span>
            {message && focus === focused.id && (
              <p role="alert" className="term field-error">
                {message}
              </p>
            )}
            <div className="world-panel-actions">
              <button
                type="button"
                className={`btn ${player.level >= focused.minLevel || focused.id === player.region ? "btn-green" : "btn-locked"}`}
                disabled={(player.level < focused.minLevel && focused.id !== player.region) || pending || walking}
                onClick={() => (focused.id === player.region ? router.push(`/mundo/${focused.id}`) : travel(focused.id))}
              >
                <GameArt
                  kind={player.level >= focused.minLevel || focused.id === player.region ? "btn" : "ic"}
                  id={player.level >= focused.minLevel || focused.id === player.region ? "start" : "lock"}
                  scale={1}
                  alt=""
                  fallback=""
                  className="inline-icon"
                />
                {focused.id === player.region ? "EXPLORAR" : player.level >= focused.minLevel ? "ENTRAR" : `REQUER NÍVEL ${focused.minLevel}`}
              </button>
              <button type="button" className="btn btn-dark" disabled={pending || walking} onClick={() => setFocus(null)}>
                FECHAR
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
