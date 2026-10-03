"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { api, ApiError, type Reason, type Rung, type Session } from "./api";
import * as I from "./icons";

// ---------------------------------------------------------------- session + toasts

type Toast = { id: number; text: string; kind: "ok" | "bad" | "info" };
type Ctx = { session: Session | null; refreshSession: () => Promise<void>; toast: (text: string, kind?: Toast["kind"]) => void };
const AppCtx = createContext<Ctx>({ session: null, refreshSession: async () => {}, toast: () => {} });
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshSession = useCallback(async () => {
    try { setSession(await api<Session>("/session")); } catch { /* offline: keep the last value */ }
  }, []);
  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  useEffect(() => { refreshSession(); }, [refreshSession]);
  return (
    <AppCtx.Provider value={{ session, refreshSession, toast }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "bad" ? <I.XCircle /> : t.kind === "info" ? <I.Info /> : <I.CheckCircle />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

// ---------------------------------------------------------------- page chrome

type PageProps = {
  title: string; eyebrow?: string; subtitle?: React.ReactNode; back?: { href: string; label: string };
  actions?: React.ReactNode; width?: "content" | "wide" | "full"; children: React.ReactNode;
};

/** Large title that hands over to a compact navigation bar as it scrolls away. */
export function Page({ title, eyebrow, subtitle, back, actions, width = "content", children }: PageProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { document.title = `${title} · StreamProof`; }, [title]);
  return (
    <>
      <div className={`navbar nb-${width}${scrolled ? " scrolled" : ""}`}>
        <div className="navbar-lead">
          {back ? (
            <Link href={back.href} className="btn btn-plain" style={{ paddingLeft: 4 }}>
              <I.ChevronLeft /> {back.label}
            </Link>
          ) : null}
        </div>
        <div className="navbar-title" aria-hidden>{title}</div>
        <div className="navbar-trail">{actions}</div>
      </div>
      <main id="content" className={`page${width === "wide" ? " wide" : width === "full" ? " full" : ""}`} tabIndex={-1}>
        <header className="page-head">
          {eyebrow ? <p className="eyebrow">({eyebrow})</p> : null}
          <h1 className="t-large">{title}</h1>
          <div ref={sentinel} />
          {subtitle ? <div className="secondary t-callout">{subtitle}</div> : null}
        </header>
        {children}
      </main>
    </>
  );
}

export function Section({ title, n, trail, foot, children, id }: { title: string; n?: number; trail?: React.ReactNode; foot?: React.ReactNode; children: React.ReactNode; id?: string }) {
  const hid = useId();
  return (
    <section className="section" aria-labelledby={hid} id={id}>
      <div className="section-head">
        {n !== undefined ? <span className="badge-n" aria-hidden>{n}</span> : null}
        <h2 id={hid}>({title})</h2>
        {trail ? <div className="trail">{trail}</div> : null}
      </div>
      {children}
      {foot ? <p className="section-foot">{foot}</p> : null}
    </section>
  );
}

export function Callout({ kind = "info", title, children, icon }: { kind?: "info" | "ok" | "warn" | "bad"; title?: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  const Icon = icon ?? (kind === "ok" ? <I.CheckCircle /> : kind === "warn" ? <I.Warn /> : kind === "bad" ? <I.XCircle /> : <I.Info />);
  return (
    <div className={`callout ${kind}`} role={kind === "bad" ? "alert" : undefined}>
      {Icon}
      <div>
        {title ? <p className="callout-title">{title}</p> : null}
        {children ? <div className="t-callout">{children}</div> : null}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <I.Reports />}
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ h = 64, n = 1 }: { h?: number; n?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
    </div>
  );
}

// ---------------------------------------------------------------- sign-in + errors

const ROLE_COPY = {
  citizen: {
    title: "Report as a citizen",
    body: "You'll use the demo account of Maria S., a citizen in Coimbra. Everyone else in this demo is synthetic, and the demo data can be reset at any time.",
    cta: "Continue as demo citizen",
    icon: <I.Camera />,
  },
  org: {
    title: "Review as an ecologist",
    body: "You'll use the demo reviewer account of the Coimbra pilot: verify reports, open evidence missions and read the River Health Brief. The reports are synthetic.",
    cta: "Continue as demo reviewer",
    icon: <I.Shield />,
  },
} as const;

export function SignIn({ role, onDone }: { role: "citizen" | "org"; onDone: () => void }) {
  const { refreshSession } = useApp();
  const [busy, setBusy] = useState(false);
  const c = ROLE_COPY[role];
  return (
    <div className="card" style={{ display: "grid", gap: 14, justifyItems: "start", padding: 24 }}>
      <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}>{c.icon}</span>
      <h2 className="t-title2">{c.title}</h2>
      <p className="secondary">{c.body}</p>
      <button className="btn btn-prominent btn-large" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await api("/session", { form: { role } }); await refreshSession(); onDone(); } finally { setBusy(false); }
      }}>
        {busy ? <I.Spinner /> : null}{c.cta} <I.ChevronRight />
      </button>
    </div>
  );
}

/** Render loading / sign-in / error for a useApi() result, or the children when data is ready. */
export function Gate<T>({ q, children, skeleton }: { q: { data: T | null; error: ApiError | null; loading: boolean; reload: () => void }; children: (d: T) => React.ReactNode; skeleton?: React.ReactNode }) {
  if (q.error?.signin) return <SignIn role={q.error.signin} onDone={q.reload} />;
  if (q.error && !q.data) {
    return (
      <Empty icon={q.error.status === 0 ? <I.Cloud /> : <I.Warn />} title={q.error.status === 0 ? "You're offline" : q.error.status === 404 ? "Not found" : "Couldn't load this"}
        action={<button className="btn" onClick={q.reload}><I.Refresh /> Try again</button>}>
        {q.error.message}
      </Empty>
    );
  }
  if (!q.data) return <>{skeleton ?? <Skeleton n={3} />}</>;
  return <>{children(q.data)}</>;
}

