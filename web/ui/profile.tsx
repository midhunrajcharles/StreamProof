"use client";
// Profile pieces shared by citizens and reviewers: avatar, profile card, stars and badges, edit sheet.
import { useState } from "react";
import { api, ApiError, AVATARS, type Avatar as AvatarColour, type Recognition } from "./api";
import { CityPicker } from "./city";
import { Avatar } from "./avatar";
import { useI18n } from "./i18n";
import * as I from "./icons";
import { Sheet, useApp } from "./kit";

export { Avatar } from "./avatar";

/** Level floors, mirrored from app/recognition.py LEVELS. */
const FLOORS: Record<string, number> = { newcomer: 0, observer: 1, contributor: 3, "stream-keeper": 10, "river-guardian": 25 };

// Reviewer screens are English-only, so their rule and badge names live here rather than in i18n.
const REVIEWER_TEXT: Record<string, string> = {
  "rule.explained-verification": "Verifications with a note for the citizen",
  "rule.explained-rejection": "Explained why a report wasn't confirmed",
  "rule.mission-opened": "Field missions opened",
  "badge.first-decision": "First decision", "badge.first-decision.d": "Verified or declined a report",
  "badge.ten-decisions": "Ten decisions", "badge.ten-decisions.d": "Ten reports verified or declined",
  "badge.mission-opener": "Mission opener", "badge.mission-opener.d": "Asked citizens for more evidence",
  "badge.kind-reviewer": "Kind reviewer", "badge.kind-reviewer.d": "Told a citizen why a report wasn't confirmed",
  fair: "Stars come from decisions that explain themselves to the citizen, not from speed or volume. There is no ranking between reviewers.",
};

export function useStarText(kind: "citizen" | "reviewer") {
  const { t } = useI18n();
  const text = (key: string) => (kind === "reviewer" && REVIEWER_TEXT[key] ? REVIEWER_TEXT[key] : t(`rec.${key}`));
  const stars = (n: number) => (n === 1 ? t("rec.one") : t("rec.n", { n }));
  return { text, stars, level: (l: string) => t(`rec.level.${l}`) };
}

export function StarPill({ n }: { n: number }) {
  const { stars } = useStarText("citizen");
  return <span className="pill star-pill"><I.StarFill /> <span className="num">{n}</span><span className="sr-only">{stars(n)}</span></span>;
}

