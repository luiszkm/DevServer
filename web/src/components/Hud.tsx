import type { Catalog, Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { LoadingFx } from "./LoadingFx";

type Props = { player?: Player; catalog?: Catalog; onLogout?: () => void };

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Hud({ player, catalog, onLogout }: Props) {
  if (!player) {
    return (
      <header className="hud" aria-label="HUD">
        <div className="hud-card hud-loading">
          <LoadingFx />
          CARREGANDO...
        </div>
      </header>
    );
  }
  return (
    <header className="hud" aria-label="HUD">
      <div className="hud-card hud-grow">
        <span className="pixel hud-title">
          <GameArt kind="btn" id="rank" scale={1} alt="" fallback="" className="inline-icon" />
          {`LEVEL ${player.level}`}
        </span>
        <div className="hud-row">
          <GameArt kind="hud" id="xp" scale={1} alt="" fallback="" />
          <span className="chip chip-green">XP</span>
          <Bar value={player.xp} max={player.xpMax} color="var(--green)" />
          <span className="term">{`${player.xp}/${player.xpMax}`}</span>
        </div>
      </div>
      <div className="hud-card hud-grow">
        <div className="hud-row">
          <GameArt kind="hud" id="heart" scale={1} alt="" fallback="" />
          <span className="pixel hud-title">{`HP ${player.hp}/${player.hpMax}`}</span>
          <Bar value={player.hp} max={player.hpMax} color="var(--red)" />
        </div>
      </div>
      <div className="hud-card">
        <div className="hud-row">
          <GameArt kind="hud" id="coin" scale={1} alt="" fallback="" />
          <span className="pixel hud-label">COINS</span>
          <span className="pixel hud-value" style={{ color: "var(--yellow)" }}>{player.coins}</span>
        </div>
      </div>
      <div className="hud-card">
        <div className="hud-row">
          <GameArt kind="hud" id="gem" scale={1} alt="" fallback="" />
          <span className="pixel hud-label">GEMS</span>
          <span className="pixel hud-value" style={{ color: "var(--cyan)" }}>{player.gems}</span>
        </div>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">
          <GameArt kind="ic" id="star" scale={1} alt="" fallback="" className="inline-icon" />
          SKILL PTS
        </span>
        <div className="hud-row">
          <span className="pixel hud-value" style={{ color: "var(--purple)" }}>{player.skillPoints}</span>
          {catalog && <ActiveSkillGlyphs loadout={player.loadout} catalog={catalog} />}
        </div>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">{player.devName}</span>
        {onLogout && (
          <button type="button" className="btn btn-dark" onClick={onLogout}>
            <GameArt kind="btn" id="exit" scale={1} alt="" fallback="" className="inline-icon" />
            SAIR
          </button>
        )}
      </div>
    </header>
  );
}

/** The equipped skills, in loadout order. */
function ActiveSkillGlyphs({ loadout, catalog }: { loadout: (string | null)[]; catalog: Catalog }) {
  const all = catalog.skillTrees.flatMap((t) => t.nodes);
  const nodes = loadout.flatMap((id) => all.filter((n) => n.id === id));
  if (nodes.length === 0) return <span className="term hud-skills-empty">sem habilidades ativas</span>;
  return (
    <span className="hud-skills" aria-label="habilidades ativas">
      {nodes.map((n) => (
        <span key={n.id} className="pixel skill-chip">
          <GameArt kind="skill" id={n.id} scale={1} alt={n.name} fallback={n.glyph} />
        </span>
      ))}
    </span>
  );
}
