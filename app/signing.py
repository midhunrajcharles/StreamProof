"""Tamper-evident contribution records.

The organization signs a SHA-256 hash of the de-identified verified record with an
Ed25519 key. Anyone holding the public key can check that the record was not changed.
This is a signature, not a blockchain. Deleting a person's identity link later does not
break it, because the hash never covered their identity.
"""

import base64
import hashlib
import json

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

from . import config
from .models import Report


def _load_or_create() -> Ed25519PrivateKey:
    p = config.KEY_PATH
    if p.exists():
        key = serialization.load_pem_private_key(p.read_bytes(), password=None)
        assert isinstance(key, Ed25519PrivateKey)
        return key
    p.parent.mkdir(parents=True, exist_ok=True)
    key = Ed25519PrivateKey.generate()
    p.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                    serialization.NoEncryption()))
    return key


def public_key_b64() -> str:
    raw = _load_or_create().public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return base64.b64encode(raw).decode()


def deidentified(r: Report) -> dict:
    """What the certificate covers: no exact GPS, no contact details, pseudonym only."""
    lat, lon = round(r.lat, 3), round(r.lon, 3)
    return {
        "record": r.id,
        "observer": r.observer,
        "signs": sorted(r.indicators),
        "area": [lat, lon],
        "reported_on": r.created_at.date().isoformat(),
        "grade": r.grade,
        "rung": r.rung.value,
        "verified_by": (r.verification or {}).get("by"),
        "verified_how": (r.verification or {}).get("method"),
        "verified_on": ((r.verification or {}).get("at") or "")[:10],
        "photo_sha256": (r.photo or {}).get("sha256"),
    }


def canonical(d: dict) -> bytes:
    return json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def digest(d: dict) -> str:
    return hashlib.sha256(canonical(d)).hexdigest()


def sign(d: dict) -> dict:
    h = digest(d)
    sig = _load_or_create().sign(bytes.fromhex(h))
    return {"sha256": h, "signature": base64.b64encode(sig).decode(), "alg": "Ed25519",
            "public_key": public_key_b64(), "signed_by": config.ORG_NAME}


def verify(d: dict, sha256_hex: str, signature_b64: str, public_key: str | None = None) -> tuple[bool, str]:
    if digest(d) != sha256_hex:
        return False, "The record has changed since it was signed (hash mismatch)."
    pk = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key or public_key_b64()))
    try:
        pk.verify(base64.b64decode(signature_b64), bytes.fromhex(sha256_hex))
    except InvalidSignature:
        return False, "The signature does not match the organization's key."
    return True, "Valid: the record is unchanged and was signed by the organization."