/** Stars, level, progress, how they were earned and the badges. No ranking, no penalties. */
export function Stars({ rec, kind }: { rec: Recognition; kind: "citizen" | "reviewer" }) {
  const { t } = useI18n();
  const { text, stars, level } = useStarText(kind);
  const floor = FLOORS[rec.level] ?? 0;
  const nextFloor = rec.next_level ? FLOORS[rec.next_level] : floor;
  const pct = rec.next_level ? Math.round(((rec.stars - floor) / Math.max(1, nextFloor - floor)) * 100) : 100;
  const earned = rec.badges.filter((b) => b.earned).length;
  return (
    <div className="stack-l">
      <div className="card stars-card">
        <div className="stars-big" aria-hidden><I.StarFill /><span className="num">{rec.stars}</span></div>
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
          <p className="t-title3" style={{ margin: 0 }}>{level(rec.level)}</p>
          <p className="secondary t-sub" style={{ margin: 0 }}>
            <span className="sr-only">{stars(rec.stars)}. </span>
            {rec.next_level ? t("rec.toNext", { n: rec.stars_to_next, level: level(rec.next_level) }) : t("rec.top")}
          </p>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            aria-label={rec.next_level ? t("rec.toNext", { n: rec.stars_to_next, level: level(rec.next_level) }) : t("rec.top")}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3 className="t-headline" style={{ margin: "0 4px" }}>{t("rec.how")}</h3>
        <div className="group">
          {rec.breakdown.map((b) => (
            <div key={b.rule} className="row">
              <div className="row-body"><span className="row-title">{text(`rule.${b.rule}`)}</span></div>
              <span className="row-trail num star-gain" aria-label={stars(b.stars)}>+{b.stars} <I.StarFill width={14} height={14} /></span>
            </div>
          ))}
        </div>
        <p className="section-foot" style={{ margin: "0 4px" }}>{kind === "reviewer" ? REVIEWER_TEXT.fair : t("rec.fair")}</p>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3 className="t-headline" style={{ margin: "0 4px" }}>{t("rec.badges")} <span className="secondary num t-sub">{earned}/{rec.badges.length}</span></h3>
        <ul className="badges" role="list">
          {rec.badges.map((b) => (
            <li key={b.code} className={`badge-tile${b.earned ? " earned" : ""}`}>
              <span className="badge-ic" aria-hidden>{b.earned ? <I.Seal /> : <I.Star />}</span>
              <span className="badge-name">{text(`badge.${b.code}`)}</span>
              <span className="badge-desc">{text(`badge.${b.code}.d`)}</span>
              <span className={`pill${b.earned ? " ok" : ""}`}>{b.earned ? <><I.Check /> {t("rec.earned")}</> : t("rec.locked")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The header card: avatar, name, a line of context, bio, stars and an Edit button. */
export function ProfileCard({ name, colour, lines, bio, stars, onEdit }: { name: string; colour?: AvatarColour; lines: React.ReactNode[]; bio?: string; stars?: number; onEdit?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card profile-card">
      <Avatar name={name} colour={colour} size={72} />
      <div className="stack" style={{ gap: 4, minWidth: 0, flex: 1 }}>
        <div className="spread" style={{ alignItems: "flex-start", gap: 8 }}>
          <h2 className="t-title2" style={{ margin: 0, overflowWrap: "anywhere" }}>{name}</h2>
          {stars !== undefined ? <StarPill n={stars} /> : null}
        </div>
        {lines.filter(Boolean).map((l, i) => <p key={i} className="secondary t-sub" style={{ margin: 0 }}>{l}</p>)}
        {bio ? <p className="profile-bio">{bio}</p> : null}
        {onEdit ? <div><button type="button" className="btn btn-sm" onClick={onEdit}><I.Pencil /> {t("acc.edit")}</button></div> : null}
      </div>
    </div>
  );
}

type EditValues = { name: string; title?: string; bio: string; city?: string; avatar: AvatarColour };

/** Edit sheet for either role. `fields` decides which inputs show. */
export function EditProfile({ open, onClose, initial, fields, save }: {
  open: boolean; onClose: () => void; initial: EditValues; fields: { title?: boolean; bio?: boolean; city?: boolean };
  save: (v: EditValues) => Promise<void>;
}) {
  const { t } = useI18n();
  const { toast } = useApp();
  const [v, setV] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(open);
  if (open !== seen) { setSeen(open); if (open) { setV(initial); setError(""); } } // fresh values each time it opens
  const left = 280 - v.bio.length;
  return (
    <Sheet open={open} onClose={onClose} title={t("acc.edit")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try { await save(v); toast(t("acc.saved")); onClose(); }
        catch (err) { setError((err as ApiError).message); }
        finally { setBusy(false); }
      }}>
        <div className="profile-preview"><Avatar name={v.name || "?"} colour={v.avatar} size={64} /></div>
        <div className="field"><label className="field-label" htmlFor="pf-name">{t("acc.name")}</label>
          <input id="pf-name" className="input" required maxLength={fields.title ? 80 : 40} autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        {fields.title ? (
          <div className="field"><label className="field-label" htmlFor="pf-title">{t("acc.role")}</label>
            <input id="pf-title" className="input" maxLength={80} autoComplete="organization-title" value={v.title ?? ""} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
        ) : null}
        {fields.bio ? (
          <div className="field"><label className="field-label" htmlFor="pf-bio">{t("acc.bio")}</label>
            <textarea id="pf-bio" className="textarea" maxLength={280} placeholder={t("acc.bioPh")} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} aria-describedby="pf-bio-left" />
            <p id="pf-bio-left" className="field-help" aria-live="polite">{t("acc.left", { n: left })}</p></div>
        ) : null}
        {fields.city ? <CityPicker label={t("su.city")} value={v.city ?? ""} onChange={(c) => setV({ ...v, city: c.city })} /> : null}
        <div className="field"><span className="field-label" id="pf-colour">{t("acc.colour")}</span>
          <div className="swatches" role="radiogroup" aria-labelledby="pf-colour">
            {AVATARS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={v.avatar === c} aria-label={c} className="swatch" data-c={c} onClick={() => setV({ ...v, avatar: c })}>
                {v.avatar === c ? <I.Check /> : null}
              </button>
            ))}
          </div></div>
        {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
        <button className="btn btn-prominent btn-large btn-block" disabled={busy || !v.name.trim() || left < 0}>{busy ? <I.Spinner /> : null} {t("acc.save")}</button>
      </form>
    </Sheet>
  );
}

/** Change-password sheet for either role (`path` is the API endpoint). */
export function ChangePassword({ path }: { path: string }) {
  const { t } = useI18n();
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className="row has-lead" onClick={() => setOpen(true)}>
        <div className="row-lead"><I.Key className="status-ic info" /></div>
        <div className="row-body"><span className="row-title">{t("acc.changePw")}</span></div>
        <div className="row-trail"><I.ChevronRight className="chev" /></div>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("acc.changePw")}>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(path, { form: { current, new: next } });
            toast(t("acc.pwDone"));
            setOpen(false); setCurrent(""); setNext("");
          } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
        }}>
          <input type="text" autoComplete="username" hidden readOnly />
          <div className="field"><label className="field-label" htmlFor="pw-cur">{t("acc.pwCur")}</label>
            <input id="pw-cur" className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="field"><label className="field-label" htmlFor="pw-new">{t("acc.pwNew")}</label>
            <input id="pw-new" className="input" type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-help" />
            <p id="pw-help" className="field-help">{t("su.pwHelp")}</p></div>
          {error ? <p className="field-error" role="alert"><I.Warn width={18} height={18} /> {error}</p> : null}
          <button className="btn btn-prominent btn-large btn-block" disabled={busy || next.length < 10}>{busy ? <I.Spinner /> : null} {t("acc.changePw")}</button>
        </form>
      </Sheet>
    </>
  );
}

