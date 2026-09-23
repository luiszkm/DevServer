"use client";

import { useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import type { Player } from "@/lib/types";

type OnboardingData = { suggestedDevName: string; classes: string[] };

export function Onboarding({ onCreated }: { onCreated: (p: Player) => void }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [devName, setDevName] = useState("");
  const [cls, setCls] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameTaken, setNameTaken] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<OnboardingData>("/api/onboarding")
      .then((r) => {
        if (!r.ok) {
          setError(r.error?.message ?? "erro ao carregar");
          return;
        }
        setData(r.data);
        setDevName(r.data.suggestedDevName);
      })
      .catch(() => setError("SERVIDOR FORA DO AR"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    setSending(true);
    setError(null);
    setNameTaken(false);
    try {
      const r = await post<{ player: Player }>("/api/players", { devName, class: cls });
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
        {!data && !error && <p className="term">CARREGANDO...</p>}
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
            <button type="submit" className="btn btn-green" disabled={!cls || sending}>
              CRIAR DEV
            </button>
          </>
        )}
        {error && <p className="term field-error">{error}</p>}
      </form>
    </main>
  );
}
