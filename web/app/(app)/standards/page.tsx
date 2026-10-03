"use client";
import { useApi, type Rung } from "@/ui/api";
import { EnglishOnly } from "@/ui/i18n";
import * as I from "@/ui/icons";
import { Gate, Page, Section, Skeleton } from "@/ui/kit";

type Standards = {
  definitions: { name: string; url: string }[];
  validation: { results: { file: string; fatal: number; error: number; warning: number }[]; validator: string[] };
  matrix: { rung: Rung; adds: { code: string; label: string }[] }[];
  uses: { code: string; label: string }[];
};

// The seven grading checks (+ intake) read as ISO 19157 data-quality elements. Team interpretation.
const ISO_19157: [string, string, string][] = [
  ["Required fields", "Completeness (omission)", "A report needs a sign and a position before it is accepted."],
  ["Location", "Positional accuracy", "GPS accuracy, or a spot confirmed on the map."],
  ["On a stream", "Logical consistency (topological)", "The point lies on, or near, the mapped stream network."],
  ["Photo time", "Temporal quality", "The photo was taken when the report says."],
  ["Photo", "Thematic accuracy", "A clear photo supports the sign that was reported."],
  ["Nearby reports", "Thematic accuracy", "Independent people reported the same sign nearby."],
  ["Weather", "Logical consistency (conceptual)", "The sign is plausible for recent rainfall."],
  ["Track record", "Usability (with lineage)", "How often this observer's earlier reports were confirmed."],
];

const BUILT_ON: [string, string, string][] = [
  ["HL7 Europe OneAquaHealth FHIR guide", "The data standard StreamProof's records follow", "https://github.com/hl7-eu/oah"],
  ["HL7 FHIR R4", "Record format and validation", "https://hl7.org/fhir/R4/"],
  ["OneAquaHealth Catalogue of Measures", "Source for the brief's suggested measures (mapping planned)", "https://oneaquahealth.eu"],
  ["DipteraCAST (ENORA Innovation)", "Receives verified Diptera ground truth (interface planned)", "https://oneaquahealth.eu"],
  ["OpenStreetMap", "Stream geometry and map tiles (ODbL)", "https://www.openstreetmap.org/copyright"],
  ["Open-Meteo", "Rainfall context for grading", "https://open-meteo.com"],
  ["EU Horizon Europe grant 101086521", "Funding context of the OneAquaHealth project", "https://cordis.europa.eu/project/id/101086521"],
];

// Plan (docs/STREAMPROOF-WINNING-PLAN.md §5.1): citizen signs -> OneAquaHealth indicator codes.
const OAH_MAP: [string, string, string][] = [
  ["Scum or green water", "#foam", "wider"], ["Bad smell", "#foam", "wider"], ["Foam", "#foam", "wider"],
  ["Dead fish", "#fish", "wider"], ["Many mosquitoes", "#diptera", "wider"], ["Stagnant water", "#hydrology", "wider"],
  ["Oily sheen", "—", "proposed new concept"], ["Sewage or discharge", "—", "proposed new concept"], ["Litter", "—", "proposed new concept"],
];

function StandardsPage() {
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

              <Section title="Data quality (ISO 19157)" n={3} foot="How the grade's checks read as ISO 19157 geographic data-quality elements. This is the team's mapping, not a certification.">
                <div className="group only-compact">
                  {ISO_19157.map(([check, element, why]) => (
                    <div key={check} className="row"><div className="row-body"><span className="row-title">{check}</span><span className="row-sub">{element} · {why}</span></div></div>
                  ))}
                </div>
                <div className="table-wrap only-regular">
                  <table className="table">
                    <thead><tr><th scope="col">Check</th><th scope="col">ISO 19157 element</th><th scope="col">What it measures</th></tr></thead>
                    <tbody>{ISO_19157.map(([check, element, why]) => <tr key={check}><th scope="row" style={{ fontWeight: 400 }}>{check}</th><td>{element}</td><td className="secondary">{why}</td></tr>)}</tbody>
                  </table>
                </div>
              </Section>

              <Section title="Definitions" n={4} foot="FHIR R4 CodeSystems and ValueSets. Open JSON; the trust-level CodeSystem is the permitted-use rule as data.">
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

              <Section title="Validation" n={5} foot={`${s.validation.validator[0] ?? "HL7 FHIR Validator"}. Checked against base FHIR R4; validation against the OneAquaHealth profiles is planned.`}>
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

              <Section title="Built on" n={6} foot="Credited, not endorsed. StreamProof is designed as a trust layer behind OneAquaHealth's Citizen Science App; this web app is a reference client.">
                <div className="group">
                  {BUILT_ON.map(([name, role, url]) => (
                    <a key={name} className="row" href={url} target="_blank" rel="noopener">
                      <div className="row-body"><span className="row-title">{name}</span><span className="row-sub">{role}</span></div>
                      <div className="row-trail"><I.External width={16} height={16} /></div>
                    </a>
                  ))}
                </div>
              </Section>
            </>
          );
        }}
      </Gate>
    </Page>
  );
}

// reviewer screens stay in English
export default function StandardsPagePage() {
  return <EnglishOnly><StandardsPage /></EnglishOnly>;
}
