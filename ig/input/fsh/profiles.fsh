Alias: $OAH = http://hl7.eu/fhir/ig/oah/CodeSystem/temporarySystem-oah-eu
Alias: $SCT = http://snomed.info/sct
Alias: $UCUM = http://unitsofmeasure.org

// ---------------------------------------------------------------------------------------------
// A location the OAH guide would accept, at about 100 m precision.
// ---------------------------------------------------------------------------------------------
Profile: StreamProofLocation
Parent: LocationOah
Id: streamproof-location
Title: "StreamProof location (about 100 m)"
Description: "A OneAquaHealth location for a citizen report. The identifier is a site id (stream plus 100 m cell); the position is coarsened to three decimals, never the exact GPS."
* ^experimental = true
* identifier 1..
* identifier.system 1..
* identifier.value 1..
* physicalType 1..
* position 1..1

// ---------------------------------------------------------------------------------------------
// An OAH indicator observation that carries its own trust data.
// Observation.code = the OAH indicator observed; value = what the citizen saw.
// ---------------------------------------------------------------------------------------------
Profile: StreamProofObservation
Parent: ObservationIndicatorsOah
Id: streamproof-observation
Title: "StreamProof trusted observation"
Description: "A OneAquaHealth indicator observation made by a citizen and strengthened by checks. It adds what the OAH guide does not yet carry: evidence grade, evidence score, trust level, independent corroborations and the permitted uses. Only records that reached Expert-verified or higher may be exchanged, and the profile enforces it (sp-obs-1)."
* ^experimental = true
* obeys sp-obs-1
* subject only Reference(StreamProofLocation)
* value[x] 1..
* value[x] only CodeableConcept
* valueCodeableConcept from CitizenSignVS (required)
* component ^slicing.discriminator.type = #pattern
* component ^slicing.discriminator.path = "code"
* component ^slicing.rules = #open
* component ^slicing.description = "One component per piece of trust data"
* component contains
    evidenceGrade 1..1 and
    evidenceScore 1..1 and
    trustLevel 1..1 and
    independentCorroborations 1..1 and
    permittedUse 0..*
* component[evidenceGrade].code = EvidenceAttribute#evidence-grade
* component[evidenceGrade].value[x] only CodeableConcept
* component[evidenceGrade].valueCodeableConcept from EvidenceGradeVS (required)
* component[evidenceScore].code = EvidenceAttribute#evidence-score
* component[evidenceScore].value[x] only Quantity
* component[evidenceScore].valueQuantity.system = $UCUM
* component[evidenceScore].valueQuantity.code = #1
* component[trustLevel].code = EvidenceAttribute#trust-level
* component[trustLevel].value[x] only CodeableConcept
* component[trustLevel].valueCodeableConcept from TrustLevelVS (required)
* component[independentCorroborations].code = EvidenceAttribute#independent-corroborations
* component[independentCorroborations].value[x] only Quantity
* component[independentCorroborations].valueQuantity.system = $UCUM
* component[independentCorroborations].valueQuantity.code = #1
* component[permittedUse].code = EvidenceAttribute#permitted-use
* component[permittedUse].value[x] only CodeableConcept
* component[permittedUse].valueCodeableConcept from PermittedUseVS (required)

Invariant: sp-obs-1
Description: "Only Expert-verified or Decision-grade records may be exchanged: nothing unverified can enter an OAH system."
Severity: #error
Expression: "component.where(code.coding.where(code = 'trust-level').exists()).value.coding.where(code = 'expert-verified' or code = 'decision-grade').exists()"

// ---------------------------------------------------------------------------------------------
// Who did what, and under which rule.
// ---------------------------------------------------------------------------------------------
Profile: StreamProofProvenance
Parent: Provenance
Id: streamproof-provenance
Title: "StreamProof provenance"
Description: "Provenance of a citizen observation: author (a pseudonym only), assembler (the evidence engine) and verifier (an expert, with an organisation signature). The policy points at the trust-level CodeSystem, the published permitted-use rule."
* ^experimental = true
* obeys sp-prov-1
* policy 1..
* agent 1..
* agent.who 1..

Invariant: sp-prov-1
Description: "The policy must cite the StreamProof trust-level CodeSystem (the permitted-use rule)."
Severity: #error
Expression: "policy.where($this = 'https://midhunrajcharles.github.io/streamproof/fhir/CodeSystem/trust-level').exists()"
