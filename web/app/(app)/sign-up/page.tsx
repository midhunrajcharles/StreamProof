"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiError, CITIES, type Session } from "@/ui/api";
import { EnglishOnly, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Page, Segmented, Sheet, Skeleton, useApp } from "@/ui/kit";

function CityChips({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="field"><span className="field-label" id="city-label">{label}</span>
      <div className="chips" role="radiogroup" aria-labelledby="city-label">
        {CITIES.map((c) => <button key={c} type="button" className="chip" role="radio" aria-checked={value === c} onClick={() => onChange(c)}><I.Check /> {c}</button>)}
      </div>
    </div>
  );
}

function ConsentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t("su.what")} lead={<span />} trail={<button type="button" className="btn btn-plain" onClick={onClose}>OK</button>}>
      <div className="group">
        {(["private", "public", "used", "rights", "safe"] as const).map((k) => (
          <div key={k} className="row"><div className="row-body"><span className="row-title">{t(`consent.${k}`)}</span><span className="row-sub">{t(`consent.${k}Text`)}</span></div></div>
        ))}
      </div>
    </Sheet>
  );
}

function CitizenSignUp({ onDone }: { onDone: () => void }) {
  const { session, refreshSession, toast } = useApp();
  const { t } = useI18n();
  const [f, setF] = useState({ display: session?.citizen && !session.citizen.demo ? session.citizen.name : "", email: "", password: "", city: "Coimbra" });
  const [agree, setAgree] = useState(false);
  const [why, setWhy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const keeps = Boolean(session?.citizen && !session.citizen.demo && !session.citizen.account);
  return (
    <form className="card stack-l" style={{ padding: 24 }} onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      try {
        const r = await api<Session & { kept_reports: boolean }>("/citizen/signup", { form: { ...f, agree: agree ? "1" : "" } });
        await refreshSession();
        toast(r.kept_reports ? t("su.kept") : t("su.done"));
        onDone();
      } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
    }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}><I.Camera /></span>
        <h2 className="t-title2">{t("su.citizen.title")}</h2>
        <p className="secondary">{t("su.citizen.body")}</p>
        {keeps ? <p className="pill ok" style={{ whiteSpace: "normal", padding: "6px 12px" }}><I.Check /> {t("su.keep")}</p> : null}
      </div>
      <div className="stack">
        <div className="field"><label className="field-label" htmlFor="su-name">{t("su.name")}</label>
          <input id="su-name" className="input" required maxLength={40} autoComplete="nickname" value={f.display} onChange={(e) => setF({ ...f, display: e.target.value })} aria-describedby="su-name-help" />
          <p id="su-name-help" className="field-help">{t("su.nameHelp")}</p></div>
        <div className="field"><label className="field-label" htmlFor="su-email">{t("si.email")}</label>
          <input id="su-email" className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="field"><label className="field-label" htmlFor="su-pw">{t("si.password")}</label>
          <input id="su-pw" className="input" type="password" required minLength={10} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-describedby="su-pw-help" />
          <p id="su-pw-help" className="field-help">{t("su.pwHelp")}</p></div>
        <CityChips label={t("su.city")} value={f.city} onChange={(city) => setF({ ...f, city })} />
        <div className="check-row">
          <input id="su-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <label htmlFor="su-agree">{t("su.agree")}</label>
          <button type="button" className="btn btn-plain btn-sm" onClick={() => setWhy(true)}>{t("su.what")}</button>
        </div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={busy || !agree || f.password.length < 10}>{busy ? <I.Spinner /> : null} {t("signup")}</button>
      </div>
      <ConsentSheet open={why} onClose={() => setWhy(false)} />
    </form>
  );
}

function OrgSignUp({ onDone }: { onDone: () => void }) {
  const { refreshSession, toast } = useApp();
  const [f, setF] = useState({ org_name: "", city: "Coimbra", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="card stack-l" style={{ padding: 24 }} onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      try {
        await api("/org/signup", { form: f });
        await refreshSession();
        toast(`${f.org_name} created. You're its admin.`);
        onDone();
      } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
    }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="grade grade-md" style={{ color: "var(--label)", background: "var(--fill)" }}><I.Building /></span>
        <h2 className="t-title2">Create an organisation account</h2>
        <p className="secondary">For a municipality, utility, university or NGO working with one OneAquaHealth city. You become its admin and can add reviewers. Your team sees only reports from your city.</p>
      </div>
      <div className="stack">
        <div className="field"><label className="field-label" htmlFor="os-org">Organisation name</label>
          <input id="os-org" className="input" required maxLength={80} autoComplete="organization" value={f.org_name} onChange={(e) => setF({ ...f, org_name: e.target.value })} /></div>
        <CityChips label="City" value={f.city} onChange={(city) => setF({ ...f, city })} />
        <div className="field"><label className="field-label" htmlFor="os-name">Your name</label>
          <input id="os-name" className="input" required maxLength={80} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label className="field-label" htmlFor="os-email">Work email</label>
          <input id="os-email" className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="field"><label className="field-label" htmlFor="os-pw">Password</label>
          <input id="os-pw" className="input" type="password" required minLength={10} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-describedby="os-pw-help" />
          <p id="os-pw-help" className="field-help">At least 10 characters.</p></div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={busy || f.password.length < 10}>{busy ? <I.Spinner /> : null} Create organisation</button>
        <p className="field-help">In this demo anyone can create an organisation. A real deployment would confirm the organisation with OneAquaHealth first.</p>
      </div>
    </form>
  );
}

function SignUpPage() {
  const q = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const [role, setRole] = useState<"citizen" | "org">(q.get("role") === "org" ? "org" : "citizen");
  const next = q.get("next");
  const go = () => router.push(next && next.startsWith("/") ? next : "/account");
  return (
    <Page title={t("signup")} eyebrow="StreamProof">
      <div className="stack-l">
        <Segmented label={t("signup")} value={role} onChange={setRole}
          options={[{ value: "citizen", label: t("group.citizen") }, { value: "org", label: t("group.org") }]} />
        {role === "org" ? <EnglishOnly><OrgSignUp onDone={go} /></EnglishOnly> : <CitizenSignUp onDone={go} />}
        <p className="auth-links secondary">{t("su.have")} <Link href={`/sign-in${role === "org" ? "?role=org" : ""}`}>{t("signin")}</Link></p>
      </div>
    </Page>
  );
}

export default function Page_() {
  return <Suspense fallback={<div className="page"><Skeleton n={2} h={160} /></div>}><SignUpPage /></Suspense>;
}
