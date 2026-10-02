import os
import tempfile

# Point the app at a throwaway data dir before anything imports app.config.
os.environ.setdefault("STREAMPROOF_DATA", tempfile.mkdtemp(prefix="streamproof-test-"))
