"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { post } from "@/lib/api";
import type { AvatarAnim } from "@/lib/avatar";
import { beatOf, type Beat } from "@/lib/battleFx";
import { eventText } from "@/lib/battleLog";
import type { Battle, BattleEvent, Player } from "@/lib/types";
import { GameArt, nativeSize } from "./GameArt";
import { LoadingFx } from "./LoadingFx";
import { useGame } from "./GameContext";
import { HeroAvatar } from "./HeroAvatar";

// Whole-number zoom per native enemy size, so every enemy fits the 180x150 sprite box.
const ENEMY_SCALE: Record<number, number> = { 32: 4, 48: 3, 64: 2 };

type TurnResponse = { battle: Battle | null; player: Player; events: BattleEvent[] };
type Shown = { heroHp?: number; enemyHp?: number };

const reducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The hero's strip for the beat on stage (plan assumptions: anim per screen); a won fight jumps.
const BEAT_ANIM: Partial<Record<Beat["hero"] & string, AvatarAnim>> = { lunge: "run", cast: "interact" };
function heroAnim(beat: Beat | null, status: Battle["status"]): AvatarAnim {
  return (beat?.hero && BEAT_ANIM[beat.hero]) || (status === "won" ? "jump" : "idle");
}

export function BattleScene() {
  const { player, catalog, setPlayer } = useGame();
  // undefined = loading, null = the encounter ended (rollback or defeat).
  const [battle, setBattle] = useState<Battle | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  // The beat on stage while a turn plays; `key` restarts the fx and float animations.
  const [beat, setBeat] = useState<(Beat & { key: number }) | null>(null);
  const [shown, setShown] = useState<Shown>({});
  const [enemyDown, setEnemyDown] = useState(false);
  const timers = useRef<number[]>([]);
  const beatKey = useRef(0);

  const stopPlayback = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBeat(null);
    setShown({});
    setEnemyDown(false);
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const addLog = (...lines: string[]) => setLog((l) => [...l, ...lines].slice(-6));
  const enemyOf = (b: Battle) => catalog.enemies.find((e) => e.id === b.enemy)!;
  const regionName = (id: string) => catalog.regions.find((r) => r.id === id)!.name;

  const start = useCallback(async () => {
    stopPlayback();
    setBattle(undefined);
    setLoadFailed(false);
    try {
      const r = await post<{ battle: Battle; player: Player }>("/api/me/battle");
      if (!r.ok) return setLoadFailed(true);
      setBattle(r.data.battle);
      setPlayer(r.data.player);
      const enemy = enemyOf(r.data.battle);
      setLog([`> um ${enemy.name} apareceu em ${regionName(r.data.battle.region)}!`, "> escolha um comando."]);
    } catch {
      setLoadFailed(true);
    }
    // regionName reads the same catalog and stopPlayback only touches refs and setters; listing catalog is enough.
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
    let r;
    try {
      r = await post<TurnResponse>(path, body);
    } catch {
      addLog("> SERVIDOR FORA DO AR");
      return setPending(false);
    }
    if (!r.ok) {
      addLog(`> ${r.error?.message ?? "erro no combate"}`);
      return setPending(false);
    }
    const { events, player: next, battle: nextBattle } = r.data;
    const lines = events.map((e) => eventText(e, enemy, catalog));
    const finish = () => {
      stopPlayback();
      setPlayer(next);
      setBattle(nextBattle);
      setPending(false);
    };
    if (reducedMotion()) {
      addLog(...lines);
      return finish();
    }
    // Play the turn one event at a time; the server's state lands after the last beat.
    let heroHp = player.hp;
    let enemyHp = battle.enemyHp;
    let at = 0;
    events.forEach((e, i) => {
      const b = beatOf(e);
      heroHp = Math.min(player.hpMax, Math.max(0, heroHp + (b.heroHp ?? 0)));
      enemyHp = Math.max(0, enemyHp + (b.enemyHp ?? 0));
      const hp = { heroHp, enemyHp };
      const show = () => {
        addLog(lines[i]);
        setBeat({ ...b, key: ++beatKey.current });
        setShown(hp);
        if (b.enemy === "defeat") setEnemyDown(true);
      };
      if (at === 0) show();
      else timers.current.push(window.setTimeout(show, at));
      at += b.ms;
    });
    timers.current.push(window.setTimeout(finish, at));
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
        <p className="term">
            <LoadingFx />
            CARREGANDO...
          </p>
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
      <div className="panel panel-wood battle-head">
        <span className="pixel">{battle ? `ENCONTRO · ${regionName(battle.region)}` : "ENCONTRO ENCERRADO"}</span>
      </div>
      <div className="battle-body">
        <div className="battle-enemy">
          {battle ? (
            <>
              {enemyCard(battle)}
              {stage(battle)}
            </>
          ) : (
            <div className="panel battle-ended">
              <span className="pixel">ENCONTRO ENCERRADO</span>
            </div>
          )}
          {!active && (
            <button type="button" className="btn btn-green" onClick={start}>
              <GameArt kind="btn" id="play" scale={1} alt="" fallback="" className="inline-icon" />
              NOVO ENCONTRO
            </button>
          )}
        </div>
        <div className="battle-side">
          <span className="pixel battle-log-title">
            <GameArt kind="ic" id="file" scale={1} alt="" fallback="" className="inline-icon" />
            LOG DE COMBATE
          </span>
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
        <span className="pixel">{player.devName}</span>
        <div className="bar battle-hero-bar">
          <div style={{ width: `${((shown.heroHp ?? player.hp) / player.hpMax) * 100}%`, background: "var(--green)" }} />
        </div>
        <span className="term">{`HP ${shown.heroHp ?? player.hp}/${player.hpMax}`}</span>
        {battle && (
          <span className="term">
            <GameArt kind="ic" id="sp" scale={1} alt="" fallback="" className="inline-icon" />
            {`SP ${battle.sp}/${battle.spMax}`}
          </span>
        )}
      </div>
    </section>
  );

  // A plain render function, not a nested component: a component declared here would remount on
  // every render and bring a failed enemy image back.
  function enemyCard(battle: Battle) {
    const enemy = enemyOf(battle);
    const hp = shown.enemyHp ?? battle.enemyHp;
    const pct = (hp / battle.enemyHpMax) * 100;
    return (
      <div className="panel battle-enemy-card" aria-label="inimigo">
        <div className="battle-enemy-row">
          <span className="pixel">{enemy.name}</span>
          <span className="term">{`Lv.${enemy.level}`}</span>
        </div>
        <div className="bar">
          <div style={{ width: `${pct}%`, background: "var(--purple)" }} />
        </div>
        <span className="term">{`HP ${hp}/${battle.enemyHpMax} · fraqueza: ${enemy.weakness}`}</span>
        {battle.status === "won" && (
          <span className="pixel battle-won">
            <GameArt kind="ic" id="trophy" scale={1} alt="" fallback="" className="inline-icon" />
            RESOLVIDO
          </span>
        )}
      </div>
    );
  }

  // Hero on the left, enemy on the right; the current beat drives the classes. The actors are not
  // keyed per beat, so the enemy image (and its glyph fallback) is never remounted.
  function stage(battle: Battle) {
    const enemy = enemyOf(battle);
    const down = enemyDown || battle.status === "won";
    return (
      <div className={`battle-stage${beat?.shake ? " is-shake" : ""}`}>
        <div className={`battle-actor battle-hero-actor${beat?.hero ? ` anim-${beat.hero}` : ""}`} aria-label="herói na arena">
          <HeroAvatar look={player} scale={2} className="battle-hero-sprite" anim={heroAnim(beat, battle.status)} />
          {effects("hero")}
        </div>
        <div className={`battle-actor battle-enemy-actor${beat?.enemy ? ` anim-${beat.enemy}` : ""}${down ? " is-down" : ""}`}>
          <div className="battle-sprite pixel">
            <GameArt kind="enemy" id={battle.enemy} scale={ENEMY_SCALE[nativeSize("enemy", battle.enemy)]} alt={enemy.name} fallback={enemy.glyph} />
          </div>
          {effects("enemy")}
        </div>
      </div>
    );
  }

  function effects(on: "hero" | "enemy") {
    if (!beat) return null;
    const item = beat.float?.item && catalog.items.find((i) => i.id === beat.float!.item);
    return (
      <>
        {beat.fx?.on === on && (
          <span key={`fx-${beat.key}`} className="battle-fx" data-fx={beat.fx.id} style={{ backgroundImage: `url(/art/fx/${beat.fx.id}.png)` }} aria-hidden="true" />
        )}
        {beat.float?.on === on && (
          <span key={`float-${beat.key}`} className={`pixel battle-float tone-${beat.float.tone}`} aria-hidden="true">
            {item && <GameArt kind="item" id={item.id} scale={2} alt="" fallback={item.glyph} />}
            {beat.float.text}
          </span>
        )}
      </>
    );
  }
}
