"use client";
// Every screen in 25 languages (English, the other 23 official EU languages and Norwegian).
// English lives here; the others are JSON files in ui/locales/, loaded when chosen.
//   t("key")          id-based strings (citizen screens)
//   tx('English text') organiser screens: the English text is the key
//   tr(sentence)       sentences the server sends in English (reasons, hints, missions...),
//                      rebuilt from known patterns or looked up as text
// Translations are machine-assisted and must be reviewed by native speakers.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cached, fmt, isLang, LANGS, loadDict, localeOf, type Dict, type Lang } from "./locales";

export { LANGS, localeOf };
export type { Lang };

/** Marks English text for translation where it is defined (tables, lists); render it with tx(). */
export const N = (english: string) => english;

const en: Dict = {
  // navigation
  "nav.report": "Report", "nav.reports": "Reports", "nav.review": "Review", "nav.brief": "Brief", "nav.standards": "Standards",
  "nav.long.report": "Report a stream", "nav.long.reports": "My reports", "nav.long.review": "Review queue", "nav.long.brief": "River Health Brief",
  "group.citizen": "Citizen", "group.org": "Organisation", "group.open": "Open data",
  "nav.sections": "Sections", "account": "Account", "signout": "Sign out", "signin": "Sign in", "website": "StreamProof website", "notSignedIn": "Not signed in",
  "language": "Language", "language.note": "Translations are machine-assisted and not yet reviewed by native speakers.",
  // states
  "state.offline": "You're offline", "state.notFound": "Not found", "state.cantLoad": "Couldn't load this", "state.tryAgain": "Try again",
  "state.offlineMsg": "You're offline. Check your connection and try again.",
  // citizen start
  "cs.title": "Report as a citizen", "cs.body": "No account and no password. You get a pseudonym on this device; your name is never attached to the evidence.",
  "cs.name": "What should we call you? (optional)", "cs.nameHelp": "Shown only to you and on your certificate.", "cs.ph": "For example: Ana",
  "cs.start": "Start reporting", "cs.demoText": "Or explore with Maria S., the demo citizen who already has reports.", "cs.demo": "Use the demo citizen",
  // report form
  "report.eyebrow": "Citizen", "report.subtitle": "About a minute. Your report is graded straight away, with reasons.",
  "consent.title": "Before your first report", "consent.private": "Private", "consent.privateText": "Your exact location and contact details. Only the reviewers see them.",
  "consent.public": "Can be public", "consent.publicText": "The sign you saw and an area of about 100 m, and only after it has been checked.",
  "consent.used": "Used for", "consent.usedText": "Checking stream health with OneAquaHealth partners, under the published permitted-use rules.",
  "consent.rights": "Your rights", "consent.rightsText": "You can remove your personal data at any time from My reports.",
  "consent.safe": "Stay safe", "consent.safeText": "Stay on public paths, don't enter or touch the water, and don't photograph people.",
  "consent.agree": "I agree to how my report is used, as described above.",
  "photo.section": "Photo", "photo.foot": "A wide shot of the water and the bank works best. Location data is removed from the file before it's stored.",
  "photo.take": "Take a photo", "photo.optional": "Optional, but it lifts the grade", "photo.another": "Choose another", "photo.remove": "Remove",
  "photo.library": "Choose from library", "photo.alt": "Your photo",
  "where.section": "Where", "where.city": "City", "where.hint": "Drag the pin or tap the map to mark the spot.", "where.use": "Use my location",
  "where.far": "You're outside the cities in the list. Search for your city above so its streams load.", "where.gps": "Using your location (±{m} m).",
  "where.nogps": "Couldn't get your location. Place the pin on the map.", "where.unavailable": "Location isn't available on this device. Place the pin on the map.",
  "where.confirmed": "Spot confirmed on the map.", "where.mission": "Mission spot: {place}. Adjust if you're elsewhere.",
  "where.map": "Report location. Drag the pin or tap the map to move it.", "where.example": "Example stream for the demo, not a OneAquaHealth study site.",
  "see.section": "What do you see", "see.foot": "Tap everything that applies. “Everything looks fine” counts just as much.",
  "else.section": "Anything else", "else.notes": "Notes (optional)", "else.notesPh": "For example: side pool by the footbridge, lots of mosquitoes at dusk",
  "else.contact": "Email or phone for updates (optional, private)",
  "submit": "Submit report", "submitting": "Checking your evidence…",
  "err.sign": "Choose at least one thing you can see, or “Everything looks fine”.", "err.consent": "Please read and agree to how your report is used (top of the form).",
  "mission.banner": "Evidence mission {id}",
  "offline.title": "Saved on this device", "offline.callout": "You're offline",
  "offline.text": "Your report and photo are kept on this device. They'll be sent and graded as soon as you're back online, even if you close the app.",
  "offline.another": "Make another report",
  // my reports
  "reports.signedIn": "Signed in as {name}", "reports.demo": "(demo)", "stats.reports": "Reports", "stats.verified": "Verified", "stats.review": "Under review", "stats.missions": "Missions helped",
  "waiting.title": "Waiting to send", "waiting.sendNow": "Send now", "waiting.foot": "Saved on this device while you were offline. They're sent automatically when you're back online.",
  "waiting.signs": "Signs: {n}", "waiting.photo": "with photo", "waiting.saved": "Saved {ago}", "waiting.failed": "Couldn't send: {err}", "waiting.delete": "Delete saved report",
  "waiting.still": "Still offline. We'll try again automatically.", "waiting.sent": "Reports sent: {n}",
  "missions.title": "Missions near you", "missions.foot": "Reviewers ask for more evidence where it's thin. A report saying all is fine counts the same.",
  "yours.title": "Your reports", "empty.title": "No reports yet", "empty.text": "Your reports and their grades will appear here.",
  "privacy.title": "Privacy", "privacy.foot": "Removes your contact details and exact locations from every report. The de-identified evidence and its signatures stay valid.",
  "privacy.remove": "Remove my personal data", "privacy.sheet": "Remove personal data",
  "privacy.step1": "This removes your contact details and the exact location of your reports ({n}). You'll be signed out.",
  "privacy.step1b": "The reports themselves stay, without anything that identifies you, so their signed records remain valid.",
  "privacy.continue": "Continue", "privacy.sure": "Are you sure? This can't be undone.", "privacy.keep": "Keep my data", "privacy.done": "Personal data removed from {n} report(s)",
  // report card
  "card.title": "Report {id}", "card.eyebrow": "Your report", "card.sent": "Report sent", "card.sentText": "Here's how your evidence was graded, and what happens next.",
  "card.gradeLabel": "Evidence grade", "card.notGraded": "Not graded", "card.score": "Evidence score",
  "card.gradeNote": "The grade is about how strong the evidence is, not about the stream's ecological status. Formal assessment stays with OneAquaHealth's field protocols.",
  "card.notConfirmed": "Not confirmed by a reviewer", "card.safe": "Stay safe", "card.strengthen": "What would strengthen this",
  "card.why": "Why this grade", "card.whyFoot": "Seven readable checks, 100 points. A report without a photo stays at grade C or below.",
  "card.reported": "Reported", "card.place": "Place", "card.area": "Public area", "card.about100": "(about 100 m)", "card.yourNote": "Your note", "card.mission": "Mission",
  "card.uses": "What it may be used for", "card.usesFoot": "Each trust level unlocks more uses. Every output asks this rule first, and the rule travels with the record.",
  "card.recordOnly": "Kept for the record only.", "card.signed": "Signed record", "card.signedTitle": "Your contribution is signed",
  "card.signedText": "Issued {date}. Anyone can check it hasn't been changed.", "card.pdf": "Certificate (PDF)", "card.check": "Check signature",
  "card.share": "Share", "card.shareText": "A stream report I made", "card.copied": "Share link copied",
  "card.noCert": "You'll receive a signed contribution record once an expert verifies this report.", "card.history": "History", "card.points": "{p} of {max} points",
  "photo.synthetic": "Synthetic demo report: photo metrics only, no image stored.", "photo.none": "No photo with this report.",
  // mission page
  "missionp.title": "Mission {id}", "missionp.eyebrow": "Evidence needed", "missionp.meta": "{place} · opened {date} · answers so far: {n}",
  "missionp.where": "Where to look", "missionp.whereFoot": "Anywhere inside the circle ({m} m).", "missionp.cta": "Report for this mission", "missionp.closed": "This mission is closed.",
  // share card
  "share.title": "A stream report", "share.eyebrow": "Shared from StreamProof", "share.near": "{signs} near {area}", "share.allClear": "All clear near {area}",
  "share.reported": "Reported {date}", "share.verified": "Checked and verified by an expert. Thank you to everyone who helped document it.",
  "share.checking": "Being checked. If you're nearby, you can help document it.", "share.privacy": "Area only. No names, contact details or exact locations are shown.",
  "share.what": "What is StreamProof?",
  // ladder, checks, grades, trust levels
  "ladder.report": "Report", "ladder.assessed": "Assessed", "ladder.community": "Community", "ladder.expert": "Expert", "ladder.decision": "Decision",
  "ladder.aria": "Trust level: {label}, step {n} of 5",
  "check.photo": "Photo", "check.photo_time": "Photo time", "check.location": "Location", "check.stream": "On a stream", "check.nearby": "Nearby reports", "check.context": "Weather", "check.track_record": "Track record",
  "grade.A": "Strong evidence", "grade.B": "Good evidence", "grade.C": "Needs verification", "grade.D": "Low confidence",
  "rung.report": "Report", "rung.assessed": "Assessed", "rung.community-supported": "Community-supported", "rung.expert-verified": "Expert-verified", "rung.decision-grade": "Decision-grade", "rung.not-confirmed": "Not confirmed",
  // signs (chips)
  "sign.algal-scum": "Scum or green water", "sign.odour": "Bad smell", "sign.dead-fish": "Dead fish", "sign.oil-sheen": "Oily sheen", "sign.stagnant-water": "Stagnant water",
  "sign.mosquitoes": "Many mosquitoes", "sign.sewage": "Sewage or discharge", "sign.litter": "Litter", "sign.foam": "Foam", "sign.all-clear": "Everything looks fine",
  // permitted uses
  "use.triage": "Org triage queue", "use.field_check": "Trigger a field-check request", "use.mission": "Open a community evidence mission", "use.org_dashboard": "Org dashboard, labelled unverified",
  "use.public_map": "Public map as 'reported, being checked'", "use.oah_dashboard": "OAH dashboard and DSS input", "use.fhir_exchange": "FHIR exchange with partner systems",
  "use.recognition": "Contributor recognition (signed certificate)", "use.advisory_flag": "Advisory flag to agencies and public-health partners",
  // statuses
  "status.Under review": "Under review", "status.Community-supported, waiting for an expert": "Community-supported, waiting for an expert", "status.Verified": "Verified",
  "status.Passed to partners": "Passed to partners", "status.Not confirmed": "Not confirmed", "status.Community mission open nearby": "Community mission open nearby",
  // backend sentences (see grading.py, evidence.py, brief.py)
  "r.noPhoto": "No photo. Reports without a photo stay at grade C or below.", "r.photoOk": "Photo is clear and well exposed.", "r.photoWarn": "Photo usable but {notes}.",
  "n.small": "small image ({size})", "n.blurry": "looks blurry", "n.dark": "too dark", "n.over": "overexposed",
  "r.noPhotoTime": "No photo, so no capture time to check.", "r.noExif": "Photo has no capture time (common after messaging apps). Time taken from submission.",
  "r.timeOk": "Photo was taken at the time of the report.", "r.timeOld": "Photo appears to be taken {n} days before the report.",
  "r.noGps": "No GPS accuracy given. Please confirm the spot on the map.", "r.gpsOk": "Location confirmed (GPS accuracy {m} m).",
  "r.gpsWarn": "GPS accuracy is {m} m. Confirming on the map would help.", "r.gpsPoor": "GPS accuracy is poor ({m} m). Please confirm the spot on the map.",
  "r.offStream": "Not next to a mapped stream. It may be a pond or an unmapped channel.", "r.onStream": "On {name} ({m} m from the mapped channel).",
  "r.nearStream": "{m} m from {name}; a little far from the channel.",
  "r.contradict": "{n} nearby report(s) in the last 48 h saw nothing of concern.", "r.agreeMany": "{n} other people reported the same within 500 m.",
  "r.agreeOne": "1 other person reported the same within 500 m.", "r.firstReport": "No nearby reports yet (not a penalty for a first report).",
  "r.noWeatherPlace": "No weather data for this place.", "r.noWeatherDate": "No weather data for this date.", "r.rainFlush": "{mm} mm of rain in the last 48 h usually flushes ponded water.",
  "r.dryOk": "Consistent with weather: {mm} mm of rain in 7 days.", "r.rainOk": "Consistent with {mm} mm of recent rain.", "r.weatherNeutral": "Weather neither supports nor contradicts this sign.",
  "r.newObserver": "New observer: no history yet.", "r.trackExpert": "{ok} of {n} earlier reports were confirmed by an expert.",
  "r.trackSome": "{ok} of {n} earlier reports were confirmed.", "r.trackLow": "Only {ok} of {n} earlier reports were confirmed.",
  "h.photo": "Adding a photo would raise this report to at least grade B if the rest holds.", "h.location": "Confirming the exact spot on the map would help.",
  "h.second": "A second photo from upstream, by you or a neighbour, would help confirm this.", "h.sharper": "A sharper close-up of the water would help.",
  "safety": "Keep people and pets away from the water. If there is immediate risk, call 112. StreamProof is not an emergency channel.",
  "m.request": "Evidence needed near you: check the stream {where}. Photograph the water surface, the bank and any {signs}. If everything looks fine, report that too: it counts the same. {payoff}",
  "m.upstream": "about {m} m upstream of the original report", "m.spot": "at the reported spot", "m.raise": "This could raise the evidence from {from} to {to}.",
  "m.extent": "This shows how far the problem extends along the stream.",
  "m.safety": "Stay on public paths. Don't enter or touch the water. Don't photograph people. Leave if it feels unsafe.",
  "place.above": "{name}, {km} km above {mouth}", "place.away": "Away from a mapped stream",
  // accounts and stars
  "signup": "Create account",
  "si.citizen.title": "Sign in as a citizen",
  "si.citizen.body": "Use your citizen account to see your reports and stars on any device.",
  "si.email": "Email",
  "si.password": "Password",
  "si.noAccount": "No account yet?",
  "si.orAnon": "Or report without an account",
  "su.citizen.title": "Create a citizen account",
  "su.citizen.body": "Keep your pseudonym, reports and stars on every device. Your email is never part of the evidence.",
  "su.keep": "Your reports on this device will move into the new account.",
  "su.name": "Your name",
  "su.nameHelp": "Shown on your profile and certificates, never in the evidence.",
  "su.city": "Your city",
  "su.pwHelp": "At least 10 characters.",
  "su.agree": "I agree to how my reports are used.",
  "su.what": "What this means",
  "su.have": "Already have an account?",
  "su.done": "Account created",
  "su.kept": "Account created. Your reports are kept.",
  "acc.profile": "Profile",
  "acc.edit": "Edit profile",
  "acc.name": "Name",
  "acc.role": "Role or job title",
  "acc.bio": "Bio",
  "acc.bioPh": "A line about you (optional)",
  "acc.left": "{n} characters left",
  "acc.colour": "Colour",
  "acc.save": "Save",
  "acc.saved": "Profile saved",
  "acc.since": "Member since {d}",
  "acc.pseudonym": "Pseudonym",
  "acc.demo": "demo citizen",
  "acc.anonTitle": "Reporting without an account",
  "acc.anonBody": "Create an account to keep your reports and stars if you change device. Bio and city need an account.",
  "acc.security": "Sign-in and security",
  "acc.changePw": "Change password",
  "acc.pwCur": "Current password",
  "acc.pwNew": "New password",
  "acc.pwDone": "Password changed",
  "acc.consentYes": "You agreed to how reports are used",
  "acc.consentNo": "You'll be asked to agree before your first report",
  "acc.myReports": "My reports and personal data",
  "acc.signOutCitizen": "Sign out as citizen",
  "acc.outAccount": "You can sign in again with your email and password. Your reports stay in the record.",
  "acc.outAnon": "You have no account, so after signing out this device can't open your reports again. Create an account first to keep them.",
  "acc.outDemo": "You can come back to the demo citizen at any time.",
  "acc.stay": "Stay signed in",
  "acc.outTitle": "You're not signed in",
  "acc.outBody": "Citizens can report with or without an account. Reviewers sign in with their organisation account.",
  "acc.citizenStart": "Sign in or start reporting",
  "acc.foot": "You report under a pseudonym. Your name, email and bio are never part of the evidence or its signature.",
  "rec.title": "Stars",
  "rec.n": "{n} stars",
  "rec.one": "1 star",
  "rec.toNext": "{n} more to {level}",
  "rec.top": "Highest level reached",
  "rec.level.newcomer": "Newcomer",
  "rec.level.observer": "Observer",
  "rec.level.contributor": "Contributor",
  "rec.level.stream-keeper": "Stream keeper",
  "rec.level.river-guardian": "River guardian",
  "rec.how": "How you earned them",
  "rec.rule.confirmed": "Reports confirmed by an expert",
  "rec.rule.decision": "Reports that reached decision grade",
  "rec.rule.mission": "Reports for a mission",
  "rec.fair": "Stars only come from evidence that was checked. A report that isn't confirmed never costs you anything, and there is no ranking: your stars are yours.",
  "rec.badges": "Badges",
  "rec.earned": "Earned",
  "rec.locked": "Not yet",
  "rec.badge.first-report": "First report",
  "rec.badge.first-report.d": "Sent your first report",
  "rec.badge.first-confirmed": "First confirmed",
  "rec.badge.first-confirmed.d": "An expert confirmed one of your reports",
  "rec.badge.all-clear": "All clear",
  "rec.badge.all-clear.d": "A confirmed report that the stream looked fine",
  "rec.badge.mission-helper": "Mission helper",
  "rec.badge.mission-helper.d": "Reported for an open mission",
  "rec.badge.five-confirmed": "Five confirmed",
  "rec.badge.five-confirmed.d": "Five reports confirmed by experts",
  "rec.badge.two-cities": "Two cities",
  "rec.badge.two-cities.d": "Reported in two OneAquaHealth cities",
  // start page and citizen dashboard
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "nav.start": "Start",
  "nav.long.start": "Get started",
  "mode.toOrg": "Switch to organisation",
  "mode.toCitizen": "Switch to citizen",
  "start.title": "Try StreamProof",
  "start.sub": "Choose who you are, then sign in or create an account.",
  "start.citizen": "Citizen",
  "start.citizenText": "Report what you see at a stream and follow it as experts check it. Confirmed reports earn stars.",
  "start.org": "Organisation",
  "start.orgText": "For municipalities, utilities, universities and NGOs: review citizen reports for your city, open missions and publish the River Health Brief.",
  "start.anon": "Report without an account",
  "home.hello": "Hello, {name}",
  "home.reportText": "About a minute. Your report is graded straight away, with reasons.",
  "home.recent": "Recent reports",
  "home.seeAll": "See all",
  "home.none": "No reports yet",
  "home.noneText": "Your first report earns a badge, and every report an expert confirms earns a star.",
  "home.starsLink": "Stars and badges",
  // city picker
  "city.search": "Search any city",
  "city.searchPh": "Search any city, e.g. Lyon",
  "city.none": "No city found",
  "city.offline": "Searching needs a connection. The five OneAquaHealth cities work offline.",
  "city.loading": "Finding the streams of {city} on OpenStreetMap…",
  "city.ready": "{n} mapped streams in {city}, from OpenStreetMap.",
  "city.noStreams": "No named streams are mapped in {city} yet. You can still report; drag the pin to the spot.",
  "city.unavailable": "Couldn't reach OpenStreetMap for {city}. You can still report; stream lines will load later.",
};






