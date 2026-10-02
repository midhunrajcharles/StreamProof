# Demo video script (target 4:00, limit 3–5 min)

Record at 1920×1080. Citizen screens use the browser at phone width (375 px) or a real phone; org screens use full desktop. Before recording: `python -m app.seed`, start the server, and have a real photo of a stream or puddle on the phone/computer.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:20 | Title card, then the review queue map of Ribeira de Coselhas | "Citizens already photograph polluted and stagnant streams. The problem is what happens next: a city can't tell which reports to trust, and a health system can't read them. StreamProof is the trust layer in between. Track 7, Digital Health Standards." |
| 0:20–0:35 | Login page | "Two sides: a citizen app, and an organization portal for reviewers." |
| 0:35–1:15 | Maria: Report → photo → pin on the stream → chips "Stagnant water" + "Many mosquitoes" → Submit | "Maria sees a side pool by the footbridge. Photo, place, what she sees. Plain words, no ecology jargon, and 'everything looks fine' counts the same, so nobody is rewarded for exaggerating." |
| 1:15–1:45 | Report card: grade, seven reasons, tracker, safety notice | "She gets a grade, not a thank-you. Every point has a reason: the photo is sharp, the GPS is accurate, it's on the mapped stream, it matches real rainfall (a dry week), and someone else reported the same nearby. So it's already Community-supported." |
| 1:45–2:15 | Reviewer: queue → open Maria's report → reasons, nearby evidence, gate panel → click Export FHIR → blocked banner | "The reviewer sees the same reasons, plus nearby evidence. Here is the core idea, the permitted-use matrix. A Community-supported report may go on a public map as 'being checked'. It may not leave the system. Try to export it, and the gate refuses and says why." |
| 2:15–2:40 | Click Verify (field) → rung Decision-grade → open River Health Brief → advisory box | "One tap to verify. Now two different people's reports are expert-verified within 500 metres and 14 days, so the signal becomes decision-grade. The River Health Brief shows the municipality what, where, how confident, and what to do next. The advisory says 'may warrant inspection'. It never diagnoses." |
| 2:40–3:15 | Export FHIR → JSON (scroll components: grade, trust level, permitted-use) → FHIR page: validator table 0 errors | "Now the export works: FHIR R4. An Observation per sign, Location at about 100 metres, and three Provenance records: citizen, engine, expert, with the organization's signature. The grade, the trust level and the permitted uses travel inside the record. There's no Patient and no personal data. The official HL7 validator: zero errors, zero warnings." |
| 3:15–3:40 | Maria: report card → certificate PDF → verify page → edit grade → "hash mismatch" | "Maria gets a signed contribution record. Anyone can check it. Change one value and the signature check catches it. It's a signature over a de-identified record, not a blockchain, so deleting her identity later doesn't break it." |
| 3:40–4:00 | Mission page (400 m upstream) → closing card with repo URL | "Where evidence is missing, reviewers send neighbours a mission 400 metres upstream along the real stream. Report, verify, prove, act, and recognise the person who helped. Demo data is synthetic; the stream and rainfall are real. Code and FHIR definitions are open." |

**Backup:** record the full run once before the final take, and keep it in case the live take fails.
**Do not say:** "policy-grade", "blockchain", "detects disease", "integrated with OneAquaHealth".
