# StreamProof: the winning plan

*Written 2026-10-03. This is the only plan for StreamProof. Everything here is planned, not yet built; section 3 lists what the code in this repo still needs.*
*Deadline: **Oct 4, 2026 @ 9:00 pm PDT** (= Oct 5, 09:30 IST). Judging Oct 1–15. Winners announced Oct 24, 2026 at IEEE iGET.*

---

## 0. Bottom line

- **Goal:** 1st place. For an 80% chance of 1st, the judges' weighted average has to reach about **9.2–9.4 / 10**, which is close to perfect. No idea can guarantee that. StreamProof is designed to reach that bar on every criterion.
- **Estimated score once built:** about **9.0 / 10**, giving **55–75% for 1st** and **85–95% for a cash prize** (model below). With every "beyond the product" item in section 11 done, and judges who agree with each other, 1st reaches about **79–83%**.
- **The single biggest lever:** StreamProof stops inventing its own standard and becomes **the trust and provenance add-on to the official OneAquaHealth FHIR guide** (HL7 Europe). The judges' own standards work gets *extended*, not *ignored*.

---

## 1. Evidence base (what we know, with sources)

| # | Fact | Source | Why it matters |
|---|---|---|---|
| E1 | Scoring weights: Impact & alignment 30, Innovation 20, Technical implementation 20, Usability & UX 15, Feasibility & scalability 15. Each scored 1–10. | Devpost rules page | Impact is worth 1.5× any other criterion |
| E2 | 1,282 registered (270 in July: 98 solo, 89 seeking team, 85 teams). Students only, team required, public repo, 3–5 min video. | Devpost; oneaquahealth.eu 2026-07-07 | Estimated field of 60–150 submissions |
| E3 | **HL7 Europe maintains an official OAH FHIR guide**: `github.com/hl7-eu/oah`, canonical `http://hl7.eu/fhir/ig/oah`, v0.1.0-ci-build, FHIR R4. Contributors: gcangioli, skokolakis, chronaki, joofio. Last commit 2026-06-11. **No licence file.** The CI build page currently returns 404. | GitHub | StreamProof builds on it |
| E4 | The guide has CodeSystem `TemporaryOahSystem` (`…/CodeSystem/temporarySystem-oah-eu`) with `#foam` "Foam/colour/smell", `#diptera`, `#fish`, `#amphibians`, `#hydrology`, `#coliforms`, `#birds`, … and health indicators. It also defines profiles `ObservationIndicatorsOah` (status fixed to `final`; `subject` must be `LocationOah`; `performer` 1..; `value[x]` only CodeableConcept or Quantity; component values only CodeableConcept, string or Quantity) and `LocationOah` (`identifier` 1.., `name` 1.., `mode` = instance). | `input/fsh/…` | Exact rules StreamProof must follow |
| E5 | The guide has **no data quality, trust, provenance or citizen-verification artefacts**. | same | The gap StreamProof fills |
| E6 | **Judge Gora Datta (FHL7) co-wrote HL7's article on OAH FHIR work** (with Nicole Ha). It names the plan: "Develop an OAH FHIR Implementation Guide", using the Gravity and Helios accelerators. He chairs IEEE P3228 / P3271.01. | hl7news.hl7.org/?p=683; sagroups.ieee.org/3228 | The Track 7 judge knows the guide intimately |
| E7 | **DipteraCAST** (31 Jul 2026) predicts Diptera communities (55 taxa, 85 sites, 5 cities; RF, LR, SVM, XGBoost, multi-label). **Built by ENORA Innovation.** | oneaquahealth.eu | Judge George Koutalieris is ENORA's Chief Business & Innovation Officer |
| E8 | **OAH Catalogue of Measures** is public (12 May 2026, by Maria Feio). Nature-based, hierarchical, covering morphological, hydrological, chemical, ecological and social dimensions; it feeds the DSS. | oneaquahealth.eu media centre | The brief must use it; Feio is a judge |
| E9 | OAH's own test for an "exploitable result": a clear need, a defined user group, concrete value, plus long-term maintenance. Its key results: Citizen Science App, GEOSSIP, DSS, Indicators Framework. | oneaquahealth.eu 2026-05-19 | The adoption story must answer exactly this |
| E10 | OAH ran a learning session "One Digital Health & FAIR Principles" (15 Jul 2026). | oneaquahealth.eu 2026-07-07 | Judges expect FAIR language |
| E11 | Prior art: **Alabri & Hunter, "Enhancing the Quality and Trust of Citizen Science Data", IEEE e-Science 2010** (trust metrics, CoralWatch). **Baker et al. 2021, *Citizen Science: Theory and Practice* 6(1), doi:10.5334/cstp.351**: of 259 schemes reviewed, verification info was found for 142. It recommends a **layered approach**: rules or the community check most records, and experts check the flagged ones. iNaturalist "Research Grade" studies show community agreement ≠ accuracy for hard taxa. | IEEE / CSTP / NSF PAR | Cite and differentiate, or be called "a 2010 idea" |
| E12 | OAH protocol paper: Anastasaki, Chronaki, Moen, Kokinou, Kokolakis, Karagiannidou (2025), *Applied Medical Informatics* 47 Suppl 1. Indicator factsheets: Schmeller et al., Zenodo doi:10.5281/zenodo.20345207 (May 2026). CSSI: Harrison, McSorley, Sullivan, *Sci. Total Environ.* 1009 (Dec 2025). | | Citations for Impact |
| E13 | OAH cities: Benevento, Coimbra, Ghent, Oslo, Toulouse. Languages: IT, PT, NL/FR, NO, FR. | oneaquahealth.eu | Scale story |

