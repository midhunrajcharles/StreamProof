"use client";
import { useApi, type Rung } from "@/ui/api";
import { N, useI18n } from "@/ui/i18n";
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
  [N("Required fields"), N("Completeness (omission)"), N("A report needs a sign and a position before it is accepted.")],
  [N("Location"), N("Positional accuracy"), N("GPS accuracy, or a spot confirmed on the map.")],
  [N("On a stream"), N("Logical consistency (topological)"), N("The point lies on, or near, the mapped stream network.")],
  [N("Photo time"), N("Temporal quality"), N("The photo was taken when the report says.")],
  [N("Photo"), N("Thematic accuracy"), N("A clear photo supports the sign that was reported.")],
  [N("Nearby reports"), N("Thematic accuracy"), N("Independent people reported the same sign nearby.")],
  [N("Weather"), N("Logical consistency (conceptual)"), N("The sign is plausible for recent rainfall.")],
  [N("Track record"), N("Usability (with lineage)"), N("How often this observer's earlier reports were confirmed.")],
];

const BUILT_ON: [string, string, string][] = [
  ["HL7 Europe OneAquaHealth FHIR guide", N("The data standard StreamProof's records follow"), "https://github.com/hl7-eu/oah"],
  ["HL7 FHIR R4", N("Record format and validation"), "https://hl7.org/fhir/R4/"],
  ["OneAquaHealth Catalogue of Measures", N("Source for the brief's suggested measures (mapping planned)"), "https://oneaquahealth.eu"],
  ["DipteraCAST (ENORA Innovation)", N("Receives verified Diptera ground truth (interface planned)"), "https://oneaquahealth.eu"],
  ["OpenStreetMap", N("Stream geometry, city search and map tiles (ODbL)"), "https://www.openstreetmap.org/copyright"],
  ["Open-Meteo", N("Rainfall context for grading"), "https://open-meteo.com"],
  ["EU Horizon Europe grant 101086521", N("Funding context of the OneAquaHealth project"), "https://cordis.europa.eu/project/id/101086521"],
];

// Plan (docs/STREAMPROOF-WINNING-PLAN.md §5.1): citizen signs -> OneAquaHealth indicator codes.
const OAH_MAP: [string, string, string][] = [
  ["algal-scum", "#foam", N("wider")], ["odour", "#foam", N("wider")], ["foam", "#foam", N("wider")],
  ["dead-fish", "#fish", N("wider")], ["mosquitoes", "#diptera", N("wider")], ["stagnant-water", "#hydrology", N("wider")],
  ["oil-sheen", "—", N("proposed new concept")], ["sewage", "—", N("proposed new concept")], ["litter", "—", N("proposed new concept")],
];

