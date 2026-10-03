# Web app checks

Run with both servers up (API on :8740, web on :3200). Needs `pip install playwright` and `playwright install chromium`.

| Script | What it does |
|---|---|
| `e2e.py` | End-to-end through the UI on a phone viewport: sign-in, report, gate refusal, verify, FHIR export, reject, certificate tamper check, offline outbox, tab bar, sheets. Prints PASS/FAIL. **Resets the demo data.** |
| `a11y.py` | axe-core audit of every page, light and dark, phone and desktop. |
| `shots.py` | Screenshots on phone, phone landscape, tablet, desktop, dual-screen (emulated hinge) and dark phone. `python shots.py phone duo` for some devices only. |
| `sheet.py` | Contact sheet of one device's screenshots: `python sheet.py phone 330 1`. |
| `pwa.py` | Service worker + offline check against a production build on :3300 (`npx next build && npx next start -p 3300`). |

Screenshots go to `output/` (not committed). Curated ones live in `docs/screenshots/`.
