"use client";
import Link from "next/link";
import { signsText, useApi, type Mission } from "@/ui/api";
import { EnglishOnly } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Empty, Gate, Page, Row, Section, Skeleton } from "@/ui/kit";

type Brief = {
  generated: string; area: string; window_days: number; total: number;
  counts: { label: string; count: number }[];
  rows: { sign: string; code: string; place: string; best_grade: string; confidence: string; label: string; reports: number; people: number; gaps: string[]; why: string }[];
  advisories: { sign: string; place: string; why: string; text: string }[];
  measures: { code: string; sign: string; measures: string[] }[];
  missions: Mission[];
  threshold: string;
};

// greys from light to dark: the trust levels, in order (colour is never the only cue: see the legend and table)
const SHADES: Record<string, string> = {
  "Report": "var(--fill-strong)", "Assessed": "color-mix(in srgb, var(--label) 30%, transparent)",
  "Community-supported": "color-mix(in srgb, var(--label) 50%, transparent)", "Expert-verified": "color-mix(in srgb, var(--label) 72%, transparent)",
  "Decision-grade": "var(--label)", "Not confirmed": "color-mix(in srgb, var(--bad) 55%, transparent)",
};

const LABEL_KIND: Record<string, string> = { "Decision-grade": "ok", "Expert-verified": "ok", "Community-supported": "", "Unverified": "warn" };

function BriefPage() {
  const q = useApi<Brief>("/brief");
  return (
    <Page title="River Health Brief" eyebrow="Organisation" width="wide"
      subtitle={q.data ? <>{q.data.area} · generated {q.data.generated} UTC · last {q.data.window_days} days</> : null}
      actions={<button className="btn btn-sm no-print" onClick={() => window.print()}><I.Printer /> <span className="btn-label">Print</span></button>}>
      <Gate q={q} skeleton={<Skeleton n={4} h={100} />}>
        {(b) => {
          const shown = b.counts.filter((c) => c.count > 0);
          const signsInPlay = new Set(b.rows.map((r) => r.code));
          return (
            <>
              <Section title="Advisories" n={1} foot="Only decision-grade evidence of a health-relevant sign can raise an advisory. Advisory only: not a diagnosis.">
                {b.advisories.length ? (
                  <div className="stack">
                    {b.advisories.map((a, i) => (
                      <Callout key={i} kind="bad" title={`${a.sign} · ${a.place}`}>
                        <p>{a.text}</p>
                        <p className="t-foot" style={{ marginTop: 6, opacity: 0.85 }}>{a.why}</p>
                      </Callout>
                    ))}
                  </div>
                ) : <div className="card secondary">No advisories. Nothing has reached decision grade for a health-relevant sign.</div>}
              </Section>

              <Section title="Evidence by trust level" n={2} foot={`${b.total} reports in total.`}>
                <div className="card stack">
                  <div className="stack-bar" role="img" aria-label={shown.map((c) => `${c.label}: ${c.count}`).join(", ")}>
                    {shown.map((c) => <span key={c.label} style={{ flex: c.count, background: SHADES[c.label] }} />)}
                  </div>
                  <div className="legend">
                    {shown.map((c) => <span key={c.label}><i style={{ background: SHADES[c.label] }} />{c.label} <b className="num" style={{ color: "var(--label)", fontWeight: 500 }}>{c.count}</b></span>)}
                  </div>
                </div>
              </Section>

              <Section title="Signals" n={3} foot={b.threshold}>
                {b.rows.length ? (<>
                  <div className="group only-compact">
                    {b.rows.map((r, i) => (
                      <div key={i} className="row has-lead" style={{ alignItems: "flex-start" }}>
                        <div className="row-lead"><span className="grade" data-g={r.best_grade}>{r.best_grade}</span></div>
                        <div className="row-body">
                          <span className="row-title">{r.sign}</span>
                          <span className="row-sub">{r.place} · {r.people} {r.people === 1 ? "person" : "people"}</span>
                          <span style={{ marginTop: 4 }}><span className={`pill ${LABEL_KIND[r.label] ?? ""}`}>{r.label}</span> <span className="secondary t-foot">{r.confidence} confidence</span></span>
                          <span className="row-sub t-foot">{r.gaps[0] ?? r.why}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="table-wrap only-regular">
                    <table className="table">
                      <thead><tr><th scope="col">Sign</th><th scope="col">Where</th><th scope="col">Status</th><th scope="col" className="c">Best grade</th><th scope="col" className="c">People</th><th scope="col">What's missing</th></tr></thead>
                      <tbody>
                        {b.rows.map((r, i) => (
                          <tr key={i}>
                            <th scope="row" style={{ fontWeight: 500 }}>{r.sign}</th>
                            <td>{r.place}</td>
                            <td><span className={`pill ${LABEL_KIND[r.label] ?? ""}`}>{r.label}</span><div className="secondary t-foot" style={{ marginTop: 4 }}>{r.confidence} confidence</div></td>
                            <td className="c"><span className="grade" data-g={r.best_grade} style={{ margin: "0 auto" }}>{r.best_grade}</span></td>
                            <td className="c num">{r.people}</td>
                            <td className="secondary">{r.gaps[0] ?? (r.why || "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>) : <div className="card"><Empty title="No signals yet">Signals appear once assessed reports of the same sign cluster nearby.</Empty></div>}
              </Section>

              <Section title="Suggested next steps" n={4} foot="Illustrative placeholders, to be replaced by matched entries from the OneAquaHealth Catalogue of Measures. The final choice belongs to the DSS and the municipality.">
                <div className="grid-2">
                  {b.measures.filter((m) => signsInPlay.has(m.code)).map((m) => (
                    <div key={m.code} className="card stack" style={{ gap: 8 }}>
                      <p className="t-headline">{m.sign}</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }} className="t-callout">{m.measures.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Open missions" n={5} foot="Missions ask people nearby for evidence where it's thin, including under-observed reaches.">
                {b.missions.length ? (
                  <div className="group">
                    {b.missions.map((m) => <Row key={m.id} href={`/review/${m.report_id}`} lead={<I.Flag className="status-ic info" />} title={`${m.id} · ${signsText(m.signs)}`} sub={`${m.place} · ${m.submissions} answer${m.submissions === 1 ? "" : "s"}`} />)}
                  </div>
                ) : <div className="card secondary">No open missions.</div>}
              </Section>

              <p className="secondary t-foot no-print">Rules behind this brief: <Link href="/standards">Standards and permitted uses</Link>.</p>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}

// reviewer screens stay in English
export default function BriefPagePage() {
  return <EnglishOnly><BriefPage /></EnglishOnly>;
}
