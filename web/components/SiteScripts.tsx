"use client";

import { useEffect } from "react";
import { SCRIPT_ORDER } from "./scriptOrder";

declare global {
  interface Window {
    __streamproofScripts?: boolean;
  }
}

// Loads the site's original (unmodified) scripts once React has hydrated, so
// their DOM work (text splitting, GSAP, Lenis) never fights hydration.
export default function SiteScripts() {
  useEffect(() => {
    // once-only: StrictMode runs effects twice in dev
    if (window.__streamproofScripts) return;
    window.__streamproofScripts = true;

    // React never server-renders the `muted` attribute; the videos are started
    // with play() and must be muted for the browser to allow autoplay
    document.querySelectorAll<HTMLVideoElement>("video[muted], video[data-src]").forEach((v) => {
      v.muted = true;
      v.setAttribute("muted", "");
    });

    for (const { src, module } of SCRIPT_ORDER) {
      const s = document.createElement("script");
      if (module) s.type = "module";
      s.src = src;
      s.async = false; // keep the original document order
      document.body.appendChild(s);
    }
  }, []);

  return null;
}
