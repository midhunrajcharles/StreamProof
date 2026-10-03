# StreamProof web

The StreamProof landing page (Next.js 16). It reuses an existing front-end design unchanged (layout, animations, images, fonts, scripts) and replaces only the content with StreamProof / OneAquaHealth text.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Structure

- `app/page.tsx` puts the sections in order: hero, intro ("Built on"), product, how it works, what it adds, who it serves, why, FAQ, try it, footer.
- `components/sections/` and `components/chrome/` hold one server component per block. All copy lives in their string literals.
- `components/HeadTags.tsx` holds the font faces, stylesheet and JSON-LD (a `SoftwareApplication` plus an `FAQPage` matching the FAQ section).
- `components/SiteScripts.tsx` loads the design's animation scripts from `public/_astro/` after hydration, in their original order.
- `public/brand/` holds the two text wordmarks in the "Built on" wall. They are plain type, not official logos.

## Changes from the source design

1. **Content only.** Text, alt text, labels and link targets are replaced. Markup, classes, styles, images and scripts are untouched.
2. **Wordmark.** The header logo and the large footer mark read STREAMPROOF, set in the design's own display face inside the original logo box.
3. **No tracking.** `public/_astro/analytics.DAZ5jj89.js` is a no-op stub; the original loaded a third party's Google Analytics and Contentsquare tags. The cookie notice now says so.
4. **Links.** CTAs point to the StreamProof pages `/report`, `/review`, `/brief` and `/standards`; "Built on" links point to the OAH FHIR guide, OneAquaHealth, HL7 FHIR R4, the EU grant record and the Devpost page.

## Still to replace before publishing

These slots still show the source design's media and must get StreamProof's own:

- Portrait photos (intro, process, about, FAQ): team photos.
- Product images and hover videos (product, what it adds): screenshots and clips of the StreamProof app.
- Hero video (`data-src` on the hero `<video>`): the StreamProof demo video.
- Background photos (showcase, who it serves): real stream photos taken by the team.
