"use client";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError, when, useApi, type CitizenProfile, type Member, type OrgProfile } from "@/ui/api";
import { EnglishOnly, localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Empty, Gate, Page, Row, Section, Segmented, Sheet, Skeleton, useApp } from "@/ui/kit";
import { Avatar, ChangePassword, EditProfile, ProfileCard, SignOut, Stars } from "@/ui/profile";

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

// ---------------------------------------------------------------- citizen

function CitizenAccount() {
  const { t, lang } = useI18n();
  const { refreshSession } = useApp();
  const q = useApi<CitizenProfile>("/citizen/profile");
  const [edit, setEdit] = useState(false);
  return (
    <Gate q={q} skeleton={<Skeleton n={2} h={120} />}>
      {(p) => (
        <>
          <Section title={t("group.citizen")} foot={t("acc.foot")}>
            <ProfileCard name={p.display} colour={p.avatar} bio={p.bio} stars={p.recognition.stars} onEdit={() => setEdit(true)}
              lines={[
                <>{t("acc.pseudonym")} <span className="mono">{p.pseudonym}</span>{p.demo ? ` · ${t("acc.demo")}` : ""}</>,
                p.city ? <span className="org-pill"><I.Pin width={14} height={14} /> {p.city}</span> : null,
                p.member_since ? t("acc.since", { d: when(p.member_since, DAY, localeOf(lang)) }) : null,
              ]} />
            {!p.has_account && !p.demo ? (
              <div style={{ marginTop: 12 }}>
                <Callout kind="info" title={t("acc.anonTitle")}>
                  <p style={{ margin: "0 0 10px" }}>{t("acc.anonBody")}</p>
                  <Link className="btn btn-sm btn-prominent" href="/sign-up?next=/account"><I.Person /> {t("signup")}</Link>
                </Callout>
              </div>
            ) : null}
          </Section>

          <Section title={t("rec.title")}><Stars rec={p.recognition} kind="citizen" /></Section>

          <Section title={t("acc.security")}>
            <div className="group">
              {p.email ? <Row lead={<I.Person className="status-ic info" />} title={p.email} sub={t("si.email")} chevron={false} /> : null}
              {p.has_account ? <ChangePassword path="/citizen/password" /> : null}
              <Row lead={p.consent ? <I.CheckCircle className="status-ic ok" /> : <I.Info className="status-ic info" />}
                title={p.consent ? t("acc.consentYes") : t("acc.consentNo")} chevron={false} />
              <Row href="/reports" lead={<I.Reports className="status-ic info" />} title={t("acc.myReports")} />
              <SignOut role="citizen" />
            </div>
          </Section>

          <EditProfile open={edit} onClose={() => setEdit(false)} fields={{ bio: p.has_account, city: p.has_account }}
            initial={{ name: p.display, bio: p.bio, city: p.city, avatar: p.avatar }}
            save={async (v) => {
              q.setData(await api<CitizenProfile>("/citizen/profile", { form: { display: v.name, bio: v.bio, city: v.city ?? "", avatar: v.avatar } }));
              await refreshSession();
            }} />
        </>
      )}
    </Gate>
  );
}

// ---------------------------------------------------------------- organisation (English, like the reviewer screens)

