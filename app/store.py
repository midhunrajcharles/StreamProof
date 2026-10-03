"""SQLite storage. Two separations that matter:

  evidence  - the report record (coarse location only), its grade, rung and history
  vault     - exact GPS and contact details, org-side only, linked by report id

Deleting a person removes their vault rows and their contact; the de-identified evidence
and its signature stay valid.
"""

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path

from . import config
from .models import Event, Mission, Reason, Report, Rung

_lock = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, created_at TEXT, observer TEXT, body TEXT);
CREATE TABLE IF NOT EXISTS vault (report_id TEXT PRIMARY KEY, lat REAL, lon REAL, contact TEXT);
CREATE TABLE IF NOT EXISTS observers (pseudonym TEXT PRIMARY KEY, display TEXT, contact TEXT);
CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS certificates (report_id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER);
CREATE TABLE IF NOT EXISTS org_users (email TEXT PRIMARY KEY, id TEXT UNIQUE, name TEXT, role TEXT,
                                      pw_hash TEXT, active INTEGER, created TEXT);
CREATE TABLE IF NOT EXISTS consents (pseudonym TEXT PRIMARY KEY, version TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS organisations (id TEXT PRIMARY KEY, name TEXT, city TEXT, about TEXT, website TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS citizen_accounts (pseudonym TEXT PRIMARY KEY, email TEXT UNIQUE, pw_hash TEXT, bio TEXT,
                                             city TEXT, avatar TEXT, created TEXT);
"""

# columns added after the first release, created on old databases at start-up
MIGRATIONS = {"org_users": {"org_id": "TEXT", "title": "TEXT", "bio": "TEXT", "avatar": "TEXT"}}


class Store:
    def __init__(self, path: Path | str = config.DB_PATH):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.executescript(SCHEMA)
        for table, cols in MIGRATIONS.items():
            have = {r[1] for r in self.db.execute(f"PRAGMA table_info({table})")}
            for col, kind in cols.items():
                if col not in have:
                    self.db.execute(f"ALTER TABLE {table} ADD COLUMN {col} {kind}")
        self.db.commit()

    # ids
    def next_id(self, name: str, start: int) -> int:
        with _lock, self.db:
            row = self.db.execute("SELECT value FROM counters WHERE name=?", (name,)).fetchone()
            val = (row[0] + 1) if row else start
            self.db.execute("INSERT OR REPLACE INTO counters VALUES (?,?)", (name, val))
            return val

    # observers
    def upsert_observer(self, pseudonym: str, display: str, contact: str = "") -> None:
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO observers VALUES (?,?,?)", (pseudonym, display, contact))

    def observer_display(self, pseudonym: str) -> str:
        row = self.db.execute("SELECT display FROM observers WHERE pseudonym=?", (pseudonym,)).fetchone()
        return row[0] if row else pseudonym

    def forget_observer(self, pseudonym: str) -> int:
        """Right to erasure: remove contact + exact GPS; keep the de-identified evidence."""
        with _lock, self.db:
            ids = [r[0] for r in self.db.execute("SELECT id FROM evidence WHERE observer=?", (pseudonym,))]
            for rid in ids:
                self.db.execute("UPDATE vault SET contact='', lat=NULL, lon=NULL WHERE report_id=?", (rid,))
            self.db.execute("UPDATE observers SET display='(removed)', contact='' WHERE pseudonym=?", (pseudonym,))
            return len(ids)

    # reports
    def save(self, r: Report, contact: str | None = None) -> None:
        body = r.to_dict()
        lat, lon = body.pop("lat"), body.pop("lon")
        body["area"] = [round(lat, 3), round(lon, 3)]
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO evidence VALUES (?,?,?,?)",
                            (r.id, body["created_at"], r.observer, json.dumps(body)))
            if contact is None:
                self.db.execute("INSERT INTO vault VALUES (?,?,?,'') ON CONFLICT(report_id) DO UPDATE "
                                "SET lat=excluded.lat, lon=excluded.lon", (r.id, lat, lon))
            else:
                self.db.execute("INSERT OR REPLACE INTO vault VALUES (?,?,?,?)", (r.id, lat, lon, contact))

    def save_all(self, reports: list[Report]) -> None:
        for r in reports:
            self.save(r)

    def _load(self, body: str, lat, lon) -> Report:
        d = json.loads(body)
        area = d.pop("area")
        d["lat"] = lat if lat is not None else area[0]
        d["lon"] = lon if lon is not None else area[1]
        d["created_at"] = datetime.fromisoformat(d["created_at"])
        d["rung"] = Rung(d["rung"])
        d["reasons"] = [Reason(**x) for x in d.get("reasons", [])]
        d["history"] = [Event(**x) for x in d.get("history", [])]
        return Report(**d)

    def get(self, rid: str) -> Report | None:
        row = self.db.execute("SELECT e.body, v.lat, v.lon FROM evidence e LEFT JOIN vault v ON v.report_id=e.id "
                              "WHERE e.id=?", (rid,)).fetchone()
        return self._load(*row) if row else None

    def all(self) -> list[Report]:
        rows = self.db.execute("SELECT e.body, v.lat, v.lon FROM evidence e LEFT JOIN vault v ON v.report_id=e.id "
                               "ORDER BY e.created_at").fetchall()
        return [self._load(*r) for r in rows]

    def by_observer(self, pseudonym: str) -> list[Report]:
        return [r for r in self.all() if r.observer == pseudonym]

    # missions
    def save_mission(self, m: Mission) -> None:
        d = dict(m.__dict__)
        d["created_at"] = m.created_at.isoformat()
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO missions VALUES (?,?)", (m.id, json.dumps(d)))

    def missions(self) -> list[Mission]:
        out = []
        for (body,) in self.db.execute("SELECT body FROM missions"):
            d = json.loads(body)
            d["created_at"] = datetime.fromisoformat(d["created_at"])
            out.append(Mission(**d))
        return sorted(out, key=lambda m: m.created_at, reverse=True)

    def mission(self, mid: str) -> Mission | None:
        return next((m for m in self.missions() if m.id == mid), None)

    # certificates
    def save_certificate(self, report_id: str, cert: dict) -> None:
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO certificates VALUES (?,?)", (report_id, json.dumps(cert)))

    def certificate(self, report_id: str) -> dict | None:
        row = self.db.execute("SELECT body FROM certificates WHERE report_id=?", (report_id,)).fetchone()
        return json.loads(row[0]) if row else None

    # organisation accounts (reviewers, admins)
    _USER_COLS = ("email", "id", "name", "role", "pw_hash", "active", "created", "org_id", "title", "bio", "avatar")

    def save_user(self, u: dict) -> None:
        cols = self._USER_COLS
        with _lock, self.db:
            self.db.execute(f"INSERT OR REPLACE INTO org_users ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
                            tuple(u.get(c) for c in cols))

    def user(self, email: str) -> dict | None:
        row = self.db.execute(f"SELECT {','.join(self._USER_COLS)} FROM org_users WHERE email=?", (email.strip().lower(),)).fetchone()
        return dict(zip(self._USER_COLS, row)) if row else None

    def user_by_id(self, uid: str) -> dict | None:
        row = self.db.execute(f"SELECT {','.join(self._USER_COLS)} FROM org_users WHERE id=?", (uid,)).fetchone()
        return dict(zip(self._USER_COLS, row)) if row else None

    def users(self, org_id: str | None = None) -> list[dict]:
        q = f"SELECT {','.join(self._USER_COLS)} FROM org_users" + (" WHERE org_id=?" if org_id else "") + " ORDER BY created"
        return [dict(zip(self._USER_COLS, r)) for r in self.db.execute(q, (org_id,) if org_id else ())]

    # organisations
    _ORG_COLS = ("id", "name", "city", "about", "website", "created")

    def save_org(self, o: dict) -> None:
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO organisations VALUES (?,?,?,?,?,?)", tuple(o.get(c) for c in self._ORG_COLS))

    def org(self, oid: str) -> dict | None:
        row = self.db.execute("SELECT * FROM organisations WHERE id=?", (oid,)).fetchone()
        return dict(zip(self._ORG_COLS, row)) if row else None

    # citizen accounts (optional: email + password on top of the pseudonym)
    _CIT_COLS = ("pseudonym", "email", "pw_hash", "bio", "city", "avatar", "created")

    def save_citizen_account(self, a: dict) -> None:
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO citizen_accounts VALUES (?,?,?,?,?,?,?)", tuple(a.get(c) for c in self._CIT_COLS))

    def citizen_account(self, pseudonym: str) -> dict | None:
        row = self.db.execute("SELECT * FROM citizen_accounts WHERE pseudonym=?", (pseudonym,)).fetchone()
        return dict(zip(self._CIT_COLS, row)) if row else None

    def citizen_account_by_email(self, email: str) -> dict | None:
        row = self.db.execute("SELECT * FROM citizen_accounts WHERE email=?", (email.strip().lower(),)).fetchone()
        return dict(zip(self._CIT_COLS, row)) if row else None

    def delete_citizen_account(self, pseudonym: str) -> None:
        with _lock, self.db:
            self.db.execute("DELETE FROM citizen_accounts WHERE pseudonym=?", (pseudonym,))

    # consent (citizens)
    def save_consent(self, pseudonym: str, version: str, at: str) -> None:
        with _lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO consents VALUES (?,?,?)", (pseudonym, version, at))

    def consent(self, pseudonym: str) -> dict | None:
        row = self.db.execute("SELECT version, at FROM consents WHERE pseudonym=?", (pseudonym,)).fetchone()
        return {"version": row[0], "at": row[1]} if row else None

    def reset(self) -> None:
        """Demo reset: evidence, observers and missions. Organisations and all accounts are kept."""
        with _lock, self.db:
            for t in ("evidence", "vault", "missions", "certificates", "counters"):
                self.db.execute(f"DELETE FROM {t}")
            # people with an account keep their name and consent
            keep = "SELECT pseudonym FROM citizen_accounts"
            self.db.execute(f"DELETE FROM observers WHERE pseudonym NOT IN ({keep})")
            self.db.execute(f"DELETE FROM consents WHERE pseudonym NOT IN ({keep})")
