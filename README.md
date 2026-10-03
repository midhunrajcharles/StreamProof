# StreamProof

**A trust layer for citizen stream observations: from a phone photo to evidence a city can act on.**

Entry for the [OneAquaHealth IEEE Global Hackathon](https://oneaquahealth-ieee-hackathon.devpost.com/), **Track 7: Digital Health Standards**.

Citizens already photograph polluted or stagnant streams. The hard part is what comes next: an authority can't tell which reports to trust, a public-health system can't read them, and nothing says what a given report is allowed to be used for. StreamProof fills that gap:

1. **Grades** every report A–D from seven checks, each with a sentence a person can read and argue with.
2. **Strengthens** reports through an evidence graph: independent corroboration by neighbours, community missions that point people 400 m upstream, and one-tap expert verification.
3. **Decides what each trust level may be used for** (the permitted-use matrix). Every output asks this gate first.
4. **Exports** verified evidence as **FHIR R4** (Observation + Location + Provenance) with the trust level and permitted uses inside the record. It passes the official HL7 validator with 0 errors and 0 warnings.
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

The demo story (demo logins are in `app/seed.py`; in demo mode they also open without a password):

1. As Maria (citizen), report *stagnant water + many mosquitoes* near the footbridge with a photo. The card shows grade A/B with seven reasons and links to an earlier school report (Community-supported).
2. As the reviewer, open the report in **Review**. Try **Export FHIR** and the permitted-use gate blocks it: a Community-supported record can't leave the system.
3. **Verify** it. Two different people's reports are now expert-verified within 500 m and 14 days, so the signal becomes **Decision-grade**, and the **River Health Brief** shows an advisory flag.
4. Export the FHIR Bundle. Back as Maria, download the signed certificate and change one value on the verify page to see tampering detected. Her **Account** page shows the stars she earned for checked reports.

Tests: `python -m pytest` (54 tests: engine rules, the JSON API including the full story, accounts and sign-in). Web app checks: `web/tests/` (end-to-end, accessibility, screenshots).
FHIR check: `python tools/validate_fhir.py` (downloads nothing itself; needs Java 11+ and the HL7 `validator_cli.jar` in `tools/`).

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

### FHIR R4 profile (`app/fhir.py`, `fhir/`)

- One **Observation** per sign. `code` comes from the open `stream-indicator` CodeSystem, and `subject` is a **Location** coarsened to about 100 m.
- **Components** carry the evidence grade, score, trust level, independent corroborations and every permitted use, so the trust metadata travels with the data.
- Three **Provenance** resources record the chain: the citizen authored it (pseudonym only), the engine assessed it (Device), and an expert verified it (Practitioner pseudonym, on behalf of the Organization), with the organization's signature.
- No Patient resource, no names, no contact details, no exact GPS.
- Open definitions in `fhir/definitions/`: 5 CodeSystems + 1 ValueSet.

## Proof of integration

| Claim | Where it lives | How to check |
|---|---|---|
| FHIR output is valid R4 | `fhir/validation/validator-output.txt`, `validation-outcome.json` | `python tools/validate_fhir.py` → HL7 FHIR Validator 6.10.4, 7 files, 0 errors, 0 warnings |
| Exports are blocked below Expert-verified | `app/permitted_use.py`, `app/fhir.py` (`require`) | `tests/test_engine.py::test_fhir_export_blocked_below_expert`; the Export button on a Community-supported report |
| Corroboration can't be gamed by one person | `app/evidence.py` (`_independent`, daily cap, distinct-observer threshold) | `test_same_observer_cannot_corroborate_self`, `test_threshold_counts_people_not_reports` |
| Certificates are tamper-evident | `app/signing.py` (Ed25519 over a SHA-256 of the de-identified record) | `/verify/<id>` in the web app: edit any value → "hash mismatch"; `test_signature_detects_tampering` |
| Erasure doesn't break evidence | `app/store.py` (`vault` table, `forget_observer`) | `test_forget_keeps_signed_evidence` |
| Real stream geometry | `data/streams.json` (OpenStreetMap ways, ODbL) | upstream missions walk along this line: `test_mission_points_upstream` |
| Real weather context | `data/weather_coimbra.json` (Open-Meteo, CC BY 4.0) | reasons quote the rainfall total |
| Uploaded photos lose their EXIF GPS | `app/imaging.py` (`strip_metadata`) | `test_photo_is_stripped_of_exif` |

## Honest caveats

- **Synthetic demo data.** Observers, reports and verifications in the seed are invented and labelled "(synthetic)". The stream line (OpenStreetMap) and rainfall (Open-Meteo) are real.
- **Not connected to OneAquaHealth systems.** We found no public API for the OAH Citizen Science App. Integration is the proposed adoption path: StreamProof would sit between the app and the OAH dashboards/DSS. The suggested measures in the brief are illustrative stand-ins for the OAH DSS Catalogue of Measures.
- **Thresholds are not validated.** Grade weights, the 500 m / 14-day window and the advisory threshold are configurable defaults to calibrate with ecologists.
- **Advisory, never diagnostic.** Flags say conditions "may warrant inspection". They make no claim about disease.
- **Accounts are demo-grade.** Email + password accounts (scrypt hashes, in-memory rate limits); anyone can create an organisation, there is no email confirmation or password reset by email, and demo mode lets the demo accounts in without a password. A deployment would use the organisation's identity provider and would need proper GDPR advice.
- **Canonical URLs.** CodeSystem URLs use this repository's GitHub Pages base as identifiers. They don't resolve to a page yet; the definitions themselves are the JSON files in `fhir/definitions/`.

## Project layout

```
app/              engine (grading, evidence, permitted_use, fhir, signing, brief, recognition), JSON API (api.py, accounts.py)
data/             real stream geometry (OSM) and rainfall (Open-Meteo)
fhir/             open CodeSystems/ValueSet, example Bundle, validator output
tests/            54 tests: engine rules, the JSON API and the demo story, accounts
tools/            validate_fhir.py, refresh_weather.py (+ local FHIR tooling, not committed)
web/              Next.js: landing page app/(site), web app app/(app), shared ui/, checks in tests/, tools/
docs/             STREAMPROOF-WINNING-PLAN.md, screenshots/ (+ source/: concept files, not committed)
research/         planning research runs (not committed)
var/              runtime: demo database, signing key, photos (not committed)
```

## Data and licences

- Stream geometry © OpenStreetMap contributors, ODbL.
- Weather data by Open-Meteo.com, CC BY 4.0.
- Code: MIT (see `LICENSE`).
