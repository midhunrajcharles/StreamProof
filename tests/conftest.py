import os
import tempfile

# Point the app at a throwaway data dir before anything imports app.config.
os.environ.setdefault("STREAMPROOF_DATA", tempfile.mkdtemp(prefix="streamproof-test-"))
# Never call OpenStreetMap / Open-Meteo from tests; tests that need a fetched city fake the fetch.
os.environ.setdefault("STREAMPROOF_NETWORK", "0")
