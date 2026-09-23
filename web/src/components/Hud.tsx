import type { Player } from "@/lib/types";

type Props = { player?: Player; onLogout?: () => void };

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Hud({ player, onLogout }: Props) {
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
          <span className="chip chip-green">XP</span>
          <Bar value={player.xp} max={player.xpMax} color="var(--green)" />
          <span className="term">{`${player.xp}/${player.xpMax}`}</span>
        </div>
      </div>
      <div className="hud-card hud-grow">
        <span className="pixel hud-title">{`HP ${player.hp}/${player.hpMax}`}</span>
        <Bar value={player.hp} max={player.hpMax} color="var(--red)" />
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">COINS</span>
        <span className="pixel hud-value" style={{ color: "var(--yellow)" }}>{player.coins}</span>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">GEMS</span>
        <span className="pixel hud-value" style={{ color: "var(--cyan)" }}>{player.gems}</span>
      </div>
      <div className="hud-card">
        <span className="pixel hud-label">SKILL PTS</span>
        <span className="pixel hud-value" style={{ color: "var(--purple)" }}>{player.skillPoints}</span>
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
