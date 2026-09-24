import type { Catalog, Player } from "@/lib/types";
import { GameArt } from "./GameArt";

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
      <footer className="hud" aria-label="HUD">
        <div className="hud-card hud-loading">CARREGANDO...</div>
      </footer>
    );
  }
  return (
    <footer className="hud" aria-label="HUD">
      <div className="hud-card hud-grow">
        <span className="pixel hud-title">{`LEVEL ${player.level}`}</span>
        <div className="hud-row">
          <GameArt kind="hud" id="xp" scale={2} alt="" fallback="" />
          <span className="chip chip-green">XP</span>
          <Bar value={player.xp} max={player.xpMax} color="var(--green)" />
          <span className="term">{`${player.xp}/${player.xpMax}`}</span>
        </div>
      </div>
      <div className="hud-card hud-grow">
        <div className="hud-row">
          <GameArt kind="hud" id="heart" scale={2} alt="" fallback="" />
          <span className="pixel hud-title">{`HP ${player.hp}/${player.hpMax}`}</span>
        </div>
        <Bar value={player.hp} max={player.hpMax} color="var(--red)" />
      </div>
      <div className="hud-card">
        <div className="hud-row">
          <GameArt kind="hud" id="coin" scale={2} alt="" fallback="" />
          <span className="pixel hud-label">COINS</span>
        </div>
        <span className="pixel hud-value" style={{ color: "var(--yellow)" }}>{player.coins}</span>
      </div>
      <div className="hud-card">
        <div className="hud-row">
          <GameArt kind="hud" id="gem" scale={2} alt="" fallback="" />
          <span className="pixel hud-label">GEMS</span>
        </div>
        <span className="pixel hud-value" style={{ color: "var(--cyan)" }}>{player.gems}</span>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">SKILL PTS</span>
        <div className="hud-row">
          <span className="pixel hud-value" style={{ color: "var(--purple)" }}>{player.skillPoints}</span>
          {catalog && <ActiveSkillGlyphs skills={player.skills} catalog={catalog} />}
        </div>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">{player.devName}</span>
        {onLogout && (
          <button type="button" className="btn btn-dark" onClick={onLogout}>
            SAIR
          </button>
        )}
      </div>
    </footer>
  );
}

function ActiveSkillGlyphs({ skills, catalog }: { skills: string[]; catalog: Catalog }) {
  const nodes = catalog.skillTrees.flatMap((t) => t.nodes).filter((n) => skills.includes(n.id));
  if (nodes.length === 0) return <span className="term hud-skills-empty">sem habilidades ativas</span>;
  return (
    <span className="hud-skills" aria-label="habilidades ativas">
      {nodes.map((n) => (
        <span key={n.id} className="pixel skill-chip">
          <GameArt kind="skill" id={n.id} scale={2} alt={n.name} fallback={n.glyph} />
        </span>
      ))}
    </span>
  );
}
