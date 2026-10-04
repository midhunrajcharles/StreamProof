# StreamProof: Devpost "About the project" (paste-ready)

Paste everything between the two `=====` lines into the Devpost story box (it accepts Markdown).
Where it says `[GIF: …]`, upload that file from `docs/gifs/` with the editor's image button, at that spot.
Facts match the repository and `docs/DEVPOST.md`. Fill the two `[YOU]` links before submitting.

=====

> **Anyone can photograph a stream. StreamProof decides how far to trust that photo, writes the answer into the record, and makes every downstream system enforce it.**
> A trust and provenance add-on to HL7 Europe's official OneAquaHealth FHIR guide · Track 7, Digital Health Standards

🎬 **3-minute demo:** [YOU: YouTube link] · 💻 **Code:** [YOU: GitHub link]

## 💡 Inspiration

Citizens already photograph foamy, stagnant or smelly streams. The hard part is what happens next:

- a city can't tell which reports to trust,
- a public-health system can't read them, and
- nothing says what a report is **allowed to be used for**.

OneAquaHealth's FHIR guide says *what* was observed, but not *how far to trust it*. A rumour and a verified report look the same to every system downstream. We built the missing layer.

## 🌊 What it does

A citizen reports in about a minute, in their own language. The report gets a grade from A to D straight away, **with reasons a person can read and argue with**.

[GIF: docs/gifs/1-report.gif]
*📸 Report in Portuguese: camera, "stagnant water" + "many mosquitoes", GPS snapped to the real stream, send.*

[GIF: docs/gifs/2-grade.gif]
*🅰️ Instant grade A (92/100) from seven checks, plus the neighbours who saw the same thing. Neighbours are counted as people, not reports.*

Then the trust layer takes over:

- 🔒 **A permitted-use gate** sits in front of every output: dashboard, public map, FHIR exchange, DipteraCAST export, advisory. The rule isn't hidden in code. It's a **published FHIR CodeSystem** (`trust-level`, property `permits`) that the app loads, so any receiving system can enforce the same rule.
- 🧑‍🔬 **Experts verify in one tap**, by remote check or field check, and the record upgrades.

[GIF: docs/gifs/3-gate.gif]
*🚫 "Export refused by the gate": a community-supported record can't leave as FHIR. One expert field check later, it can.*

- 🏛️ **The River Health Brief** gives a municipality the signals, how sure we are, and next steps matched to the **real OneAquaHealth Catalogue of Measures**, with section and page.
- 🦟 **DipteraCAST ground truth:** expert-verified Diptera records leave as labelled CSV or FHIR. A visual all-clear is exported as *not seen*, never *absent*.
- 🗺️ **Under-observed stretches** are listed, and an organisation can send residents there.

[GIF: docs/gifs/4-brief.gif]
*📋 The brief: decision-grade signals and an advisory, only where the evidence allows one.*

[GIF: docs/gifs/5-city.gif]
*🧭 Catalogue measures, coverage gaps, "ask residents to check", and the DipteraCAST ground-truth card (present 2 · not seen 10 · held back 48).*

### ✅ What the judges asked, and how we answer

