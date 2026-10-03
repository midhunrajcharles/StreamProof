"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ago, api, useApi, when, type Mission, type Report } from "@/ui/api";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Empty, Gate, Grade, Page, Row, Section, Sheet, Skeleton, useApp } from "@/ui/kit";
import { flush, listDrafts, removeDraft, type Draft } from "@/ui/outbox";

type Me = { name: string; demo: boolean; reports: Report[]; missions: Mission[]; counts: { reports: number; verified: number; missions: number } };

function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const load = useCallback(() => { listDrafts().then(setDrafts); }, []);
  useEffect(() => {
    load();
    window.addEventListener("outbox-change", load);
    return () => window.removeEventListener("outbox-change", load);
  }, [load]);
  return { drafts, reload: load };
}

export default function MyReports() {
  const q = useApi<Me>("/me");
  const { drafts, reload: reloadDrafts } = useDrafts();
  const { toast } = useApp();
  const { t, tr, sign, lang } = useI18n();
  const loc = localeOf(lang);
  const [forgetStep, setForgetStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const signs = (r: { signs: { code: string; chip: string }[] }) => r.signs.map((s) => sign(s.code, s.chip)).join(", ");

  const sendNow = async () => {
    const sent = await flush();
    reloadDrafts();
    if (sent.length) { toast(t("waiting.sent", { n: sent.length })); q.reload(); }
    else if (!navigator.onLine) toast(t("waiting.still"), "info");
  };

  return (
    <Page title={t("nav.long.reports")} eyebrow={t("report.eyebrow")}
      subtitle={q.data ? <>{t("reports.signedIn", { name: q.data.name })}{q.data.demo ? ` ${t("reports.demo")}` : ""}</> : null}
      actions={<Link href="/report" className="btn btn-sm btn-prominent"><I.Plus /> <span className="btn-label">{t("nav.report")}</span></Link>}>
      <Gate q={q} skeleton={<><Skeleton h={84} /><div style={{ height: 24 }} /><Skeleton n={4} h={60} /></>}>
        {(me) => (
          <>
            <div className="stats section" role="list" aria-label={t("nav.long.reports")}>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.reports")}</span><span className="stat-n">{me.counts.reports}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.verified")}</span><span className="stat-n">{me.counts.verified}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.review")}</span><span className="stat-n">{me.reports.filter((r) => r.rung.level > 0 && r.rung.level < 4).length}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">{t("stats.missions")}</span><span className="stat-n">{me.counts.missions}</span></div>
            </div>

            {drafts.length ? (
              <Section title={t("waiting.title")} trail={<button className="btn btn-sm" onClick={sendNow}><I.Refresh /> {t("waiting.sendNow")}</button>} foot={t("waiting.foot")}>
                <div className="group">
                  {drafts.map((d) => (
                    <div key={d.key} className="row has-lead">
                      <div className="row-lead">{d.error ? <I.Warn className="status-ic warn" /> : <I.Clock className="status-ic info" />}</div>
                      <div className="row-body">
                        <span className="row-title">{t("waiting.signs", { n: d.codes.length })}{d.photo ? ` · ${t("waiting.photo")}` : ""}</span>
                        <span className="row-sub">{d.error ? t("waiting.failed", { err: tr(d.error) }) : t("waiting.saved", { ago: ago(d.saved_at, loc) })}</span>
                      </div>
                      <button className="btn btn-sm btn-destructive" aria-label={t("waiting.delete")} onClick={async () => { await removeDraft(d.key); reloadDrafts(); }}><I.Trash /></button>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {me.missions.length ? (
              <Section title={t("missions.title")} foot={t("missions.foot")}>
                <div className="group">
                  {me.missions.map((m) => (
                    <Row key={m.id} href={`/missions/${m.id}`} lead={<I.Flag className="status-ic info" />}
                      title={`${signs(m)} · ${tr(m.place)}`} sub={<span className="clamp-2">{tr(m.request)}</span>} />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title={t("yours.title")} trail={<span className="secondary t-sub">{me.reports.length}</span>}>
              {me.reports.length ? (
                <div className="group">
                  {me.reports.map((r) => (
                    <Row key={r.id} href={`/reports/${r.id}`} lead={<Grade g={r.grade} />}
                      title={signs(r)}
                      sub={<>{tr(r.status)} · {when(r.created_at, { day: "numeric", month: "short" }, loc)}</>}
                      trail={r.certificate ? <I.Seal width={20} height={20} aria-label={t("card.signed")} /> : null} />
                  ))}
                </div>
              ) : (
                <div className="card"><Empty icon={<I.Camera />} title={t("empty.title")} action={<Link href="/report" className="btn btn-prominent">{t("nav.long.report")}</Link>}>
                  {t("empty.text")}
                </Empty></div>
              )}
            </Section>

            <Section title={t("privacy.title")} foot={t("privacy.foot")}>
              <div className="group">
                <button type="button" className="row" onClick={() => setForgetStep(1)} style={{ color: "var(--bad)" }}>
                  <div className="row-body"><span className="row-title">{t("privacy.remove")}</span></div>
                </button>
              </div>
            </Section>

            <Sheet open={forgetStep > 0} onClose={() => setForgetStep(0)} title={t("privacy.sheet")}>
              {forgetStep === 1 ? (
                <div className="stack">
                  <p>{t("privacy.step1", { n: me.counts.reports })}</p>
                  <p className="secondary t-sub">{t("privacy.step1b")}</p>
                  <button className="btn btn-block btn-destructive" onClick={() => setForgetStep(2)}>{t("privacy.continue")}</button>
                </div>
              ) : (
                <div className="stack">
                  <p className="t-headline">{t("privacy.sure")}</p>
                  <button className="btn btn-block btn-prominent btn-destructive" disabled={busy} onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api<{ removed_from: number }>("/me/forget", { method: "POST" });
                      toast(t("privacy.done", { n: r.removed_from }));
                      setTimeout(() => window.location.assign("/reports"), 900);
                    } finally { setBusy(false); }
                  }}>{busy ? <I.Spinner /> : <I.Trash />} {t("privacy.remove")}</button>
                  <button className="btn btn-block" onClick={() => setForgetStep(0)}>{t("privacy.keep")}</button>
                </div>
              )}
            </Sheet>
          </>
        )}
      </Gate>
    </Page>
  );
}
