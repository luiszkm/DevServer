"use client";

import { useCallback, useEffect, useState } from "react";
import { post } from "@/lib/api";
import { eventText } from "@/lib/battleLog";
import { skinFilter } from "@/lib/gear";
import type { Battle, BattleEvent, Player } from "@/lib/types";
import { GameArt, nativeSize } from "./GameArt";
import { useGame } from "./GameContext";
import { HeroSprite } from "./HeroSprite";

// Whole-number zoom per native enemy size, so every enemy fits the 180x150 sprite box.
const ENEMY_SCALE: Record<number, number> = { 32: 4, 48: 3, 64: 2 };

type TurnResponse = { battle: Battle | null; player: Player; events: BattleEvent[] };

export function BattleScene() {
  const { player, catalog, setPlayer } = useGame();
  // undefined = loading, null = the encounter ended (rollback or defeat).
  const [battle, setBattle] = useState<Battle | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const addLog = (...lines: string[]) => setLog((l) => [...l, ...lines].slice(-6));
  const enemyOf = (b: Battle) => catalog.enemies.find((e) => e.region === b.region)!;
  const regionName = (id: string) => catalog.regions.find((r) => r.id === id)!.name;

  const start = useCallback(async () => {
    setBattle(undefined);
    setLoadFailed(false);
    try {
      const r = await post<{ battle: Battle; player: Player }>("/api/me/battle");
      if (!r.ok) return setLoadFailed(true);
      setBattle(r.data.battle);
      setPlayer(r.data.player);
      const enemy = catalog.enemies.find((e) => e.region === r.data.battle.region)!;
      setLog([`> um ${enemy.name} apareceu em ${regionName(r.data.battle.region)}!`, "> escolha um comando."]);
    } catch {
      setLoadFailed(true);
    }
    // regionName reads the same catalog; listing catalog is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, setPlayer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the encounter
    start();
  }, [start]);

  async function act(path: string, body: Record<string, string>) {
    if (!battle) return;
    const enemy = enemyOf(battle);
    setPending(true);
    try {
      const r = await post<TurnResponse>(path, body);
      if (!r.ok) return addLog(`> ${r.error?.message ?? "erro no combate"}`);
      addLog(...r.data.events.map((e) => eventText(e, enemy, catalog)));
      setPlayer(r.data.player);
      setBattle(r.data.battle);
    } catch {
      addLog("> SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  if (loadFailed) {
    return (
      <section className="scene battle battle-center" aria-label="BUG FIGHT">
        <p className="pixel alert">SERVIDOR FORA DO AR</p>
        <button type="button" className="btn btn-yellow" onClick={start}>
          TENTAR DE NOVO
        </button>
      </section>
    );
  }
  if (battle === undefined) {
    return (
      <section className="scene battle battle-center" aria-label="BUG FIGHT">
        <p className="term">CARREGANDO...</p>
      </section>
    );
  }

  const active = battle?.status === "active";
  const commands = catalog.commands.filter((c) => !c.skill || player.skills.includes(c.skill));
  const potions = catalog.items.filter((i) => i.restore);
  const qty = (id: string) => player.inventory.find((i) => i.item === id)?.quantity ?? 0;

  return (
    <section
      className="scene battle"
      aria-label="BUG FIGHT"
      style={battle ? { backgroundImage: `url(/art/background/battle-${battle.region}.png)` } : undefined}
    >
      <div className="panel battle-head">
        <span className="pixel">{battle ? `ENCONTRO · ${regionName(battle.region)}` : "ENCONTRO ENCERRADO"}</span>
      </div>
      <div className="battle-body">
        <div className="battle-enemy">
          {battle ? (
            enemyCard(battle)
          ) : (
            <div className="panel battle-ended">
              <span className="pixel">ENCONTRO ENCERRADO</span>
            </div>
          )}
          {!active && (
            <button type="button" className="btn btn-green" onClick={start}>
              NOVO ENCONTRO
            </button>
          )}
        </div>
        <div className="battle-side">
          <div className="panel battle-log" role="log" aria-label="log de combate">
            {log.map((line, i) => (
              <div key={i} className="term">
                {line}
              </div>
            ))}
          </div>
          <div className="battle-commands">
            {commands.map((c) => (
              <button
                key={c.id}
                type="button"
                className="battle-command"
                data-command={c.id}
                disabled={pending || !active || (battle?.sp ?? 0) < c.cost}
                onClick={() => act("/api/me/battle/commands", { command: c.id })}
              >
                <span className="pixel">{c.label}</span>
                <span className="term">{`${c.hint} · ${c.cost ? `${c.cost} SP` : "grátis"}`}</span>
              </button>
            ))}
          </div>
          <div className="battle-potions">
            {potions.map((i) => (
              <button
                key={i.id}
                type="button"
                className="battle-potion"
                data-item={i.id}
                disabled={pending || !active || qty(i.id) === 0}
                onClick={() => act("/api/me/battle/items", { item: i.id })}
              >
                <GameArt kind="item" id={i.id} scale={2} alt="" fallback={i.glyph} />
                <span className="term">{`${i.name} x${qty(i.id)}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="panel battle-hero" aria-label="dev em combate">
        <HeroSprite filter={skinFilter(catalog, player.skin)} className="battle-hero-sprite" />
        <span className="pixel">{player.devName}</span>
        <span className="term">{`HP ${player.hp}/${player.hpMax}`}</span>
        {battle && <span className="term">{`SP ${battle.sp}/${battle.spMax}`}</span>}
      </div>
    </section>
  );

  // A plain render function, not a nested component: a component declared here would remount on
  // every render and bring a failed enemy image back.
  function enemyCard(battle: Battle) {
    const enemy = enemyOf(battle);
    const pct = (battle.enemyHp / battle.enemyHpMax) * 100;
    return (
      <div className="panel battle-enemy-card" aria-label="inimigo">
        <div className="battle-enemy-row">
          <span className="pixel">{enemy.name}</span>
          <span className="term">{`Lv.${enemy.level}`}</span>
        </div>
        <div className="bar">
          <div style={{ width: `${pct}%`, background: "var(--purple)" }} />
        </div>
        <span className="term">{`HP ${battle.enemyHp}/${battle.enemyHpMax} · fraqueza: ${enemy.weakness}`}</span>
        <div className="battle-sprite pixel">
          <GameArt kind="enemy" id={battle.region} scale={ENEMY_SCALE[nativeSize("enemy", battle.region)]} alt={enemy.name} fallback={enemy.glyph} />
        </div>
        {battle.status === "won" && <span className="pixel battle-won">RESOLVIDO</span>}
      </div>
    );
  }
}
