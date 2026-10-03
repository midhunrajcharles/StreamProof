# StreamProof web

Next.js 16. Two parts, each with its own root layout:

- **Landing page** (`app/(site)`, route `/`): reuses an existing front-end design unchanged (layout, animations, images, fonts, scripts) with StreamProof / OneAquaHealth content.
- **Web app** (`app/(app)`): the working product. It's an installable PWA in the same type and ink as the landing page, laid out to Apple's Human Interface Guidelines.

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

Sign-in is a demo: each page offers "Continue as demo citizen / reviewer"; one browser can hold both roles.

## Design (Apple HIG, applied to the web)

- **Size classes, not devices.** Under 700 px: floating tab bar at the bottom. 700–1099 px: tab bar at the top (iPadOS). From 1100 px: sidebar. Short landscape screens (phones on their side, the closed iPhone Duo's wide outer display): a side rail.
- **Foldables and dual screens** (CSS Viewport Segments): navigation on the first screen, content on the second, nothing in the hinge. Review shows list and detail side by side, as Mail does on iPhone Duo.
- Large titles that hand over to a compact bar on scroll; inset grouped lists; sheets (bottom sheet with swipe to dismiss on phones, form sheet on wider screens); segmented controls; one prominent action per view; destructive actions confirmed.
- 44 pt touch targets, 17 pt body text in `rem` (follows iOS Dynamic Type via `-apple-system-body` and browser text size), safe areas (`viewport-fit=cover`), light and dark mode, increased contrast, reduced motion, status shown with shape and words as well as colour.
- axe-core: no violations on any page, light and dark, phone and desktop.

## Code map

- `ui/` shared: `api.ts` (client + types), `kit.tsx` (page chrome, sections, sheets, segmented control, toasts, sign-in, grade, ladder, reasons), `Shell.tsx` (sidebar / tab bar / rail, outbox sync, service worker), `MapView.tsx` (Leaflet), `outbox.ts` (IndexedDB), `icons.tsx`.
- `app/(app)/app.css` the design system (tokens, layout, components).
- `public/sw.js` service worker; `public/offline.html`; `app/manifest.ts`; `tools/make_icons.py` builds `public/icons/`.

## Landing page: changes from the source design

1. **Content only.** Text, alt text, labels and link targets are replaced. Markup, classes, styles, images and scripts are untouched.
2. **Wordmark.** The header logo and the large footer mark read STREAMPROOF, set in the design's own display face inside the original logo box.
3. **No tracking.** `public/_astro/analytics.DAZ5jj89.js` is a no-op stub; the original loaded a third party's Google Analytics and Contentsquare tags. The cookie notice now says so.
4. **Links.** CTAs point to the web app pages; "Built on" links point to the OAH FHIR guide, OneAquaHealth, HL7 FHIR R4, the EU grant record and the Devpost page.

## Landing-page media

All photos and videos are in `public/media/`, built by `python tools/media.py` (add `--shots` to re-capture the two product screenshots from the running app):

- Water footage and stills from Pexels (free licence; credited in `public/media/CREDITS.md`). Videos are re-encoded to small, silent H.264 (hero 5.4 MB).
- The two "Product" images are screenshots of the StreamProof app itself.
- Raw downloads stay in `tools/media-src/` (not committed). The source design's photos and videos have been removed.

Still from the source design: its fonts, CSS, animation scripts and a decorative monogram drawing (hero bar and the large outline over the showcase). Check their licences before the repository is made public.
