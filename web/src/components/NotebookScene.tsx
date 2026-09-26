"use client";

import { useRef, useState } from "react";
import { post } from "@/lib/api";
import { CONNECTION_FAILED } from "@/lib/gear";
import { effectText, notebookBonus, rarityOf } from "@/lib/notebook";
import type { Player } from "@/lib/types";
import { useGame } from "./GameContext";

const STATS = [
  ["dmg", "PODER"],
  ["hp", "VIDA"],
  ["sp", "SP"],
  ["spregen", "REGEN SP"],
] as const;

export function NotebookScene() {
  const { player, catalog, setPlayer } = useGame();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const nb = catalog.notebook;
  const rarity = rarityOf(catalog, player);
  const level = player.notebook.level;
  const max = nb.levels.length;
  const atMax = level >= max;
  const next = atMax ? null : nb.levels[level];
  const cost = next?.cost ?? 0;

  async function run(path: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const r = await post<{ player: Player }>(path);
      if (!r.ok) return setMessage(r.error?.message ?? CONNECTION_FAILED);
      setPlayer(r.data.player);
      setMessage(null);
    } catch {
      setMessage(CONNECTION_FAILED);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <section className="scene notebook" aria-label="NOTEBOOK">
      {message && <p className="notebook-msg" role="status">{message}</p>}
      <div className="notebook-layout">
        <div className="panel notebook-panel">
          <img src={`/art/sprite/notebook-${rarity.id}.png`} alt="" width={64} height={48} />
          <p className="pixel">{`NOTEBOOK ${rarity.name}`}</p>
          <p className="term">{`NÍVEL ${Math.min(level, max)}/${max}`}</p>
          <div className="bar" role="progressbar" aria-valuemin={1} aria-valuenow={Math.min(level, max)} aria-valuemax={max}>
            <div style={{ width: `${(Math.min(level, max) / max) * 100}%` }} />
          </div>
          <ul className="notebook-stats">
            {STATS.map(([type, label]) => (
              <li key={type} className="term">{`${label} +${notebookBonus(catalog, player, type)}${type === "dmg" ? "%" : ""}`}</li>
            ))}
          </ul>
          {atMax ? (
            <p className="pixel">NÍVEL MÁXIMO</p>
          ) : (
            <button type="button" className="btn btn-green" disabled={pending || player.coins < cost} onClick={() => run("/api/me/notebook/enhance")}>
              {player.coins < cost ? "COINS INSUFICIENTES" : `APRIMORAR · ${cost}c`}
            </button>
          )}
        </div>
        <ul className="notebook-upgrades">
          {nb.upgrades.map((u) => {
            const k = player.notebook.upgrades[u.id] ?? 0;
            const capped = Math.min(k, u.levels.length);
            const step = capped < u.levels.length ? u.levels[capped] : null;
            const locked = !!step && level < step.minLevel;
            const broke = !!step && !locked && player.coins < step.cost;
            return (
              <li key={u.id} className="panel notebook-card">
                <img src={`/art/icon/nbup-${u.id}.png`} alt="" width={32} height={32} />
                <p className="pixel">{u.name}</p>
                <p className="term">{u.description}</p>
                <p className="term">{`NV ${capped}/${u.levels.length}`}</p>
                <p className="term">{effectText(u, k)}</p>
                {step ? (
                  <button
                    type="button"
                    className="btn btn-green"
                    disabled={pending || locked || broke}
                    onClick={() => run(`/api/me/notebook/upgrades/${u.id}`)}
                  >
                    {locked ? `REQUER NOTEBOOK NV ${step.minLevel}` : broke ? "COINS INSUFICIENTES" : `UPGRADE · ${step.cost}c`}
                  </button>
                ) : (
                  <p className="pixel">NV MÁX.</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
