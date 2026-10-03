"""Accounts and profiles for both roles: sign up, sign in, sign out, profile, password, stars.

Citizens
  - can report without an account (a pseudonym on the device), or
  - sign up with email + password to keep their pseudonym across devices.
  The evidence only ever carries the pseudonym; email and password live in a separate
  table and are deleted with "remove my personal data".

Organisations
  - sign up creates the organisation (tied to one OneAquaHealth city) and its first admin;
  - admins add reviewers; everyone edits their own profile.
"""

import secrets

from fastapi import APIRouter, Depends, Form, HTTPException, Request

from . import auth, recognition
from .api import _citizen_session, _general_limit, _org_session, _store, admin, role, session_get
from .models import now

router = APIRouter(prefix="/api", dependencies=[Depends(_general_limit)])


def _bad(e: ValueError) -> HTTPException:
    return HTTPException(400, str(e))


def _clean_profile(display: str, bio: str, city: str, avatar: str) -> tuple[str, str, str, str]:
    display = display.strip()[:40]
    if not display:
        raise ValueError("Enter a name.")
    if len(bio.strip()) > auth.BIO_MAX:
        raise ValueError(f"Keep the bio under {auth.BIO_MAX} characters.")
    if city and city not in auth.CITIES:
        raise ValueError("Choose one of the five cities.")
    if avatar and avatar not in auth.AVATARS:
        raise ValueError("Unknown avatar colour.")
    return display, bio.strip(), city, avatar


# ================================================================ citizens

@router.post("/citizen/signup")
def citizen_signup(request: Request, display: str = Form(...), email: str = Form(...), password: str = Form(...),
                   city: str = Form("Coimbra"), agree: str = Form("")):
    """Create a citizen account. If this device already reports anonymously, the account
    keeps that pseudonym (and its reports); otherwise a new pseudonym is made."""
    auth.limit("signup", auth.client_ip(request), 10, 3600)
    store = _store()
    try:
        email = auth.check_email(email)
        auth.check_password_rules(password)
        display, _, city, _ = _clean_profile(display, "", city, "")
    except ValueError as e:
        raise _bad(e)
    if store.citizen_account_by_email(email):
        raise HTTPException(409, "There is already an account with that email. Sign in instead.")
    current = request.session.get("citizen")
    reuse = current and not current.get("demo") and not store.citizen_account(current["id"])
    pseudonym = current["id"] if reuse else auth.new_pseudonym()
    store.upsert_observer(pseudonym, display)
    store.save_citizen_account({"pseudonym": pseudonym, "email": email, "pw_hash": auth.hash_password(password), "bio": "",
                                "city": city, "avatar": auth.AVATARS[secrets.randbelow(len(auth.AVATARS))],
                                "created": now().isoformat(timespec="seconds")})
    if agree == "1":
        store.save_consent(pseudonym, auth.CONSENT_VERSION, now().isoformat(timespec="seconds"))
    _citizen_session(request, pseudonym)
    return {**session_get(request), "kept_reports": bool(reuse)}


@router.post("/citizen/login")
def citizen_login(request: Request, email: str = Form(...), password: str = Form(...)):
    key = email.strip().lower()
    auth.limit("login-ip", auth.client_ip(request), 30, 900)
    auth.limit("citizen-login-fail", key, 5, 900, record=False)
    acct = _store().citizen_account_by_email(key)
    if not acct or not auth.check_password(password, acct["pw_hash"]):
        auth.hit("citizen-login-fail", key)
        raise HTTPException(401, "That email and password don't match an account.")
    _citizen_session(request, acct["pseudonym"])
    return session_get(request)


@router.get("/citizen/profile")
def citizen_profile(request: Request):
    u = role(request, "citizen")
    store = _store()
    acct = store.citizen_account(u["id"]) or {}
    return {"pseudonym": u["id"], "display": store.observer_display(u["id"]), "demo": bool(u.get("demo")),
            "has_account": bool(acct), "email": acct.get("email"), "bio": acct.get("bio") or "",
            "city": acct.get("city") or "", "avatar": acct.get("avatar") or u.get("avatar") or "water",
            "member_since": acct.get("created"), "consent": store.consent(u["id"]),
            "recognition": recognition.citizen(u["id"], store.all())}


