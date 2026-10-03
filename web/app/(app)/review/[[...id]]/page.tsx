"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ago, api, ApiError, signsText, useApi, when, type Mission, type Report } from "@/ui/api";
import { History, PhotoView } from "@/ui/evidence";
import * as I from "@/ui/icons";
import { Callout, Empty, Gate, Grade, Page, Reasons, Row, RungPill, Section, Segmented, Sheet, Skeleton, useApp } from "@/ui/kit";
import { Map, useMeta } from "@/ui/Map";

type Queue = {
  todo: Report[]; done: Report[]; missions: Mission[];
  signals: { sign: string; reports: number; expert: number; community: number; decision_grade: boolean; place: string; gaps: string[] }[];
};

function useWide(q = "(min-width: 900px)") {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches); // dual-screen counts as wide: list and detail are both visible
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return wide;
}

// ---------------------------------------------------------------- detail

function Detail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const q = useApi<Report>(`/reports/${id}`);
  const meta = useMeta();
  const { toast } = useApp();
  const [sheet, setSheet] = useState<null | "verify" | "reject" | "fhir">(null);
  const [method, setMethod] = useState<"remote" | "field">("remote");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [blocked, setBlocked] = useState("");
  const [bundle, setBundle] = useState<unknown>(null);
  const streams = useMemo(() => meta?.streams.map((s) => s.line) ?? [], [meta]);

  useEffect(() => { setBlocked(""); setNote(""); setReason(""); setBundle(null); }, [id]);

  const act = async (what: string, path: string, form?: Record<string, string>, done?: (r: Report) => string) => {
    setBusy(what);
    try {
      const r = await api<Report>(path, { method: "POST", form });
      q.setData(r);
      onChanged();
      setSheet(null);
      if (done) toast(done(r));
    } catch (e) {
      toast((e as ApiError).message, "bad");
    } finally { setBusy(""); }
  };

  const exportFhir = async () => {
    setBusy("fhir");
    setBlocked("");
    try {
      setBundle(await api(`/reports/${id}/fhir`));
      setSheet("fhir");
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) setBlocked(err.message);
      else toast(err.message, "bad");
    } finally { setBusy(""); }
  };

  return (
    <Gate q={q} skeleton={<Skeleton n={4} h={120} />}>
      {(r) => {
        const o = r.org!;
        const markers = [
          { id: r.id, lat: r.position.lat, lon: r.position.lon, title: `Report ${r.id}`, label: r.grade ?? "" },
          ...o.agree.map((a) => ({ id: a.id, lat: a.position.lat, lon: a.position.lon, title: `Agreeing report ${a.id}`, kind: "dot" as const })),
        ];
        return (
          <div>
            <div className="card section stack">
              <div className="hstack" style={{ alignItems: "flex-start", gap: 14 }}>
                <Grade g={r.grade} size="md" />
                <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <div className="spread"><p className="eyebrow">({r.id})</p><RungPill rung={r.rung} /></div>
                  <h2 className="t-title2">{signsText(r.signs)}</h2>
                  <p className="secondary t-sub">{o.observer.display} <span className="mono">({o.observer.pseudonym})</span> · {when(r.created_at)} · {r.place}</p>
                </div>
              </div>
              {r.description ? <p className="t-callout">“{r.description}”</p> : null}
              {o.can_decide ? (
                <div className="btn-row">
                  <button className="btn btn-prominent" onClick={() => setSheet("verify")}><I.Check /> Verify…</button>
                  <button className="btn" disabled={Boolean(o.mission) || busy === "mission"} onClick={() => act("mission", `/reports/${id}/mission`, undefined, () => `Evidence mission opened ${meta?.rules.upstream_m ?? 400} m upstream`)}>
                    {busy === "mission" ? <I.Spinner /> : <I.Flag />} {o.mission ? `Mission ${o.mission.id} open` : "Ask for more evidence"}
                  </button>
                  <button className="btn btn-destructive" onClick={() => setSheet("reject")}>Not confirmed…</button>
                </div>
              ) : null}
            </div>

            {r.verification ? (
              <div className="section"><Callout kind="ok" title={`Verified (${r.verification.method} check)`}>
                By {r.verification.by} on {when(r.verification.at, { dateStyle: "medium" })}{r.verification.note ? `: “${r.verification.note}”` : "."}
              </Callout></div>
            ) : null}
            {r.rejection ? <div className="section"><Callout kind="warn" title="Not confirmed">{r.rejection}</Callout></div> : null}
            {r.safety ? <div className="section"><Callout kind="bad" title="Safety advice shown to the citizen">{r.safety}</Callout></div> : null}

            <div className="grid-2 section">
              <PhotoView r={r} />
              <div className="stack">
                <Map center={[r.position.lat, r.position.lon]} streams={streams} markers={markers}
                  circles={meta ? [{ lat: r.position.lat, lon: r.position.lon, radius: meta.rules.radius_m }] : []}
                  label={`Exact position of report ${r.id}, with agreeing reports nearby`} />
                <p className="secondary t-foot">Exact position, organisation only (±{r.position.accuracy_m ?? "?"} m). Public surfaces show about 100 m.</p>
              </div>
            </div>

            <Section title="Evidence grade" n={1} trail={<span className="secondary t-sub num">{r.score}/100</span>}>
              <Reasons reasons={r.reasons} />
            </Section>

            <Section title="Nearby evidence" n={2} foot={meta ? `Other people within ${meta.rules.radius_m} m and ${meta.rules.window_days} days. Counted as people, not reports.` : undefined}>
              <div className="group">
                {o.agree.map((a) => <Row key={a.id} href={`/review/${a.id}`} lead={<I.CheckCircle className="status-ic ok" />} title={`${a.id} · ${signsText(a.signs)}`} sub={a.rung.label} />)}
                {o.contradict.map((c) => <Row key={c.id} href={`/review/${c.id}`} lead={<I.Warn className="status-ic warn" />} title={`${c.id} saw nothing of concern nearby`} />)}
                {!o.agree.length && !o.contradict.length ? <Row lead={<I.Info className="status-ic info" />} title="No reports from other people nearby yet" chevron={false} /> : null}
                <Row lead={<I.Person className="status-ic info" />} title="Observer track record" chevron={false}
                  trail={<span className="num">{o.observer.confirmed} confirmed · {o.observer.not_confirmed} not</span>} />
              </div>
            </Section>

            <Section title="Permitted-use gate" n={3} foot={`What a ${r.rung.label} record may be used for. Every output asks the gate first.`}>
              <div className="group">
                {o.gate.map((g) => (
                  <div key={g.code} className="row has-lead">
                    <div className="row-lead">{g.allowed ? <I.CheckCircle className="status-ic ok" /> : <I.XCircle className="status-ic fail" />}</div>
                    <div className="row-body"><span className="row-title" style={{ fontWeight: 400 }}>{g.label}</span></div>
                    <span className="row-trail">{g.allowed ? "Allowed" : `Needs ${g.needs}`}</span>
                  </div>
                ))}
              </div>
              <div className="stack" style={{ marginTop: 12 }}>
                <div><button className="btn" onClick={exportFhir} disabled={busy === "fhir"}>{busy === "fhir" ? <I.Spinner /> : <I.Braces />} Export FHIR R4 bundle</button></div>
                {blocked ? <Callout kind="bad" title="Export refused by the gate">{blocked}</Callout> : null}
              </div>
            </Section>

            {o.ai_suggestion ? (
              <div className="section"><Callout title="AI photo suggestion (not counted in the grade)">{o.ai_suggestion.label} ({o.ai_suggestion.confidence})</Callout></div>
            ) : null}

            <Section title="History" n={4}><History r={r} /></Section>

            <Sheet open={sheet === "verify"} onClose={() => setSheet(null)} title="Verify report">
              <div className="stack">
                <Segmented label="How it was checked" value={method} onChange={setMethod}
                  options={[{ value: "remote", label: "Remote check" }, { value: "field", label: "Field check" }]} />
                <div className="field">
                  <label className="field-label" htmlFor="note">Note for the record (optional)</label>
                  <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: larvae in dip sample" />
                </div>
                {r.rung.value !== "community-supported" ? (
                  <p className="secondary t-sub">No community step yet: verifying uses the evidence-graph shortcut, so a rural site with one observer isn't stuck.</p>
                ) : null}
                <button className="btn btn-prominent btn-large btn-block" disabled={busy === "verify"}
                  onClick={() => act("verify", `/reports/${id}/verify`, { method, note }, (x) => `${x.id} is ${x.rung.label}. Signed record issued.`)}>
                  {busy === "verify" ? <I.Spinner /> : <I.Check />} Verify
                </button>
              </div>
            </Sheet>

            <Sheet open={sheet === "reject"} onClose={() => setSheet(null)} title="Not confirmed">
              <div className="stack">
                <div className="field">
                  <label className="field-label" htmlFor="reason">Reason</label>
                  <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby="reason-help"
                    placeholder="For example: the photo shows pollen on the surface, not an algal scum. Thanks for checking!" />
                  <p id="reason-help" className="field-help">The citizen will read this. Be kind and specific.</p>
                </div>
                <button className="btn btn-prominent btn-destructive btn-large btn-block" disabled={!reason.trim() || busy === "reject"}
                  onClick={() => act("reject", `/reports/${id}/reject`, { reason }, (x) => `${x.id} marked not confirmed`)}>
                  {busy === "reject" ? <I.Spinner /> : null} Mark not confirmed
                </button>
              </div>
            </Sheet>

            <Sheet open={sheet === "fhir"} onClose={() => setSheet(null)} title="FHIR R4 bundle"
              lead={<button className="btn btn-plain" onClick={() => setSheet(null)}>Done</button>}
              trail={<button className="btn btn-plain" onClick={async () => { await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2)); toast("Copied"); }}><I.Copy /> Copy</button>}>
              <p className="secondary t-sub">Released because this record is {r.rung.label}. The trust level and permitted uses travel inside the bundle.</p>
              <pre className="code">{JSON.stringify(bundle, null, 2)}</pre>
              <a className="btn btn-block" download={`Bundle-${r.id}.json`} href={`data:application/fhir+json;charset=utf-8,${encodeURIComponent(JSON.stringify(bundle, null, 2))}`}><I.Download /> Download .json</a>
            </Sheet>
          </div>
        );
      }}
    </Gate>
  );
}

