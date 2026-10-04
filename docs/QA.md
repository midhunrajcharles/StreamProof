# Hard questions, honest answers

For the video Q&A, the Devpost comments, and the judges. Every answer says what is built and what is only proposed. Sources were checked on 2026-10-04.

## About the idea

**1. Why not just use iNaturalist's research grade?**
We do not claim to beat it at identification, and we did not benchmark against it. Several people agreeing tells you that several people agree. It does not say what the record may be used for, and it is not the same as an expert checking the flagged cases. Baker et al. (2021) found expert verification the most widely used approach, followed by community consensus and automation, and proposed a hierarchy: automation or community for most records, experts for the flagged ones. StreamProof implements that hierarchy and adds a use rule.

**2. Isn't this Alabri & Hunter, 2010?**
They combined quality checks with trust metrics for CoralWatch volunteers (IEEE e-Science 2010). We turn trust into an enforceable, published rule (what each level may be used for) and carry it inside a health-data standard record. We did not find either in their paper.

**3. Why FHIR for stream data?**
OneAquaHealth's own guide, maintained by HL7 Europe, is FHIR. Health partners already speak it. Our profiles derive from the guide's `ObservationIndicatorsOah` and `LocationOah`.

**4. Your mapping to OAH codes is "wider", not exact.**
Correct, and we say so in the ConceptMap. The OAH indicator (for example `#foam`, "Foam/colour/smell") is broader than the sign (scum, smell or foam), so the indicator is the observation code and the sign is its value. Four signs have no OAH concept (oil sheen, sewage, litter and the general visual check); we use proposed codes and offer them back to the guide as new concepts.

## About trust

**5. Who sets the thresholds?**
They are configurable defaults in `app/config.py` and `app/grading.py`, explicitly to be calibrated with OneAquaHealth ecologists. `docs/CALIBRATION.md` shows what the rules do (including their weaknesses) and how to calibrate on real expert decisions. It quotes no accuracy because no real, expert-labelled field data existed for this submission.

**6. Can a group fake a signal?**
Several things have to hold: corroborating reports must come from different people, spread in time (30 minutes) or place (50 m); each account's corroborations are capped per day (3); an observer's weight depends on their track record; and decision grade needs an expert. The honest limit: accounts are demo-grade (no identity verification), so a determined person with many accounts could still reach "community-supported". They could not reach decision grade, or pass the FHIR gate, without an expert.

**7. A single neighbour turns a B into an A. Isn't that generous?**
Yes, and `docs/CALIBRATION.md` says so. The grade is a quality signal, not the trust level. The trust level, which resists gaming as above, is what the gate uses.

**8. Is the advisory flag a health claim?**
No. It says conditions "may warrant inspection by public-health partners", only at decision grade, and states it is not a diagnosis.

## About privacy and standards

**9. Privacy and GDPR?**
Citizens are pseudonyms. Public surfaces and every FHIR Location use a position coarsened to about 100 m. Exact position and contact details sit in an identity vault. Uploaded photos lose their EXIF GPS. Erasure deletes the vault entry and keeps the signed evidence valid. A real deployment would need a data-protection officer's review.

**10. Is it integrated with the OneAquaHealth Citizen Science App?**
No. We found no public API for it. That integration is the proposed adoption path, and the web app is a reference client.

**11. Is DipteraCAST connected?**
Partly, and we say which part. The export is real: verified Diptera records leave as CSV or an OAH-profiled FHIR Bundle. The input is an empty interface: OneAquaHealth's announcement (31 July 2026) gives no public access or API and says integration into its Open Information Hub is planned.

**12. Did you use the Catalogue of Measures properly?**
We matched each sign to numbered entries of the real Catalogue (Dias, Serra, Feio 2025, CC BY 4.0), with the Catalogue's own titles, pages and limitations. We did the matching, not its authors, and the choice belongs to the DSS and the municipality. The Catalogue has no measure for foam or odour, so those entries say they are our inference. A test checks every title and quoted phrase against the Catalogue text.

**13. Blockchain?**
No need. A signature over a de-identified hash (Ed25519) makes the record tamper-evident, and it lets us erase an identity without breaking the evidence. A chain would make erasure harder, not easier.

## About adoption and fairness

**14. Who maintains this after December 2026?**
The rules are open data (plain FHIR files), so they outlive any one app. The proposed path is to offer the add-on to the HL7 Europe OneAquaHealth guide, with the app as a reference client and a hosted verification service as an optional open-core layer. None of that is agreed; it is a proposal.

**15. How does a municipality act on this, and fairly across neighbourhoods?**
The River Health Brief gives signals, how sure we are, and Catalogue-matched next steps. It also lists *under-observed stretches* (fewer than two different people in 30 days) and lets an organisation send residents there, so evidence does not only follow busy, well-walked paths. Limit: it shows where evidence is thin along the stream, not who lives there; StreamProof holds no demographic data.

**16. Why would someone report a second time?**
Because something changed: their report's status moves, an expert explains a decision, a mission appears near them. There are no points for volume, "everything looks fine" counts the same as a problem, a report that was not confirmed carries no penalty, and there is no ranking between people. This is design reasoning, not a study.

**17. Does the grade say the stream is unhealthy?**
No. It says how well a report is supported. Formal ecological assessment stays with the OneAquaHealth field protocols. Volunteer biotic indices such as University College Cork's Citizen Science Stream Index are a possible future path.