@router.post("/citizen/profile")
def citizen_profile_update(request: Request, display: str = Form(...), bio: str = Form(""), city: str = Form(""),
                           avatar: str = Form("")):
    u = role(request, "citizen")
    store = _store()
    try:
        display, bio, city, avatar = _clean_profile(display, bio, city, avatar)
    except ValueError as e:
        raise _bad(e)
    store.upsert_observer(u["id"], display)
    acct = store.citizen_account(u["id"])
    if acct:  # bio, city and avatar belong to the account; without one only the name is kept
        store.save_citizen_account({**acct, "bio": bio, "city": city or acct.get("city"), "avatar": avatar or acct.get("avatar")})
    _citizen_session(request, u["id"], demo=bool(u.get("demo")))
    return citizen_profile(request)


@router.post("/citizen/password")
def citizen_password(request: Request, current: str = Form(...), new: str = Form(...)):
    u = role(request, "citizen")
    store = _store()
    acct = store.citizen_account(u["id"])
    if not acct:
        raise HTTPException(400, "You don't have an account yet. Create one to set a password.")
    auth.limit("citizen-password-fail", u["id"], 5, 900, record=False)
    if not auth.check_password(current, acct["pw_hash"]):
        auth.hit("citizen-password-fail", u["id"])
        raise HTTPException(400, "Your current password isn't right.")
    try:
        auth.check_password_rules(new)
    except ValueError as e:
        raise _bad(e)
    store.save_citizen_account({**acct, "pw_hash": auth.hash_password(new)})
    return {"ok": True}


# ================================================================ organisations

@router.post("/org/signup")
def org_signup(request: Request, org_name: str = Form(...), city: str = Form(...), name: str = Form(...),
               email: str = Form(...), password: str = Form(...)):
    """Create an organisation for one OneAquaHealth city, with you as its first admin."""
    auth.limit("signup", auth.client_ip(request), 10, 3600)
    store = _store()
    org_name = org_name.strip()[:80]
    if not org_name:
        raise HTTPException(400, "Enter the organisation's name.")
    if city not in auth.CITIES:
        raise HTTPException(400, "Choose one of the five cities.")
    if store.user(email):
        raise HTTPException(409, "There is already an account with that email. Sign in instead.")
    org = {"id": f"org-{secrets.token_hex(3)}", "name": org_name, "city": city, "about": "", "website": "",
           "created": now().isoformat(timespec="seconds")}
    try:
        user = auth.new_user(email, name, "admin", password, org_id=org["id"])
    except ValueError as e:
        raise _bad(e)
    store.save_org(org)
    store.save_user(user)
    _org_session(request, user)
    return session_get(request)


@router.get("/org/profile")
def org_profile(request: Request):
    u = role(request, "org")
    store = _store()
    acct = store.user(u["email"])
    org = store.org(acct.get("org_id") or "") or {}
    return {**auth.public_user(acct), "member_since": acct.get("created"),
            "organisation": {k: org.get(k) for k in ("id", "name", "city", "about", "website")},
            "recognition": recognition.reviewer(acct["id"], store.all(), store.missions())}


@router.post("/org/profile")
def org_profile_update(request: Request, name: str = Form(...), title: str = Form(""), bio: str = Form(""), avatar: str = Form("")):
    u = role(request, "org")
    store = _store()
    acct = store.user(u["email"])
    name = name.strip()[:80]
    if not name:
        raise HTTPException(400, "Enter a name.")
    if len(bio.strip()) > auth.BIO_MAX:
        raise HTTPException(400, f"Keep the bio under {auth.BIO_MAX} characters.")
    if avatar and avatar not in auth.AVATARS:
        raise HTTPException(400, "Unknown avatar colour.")
    store.save_user({**acct, "name": name, "title": title.strip()[:80], "bio": bio.strip(), "avatar": avatar or acct.get("avatar")})
    _org_session(request, store.user(u["email"]))
    return org_profile(request)


@router.post("/org/organisation")
def org_update(request: Request, name: str = Form(...), about: str = Form(""), website: str = Form("")):
    me = admin(request)
    store = _store()
    org = store.org(me.get("org_id") or "")
    if not org:
        raise HTTPException(404, "No organisation.")
    name = name.strip()[:80]
    website = website.strip()[:200]
    if not name:
        raise HTTPException(400, "Enter the organisation's name.")
    if website and not website.startswith(("https://", "http://")):
        raise HTTPException(400, "The website should start with https://")
    store.save_org({**org, "name": name, "about": about.strip()[:500], "website": website})
    _org_session(request, store.user(me["email"]))
    return org_profile(request)
