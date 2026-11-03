"""Draws the PNG app icons (icons/icon-*.png) from the same geometry as icons/icon.svg.

Usage: python scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
ORANGE = (217, 72, 15, 255)
WHITE = (255, 255, 255, 255)
FAINT = (255, 255, 255, 140)


def draw(size: int, rounded: bool) -> Image.Image:
    k = size / 512
    big = Image.new("RGBA", (512 * 2, 512 * 2), (0, 0, 0, 0))  # 2x supersampling for smooth edges
    d = ImageDraw.Draw(big)
    s = 2
    if rounded:
        d.rounded_rectangle((0, 0, 512 * s, 512 * s), radius=112 * s, fill=ORANGE)
    else:
        d.rectangle((0, 0, 512 * s, 512 * s), fill=ORANGE)  # maskable icons are cropped by the system
    for x in (136, 184, 232, 280, 328, 376):
        d.line((x * s, 112 * s, x * s, 400 * s), fill=FAINT, width=10 * s)
    for y in (200, 288, 376):
        d.line((136 * s, y * s, 376 * s, y * s), fill=FAINT, width=8 * s)
    d.line((124 * s, 112 * s, 388 * s, 112 * s), fill=WHITE, width=22 * s)
    for cx, cy in ((232, 244), (328, 332), (184, 332)):
        d.ellipse(((cx - 30) * s, (cy - 30) * s, (cx + 30) * s, (cy + 30) * s), fill=WHITE)
    return big.resize((round(512 * k), round(512 * k)), Image.LANCZOS)


if __name__ == "__main__":
    draw(180, rounded=False).save(OUT / "icon-180.png")
    draw(192, rounded=True).save(OUT / "icon-192.png")
    draw(512, rounded=False).save(OUT / "icon-512.png")
    print("wrote", ", ".join(p.name for p in sorted(OUT.glob("icon-*.png"))))
