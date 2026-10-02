"""Contribution certificate as a one-page PDF. The QR-free design keeps it printable; the
verify link and the hash let anyone check it against the organization's public key."""

import io
import textwrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

from .indicators import INDICATORS

INK = colors.HexColor("#0f2a2e")
TEAL = colors.HexColor("#0e7c7b")
MUTED = colors.HexColor("#5b6b6e")


def pdf(display_name: str, record: dict, signed: dict, verify_url: str) -> bytes:
    buf = io.BytesIO()
    w, h = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setTitle(f"StreamProof contribution record {record['record']}")
    c.setFillColor(colors.HexColor("#f4f8f7"))
    c.rect(0, 0, w, h, stroke=0, fill=1)
    c.setStrokeColor(TEAL)
    c.setLineWidth(3)
    c.rect(28, 28, w - 56, h - 56, stroke=1, fill=0)

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(60, h - 80, "STREAMPROOF  ·  CONTRIBUTION RECORD")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 34)
    c.drawString(60, h - 130, display_name)
    c.setFont("Helvetica", 15)
    signs = ", ".join(INDICATORS[s].display.lower() for s in record["signs"])
    lines = textwrap.wrap(
        f"reported {signs} at a city stream on {record['reported_on']}. The report was "
        f"{record['rung'].replace('-', ' ')} ({record['verified_how']} check) on {record['verified_on']} "
        f"and now contributes to local One Health monitoring.", 95)
    y = h - 165
    for ln in lines:
        c.drawString(60, y, ln)
        y -= 21

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 11)
    rows = [("Record", record["record"]), ("Evidence grade", record["grade"]),
            ("Area (approx. 100 m)", f"{record['area'][0]}, {record['area'][1]}"),
            ("Verified by", f"{record['verified_by']} ({record['verified_how']})"),
            ("Signed by", signed["signed_by"]), ("Algorithm", signed["alg"])]
    y = 250
    for k, v in rows:
        c.drawString(60, y, k)
        c.setFillColor(INK)
        c.drawString(210, y, str(v))
        c.setFillColor(MUTED)
        y -= 18
    c.setFont("Courier", 8.5)
    c.drawString(60, 116, f"SHA-256  {signed['sha256']}")
    c.drawString(60, 104, f"Ed25519  {signed['signature'][:88]}")
    c.drawString(60, 92, f"         {signed['signature'][88:]}")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEAL)
    c.drawString(60, 70, f"Check it: {verify_url}")
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Oblique", 9)
    c.drawRightString(w - 60, 70, "Tamper-evident signature over the de-identified record. Not a blockchain.")
    c.showPage()
    c.save()
    return buf.getvalue()
