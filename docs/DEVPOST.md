# Devpost submission text (copy and paste)

Everything below is true of the code in this repository as of commit `629bea7` and was checked. Items in **[YOU]** are things only you can do. Nothing here has been entered on Devpost.

## Step 1: Project overview

**Project name** (60 max)

```
StreamProof
```

**Elevator pitch** (200 max, this one is 180)

```
StreamProof grades and verifies citizen stream reports and writes them in OneAquaHealth's own FHIR profiles, with a machine-readable rule for what each trust level may be used for.
```

**Thumbnail** (3:2, JPG/PNG/GIF, 5 MB max): use `docs/screenshots/desktop-brief.png` (the River Health Brief) or `desktop-card.png`. Crop to 3:2. **[YOU]**

## Step 2: Project details

**Track** (one only): Track 7, Digital Health Standards.

**Track alignment statement**

```
Track 7. StreamProof is a trust and provenance add-on to the HL7 Europe OneAquaHealth FHIR Implementation Guide (http://hl7.eu/fhir/ig/oah). Our profiles derive from ObservationIndicatorsOah and LocationOah, and our example records validate against them with the HL7 FHIR Validator: 0 errors, 0 warnings. We add what the guide does not yet carry: an evidence grade, a trust level, provenance, and a published, machine-readable permitted-use rule. Observation.code is the OAH indicator (for example #diptera from TemporaryOahSystem), and the citizen's sign is the value.
```

**Inspiration**

```
Citizens already photograph polluted or stagnant streams. The hard part is what comes next: an authority can't tell which reports to trust, a public-health system can't read them, and nothing says what a given report is allowed to be used for. The OneAquaHealth FHIR guide says what was observed, but not how far to trust it. That is the gap we fill.
```

**What it does**

```
A citizen reports what they see in about a minute. Every report gets a grade A to D from seven checks (photo, photo time, GPS, on a mapped stream, nearby reports, weather, track record), each with a sentence a person can read and argue with. Reports are strengthened by independent neighbours (counted as people, not reports) and by one-tap expert verification.

A permitted-use gate sits in front of every output: the dashboard, the public map, FHIR exchange, the DipteraCAST export and the advisory flag. The rule behind the gate is not code. It is a published FHIR CodeSystem (trust-level, property "permits") that the app loads at start-up, so any system that receives a record can enforce the same rule.

Verified records are exported as FHIR R4 that conform to the official OneAquaHealth profiles. Observation.code is the OAH indicator, the citizen's sign is the value, and the evidence grade, score, trust level and permitted uses travel inside the record. Our profile also rejects any record below Expert-verified, so an unverified report cannot validate even if an app skipped its own gate (we show this with a negative control).

The River Health Brief gives a municipality the signals, how sure we are, and suggested next steps matched to the real OneAquaHealth Catalogue of Measures, with section and page. Expert-verified Diptera records leave as labelled ground truth (CSV or FHIR) for DipteraCAST. The brief also lists under-observed stretches of the stream and lets an organisation send residents there. People who helped get a signed, tamper-evident contribution record.
```

**How we built it**

```
Backend: Python, FastAPI and SQLite. The evidence engine, evidence graph and permitted-use gate are plain, tested Python (93 tests). Frontend: Next.js 16 and React, an installable PWA with a camera in the photo step, 45 languages (machine-assisted, with Arabic, Hebrew, Persian and Urdu mirrored), and an accessibility audit (axe) that is clean on every page in light and dark.

FHIR: the add-on is written in FHIR Shorthand and compiled with SUSHI against the OAH guide, which we compile locally from hl7-eu/oah (it has no licence file, so we never copy it into our repository). The HL7 FHIR Validator checks every example Bundle against ObservationIndicatorsOah and LocationOah. A ConceptMap (citizen-sign to OAH) publishes the mapping: six of nine problem signs match an existing OAH indicator; the others use proposed codes we offer back to the guide as new concepts.

Data: real stream geometry from OpenStreetMap, real rainfall from Open-Meteo, any city by search. The five OneAquaHealth cities work offline. The demo data is synthetic and labelled so.
```

**Challenges we ran into**