// English backend sentence -> (key, variables). Order matters: specific before general.
const PATTERNS: [RegExp, string, string[]][] = [
  [/^Photo usable but (.+)\.$/, "r.photoWarn", ["notes"]],
  [/^Photo appears to be taken (\d+) days before the report\.$/, "r.timeOld", ["n"]],
  [/^Location confirmed \(GPS accuracy (\d+) m\)\.$/, "r.gpsOk", ["m"]],
  [/^GPS accuracy is poor \((\d+) m\)\. Please confirm the spot on the map\.$/, "r.gpsPoor", ["m"]],
  [/^GPS accuracy is (\d+) m\. Confirming on the map would help\.$/, "r.gpsWarn", ["m"]],
  [/^On (.+) \((\d+) m from the mapped channel\)\.$/, "r.onStream", ["name", "m"]],
  [/^(\d+) m from (.+); a little far from the channel\.$/, "r.nearStream", ["m", "name"]],
  [/^(\d+) nearby report\(s\) in the last 48 h saw nothing of concern\.$/, "r.contradict", ["n"]],
  [/^(\d+) other people reported the same within 500 m\.$/, "r.agreeMany", ["n"]],
  [/^([\d.]+) mm of rain in the last 48 h usually flushes ponded water\.$/, "r.rainFlush", ["mm"]],
  [/^Consistent with weather: ([\d.]+) mm of rain in 7 days\.$/, "r.dryOk", ["mm"]],
  [/^Consistent with ([\d.]+) mm of recent rain\.$/, "r.rainOk", ["mm"]],
  [/^(\d+) of (\d+) earlier reports were confirmed by an expert\.$/, "r.trackExpert", ["ok", "n"]],
  [/^Only (\d+) of (\d+) earlier reports were confirmed\.$/, "r.trackLow", ["ok", "n"]],
  [/^(\d+) of (\d+) earlier reports were confirmed\.$/, "r.trackSome", ["ok", "n"]],
  [/^(.+), ([\d.]+) km above (.+)$/, "place.above", ["name", "km", "mouth"]],
];

