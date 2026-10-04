# StreamProof demo video: script (3:00)

*Draft 2, 2026-10-04 (approved; scene 4 now quotes the grade the engine really gives: A, not B). Review this first: the demo data, the camera footage and the recordings are built to match it.*

**Length.** About 3:00 (432 words of voice-over at roughly 148 words a minute, plus music beats). Devpost asks for **3 to 5 minutes**, so the final cut must not come in under 3:00. Target 3:00 to 3:10.

**Honesty line.** The reports are demo data on real stream geometry. The video says so once, in the voice-over at 0:48, and a small label stays on screen during the demo (the same thing the Intatto reference does with "Fork of X Layer mainnet").

---

## Two visual styles, taken from the references

| | **A. Explainer** (from *Intatto, OKX Dev Day 2026*) | **B. Product** (from *LangEase, Zelios*) |
|---|---|---|
| Used for | The problem, the standard, the proof | The app in use, the people, scale, the close |
| Canvas | Flat white, or near-black (#0a0a0a) for the problem and the proof | Soft water-tinted gradient (pale blue to white), slow drifting light |
| Shapes | 2 px hairlines, small squares on a timeline, outline circles, dotted particle flows between boxes | Frosted-glass panels (blur, soft shadow, 24 px radius), round icon badges that pop in |
| Type | Bold sans headline, centred; tiny UPPERCASE monospace labels; small grey subtitle line at the bottom | Kinetic type: typewriter, blur-in, scale-up with sparkles; a language list scrolling as a greeting morphs |
| App footage | Screen on the canvas, a cursor, slow push-in on the field that matters, a **red stamp** when something is refused | Phone or desktop screen in a tilted glass frame floating over blurred footage, a hand cursor, fast cuts (about 1 s) |
| Context label | Top-left monospace, e.g. `DEMO DATA · RIBEIRA DE COSELHAS, COIMBRA` | none |
| Colour | Black, white, grey; one red (#d70015) for refusals, one green (#248a3d) for passes | StreamProof's own: greys, link blue #0066cc, the app's display serif for the wordmark |

We copy the *style* (pacing, layout, motion grammar), not their footage, logos or assets.

---

## Scene by scene

### 1. Hook (0:00 to 0:14) · style A, dark

| Visual | Voice-over |
|---|---|
| Two identical record cards slide in side by side: `Observation · stagnant water · Coimbra`. Small grey tags under them: `rumour?` and `verified?`. The left card gets a red stamp: `REFUSED · NOT VERIFIED`. Under the right card a green line types out: `0 errors · ObservationIndicatorsOah`. | "To a computer, a rumour and a verified report look exactly the same. StreamProof makes the difference machine-readable, inside OneAquaHealth's own data standard." |

### 2. Problem (0:14 to 0:34) · style A, white

| Visual | Voice-over |
|---|---|
| A hairline with five dots labelled COIMBRA · BENEVENTO · GHENT · OSLO · TOULOUSE. Small phone icons drift from the dots into a box labelled `CITY` with a `?`. Cut to a FHIR Observation card drawn in hairlines: `code`, `value`, `subject` filled in; two empty rows pulse: `trust ?` and `may be used for ?`. Headline: **What was seen. Not how far to trust it.** | "In OneAquaHealth's five cities, people walk past urban streams every day, and many already photograph what's wrong. But an authority can't tell which reports to trust. And the OneAquaHealth FHIR guide records what was observed, not how far to trust it, or what it may be used for." |

### 3. Solution (0:34 to 0:46) · style B

| Visual | Voice-over |
|---|---|
| Typewriter: "So we built" then the **StreamProof** wordmark scales up with a small sparkle. Four glass chips connect with a flowing dotted line: `Citizen` → `Evidence engine` → `Permitted-use gate` → `OneAquaHealth systems`. | "So we built StreamProof: a trust layer for citizen stream reports, made as an add-on to the HL7 Europe OneAquaHealth guide." |

### 4. Citizen demo (0:46 to 1:22) · style B, phone in a glass frame over a blurred stream

Context label on screen: `DEMO DATA · REAL STREAM GEOMETRY · RIBEIRA DE COSELHAS, COIMBRA`

| Visual | Voice-over |
|---|---|
| Phone app on the landing. The language list scrolls (LangEase greeting morph): English → **Português**. Hand cursor taps **Reportar**. | "Here's Maria in Coimbra. The reports you'll see are demo data on the real Ribeira de Coselhas." |
| **The camera opens inside the page**: live view of a stream, a little hand shake. A round camera badge pops in. Tap **Capturar**: white flash, the frame freezes. | "She opens the app, taps Report, and the camera opens right in the page." |
| Chips: taps *Água parada* and *Muitos mosquitos*. A map pin snaps onto the stream line; a round pin badge pops in. Tap **Enviar relato**. | "Stagnant water, lots of mosquitoes. She tags what she sees, confirms the spot on the stream, and sends it." |
| A short "checking" shimmer, then the grade card: big **A** (97/100), and seven reason rows tick in one by one (photo, photo time, GPS, on the stream, nearby, weather, track record). A people badge pops in over "2 other people reported the same within 500 m". Trust ladder moves to **Community-supported**. | "Within a second, StreamProof grades it: A, with seven reasons anyone can read. Clear photo. GPS within seven metres. Right on the mapped stream. And two other people, a school group among them, reported the same thing nearby, so it's already community-supported." |

### 5. Reviewer (1:22 to 1:52) · style A, desktop screen on white

Context label: `COIMBRA PILOT · REVIEWER VIEW · DEMO DATA`

| Visual | Voice-over |
|---|---|
| Review detail. Slow push-in on **Nearby evidence** (the school report) and the map. Click **Ask for more evidence**: an arrow walks 400 m upstream along the stream line. | "On the city side, a reviewer sees the nearby evidence, and the gaps. One tap asks residents four hundred metres upstream for more." |
| Click **Export FHIR R4 bundle**. A **red stamp** lands over the button: `REFUSED · NEEDS EXPERT-VERIFIED` and under it, small: `blocked by the permitted-use gate`. | "Now try to send this report to a partner system. Refused. A community-supported report can't leave yet." |
| Verify sheet: **Field check**, note "Larvae in dip sample", **Verify**. The trust ladder fills to **Decision-grade**. Cut to the River Health Brief: the advisory callout appears. Push-in on "may warrant inspection … not a diagnosis". | "The reviewer checks it in the field and verifies. Two different people, both expert-verified: the signal becomes decision-grade, and the River Health Brief raises an advisory. May warrant inspection. Never a diagnosis." |

### 6. The standard (1:52 to 2:20) · style A, dark

| Visual | Voice-over |
|---|---|
| The exported Bundle as large monospace JSON. Lines light up in turn: `"code": … temporarySystem-oah-eu … "diptera"` (label: `OAH INDICATOR`), `"valueCodeableConcept": … "mosquitoes"` (label: `WHAT MARIA SAW`), the component rows (label: `TRUST TRAVELS WITH THE DATA`). | "Here's what leaves the system. The code is OneAquaHealth's own indicator, here, Diptera. The value is what Maria saw. And the grade, the trust level and the permitted uses travel inside the record." |
| The `trust-level` CodeSystem: rows with `permits` light up, a dotted line runs to a box `gate · loads at start-up`. | "The rule for what each trust level may be used for is itself published as a FHIR code system, and our gate loads it when it starts." |
| Terminal: the HL7 validator run. The results table counts up: every file `0 errors · 0 warnings`. Then one red row: `NEGATIVE CONTROL · rejected by sp-obs-1`. | "Checked with the official HL7 validator against the OneAquaHealth profiles: zero errors, zero warnings. Lower the trust level, and the profile itself rejects the record." |

### 7. Impact (2:20 to 2:40) · mix

| Visual | Voice-over |
|---|---|
| Brief, "Suggested next steps": the card **4.3.1 Removing barriers · p. 47** with the Catalogue's caution beneath. | "For the city, the Brief matches each signal to the real OneAquaHealth Catalogue of Measures, with section and page." |
| "Under-observed stretches" list; click **Ask residents to check**; a pill flips to **Mission open**. | "It shows the stretches nobody has looked at lately, so evidence doesn't only follow the busy paths." |
| Dashboard ground-truth card; **Download CSV**; the rows slide out: `present`, `not_seen`, with the DipteraCAST name. | "And verified mosquito records leave as ground truth for DipteraCAST." |

### 8. People and scale (2:40 to 2:52) · style B

| Visual | Voice-over |
|---|---|
| Maria's signed certificate. On the verify page one value is edited: red **changed**. Then a fast montage of the five cities' streams on the map, then the language carousel again: Olá, Ciao, Hallo, Hei, Bonjour, مرحبا, नमस्ते, 你好. | "Every verified contributor gets a signed record: change one value and the check fails. It works in all five OneAquaHealth cities, in any other city by search, and in forty-five languages." |

### 9. Close (2:52 to 3:02) · style B end card

| Visual | Voice-over |
|---|---|
| Wordmark **StreamProof**, tagline *Evidence a city can act on.* Small line: `Open source · Built on the HL7 Europe OneAquaHealth FHIR guide · Demo data` and the repository URL. | "StreamProof. Evidence a city can act on." |

---

## What the data must contain (the seed is built from this list)

| Needed for | Data |
|---|---|
| Scene 4 | Maria (citizen, Coimbra, Portuguese interface) with an account and two earlier verified reports. A school group's *stagnant water* report about 150 m away, two days earlier, so her new report links to it. Weather on that day consistent with stagnant water. |
| Scene 5 | The Coimbra pilot organisation with a reviewer and a coordinator. One expert-verified *mosquitoes* report by another person within 500 m and 14 days, so verifying Maria's report makes the signal decision-grade. |
| Scene 7 | Enough Coimbra activity over 30 days for a lived-in dashboard (about 60 reports, most problems minor, many all-clears). Two or three stretches with no reports. At least ten Diptera ground-truth rows (present and not seen). |
| Scene 8 | Maria's certificate. Activity in all five cities (about 15 to 25 reports each, a local organisation with a reviewer, a signal or two). |
| Throughout | About 40 citizens with local first names and an initial, bios and avatars; every report graded by the real engine, in time order, so every reason, link and badge is genuine app output. |
| Photos | Rendered stream scenes per sign (Blender, synthetic) attached as real uploads, and one camera clip for scene 4. |
| Logins | Demo accounts for the citizen and each organisation, listed in `docs/DEMO-ACCOUNTS.md`. |

## How it gets made

1. **Data**: `python -m app.seed --video` builds the dataset above through the app's own services (grading, linking, verification, certificates), never by writing rows directly.
2. **Camera**: a Blender clip of a stream is fed to Chromium as the camera, so the real in-page camera opens, captures and uploads it.
3. **Screen recordings**: Playwright scripts click through scenes 4, 5 and 7 to 8 at phone and desktop sizes.
4. **Motion graphics**: the style-A diagrams, the style-B type and glass frames, and the final edit, assembled in code (Remotion) so every change re-renders.
5. **Voice-over**: you record it, or a neural text-to-speech voice as a placeholder.
6. **Music**: a royalty-free track (to choose).

## Open decisions for you

- The voice: yours, or a synthetic placeholder voice?
- Music: any preference (calm, upbeat)?
- The repository URL for the end card (the repo isn't public yet).
