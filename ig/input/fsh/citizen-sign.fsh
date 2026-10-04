// Plain-language signs a citizen can report. Generated once from app/indicators.py; edit here from now on
// (a test keeps app/indicators.py and this file in step).

CodeSystem: CitizenSign
Id: citizen-sign
Title: "Citizen stream observation signs"
Description: "Plain-language signs a citizen can report at an urban stream. Used as the value of a StreamProof observation; the OAH indicator being observed goes in Observation.code (see the ConceptMap citizen-sign-to-oah)."
* ^status = #draft
* ^experimental = true
* ^caseSensitive = true
* ^content = #complete
* #algal-scum "Algal scum or green discoloured water" "Visible surface scum or green/blue-green discolouration, a possible algal bloom."
* #odour "Unusual odour from the water" "A strong septic, chemical or rotten smell noticed at the bank."
* #dead-fish "Dead or dying fish" "One or more dead or visibly distressed fish in or at the edge of the water."
* #oil-sheen "Oily or rainbow sheen on the surface" "A rainbow or silvery film on the surface that breaks up into patches."
* #stagnant-water "Stagnant or ponded water" "Water that is not flowing: ponded side pools, blocked channel or standing water."
* #mosquitoes "High mosquito activity" "Many mosquitoes or larvae seen at the site; a possible vector habitat signal."
* #sewage "Sewage or pipe discharge" "Grey water, toilet paper, or a pipe discharging into the stream."
* #litter "Litter in or beside the channel" "Plastic, bags or dumped items in the channel or on the banks."
* #foam "Persistent foam on the surface" "White or brown foam that does not break up quickly."
* #all-clear "No problem observed" "The observer checked the site and saw nothing of concern. Credited equally."

ValueSet: CitizenSignVS
Id: citizen-sign
Title: "Citizen stream observation signs"
Description: "All signs in the citizen-sign CodeSystem."
* ^status = #draft
* ^experimental = true
* include codes from system CitizenSign|0.1.0