const EXACT: Record<string, string> = {
  "No photo. Reports without a photo stay at grade C or below.": "r.noPhoto", "Photo is clear and well exposed.": "r.photoOk",
  "No photo, so no capture time to check.": "r.noPhotoTime", "Photo has no capture time (common after messaging apps). Time taken from submission.": "r.noExif",
  "Photo was taken at the time of the report.": "r.timeOk", "No GPS accuracy given. Please confirm the spot on the map.": "r.noGps",
  "Not next to a mapped stream. It may be a pond or an unmapped channel.": "r.offStream", "1 other person reported the same within 500 m.": "r.agreeOne",
  "No nearby reports yet (not a penalty for a first report).": "r.firstReport", "No weather data for this place.": "r.noWeatherPlace",
  "No weather data for this date.": "r.noWeatherDate", "Weather neither supports nor contradicts this sign.": "r.weatherNeutral",
  "New observer: no history yet.": "r.newObserver",
  "Adding a photo would raise this report to at least grade B if the rest holds.": "h.photo", "Confirming the exact spot on the map would help.": "h.location",
  "A second photo from upstream, by you or a neighbour, would help confirm this.": "h.second", "A sharper close-up of the water would help.": "h.sharper",
  "Keep people and pets away from the water. If there is immediate risk, call 112. StreamProof is not an emergency channel.": "safety",
  "Stay on public paths. Don't enter or touch the water. Don't photograph people. Leave if it feels unsafe.": "m.safety",
  "This shows how far the problem extends along the stream.": "m.extent", "Away from a mapped stream": "place.away",
};

