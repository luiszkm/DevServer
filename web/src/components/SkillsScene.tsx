"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import type { Player, SkillNode } from "@/lib/types";
import { GameArt } from "./GameArt";
import { useGame } from "./GameContext";

type NodeState = "ATIVA" | "1 PT" | "BLOQ.";

export function SkillsScene() {
  const { player, catalog, setPlayer } = useGame();
  const [message, setMessage] = useState("> gaste pontos para desbloquear a primeira camada de cada trilha.");
  const [pending, setPending] = useState(false);

  const active = catalog.skillTrees.flatMap((t) => t.nodes).filter((n) => player.skills.includes(n.id));
  const bonus = (type: SkillNode["bonus"]["type"]) =>
    active.filter((n) => n.bonus.type === type).reduce((sum, n) => sum + n.bonus.amount, 0);

  async function unlock(node: SkillNode) {
    setPending(true);
    try {
      const r = await post<{ player: Player }>(`/api/me/skills/${node.id}/unlock`);
      if (!r.ok) return setMessage(`> ${r.error?.message ?? "erro ao desbloquear"}`);
      setPlayer(r.data.player);
      setMessage(`> ${node.name} desbloqueada · ${node.description}`);
    } catch {
      setMessage("> SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="scene skills" aria-label="SKILLS">
      <div className="panel skills-head">
        <span className="pixel">ÁRVORE DE HABILIDADES</span>
        <span className="term">{`bônus ativo: +${bonus("hp")} HP · +${bonus("sp")} SP · +${bonus("dmg")}% dano`}</span>
        <span className="pixel skills-points">{`PONTOS: ${player.skillPoints}`}</span>
      </div>
      <div className="skills-trees">
        {catalog.skillTrees.map((tree) => (
          <div key={tree.id} className="panel skills-tree" role="group" aria-label={tree.name}>
            <div className="pixel skills-tree-name">{tree.name}</div>
            {tree.nodes.map((node, i) => {
              const state: NodeState = player.skills.includes(node.id)
                ? "ATIVA"
                : i === 0 || player.skills.includes(tree.nodes[i - 1].id)
                  ? "1 PT"
                  : "BLOQ.";
              return (
                <button
                  key={node.id}
                  type="button"
                  className="skill-node"
                  data-skill={node.id}
                  data-state={state}
                  disabled={pending || state !== "1 PT"}
                  onClick={() => unlock(node)}
                >
                  <span className="pixel skill-glyph">
                    <GameArt kind="skill" id={node.id} scale={2} alt="" fallback={node.glyph} />
                  </span>
                  <span className="skill-text">
                    <span className="pixel skill-name">{node.name}</span>
                    <span className="term">{node.description}</span>
                  </span>
                  <span className="pixel skill-state">{state}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="panel skills-foot">
        <span className="term skills-message" role="status">
          {message}
        </span>
        <span className="pixel skills-foot-label">ATIVAS EM COMBATE</span>
        <span className="skills-active" aria-label="ativas em combate">
          {active.length === 0 ? (
            <span className="term">nenhuma habilidade equipada</span>
          ) : (
            active.map((n) => (
              <span key={n.id} className="skill-chip-wide">
                <span className="pixel skill-chip">
                  <GameArt kind="skill" id={n.id} scale={2} alt="" fallback={n.glyph} />
                </span>
                <span className="term">{n.name.split(" ")[0]}</span>
              </span>
            ))
          )}
        </span>
      </div>
    </section>
  );
}
