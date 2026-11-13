"""Derives the images the app ships, in src/assets, from the generated PNG originals in assets-src.

A venue photograph gives two WebP files: <name>.webp for the featured row and the venue page, and
<name>-thumb.webp for the destination cards. A stamp illustration, or the atlas of them, gives
one WebP at its own size, with its transparency kept exactly. Run it after adding or replacing
an original: python scripts/optimize-images.py (needs Pillow).
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "assets-src"
ASSETS = ROOT / "src" / "assets"
# Widths in pixels: the largest place each photograph is shown, at three device pixels to one.
PHOTO_SIZES = {"": 1200, "-thumb": 480}


def save(image, target, quality):
    image.save(target, "WEBP", quality=quality, method=6)
    print(f"{target.name}: {image.width}x{image.height}, {target.stat().st_size // 1024} KB")


for original in sorted([ORIGINALS / "museum-courtyard.png", *ORIGINALS.glob("venue-*.png")]):
    photo = Image.open(original).convert("RGB")
    for suffix, width in PHOTO_SIZES.items():
        height = round(photo.height * width / photo.width)
        resized = photo.resize((width, height), Image.LANCZOS)
        save(resized, ASSETS / f"{original.stem}{suffix}.webp", 80)

for original in sorted([ORIGINALS / "collectible-atlas.png", *ORIGINALS.glob("badge-*.png")]):
    save(Image.open(original).convert("RGBA"), ASSETS / f"{original.stem}.webp", 85)