const NOTES: [RegExp, string][] = [[/^small image \((.+)\)$/, "n.small"], [/^looks blurry$/, "n.blurry"], [/^too dark$/, "n.dark"], [/^overexposed$/, "n.over"]];
const CHIP_TO_CODE: Record<string, string> = {
  "scum or green water": "algal-scum", "bad smell": "odour", "dead fish": "dead-fish", "oily sheen": "oil-sheen", "stagnant water": "stagnant-water",
  "many mosquitoes": "mosquitoes", "sewage or discharge": "sewage", "litter": "litter", "foam": "foam", "everything looks fine": "all-clear",
};

type Ctx = {
  lang: Lang; setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (english: string, vars?: Record<string, string | number>) => string;
  tr: (english: string | null | undefined) => string;
  sign: (code: string, fallback?: string) => string;
  rung: (value: string, fallback?: string) => string;
};

const I18n = createContext<Ctx>(makeCtx("en", {}, () => {}));
export const useI18n = () => useContext(I18n);

function remember(l: Lang) {
  try { localStorage.setItem("sp-lang", l); } catch { /* private mode */ }
  // the landing page is rendered on the server and reads the language from this cookie
  document.cookie = `sp-lang=${l}; path=/; max-age=31536000; samesite=lax`;
}

function initialLang(): Lang | null {
  let saved: string | null = null;
  try { saved = localStorage.getItem("sp-lang"); } catch { /* private mode */ }
  saved ??= document.cookie.match(/(?:^|; )sp-lang=([a-z]{2})/)?.[1] ?? null;
  if (isLang(saved)) return saved;
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase().replace("nb", "no").replace("nn", "no");
  return isLang(nav) ? nav : null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ lang: Lang; dict: Dict }>({ lang: "en", dict: {} });
  // switch only once the dictionary has arrived, so the page never flashes English in between
  const setLang = useCallback((l: Lang) => {
    remember(l);
    const have = cached(l);
    if (have) { setState({ lang: l, dict: have }); return; }
    loadDict(l).then((dict) => setState({ lang: l, dict })).catch(() => {});
  }, []);
  useEffect(() => {
    const l = initialLang();
    if (l && l !== "en") loadDict(l).then((dict) => setState({ lang: l, dict })).catch(() => {});
  }, []);
  useEffect(() => { document.documentElement.lang = state.lang; }, [state.lang]);

  const value = useMemo<Ctx>(() => makeCtx(state.lang, state.dict, setLang), [state, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

// Server sentences with values in them ("Needs {a} more expert-verified..."), as regexes, per dictionary.
const TEMPLATES = new WeakMap<Dict, [RegExp, string][]>();
function templates(d: Dict): [RegExp, string][] {
  let t = TEMPLATES.get(d);
  if (!t) {
    t = Object.keys(d).filter((k) => /\{[a-h]\}/.test(k)).map((k) => [
      new RegExp("^" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{([a-h])\\\}/g, "(.+?)") + "$"), k,
    ] as [RegExp, string]);
    TEMPLATES.set(d, t);
  }
  return t;
}

function makeCtx(lang: Lang, d: Dict, setLang: (l: Lang) => void): Ctx {
  {
    const t = (key: string, vars?: Record<string, string | number>) => fmt(d[key] ?? en[key] ?? key, vars);
    const tx = (text: string, vars?: Record<string, string | number>) => fmt(d[text] ?? text, vars);
    const sign = (code: string, fallback?: string) => d[`sign.${code}`] ?? fallback ?? en[`sign.${code}`] ?? code;
    const tr = (s: string | null | undefined): string => {
      if (!s) return "";
      if (lang === "en") return s;
      if (d[s]) return d[s];
      if (EXACT[s]) return t(EXACT[s]);
      const chip = CHIP_TO_CODE[s.toLowerCase()];
      if (chip) return sign(chip, s);
      if (d[`status.${s}`]) return d[`status.${s}`];
      for (const [rx, key, names] of PATTERNS) {
        const m = s.match(rx);
        if (!m) continue;
        const vars: Record<string, string> = {};
        names.forEach((n, i) => { vars[n] = m[i + 1]; });
        if (key === "place.above") vars.mouth = vars.mouth.replace(/^the /, ""); // "the Mondego" -> "Mondego"
        if (key === "r.photoWarn") {
          vars.notes = vars.notes.split(", ").map((part) => {
            for (const [nrx, nkey] of NOTES) { const nm = part.match(nrx); if (nm) return t(nkey, { size: nm[1] ?? "" }); }
            return part;
          }).join(", ");
        }
        return t(key, vars);
      }
      // mission request: "Evidence needed near you: check the stream {where}. ... any {signs}. ... {payoff}"
      const mr = s.match(/^Evidence needed near you: check the stream (.+?)\. Photograph the water surface, the bank and any (.+?)\. If everything looks fine, report that too: it counts the same\. (.+)$/);
      if (mr) {
        const up = mr[1].match(/^about (\d+) m upstream of the original report$/);
        const where = up ? t("m.upstream", { m: up[1] }) : t("m.spot");
        const signs = mr[2].split(", ").map((c) => sign(CHIP_TO_CODE[c] ?? c, c).toLowerCase()).join(", ");
        const raise = mr[3].match(/^This could raise the evidence from (\w) to (\w)\.$/);
        const payoff = raise ? t("m.raise", { from: raise[1], to: raise[2] }) : t("m.extent");
        return t("m.request", { where, signs, payoff });
      }
      for (const [rx, key] of templates(d)) {
        const m = s.match(rx);
        if (m) return fmt(d[key], Object.fromEntries(m.slice(1).map((v, i) => ["abcdefgh"[i], tr(v)])));
      }
      return s;
    };
    const rung = (v: string, fallback?: string) => d[`rung.${v}`] ?? fallback ?? en[`rung.${v}`] ?? v;
    return { lang, setLang, t, tx, tr, sign, rung };
  }
}