// ---------------------------------------------------------------- list + page

export default function Review() {
  const router = useRouter();
  const params = useParams<{ id?: string[] }>();
  const sel = params.id?.[0] ?? null;
  const wide = useWide();
  const q = useApi<Queue>("/queue");
  const meta = useMeta();
  const { toast } = useApp();
  const [tab, setTab] = useState<"todo" | "done" | "map">("todo");
  const [resetOpen, setResetOpen] = useState(false);
  const streams = useMemo(() => meta?.streams.map((s) => s.line) ?? [], [meta]);

  const all = useMemo(() => (q.data ? [...q.data.todo, ...q.data.done] : []), [q.data]);
  const markers = useMemo(() => all.filter((r) => r.rung.level > 0).map((r) => ({
    id: r.id, lat: r.position.lat, lon: r.position.lon, label: r.grade ?? "", title: `${r.id}: ${signsText(r.signs)}, ${r.rung.label}`,
    selected: r.id === sel, kind: r.id === sel ? ("pin" as const) : ("dot" as const),
  })), [all, sel]);

  // keep the segment on the selected report's list
  useEffect(() => {
    if (sel && q.data && tab !== "map") setTab(q.data.todo.some((r) => r.id === sel) ? "todo" : "done");
  }, [sel, q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const compactDetail = sel && !wide;
  const list = tab === "done" ? q.data?.done ?? [] : q.data?.todo ?? [];

  return (
    <Page title={compactDetail ? `Report ${sel}` : "Review"} eyebrow="Organisation" width="wide"
      back={compactDetail ? { href: "/review", label: "Review" } : undefined}
      actions={!compactDetail ? <button className="btn btn-sm" onClick={() => setResetOpen(true)} aria-label="Demo options"><I.More /></button> : undefined}>
      <Gate q={q} skeleton={<Skeleton n={5} h={64} />}>
        {(data) => (
          <div className="split" data-has-detail={sel ? "true" : "false"}>
            <div className="split-list">
              <div style={{ marginBottom: 14 }}>
                <Segmented label="Show" value={tab} onChange={setTab} options={[
                  { value: "todo", label: <>To review · {data.todo.length}</> },
                  { value: "done", label: <>Done · {data.done.length}</> },
                  { value: "map", label: "Map" },
                ]} />
              </div>
              {tab === "map" ? (
                <div className="stack">
                  <Map center={sel ? [all.find((r) => r.id === sel)?.position.lat ?? meta?.start[0] ?? 40.2, all.find((r) => r.id === sel)?.position.lon ?? meta?.start[1] ?? -8.4] : meta?.start ?? [40.2, -8.42]}
                    zoom={14} tall streams={streams} markers={markers} onSelect={(id) => router.push(`/review/${id}`)} label="All reports on the map. Select a marker to open the report." />
                  <p className="secondary t-foot">Larger pin: the selected report. Not-confirmed reports are hidden.</p>
                </div>
              ) : list.length ? (
                <div className="group" role="list">
                  {list.map((r) => (
                    <div role="listitem" key={r.id}>
                      <Row href={`/review/${r.id}`} selected={r.id === sel} lead={<Grade g={r.grade} />}
                        title={signsText(r.signs)} sub={<>{r.id} · {ago(r.created_at)} · {r.rung.label}</>} chevron={!wide} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card"><Empty icon={<I.CheckCircle />} title="All caught up">Nothing is waiting for review.</Empty></div>
              )}
              {tab === "todo" && data.signals.length ? (
                <div style={{ marginTop: 22 }}>
                  <Section title="Signals" foot="Same sign, near in space and time. Decision-grade needs independent people and an expert.">
                    <div className="group">
                      {data.signals.map((s, i) => (
                        <Row key={i} lead={s.decision_grade ? <I.CheckCircle className="status-ic ok" /> : <I.Info className="status-ic info" />}
                          title={`${s.sign} · ${s.place}`} chevron={false}
                          sub={s.decision_grade ? `Decision-grade: ${s.expert} expert, ${s.community} community+` : s.gaps[0]} />
                      ))}
                    </div>
                  </Section>
                </div>
              ) : null}
            </div>
            <div className="split-detail">
              {sel ? <Detail id={sel} onChanged={q.reload} /> : (
                <div className="card"><Empty icon={<I.Shield />} title="Select a report">Choose a report from the list to see its evidence and decide.</Empty></div>
              )}
            </div>
          </div>
        )}
      </Gate>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Demo options">
        <p className="secondary">Reset puts the synthetic demo data back to its starting state. Reports made in this session are removed.</p>
        <button className="btn btn-block btn-prominent btn-destructive" onClick={async () => {
          try { await api("/demo/reset", { method: "POST" }); toast("Demo data reset"); setResetOpen(false); router.push("/review"); q.reload(); }
          catch (e) { toast((e as ApiError).message, "bad"); }
        }}><I.Refresh /> Reset demo data</button>
      </Sheet>
    </Page>
  );
}
