"""Vercel entry point for the API. Serverless disks are read-only except /tmp, so the database,
signing key and caches live there; an empty database seeds itself with the sample data on start."""

import os

os.environ.setdefault("STREAMPROOF_DATA", "/tmp/streamproof")

from app.main import app  # noqa: E402,F401
