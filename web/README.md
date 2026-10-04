# StreamProof web

Next.js 16. The web app (`app/(app)`) is an installable PWA laid out to Apple's Human Interface Guidelines. `/` opens the Try page (`/start`): choose citizen or organisation, then sign in, sign up or report without an account.

```bash
# 1. the API (repo root)
python -m uvicorn app.main:app --port 8740
# 2. the web app (this folder); /api is proxied to the API (STREAMPROOF_API to change it)
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Web app pages

| Route | Who | What |
|---|---|---|
| `/report` | citizen | Photo, place on the map, signs, notes → graded straight away. Works offline (saved on the device, sent later). |
| `/reports`, `/reports/[id]` | citizen | My reports, missions nearby, the report card (grade A–D, 7 reasons, trust ladder, permitted uses, signed record), removing personal data. |
| `/missions/[id]` | citizen | An evidence mission: where to look, safety, report for it. |
| `/review/[id]` | reviewer | Split view: queue / done / map, and the detail: verify, ask for more evidence, not confirmed, permitted-use gate, FHIR export. |
| `/brief` | reviewer | River Health Brief: advisories, evidence by trust level, signals, next steps, missions. Printable. |
| `/standards` | public | Permitted-use matrix, sign → OAH code mapping, FHIR definitions, validation. |
| `/verify/[id]` | public | Check a signed record, and try to tamper with it. |

Also: `/sign-in` (citizens start without a password; organisations sign in with email and password), `/account` (password change; admins manage the team), `/share/[id]` (public card: signs, trust level, area only). Demo accounts are in `app/seed.py`; `STREAMPROOF_DEMO=0` turns the one-tap demo sign-in off.

**45 languages** for citizen and organiser screens, picked from the globe button (`ui/i18n.tsx`; `python tools/check_i18n.py` checks every key exists in every language). Arabic, Hebrew, Persian and Urdu are mirrored right to left. Backend sentences (reasons, hints, missions) are rebuilt from their English patterns. Translations are machine-assisted and still need review by native speakers.

**Any city**: search for a city and its streams come from OpenStreetMap, its rainfall from Open-Meteo. The five OneAquaHealth pilot cities (Coimbra, Benevento, Ghent, Oslo, Toulouse) work offline; their streams outside Coimbra are example urban streams, not OneAquaHealth study sites.

## Design (Apple HIG, applied to the web)

- **Size classes, not devices.** Under 700 px: floating tab bar at the bottom. 700–1099 px: tab bar at the top (iPadOS). From 1100 px: sidebar. Short landscape screens (phones on their side, the closed iPhone Duo's wide outer display): a side rail.
- **Foldables and dual screens** (CSS Viewport Segments): navigation on the first screen, content on the second, nothing in the hinge. Review shows list and detail side by side, as Mail does on iPhone Duo.
- Large titles that hand over to a compact bar on scroll; inset grouped lists; sheets (bottom sheet with swipe to dismiss on phones, form sheet on wider screens); segmented controls; one prominent action per view; destructive actions confirmed.
- 44 pt touch targets, 17 pt body text in `rem` (follows iOS Dynamic Type via `-apple-system-body` and browser text size), safe areas (`viewport-fit=cover`), light and dark mode, increased contrast, reduced motion, status shown with shape and words as well as colour.
- axe-core: no violations on any page, light and dark, phone and desktop.

## Code map

- `ui/` shared: `fonts.ts` (Inter, Xanh Mono, Space Grotesk; SIL OFL), `api.ts` (client + types), `kit.tsx` (page chrome, sections, sheets, segmented control, toasts, sign-in, grade, ladder, reasons), `Shell.tsx` (sidebar / tab bar / rail, outbox sync, service worker), `MapView.tsx` (Leaflet), `outbox.ts` (IndexedDB), `icons.tsx`.
- `app/(app)/app.css` the design system (tokens, layout, components).
- `public/sw.js` service worker; `public/offline.html`; `app/manifest.ts`; `tools/make_icons.py` builds `public/icons/`.
