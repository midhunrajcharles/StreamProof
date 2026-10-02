"""Photo checks that need no AI: is the image big enough, sharp enough, exposed, and when was it taken.

Sharpness is the variance of a Laplacian filter on a downscaled greyscale copy, a
standard blur measure. Thresholds are deliberately loose; they flag, they don't reject.
"""

import hashlib
import io
from dataclasses import asdict, dataclass
from datetime import datetime

import numpy as np
from PIL import ExifTags, Image, ImageOps

MIN_SHORT_SIDE = 480
BLUR_THRESHOLD = 60.0
DARK, BRIGHT = 35.0, 225.0


@dataclass
class PhotoMetrics:
    sha256: str
    width: int
    height: int
    sharpness: float
    brightness: float
    exif_time: str | None  # ISO, as written by the camera (no timezone in EXIF)
    has_gps_exif: bool

    def to_dict(self) -> dict:
        return asdict(self)


def _laplacian_var(gray: np.ndarray) -> float:
    g = gray.astype(np.float32)
    lap = (-4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:])
    return float(lap.var())


def _exif(img: Image.Image) -> tuple[str | None, bool]:
    try:
        exif = img.getexif()
    except Exception:
        return None, False
    when = None
    sub = exif.get_ifd(ExifTags.IFD.Exif) if exif else {}
    raw = sub.get(ExifTags.Base.DateTimeOriginal) or exif.get(ExifTags.Base.DateTime)
    if raw:
        try:
            when = datetime.strptime(str(raw).strip(), "%Y:%m:%d %H:%M:%S").isoformat()
        except ValueError:
            when = None
    has_gps = bool(exif.get_ifd(ExifTags.IFD.GPSInfo)) if exif else False
    return when, has_gps


def analyse(data: bytes) -> PhotoMetrics:
    img = Image.open(io.BytesIO(data))
    when, has_gps = _exif(img)
    img = ImageOps.exif_transpose(img).convert("L")
    w, h = img.size
    small = img.copy()
    small.thumbnail((800, 800))
    arr = np.asarray(small)
    return PhotoMetrics(
        sha256=hashlib.sha256(data).hexdigest(),
        width=w,
        height=h,
        sharpness=round(_laplacian_var(arr), 1),
        brightness=round(float(arr.mean()), 1),
        exif_time=when,
        has_gps_exif=has_gps,
    )


def strip_metadata(data: bytes) -> bytes:
    """Re-encode without EXIF so stored/shared photos don't leak the camera's GPS."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    img.thumbnail((1600, 1600))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()
