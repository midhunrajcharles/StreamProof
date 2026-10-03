"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useApi, when, type Report } from "@/ui/api";
import { History, PhotoView } from "@/ui/evidence";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Gate, Grade, Ladder, Page, Reasons, Row, ScoreMeter, Section, Skeleton, useApp } from "@/ui/kit";

function ReportCard() {
  const { id } = useParams<{ id: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const q = useApi<Report>(`/reports/${id}`);
  const { toast } = useApp();
  const { t, tr, sign, rung, lang } = useI18n();
  const loc = localeOf(lang);

  return (
    <Page title={t("card.title", { id })} eyebrow={t("card.eyebrow")} back={{ href: "/reports", label: t("nav.long.reports") }}
      actions={q.data?.shareable ? (
        <button className="btn btn-sm" onClick={async () => {
          const url = `${location.origin}/share/${id}`;
          try {
            if (navigator.share) await navigator.share({ title: "StreamProof", text: t("card.shareText"), url });
            else { await navigator.clipboard.writeText(url); toast(t("card.copied")); }
          } catch { /* share sheet dismissed */ }
        }}><I.Share /> <span className="btn-label">{t("card.share")}</span></button>
      ) : undefined}>
      <Gate q={q} skeleton={<Skeleton n={4} h={110} />}>
        {(r) => (
          <>
            {isNew ? (
              <div className="section"><Callout kind="ok" title={t("card.sent")}>{t("card.sentText")}</Callout></div>
            ) : null}

            <div className="card section stack-l">
              <div className="hstack" style={{ gap: 18, alignItems: "center" }}>
                <Grade g={r.grade} size="lg" />
                <div className="stack" style={{ gap: 4 }}>
                  <p className="eyebrow">({t("card.gradeLabel")})</p>
                  <h2 className="t-title1">{r.grade ? t(`grade.${r.grade}`) : t("card.notGraded")}</h2>
                  <p className="secondary">{r.signs.map((s) => sign(s.code, s.chip)).join(", ")}</p>
                </div>
              </div>
              <ScoreMeter score={r.score} />
              <div className="stack" style={{ gap: 10 }}>
                <div className="spread"><span className="t-headline">{tr(r.status)}</span><span className="secondary t-sub">{rung(r.rung.value, r.rung.label)}</span></div>
                <Ladder rung={r.rung} />
              </div>
              <p className="secondary t-foot">{t("card.gradeNote")}</p>
            </div>

            {r.rejection ? <div className="section"><Callout kind="warn" title={t("card.notConfirmed")}>{r.rejection}</Callout></div> : null}
            {r.safety ? <div className="section"><Callout kind="bad" title={t("card.safe")}>{tr(r.safety)}</Callout></div> : null}
            {r.hint ? <div className="section"><Callout kind="info" title={t("card.strengthen")}>{tr(r.hint)}</Callout></div> : null}

            <Section title={t("card.why")} n={1} foot={t("card.whyFoot")}>
              <Reasons reasons={r.reasons} />
            </Section>

            <div className="grid-2 section">
              <div className="stack">
                <PhotoView r={r} />
              </div>
              <div className="card stack" style={{ alignContent: "start" }}>
                <dl className="kv">
                  <dt>{t("card.reported")}</dt><dd>{when(r.created_at, { dateStyle: "medium", timeStyle: "short" }, loc)}</dd>
                  <dt>{t("card.place")}</dt><dd>{tr(r.place)}</dd>
                  <dt>{t("card.area")}</dt><dd className="num">{r.position.lat.toFixed(3)}, {r.position.lon.toFixed(3)} <span className="secondary">{t("card.about100")}</span></dd>
                  {r.description ? <><dt>{t("card.yourNote")}</dt><dd>“{r.description}”</dd></> : null}
                  {r.mission_id ? <><dt>{t("card.mission")}</dt><dd><Link href={`/missions/${r.mission_id}`}>{r.mission_id}</Link></dd></> : null}
                </dl>
              </div>
            </div>

            <Section title={t("card.uses")} n={2} foot={t("card.usesFoot")}>
              {r.uses.length ? (
                <div className="group">
                  {r.uses.map((u) => <Row key={u.code} lead={<I.CheckCircle className="status-ic ok" />} title={t(`use.${u.code}`)} chevron={false} />)}
                </div>
              ) : <div className="card secondary">{t("card.recordOnly")}</div>}
            </Section>

            <Section title={t("card.signed")} n={3}>
              {r.certificate ? (
                <div className="card stack">
                  <div className="hstack"><I.Seal width={28} height={28} /><div><p className="t-headline">{t("card.signedTitle")}</p>
                    <p className="secondary t-sub">{t("card.signedText", { date: when(r.certificate.issued, { dateStyle: "medium" }, loc) })}</p></div></div>
                  <div className="btn-row">
                    <a className="btn btn-prominent" href={`/api/reports/${r.id}/certificate.pdf`} target="_blank" rel="noopener"><I.Download /> {t("card.pdf")}</a>
                    <Link className="btn" href={`/verify/${r.id}`}><I.Shield /> {t("card.check")}</Link>
                  </div>
                </div>
              ) : (
                <div className="card secondary">{t("card.noCert")}</div>
              )}
            </Section>

            <Section title={t("card.history")} n={4}><History r={r} /></Section>
          </>
        )}
      </Gate>
    </Page>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="page"><Skeleton n={3} h={120} /></div>}><ReportCard /></Suspense>;
}
