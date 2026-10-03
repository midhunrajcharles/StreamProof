"""StreamProof API server. The web app (landing page, citizen PWA, organisation portal) lives in
`web/` and reaches this server through its `/api` rewrite.

    uvicorn app.main:app --port 8740 --reload
"""

import os

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from . import cities, config, seed
from .store import Store

WEB_URL = os.environ.get("STREAMPROOF_WEB_URL", "http://localhost:3200/")

app = FastAPI(title="StreamProof", docs_url=None, redoc_url=None)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_SECRET, same_site="lax", https_only=False)
app.mount("/fhir/definitions", StaticFiles(directory=config.ROOT / "fhir" / "definitions"), name="fhirdefs")

store = Store()
if not store.all():
    seed.run(store)
seed.ensure_accounts(store)
cities.load(store)

from .accounts import router as accounts_router  # noqa: E402
from .api import router as api_router  # noqa: E402  (the API reads the store above)

app.include_router(api_router)
app.include_router(accounts_router)


@app.get("/", include_in_schema=False)
def home():
    """This server only serves the API; send browsers to the web app."""
    return RedirectResponse(WEB_URL)
