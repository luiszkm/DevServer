"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { HeroAvatar } from "./HeroAvatar";
import { useGame } from "./GameContext";

// Centers of the painted road, as a share of the 320×180 art. Index 0 is the entrance.
const TRAIL = [
  { x: "10%", y: "83%" },
  { x: "20%", y: "68%" },
  { x: "35%", y: "54%" },
  { x: "50%", y: "67%" },
  { x: "70%", y: "42%" },
  { x: "86%", y: "27%" },
];

const WALK_MS = 1400;

const LOCKED = "grayscale(1) brightness(.6)";

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function RegionScene({ regionId }: { regionId: string }) {
  const { player, catalog, setPlayer } = useGame();
  const router = useRouter();
  const region = catalog.regions.find((r) => r.id === regionId);
  const cleared = region ? (player.progress?.[region.id] ?? 0) : 0;
  const here = region?.id === player.region;
  const [heroAt, setHeroAt] = useState(cleared);
  const [walking, setWalking] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const startRef = useRef<(() => void) | null>(null);
  const walkTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (walkTimer.current !== null) window.clearTimeout(walkTimer.current);
  }, []);

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

  const path = region.path ?? [];
  const hero = TRAIL[Math.min(heroAt, TRAIL.length - 1)] ?? TRAIL[0];
  const spot = cleared === 0 ? "entrada" : path[cleared - 1]?.id;
  const nextNode = path[cleared];
  const nextEnemy = nextNode ? catalog.enemies.find((e) => e.id === nextNode.enemy) : undefined;

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
    const node = path[index];
    if (!node) return;
    const go = () => {
      if (startRef.current !== go) return;
      startRef.current = null;
      if (walkTimer.current !== null) window.clearTimeout(walkTimer.current);
      walkTimer.current = null;
      void start(node.id);
    };
    startRef.current = go;
    if (reducedMotion()) {
      go();
      return;
    }
    // The walk is decoration. If the CSS transition never ends, the fight still starts.
    setWalking(true);
    requestAnimationFrame(() => setHeroAt(index + 1));
    walkTimer.current = window.setTimeout(go, WALK_MS);
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
        {path.map((node, index) => {
          const enemy = catalog.enemies.find((e) => e.id === node.enemy);
          const beaten = index < cleared;
          const next = here && index === cleared;
          const open = next && !pending && !walking;
          const place = TRAIL[index + 1] ?? TRAIL[TRAIL.length - 1];
          const mark = ["region-stop", node.boss && "is-boss", beaten && "is-done", next && "is-next", !next && !beaten && "is-locked"]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={node.id}
              type="button"
              className={mark}
              style={{ left: place.x, top: place.y }}
              data-node={node.id}
              aria-label={enemy?.name ?? node.enemy}
              disabled={!open}
              onClick={() => enter(index)}
            >
              <span className="pixel region-stop-badge">
                {node.boss && <GameArt kind="ic" id="crown" scale={1} alt="" fallback="" />}
                {beaten && <GameArt kind="build" id="flag" scale={1} alt="" fallback="" />}
                {!node.boss && !beaten && index + 1}
              </span>
            </button>
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
        {here && nextEnemy && (
          <p className="pixel region-caption">{`clique em ${cleared + 1} para enfrentar ${nextEnemy.name}`}</p>
        )}
        {here && !nextNode && path.length > 0 && <p className="pixel region-caption">caminho concluído</p>}
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
