import type { NextConfig } from "next";

// The FastAPI backend (app/main.py). The web app calls it same-origin through these
// rewrites, so the demo session cookie works without CORS.
const BACKEND = process.env.STREAMPROOF_API ?? "http://127.0.0.1:8740";

const nextConfig: NextConfig = {
  // a stray package-lock.json in the home folder confuses root detection
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/fhir/definitions/:path*", destination: `${BACKEND}/fhir/definitions/:path*` },
    ];
  },
};

export default nextConfig;
