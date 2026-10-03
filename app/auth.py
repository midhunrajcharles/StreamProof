"""Organisation accounts, citizen consent and rate limits.

- Reviewers and admins sign in with email + password (scrypt, per-user salt).
  Admins manage their team. Accounts survive a demo reset.
- Citizens stay pseudonymous: no password, a random pseudonym per device session,
  and an explicit, recorded consent before their first report.
- Rate limits are in-memory sliding windows (one process); a real deployment would
  put them in the gateway or Redis.
"""

import base64
import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .models import now

CONSENT_VERSION = "2026-10"
ROLES = ("reviewer", "admin")
MIN_PASSWORD = 10


# ---------------- passwords ----------------

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(h).decode()


def check_password(password: str, stored: str) -> bool:
    try:
        _, salt_b64, h_b64 = stored.split("$")
        h = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt_b64), n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(h, base64.b64decode(h_b64))
    except (ValueError, TypeError):
        return False


def new_user(email: str, name: str, role: str, password: str, user_id: str | None = None) -> dict:
    email = email.strip().lower()
    if "@" not in email or len(email) > 200:
        raise ValueError("Enter a valid email address.")
    if role not in ROLES:
        raise ValueError("Role must be reviewer or admin.")
    if len(password) < MIN_PASSWORD:
        raise ValueError(f"Passwords need at least {MIN_PASSWORD} characters.")
    if not name.strip():
        raise ValueError("Enter a name.")
    return {"email": email, "id": user_id or f"exp-{secrets.token_hex(3)}", "name": name.strip()[:80], "role": role,
            "pw_hash": hash_password(password), "active": 1, "created": now().isoformat(timespec="seconds")}


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"], "active": bool(u["active"])}


def new_pseudonym() -> str:
    return f"obs-{secrets.token_hex(3)}"


# ---------------- rate limits ----------------

_hits: dict[tuple, deque] = defaultdict(deque)
_lock = threading.Lock()


def client_ip(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    fwd = request.headers.get("x-forwarded-for")
    # only trust the proxy header when the request comes from the local web server
    if fwd and host in ("127.0.0.1", "::1", "localhost"):
        return fwd.split(",")[0].strip()
    return host


def limit(bucket: str, key: str, max_hits: int, per_seconds: int, record: bool = True) -> None:
    """Allow `max_hits` per `per_seconds` for (bucket, key); otherwise 429 with Retry-After.
    With record=False it only checks; count events yourself with hit() (e.g. failed logins)."""
    t = time.monotonic()
    with _lock:
        q = _hits[(bucket, key)]
        while q and t - q[0] > per_seconds:
            q.popleft()
        if len(q) >= max_hits:
            wait = int(per_seconds - (t - q[0])) + 1
            raise HTTPException(429, f"Too many attempts. Try again in {wait // 60 + 1} minute(s)." if wait > 60
                                else f"Too many attempts. Try again in {wait} seconds.", headers={"Retry-After": str(wait)})
        if record:
            q.append(t)


def hit(bucket: str, key: str) -> None:
    with _lock:
        _hits[(bucket, key)].append(time.monotonic())


def reset_limits() -> None:
    with _lock:
        _hits.clear()
