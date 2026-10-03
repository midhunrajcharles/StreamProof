"""Contact sheet: python sheet.py <device> [width] [crop_screens]"""
import sys
from pathlib import Path

from PIL import Image

D = Path(__file__).parent / "output"
dev = sys.argv[1]
w = int(sys.argv[2]) if len(sys.argv) > 2 else 320
screens = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
order = ["report", "reports", "card", "review", "review-detail", "brief", "standards", "verify"]
imgs = []
for k in order:
    p = D / f"{dev}-{k}.png"
    if not p.exists():
        continue
    im = Image.open(p).convert("RGB")
    vh = int(im.width * (844 / 390) * screens) if dev.endswith("phone") else im.height
    im = im.crop((0, 0, im.width, min(im.height, vh)))
    im = im.resize((w, int(im.height * w / im.width)))
    imgs.append(im)
cols = 4
rows = (len(imgs) + cols - 1) // cols
cw, ch = w + 12, max(i.height for i in imgs) + 12
sheet = Image.new("RGB", (cols * cw, rows * ch), (128, 128, 128))
for n, im in enumerate(imgs):
    sheet.paste(im, ((n % cols) * cw + 6, (n // cols) * ch + 6))
out = D / f"sheet-{dev}.png"
sheet.save(out)
print(out, sheet.size)
