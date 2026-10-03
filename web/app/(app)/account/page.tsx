"use client";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError, useApi, type Member } from "@/ui/api";
import * as I from "@/ui/icons";
import { Empty, Page, Row, Section, Segmented, Sheet, useApp } from "@/ui/kit";

function ChangePassword() {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Row onClick={() => setOpen(true)} lead={<I.Shield className="status-ic info" />} title="Change password" />
      <Sheet open={open} onClose={() => setOpen(false)} title="Change password">
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/auth/password", { form: { current, new: next } });
            toast("Password changed");
            setOpen(false); setCurrent(""); setNext("");
          } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
        }}>
          <input type="text" autoComplete="username" hidden readOnly />
          <div className="field"><label className="field-label" htmlFor="pw-cur">Current password</label>
            <input id="pw-cur" className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="field"><label className="field-label" htmlFor="pw-new">New password</label>
            <input id="pw-new" className="input" type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-help" />
            <p id="pw-help" className="field-help">At least 10 characters.</p></div>
          {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
          <button className="btn btn-prominent btn-large btn-block" disabled={busy || next.length < 10}>{busy ? <I.Spinner /> : null} Change password</button>
        </form>
      </Sheet>
    </>
  );
}

function Team({ me }: { me: string }) {
  const q = useApi<{ members: Member[] }>("/org/team");
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "reviewer" as Member["role"], password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const members = q.data?.members ?? [];
  return (
    <Section title="Team" trail={<button className="btn btn-sm" onClick={() => setOpen(true)}><I.Plus /> Add</button>}
      foot="Reviewers verify reports and read the brief. Admins also manage the team. A deactivated account loses access straight away.">
      {members.length ? (
        <div className="group">
          {members.map((m) => (
            <div key={m.email} className="row has-lead">
              <div className="row-lead"><I.Person className={`status-ic ${m.active ? "info" : "fail"}`} /></div>
              <div className="row-body">
                <span className="row-title">{m.name}{m.email === me ? " (you)" : ""}</span>
                <span className="row-sub">{m.email} · {m.role === "admin" ? "Admin" : "Reviewer"}{m.active ? "" : " · deactivated"}</span>
              </div>
              {m.email !== me ? (
                <button className={`btn btn-sm${m.active ? " btn-destructive" : ""}`} onClick={async () => {
                  try {
                    await api(`/org/team/${encodeURIComponent(m.email)}/active`, { form: { active: m.active ? "0" : "1" } });
                    toast(m.active ? `${m.name} deactivated` : `${m.name} reactivated`, "info");
                    q.reload();
                  } catch (e) { toast((e as ApiError).message, "bad"); }
                }}>{m.active ? "Deactivate" : "Reactivate"}</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : <div className="card secondary">{q.loading ? "Loading…" : "No team members yet."}</div>}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add a team member">
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const m = await api<Member>("/org/team", { form: form });
            toast(`${m.name} can now sign in`);
            setOpen(false);
            setForm({ name: "", email: "", role: "reviewer", password: "" });
            q.reload();
          } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
        }}>
          <div className="field"><label className="field-label" htmlFor="m-name">Name</label>
            <input id="m-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label className="field-label" htmlFor="m-email">Email</label>
            <input id="m-email" className="input" type="email" autoComplete="off" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><span className="field-label">Role</span>
            <Segmented label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })}
              options={[{ value: "reviewer", label: "Reviewer" }, { value: "admin", label: "Admin" }]} /></div>
          <div className="field"><label className="field-label" htmlFor="m-pw">Temporary password</label>
            <input id="m-pw" className="input" type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-describedby="m-pw-help" />
            <p id="m-pw-help" className="field-help">At least 10 characters. Share it privately; they can change it under Account.</p></div>
          {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
          <button className="btn btn-prominent btn-large btn-block" disabled={busy}>{busy ? <I.Spinner /> : <I.Plus />} Add member</button>
        </form>
      </Sheet>
    </Section>
  );
}

export default function AccountPage() {
  const { session, refreshSession, toast } = useApp();
  if (!session) return <Page title="Account"><div className="skeleton" style={{ height: 120 }} /></Page>;
  const { org, citizen } = session;
  const signOutOrg = async () => { await api("/auth/logout", { method: "POST" }); await refreshSession(); toast("Signed out", "info"); };
  return (
    <Page title="Account" eyebrow="StreamProof">
      {!org && !citizen ? (
        <div className="card"><Empty icon={<I.Person />} title="You're not signed in" action={<Link className="btn btn-prominent" href="/sign-in">Sign in</Link>}>
          Citizens report without an account. Reviewers sign in with their organisation account.
        </Empty></div>
      ) : null}

      {org ? (
        <>
          <Section title="Organisation">
            <div className="group">
              <Row lead={<I.Shield className="status-ic info" />} title={org.name} sub={`${org.email} · ${org.role === "admin" ? "Admin" : "Reviewer"}`} chevron={false} />
              <ChangePassword />
              <button type="button" className="row" onClick={signOutOrg} style={{ color: "var(--bad)" }}>
                <div className="row-body"><span className="row-title">Sign out of the organisation account</span></div>
              </button>
            </div>
          </Section>
          {org.role === "admin" ? <Team me={org.email} /> : null}
        </>
      ) : (
        <Section title="Organisation"><div className="group"><Row href="/sign-in?role=org&next=/account" lead={<I.Shield className="status-ic info" />} title="Sign in as a reviewer or coordinator" /></div></Section>
      )}

      {citizen ? (
        <Section title="Citizen" foot="You report under a pseudonym. Your name and contact details are never part of the evidence or its signature.">
          <div className="group">
            <Row lead={<I.Camera className="status-ic info" />} title={citizen.name} sub={<>Pseudonym <span className="mono">{citizen.id}</span>{citizen.demo ? " · demo citizen" : ""}</>} chevron={false} />
            <Row lead={session.consented ? <I.CheckCircle className="status-ic ok" /> : <I.Info className="status-ic info" />}
              title={session.consented ? "You agreed to how reports are used" : "You'll be asked to agree before your first report"} chevron={false} />
            <Row href="/reports" lead={<I.Reports className="status-ic info" />} title="My reports and personal data" />
          </div>
        </Section>
      ) : (
        <Section title="Citizen"><div className="group"><Row href="/sign-in?next=/report" lead={<I.Camera className="status-ic info" />} title="Start reporting (no account needed)" /></div></Section>
      )}
      {session.demo ? <p className="secondary t-foot">Demo mode is on: demo accounts can be used without a password.</p> : null}
    </Page>
  );
}
