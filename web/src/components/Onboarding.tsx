"use client";

import { useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import { bodyDefaults } from "@/lib/avatar";
import type { Catalog, Player } from "@/lib/types";
import { HeroAvatar } from "./HeroAvatar";
import { LoadingFx } from "./LoadingFx";

type OnboardingData = { suggestedDevName: string; classes: string[] };

export function Onboarding({ onCreated }: { onCreated: (p: Player) => void }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [devName, setDevName] = useState("");
  const [cls, setCls] = useState<string | null>(null);
  // The body is chosen once here; later only a redesign token changes it.
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameTaken, setNameTaken] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([api<OnboardingData>("/api/onboarding"), api<Catalog>("/api/catalog")])
      .then(([r, c]) => {
        if (!r.ok) {
          setError(r.error?.message ?? "erro ao carregar");
          return;
        }
        if (!c.ok) {
          setError("erro ao carregar");
          return;
        }
        setCatalog(c.data);
        setData(r.data);
        setDevName(r.data.suggestedDevName);
      })
      .catch(() => setError("SERVIDOR FORA DO AR"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cls || !body) return;
    setSending(true);
    setError(null);
    setNameTaken(false);
    try {
      const r = await post<{ player: Player }>("/api/players", { devName, class: cls, body });
      if (r.ok) {
        onCreated(r.data.player);
        return;
      }
      if (r.error?.code === "dev_name_taken") setNameTaken(true);
      else setError(r.error?.message ?? "erro ao criar dev");
    } catch {
      setError("SERVIDOR FORA DO AR");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="center-screen">
      <form className="panel onboarding" onSubmit={submit}>
        <h1 className="pixel">CRIE SEU DEV</h1>
        {!data && !error && (
          <p className="term">
            <LoadingFx />
            CARREGANDO...
          </p>
        )}
        {data && (
          <>
            <label className="field">
              <span className="pixel field-label">NOME DO DEV</span>
              <input
                className="input"
                value={devName}
                maxLength={16}
                onChange={(e) => setDevName(e.target.value.toUpperCase())}
              />
              {nameTaken && <span className="pixel field-error">NOME JÁ EM USO</span>}
            </label>
            <fieldset className="classes">
              <legend className="pixel field-label">CLASSE</legend>
              {data.classes.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn class-btn"
                  aria-pressed={cls === c}
                  onClick={() => setCls(c)}
                >
                  {c}
                </button>
              ))}
            </fieldset>
            <fieldset className="bodies">
              <legend className="pixel field-label">CORPO</legend>
              {catalog!.avatar.bodies.map((b) => (
                <button key={b.id} type="button" className="btn body-btn" data-body={b.id} aria-pressed={body === b.id} onClick={() => setBody(b.id)}>
                  <HeroAvatar
                    catalog={catalog!}
                    look={{ body: b.id, appearance: bodyDefaults(catalog!, b.id), equipment: {}, skin: "default" }}
                    scale={2}
                  />
                  <span className="pixel">{b.name}</span>
                </button>
              ))}
              <span className="term bodies-hint">só troca depois com um TOKEN DE REDESIGN da Loja.</span>
            </fieldset>
            <button type="submit" className="btn btn-green" disabled={!cls || !body || sending}>
              CRIAR DEV
            </button>
          </>
        )}
        {error && <p className="term field-error">{error}</p>}
      </form>
    </main>
  );
}
