"use client";
// Thin client for the FastAPI JSON API (proxied same-origin at /api by next.config.ts).
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(public status: number, message: string, public signin?: "citizen" | "org", public consent?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { form?: Record<string, string | string[] | Blob | undefined> }): Promise<T> {
  let body = init?.body;
  if (init?.form) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(init.form)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
      else fd.append(k, v);
    }
    body = fd;
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { credentials: "same-origin", ...init, body, method: init?.method ?? (body ? "POST" : "GET") });
  } catch {
    throw new ApiError(0, "You're offline. Check your connection and try again.");
  }
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const d = data?.detail;
    if (res.status === 401 && d?.signin) throw new ApiError(401, "Sign-in needed", d.signin);
    if (res.status === 428 && d?.consent) throw new ApiError(428, "Please agree to how your report is used.", undefined, d.consent);
    throw new ApiError(res.status, typeof d === "string" ? d : `Something went wrong (${res.status}).`);
  }
  return data as T;
}

/** Load JSON from the API; `path` null pauses loading. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const n = ++seq.current;
    setLoading(true);
    try {
      const d = await api<T>(path);
      if (n === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (n === seq.current) setError(e as ApiError);
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

// ---------------------------------------------------------------- types

export type Sign = { code: string; chip: string; display: string };
export type Rung = { value: string; label: string; level: number };
export type Reason = { signal: string; status: "ok" | "warn" | "fail" | "info"; text: string; points: number; max_points: number };
export type HistoryEvent = { at: string; rung: string; by: string; note: string };
export type Position = { lat: number; lon: number; exact?: boolean; accuracy_m?: number | null };

export type Report = {
  id: string; created_at: string; signs: Sign[]; description: string; grade: string | null; grade_words: string;
  score: number | null; rung: Rung; status: string; reasons: Reason[]; hint: string | null; safety: string | null;
  support: number; verification: { by: string; method: string; at: string; note: string } | null; rejection: string | null;
  mission_id: string | null; history: HistoryEvent[]; photo: { url?: string; synthetic?: boolean } | null; position: Position;
  place: string; uses: { code: string; label: string }[]; certificate: { sha256: string; issued: string } | null; shareable: boolean;
  org?: {
    observer: { pseudonym: string; display: string; confirmed: number; not_confirmed: number };
    agree: { id: string; signs: Sign[]; rung: Rung; position: Position }[];
    contradict: { id: string; position: Position }[];
    gate: { code: string; label: string; allowed: boolean; reason: string; needs: string }[];
    mission: Mission | null; can_decide: boolean; ai_suggestion: { label: string; confidence: string } | null;
  };
};

export type Mission = {
  id: string; report_id: string; signs: Sign[]; position: Position; radius_m: number; request: string; safety: string;
  status: string; submissions: number; created_at: string; place: string;
};

export type Meta = {
  signs: (Sign & { definition: string; health_relevant: boolean })[];
  rungs: Rung[];
  uses: { code: string; label: string; min_rung: string }[];
  streams: { name: string; city: string; line: [number, number][] }[];
  start: [number, number];
  cities: { city: string; stream: string; start: [number, number] }[];
  rules: { radius_m: number; window_days: number; min_expert: number; min_community: number; per_day: number; upstream_m: number };
};

export type Avatar = "water" | "moss" | "sand" | "stone" | "dusk" | "ink";
export const AVATARS: Avatar[] = ["water", "moss", "sand", "stone", "dusk", "ink"];
export const CITIES = ["Coimbra", "Benevento", "Ghent", "Oslo", "Toulouse"] as const;

export type Session = {
  citizen: { id: string; name: string; demo?: boolean; account?: boolean; avatar?: Avatar } | null;
  org: { id: string; name: string; email: string; role: "reviewer" | "admin"; org_id?: string; org_name?: string; city?: string; avatar?: Avatar } | null;
  demo: boolean;
  consented: boolean;
};

export type Member = { id: string; email: string; name: string; role: "reviewer" | "admin"; active: boolean; title?: string; bio?: string; avatar?: Avatar };

export type Recognition = {
  stars: number; level: string; next_level: string | null; stars_to_next: number;
  breakdown: { rule: string; count: number; stars: number }[];
  badges: { code: string; earned: boolean }[];
  counts: Record<string, number>;
};

export type CitizenProfile = {
  pseudonym: string; display: string; demo: boolean; has_account: boolean; email: string | null; bio: string; city: string;
  avatar: Avatar; member_since: string | null; consent: { version: string; at: string } | null; recognition: Recognition;
};

export type OrgProfile = Member & {
  member_since: string; recognition: Recognition;
  organisation: { id: string; name: string; city: string; about: string; website: string };
};

// ---------------------------------------------------------------- formatting

export function when(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, locale?: string) {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(iso));
}

export function ago(iso: string, locale?: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [3600, "minute"], [86400, "hour"], [604800, "day"], [2629800, "week"], [31557600, "month"]];
  for (let i = 0; i < steps.length; i++) {
    const [limit, unit] = steps[i];
    if (Math.abs(s) < limit) return rtf.format(Math.round(s / (i ? steps[i - 1][0] : 1)), unit);
  }
  return rtf.format(Math.round(s / 31557600), "year");
}

export const signsText = (s: Sign[]) => s.map((x) => x.chip).join(", ");
