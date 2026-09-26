"use client";

import { useState } from "react";
import { post } from "@/lib/api";
import { baseCommands, classSpecial, classTree, inLoadout, levelOf, loadoutBonus, passiveText, skillLevel } from "@/lib/skills";
import type { Command, Player, SkillNode } from "@/lib/types";
import { GameArt } from "./GameArt";
import { FxOnce } from "./LoadingFx";
import { useGame } from "./GameContext";

type Action = "unlock" | "equip" | "unequip" | "upgrade";

// Icon before each tree name (assets-apply assumptions).
const TREE_ICON: Record<string, string> = { frontend: "code", backend: "server", devops: "shield", fullstack: "laptop" };

// The fallback when the api answers without an error body.
const FAILED: Record<Action, string> = {
  unlock: "erro ao desbloquear",
  equip: "erro ao equipar",
  unequip: "erro ao remover",
  upgrade: "erro ao upar",
};

function doneText(action: Action, node: SkillNode, next: Player): string {
  switch (action) {
    case "unlock":
      return inLoadout(next, node.id) ? `${node.name} desbloqueada e equipada` : `${node.name} desbloqueada · loadout cheio`;
    case "equip":
      return `${node.name} equipada`;
    case "unequip":
      return `${node.name} removida do loadout`;
    case "upgrade": {
      const level = skillLevel(next, node.id);
      return `${node.name} subiu para Nv ${level} · ${passiveText(node, levelOf(node, level).bonus)}`;
    }
    default: {
      const never: never = action;
      return never;
    }
  }
}

