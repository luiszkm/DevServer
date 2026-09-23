const KNOWN_ERRORS = ["github", "state"];

export function LoginScreen({ error }: { error?: string }) {
  return (
    <main className="center-screen">
      <div className="panel login-panel">
        <h1 className="pixel logo">
          <span style={{ color: "var(--green)" }}>DEV</span>
          <span style={{ color: "var(--cyan)" }}>SERVER</span>
        </h1>
        {error && KNOWN_ERRORS.includes(error) && (
          <p role="alert" className="pixel alert">
            NÃO FOI POSSÍVEL ENTRAR · TENTE DE NOVO
          </p>
        )}
        <a className="btn btn-green" href="/api/auth/github/login">
          ENTRAR COM GITHUB
        </a>
      </div>
    </main>
  );
}
