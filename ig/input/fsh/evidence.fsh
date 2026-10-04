CodeSystem: EvidenceAttribute
Id: evidence-attribute
Title: "Evidence attributes"
Description: "Observation.component codes that carry the trust metadata with the data."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* #evidence-grade "Evidence grade" "A-D grade from seven explainable signals."
* #evidence-score "Evidence score (0-100)" "Sum of points behind the grade."
* #trust-level "Trust level" "Position of the record in the evidence graph."
* #independent-corroborations "Independent corroborations" "Number of independent reports by other observers that agree."
* #permitted-use "Permitted use" "A use this record is allowed for at its trust level."

CodeSystem: EvidenceGrade
Id: evidence-grade
Title: "Evidence grade"
Description: "Explainable grade of a citizen observation. Score bands: A >= 85, B >= 70, C >= 50, D >= 0."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* #A "Strong evidence" "Evidence score of 85 or more."
* #B "Good evidence" "Evidence score of 70 or more."
* #C "Needs verification" "Evidence score of 50 or more."
* #D "Low confidence" "Evidence score of 0 or more."

ValueSet: EvidenceGradeVS
Id: evidence-grade
Title: "Evidence grade"
Description: "All grades in the evidence-grade CodeSystem."
* ^status = #draft
* ^experimental = true
* include codes from system EvidenceGrade|0.1.0

CodeSystem: PermittedUse
Id: permitted-use
Title: "Permitted use"
Description: "Every use a record may be put to. Which trust level allows which use is published in the trust-level CodeSystem (property permits); the StreamProof gate reads it from there."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* #triage "Org triage queue" "Org triage queue."
* #field_check "Trigger a field-check request" "Trigger a field-check request."
* #mission "Open a community evidence mission" "Open a community evidence mission."
* #org_dashboard "Org dashboard, labelled unverified" "Org dashboard, labelled unverified."
* #public_map "Public map as 'reported, being checked'" "Public map as 'reported, being checked'."
* #oah_dashboard "OAH dashboard and DSS input" "OAH dashboard and DSS input."
* #fhir_exchange "FHIR exchange with partner systems" "FHIR exchange with partner systems."
* #recognition "Contributor recognition (signed certificate)" "Contributor recognition (signed certificate)."
* #advisory_flag "Advisory flag to agencies and public-health partners" "Advisory flag to agencies and public-health partners."
* #ground_truth "Ground-truth export to DipteraCAST" "Ground-truth export to DipteraCAST."

ValueSet: PermittedUseVS
Id: permitted-use
Title: "Permitted use"
Description: "All uses in the permitted-use CodeSystem."
* ^status = #draft
* ^experimental = true
* include codes from system PermittedUse|0.1.0

