export function ServerDown({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="center-screen">
      <div className="panel login-panel">
        <p className="pixel alert">SERVIDOR FORA DO AR</p>
        <button type="button" className="btn btn-yellow" onClick={onRetry}>
          TENTAR DE NOVO
        </button>
      </div>
    </main>
  );
}
