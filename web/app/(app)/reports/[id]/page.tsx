"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signsText, useApi, when, type Report } from "@/ui/api";
import * as I from "@/ui/icons";
import { History, PhotoView } from "@/ui/evidence";
import { Callout, Gate, Grade, Ladder, Page, Reasons, Row, ScoreMeter, Section, Skeleton, useApp } from "@/ui/kit";

function ReportCard() {
  const { id } = useParams<{ id: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const q = useApi<Report>(`/reports/${id}`);
  const { toast } = useApp();

  return (
    <Page title={`Report ${id}`} eyebrow="Your report" back={{ href: "/reports", label: "My reports" }}
      actions={q.data?.shareable ? (
        <button className="btn btn-sm" onClick={async () => {
          const url = `${location.origin}/share/${id}`;
          try {
            if (navigator.share) await navigator.share({ title: "StreamProof", text: "A stream report I made", url });
            else { await navigator.clipboard.writeText(url); toast("Share link copied"); }
          } catch { /* share sheet dismissed */ }
        }}><I.Share /> Share</button>
      ) : undefined}>
      <Gate q={q} skeleton={<Skeleton n={4} h={110} />}>
        {(r) => (
          <>
            {isNew ? (
              <div className="section"><Callout kind="ok" title="Report sent">Here's how your evidence was graded, and what happens next.</Callout></div>
            ) : null}

            <div className="card section stack-l">
              <div className="hstack" style={{ gap: 18, alignItems: "center" }}>
                <Grade g={r.grade} size="lg" />
                <div className="stack" style={{ gap: 4 }}>
                  <p className="eyebrow">(Evidence grade)</p>
                  <h2 className="t-title1">{r.grade_words || "Not graded"}</h2>
                  <p className="secondary">{signsText(r.signs)}</p>
                </div>
              </div>
              <ScoreMeter score={r.score} />
              <div className="stack" style={{ gap: 10 }}>
                <div className="spread"><span className="t-headline">{r.status}</span><span className="secondary t-sub">{r.rung.label}</span></div>
                <Ladder rung={r.rung} />
              </div>
              <p className="secondary t-foot">The grade is about how strong the evidence is, not about the stream's ecological status. Formal assessment stays with OneAquaHealth's field protocols.</p>
            </div>

            {r.rejection ? <div className="section"><Callout kind="warn" title="Not confirmed by a reviewer">{r.rejection}</Callout></div> : null}
            {r.safety ? <div className="section"><Callout kind="bad" title="Stay safe">{r.safety}</Callout></div> : null}
            {r.hint ? <div className="section"><Callout kind="info" title="What would strengthen this">{r.hint}</Callout></div> : null}

            <Section title="Why this grade" n={1} foot="Seven readable checks, 100 points. A report without a photo stays at grade C or below.">
              <Reasons reasons={r.reasons} />
            </Section>

            <div className="grid-2 section">
              <div className="stack">
                <PhotoView r={r} />
              </div>
              <div className="card stack" style={{ alignContent: "start" }}>
                <dl className="kv">
                  <dt>Reported</dt><dd>{when(r.created_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
                  <dt>Place</dt><dd>{r.place}</dd>
                  <dt>Public area</dt><dd className="num">{r.position.lat.toFixed(3)}, {r.position.lon.toFixed(3)} <span className="secondary">(about 100 m)</span></dd>
                  {r.description ? <><dt>Your note</dt><dd>“{r.description}”</dd></> : null}
                  {r.mission_id ? <><dt>Mission</dt><dd><Link href={`/missions/${r.mission_id}`}>{r.mission_id}</Link></dd></> : null}
                </dl>
              </div>
            </div>

            <Section title="What it may be used for" n={2} foot="Each trust level unlocks more uses. Every output asks this rule first, and the rule travels with the record.">
              {r.uses.length ? (
                <div className="group">
                  {r.uses.map((u) => <Row key={u.code} lead={<I.CheckCircle className="status-ic ok" />} title={u.label} chevron={false} />)}
                </div>
              ) : <div className="card secondary">Kept for the record only.</div>}
            </Section>

            <Section title="Signed record" n={3}>
              {r.certificate ? (
                <div className="card stack">
                  <div className="hstack"><I.Seal width={28} height={28} /><div><p className="t-headline">Your contribution is signed</p>
                    <p className="secondary t-sub">Issued {when(r.certificate.issued, { dateStyle: "medium" })}. Anyone can check it hasn't been changed.</p></div></div>
                  <div className="btn-row">
                    <a className="btn btn-prominent" href={`/api/reports/${r.id}/certificate.pdf`} target="_blank" rel="noopener"><I.Download /> Certificate (PDF)</a>
                    <Link className="btn" href={`/verify/${r.id}`}><I.Shield /> Check signature</Link>
                  </div>
                </div>
              ) : (
                <div className="card secondary">You'll receive a signed contribution record once an expert verifies this report.</div>
              )}
            </Section>

            <Section title="History" n={4}><History r={r} /></Section>
          </>
        )}
      </Gate>
    </Page>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="page"><Skeleton n={3} h={120} /></div>}><ReportCard /></Suspense>;
}
