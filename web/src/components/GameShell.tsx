"use client";

import { useCallback, useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import type { Catalog, Player } from "@/lib/types";
import { GameContext } from "./GameContext";
import { Hud } from "./Hud";
import { LoginScreen } from "./LoginScreen";
import { Onboarding } from "./Onboarding";
import { ServerDown } from "./ServerDown";
import { Tabs } from "./Tabs";

type State =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "onboarding" }
  | { kind: "down" }
  | { kind: "ready"; player: Player; catalog: Catalog };

async function loadCatalog(): Promise<Catalog | null> {
  const r = await api<Catalog>("/api/catalog");
  return r.ok ? r.data : null;
}

export function GameShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const me = await api<{ player: Player }>("/api/me");
      if (me.status === 401) return setState({ kind: "unauthenticated" });
      if (me.status === 404 && !me.ok && me.error?.code === "player_not_found") return setState({ kind: "onboarding" });
      if (!me.ok) return setState({ kind: "down" });
      const catalog = await loadCatalog();
      if (!catalog) return setState({ kind: "down" });
      setState({ kind: "ready", player: me.data.player, catalog });
    } catch {
      setState({ kind: "down" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the session's player
    load();
  }, [load]);

  const onCreated = useCallback(async (player: Player) => {
    try {
      const catalog = await loadCatalog();
      setState(catalog ? { kind: "ready", player, catalog } : { kind: "down" });
    } catch {
      setState({ kind: "down" });
    }
  }, []);

  const setPlayer = useCallback((player: Player) => {
    setState((s) => (s.kind === "ready" ? { ...s, player } : s));
  }, []);

  const logout = useCallback(async () => {
    try {
      await post("/api/auth/logout");
    } catch {
      // Offline: the cookie outlives this tab, but the player still leaves the game here.
    }
    setState({ kind: "unauthenticated" });
  }, []);

  switch (state.kind) {
    case "unauthenticated":
      return <LoginScreen />;
    case "onboarding":
      return <Onboarding onCreated={onCreated} />;
    case "down":
      return <ServerDown onRetry={load} />;
    case "loading":
      return (
        <Frame>
          <div className="scene" />
          <Hud />
        </Frame>
      );
    case "ready":
      return (
        <GameContext.Provider value={{ player: state.player, catalog: state.catalog, setPlayer }}>
          <Frame>
            {children}
            <Hud player={state.player} onLogout={logout} />
          </Frame>
        </GameContext.Provider>
      );
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <header className="pixel logo">
        <span style={{ color: "var(--green)" }}>DEV</span>
        <span style={{ color: "var(--cyan)" }}>SERVER</span>
      </header>
      <Tabs />
      <div className="frame">{children}</div>
    </div>
  );
}