/** Signing out is per role: the citizen and the organisation account are separate. A citizen without
 *  an account is warned first, because their pseudonym can't be recovered after signing out. */
export function SignOut({ role, variant = "row", after }: { role: "citizen" | "org"; variant?: "row" | "icon"; after?: () => void }) {
  const { session, refreshSession, toast } = useApp();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const citizen = session?.citizen;
  const label = role === "org" ? "Sign out of the organisation account" : t("acc.signOutCitizen");
  const go = async () => {
    await api(role === "org" ? "/auth/logout" : "/citizen/logout", { method: "POST" });
    await refreshSession();
    setOpen(false);
    toast(t("signout"), "info");
    after?.();
  };
  const ask = role === "citizen" ? () => setOpen(true) : go;
  return (
    <>
      {variant === "icon" ? (
        <button type="button" className="btn btn-sm btn-icon" onClick={ask} aria-label={label} title={label}><I.Exit /></button>
      ) : (
        <button type="button" className="row has-lead" onClick={ask} style={{ color: "var(--bad)" }}>
          <div className="row-lead"><I.Exit /></div>
          <div className="row-body"><span className="row-title">{label}</span></div>
        </button>
      )}
      {role === "citizen" ? (
        <Sheet open={open} onClose={() => setOpen(false)} title={t("signout")}>
          <div className="stack">
            <p>{citizen?.demo ? t("acc.outDemo") : citizen?.account ? t("acc.outAccount") : t("acc.outAnon")}</p>
            {!citizen?.demo && !citizen?.account ? <a className="btn btn-block" href="/sign-up?next=/account"><I.Person /> {t("signup")}</a> : null}
            <button type="button" className="btn btn-block btn-prominent btn-destructive" onClick={go}>{t("signout")}</button>
            <button type="button" className="btn btn-block" onClick={() => setOpen(false)}>{t("acc.stay")}</button>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