function EditOrganisation({ open, onClose, org, onSaved }: { open: boolean; onClose: () => void; org: OrgProfile["organisation"]; onSaved: (p: OrgProfile) => void }) {
  const { toast } = useApp();
  const [v, setV] = useState({ name: org.name, about: org.about ?? "", website: org.website ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Edit organisation">
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          onSaved(await api<OrgProfile>("/org/organisation", { form: v }));
          toast("Organisation saved");
          onClose();
        } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
      }}>
        <div className="field"><label className="field-label" htmlFor="og-name">Name</label>
          <input id="og-name" className="input" required maxLength={80} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div className="field"><label className="field-label" htmlFor="og-about">About</label>
          <textarea id="og-about" className="textarea" maxLength={500} value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} placeholder="What your organisation does with the evidence" /></div>
        <div className="field"><label className="field-label" htmlFor="og-web">Website</label>
          <input id="og-web" className="input" type="url" inputMode="url" placeholder="https://" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} /></div>
        <p className="field-help">The city ({org.city}) decides which reports your team sees, so it can&apos;t be changed here.</p>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={busy}>{busy ? <I.Spinner /> : null} Save</button>
      </form>
    </Sheet>
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
      foot="Reviewers verify reports and read the brief. Admins also manage the team and the organisation profile. A deactivated account loses access straight away.">
      {members.length ? (
        <div className="group">
          {members.map((m) => (
            <div key={m.email} className="row has-lead" style={m.active ? undefined : { opacity: 0.6 }}>
              <div className="row-lead"><Avatar name={m.name} colour={m.avatar} size={36} /></div>
              <div className="row-body">
                <span className="row-title">{m.name}{m.email === me ? " (you)" : ""}</span>
                <span className="row-sub">{m.title ? `${m.title} · ` : ""}{m.role === "admin" ? "Admin" : "Reviewer"} · {m.email}{m.active ? "" : " · deactivated"}</span>
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
            const m = await api<Member>("/org/team", { form });
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

function OrgAccount() {
  const { refreshSession } = useApp();
  const q = useApi<OrgProfile>("/org/profile");
  const [edit, setEdit] = useState(false);
  const [editOrg, setEditOrg] = useState(false);
  return (
    <Gate q={q} skeleton={<Skeleton n={2} h={120} />}>
      {(p) => {
        const o = p.organisation;
        const admin = p.role === "admin";
        return (
          <>
            <Section title="Organisation account">
              <ProfileCard name={p.name} colour={p.avatar} bio={p.bio} stars={p.recognition.stars} onEdit={() => setEdit(true)}
                lines={[
                  `${p.title ? `${p.title} · ` : ""}${admin ? "Admin" : "Reviewer"}`,
                  <span key="o" className="org-pill"><I.Building width={14} height={14} /> {o.name} · {o.city}</span>,
                  p.member_since ? `Member since ${when(p.member_since, DAY, "en")}` : null,
                ]} />
            </Section>

            <Section title="Reviewer stars"><Stars rec={p.recognition} kind="reviewer" /></Section>

            <Section title="Your organisation" trail={admin ? <button className="btn btn-sm" onClick={() => setEditOrg(true)}><I.Pencil /> Edit</button> : null}
              foot={`Your team sees reports, missions and the brief for ${o.city} only.`}>
              <div className="group">
                <Row lead={<I.Building className="status-ic info" />} title={o.name} sub={o.city} chevron={false} />
                {o.about ? <div className="row"><div className="row-body"><span className="row-sub" style={{ whiteSpace: "pre-line" }}>{o.about}</span></div></div> : null}
                {o.website ? (
                  <a className="row has-lead" href={o.website} target="_blank" rel="noopener noreferrer">
                    <div className="row-lead"><I.External className="status-ic info" /></div>
                    <div className="row-body"><span className="row-title" style={{ overflowWrap: "anywhere" }}>{o.website.replace(/^https?:\/\//, "")}</span></div>
                  </a>
                ) : null}
              </div>
            </Section>

            <Section title="Organisation sign-in and security">
              <div className="group">
                <Row lead={<I.Person className="status-ic info" />} title={p.email} sub="Email" chevron={false} />
                <ChangePassword path="/auth/password" />
                <SignOut role="org" />
              </div>
            </Section>

            {admin ? <Team me={p.email} /> : null}

            <EditProfile open={edit} onClose={() => setEdit(false)} fields={{ title: true, bio: true }}
              initial={{ name: p.name, title: p.title, bio: p.bio ?? "", avatar: p.avatar ?? "ink" }}
              save={async (v) => {
                q.setData(await api<OrgProfile>("/org/profile", { form: { name: v.name, title: v.title ?? "", bio: v.bio, avatar: v.avatar } }));
                await refreshSession();
              }} />
            {admin ? <EditOrganisation open={editOrg} onClose={() => setEditOrg(false)} org={o}
              onSaved={async (next) => { q.setData(next); await refreshSession(); }} /> : null}
          </>
        );
      }}
    </Gate>
  );
}

// ---------------------------------------------------------------- page

export default function AccountPage() {
  const { session } = useApp();
  const { t } = useI18n();
  if (!session) return <Page title={t("account")}><Skeleton n={2} h={120} /></Page>;
  const { org, citizen } = session;
  return (
    <Page title={t("account")} eyebrow="StreamProof">
      {!org && !citizen ? (
        <div className="card"><Empty icon={<I.Person />} title={t("acc.outTitle")}
          action={<div className="hstack" style={{ justifyContent: "center" }}>
            <Link className="btn btn-prominent" href="/sign-in">{t("signin")}</Link>
            <Link className="btn" href="/sign-up">{t("signup")}</Link>
          </div>}>
          {t("acc.outBody")}
        </Empty></div>
      ) : null}

      {citizen ? <CitizenAccount key={citizen.id} /> : null}
      {org ? <EnglishOnly><OrgAccount key={org.id} /></EnglishOnly> : null}

      {(org || citizen) && !(org && citizen) ? (
        <Section title={org ? t("group.citizen") : t("group.org")}>
          <div className="group">
            {org ? (
              <>
                <Row href="/sign-in?next=/account" lead={<I.Camera className="status-ic info" />} title={t("acc.citizenStart")} />
                <Row href="/sign-up?next=/account" lead={<I.Person className="status-ic info" />} title={t("signup")} />
              </>
            ) : (
              <EnglishOnly>
                <Row href="/sign-in?role=org&next=/account" lead={<I.Shield className="status-ic info" />} title="Sign in as a reviewer or coordinator" />
                <Row href="/sign-up?role=org&next=/account" lead={<I.Building className="status-ic info" />} title="Create an organisation account" />
              </EnglishOnly>
            )}
          </div>
        </Section>
      ) : null}
      {session.demo ? <p className="secondary t-foot">Demo mode is on: the demo accounts can also be opened without a password.</p> : null}
    </Page>
  );
}