| What you asked for | How StreamProof answers | Where to see it |
|---|---|---|
| **Impact & alignment (30%)**: better monitoring, protection and awareness of water ecosystems | Turns citizen photos into evidence a city can act on. Suggested measures come from OAH's own Catalogue. It feeds DipteraCAST verified ground truth and lists under-observed reaches for equity. | Video 2:27 · `/brief` |
| **Innovation (20%)**: original, creative use of technology | Trust travels **inside** the FHIR record (grade, trust level, permitted uses). The gate *is* the published rule file. We didn't find either in prior work (Alabri & Hunter 2010; Baker et al. 2021). | Video 1:53 |
| **Technical (20%)**: prototype quality, architecture, tools, APIs, data | 0 errors and 0 warnings against the official OAH profiles (HL7 Validator). An unverified record is rejected by our invariant. A test proves the gate equals the rule file. 90+ backend tests, e2e suite. Real OpenStreetMap and Open-Meteo data. | Video 1:53 · `tools/validate_fhir.py` |
| **Usability (15%)**: ease of use, clarity, accessibility | About one minute to report. In-page camera. Works offline (PWA). 45 languages with right-to-left support. Every grade explained in plain words. axe accessibility checks clean in light and dark mode. | Video 0:45 |
| **Feasibility & scalability (15%)**: real-world use, integration with existing systems | Built **on** the OAH guide, not beside it. Any city by search. A reference client that can sit behind OAH's Citizen Science App. Proposed codes go back to HL7 Europe. Open rule files. | Video 2:47 · Standards page |
| **Track 7**: interoperability, FHIR models, integration frameworks | FSH profiles derived from `ObservationIndicatorsOah` / `LocationOah`. A ConceptMap from citizen signs to OAH indicators (6 of 9 match; 3 proposed). FHIR export of every verified record. | `ig/input/fsh/` |
| **Required**: track statement, description, 3–5 min video, public repo with docs, working prototype | All included: Track 7 statement, this story, a 3:12 video, a public repo with README and docs, and a working web app + API. | links above |

## 🛠️ How we built it

- **Backend:** Python, FastAPI, SQLite. The evidence engine, evidence graph and permitted-use gate are plain, tested Python.
- **Frontend:** Next.js 16 + React, an installable PWA with an in-page camera, separate citizen and organiser dashboards, 45 languages (machine-assisted, RTL mirrored).
- **FHIR:** the add-on is written in FHIR Shorthand and compiled with SUSHI against the OAH guide. We compile the guide locally from `hl7-eu/oah` and never copy it, because it has no licence. Every example Bundle is checked by the HL7 FHIR Validator.
- **Data:** real stream lines from OpenStreetMap and real rainfall from Open-Meteo. The demo reports are synthetic and labelled so.

## 🧗 Challenges we ran into

- The OAH guide isn't published as a package and its profiles have no snapshots. We built a pipeline that compiles it, generates the snapshots with the validator, and installs it in the FHIR package cache.
- Getting to **zero warnings** meant fixing real modelling issues. For example, `permits` must be a Coding, not a code.
- Being honest about uncertainty. A visual all-clear is *not seen*, not *absent*. Foam and odour have no Catalogue measure, so we label those suggestions "team inference".

## 🏆 Accomplishments that we're proud of

- Records that **validate against the official OneAquaHealth profiles with 0 errors, 0 warnings**, and a profile that refuses unverified records on its own.
- The gate and the published rule **can't disagree**: the gate *is* the file, and a test proves it.
- Every measure in the brief is a real Catalogue entry. A test checks each title and quote against the Catalogue text, so a wrong page number fails the build.
- A calibration report that says what the grade **cannot** show.

## 📚 What we learned

Trust is a **data** problem, not only a UI problem. Unless a record carries what it may be used for, systems downstream can't tell a rumour from evidence. Honesty is a feature too: words like "not seen", "team inference" and "interface only" are what make the rest believable.

## 🚀 What's next for StreamProof

- Propose the trust add-on and three new signs (oil sheen, sewage, litter) to HL7 Europe's OAH guide, so the work outlives the project.
- Calibrate the grade with OAH ecologists on real, expert-labelled reports. Today's thresholds are illustrative defaults.
- Get native speakers to review the translations.
- Connect DipteraCAST for real once a model interface is public.

> **Honest notes:** demo data is synthetic and labelled. StreamProof is not integrated with the OneAquaHealth Citizen Science App; that is the proposed adoption path. The DipteraCAST prediction slot is an empty interface until a model API exists. Measures are matched by us to the Catalogue (Dias, Serra, Feio 2025, CC BY 4.0), not by its authors. The video voice is open-source TTS (Kokoro) and the stream photos are Blender renders.

=====