export default function StandardsPage() {
  const q = useApi<Standards>("/standards");
  const { tx, sign, rung } = useI18n();
  return (
    <Page title={tx("Standards")} eyebrow={tx("Open data")} width="wide"
      subtitle={tx("The rules StreamProof enforces, published as data any system can read.")}>
      <Gate q={q} skeleton={<Skeleton n={4} h={100} />}>
        {(s) => {
          // uses are cumulative: a level may do everything the levels below it may do
          const from: Record<string, number> = {};
          s.matrix.forEach((row) => row.adds.forEach((u) => { from[u.code] = row.rung.level; }));
          return (
            <>
              <Section title={tx("Permitted uses")} n={1} foot={tx("Uses add up: each trust level may do everything the levels before it may do. The gate checks this table before any output.")}>
                <div className="group only-compact">
                  {s.uses.map((u) => {
                    const lvl = s.matrix.find((m) => m.rung.level === from[u.code])?.rung;
                    return (
                      <div key={u.code} className="row">
                        <div className="row-body"><span className="row-title" style={{ fontWeight: 400 }}>{tx(u.label)}</span></div>
                        <span className="row-trail"><span className="pill">{tx("From {level}", { level: lvl ? rung(lvl.value, lvl.label) : "" })}</span></span>
                      </div>
                    );
                  })}
                </div>
                <div className="table-wrap only-regular">
                  <table className="table">
                    <caption className="visually-hidden">{tx("Which trust level may be used for what")}</caption>
                    <thead>
                      <tr><th scope="col">{tx("Use")}</th>{s.matrix.map((m) => <th key={m.rung.value} scope="col" className="c">{rung(m.rung.value, m.rung.label)}</th>)}</tr>
                    </thead>
                    <tbody>
                      {s.uses.map((u) => (
                        <tr key={u.code}>
                          <th scope="row" style={{ fontWeight: 400 }}>{tx(u.label)}</th>
                          {s.matrix.map((m) => {
                            const ok = m.rung.level >= from[u.code];
                            return <td key={m.rung.value} className="c">{ok ? <I.Check width={18} height={18} style={{ margin: "0 auto", color: "var(--ok)" }} aria-label={tx("Allowed")} /> : <span aria-label={tx("Not allowed")} className="secondary">–</span>}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title={tx("Signs to OneAquaHealth codes")} n={2} foot={tx("Planned mapping (ConceptMap citizen-sign → OAH TemporaryOahSystem). Six of nine signs match existing OAH indicators; three are proposed as new concepts.")}>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th scope="col">{tx("Citizen sign")}</th><th scope="col">{tx("OAH code")}</th><th scope="col">{tx("Match")}</th></tr></thead>
                    <tbody>{OAH_MAP.map(([a, b, c]) => <tr key={a}><th scope="row" style={{ fontWeight: 400 }}>{sign(a)}</th><td className="mono">{b}</td><td className="secondary">{tx(c)}</td></tr>)}</tbody>
                  </table>
                </div>
              </Section>

              <Section title={tx("Data quality (ISO 19157)")} n={3} foot={tx("How the grade's checks read as ISO 19157 geographic data-quality elements. This is the team's mapping, not a certification.")}>
                <div className="group only-compact">
                  {ISO_19157.map(([check, element, why]) => (
                    <div key={check} className="row"><div className="row-body"><span className="row-title">{tx(check)}</span><span className="row-sub">{tx(element)} · {tx(why)}</span></div></div>
                  ))}
                </div>
                <div className="table-wrap only-regular">
                  <table className="table">
                    <thead><tr><th scope="col">{tx("Check")}</th><th scope="col">{tx("ISO 19157 element")}</th><th scope="col">{tx("What it measures")}</th></tr></thead>
                    <tbody>{ISO_19157.map(([check, element, why]) => <tr key={check}><th scope="row" style={{ fontWeight: 400 }}>{tx(check)}</th><td>{tx(element)}</td><td className="secondary">{tx(why)}</td></tr>)}</tbody>
                  </table>
                </div>
              </Section>

              <Section title={tx("Definitions")} n={4} foot={tx("FHIR R4 CodeSystems and ValueSets. Open JSON; the trust-level CodeSystem is the permitted-use rule as data.")}>
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

              <Section title={tx("Validation")} n={5} foot={tx("{validator}. Checked against base FHIR R4; validation against the OneAquaHealth profiles is planned.", { validator: s.validation.validator[0] ?? "HL7 FHIR Validator" })}>
                {s.validation.results.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th scope="col">{tx("File")}</th><th scope="col" className="c">{tx("Errors")}</th><th scope="col" className="c">{tx("Warnings")}</th></tr></thead>
                      <tbody>{s.validation.results.map((r) => (
                        <tr key={r.file}><th scope="row" className="mono" style={{ fontWeight: 400 }}>{r.file}</th>
                          <td className="c num"><span className={`pill ${r.error + r.fatal ? "bad" : "ok"}`}>{r.error + r.fatal}</span></td>
                          <td className="c num">{r.warning}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="card secondary">{tx("No validation results saved yet.")}</div>}
              </Section>

              <Section title={tx("Built on")} n={6} foot={tx("Credited, not endorsed. StreamProof is designed as a trust layer behind OneAquaHealth's Citizen Science App; this web app is a reference client.")}>
                <div className="group">
                  {BUILT_ON.map(([name, role, url]) => (
                    <a key={name} className="row" href={url} target="_blank" rel="noopener">
                      <div className="row-body"><span className="row-title">{name}</span><span className="row-sub">{tx(role)}</span></div>
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
