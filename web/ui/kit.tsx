"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { api, ApiError, type Reason, type Rung, type Session } from "./api";
import { Avatar } from "./avatar";
import { LANGS, useI18n } from "./i18n";
import * as I from "./icons";

// ---------------------------------------------------------------- session + toasts

type Toast = { id: number; text: string; kind: "ok" | "bad" | "info" };
/** Which side of the app you're using: citizens and organisations each get their own dashboard and navigation. */
export type Mode = "citizen" | "org" | "guest";
type Ctx = {
  session: Session | null; refreshSession: () => Promise<void>; toast: (text: string, kind?: Toast["kind"]) => void;
  mode: Mode; setMode: (m: "citizen" | "org") => void;
};
const AppCtx = createContext<Ctx>({ session: null, refreshSession: async () => {}, toast: () => {}, mode: "guest", setMode: () => {} });
export const useApp = () => useContext(AppCtx);
export const homeOf = (m: Mode) => (m === "org" ? "/dashboard" : m === "citizen" ? "/home" : "/start");

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pref, setPref] = useState<"citizen" | "org" | null>(null);
  useEffect(() => { try { const v = localStorage.getItem("sp-mode"); if (v === "citizen" || v === "org") setPref(v); } catch { /* private mode */ } }, []);
  const setMode = useCallback((m: "citizen" | "org") => { setPref(m); try { localStorage.setItem("sp-mode", m); } catch { /* ignore */ } }, []);
  const mode: Mode = session?.org && session?.citizen ? (pref ?? "org") : session?.org ? "org" : session?.citizen ? "citizen" : "guest";
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
    <AppCtx.Provider value={{ session, refreshSession, toast, mode, setMode }}>
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

function AccountButton() {
  const { t } = useI18n();
  const { session } = useApp();
  const who = session?.citizen ?? session?.org;
  return (
    <Link href="/account" className="btn btn-sm btn-icon account-btn" aria-label={who ? `${t("account")}: ${who.name}` : t("account")}>
      {who ? <Avatar name={who.name} colour={who.avatar} size={28} /> : <I.Person />}
    </Link>
  );
}

/** Language picker: six languages for everything a citizen sees. */
export function LanguageButton() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} aria-label={`${t("language")}: ${LANGS.find((l) => l.code === lang)?.name}`}>
        <I.Globe /> <span className="mono btn-label" style={{ textTransform: "uppercase" }}>{lang}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("language")}>
        <div className="group" role="radiogroup" aria-label={t("language")}>
          {LANGS.map((l) => (
            <button key={l.code} type="button" className="row" role="radio" aria-checked={l.code === lang} lang={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}>
              <div className="row-body"><span className="row-title">{l.name}</span></div>
              {l.code === lang ? <I.Check width={20} height={20} style={{ color: "var(--link)" }} /> : null}
            </button>
          ))}
        </div>
        <p className="secondary t-foot">{t("language.note")}</p>
      </Sheet>
    </>
  );
}

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
        <div className="navbar-trail">
          {actions}
          <LanguageButton />
          <AccountButton />
        </div>
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

/** Organisation sign-in: email + password; one-tap demo account in demo mode. */
export function OrgSignIn({ onDone }: { onDone: () => void }) {
  const { session, refreshSession } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "login" | "demo">("");
  const done = async () => { await refreshSession(); onDone(); };
  return (
    <form className="card stack-l" style={{ padding: 24 }} onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy("login");
      try { await api("/auth/login", { form: { email, password } }); await done(); }
      catch (err) { setError((err as ApiError).message); }
      finally { setBusy(""); }
    }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}><I.Shield /></span>
        <h2 className="t-title2">Organisation sign-in</h2>
        <p className="secondary">For reviewers and coordinators of a OneAquaHealth pilot.</p>
      </div>
      <div className="stack">
        <div className="field">
          <label className="field-label" htmlFor="org-email">Email</label>
          <input id="org-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org-pw">Password</label>
          <input id="org-pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={Boolean(busy)}>{busy === "login" ? <I.Spinner /> : null} Sign in</button>
        <p className="auth-links secondary">New pilot or partner? <Link href="/sign-up?role=org">Create an organisation account</Link></p>
      </div>
      {session?.demo ? (
        <div className="stack" style={{ gap: 8, borderTop: "0.5px solid var(--separator)", paddingTop: 16 }}>
          <p className="secondary t-sub">Judging the demo? Use the demo reviewer account. The reports are synthetic.</p>
          <button type="button" className="btn btn-block" disabled={Boolean(busy)} onClick={async () => {
            setBusy("demo");
            try { await api("/session", { form: { role: "org" } }); await done(); } finally { setBusy(""); }
          }}>{busy === "demo" ? <I.Spinner /> : <I.Person />} Continue with the demo reviewer</button>
        </div>
      ) : null}
    </form>
  );
}

