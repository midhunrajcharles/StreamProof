# Web app checks

Run with both servers up (API on :8740, web on :3200). Needs `pip install playwright` and `playwright install chromium`.

| Script | What it does |
|---|---|
| `e2e.py` | End-to-end through the UI on a phone viewport: sign-in, report, gate refusal, verify, FHIR export, reject, certificate tamper check, offline outbox, tab bar, sheets. Prints PASS/FAIL. **Resets the demo data.** |
| `a11y.py` | axe-core audit of every page, light and dark, phone and desktop. |
| `shots.py` | Screenshots on phone, phone landscape, tablet, desktop, dual-screen (emulated hinge) and dark phone. `python shots.py phone duo` for some devices only. |
| `sheet.py` | Contact sheet of one device's screenshots: `python sheet.py phone 330 1`. |
| `pwa.py` | Service worker + offline check against a production build on :3300 (`npx next build && npx next start -p 3300`). |

**Isolated run** (leaves your own servers and demo data alone): a throwaway API on :8741 with its own data folder, and a separate production build on :3301 that points at it.

```bash
STREAMPROOF_DATA=web/tests/output/e2e-data python -m uvicorn app.main:app --port 8741     # from the repo root
cd web && STREAMPROOF_API=http://127.0.0.1:8741 NEXT_DIST_DIR=.next-e2e npx next build
STREAMPROOF_API=http://127.0.0.1:8741 NEXT_DIST_DIR=.next-e2e npx next start -p 3301
STREAMPROOF_WEB=http://localhost:3301 python tests/e2e.py                                   # same for a11y.py
```

Screenshots go to `output/` (not committed). Curated ones live in `docs/screenshots/`.
