import { defineConfig } from "@playwright/test";

// Full stack for e2e: fake GitHub, the real api on the e2e database, and the Next dev server.
const FAKE = "http://localhost:9180";
const API = "http://localhost:8180";
const WEB = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  // The fake GitHub hands out one "next user" at a time, so logins must not interleave.
  workers: 1,
  use: { baseURL: WEB },
  webServer: [
    {
      command: "go run ./cmd/fakegithub",
      cwd: "../api",
      port: 9180,
      env: { ADDR: ":9180" },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "go run ./cmd/api",
      cwd: "../api",
      url: `${API}/api/catalog`,
      env: {
        ADDR: ":8180",
        DATABASE_URL: "postgres://devserver:devserver@localhost:5433/devserver_e2e?sslmode=disable",
        GITHUB_CLIENT_ID: "e2e",
        GITHUB_CLIENT_SECRET: "e2e",
        GITHUB_AUTH_URL: `${FAKE}/login/oauth/authorize`,
        GITHUB_TOKEN_URL: `${FAKE}/login/oauth/access_token`,
        GITHUB_API_URL: FAKE,
        OAUTH_REDIRECT_URL: `${WEB}/api/auth/github/callback`,
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx next dev --port 3100",
      url: `${WEB}/login`,
      env: { API_URL: API },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
