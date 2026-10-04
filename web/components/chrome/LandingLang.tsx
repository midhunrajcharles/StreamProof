"use client";
// Language picker for the landing page: a native select over a compact "EN" label. The page is
// rendered on the server in the chosen language, so choosing one saves it and reloads.
import { LANGS } from "@/ui/locales";

export default function LandingLang({ current, label }: { current: string; label: string }) {
  return (
    <span className="landing-lang relative inline-flex items-center gap-1 uppercase leading-none">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
      <span aria-hidden="true">{current}</span>
      <select aria-label={label} value={current} lang="en"
        style={{ position: "absolute", inset: "-8px", opacity: 0, cursor: "pointer", width: "calc(100% + 16px)", height: "calc(100% + 16px)", fontSize: 16, colorScheme: "light", color: "#111", textTransform: "none" }}
        onChange={(e) => {
          const l = e.target.value;
          try { localStorage.setItem("sp-lang", l); } catch { /* private mode */ }
          document.cookie = `sp-lang=${l}; path=/; max-age=31536000; samesite=lax`;
          window.location.reload();
        }}>
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code} style={{ color: "#111", background: "#fff" }}>{l.name}</option>)}
      </select>
    </span>
  );
}
