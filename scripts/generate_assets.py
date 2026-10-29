# SPDX-License-Identifier: GPL-3.0-or-later
"""
ZXScript Asset Generator - by zxd44
Generates Concept 4 ("Terminal Chevron") icons and GitHub branding banner
following Impeccable minimal software craftsmanship guidelines.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(HERE)
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
EXT_DIR = os.path.join(ROOT_DIR, "zxscript-extension")

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(EXT_DIR, exist_ok=True)


def generate_master_icon():
    """Renders 1024x1024 master icon supersampled 2x from 512."""
    SIZE = 1024
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # 1. Background Squircle with Subtle Inset Border
    pad = 48
    rad = 216
    draw_bg = ImageDraw.Draw(img)
    draw_bg.rounded_rectangle(
        [pad, pad, SIZE - pad, SIZE - pad],
        radius=rad,
        fill=(9, 9, 11, 255),  # Zinc-950 obsidian
        outline=(255, 255, 255, 22),  # Subtle 1px crisp border
        width=4,
    )

    # 2. Glowing Emerald Terminal Cursor
    # Center of glyph optical coordinates
    # Coordinates in 1024 space (scaled 2x from 512):
    cx, cy = 718, 672
    cw, ch = 54, 46

    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle([cx - 24, cy - 24, cx + cw + 24, cy + ch + 24], radius=28, fill=(16, 185, 129, 95))
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    img = Image.alpha_composite(img, glow)

    draw = ImageDraw.Draw(img)

    # 3. Monogram Geometry (Terminal Chevron + ZX)
    # Optical horizontal balance
    x_left = 286
    x_right = 666
    y_top = 320
    y_bot = 704
    sw = 52
    hsw = sw // 2
    fg = (244, 244, 245, 255)  # Crisp white-zinc

    p_tl = (x_left, y_top)
    p_tr = (x_right, y_top)
    p_bl = (x_left, y_bot)
    p_br = (x_right, y_bot)

    # Draw precision strokes
    lines = [
        [p_tl, p_tr],  # Top of Z
        [p_bl, p_br],  # Bottom of Z
        [p_tr, p_bl],  # Main diagonal
        [p_tl, p_br],  # Intersecting diagonal forming X and prompt chevron >
    ]
    for p1, p2 in lines:
        draw.line([p1, p2], fill=fg, width=sw)

    # Smooth circular vertices
    for pt in [p_tl, p_tr, p_bl, p_br]:
        draw.ellipse([pt[0] - hsw, pt[1] - hsw, pt[0] + hsw, pt[1] + hsw], fill=fg)

    # Emerald Terminal Cursor
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=11, fill=(16, 185, 129, 255), outline=(52, 211, 153, 220), width=3)

    return img


def generate_svg():
    """Generates the master SVG vector icon."""
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#141418"/>
      <stop offset="100%" stop-color="#09090b"/>
    </radialGradient>
    <filter id="emeraldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGrad)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2"/>

  <!-- ZX Monogram & Terminal Chevron -->
  <!-- Top bar of Z -->
  <line x1="143" y1="160" x2="333" y2="160" stroke="#f4f4f5" stroke-width="26" stroke-linecap="round"/>
  <!-- Bottom bar of Z -->
  <line x1="143" y1="352" x2="333" y2="352" stroke="#f4f4f5" stroke-width="26" stroke-linecap="round"/>
  <!-- Main diagonal -->
  <line x1="333" y1="160" x2="143" y2="352" stroke="#f4f4f5" stroke-width="26" stroke-linecap="round"/>
  <!-- Intersecting diagonal (Forms Terminal Chevron > and X) -->
  <line x1="143" y1="160" x2="333" y2="352" stroke="#f4f4f5" stroke-width="26" stroke-linecap="round"/>

  <!-- Glowing Emerald Terminal Cursor -->
  <rect x="359" y="336" width="27" height="23" rx="5.5" fill="#10b981" stroke="#34d399" stroke-width="1.5" filter="url(#emeraldGlow)"/>
</svg>
"""
    with open(os.path.join(ASSETS_DIR, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Created assets/icon.svg")


def generate_banner(master_icon):
    """Renders a 1280x640 GitHub banner with Impeccable dark aesthetics."""
    BW, BH = 1280, 640
    banner = Image.new("RGBA", (BW, BH), (9, 9, 11, 255))
    draw = ImageDraw.Draw(banner)

    # 1. Subtle Background Grid (32px pitch, faint zinc)
    for x in range(0, BW, 32):
        draw.line([(x, 0), (x, BH)], fill=(255, 255, 255, 5), width=1)
    for y in range(0, BH, 32):
        draw.line([(0, y), (BW, y)], fill=(255, 255, 255, 5), width=1)

    # 2. Subtle Radial Light Accent in Center
    glow_rad = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_rad)
    glow_draw.ellipse([BW // 2 - 380, BH // 2 - 240, BW // 2 + 380, BH // 2 + 240], fill=(99, 102, 241, 18))
    glow_rad = glow_rad.filter(ImageFilter.GaussianBlur(90))
    banner = Image.alpha_composite(banner, glow_rad)

    # 3. Paste Concept 4 Icon on Left
    icon_sz = 190
    scaled_icon = master_icon.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
    icon_x = 120
    icon_y = (BH - icon_sz) // 2
    banner.paste(scaled_icon, (icon_x, icon_y), scaled_icon)

    draw = ImageDraw.Draw(banner)

    # 4. Typography
    # Try finding system fonts or fallback to clean default
    font_large = None
    font_sub = None
    font_mono = None
    try:
        font_large = ImageFont.truetype("arialbd.ttf", 64)
        font_sub = ImageFont.truetype("arial.ttf", 24)
        font_mono = ImageFont.truetype("consola.ttf", 16)
    except Exception:
        font_large = ImageFont.load_default()
        font_sub = font_large
        font_mono = font_large

    tx = icon_x + icon_sz + 60
    ty = icon_y + 12

    # Brand Title
    draw.text((tx, ty), "ZXScript", fill=(250, 250, 250, 255), font=font_large)

    # Subtitle
    draw.text((tx, ty + 78), "Roblox Studio AI Agent Bridge", fill=(161, 161, 170, 255), font=font_sub)

    # Tagline / Details
    tags = "Autonomous Studio MCP  ·  Bloxstrap & Vanilla  ·  Anti-Ban Shield  ·  GPL-3.0"
    draw.text((tx, ty + 124), tags, fill=(113, 113, 122, 255), font=font_mono)

    # Signature
    draw.text((tx, ty + 154), "Crafted by zxd44 (ZirconX)  ·  v0.0.1", fill=(99, 102, 241, 230), font=font_mono)

    banner.save(os.path.join(ASSETS_DIR, "banner.png"))
    print("Created assets/banner.png")

    # Also write a modern banner.svg
    banner_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <defs>
    <style>
      .title {{ font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; font-weight: 700; fill: #fafafa; font-size: 64px; }}
      .sub {{ font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; font-weight: 500; fill: #a1a1aa; font-size: 24px; }}
      .mono {{ font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Consolas, monospace; font-size: 15px; fill: #71717a; }}
      .accent {{ fill: #818cf8; font-weight: 600; }}
    </style>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
    <pattern id="gridPattern" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1280" height="640" fill="#09090b"/>
  <rect width="1280" height="640" fill="url(#gridPattern)"/>
  <circle cx="640" cy="320" r="420" fill="url(#centerGlow)"/>

  <!-- Icon Placeholder / Embedding -->
  <g transform="translate(120, 225)">
    <rect width="190" height="190" rx="44" fill="#111114" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <line x1="53" y1="59" x2="124" y2="59" stroke="#f4f4f5" stroke-width="10" stroke-linecap="round"/>
    <line x1="53" y1="131" x2="124" y2="131" stroke="#f4f4f5" stroke-width="10" stroke-linecap="round"/>
    <line x1="124" y1="59" x2="53" y2="131" stroke="#f4f4f5" stroke-width="10" stroke-linecap="round"/>
    <line x1="53" y1="59" x2="124" y2="131" stroke="#f4f4f5" stroke-width="10" stroke-linecap="round"/>
    <rect x="134" y="125" width="10" height="8.5" rx="2" fill="#10b981"/>
  </g>

  <text x="370" y="295" class="title">ZXScript</text>
  <text x="370" y="345" class="sub">Roblox Studio AI Agent Bridge</text>
  <text x="370" y="390" class="mono">Autonomous Studio MCP  ·  Bloxstrap &amp; Vanilla  ·  Anti-Ban Shield  ·  GPL-3.0</text>
  <text x="370" y="420" class="mono accent">Crafted by zxd44 (ZirconX)  ·  v0.0.1</text>
</svg>"""
    with open(os.path.join(ASSETS_DIR, "banner.svg"), "w", encoding="utf-8") as f:
        f.write(banner_svg)
    print("Created assets/banner.svg")


def export_sizes(master):
    """Exports multi-resolution icons for assets and extension."""
    sizes = {
        512: "icon.png",
        128: "icon-128.png",
        48: "icon-48.png",
        32: "icon-32.png",
        16: "icon-16.png",
    }

    # Save to assets/
    for sz, filename in sizes.items():
        res = master.resize((sz, sz), Image.Resampling.LANCZOS)
        out_path = os.path.join(ASSETS_DIR, filename)
        res.save(out_path)
        print(f"Exported {out_path}")

    # Save to zxscript-extension/
    ext_sizes = {
        512: "icon.png",
        128: "icon-128.png",
        48: "icon-48.png",
        16: "icon-16.png",
    }
    for sz, filename in ext_sizes.items():
        res = master.resize((sz, sz), Image.Resampling.LANCZOS)
        out_path = os.path.join(EXT_DIR, filename)
        res.save(out_path)
        print(f"Exported {out_path}")


def main():
    print("Generating Concept 4 ('Terminal Chevron') Assets...")
    master = generate_master_icon()
    generate_svg()
    export_sizes(master)
    generate_banner(master)
    print("Asset generation complete!")


if __name__ == "__main__":
    main()
