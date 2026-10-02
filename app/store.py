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
"""


class Store:
    def __init__(self, path: Path | str = config.DB_PATH):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.executescript(SCHEMA)

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

    def reset(self) -> None:
        with _lock, self.db:
            for t in ("evidence", "vault", "observers", "missions", "certificates", "counters"):
                self.db.execute(f"DELETE FROM {t}")
