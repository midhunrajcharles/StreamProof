import type { NextConfig } from "next";

// The FastAPI backend (app/main.py). The web app calls it same-origin through these
// rewrites, so the demo session cookie works without CORS.
const BACKEND = process.env.STREAMPROOF_API ?? "http://127.0.0.1:8740";

const nextConfig: NextConfig = {
  // a stray package-lock.json in the home folder confuses root detection
  turbopack: { root: process.cwd() },
  // separate build folder for isolated test runs (web/tests/README.md)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // one 404 page for both root layouts (landing page and web app)
  experimental: { globalNotFound: true },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/fhir/definitions/:path*", destination: `${BACKEND}/fhir/definitions/:path*` },
    ];
  },
};

export default nextConfig;
