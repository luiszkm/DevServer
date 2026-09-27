import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import type { Player } from "@/lib/types";
import { GameArt } from "./GameArt";
import { GameContext } from "./GameContext";
import { HeroAvatar } from "./HeroAvatar";
import { LoadingFx } from "./LoadingFx";
import { DEPLOY, FIGHT, SHOP, TITLE, WORLD } from "./SceneShortcuts";

type Props = { player?: Player; onLogout?: () => void };

type Scene = typeof TITLE | typeof WORLD | typeof DEPLOY | typeof FIGHT | typeof SHOP;

function SceneLink({ scene, pathname }: { scene: Scene; pathname: string }) {
  return (
    <Link href={scene.href} className="pixel hud-link" aria-current={pathname === scene.href ? "page" : undefined}>
      <GameArt kind="menu" id={scene.icon} scale={1} alt="" fallback="" />
      {scene.label}
    </Link>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Hud({ player, onLogout }: Props) {
  const game = useContext(GameContext);
  const pathname = usePathname();
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
      <div className="hud-card hud-grow hud-bars">
        <div className="hud-row hud-xp">
          <GameArt kind="hud" id="xp" scale={1} alt="" fallback="" />
          <span className="chip chip-green">XP</span>
          <Bar value={player.xp} max={player.xpMax} color="var(--green)" />
          <span className="term">{`${player.xp}/${player.xpMax}`}</span>
        </div>
        <div className="hud-row hud-hp">
          <GameArt kind="hud" id="heart" scale={1} alt="" fallback="" />
          <span className="pixel hud-title">{`HP ${player.hp}/${player.hpMax}`}</span>
          <Bar value={player.hp} max={player.hpMax} color="var(--red)" />
        </div>
      </div>
      <div className="hud-card hud-scenes">
        <SceneLink scene={TITLE} pathname={pathname} />
        <SceneLink scene={WORLD} pathname={pathname} />
        <SceneLink scene={DEPLOY} pathname={pathname} />
        <SceneLink scene={FIGHT} pathname={pathname} />
      </div>
      <div className="hud-card hud-wallet">
        <div className="hud-row">
          <GameArt kind="hud" id="coin" scale={1} alt="" fallback="" />
          <span className="pixel hud-label">COINS</span>
          <span className="pixel hud-value" style={{ color: "var(--yellow)" }}>{player.coins}</span>
        </div>
        <div className="hud-row">
          <GameArt kind="hud" id="gem" scale={1} alt="" fallback="" />
          <span className="pixel hud-label">GEMS</span>
          <span className="pixel hud-value" style={{ color: "var(--cyan)" }}>{player.gems}</span>
        </div>
        <SceneLink scene={SHOP} pathname={pathname} />
      </div>
      <div className="hud-card">
        <Link href="/office" className="pixel hud-label hud-hero" aria-label={`${player.devName} · ir para a base`}>
          {game?.catalog && <HeroAvatar look={player} catalog={game.catalog} scale={1} />}
          {player.devName}
        </Link>
        <div className="hud-side">
          <span className="pixel hud-title">
            <GameArt kind="btn" id="rank" scale={1} alt="" fallback="" className="inline-icon" />
            {`LEVEL ${player.level}`}
          </span>
          {onLogout && (
            <button type="button" className="btn btn-dark" onClick={onLogout}>
              <GameArt kind="btn" id="exit" scale={1} alt="" fallback="" className="inline-icon" />
              SAIR
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