// ---------------------------------------------------------------- controls

export function Segmented<V extends string>({ label, options, value, onChange }: { label: string; options: { value: V; label: React.ReactNode }[]; value: V; onChange: (v: V) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1} onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            const j = (i + d + options.length) % options.length;
            onChange(options[j].value);
            refs.current[j]?.focus();
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on compact widths, centred form sheet on regular widths. Swipe down to dismiss. */
export function Sheet({ open, onClose, title, children, lead, trail }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; lead?: React.ReactNode; trail?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const hid = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const down = (e: React.PointerEvent) => {
    if (window.matchMedia("(min-width: 700px)").matches) return;
    // let taps on the header's own buttons through (pointer capture would swallow their click)
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const up = () => {
    if (!drag.current || !ref.current) return;
    if (drag.current.dy < 4) { drag.current = null; ref.current.style.transform = ""; return; } // a tap, not a swipe
    const far = drag.current.dy > 110;
    ref.current.style.transition = "transform .25s cubic-bezier(.32,.72,0,1)";
    ref.current.style.transform = far ? "translateY(100%)" : "";
    const el = ref.current;
    setTimeout(() => { el.style.transition = ""; el.style.transform = ""; if (far) onClose(); }, far ? 220 : 260);
    drag.current = null;
  };
  return (
    <dialog ref={ref} className="sheet" aria-labelledby={hid} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden />
      <div className="sheet-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div style={{ justifySelf: "start" }}>{lead ?? <button type="button" className="btn btn-plain" onClick={onClose}>Cancel</button>}</div>
        <h2 id={hid}>{title}</h2>
        <div style={{ justifySelf: "end" }}>{trail}</div>
      </div>
      <div className="sheet-body">{open ? children : null}</div>
    </dialog>
  );
}

// ---------------------------------------------------------------- evidence pieces

export function Grade({ g, size }: { g: string | null; size?: "md" | "lg" }) {
  return (
    <span className={`grade${size ? ` grade-${size}` : ""}`} data-g={g ?? ""} role="img" aria-label={g ? `Grade ${g}` : "Not graded"}>
      <span aria-hidden>{g ?? "–"}</span>
    </span>
  );
}

const LADDER = [
  { level: 1, label: "Report" }, { level: 2, label: "Assessed" }, { level: 3, label: "Community" },
  { level: 4, label: "Expert" }, { level: 5, label: "Decision" },
];

export function Ladder({ rung }: { rung: Rung }) {
  if (rung.level === 0) return <span className="pill bad"><I.XCircle /> Not confirmed</span>;
  return (
    <ol className="ladder" aria-label={`Trust level: ${rung.label}, step ${rung.level} of 5`}>
      {LADDER.map((s) => (
        <li key={s.level} className={s.level < rung.level ? "done" : s.level === rung.level ? "now" : ""} aria-current={s.level === rung.level ? "step" : undefined}>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function RungPill({ rung }: { rung: Rung }) {
  const kind = rung.level === 0 ? "bad" : rung.level >= 4 ? "ok" : "";
  return <span className={`pill ${kind}`}>{rung.level >= 4 ? <I.Check /> : null}{rung.label}</span>;
}

const SIGNAL_NAMES: Record<string, string> = {
  photo: "Photo", photo_time: "Photo time", location: "Location", stream: "On a stream",
  nearby: "Nearby reports", context: "Weather", track_record: "Track record",
};

export function Reasons({ reasons }: { reasons: Reason[] }) {
  return (
    <div className="group">
      {reasons.map((r) => (
        <div key={r.signal} className="row has-lead" style={{ alignItems: "flex-start" }}>
          <div className="row-lead" style={{ paddingTop: 1 }}><I.StatusIcon status={r.status} /></div>
          <div className="row-body">
            <span className="row-title">{SIGNAL_NAMES[r.signal] ?? r.signal}</span>
            <span className="row-sub">{r.text}</span>
          </div>
          <span className="row-trail num" aria-label={`${r.points} of ${r.max_points} points`}>{r.points}/{r.max_points}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreMeter({ score }: { score: number | null }) {
  const v = score ?? 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread t-sub"><span className="secondary">Evidence score</span><span className="num">{v}/100</span></div>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label="Evidence score"><span style={{ width: `${v}%` }} /></div>
    </div>
  );
}

export function Row({ href, onClick, lead, title, sub, trail, chevron = true, selected }: { href?: string; onClick?: () => void; lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; trail?: React.ReactNode; chevron?: boolean; selected?: boolean }) {
  const inner = (
    <>
      {lead ? <div className="row-lead">{lead}</div> : null}
      <div className="row-body"><span className="row-title">{title}</span>{sub ? <span className="row-sub">{sub}</span> : null}</div>
      {trail || chevron ? <div className="row-trail">{trail}{(href || onClick) && chevron ? <I.ChevronRight className="chev" /> : null}</div> : null}
    </>
  );
  const cls = `row${lead ? " has-lead" : ""}`;
  if (href) return <Link href={href} className={cls} aria-current={selected ? "true" : undefined}>{inner}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-current={selected ? "true" : undefined}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
