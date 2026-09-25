"use client";

import { useCallback, useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import { formatMinutes, formatRemaining } from "@/lib/time";
import type { DeployJob, DeployLevel, Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { FxOnce, LoadingFx } from "./LoadingFx";
import { useGame } from "./GameContext";
import { HeroAvatar } from "./HeroAvatar";

const STAGES = ["LINT", "BUILD", "TEST", "SHIP"];
/** The inventory item a boost consumes. */
const BOOST_ITEM = "boost_deploy";
const INITIAL_LOG = ["$ devserver --version  v0.4.2-alpha", "> escolha um tipo de deploy e um nível para iniciar."];

function rewardText(l: DeployLevel) {
  return `+${l.xp}XP · +${l.coins}coins` + (l.gems ? ` · +${l.gems}gems` : "");
}

export function DeployScene() {
  const { player, catalog, setPlayer } = useGame();
  const [jobs, setJobs] = useState<DeployJob[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // serverTime - local clock, so the countdown follows the server even if this machine drifts.
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [selType, setSelType] = useState(catalog.deployTypes[0].id);
  const [selLevel, setSelLevel] = useState<Record<string, number>>({});
  const [log, setLog] = useState<string[]>(INITIAL_LOG);
  // Counts successful claims; while > 0 the opened chest shows, and the count replays its collect strip.
  const [claimed, setClaimed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sync = (serverTime: string) => setOffset(Date.parse(serverTime) - Date.now());
  const addLog = (...lines: string[]) => setLog((l) => [...l, ...lines].slice(-8));

  const load = useCallback(async () => {
    setJobs(null);
    setLoadFailed(false);
    try {
      const r = await api<{ serverTime: string; deploys: DeployJob[] }>("/api/me/deploys");
      if (!r.ok) return setLoadFailed(true);
      sync(r.data.serverTime);
      setNow(Date.now());
      setJobs(r.data.deploys);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the player's pipelines
    load();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [load]);

  const serverNow = now + offset;
  const remaining = (j: DeployJob) => Date.parse(j.endsAt) - serverNow;
  // Types and levels here always come from the catalog, so the lookups cannot miss.
  const typeName = (id: string) => catalog.deployTypes.find((t) => t.id === id)!.name;

  async function start() {
    const level = selLevel[selType] ?? 1;
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player; deploy: DeployJob; serverTime: string }>("/api/me/deploys", { type: selType, level });
      if (!r.ok) return setMessage(r.error?.message ?? "erro ao iniciar deploy");
      sync(r.data.serverTime);
      setNow(Date.now());
      setJobs((js) => [...(js ?? []), r.data.deploy]);
      setClaimed(0);
      setPlayer(r.data.player);
      const minutes = catalog.deployLevels.find((l) => l.level === level)!.minutes;
      addLog(`$ devserver deploy --tipo=${selType} --nivel=${level}`, `> pipeline de ${typeName(selType)} iniciado. estimativa: ${minutes}min.`);
    } catch {
      setMessage("SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  async function claim(job: DeployJob) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ player: Player }>(`/api/me/deploys/${job.type}/claim`);
      if (!r.ok) return setMessage(r.error?.message ?? "erro ao coletar");
      setJobs((js) => (js ?? []).filter((j) => j.type !== job.type));
      setClaimed((n) => n + 1);
      setPlayer(r.data.player);
      addLog(`> release de ${typeName(job.type)} nível ${job.level} publicada.`);
    } catch {
      setMessage("SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  async function boost(job: DeployJob) {
    setPending(true);
    setMessage(null);
    try {
      const r = await post<{ deploy: DeployJob; player: Player; serverTime: string }>(`/api/me/deploys/${job.type}/boost`);
      if (!r.ok) return setMessage(r.error?.message ?? "erro ao acelerar");
      sync(r.data.serverTime);
      setNow(Date.now());
      setJobs((js) => (js ?? []).map((j) => (j.type === job.type ? r.data.deploy : j)));
      setPlayer(r.data.player);
      addLog(`> acelerador aplicado ao deploy de ${typeName(job.type)}: -15min.`);
    } catch {
      setMessage("SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  const current = jobs?.find((j) => j.type === selType);
  const boosters = player.inventory.find((i) => i.item === BOOST_ITEM)?.quantity ?? 0;

  return (
    <section className="scene deploy" aria-label="DEPLOY" style={{ backgroundImage: "url(/art/background/scene-dia.png)" }}>
      <div className="panel deploy-head">
        <span className="pixel">PIPELINES DE DEPLOY</span>
        <span className="term">cada tipo roda em paralelo · tempo real por nível</span>
      </div>

      <div className="deploy-types">
        {catalog.deployTypes.map((t) => {
          const job = jobs?.find((j) => j.type === t.id);
          const status = !job ? "ocioso" : remaining(job) <= 0 ? "pronto p/ coletar" : `${formatRemaining(remaining(job))} restante`;
          return (
            <button
              key={t.id}
              type="button"
              className="deploy-type"
              aria-pressed={selType === t.id}
              aria-label={t.name}
              data-type={t.id}
              onClick={() => setSelType(t.id)}
            >
              <span className="pixel deploy-type-name">
                <span className="deploy-glyph">
                  <GameArt kind="deploy" id={t.id} scale={2} alt="" fallback={t.glyph} />
                </span>
                {t.name}
              </span>
              <span className="term deploy-status">{jobs ? status : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="deploy-body">
        <div className="panel deploy-panel" aria-label="painel de deploy" role="region">
          <span className="pixel">{typeName(selType)}</span>
          {claimed > 0 && (
            <div className="deploy-claimed" key={claimed}>
              <GameArt kind="extra" id="bau-aberto" scale={2} alt="" fallback="" />
              <FxOnce id="collect" />
            </div>
          )}
          {message && (
            <p role="alert" className="term field-error">
              {message}
            </p>
          )}
          {loadFailed ? (
            <div className="deploy-center">
              <p className="pixel alert">SERVIDOR FORA DO AR</p>
              <button type="button" className="btn btn-yellow" onClick={load}>
                TENTAR DE NOVO
              </button>
            </div>
          ) : jobs === null ? (
              <p className="term">
              <LoadingFx />
              CARREGANDO...
            </p>
          ) : current ? (
            <Running
              player={player}
              job={current}
              remainingMs={remaining(current)}
              pending={pending}
              boosters={boosters}
              onClaim={() => claim(current)}
              onBoost={() => boost(current)}
            />
          ) : (
            <>
              <span className="term">escolha o nível do deploy — níveis maiores levam mais tempo real, mas rendem mais recompensa.</span>
              <div className="deploy-levels">
                {catalog.deployLevels.map((l) => {
                  const locked = player.level < l.minLevel;
                  const picked = (selLevel[selType] ?? 1) === l.level;
                  return (
                    <button
                      key={l.level}
                      type="button"
                      className="deploy-level"
                      aria-pressed={picked}
                      aria-label={`NV.${l.level}`}
                      disabled={locked}
                      onClick={() => setSelLevel((s) => ({ ...s, [selType]: l.level }))}
                    >
                      <span className="pixel">{`NV.${l.level}`}</span>
                      <span className="term">{formatMinutes(l.minutes)}</span>
                      <span className="term deploy-reward">{rewardText(l)}</span>
                      {locked && (
                        <span className="pixel deploy-locked">
                          <GameArt kind="ic" id="lock" scale={1} alt="" fallback="" className="inline-icon" />
                          {`NÍVEL ${l.minLevel}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn-green" disabled={pending} onClick={start}>
                INICIAR DEPLOY
              </button>
            </>
          )}
        </div>
        <div className="panel deploy-log" aria-label="log do terminal" role="log">
          {log.map((line, i) => (
            <div key={i} className="term">
              {line}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type RunningProps = {
  player: Player;
  job: DeployJob;
  remainingMs: number;
  pending: boolean;
  boosters: number;
  onClaim: () => void;
  onBoost: () => void;
};

function Running({ player, job, remainingMs, pending, boosters, onClaim, onBoost }: RunningProps) {
  const total = Date.parse(job.endsAt) - Date.parse(job.startedAt);
  const ready = remainingMs <= 0;
  const pct = ready ? 100 : Math.max(0, Math.min(100, ((total - remainingMs) / total) * 100));
  const stage = ready ? "PRONTO PARA COLETAR" : STAGES[Math.min(3, Math.floor(pct / 25))];
  return (
    <>
      <div className="deploy-hero">
        <HeroAvatar look={player} scale={2} anim={ready ? "idle" : "interact"} />
      </div>
      <span className="term">{`nível ${job.level} em andamento`}</span>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div style={{ width: `${pct}%`, background: "var(--green)" }} />
      </div>
      <div className="deploy-run">
        <span className="pixel deploy-stage">{stage}</span>
        <span className="pixel deploy-remaining">{ready ? "CONCLUÍDO" : formatRemaining(remainingMs)}</span>
      </div>
      {!ready && (
        <button type="button" className={`btn deploy-boost ${boosters ? "btn-yellow" : "btn-locked"}`} disabled={pending || !boosters} onClick={onBoost}>
          {boosters ? `ACELERAR (-15min) · ${boosters} disponíveis` : "SEM ACELERADORES · veja a Loja"}
        </button>
      )}
      <button type="button" className="btn btn-green" disabled={!ready || pending} onClick={onClaim}>
        {ready && <GameArt kind="extra" id="bau" scale={1} alt="" fallback="" className="inline-icon" />}
        COLETAR RECOMPENSA
      </button>
    </>
  );
}
