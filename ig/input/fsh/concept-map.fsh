// Citizen sign -> OneAquaHealth indicator (Observation.code). Equivalence is `wider`: the OAH indicator
// is the broader concept ("Foam/colour/smell" covers scum, smell and foam), so the sign itself goes in
// Observation.value. Signs with no OAH concept are `unmatched` and proposed as new OAH concepts.
// A test keeps this file and app/indicators.py in step.

CodeSystem: ProposedOahIndicator
Id: proposed-oah-indicator
Title: "Proposed OAH indicators"
Description: "Indicators that citizens report but that have no concept in the OAH TemporaryOahSystem yet. Offered to the HL7 Europe OAH guide as new concepts; used as Observation.code until then."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* #oil-sheen "Oil or rainbow sheen" "Oily or rainbow film on the water surface (pollution)."
* #sewage "Sewage or discharge" "Grey water, toilet paper or a pipe discharging into the stream. Follow-up by laboratory test is the coliforms indicator."
* #litter "Litter" "Plastic, bags or dumped items in the channel or on the banks."
* #visual-check "General visual check" "The observer checked the site for signs of pollution or disease-vector habitat. Value says what, if anything, was seen."

Instance: citizen-sign-to-oah
InstanceOf: ConceptMap
Usage: #definition
Title: "Citizen sign to OAH indicator"
Description: "Which OneAquaHealth indicator (TemporaryOahSystem) each citizen sign is an observation of."
* status = #draft
* experimental = true
* group[0].source = "https://midhunrajcharles.github.io/streamproof/fhir/CodeSystem/citizen-sign|0.1.0"
* group[0].target = "http://hl7.eu/fhir/ig/oah/CodeSystem/temporarySystem-oah-eu"
* group[0].element[0].code = #algal-scum
* group[0].element[0].target[0].code = #foam
* group[0].element[0].target[0].display = "Foam/colour/smell"
* group[0].element[0].target[0].equivalence = #wider
* group[0].element[1].code = #odour
* group[0].element[1].target[0].code = #foam
* group[0].element[1].target[0].display = "Foam/colour/smell"
* group[0].element[1].target[0].equivalence = #wider
* group[0].element[2].code = #foam
* group[0].element[2].target[0].code = #foam
* group[0].element[2].target[0].display = "Foam/colour/smell"
* group[0].element[2].target[0].equivalence = #wider
* group[0].element[3].code = #dead-fish
* group[0].element[3].target[0].code = #fish
* group[0].element[3].target[0].display = "Fish"
* group[0].element[3].target[0].equivalence = #wider
* group[0].element[4].code = #mosquitoes
* group[0].element[4].target[0].code = #diptera
* group[0].element[4].target[0].display = "Diptera"
* group[0].element[4].target[0].equivalence = #wider
* group[0].element[5].code = #stagnant-water
* group[0].element[5].target[0].code = #hydrology
* group[0].element[5].target[0].display = "Hydrology of the stream"
* group[0].element[5].target[0].equivalence = #wider
* group[0].element[6].code = #oil-sheen
* group[0].element[6].target[0].equivalence = #unmatched
* group[0].element[6].target[0].comment = "Proposed new OAH concept (proposed-oah-indicator#oil-sheen)."
* group[0].element[7].code = #sewage
* group[0].element[7].target[0].equivalence = #unmatched
* group[0].element[7].target[0].comment = "Proposed new OAH concept (proposed-oah-indicator#sewage); laboratory follow-up is #coliforms."
* group[0].element[8].code = #litter
* group[0].element[8].target[0].equivalence = #unmatched
* group[0].element[8].target[0].comment = "Proposed new OAH concept (proposed-oah-indicator#litter)."
* group[0].element[9].code = #all-clear
* group[0].element[9].target[0].equivalence = #unmatched
* group[0].element[9].target[0].comment = "Not an indicator: recorded as proposed-oah-indicator#visual-check with the value Absent (SNOMED CT 2667000)."
