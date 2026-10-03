"use client";
import { useApi, type Rung } from "@/ui/api";
import * as I from "@/ui/icons";
import { Gate, Page, Section, Skeleton } from "@/ui/kit";

type Standards = {
  definitions: { name: string; url: string }[];
  validation: { results: { file: string; fatal: number; error: number; warning: number }[]; validator: string[] };
  matrix: { rung: Rung; adds: { code: string; label: string }[] }[];
  uses: { code: string; label: string }[];
};

// Plan (docs/STREAMPROOF-WINNING-PLAN.md §5.1): citizen signs -> OneAquaHealth indicator codes.
const OAH_MAP: [string, string, string][] = [
  ["Scum or green water", "#foam", "wider"], ["Bad smell", "#foam", "wider"], ["Foam", "#foam", "wider"],
  ["Dead fish", "#fish", "wider"], ["Many mosquitoes", "#diptera", "wider"], ["Stagnant water", "#hydrology", "wider"],
  ["Oily sheen", "—", "proposed new concept"], ["Sewage or discharge", "—", "proposed new concept"], ["Litter", "—", "proposed new concept"],
];

export default function StandardsPage() {
  const q = useApi<Standards>("/standards");
  return (
    <Page title="Standards" eyebrow="Open data" width="wide"
      subtitle="The rules StreamProof enforces, published as data any system can read.">
      <Gate q={q} skeleton={<Skeleton n={4} h={100} />}>
        {(s) => {
          // uses are cumulative: a level may do everything the levels below it may do
          const from: Record<string, number> = {};
          s.matrix.forEach((row) => row.adds.forEach((u) => { from[u.code] = row.rung.level; }));
          return (
            <>
              <Section title="Permitted uses" n={1} foot="Uses add up: each trust level may do everything the levels before it may do. The gate checks this table before any output.">
                <div className="group only-compact">
                  {s.uses.map((u) => {
                    const lvl = s.matrix.find((m) => m.rung.level === from[u.code])?.rung;
                    return (
                      <div key={u.code} className="row">
                        <div className="row-body"><span className="row-title" style={{ fontWeight: 400 }}>{u.label}</span></div>
                        <span className="row-trail"><span className="pill">From {lvl?.label}</span></span>
                      </div>
                    );
                  })}
                </div>
                <div className="table-wrap only-regular">
                  <table className="table">
                    <caption className="visually-hidden">Which trust level may be used for what</caption>
                    <thead>
                      <tr><th scope="col">Use</th>{s.matrix.map((m) => <th key={m.rung.value} scope="col" className="c">{m.rung.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {s.uses.map((u) => (
                        <tr key={u.code}>
                          <th scope="row" style={{ fontWeight: 400 }}>{u.label}</th>
                          {s.matrix.map((m) => {
                            const ok = m.rung.level >= from[u.code];
                            return <td key={m.rung.value} className="c">{ok ? <I.Check width={18} height={18} style={{ margin: "0 auto", color: "var(--ok)" }} aria-label="Allowed" /> : <span aria-label="Not allowed" className="secondary">–</span>}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Signs to OneAquaHealth codes" n={2} foot="Planned mapping (ConceptMap citizen-sign → OAH TemporaryOahSystem). Six of nine signs match existing OAH indicators; three are proposed as new concepts.">
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th scope="col">Citizen sign</th><th scope="col">OAH code</th><th scope="col">Match</th></tr></thead>
                    <tbody>{OAH_MAP.map(([a, b, c]) => <tr key={a}><th scope="row" style={{ fontWeight: 400 }}>{a}</th><td className="mono">{b}</td><td className="secondary">{c}</td></tr>)}</tbody>
                  </table>
                </div>
              </Section>

              <Section title="Definitions" n={3} foot="FHIR R4 CodeSystems and ValueSets. Open JSON; the trust-level CodeSystem is the permitted-use rule as data.">
                <div className="group">
                  {s.definitions.map((d) => (
                    <a key={d.name} className="row has-lead" href={d.url} target="_blank" rel="noopener">
                      <div className="row-lead"><I.Braces className="status-ic info" /></div>
                      <div className="row-body"><span className="row-title mono" style={{ fontWeight: 400 }}>{d.name}</span></div>
                      <div className="row-trail"><I.External width={16} height={16} /></div>
                    </a>
                  ))}
                </div>
              </Section>

              <Section title="Validation" n={4} foot={`${s.validation.validator[0] ?? "HL7 FHIR Validator"}. Checked against base FHIR R4; validation against the OneAquaHealth profiles is planned.`}>
                {s.validation.results.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th scope="col">File</th><th scope="col" className="c">Errors</th><th scope="col" className="c">Warnings</th></tr></thead>
                      <tbody>{s.validation.results.map((r) => (
                        <tr key={r.file}><th scope="row" className="mono" style={{ fontWeight: 400 }}>{r.file}</th>
                          <td className="c num"><span className={`pill ${r.error + r.fatal ? "bad" : "ok"}`}>{r.error + r.fatal}</span></td>
                          <td className="c num">{r.warning}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="card secondary">No validation results saved yet.</div>}
              </Section>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}
