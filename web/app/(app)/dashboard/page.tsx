"use client";
import Link from "next/link";
import { ago, useApi, type Mission, type OrgProfile, type Report } from "@/ui/api";
import { EnglishOnly, useI18n } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Empty, Gate, Grade, Page, Row, Section, Skeleton, useApp } from "@/ui/kit";
import { Avatar, StarPill, useStarText } from "@/ui/profile";

type Signal = { sign: string; reports: number; expert: number; community: number; decision_grade: boolean; place: string; gaps: string[] };
type Queue = { todo: Report[]; done: Report[]; missions: Mission[]; signals: Signal[] };

function Dashboard() {
  const { session } = useApp();
  const { rung } = useI18n();
  const q = useApi<Queue>("/queue");
  const me = useApi<OrgProfile>(q.data ? "/org/profile" : null);
  const { level } = useStarText("reviewer");
  const org = session?.org;
  const signs = (r: Report) => r.signs.map((s) => s.chip).join(", ");
  return (
    <Page title={org?.org_name ?? "Dashboard"} eyebrow={org?.city ? `Organisation · ${org.city}` : "Organisation"} width="wide"
      actions={<Link href="/review" className="btn btn-sm btn-prominent"><I.Shield /> <span className="btn-label">Review queue</span></Link>}>
      <Gate q={q} skeleton={<Skeleton n={3} h={96} />}>
        {(d) => {
          const open = d.missions.filter((m) => m.status === "open");
          const decision = d.signals.filter((s) => s.decision_grade);
          return (
            <>
              <div className="stats section" role="list" aria-label="Overview">
                <div role="listitem" className="stat-wrap"><Link href="/review" className="stat"><span className="secondary t-sub">To review</span><span className="stat-n">{d.todo.length}</span></Link></div>
                <div className="stat" role="listitem"><span className="secondary t-sub">Decided</span><span className="stat-n">{d.done.length}</span></div>
                <div role="listitem" className="stat-wrap"><Link href="/brief" className="stat"><span className="secondary t-sub">Decision-grade signals</span><span className="stat-n">{decision.length}</span></Link></div>
                <div className="stat" role="listitem"><span className="secondary t-sub">Open missions</span><span className="stat-n">{open.length}</span></div>
              </div>

              <div className="dash-grid">
                <Section title="Next up" trail={d.todo.length ? <Link className="btn btn-sm" href="/review">Open queue</Link> : null}
                  foot="Ordered by health relevance first, then age.">
                  {d.todo.length ? (
                    <div className="group">
                      {d.todo.slice(0, 5).map((r) => (
                        <Row key={r.id} href={`/review/${r.id}`} lead={<Grade g={r.grade} />} title={signs(r)}
                          sub={`${r.place} · ${rung(r.rung.value, r.rung.label)} · ${ago(r.created_at, "en")}`} />
                      ))}
                    </div>
                  ) : <div className="card"><Empty icon={<I.CheckCircle />} title="Nothing waiting">New reports from {org?.city ?? "your city"} will appear here.</Empty></div>}
                </Section>

                <Section title="Signals" trail={<Link className="btn btn-sm" href="/brief">River Health Brief</Link>}
                  foot="A signal is the same sign reported by different people nearby within 14 days.">
                  {d.signals.length ? (
                    <div className="group">
                      {d.signals.slice(0, 5).map((s, i) => (
                        <div key={i} className="row has-lead">
                          <div className="row-lead">{s.decision_grade ? <I.CheckCircle className="status-ic ok" /> : <I.Info className="status-ic info" />}</div>
                          <div className="row-body">
                            <span className="row-title">{s.sign} · {s.place}</span>
                            <span className="row-sub">{s.reports} report{s.reports === 1 ? "" : "s"} · {s.expert} expert-verified{s.gaps.length ? ` · needs ${s.gaps[0].toLowerCase()}` : ""}</span>
                          </div>
                          {s.decision_grade ? <span className="pill ok"><I.Check /> Decision-grade</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : <div className="card secondary">No signals yet.</div>}
                </Section>
              </div>

              <div className="dash-grid">
                <Section title="Open missions" foot="Missions ask citizens near a report for more evidence, upstream first.">
                  {open.length ? (
                    <div className="group">
                      {open.slice(0, 4).map((m) => (
                        <Row key={m.id} href={`/review/${m.report_id}`} lead={<I.Flag className="status-ic info" />}
                          title={`${m.signs.map((s) => s.chip).join(", ")} · ${m.place}`} sub={`${m.submissions} new report${m.submissions === 1 ? "" : "s"} · opened ${ago(m.created_at, "en")}`} />
                      ))}
                    </div>
                  ) : <div className="card secondary">No open missions.</div>}
                </Section>

                <Section title="You">
                  {me.data ? (
                    <div className="group">
                      <Link href="/account" className="row has-lead">
                        <div className="row-lead"><Avatar name={me.data.name} colour={me.data.avatar} size={36} /></div>
                        <div className="row-body">
                          <span className="row-title">{me.data.name} <StarPill n={me.data.recognition.stars} /></span>
                          <span className="row-sub">{me.data.role === "admin" ? "Admin" : "Reviewer"} · {level(me.data.recognition.level)}</span>
                        </div>
                        <div className="row-trail"><I.ChevronRight className="chev" /></div>
                      </Link>
                      {me.data.role === "admin" ? <Row href="/account#team" lead={<I.Person className="status-ic info" />} title="Team and organisation" /> : null}
                      <Row href="/standards" lead={<I.Braces className="status-ic info" />} title="Standards and permitted uses" />
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

export default function DashboardPage() {
  return <EnglishOnly><Dashboard /></EnglishOnly>;
}
