"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { HeroAvatar } from "./HeroAvatar";
import { useGame } from "./GameContext";

// Same trail on every region map. Index 0 is the entrance; nodes sit on 1..5.
const TRAIL = [
  { x: "8.75%", y: "83.33%" },
  { x: "17.5%", y: "71.11%" },
  { x: "34.375%", y: "53.33%" },
  { x: "52.5%", y: "68.89%" },
  { x: "68.75%", y: "43.33%" },
  { x: "86.25%", y: "26.67%" },
];

const LOCKED = "grayscale(1) brightness(.6)";

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function RegionScene({ regionId }: { regionId: string }) {
  const { player, catalog, setPlayer } = useGame();
  const router = useRouter();
  const region = catalog.regions.find((r) => r.id === regionId);
  const cleared = region ? (player.progress[region.id] ?? 0) : 0;
  const here = region?.id === player.region;
  const [heroAt, setHeroAt] = useState(cleared);
  const [walking, setWalking] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const startRef = useRef<(() => void) | null>(null);

  if (!region) {
    return (
      <section className="scene region" aria-label="região">
        <p className="pixel">região desconhecida</p>
        <a className="btn btn-dark" href="/mundo">
          VOLTAR AO MUNDO
        </a>
      </section>
    );
  }

  const hero = TRAIL[Math.min(heroAt, TRAIL.length - 1)];
  const spot = cleared === 0 ? "entrada" : region.path[cleared - 1]?.id;

  async function start(nodeId: string) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player }>("/api/me/battle", { node: nodeId });
      if (!r.ok) {
        setMessage(r.error?.message ?? "erro ao entrar na luta");
        return;
      }
      setPlayer(r.data.player);
      router.push("/bug-fight");
    } catch {
      setMessage("SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
      setWalking(false);
    }
  }

  function enter(index: number) {
    if (!here || pending || walking) return;
    const node = region!.path[index];
    if (!node) return;
    const go = () => {
      startRef.current = null;
      void start(node.id);
    };
    if (reducedMotion()) {
      go();
      return;
    }
    startRef.current = go;
    setWalking(true);
    requestAnimationFrame(() => setHeroAt(index + 1));
  }

  return (
    <section className="scene region" aria-label={region.name}>
      <div
        className="region-map"
        style={{ backgroundImage: `url(/art/background/region-${region.id}.png)` }}
      >
        <a className="btn btn-dark region-back" href="/mundo">
          VOLTAR AO MUNDO
        </a>
        {region.path.map((node, index) => {
          const enemy = catalog.enemies.find((e) => e.id === node.enemy);
          const beaten = index < cleared;
          const next = here && index === cleared;
          const open = next && !pending && !walking;
          return (
            <div
              key={node.id}
              className={`map-node region-node${next ? " next" : ""}`}
              style={{ left: TRAIL[index + 1].x, top: TRAIL[index + 1].y }}
              data-node={node.id}
            >
              <button
                type="button"
                className="node-marker"
                style={open || beaten ? undefined : { filter: LOCKED }}
                aria-label={enemy?.name ?? node.enemy}
                disabled={!open}
                onClick={() => enter(index)}
              >
                {node.boss && <GameArt kind="ic" id="crown" scale={1} alt="" fallback="" />}
                {beaten && <GameArt kind="build" id="flag" scale={1} alt="" fallback="" />}
              </button>
              <span className="pixel node-chip">{enemy?.name ?? node.id}</span>
            </div>
          );
        })}
        <div
          className={`region-hero${walking ? " walking" : ""}`}
          style={{ left: hero.x, top: hero.y }}
          data-at={spot}
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget || e.propertyName !== "left") return;
            startRef.current?.();
          }}
        >
          <HeroAvatar look={player} scale={1} anim={walking || pending ? "walk" : "idle"} />
        </div>
        {!here && <p className="pixel region-note">você não está nesta região</p>}
        {message && (
          <p role="alert" className="term region-note">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