---

## 2. The idea

**One sentence (≤ 25 words):** StreamProof makes citizen stream reports trustworthy enough for cities to act on, as a trust add-on to OneAquaHealth's official FHIR standard.

**Hook (what every judge already understands):** "Can I trust this photo enough to act?"

**Hard part (load-bearing):** a machine-readable rule that says what each trust level may be used for. It is published as FHIR, enforced by the app, and travels inside every record. Without it, a verified report and a rumour look identical to the systems that receive them.

**What others miss:** the OAH standard describes *what* was observed, but not *how far it can be trusted* or *what it may be used for*. Everyone else builds a better app or dashboard; nobody fixes the standard's blind spot.

**Pitch (30 s):** OneAquaHealth already has an HL7 FHIR standard for stream indicators. What it can't say yet is whether a record is trustworthy, or what it may be used for. StreamProof adds that. Citizens report in a minute. Every report gets a grade with readable reasons and is strengthened by neighbours and experts. Records are then written in the OAH guide's own format, with a published rule file listing exactly what each trust level may be used for. Verified mosquito reports become real-world checks for DipteraCAST. The brief recommends real measures from the OAH Catalogue. And the person who helped gets a signed record.

---

## 3. Gaps to close in the current code

| # | Current gap | Planned change | Criterion gain |
|---|---|---|---|
| F1 | Own `stream-indicator` CodeSystem duplicates the official OAH codes | Observation.code uses **OAH `TemporaryOahSystem`** wherever a match exists. The citizen's sign becomes the Observation **value** (from StreamProof's `citizen-sign` CodeSystem). A ConceptMap `citizen-sign → OAH indicator` is published. | Technical +1.0, Impact +0.5 |
| F2 | Bundles not checked against OAH profiles; `valueBoolean` and `valueInteger` violate `ObservationIndicatorsOah` | StreamProof profiles **derive from** `ObservationIndicatorsOah` and `LocationOah`. Values become CodeableConcept or Quantity. `LocationOah.identifier` gets a site id. Validation runs with the OAH guide compiled locally by SUSHI: **0 errors against the official profiles**. | Technical +0.8 |
| F3 | Permitted-use matrix exists only in Python | Published as FHIR: CodeSystem `trust-level` with property **`permits`** (code), one value per allowed use. **The app's gate loads that file at startup.** A test proves the gate and the published file can't disagree. | Innovation +0.8 |
| F4 | Made-up measures in the brief | Brief actions come from the **real OAH Catalogue of Measures**, cited by measure name and page. Each sign maps to catalogue entries. | Impact +0.5 (Feio) |
| F5 | No link to OAH tools | **DipteraCAST interface:** expert-verified `#diptera` reports exported as labelled presence/absence ground truth (FHIR Bundle + CSV). A slot for a DipteraCAST prediction as context in grading, labelled "interface only, model not public". | Impact +0.4, Innovation +0.3 (ENORA) |
| F6 | Prior art not addressed | README and Devpost cite Alabri & Hunter (IEEE 2010) and Baker et al. 2021, and state the contribution: *we implement Baker's recommended layered verification, add machine-readable use rules, and carry both inside the OAH FHIR standard.* | Innovation (defends the score) |
| F7 | English only, Coimbra only | Chips, reasons, safety text and missions in **PT, IT, FR, NL, NO, EN**. City switcher with the stream geometry of each of the 5 cities from OpenStreetMap. | Scale +0.6, UX +0.3 |
| F8 | No live link; synthetic photos | Public demo URL. Video uses **real stream photos** taken by the team. Seed photos from the team's own pictures (no stock images). | UX +0.4, Feasibility +0.4 |
| F9 | Vague adoption story | "Exploitable result" table (need / users / value / maintenance), using OAH's own wording. FAIR mapping table. Proposed path: open an issue or PR on `hl7-eu/oah` offering the add-on (**the user's decision and action**). | Feasibility +0.5, Impact +0.3 |
| F10 | Grade weights untested | **Calibration report**: run the grader on the seeded cases and on a small set of real photos, and publish the confusion table and limits. Honest numbers only. | Technical +0.2 |

