/** The looping loading strip (fx/loading, 4 frames) shown beside a CARREGANDO... text; decoration only. */
export function LoadingFx() {
  return <span className="fx-loading" aria-hidden="true" style={{ backgroundImage: "url(/art/fx/loading.png)" }} />;
}

/** A one-shot 4-frame effect strip at 3x (96x96), keyed by the caller so it replays. */
export function FxOnce({ id, className }: { id: string; className?: string }) {
  return (
    <span className={`fx-once ${className ?? ""}`} data-fx={id} aria-hidden="true" style={{ backgroundImage: `url(/art/fx/${id}.png)` }} />
  );
}