```
The OAH guide is not published as a package, and its profiles come without snapshots, so we built a pipeline that compiles it locally, generates the snapshots with the HL7 validator and installs it in the FHIR package cache. Getting to zero warnings meant fixing real modelling issues (a permits property must be a Coding, not a code, because a code is read as a code in the same system). We also had to decide what an all-clear means for DipteraCAST: a visual check is "not seen", never "absent", and we say so in every export.
```

**Accomplishments that we're proud of**

```
Records that validate against the official OneAquaHealth profiles with 0 errors and 0 warnings, and a profile that refuses unverified records on its own. The gate and the published rule cannot disagree, because the gate is the published file (a test proves it, and another proves that editing the file changes the gate). Every measure in the brief is a real Catalogue entry, and a test checks each title and quoted phrase against the Catalogue text, so a wrong page number fails the build. We also publish a calibration report that says what the grade cannot show.
```

**What we learned**

```
Trust is a data problem, not only a user-interface problem: unless a record carries what it may be used for, a rumour and a verified report look identical to the systems downstream. And honesty is a feature: saying "not seen", "team inference" or "interface only" in the product is what makes the rest believable.
```

**What's next**

```
Propose the trust add-on and the three unmatched signs (oil sheen, sewage, litter) to the HL7 Europe OneAquaHealth guide, so it outlives the project. Calibrate the grade and thresholds with OAH ecologists on real, expert-labelled reports (the defaults are illustrative). Review the machine-assisted translations with native speakers. Connect DipteraCAST for real once a model interface exists. A hosted verification service is the proposed open-core layer; the rule files and profiles stay open.
```

**Built with** (tags)

```
python, fastapi, sqlite, nextjs, react, typescript, fhir, hl7, fhir-shorthand, sushi, snomed-ct, openstreetmap, open-meteo, playwright, axe-core
```

**"Try it out" links**: repository **[YOU: public GitHub URL]**, video **[YOU]**. There is no live URL yet; do not add one until a deployment exists.

## Step 3: Additional info (honest notes to include)

```
Demo data is synthetic and labelled "(synthetic)". StreamProof is not integrated with the OneAquaHealth Citizen Science App: that is the proposed adoption path. No public DipteraCAST access or API is announced yet, so the export is real but the prediction input is an empty interface. The suggested measures are matched by us to the real Catalogue of Measures (Dias, Serra, Feio 2025, CC BY 4.0), not by its authors. Grade weights and thresholds are configurable defaults, not validated values. Translations are machine-assisted and not yet reviewed by native speakers; the organiser-side screens added late are English only.
```

## Prior art (README and Devpost, sources checked 2026-10-04)

> Trust in citizen-science data is an old problem. Alabri & Hunter (IEEE e-Science 2010, "Enhancing the Quality and Trust of Citizen Science Data", tested with CoralWatch) combined quality checks with trust metrics. Baker et al. (2021, "The Verification of Ecological Citizen Science Data: Current Approaches and Future Possibilities", *Citizen Science: Theory and Practice* 6(1), doi:10.5334/cstp.351) reviewed 259 schemes, found verification information for 142, and proposed a hierarchical approach: automation or community consensus verifies most records, and experts check the flagged ones. StreamProof implements that recommendation and adds two things we did not find in either: a **machine-readable rule for what each trust level may be used for**, and **carrying grade, trust level and permitted uses inside standard FHIR records** that conform to the OneAquaHealth guide.

One more line for the Impact section, from the University of Oslo's OneAquaHealth page (last updated 20 Dec 2023): the project will "investigate whether the observations can be used as indicators for early warning". StreamProof is the quality gate that makes that test possible. The OneAquaHealth Catalogue itself says citizen-science data "often needs expert validation" (section 4.4.2, p. 91).

## Before you submit **[YOU]**

1. Push the repository **public** (`gh repo create midhunrajcharles/streamproof --public --source . --push`) and put the URL in the Devpost links. Check `git status` first: `research/` and `docs/source/` are git-ignored on purpose.
2. Record the video (3 to 5 minutes), script in `docs/STREAMPROOF-WINNING-PLAN.md` section 13. Every scene in it now works on the seed data.
3. Replace the synthetic hero photos with real stream photos if you have them. The seed data has none, and the app says "synthetic seed, no photo".