Already right in the current code (keep): the evidence *graph* (expert shortcut for rural sites), the "decision-grade" wording (never "policy-grade"), advisory-only health language, pseudonymous provenance, the identity vault and erasure, equal credit for "all clear", a corroboration cap and independence rules, the threshold counting **people not reports**, and a signature that is tamper-evident but not a blockchain.

---

## 4. Architecture

```
 CITIZEN PWA (6 languages, 5 cities)          ORGANIZATION PORTAL
 report · track · share · certificate          queue · verify · missions · brief
                 │                                        │
                 └──────────── API + auth (citizen | expert | public) ────────┐
                                                                               │
 Evidence engine ── 7 readable checks ── grade A–D ── evidence graph ──────────┤
 (photo, time, GPS, on-stream, nearby, weather, track record)                  │
                                                                               ▼
                         PERMITTED-USE GATE  ◄── loads trust-level CodeSystem (property "permits")
          ┌──────────────┬───────────────┬──────────────┬──────────────┬─────────────────┐
     org dashboard   public map     OAH FHIR export   certificate   advisory flag   DipteraCAST
      (Assessed+)   (Community+)   (Expert-verified+)  (Expert+)  (Decision-grade)  ground truth
                                         │                                          (Expert+, #diptera)
                                         ▼
          StreamProof Trust add-on  ──depends on──►  HL7 Europe OAH FHIR guide (hl7.eu.fhir.oah)
          profiles derive from ObservationIndicatorsOah / LocationOah
          validated by the HL7 FHIR Validator against both
                                         │
                       River Health Brief ── OAH Catalogue of Measures (real entries)
```

---

## 5. FHIR design (the Track 7 core)

### 5.1 Sign → OAH indicator mapping (ConceptMap `citizen-sign-to-oah`)

| Citizen chip | `citizen-sign` code (value) | OAH `TemporaryOahSystem` code (Observation.code) | Equivalence |
|---|---|---|---|
| Scum or green water | `algal-scum` | `#foam` "Foam/colour/smell" | wider |
| Bad smell | `odour` | `#foam` | wider |
| Foam | `foam` | `#foam` | wider |
| Dead fish | `dead-fish` | `#fish` | wider |
| Many mosquitoes | `mosquitoes` | `#diptera` "Diptera (specially Culicidae and Psycodidae)" | wider |
| Stagnant water | `stagnant-water` | `#hydrology` "flow type…" | wider |
| Oily sheen | `oil-sheen` | — (proposed new OAH concept) | unmatched |
| Sewage or discharge | `sewage` | — (proposed; lab follow-up `#coliforms`) | unmatched |
| Litter | `litter` | — (proposed) | unmatched |
| Everything looks fine | `all-clear` | the indicator checked, value **absent** | — |

