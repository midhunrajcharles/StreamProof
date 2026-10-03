"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ago, api, signsText, useApi, when, type Mission, type Report } from "@/ui/api";
import * as I from "@/ui/icons";
import { Empty, Gate, Grade, Page, Row, Section, Sheet, Skeleton, useApp } from "@/ui/kit";
import { flush, listDrafts, removeDraft, type Draft } from "@/ui/outbox";

type Me = { name: string; reports: Report[]; missions: Mission[]; counts: { reports: number; verified: number; missions: number } };

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
  const [forgetStep, setForgetStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);

  const sendNow = async () => {
    const sent = await flush();
    reloadDrafts();
    if (sent.length) { toast(`${sent.length} report${sent.length > 1 ? "s" : ""} sent`); q.reload(); }
    else if (!navigator.onLine) toast("Still offline. We'll try again automatically.", "info");
  };

  return (
    <Page title="My reports" eyebrow="Citizen" subtitle={q.data ? <>Signed in as {q.data.name} (demo)</> : null}
      actions={<Link href="/report" className="btn btn-sm btn-prominent"><I.Plus /> Report</Link>}>
      <Gate q={q} skeleton={<><Skeleton h={84} /><div style={{ height: 24 }} /><Skeleton n={4} h={60} /></>}>
        {(me) => (
          <>
            <div className="stats section" role="list" aria-label="Summary">
              <div className="stat" role="listitem"><span className="secondary t-sub">Reports</span><span className="stat-n">{me.counts.reports}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">Verified</span><span className="stat-n">{me.counts.verified}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">Under review</span><span className="stat-n">{me.reports.filter((r) => r.rung.level > 0 && r.rung.level < 4).length}</span></div>
              <div className="stat" role="listitem"><span className="secondary t-sub">Missions helped</span><span className="stat-n">{me.counts.missions}</span></div>
            </div>

            {drafts.length ? (
              <Section title="Waiting to send" trail={<button className="btn btn-sm" onClick={sendNow}><I.Refresh /> Send now</button>}
                foot="Saved on this device while you were offline. They're sent automatically when you're back online.">
                <div className="group">
                  {drafts.map((d) => (
                    <div key={d.key} className="row has-lead">
                      <div className="row-lead">{d.error ? <I.Warn className="status-ic warn" /> : <I.Clock className="status-ic info" />}</div>
                      <div className="row-body">
                        <span className="row-title">{d.codes.length} sign{d.codes.length > 1 ? "s" : ""}{d.photo ? " · with photo" : ""}</span>
                        <span className="row-sub">{d.error ? `Couldn't send: ${d.error}` : `Saved ${ago(d.saved_at)}`}</span>
                      </div>
                      <button className="btn btn-sm btn-destructive" aria-label="Delete saved report" onClick={async () => { await removeDraft(d.key); reloadDrafts(); }}><I.Trash /></button>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {me.missions.length ? (
              <Section title="Missions near you" foot="Reviewers ask for more evidence where it's thin. A report saying all is fine counts the same.">
                <div className="group">
                  {me.missions.map((m) => (
                    <Row key={m.id} href={`/missions/${m.id}`} lead={<I.Flag className="status-ic info" />}
                      title={`${signsText(m.signs)} · ${m.place}`} sub={<span className="clamp-2">{m.request}</span>} />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Your reports" trail={<span className="secondary t-sub">{me.reports.length}</span>}>
              {me.reports.length ? (
                <div className="group">
                  {me.reports.map((r) => (
                    <Row key={r.id} href={`/reports/${r.id}`} lead={<Grade g={r.grade} />}
                      title={signsText(r.signs)}
                      sub={<>{r.status} · {when(r.created_at, { day: "numeric", month: "short" })}</>}
                      trail={r.certificate ? <I.Seal width={20} height={20} aria-label="Signed record" /> : null} />
                  ))}
                </div>
              ) : (
                <div className="card"><Empty icon={<I.Camera />} title="No reports yet" action={<Link href="/report" className="btn btn-prominent">Report a stream</Link>}>
                  Your reports and their grades will appear here.
                </Empty></div>
              )}
            </Section>

            <Section title="Privacy" foot="Removes your contact details and exact locations from every report. The de-identified evidence and its signatures stay valid.">
              <div className="group">
                <button type="button" className="row" onClick={() => setForgetStep(1)} style={{ color: "var(--bad)" }}>
                  <div className="row-body"><span className="row-title">Remove my personal data</span></div>
                </button>
              </div>
            </Section>

            <Sheet open={forgetStep > 0} onClose={() => setForgetStep(0)} title="Remove personal data">
              {forgetStep === 1 ? (
                <div className="stack">
                  <p>This removes your contact details and the exact location of your {me.counts.reports} report{me.counts.reports === 1 ? "" : "s"}. You'll be signed out.</p>
                  <p className="secondary t-sub">The reports themselves stay, without anything that identifies you, so their signed records remain valid.</p>
                  <button className="btn btn-block btn-destructive" onClick={() => setForgetStep(2)}>Continue</button>
                </div>
              ) : (
                <div className="stack">
                  <p className="t-headline">Are you sure? This can't be undone.</p>
                  <button className="btn btn-block btn-prominent btn-destructive" disabled={busy} onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api<{ removed_from: number }>("/me/forget", { method: "POST" });
                      toast(`Personal data removed from ${r.removed_from} report${r.removed_from === 1 ? "" : "s"}`);
                      setTimeout(() => window.location.assign("/reports"), 900);
                    } finally { setBusy(false); }
                  }}>{busy ? <I.Spinner /> : <I.Trash />} Remove my personal data</button>
                  <button className="btn btn-block" onClick={() => setForgetStep(0)}>Keep my data</button>
                </div>
              )}
            </Sheet>
          </>
        )}
      </Gate>
    </Page>
  );
}
