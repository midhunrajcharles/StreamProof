// THE PERMITTED-USE MATRIX, AS DATA. The StreamProof gate (app/permitted_use.py) loads the compiled
// CodeSystem at start-up, so this file is the rule, not a copy of it. `permits` lists every use allowed
// at that trust level (cumulative); `level` orders the levels. Not-confirmed permits nothing.

CodeSystem: TrustLevel
Id: trust-level
Title: "Trust level"
Description: "Evidence graph levels and what a record at each level may be used for. Expert-verified is reachable directly from assessed. This CodeSystem is the machine-readable permitted-use rule: every system that receives a StreamProof record can enforce it."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* ^property[0].code = #level
* ^property[0].uri = "https://midhunrajcharles.github.io/streamproof/fhir/CodeSystem/trust-level#level"
* ^property[0].description = "Order of the level (higher is stronger); 0 means reviewed and not confirmed."
* ^property[0].type = #integer
* ^property[1].code = #permits
* ^property[1].uri = "https://midhunrajcharles.github.io/streamproof/fhir/CodeSystem/trust-level#permits"
* ^property[1].description = "A use from the permitted-use CodeSystem that a record at this level is allowed for. Repeats once per allowed use; a Coding in the permitted-use CodeSystem."
* ^property[1].type = #Coding
* #not-confirmed "Not confirmed" "Reviewed and not confirmed; kept for the record with a reason."
* #not-confirmed ^property[0].code = #level
* #not-confirmed ^property[0].valueInteger = 0
* #report "Report" "Submitted by a citizen, not yet assessed."
* #report ^property[0].code = #level
* #report ^property[0].valueInteger = 1
* #report ^property[1].code = #permits
* #report ^property[1].valueCoding = PermittedUse#triage
* #report ^property[2].code = #permits
* #report ^property[2].valueCoding = PermittedUse#field_check
* #report ^property[3].code = #permits
* #report ^property[3].valueCoding = PermittedUse#mission
* #assessed "Assessed" "Graded A-D with reasons by the evidence engine."
* #assessed ^property[0].code = #level
* #assessed ^property[0].valueInteger = 2
* #assessed ^property[1].code = #permits
* #assessed ^property[1].valueCoding = PermittedUse#triage
* #assessed ^property[2].code = #permits
* #assessed ^property[2].valueCoding = PermittedUse#field_check
* #assessed ^property[3].code = #permits
* #assessed ^property[3].valueCoding = PermittedUse#mission
* #assessed ^property[4].code = #permits
* #assessed ^property[4].valueCoding = PermittedUse#org_dashboard
* #community-supported "Community-supported" "Independently corroborated by at least one other observer."
* #community-supported ^property[0].code = #level
* #community-supported ^property[0].valueInteger = 3
* #community-supported ^property[1].code = #permits
* #community-supported ^property[1].valueCoding = PermittedUse#triage
* #community-supported ^property[2].code = #permits
* #community-supported ^property[2].valueCoding = PermittedUse#field_check
* #community-supported ^property[3].code = #permits
* #community-supported ^property[3].valueCoding = PermittedUse#mission
* #community-supported ^property[4].code = #permits
* #community-supported ^property[4].valueCoding = PermittedUse#org_dashboard
* #community-supported ^property[5].code = #permits
* #community-supported ^property[5].valueCoding = PermittedUse#public_map
* #expert-verified "Expert-verified" "Confirmed by an expert, remotely or in the field."
* #expert-verified ^property[0].code = #level
* #expert-verified ^property[0].valueInteger = 4
* #expert-verified ^property[1].code = #permits
* #expert-verified ^property[1].valueCoding = PermittedUse#triage
* #expert-verified ^property[2].code = #permits
* #expert-verified ^property[2].valueCoding = PermittedUse#field_check
* #expert-verified ^property[3].code = #permits
* #expert-verified ^property[3].valueCoding = PermittedUse#mission
* #expert-verified ^property[4].code = #permits
* #expert-verified ^property[4].valueCoding = PermittedUse#org_dashboard
* #expert-verified ^property[5].code = #permits
* #expert-verified ^property[5].valueCoding = PermittedUse#public_map
* #expert-verified ^property[6].code = #permits
* #expert-verified ^property[6].valueCoding = PermittedUse#oah_dashboard
* #expert-verified ^property[7].code = #permits
* #expert-verified ^property[7].valueCoding = PermittedUse#fhir_exchange
* #expert-verified ^property[8].code = #permits
* #expert-verified ^property[8].valueCoding = PermittedUse#recognition
* #expert-verified ^property[9].code = #permits
* #expert-verified ^property[9].valueCoding = PermittedUse#ground_truth
* #decision-grade "Decision-grade" "Expert-verified and part of a signal that meets the advisory threshold."
* #decision-grade ^property[0].code = #level
* #decision-grade ^property[0].valueInteger = 5
* #decision-grade ^property[1].code = #permits
* #decision-grade ^property[1].valueCoding = PermittedUse#triage
* #decision-grade ^property[2].code = #permits
* #decision-grade ^property[2].valueCoding = PermittedUse#field_check
* #decision-grade ^property[3].code = #permits
* #decision-grade ^property[3].valueCoding = PermittedUse#mission
* #decision-grade ^property[4].code = #permits
* #decision-grade ^property[4].valueCoding = PermittedUse#org_dashboard
* #decision-grade ^property[5].code = #permits
* #decision-grade ^property[5].valueCoding = PermittedUse#public_map
* #decision-grade ^property[6].code = #permits
* #decision-grade ^property[6].valueCoding = PermittedUse#oah_dashboard
* #decision-grade ^property[7].code = #permits
* #decision-grade ^property[7].valueCoding = PermittedUse#fhir_exchange
* #decision-grade ^property[8].code = #permits
* #decision-grade ^property[8].valueCoding = PermittedUse#recognition
* #decision-grade ^property[9].code = #permits
* #decision-grade ^property[9].valueCoding = PermittedUse#advisory_flag
* #decision-grade ^property[10].code = #permits
* #decision-grade ^property[10].valueCoding = PermittedUse#ground_truth

ValueSet: TrustLevelVS
Id: trust-level
Title: "Trust level"
Description: "All levels in the trust-level CodeSystem."
* ^status = #draft
* ^experimental = true
* include codes from system TrustLevel|0.1.0

