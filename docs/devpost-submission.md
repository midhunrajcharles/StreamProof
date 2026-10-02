# Devpost submission: StreamProof

**Tagline (≤ 200 chars):** A trust layer for citizen stream reports: explainable grades, community and expert verification, and validated FHIR R4 evidence that says what it may be used for.

**Track:** Track 7, Digital Health Standards

**Built with:** python, fastapi, fhir, hl7, sqlite, leaflet, openstreetmap, open-meteo, pillow, cryptography, reportlab

---

## Track alignment

Track 7 asks for interoperability across systems, because data is fragmented and standards are missing. In citizen science, the missing standard isn't another data schema. It is a way to say **how much a record can be trusted and what it may be used for**, in a form other systems can read. StreamProof defines that as an open FHIR R4 package: five CodeSystems and a ValueSet, plus Observation + Provenance resources that carry the evidence grade, trust level and permitted uses inside each record. The output passes the official HL7 FHIR Validator with 0 errors and 0 warnings. It also uses Track 3 ideas (explainable checks, a human in the loop) and Track 5 ideas (missions and recognition) as the means to produce that trust.

## Inspiration

OneAquaHealth's tools already collect citizen observations of urban streams in five cities. The Track 3 brief itself says those observations "can be inconsistent and error-prone". So a municipality or health authority faces one question before it can act: *can I trust this enough?* Today the answer lives in nobody's system. A photo of a stagnant, mosquito-filled side pool is valuable One Health information, but it stays inside one app as an unverified pin.

## What it does

A citizen reports what they see in about a minute: photo, location confirmed on a map, and plain-language chips ("stagnant water", "many mosquitoes", or "everything looks fine", which counts the same). StreamProof then:

- **Grades the report A–D from seven checks**, each shown as a sentence: photo quality, photo time, GPS accuracy, distance to the mapped stream, agreement with nearby reports, consistency with real rainfall, and the observer's track record. It also says what would strengthen the report.
- **Builds an evidence graph.** Independent reports from other people (different account, spread in time or place, weighted by track record, capped per day) make a report *Community-supported*. Reviewers can open a mission that asks neighbours to check **400 m upstream along the real stream line**, or verify with one tap, remotely or after a field check. A rural report with no second observer can go straight to *Expert-verified*.
- **Applies the permitted-use matrix.** Each trust level unlocks specific uses: triage, org dashboard, public map, OAH dashboard/DSS, FHIR exchange, recognition, advisory flag. Every output asks the gate first. In the demo, "Export FHIR" on a Community-supported report is refused, with the reason shown.
- **Exports FHIR R4.** It produces an Observation per sign, with Location at about 100 m precision and three Provenance resources (citizen authored → engine assessed → expert verified, with the organization's signature). There is no Patient resource and no personal data.
- **Writes a River Health Brief** for the municipality: what is reported, where, how confident, what to do next, and which evidence gaps have open missions. A signal becomes *Decision-grade* when at least 2 different people's reports are expert-verified within 500 m and 14 days, and health-relevant signs then raise an **advisory** flag: "conditions may warrant inspection". Never a diagnosis.
- **Recognises the contributor** with a PDF certificate whose Ed25519 signature covers a hash of the de-identified record. Anyone can check it, and changing one value shows the tampering.

## How we built it

Python with FastAPI, server-rendered pages, and SQLite. The engine is pure functions over reports, so every rule is unit-tested: grading, the evidence graph, the permitted-use gate, the FHIR builder, signing and the brief. Exact GPS and contact details sit in a separate vault table, so the right to erasure removes identity while the de-identified evidence and its signature stay valid. The stream is the real Ribeira de Coselhas in Coimbra (OpenStreetMap), and rainfall context comes from Open-Meteo. We generate the FHIR CodeSystems and an example Bundle from the same code the app uses, then run the official HL7 FHIR Validator on them. The current result: 7 files, 0 errors, 0 warnings.

## Challenges we ran into

- **Keeping FHIR small and correct.** It was tempting to model everything. We kept to base R4 resources with no custom extensions. The trust metadata goes in `Observation.component` and `Provenance`, and the citizen is a pseudonymous identifier, never a Patient.
- **Making corroboration hard to game.** One person reporting twice, or five friends tapping submit on one spot, must not count as five voices. Independence rules, a daily cap and a threshold that counts *people* came from tests that failed first.
- **A ladder that strands rural sites.** A strict ladder would never verify a site with one observer, so we made it a graph with an expert shortcut.

## Accomplishments that we're proud of

- The permitted-use matrix as a working gate, travelling inside every FHIR record.
- Official HL7 validator: 0 errors, 0 warnings.
- A 31-test suite that includes the full demo story over HTTP.

## What we learned

The barrier to using citizen science isn't collecting more data. It's agreeing on what each piece of data is allowed to do. Writing that agreement down as a table, and enforcing it in code, turned a vague "is this trustworthy?" into a decision anyone can inspect.

## What's next for StreamProof

- Map the `stream-indicator` codes to the OneAquaHealth Indicators Framework with the project's ecologists, and calibrate the thresholds.
- Connect to the OAH Citizen Science App as the intake (the adoption path; not built yet) and feed Expert-verified records to the OAH dashboards and DSS.
- Publish the definitions as a small FHIR Implementation Guide.
- Post Decision-grade bundles to a partner FHIR server.

## Honest notes

Demo observers and reports are synthetic and labelled. No OneAquaHealth system is connected. Thresholds are illustrative defaults. Advisory flags are not health diagnoses.
