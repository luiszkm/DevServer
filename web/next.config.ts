import type { NextConfig } from "next";

const apiURL = process.env.API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Same origin for the browser: the session cookie never crosses sites (door 6).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiURL}/api/:path*` }];
  },
};

export default nextConfig;
