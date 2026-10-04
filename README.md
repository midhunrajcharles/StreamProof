# StreamProof

**A trust layer for citizen stream observations: from a phone photo to evidence a city can act on.**

Entry for the [OneAquaHealth IEEE Global Hackathon](https://oneaquahealth-ieee-hackathon.devpost.com/), **Track 7: Digital Health Standards**.

Citizens already photograph polluted or stagnant streams. The hard part is what comes next: an authority can't tell which reports to trust, a public-health system can't read them, and nothing says what a given report is allowed to be used for. StreamProof fills that gap:

1. **Grades** every report A–D from seven checks, each with a sentence a person can read and argue with.
2. **Strengthens** reports through an evidence graph: independent corroboration by neighbours, community missions that point people 400 m upstream, and one-tap expert verification.
3. **Decides what each trust level may be used for** (the permitted-use matrix). Every output asks this gate first.
4. **Exports** verified evidence as **FHIR R4** (Observation + Location + Provenance) with the trust level and permitted uses inside the record. Every record is checked with the HL7 validator against the **official HL7 Europe OneAquaHealth profiles** (`ObservationIndicatorsOah`, `LocationOah`): 0 errors, 0 warnings.
5. **Recognises** the people who produced the evidence with a signed, tamper-evident contribution record.

## Run it

```bash
pip install -r requirements.txt
python -m app.seed                       # demo data on the real Ribeira de Coselhas, Coimbra
python -m uvicorn app.main:app --port 8740   # the API only; opening it in a browser sends you to the web app
```

Then the web app (landing page + installable PWA), which proxies `/api` to the server above:

```bash
cd web && npm install && npx next dev -p 3200   # http://localhost:3200 (landing), /report, /review, /brief, /account ...
```

**Try** on the landing page asks who you are. Citizens sign in, create an account or report without one, and land on their own dashboard (`/home`: stars, missions, recent reports). Organisations sign in or create one and land on the organiser dashboard (`/dashboard`: queue, signals, missions). One browser can hold both roles; each signs out separately.

**Any city.** The five OneAquaHealth cities work offline. Any other city can be searched (Photon, then Nominatim): its named streams are fetched from OpenStreetMap and its last 45 days of rainfall from Open-Meteo, then cached in `var/`.

**45 languages.** English, the other 23 official EU languages, Norwegian, Russian and Ukrainian, then 18 world languages (Arabic, Chinese, Filipino, Hebrew, Hindi, Indonesian, Japanese, Korean, Malay, Malayalam, Persian, Swahili, Tamil, Telugu, Thai, Turkish, Urdu, Vietnamese), across the citizen screens, organiser screens and landing page. The language picker is in the app header and the landing page menu. `cd web && python tools/check_i18n.py` reports any missing strings or placeholder mismatches per language. Arabic, Hebrew, Persian and Urdu are mirrored right to left.

The demo story (demo logins are in `app/seed.py`; in demo mode they also open without a password):

1. As Maria (citizen), report *stagnant water + many mosquitoes* near the footbridge with a photo. The card shows grade A/B with seven reasons and links to an earlier school report (Community-supported).
2. As the reviewer, open the report in **Review**. Try **Export FHIR** and the permitted-use gate blocks it: a Community-supported record can't leave the system.
3. **Verify** it. Two different people's reports are now expert-verified within 500 m and 14 days, so the signal becomes **Decision-grade**, and the **River Health Brief** shows an advisory flag.
4. Export the FHIR Bundle. Back as Maria, download the signed certificate and change one value on the verify page to see tampering detected. Her **Account** page shows the stars she earned for checked reports.

Tests: `python -m pytest` (84 tests: engine rules, the JSON API including the full story, accounts and sign-in, city search with the network faked, the OAH add-on and the DipteraCAST export). Web app checks: `web/tests/` (end-to-end, accessibility, screenshots).
FHIR: `python tools/build_ig.py` compiles the add-on (`ig/`) against the OAH guide, then `python tools/validate_fhir.py` runs the HL7 validator (needs Node, Java 11+, the HL7 `validator_cli.jar` in `tools/`, and network for SNOMED CT; the OAH guide is fetched, never copied into this repository).

## How it works

```
Citizen PWA ──► Report service ──► Evidence engine (grade A–D + reasons)
                                          │
                     ┌────────────────────┴────────────────────┐
              corroboration                              expert queue
          (different person, spread in            (remote or field check;
           time/place, weighted by track           can skip the community step)
           record, capped per account/day)                    │
                     └──────────────► Evidence graph ◄─────────┘
                                          │
                               PERMITTED-USE GATE (every output)
             ┌──────────────┬─────────────┼──────────────┬───────────────┐
        org dashboard   public map   FHIR R4 bundle   certificate   advisory flag
         (Assessed+)   (Community+)  (Expert-verified+) (Expert+)   (Decision-grade)
```

| Trust level | Adds permission for |
|---|---|
| Report | triage queue, field-check request, community mission |
| Assessed (A–D with reasons) | organization dashboard, labelled unverified |
| Community-supported | public map as "reported, being checked" |
| Expert-verified | OAH dashboard / DSS input, FHIR exchange, recognition |
| Decision-grade | advisory flag to agencies and public-health partners |

**Decision-grade threshold:** ≥ 2 expert-verified, or ≥ 3 community-supported, reports of the same sign **from different people** within 500 m and 14 days, with at least one expert verification. These are illustrative defaults to calibrate with ecologists, not validated values (`app/config.py`).

### The seven grading checks (`app/grading.py`)

| Check | Points | Example reason |
|---|---|---|
| Photo usable (size, sharpness, exposure) | 30 | "Photo is clear and well exposed." |
| Photo capture time vs report time | 10 | "Photo has no capture time (common after messaging apps)." |
| GPS accuracy | 12 | "Location confirmed (GPS accuracy 7 m)." |
| On a mapped stream | 8 | "On Ribeira de Coselhas (11 m from the mapped channel)." |
| Nearby agreement / contradiction | 20 | "1 other person reported the same within 500 m." |
| Weather context (real rainfall) | 10 | "Consistent with weather: 4.5 mm of rain in 7 days." |
| Observer track record | 10 | "New observer: no history yet." |

Bands: A ≥ 85, B ≥ 70, C ≥ 50, D < 50. No photo caps the grade at C. The grade is rule-based so every point can be explained. An AI photo suggestion can be shown to the expert, but it never changes the grade.

### A trust add-on to the OneAquaHealth FHIR guide (`app/fhir.py`, `ig/`, `fhir/`)

The HL7 Europe OAH guide (`http://hl7.eu/fhir/ig/oah`) says *what* was observed, not *how far to trust it* or *what it may be used for*. StreamProof adds exactly that, as profiles that derive from the guide's own:

- **Observation** (`StreamProofObservation` ← `ObservationIndicatorsOah`): `code` is the OAH indicator observed (`#diptera`, `#foam`, `#fish`, `#hydrology` from `TemporaryOahSystem`), `value` is what the citizen saw (`citizen-sign`), and components carry the evidence grade, score, trust level, independent corroborations and every permitted use. Signs the guide has no concept for yet use StreamProof's `proposed-oah-indicator` codes (oil sheen, sewage, litter, general visual check), offered to the guide as new concepts. The ConceptMap `citizen-sign-to-oah` publishes the mapping: six of nine problem signs match an OAH indicator.
- **Location** (`StreamProofLocation` ← `LocationOah`): a site id (stream plus 100 m cell) and a position coarsened to about 100 m.
- **Provenance** (`StreamProofProvenance`): the citizen authored it (pseudonym only), the engine assessed it (Device), an expert verified it (Practitioner pseudonym, on behalf of the Organization), with the organization's signature. Its `policy` is the published `trust-level` CodeSystem.
- **The permitted-use rule is data.** The CodeSystem `trust-level` has a `permits` property (one Coding per allowed use). The gate in `app/permitted_use.py` loads that file when it starts, so the published rule *is* the gate, and any system that receives a record can enforce the same rule. Set `STREAMPROOF_RULES` to run under another organisation's rule file.
- **The profile itself refuses unverified records** (invariant `sp-obs-1`): nothing below Expert-verified can validate, even if an app skipped its own gate. `tools/validate_fhir.py` proves it with a negative control.
- No Patient resource, no names, no contact details, no exact GPS.
- Sources are FSH in `ig/input/fsh/`; `tools/build_ig.py` compiles them (SUSHI) into `fhir/definitions/`: 6 CodeSystems, 4 ValueSets, 1 ConceptMap, 3 profiles.

### Catalogue of Measures in the brief (`app/catalogue.py`, `data/measures-oah.json`)

The brief's "Suggested next steps" cite the real **OneAquaHealth Catalogue of Measures** (D2.4, Dias, Serra and Feio, 2025, CC BY 4.0, [doi:10.5281/zenodo.20040211](https://doi.org/10.5281/zenodo.20040211)): each sign maps to numbered Catalogue entries (for example sewage → 4.2.2 *Sewer system and point-source improvements*, p. 42; mosquitoes → 4.3.1 *Removing barriers*, p. 47, and 4.3.5 *Constructed riffles*, p. 54) with the Catalogue's own title, its "line" (first = essential, second = structural, third = social), the printed page, what it does and its stated limits. For mosquito and stagnant-water signs the brief also repeats the Catalogue's own caution that rain gardens, swales and retention ponds can breed mosquitoes if they hold water. First-response checks are listed apart, labelled as not from the Catalogue (it covers rehabilitation, not emergency response). A test (`tests/test_catalogue.py`) checks every title and quoted phrase against the Catalogue text, so a wrong page number fails. The Catalogue itself says citizen-science data "often needs expert validation" (section 4.4.2, p. 91): StreamProof is that validation layer.

### DipteraCAST interface (`app/dipteracast.py`)

Expert-verified records that say something about Diptera leave as labelled ground truth for the DipteraCAST model (OneAquaHealth, built by ENORA Innovation): a verified mosquito report is `present`; a verified all-clear is `not_seen` (a visual check, not a trap or dip-sample survey, so never called "absent"). Download CSV or a FHIR Bundle (the same OAH-profiled Observations, code `#diptera`) from the organiser dashboard or `GET /api/export/diptera-ground-truth?format=json|csv|fhir`. Every record passes the gate (use `ground_truth`, from Expert-verified up); no observer is named. In the other direction there is an optional prediction slot, shown to the expert as one context line and never counted in the grade. **It is an interface only: DipteraCAST is not public, so nothing is loaded unless you supply `dipteracast-predictions.json`.**

## Proof of integration

| Claim | Where it lives | How to check |
|---|---|---|
| FHIR output conforms to the **official OAH profiles** | `fhir/validation/validator-output.txt`, `validation-outcome.json`, `fhir/examples/` | `python tools/validate_fhir.py` → HL7 FHIR Validator 6.10.4 against `hl7.eu.fhir.oah` and the add-on: 4 example Bundles + 14 definitions, 0 errors, 0 warnings |
| An unverified record can't validate | `ig/input/fsh/profiles.fsh` (`sp-obs-1`), `fhir/validation/negative-control-outcome.json` | the same run: the control Bundle is rejected by `sp-obs-1` and by nothing else |
| The gate *is* the published rule | `fhir/definitions/CodeSystem-trust-level.json` (`permits`), `app/permitted_use.py` | `tests/test_oah.py` (gate = file, a changed file changes the gate, unknown uses fail loudly) |
| Verified Diptera ground truth leaves, nothing else does | `app/dipteracast.py`, `/api/export/diptera-ground-truth` | `tests/test_oah.py::test_ground_truth_*`; the Ground truth card on the organiser dashboard |
| Exports are blocked below Expert-verified | `app/permitted_use.py`, `app/fhir.py` (`require`) | `tests/test_engine.py::test_fhir_export_blocked_below_expert`; the Export button on a Community-supported report |
| Corroboration can't be gamed by one person | `app/evidence.py` (`_independent`, daily cap, distinct-observer threshold) | `test_same_observer_cannot_corroborate_self`, `test_threshold_counts_people_not_reports` |
| Certificates are tamper-evident | `app/signing.py` (Ed25519 over a SHA-256 of the de-identified record) | `/verify/<id>` in the web app: edit any value → "hash mismatch"; `test_signature_detects_tampering` |
| Erasure doesn't break evidence | `app/store.py` (`vault` table, `forget_observer`) | `test_forget_keeps_signed_evidence` |
| Real stream geometry | `data/streams.json` (OpenStreetMap ways, ODbL) | upstream missions walk along this line: `test_mission_points_upstream` |
| Real weather context | `data/weather_coimbra.json` (Open-Meteo, CC BY 4.0) | reasons quote the rainfall total |
| Uploaded photos lose their EXIF GPS | `app/imaging.py` (`strip_metadata`) | `test_photo_is_stripped_of_exif` |

## Honest caveats

- **Synthetic demo data.** Observers, reports and verifications in the seed are invented and labelled "(synthetic)". The stream line (OpenStreetMap) and rainfall (Open-Meteo) are real.
- **Not connected to OneAquaHealth systems.** We found no public API for the OAH Citizen Science App. Integration is the proposed adoption path: StreamProof would sit between the app and the OAH dashboards/DSS. DipteraCAST is not public: the export is real, the prediction slot is an empty interface. The brief's measures are matched to the real OneAquaHealth Catalogue by the team, not by the Catalogue's authors; wording is paraphrased and the choice belongs to the DSS and the municipality. The Catalogue has no measure for foam or odour, so those entries say they are the team's inference.
- **Thresholds are not validated.** Grade weights, the 500 m / 14-day window and the advisory threshold are configurable defaults to calibrate with ecologists.
- **Advisory, never diagnostic.** Flags say conditions "may warrant inspection". They make no claim about disease.
- **Accounts are demo-grade.** Email + password accounts (scrypt hashes, in-memory rate limits); anyone can create an organisation, there is no email confirmation or password reset by email, and demo mode lets the demo accounts in without a password. A deployment would use the organisation's identity provider and would need proper GDPR advice.
- **Machine-assisted translations.** The non-English languages were written with machine assistance and have not yet been reviewed by native speakers; the app says so next to the language picker.
- **Other cities depend on OpenStreetMap.** A city outside the five OAH cities gets only the streams OSM has mapped and named; if none are mapped, reports still work but the "on a stream" check can't score.
- **The OAH guide is compiled, not copied.** `hl7-eu/oah` has no licence file, so `tools/build_ig.py` clones and compiles it on your machine and installs it in the local FHIR package cache. Its CI build page is not published, so there is no official package to depend on yet.
- **"Not seen" is not "absent".** An all-clear is a citizen's visual check. It is exported to DipteraCAST as `not_seen` with that basis stated.
- **Canonical URLs.** CodeSystem URLs use this repository's GitHub Pages base as identifiers. They don't resolve to a page yet; the definitions themselves are the JSON files in `fhir/definitions/`.

## Project layout

```
app/              engine (grading, evidence, permitted_use, fhir, dipteracast, signing, brief, recognition), JSON API (api.py, accounts.py)
data/             real stream geometry (OSM) and rainfall (Open-Meteo)
ig/               the add-on as FSH (profiles, CodeSystems incl. the permitted-use rule, ConceptMap)
fhir/             compiled definitions, example Bundles, validator output
tests/            84 tests: engine rules, the JSON API and the demo story, accounts, cities, the OAH add-on and DipteraCAST
tools/            build_ig.py, validate_fhir.py, refresh_weather.py (+ local FHIR tooling, not committed)
web/              Next.js: landing page app/(site), web app app/(app), shared ui/, checks in tests/, tools/
docs/             STREAMPROOF-WINNING-PLAN.md, screenshots/ (+ source/: concept files, not committed)
research/         planning research runs (not committed)
var/              runtime: demo database, signing key, photos (not committed)
```

## Data and licences

- Stream geometry © OpenStreetMap contributors, ODbL. City search by Photon (komoot) and Nominatim, both on OpenStreetMap data.
- Weather data by Open-Meteo.com, CC BY 4.0.
- Code: MIT (see `LICENSE`).