/** Citizens never get a password: a new pseudonym for this device, or the demo citizen. */
export function CitizenStart({ onDone }: { onDone: () => void }) {
  const { session, refreshSession } = useApp();
  const { t } = useI18n();
  const [display, setDisplay] = useState("");
  const [busy, setBusy] = useState<"" | "new" | "demo">("");
  const [error, setError] = useState("");
  const go = async (kind: "new" | "demo") => {
    setBusy(kind);
    setError("");
    try {
      if (kind === "new") await api("/citizen/start", { form: { display } });
      else await api("/session", { form: { role: "citizen" } });
      await refreshSession();
      onDone();
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(""); }
  };
  return (
    <div className="card stack-l" style={{ padding: 24, scrollMarginTop: 80 }} id="anon">
      <div className="stack" style={{ gap: 6 }}>
        <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}><I.Camera /></span>
        <h2 className="t-title2">{t("cs.title")}</h2>
        <p className="secondary">{t("cs.body")}</p>
      </div>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); go("new"); }}>
        <div className="field">
          <label className="field-label" htmlFor="display">{t("cs.name")}</label>
          <input id="display" className="input" maxLength={40} autoComplete="nickname" value={display} onChange={(e) => setDisplay(e.target.value)} placeholder={t("cs.ph")} />
          <p className="field-help">{t("cs.nameHelp")}</p>
        </div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={Boolean(busy)}>{busy === "new" ? <I.Spinner /> : null} {t("cs.start")}</button>
      </form>
      {session?.demo ? (
        <div className="stack" style={{ gap: 8, borderTop: "0.5px solid var(--separator)", paddingTop: 16 }}>
          <p className="secondary t-sub">{t("cs.demoText")}</p>
          <button type="button" className="btn btn-block" disabled={Boolean(busy)} onClick={() => go("demo")}>
            {busy === "demo" ? <I.Spinner /> : <I.Person />} {t("cs.demo")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Citizen sign-in with an account (email + password). */
export function CitizenLogin({ onDone }: { onDone: () => void }) {
  const { refreshSession } = useApp();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="card stack-l" style={{ padding: 24 }} onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      try { await api("/citizen/login", { form: { email, password } }); await refreshSession(); onDone(); }
      catch (err) { setError((err as ApiError).message); }
      finally { setBusy(false); }
    }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}><I.Person /></span>
        <h2 className="t-title2">{t("si.citizen.title")}</h2>
        <p className="secondary">{t("si.citizen.body")}</p>
      </div>
      <div className="stack">
        <div className="field">
          <label className="field-label" htmlFor="cz-email">{t("si.email")}</label>
          <input id="cz-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="cz-pw">{t("si.password")}</label>
          <input id="cz-pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={busy}>{busy ? <I.Spinner /> : null} {t("signin")}</button>
        <p className="auth-links secondary">{t("si.noAccount")} <Link href="/sign-up">{t("signup")}</Link></p>
      </div>
    </form>
  );
}

/** Everything a citizen can do to start: sign in, or report without an account (or the demo citizen). */
export function CitizenSignIn({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  return (
    <div className="stack-l">
      <CitizenLogin onDone={onDone} />
      <p className="auth-divider">{t("si.orAnon")}</p>
      <CitizenStart onDone={onDone} />
    </div>
  );
}

export function SignIn({ role, onDone }: { role: "citizen" | "org"; onDone: () => void }) {
  return role === "org" ? <OrgSignIn onDone={onDone} /> : <CitizenSignIn onDone={onDone} />;
}

/** Render loading / sign-in / error for a useApi() result, or the children when data is ready. */
export function Gate<T>({ q, children, skeleton }: { q: { data: T | null; error: ApiError | null; loading: boolean; reload: () => void }; children: (d: T) => React.ReactNode; skeleton?: React.ReactNode }) {
  const { t } = useI18n();
  if (q.error?.signin) return <SignIn role={q.error.signin} onDone={q.reload} />;
  if (q.error && !q.data) {
    return (
      <Empty icon={q.error.status === 0 ? <I.Cloud /> : <I.Warn />} title={q.error.status === 0 ? t("state.offline") : q.error.status === 404 ? t("state.notFound") : t("state.cantLoad")}
        action={<button className="btn" onClick={q.reload}><I.Refresh /> {t("state.tryAgain")}</button>}>
        {q.error.status === 0 ? t("state.offlineMsg") : q.error.message}
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

const LADDER = ["report", "assessed", "community", "expert", "decision"];

export function Ladder({ rung }: { rung: Rung }) {
  const { t, rung: rungLabel } = useI18n();
  if (rung.level === 0) return <span className="pill bad"><I.XCircle /> {rungLabel(rung.value, rung.label)}</span>;
  return (
    <ol className="ladder" aria-label={t("ladder.aria", { label: rungLabel(rung.value, rung.label), n: rung.level })}>
      {LADDER.map((key, i) => {
        const level = i + 1;
        return (
          <li key={key} className={level < rung.level ? "done" : level === rung.level ? "now" : ""} aria-current={level === rung.level ? "step" : undefined}>
            <span>{t(`ladder.${key}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RungPill({ rung }: { rung: Rung }) {
  const { rung: rungLabel } = useI18n();
  const kind = rung.level === 0 ? "bad" : rung.level >= 4 ? "ok" : "";
  return <span className={`pill ${kind}`}>{rung.level >= 4 ? <I.Check /> : null}{rungLabel(rung.value, rung.label)}</span>;
}

export function Reasons({ reasons }: { reasons: Reason[] }) {
  const { t, tr } = useI18n();
  return (
    <div className="group">
      {reasons.map((r) => (
        <div key={r.signal} className="row has-lead" style={{ alignItems: "flex-start" }}>
          <div className="row-lead" style={{ paddingTop: 1 }}><I.StatusIcon status={r.status} /></div>
          <div className="row-body">
            <span className="row-title">{t(`check.${r.signal}`)}</span>
            <span className="row-sub">{tr(r.text)}</span>
          </div>
          <span className="row-trail num" aria-label={t("card.points", { p: r.points, max: r.max_points })}>{r.points}/{r.max_points}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreMeter({ score }: { score: number | null }) {
  const { t } = useI18n();
  const v = score ?? 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread t-sub"><span className="secondary">{t("card.score")}</span><span className="num">{v}/100</span></div>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={t("card.score")}><span style={{ width: `${v}%` }} /></div>
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