export function SkillsScene() {
  const { player, catalog, setPlayer } = useGame();
  const [message, setMessage] = useState("> gaste pontos na trilha da sua classe.");
  const [pending, setPending] = useState(false);
  const [sparkled, setSparkled] = useState<{ id: string; key: number } | null>(null);
  const tree = classTree(catalog, player);
  const nodes = tree?.nodes ?? [];
  const [selectedId, setSelectedId] = useState(nodes[0]?.id);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const special = classSpecial(catalog, player);
  const kit = baseCommands(catalog);
  const power = catalog.combat.power;
  const full = !player.loadout.includes(null);
  const nodeOf = (id: string) => nodes.find((n) => n.id === id);

  async function act(action: Action, node: SkillNode) {
    setPending(true);
    setSelectedId(node.id);
    try {
      const r = await post<{ player: Player }>(`/api/me/skills/${node.id}/${action}`);
      if (!r.ok) return setMessage(`> ${r.error?.message ?? FAILED[action]}`);
      setPlayer(r.data.player);
      if (action === "unlock" || action === "upgrade") setSparkled((s) => ({ id: node.id, key: (s?.key ?? 0) + 1 }));
      setMessage(`> ${doneText(action, node, r.data.player)}`);
    } catch {
      setMessage("> SERVIDOR FORA DO AR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="scene skills" aria-label="SKILLS" style={{ backgroundImage: "url(/art/background/scene-noite.png)" }}>
      <div className="panel panel-wood skills-head">
        <span className="pixel">ÁRVORE DE HABILIDADES</span>
        <span className="term">{`bônus ativo: +${loadoutBonus(catalog, player, "hp")} HP · +${loadoutBonus(catalog, player, "sp")} SP · +${loadoutBonus(catalog, player, "dmg")}% dano`}</span>
        <span className="pixel skills-points">{`PONTOS: ${player.skillPoints}`}</span>
      </div>

      <div className="panel skills-loadout" aria-label="loadout">
        <span className="pixel skills-loadout-label">{`LOADOUT ${player.loadout.filter(Boolean).length}/${player.loadout.length}`}</span>
        <div className="skills-slots">
          {player.loadout.map((id, i) => {
            const node = id ? nodeOf(id) : undefined;
            if (!id || !node) {
              return (
                <div key={i} className="skill-slot" data-slot={i} data-filled="false">
                  <span className="pixel skill-slot-empty">VAZIO</span>
                </div>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className="skill-slot"
                data-slot={i}
                data-filled="true"
                disabled={pending}
                aria-label={`remover ${node.name}`}
                onClick={() => act("unequip", node)}
              >
                <span className="pixel skill-glyph">
                  <GameArt kind="skill" id={node.id} scale={2} alt="" fallback={node.glyph} />
                </span>
                <span className="skill-slot-text">
                  <span className="pixel skill-name">{node.name}</span>
                  <span className="term">{`Nv ${skillLevel(player, node.id)} · ${passiveText(node, levelOf(node, skillLevel(player, node.id)).bonus)}`}</span>
                </span>
              </button>
            );
          })}
          {special && (
            <div className="skill-slot skill-slot-special" data-special={special.id} data-ready={player.power >= power.max}>
              <span className="pixel skill-special-tag">ESPECIAL</span>
              <span className="pixel skill-name">{special.label}</span>
              <span className="term skill-special-hint">{special.hint}</span>
              <div className="bar skill-power-bar" aria-hidden="true">
                <div style={{ width: `${(Math.min(player.power, power.max) / power.max) * 100}%`, background: "var(--yellow)" }} />
              </div>
              <span className="pixel skill-power">{`PODER ${player.power}/${power.max}`}</span>
            </div>
          )}
        </div>
      </div>

      <div className="skills-body">
        <div className="panel skills-base" role="group" aria-label="SKILLS BASE">
          <div className="pixel skills-base-name">SKILLS BASE</div>
          <div className="skills-base-list">
            {kit.map((c) => (
              <div key={c.id} className="skill-base" data-command={c.id}>
                <span className="pixel skill-name">{c.label}</span>
                <span className="term">{baseHint(c)}</span>
              </div>
            ))}
          </div>
        </div>
        {tree && (
          <div className="panel skills-tree" role="group" aria-label={`${tree.name} · ${tree.role}`}>
            <div className="pixel skills-tree-name">
              {TREE_ICON[tree.id] && <GameArt kind="ic" id={TREE_ICON[tree.id]} scale={1} alt="" fallback="" className="inline-icon" />}
              {`${tree.name} · ${tree.role}`}
            </div>
            <div className="skills-nodes">{nodes.map((node, i) => nodeRow(node, i))}</div>
          </div>
        )}
        {selected && detail(selected)}
      </div>

      <div className="panel skills-foot">
        <span className="term skills-message" role="status">
          {message}
        </span>
      </div>
    </section>
  );

  function baseHint(c: Command) {
    const cost = c.cost ? `${c.cost} SP` : "grátis";
    return `${c.hint} · ${cost}`;
  }

  function nodeRow(node: SkillNode, i: number) {
    const level = skillLevel(player, node.id);
    const open = level === 0 && (i === 0 || skillLevel(player, nodes[i - 1].id) > 0);
    const state = level > 0 ? `Nv ${level}` : open ? `${levelOf(node, 1).cost} PT` : "BLOQ.";
    const next = node.levels[level];
    const equipped = inLoadout(player, node.id);
    return (
      <div
        key={node.id}
        className="skill-node"
        data-skill={node.id}
        data-state={state}
        data-equipped={equipped}
        data-selected={node.id === selected?.id}
      >
        <button type="button" className="skill-node-main" onClick={() => setSelectedId(node.id)} aria-label={`ver ${node.name}`}>
          <span className="pixel skill-glyph">
            <GameArt kind="skill" id={node.id} scale={2} alt="" fallback={node.glyph} />
          </span>
          {sparkled?.id === node.id && <FxOnce key={sparkled.key} id="sparkle" />}
          <span className="skill-text">
            <span className="pixel skill-name">{node.name}</span>
            <span className="term">{node.description}</span>
          </span>
        </button>
        <div className="skill-actions">
          <span className="pixel skill-state">
            {state === "BLOQ." && <GameArt kind="ic" id="lock" scale={1} alt="" fallback="" className="inline-icon" />}
            {state}
          </span>
          {open && (
            <button
              type="button"
              className="btn btn-green skill-btn"
              data-action="unlock"
              disabled={pending || player.skillPoints < levelOf(node, 1).cost}
              onClick={() => act("unlock", node)}
            >
              DESBLOQUEAR
            </button>
          )}
          {level > 0 && (
            <>
              <button
                type="button"
                className="btn btn-dark skill-btn"
                data-action={equipped ? "unequip" : "equip"}
                disabled={pending || (!equipped && full)}
                onClick={() => act(equipped ? "unequip" : "equip", node)}
              >
                {equipped ? "REMOVER" : "EQUIPAR"}
              </button>
              <button
                type="button"
                className="btn btn-yellow skill-btn"
                data-action="upgrade"
                disabled={pending || !next || player.skillPoints < next.cost}
                onClick={() => act("upgrade", node)}
              >
                {next ? `UPAR · ${next.cost} PT` : "NV MÁX."}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function detail(node: SkillNode) {
    const level = skillLevel(player, node.id);
    const cmd = catalog.commands.find((c) => c.skill === node.id);
    return (
      <div className="panel skills-detail" aria-label="detalhe da habilidade">
        <span className="pixel skill-name">{node.name}</span>
        <span className="term">{node.description}</span>
        {cmd && <span className="term skills-detail-cmd">{`${cmd.label} · ${cmd.hint} · ${cmd.cost} SP`}</span>}
        <ol className="skills-levels">
          {node.levels.map((l, k) => (
            <li key={k} className="skills-level" data-current={level === k + 1} data-reached={level > k}>
              <span className="pixel">{`Nv ${k + 1}`}</span>
              <span className="term">{`${passiveText(node, l.bonus)} · golpe ${l.scale}% · ${l.cost} PT`}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
}