Six of nine problem signs map to existing OAH concepts. The three unmatched ones are a concrete, useful **contribution proposal** back to the OAH guide.

### 5.2 Profiles (FSH, compiled with SUSHI)

- `StreamProofTrustedObservation` : parent `ObservationIndicatorsOah`
  - `status` = final (inherited). Only the gate's Expert-verified+ records are ever exported, so nothing unverified can enter OAH systems.
  - `value[x]` = CodeableConcept from `citizen-sign` (or SNOMED CT 2667000 |Absent| for all-clear)
  - component slices: `evidence-grade` (CodeableConcept), `evidence-score` (Quantity, UCUM `{score}`), `trust-level` (CodeableConcept), `independent-corroborations` (Quantity `{count}`), `permitted-use` 0..* (CodeableConcept)
- `StreamProofLocation` : parent `LocationOah`. `identifier` = site id (stream + 100 m cell), position coarsened to about 100 m.
- `StreamProofProvenance` : parent Provenance. `policy` 1.. = the trust-level CodeSystem's canonical; `agent.who` is a pseudonymous identifier only.
- CodeSystem `trust-level` with property `permits` (code, multiple values). **This is the permitted-use matrix as data.**
- CodeSystems `citizen-sign`, `evidence-attribute`, `evidence-grade`, `permitted-use`; ConceptMap `citizen-sign-to-oah`.

### 5.3 Validation proof (shown in the video)

`java -jar validator_cli.jar bundle.json -version 4.0.1 -ig <OAH guide compiled by SUSHI> -ig <StreamProof add-on>`. Target: **0 errors, 0 warnings against `ObservationIndicatorsOah`**. Saved output goes in `fhir/validation/`. The OAH repo has no licence, so it is fetched and compiled at validation time, never copied into this repo.

---

## 6. Catalogue of Measures in the brief

The brief's "suggested next step" column cites real entries: measure name, dimension (morphological, hydrological, chemical, ecological, social) and the catalogue's own limitations line. A mapping table `sign → catalogue measures` lives in `data/measures-oah.json`, with a page reference per entry. Wording: "Matched from the OneAquaHealth Catalogue of Measures (OneAquaHealth, 2026); the final choice belongs to the DSS and the municipality."

## 7. DipteraCAST link (interface, honest)

