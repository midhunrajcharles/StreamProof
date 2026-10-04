"use client";
import Link from "next/link";
import { useApi, type Mission } from "@/ui/api";
import { useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Callout, Empty, Gate, Page, Row, Section, Skeleton } from "@/ui/kit";

type Measure = { id: string; title: string; group: string; line: string; page: number; what: string | null; limits: string | null; caution: string | null };

type Brief = {
  generated: string; area: string; window_days: number; total: number;
  counts: { label: string; count: number }[];
  rows: { sign: string; code: string; place: string; best_grade: string; confidence: string; label: string; reports: number; people: number; gaps: string[]; why: string }[];
  advisories: { sign: string; place: string; why: string; text: string }[];
  measures: { code: string; sign: string; measures: Measure[]; cautions: Measure[]; notes: { text: string; page: number }[]; inferred: string | null; first_response: string[] }[];
  catalogue: { source: { short: string; title: string; authors: string; year: number; doi: string; url: string; licence: string }; about: { text: string; page: number } };
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

export default function BriefPage() {
  const q = useApi<Brief>("/brief");
  const { tx, tr, sign } = useI18n();
  const conf = (c: string) => tx("{c} confidence", { c: tx(c) });
  return (
    <Page title={tx("River Health Brief")} eyebrow={tx("Organisation")} width="wide"
      subtitle={q.data ? tx("{area} · generated {at} UTC · last {d} days", { area: tr(q.data.area), at: q.data.generated, d: q.data.window_days }) : null}
      actions={<button className="btn btn-sm no-print" onClick={() => window.print()}><I.Printer /> <span className="btn-label">{tx("Print")}</span></button>}>
      <Gate q={q} skeleton={<Skeleton n={4} h={100} />}>
        {(b) => {
          const shown = b.counts.filter((c) => c.count > 0);
          const signsInPlay = new Set(b.rows.map((r) => r.code));
          return (
            <>
              <Section title={tx("Advisories")} n={1} foot={tx("Only decision-grade evidence of a health-relevant sign can raise an advisory. Advisory only: not a diagnosis.")}>
                {b.advisories.length ? (
                  <div className="stack">
                    {b.advisories.map((a, i) => (
                      <Callout key={i} kind="bad" title={`${tr(a.sign)} · ${tr(a.place)}`}>
                        <p>{tr(a.text)}</p>
                        <p className="t-foot" style={{ marginTop: 6, opacity: 0.85 }}>{tr(a.why)}</p>
                      </Callout>
                    ))}
                  </div>
                ) : <div className="card secondary">{tx("No advisories. Nothing has reached decision grade for a health-relevant sign.")}</div>}
              </Section>

              <Section title={tx("Evidence by trust level")} n={2} foot={tx("{n} reports in total.", { n: b.total })}>
                <div className="card stack">
                  <div className="stack-bar" role="img" aria-label={shown.map((c) => `${tx(c.label)}: ${c.count}`).join(", ")}>
                    {shown.map((c) => <span key={c.label} style={{ flex: c.count, background: SHADES[c.label] }} />)}
                  </div>
                  <div className="legend">
                    {shown.map((c) => <span key={c.label}><i style={{ background: SHADES[c.label] }} />{tx(c.label)} <b className="num" style={{ color: "var(--label)", fontWeight: 500 }}>{c.count}</b></span>)}
                  </div>
                </div>
              </Section>

              <Section title={tx("Signals")} n={3} foot={tr(b.threshold)}>
                {b.rows.length ? (<>
                  <div className="group only-compact">
                    {b.rows.map((r, i) => (
                      <div key={i} className="row has-lead" style={{ alignItems: "flex-start" }}>
                        <div className="row-lead"><span className="grade" data-g={r.best_grade}>{r.best_grade}</span></div>
                        <div className="row-body">
                          <span className="row-title">{sign(r.code, r.sign)}</span>
                          <span className="row-sub">{tr(r.place)} · {r.people === 1 ? tx("1 person") : tx("{n} people", { n: r.people })}</span>
                          <span style={{ marginTop: 4 }}><span className={`pill ${LABEL_KIND[r.label] ?? ""}`}>{tx(r.label)}</span> <span className="secondary t-foot">{conf(r.confidence)}</span></span>
                          <span className="row-sub t-foot">{tr(r.gaps[0] ?? r.why)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="table-wrap only-regular">
                    <table className="table">
                      <thead><tr><th scope="col">{tx("Sign")}</th><th scope="col">{tx("Where")}</th><th scope="col">{tx("Status")}</th><th scope="col" className="c">{tx("Best grade")}</th><th scope="col" className="c">{tx("People")}</th><th scope="col">{tx("What's missing")}</th></tr></thead>
                      <tbody>
                        {b.rows.map((r, i) => (
                          <tr key={i}>
                            <th scope="row" style={{ fontWeight: 500 }}>{sign(r.code, r.sign)}</th>
                            <td>{tr(r.place)}</td>
                            <td><span className={`pill ${LABEL_KIND[r.label] ?? ""}`}>{tx(r.label)}</span><div className="secondary t-foot" style={{ marginTop: 4 }}>{conf(r.confidence)}</div></td>
                            <td className="c"><span className="grade" data-g={r.best_grade} style={{ margin: "0 auto" }}>{r.best_grade}</span></td>
                            <td className="c num">{r.people}</td>
                            <td className="secondary">{r.gaps[0] ? tr(r.gaps[0]) : (r.why ? tr(r.why) : "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>) : <div className="card"><Empty title={tx("No signals yet")}>{tx("Signals appear once assessed reports of the same sign cluster nearby.")}</Empty></div>}
              </Section>

              <Section title={tx("Suggested next steps")} n={4}
                foot={tx("Matched from the {name} ({authors}, {year}; {licence}). The final choice belongs to the DSS and the municipality.", { name: b.catalogue.source.short, authors: b.catalogue.source.authors, year: b.catalogue.source.year, licence: b.catalogue.source.licence })}>
                <div className="grid-2">
                  {b.measures.filter((m) => signsInPlay.has(m.code)).map((m) => (
                    <div key={m.code} className="card stack" style={{ gap: 10 }}>
                      <p className="t-headline">{sign(m.code, m.sign)}</p>
                      {m.inferred ? <p className="secondary t-foot">{tr(m.inferred)}</p> : null}
                      {m.measures.map((x) => (
                        <div key={x.id} className="stack" style={{ gap: 2 }}>
                          <p className="t-callout" style={{ fontWeight: 500 }}>
                            {tr(x.title)} <span className="secondary t-foot num">§{x.id} · {tx("p. {n}", { n: x.page })} · {tx("{line} line", { line: tx(x.line) })}</span>
                          </p>
                          <p className="t-callout">{tr(x.what ?? "")}</p>
                          {x.limits ? <p className="secondary t-foot">{tx("Limits:")} {tr(x.limits)}</p> : null}
                        </div>
                      ))}
                      {m.cautions.length ? (
                        <Callout kind="warn" title={tx("Catalogue caution")}>
                          <p>{tx("Some measures that hold water can themselves breed mosquitoes if not drained:")}</p>
                          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                            {m.cautions.map((c) => <li key={c.id}>{tr(c.title)} <span className="num">(§{c.id}, {tx("p. {n}", { n: c.page })})</span>: {tr(c.caution ?? "")}</li>)}
                          </ul>
                        </Callout>
                      ) : null}
                      {m.notes.map((n) => <p key={n.text} className="secondary t-foot">{tr(n.text)} <span className="num">({tx("p. {n}", { n: n.page })})</span></p>)}
                      {m.first_response.length ? (
                        <div className="stack" style={{ gap: 2 }}>
                          <p className="secondary t-foot" style={{ fontWeight: 500 }}>{tx("Immediate checks (generic, not from the Catalogue)")}</p>
                          <ul style={{ margin: 0, paddingLeft: 18 }} className="t-callout">{m.first_response.map((x) => <li key={x}>{tr(x)}</li>)}</ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="secondary t-foot" style={{ marginTop: 12 }}>
                  {tx("Source:")} <a href={b.catalogue.source.url} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>{b.catalogue.source.title}</a>, doi:{b.catalogue.source.doi}. {tr(b.catalogue.about.text)} <span className="num">({tx("p. {n}", { n: b.catalogue.about.page })})</span>
                </p>
              </Section>

              <Section title={tx("Open missions")} n={5} foot={tx("Missions ask people nearby for evidence where it's thin, including under-observed reaches.")}>
                {b.missions.length ? (
                  <div className="group">
                    {b.missions.map((m) => <Row key={m.id} href={`/review/${m.report_id}`} lead={<I.Flag className="status-ic info" />}
                      title={`${m.id} · ${m.signs.map((s) => sign(s.code, s.chip)).join(", ")}`}
                      sub={`${tr(m.place)} · ${m.submissions === 1 ? tx("1 answer") : tx("{n} answers", { n: m.submissions })}`} />)}
                  </div>
                ) : <div className="card secondary">{tx("No open missions.")}</div>}
              </Section>

              <p className="secondary t-foot no-print">{tx("Rules behind this brief:")} <Link href="/standards">{tx("Standards and permitted uses")}</Link>.</p>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
