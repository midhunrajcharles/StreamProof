"use client";
import Link from "next/link";
import { ago, useApi, type Mission, type OrgProfile, type Report } from "@/ui/api";
import { localeOf, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Empty, Gate, Grade, Page, Row, Section, Skeleton, useApp } from "@/ui/kit";
import { Avatar, StarPill, useStarText } from "@/ui/profile";

type Signal = { sign: string; reports: number; expert: number; community: number; decision_grade: boolean; place: string; gaps: string[] };
type Queue = { todo: Report[]; done: Report[]; missions: Mission[]; signals: Signal[] };
type GroundTruth = {
  rows: { report_id: string; site_id: string; stream: string; date: string; diptera: "present" | "not_seen"; evidence_grade: string }[];
  summary: { present: number; not_seen: number; excluded: { not_verified: number; not_about_diptera: number } };
  needs: string;
};

/** The organisation's dashboard: what's waiting, signals, missions, you. */
export default function Dashboard() {
  const { session } = useApp();
  const { tx, tr, sign, rung, lang } = useI18n();
  const loc = localeOf(lang);
  const q = useApi<Queue>("/queue");
  const me = useApi<OrgProfile>(q.data ? "/org/profile" : null);
  const gt = useApi<GroundTruth>(q.data ? "/export/diptera-ground-truth" : null);
  const { level } = useStarText("reviewer");
  const org = session?.org;
  const signs = (s: { code: string; chip: string }[]) => s.map((x) => sign(x.code, x.chip)).join(", ");
  return (
    <Page title={org?.org_name ?? tx("Dashboard")} eyebrow={org?.city ? `${tx("Organisation")} · ${org.city}` : tx("Organisation")} width="wide"
      actions={<Link href="/review" className="btn btn-sm btn-prominent"><I.Shield /> <span className="btn-label">{tx("Review queue")}</span></Link>}>
      <Gate q={q} skeleton={<Skeleton n={3} h={96} />}>
        {(d) => {
          const open = d.missions.filter((m) => m.status === "open");
          const decision = d.signals.filter((s) => s.decision_grade);
          return (
            <>
              <div className="stats section" role="list" aria-label={tx("Overview")}>
                <div role="listitem" className="stat-wrap"><Link href="/review" className="stat"><span className="secondary t-sub">{tx("To review")}</span><span className="stat-n">{d.todo.length}</span></Link></div>
                <div className="stat" role="listitem"><span className="secondary t-sub">{tx("Decided")}</span><span className="stat-n">{d.done.length}</span></div>
                <div role="listitem" className="stat-wrap"><Link href="/brief" className="stat"><span className="secondary t-sub">{tx("Decision-grade signals")}</span><span className="stat-n">{decision.length}</span></Link></div>
                <div className="stat" role="listitem"><span className="secondary t-sub">{tx("Open missions")}</span><span className="stat-n">{open.length}</span></div>
              </div>

              <div className="dash-grid">
                <Section title={tx("Next up")} trail={d.todo.length ? <Link className="btn btn-sm" href="/review">{tx("Open queue")}</Link> : null}
                  foot={tx("Ordered by health relevance first, then age.")}>
                  {d.todo.length ? (
                    <div className="group">
                      {d.todo.slice(0, 5).map((r) => (
                        <Row key={r.id} href={`/review/${r.id}`} lead={<Grade g={r.grade} />} title={signs(r.signs)}
                          sub={`${tr(r.place)} · ${rung(r.rung.value, r.rung.label)} · ${ago(r.created_at, loc)}`} />
                      ))}
                    </div>
                  ) : <div className="card"><Empty icon={<I.CheckCircle />} title={tx("Nothing waiting")}>{tx("New reports from {city} will appear here.", { city: org?.city ?? tx("your city") })}</Empty></div>}
                </Section>

                <Section title={tx("Signals")} trail={<Link className="btn btn-sm" href="/brief">{tx("River Health Brief")}</Link>}
                  foot={tx("A signal is the same sign reported by different people nearby within 14 days.")}>
                  {d.signals.length ? (
                    <div className="group">
                      {d.signals.slice(0, 5).map((s, i) => (
                        <div key={i} className="row has-lead">
                          <div className="row-lead">{s.decision_grade ? <I.CheckCircle className="status-ic ok" /> : <I.Info className="status-ic info" />}</div>
                          <div className="row-body">
                            <span className="row-title">{tr(s.sign)} · {tr(s.place)}</span>
                            <span className="row-sub">{s.reports === 1 ? tx("1 report") : tx("{n} reports", { n: s.reports })} · {tx("{n} expert-verified", { n: s.expert })}{s.gaps.length ? ` · ${tr(s.gaps[0])}` : ""}</span>
                          </div>
                          {s.decision_grade ? <span className="pill ok"><I.Check /> {rung("decision-grade", "Decision-grade")}</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : <div className="card secondary">{tx("No signals yet.")}</div>}
                </Section>
              </div>

              <Section title={tx("Ground truth for DipteraCAST")}
                foot={tx("Only {level} records leave, each checked by the permitted-use gate. A verified all-clear is a visual check, so it is exported as “not seen”, never “absent”. No observer is named.", { level: tx(gt.data?.needs ?? "Expert-verified") })}>
                {gt.data ? (
                  <div className="card stack">
                    <div className="stats" role="list" aria-label={tx("Ground truth")}>
                      <div className="stat" role="listitem"><span className="secondary t-sub">{tx("Present")}</span><span className="stat-n">{gt.data.summary.present}</span></div>
                      <div className="stat" role="listitem"><span className="secondary t-sub">{tx("Not seen")}</span><span className="stat-n">{gt.data.summary.not_seen}</span></div>
                      <div className="stat" role="listitem"><span className="secondary t-sub">{tx("Held back")}</span><span className="stat-n">{gt.data.summary.excluded.not_verified + gt.data.summary.excluded.not_about_diptera}</span></div>
                    </div>
                    <div className="row-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a className="btn" href="/api/export/diptera-ground-truth?format=csv" download><I.Braces /> <span className="btn-label">{tx("Download CSV")}</span></a>
                      <a className="btn" href="/api/export/diptera-ground-truth?format=fhir" download><I.Braces /> <span className="btn-label">{tx("Download FHIR bundle")}</span></a>
                    </div>
                  </div>
                ) : <Skeleton h={120} />}
              </Section>

              <div className="dash-grid">
                <Section title={tx("Open missions")} foot={tx("Missions ask citizens near a report for more evidence, upstream first.")}>
                  {open.length ? (
                    <div className="group">
                      {open.slice(0, 4).map((m) => (
                        <Row key={m.id} href={`/review/${m.report_id}`} lead={<I.Flag className="status-ic info" />}
                          title={`${signs(m.signs)} · ${tr(m.place)}`}
                          sub={`${m.submissions === 1 ? tx("1 new report") : tx("{n} new reports", { n: m.submissions })} · ${tx("opened {ago}", { ago: ago(m.created_at, loc) })}`} />
                      ))}
                    </div>
                  ) : <div className="card secondary">{tx("No open missions.")}</div>}
                </Section>

                <Section title={tx("You")}>
                  {me.data ? (
                    <div className="group">
                      <Link href="/account" className="row has-lead">
                        <div className="row-lead"><Avatar name={me.data.name} colour={me.data.avatar} size={36} /></div>
                        <div className="row-body">
                          <span className="row-title">{me.data.name} <StarPill n={me.data.recognition.stars} /></span>
                          <span className="row-sub">{me.data.role === "admin" ? tx("Admin") : tx("Reviewer")} · {level(me.data.recognition.level)}</span>
                        </div>
                        <div className="row-trail"><I.ChevronRight className="chev" /></div>
                      </Link>
                      {me.data.role === "admin" ? <Row href="/account#team" lead={<I.Person className="status-ic info" />} title={tx("Team and organisation")} /> : null}
                      <Row href="/standards" lead={<I.Braces className="status-ic info" />} title={tx("Standards and permitted uses")} />
                    </div>
                  ) : <Skeleton h={120} />}
                </Section>
              </div>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