- **Out:** `GET /o/export/diptera-ground-truth` returns expert-verified `#diptera` presence and verified all-clear absence, with site, date and grade. Formats: FHIR Bundle and CSV. Only Expert-verified records pass the gate. This is exactly the field-validated data that models trained on unbalanced ecological sets (DipteraCAST's own stated challenge) need.
- **In (optional):** a slot for a DipteraCAST site prediction as one context line in grading, shown to the expert but **not counted in the grade**. Labelled "interface only; DipteraCAST is not public".

## 8. Five cities, six languages

A city switcher (Coimbra, Benevento, Ghent, Oslo, Toulouse) loads each city's main stream from OpenStreetMap (ODbL) and weather from Open-Meteo. Chips, reasons, safety text and missions come in PT, IT, FR, NL, NO and EN, translated by the team (and flagged "machine-assisted, reviewed by the team" if used). Feio's Coimbra stays the hero demo.

## 9. Adoption: OAH's "exploitable result" test and FAIR

| OAH test | StreamProof answer |
|---|---|
| Clear need | Track 3 brief: citizen observations are "inconsistent and error-prone". Authorities can't act on data of unknown quality. |
| Defined users | Citizens and schools (report), OAH partner ecologists (verify), municipalities (brief), public-health units (advisory flags), DipteraCAST/ENORA (ground truth). |
| Concrete value | Reviewers handle only the flagged reports (Baker's layered model); FHIR records drop into OAH systems; verified ground truth for DipteraCAST. |
| Long-term maintenance | Open-core: the rule files and add-on profiles are open, and a hosted verification service is the paid layer. Proposed as a module for the HL7 Europe OAH guide, so it outlives the project. |

| FAIR | How |
|---|---|
| Findable | Canonical URLs, identifiers on every record and site |
| Accessible | Open FHIR REST and published JSON definitions |
| Interoperable | OAH FHIR guide, SNOMED CT, UCUM, ConceptMap to OAH codes |
| Reusable | Provenance chain, licence on definitions, permitted-use rules carried in each record |

## 10. Prior-art positioning (put this paragraph in README and Devpost)

> Trust in citizen-science data is an old problem. Alabri & Hunter (IEEE e-Science 2010) combined quality checks with trust metrics. Baker et al. (2021) reviewed 259 schemes and recommended layered verification: rules or the community check most records, experts check the flagged ones. StreamProof implements that recommendation and adds two things we did not find in either: a **machine-readable rule for what each trust level may be used for**, and **carrying grade, trust level and permitted uses inside standard FHIR records** that conform to the OneAquaHealth guide.

---

## 11. Raising the odds beyond the product (honest tactics only)

| Tactic | Why it scores | Who acts |
|---|---|---|
| Submit by Oct 4 ~12:00 PDT, 9 h early | Avoids Devpost failures at the deadline | User |
| Video: first 20 s shows the gate refusing an export, then 0 errors against the **OAH** profiles | Judges score the video before the repo | User records, script in §13 |
| Track alignment statement names the OAH guide by its canonical URL | Datta recognises his own work instantly | Text in §14 |
| Thumbnail and gallery image: the River Health Brief with an advisory box | Gallery browsing | User |
| Repo: README first screen = pitch + proof table + 1 command to run | Judges rarely read code | Build step |
| Optional: open a friendly issue on `hl7-eu/oah` proposing the trust add-on, linked from Devpost | Shows real adoption intent to the guide's authors | **User only** (it's public posting) |
| Q&A appendix: answers to the 12 hard questions in §15 | Prevents score drops in follow-up | Ready below |
| LinkedIn post after submitting, tagging @OneAquaHealth (no vote-asking) | Visibility for OAH's communications team | User |

**Not done, at any cost:** fake metrics or users, claiming an OAH integration that isn't built, copying OAH's unlicensed files into the repo, vote trading, messaging judges privately to lobby.

---

## 12. Scorecard and odds

| Criterion (weight) | Target | What drives it |
|---|---|---|
| Impact & alignment (30%) | **9.2** | OAH guide + Catalogue + DipteraCAST + 5 cities + One Health advisory |
| Innovation (20%) | **8.8** | Permitted-use rules as FHIR data, enforced and carried; honest prior-art position |
| Technical (20%) | **9.4** | Conforms to the official OAH profiles, validator 0 errors, tests, calibration report |
| UX (15%) | **8.6** | Real photos, 6 languages, 60-second flow, live URL |
| Feasibility & scale (15%) | **9.0** | Open-core, exploitable-result answers, module for the HL7 Europe guide |
| **Weighted** | **≈ 9.04** | |

Monte Carlo (40k runs; field mean 5.9, sd 1.0; judge noise ±0.55; self-scored, so likely optimistic):

| Weighted score | 1st, 60 entries | 1st, 100 entries | 1st, 150 entries |
|---|---|---|---|
| 8.4 | 44% | 32% | 24% |
| **9.0 (target)** | **74%** | **64%** | **56%** |
| 9.2 | 82% | 74% | 67% |
| 9.4 | 88% | 83% | 76% |

If judges agree strongly (noise ±0.35), a 9.0 score gives about 79% at 100 entries. **80% is reachable only at the top of this range. It is a target, not a promise.**

---

## 13. Video script (4:00)

| Time | Screen | Voice-over (summary) |
|---|---|---|
| 0:00–0:20 | Export refused by the gate → then validator "0 errors vs ObservationIndicatorsOah" | "A rumour and a verified report look the same to a computer. StreamProof fixes that inside OneAquaHealth's own FHIR standard." |
| 0:20–0:45 | Coimbra stream map, language switch PT → EN | Problem in one line (Track 3 brief), five cities |
| 0:45–1:25 | Citizen reports with a real photo; grade + 7 reasons | 60 seconds, plain words, "all clear" counts the same |
| 1:25–2:00 | Reviewer: nearby evidence, mission 400 m upstream, gate panel | Layered verification (Baker 2021), people not reports |
| 2:00–2:30 | Verify → Decision-grade → brief with real Catalogue measures + advisory | Feio's catalogue; "may warrant inspection", never diagnosis |
| 2:30–3:10 | FHIR: OAH `#diptera` code, components, `permits` CodeSystem, validator vs OAH profiles | "We extend the HL7 Europe OAH guide; the use rules are data any system can enforce." |
| 3:10–3:35 | DipteraCAST ground-truth export | Verified field data for ENORA's model |
| 3:35–4:00 | Certificate + tamper check → closing card | Recognition; honest notes; repo URL |

## 14. Devpost text (use only once built)

- **Track alignment:** "Track 7. StreamProof is a trust and provenance add-on to the HL7 Europe OneAquaHealth FHIR Implementation Guide (`http://hl7.eu/fhir/ig/oah`). Our profiles derive from `ObservationIndicatorsOah` and `LocationOah` and validate with 0 errors against them. We add what the guide does not yet carry: evidence grade, trust level, provenance and a published, machine-readable permitted-use rule."
- **What it does:** add OAH codes, DipteraCAST export, Catalogue measures, 5 cities, 6 languages.
- **Accomplishments:** "Validated against the official OAH profiles"; the gate and the published rule file can't disagree (test).
- **What's next:** propose the three unmatched signs and the trust add-on to the HL7 Europe OAH guide; calibrate thresholds with OAH ecologists; connect DipteraCAST for real.

## 15. Hard questions and honest answers

1. *Why not just use iNaturalist research grade?* Community agreement isn't accuracy for hard taxa (lichen and termite studies), and it doesn't say what a record may be used for. We add both.
2. *Isn't this Alabri & Hunter 2010?* They scored trust. We turn trust into enforceable use rules carried in a health-data standard.
3. *Why FHIR for environmental data?* OAH's own guide is FHIR. Health partners already speak it (One Digital Health).
4. *Your OAH mapping is "wider", not exact.* Correct. The sign goes in `value`, the OAH indicator in `code`, and the three unmatched signs are proposed as new concepts.
5. *Who sets the thresholds?* They are configurable defaults, explicitly to be calibrated with OAH ecologists. The calibration report shows the current limits.
6. *Can a group fake a signal?* It needs different people, spread in time or place, a daily cap, weighting by track record, and an expert for decision-grade.
7. *Privacy and GDPR?* Pseudonyms, a coarse location in FHIR, an identity vault, and erasure that keeps the signed evidence valid. Real deployment needs DPO review.
8. *Is the advisory flag a health claim?* No. It says "may warrant inspection" and is only possible at decision grade.
9. *Is it integrated with the OAH app?* No. That is the proposed adoption path, said plainly.
10. *Is DipteraCAST connected?* An interface and export only; the model isn't public.
11. *Why should OAH maintain this?* Open add-on to their own guide plus an optional hosted service. It answers their exploitable-result test.
12. *Blockchain?* No. An Ed25519 signature over a de-identified hash: tamper-evident, simple, erasable identity.

---

## 16. Build order (when building is approved)

| Step | Work | Est. | Cut line |
|---|---|---|---|
| 1 | Fetch + SUSHI-compile the OAH guide; StreamProof profiles in FSH; FHIR builder emits OAH codes/values; validate vs OAH | 3.5 h | **Must** |
| 2 | `trust-level` CodeSystem with `permits`; gate loads it; consistency test | 1.5 h | **Must** |
| 3 | Catalogue of Measures mapping in the brief | 1.5 h | **Must** |
| 4 | DipteraCAST ground-truth export + context slot | 1.5 h | **Must** |
| 5 | 5-city switcher + 6-language strings | 2 h | Should |
| 6 | Prior art, FAIR, exploitable-result sections in README/Devpost; calibration report | 1.5 h | Should |
| 7 | Live deployment (needs the user's hosting account) | 1 h | Should |
| 8 | Real photos, video recording, Devpost submit | user | **Must** |

Total ≈ 12.5 h of build plus recording. Keep a commit after each step so a submittable version always exists. Internal deadline: **Oct 4, 12:00 PDT**.

---

## 17. Judges: public professional research (2026-10-03)

*Public professional sources only (official bios, institutional pages, IEEE pages). No private data, no social-media scraping. "Not found" means nothing reliable was public; don't guess.*

### 17.1 Panel shape

- **Consortium insiders (5):** Feio (University of Coimbra, the project coordinator), Koutalieris (ENORA), Nikolov (SYNYO), op den Akker and Freitas (SHINE 2Europe). All their organisations are OAH partners on CORDIS (project 101086521; partners include HL7 Europe and EFMI; 2023-01-01 → 2026-12-31).
- **Standards (1):** Datta: HL7 Fellow, co-wrote HL7's OAH FHIR article.
- **IEEE / industry (4):** Kodgi (Oracle; IEEE EMBS and Computer Society, Orange County), González (IEEE Blockchain), Sharma (Persistent Systems), Panyam (IEEE).
- **Implication:** at least half the panel will judge *fit with OAH's own tools and science*. That is the 30% Impact criterion, and it decides the result. The project ends 2026-12-31, so post-project survival matters to these judges personally.

### 17.2 Dossier

| Judge | Public background | Link to OAH | Will reward | Will penalise | Show them | Likely question |
|---|---|---|---|---|---|---|
| **Maria João Feio** | Researcher, Univ. Coimbra (FCTUC) and MARE. Ecological assessment of rivers (developed assessment methods), urban aquatic ecosystems, metagenomics, **participatory science**; takes primary-school pupils on stream field trips; canoed the Mondego. | Project coordinator; author of the Catalogue of Measures | Respect for indicators and protocols; real measures; schools and citizens | Ecological naivety; made-up measures; "AI says the river is sick" | Coimbra stream, OAH indicator codes, real Catalogue entries, school observers, all-clear credit | "How does your grade relate to our field protocols and indicators?" |
| **Gora Datta** | FHL7, SMIEEE, SMACM; UC Berkeley teaching faculty; pioneer of mobile-health standards; chairs IEEE P3228 (now P3271.01); leads a US federally funded public-health informatics workforce programme; founder and CEO of CAL2CAL. | Co-wrote HL7's OAH FHIR article (plan: an OAH guide using the Gravity and Helios accelerators) | Small, correct FHIR that conforms to the OAH guide; Provenance; public-health framing | Invented CodeSystems; FHIR that only looks valid; overclaims | Validator 0 errors **against ObservationIndicatorsOah**; ConceptMap to OAH codes; the `permits` CodeSystem | "Why not just use the OAH guide?" (answer: we do, and add trust) |
| **George Koutalieris** | Chief Business & Innovation Officer, ENORA Innovation (Greek SME, founded 2019: AI/ML, big data, wireless, "trustworthiness enabling technologies"). Computer & informatics engineer (Patras). | **ENORA built DipteraCAST** | Trustworthy AI and data; exploitation and business model; a hook into DipteraCAST | AI hype with no human oversight; no revenue path | DipteraCAST ground-truth export; human-in-the-loop; open-core model | "Who pays for this, and how does it help our models?" |
| **Alexander Nikolov** | Research Manager & Project Coordinator, SYNYO (Austria). European Studies and Economics; Business Informatics; product and IT project management, service platforms, dissemination. | SYNYO is an OAH partner and introduced OAH and the hackathon at IEEE events (its exact OAH work package isn't public) | Platform feasibility, maintenance, dissemination, clear adoption path | Vague "integration" claims | Adoption table (need, users, value, maintenance); how it sits beside the Citizen Science App | "Who maintains this after December 2026?" |
| **Harm op den Akker** | Project Manager, SHINE 2Europe. PhD (Univ. Twente) on tailored mobile coaching for healthy living; human–computer interaction for personalised care; technical coordinator of the H2020 project *Council of Coaches*. | SHINE 2Europe is an OAH partner | Engagement design, feedback loops, personalisation, usability | Points-and-badges gimmicks; dead-end flows | Report card with reasons + "what would strengthen this"; status tracker; missions; recognition | "Why would someone report a second time?" |
| **Ângela Freitas** | Project Manager / Researcher, SHINE 2Europe; Guest Assistant Professor, Univ. Coimbra. MSc GIS & spatial planning (Porto); PhD candidate on municipal health planning; urban health, health impact assessment, health equity, participatory research. | SHINE 2Europe is an OAH partner | GIS correctness; usefulness to municipalities; equity; participation | Maps that mislead; privacy leaks; ignoring under-served areas | River Health Brief for a municipality; ~100 m public locations; missions to under-observed reaches | "How does a municipality act on this, and fairly across neighbourhoods?" |
| **Pradyumna Kodgi** | Product Manager, Oracle; Vice Chair, IEEE EMBS Orange County; Secretary, IEEE Orange County Computer Society (both co-organisers). Little else public. | Organiser side (IEEE OC) | Product clarity, a working demo, health-tech relevance | A demo that doesn't run; unclear user | 60-second end-to-end flow; clear two-portal product | "Who is the user, and what does v1 ship?" |
| **David E. González** | IEEE Blockchain Technical Community Treasurer; SMIEEE; retired data scientist and technical project manager (NSWC Corona, US Navy); president of Imzadi Consulting; past chair of IEEE SusTech 2022; IEEE Planet Positive 2030; co-chair of IEEE-SA **P7800** (sustainability in professional practice). | IEEE Blockchain is a co-organiser | Honest tamper-evidence; data rigour; sustainability framing | "Blockchain" buzzwords without need | Signed record + live tamper check, and why a signature is enough | "Why not put it on a blockchain?" |
| **Vinay Sharma** | Program Manager, Persistent Systems. *No further reliable public info found.* | n/a | Probably delivery and program feasibility | n/a | Build plan, tests, live URL | n/a |
| **Sreekanth Reddy Panyam** | Senior Member, IEEE. *No further reliable public info found.* | n/a | Probably technical soundness | n/a | Architecture + tests | n/a |

### 17.3 Additions to the plan from this research

1. **Equity line in the brief (Freitas):** show reaches with few or no reports as "under-observed" and point missions there, so evidence doesn't only follow wealthy, well-walked areas.
2. **Engagement loop (op den Akker):** keep "what would strengthen this" plus status changes as the reason to come back. No points or leaderboards; say why (incentive design, equal credit for all-clear).
3. **Post-project maintenance (Nikolov, Feio):** answer the "after 31 Dec 2026" question explicitly. The add-on lives in the HL7 Europe guide; the hosted service is open-core.
4. **Protocol respect (Feio):** the grade says "evidence quality", never "ecological status". Formal assessment stays with OAH field protocols. Link the CSSI paper as the future path for volunteer biotic scoring.
5. **Blockchain question (González):** have a one-line answer ready (plan §15 Q12).
6. **UiO's OAH page** states the aim to test "whether the observations can be used as indicators for early warning". StreamProof is the quality gate that makes that test possible. Quote this in the Impact section.

Sources: Devpost judges list; CORDIS project 101086521; pages.uc.pt and mare-centre.pt (Feio); engagestandards.ieee.org bio (Nikolov); hl7news.hl7.org/?p=683 and sagroups.ieee.org/3228 (Datta); ictagrifood.eu and zsi.at (ENORA); oneaquahealth.eu DipteraCAST article; utwente.nl TechMed biography (op den Akker); cienciavitae.pt (Freitas); site.ieee.org/miami and sagroups.ieee.org/7800 (González); r6.ieee.org/ocs (IEEE OC EMBS); med.uio.no OAH page.
