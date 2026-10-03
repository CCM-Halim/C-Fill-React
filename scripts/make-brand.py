"""Generator ikon & wordmark C-Fill v2.0 (copyright 2026).

Cara pakai (dari ~/c-fill):
    ~/zenith-brand/.venv-svg/bin/python scripts/make-brand.py

Menghasilkan:
   public/brand/appicon.svg, monogram.svg, wordmark.svg, lockup-dark.svg
   public/icon-192.png, icon-512.png, icon-maskable-512.png
   public/apple-touch-icon.png, favicon-32.png, favicon-16.png
   public/brand/monogram-512.png, wordmark.png

================================ PERANGKAP PENTING ================================
`stroke-width` di SVG ditulis dalam KOORDINAT LOKAL, jadi kalau suatu elemen
diberi `transform="... scale(s)"`, ketebalan garisnya IKUT dikali s. Versi
pertama generator ini menuliskan stroke-width 1.95 lalu transform scale(20) —
hasilnya garis setebal ~39 unit, dan ikonnya terlihat seperti satu blok penuh
(bukan bolt). Karena markup-nya sendiri terlihat benar, bug ini hanya kelihatan
di hasil render. Sekarang ketebalan SELALU dihitung sebagai
`tebal_target_px / skala`, dan diverifikasi piksel oleh scripts/verify-brand.mjs.
===================================================================================
"""
import pathlib
import sys

import cairosvg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from textpath import TextToPath  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'brand'
PUB = ROOT / 'public'
FONTS = pathlib.Path('/tmp/fonts')

# Warna disamakan dengan styles.css: --accent #256D5C, --accent-strong #184F42.
ACCENT = '#256D5C'
ACCENT_STRONG = '#184F42'
ACCENT_DEEP = '#0F3A31'
PAPER = '#F6F4EE'
BOLT = '#F2F1EB'
INK = '#20262A'

BOLT_PATH = 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z'
BOLT_BOX = 24.0            # bolt di atas digambar dalam kotak 24x24
BOLT_STROKE_RATIO = 0.085  # ketebalan garis sebagai bagian dari tinggi kotak


def _tf(cx, cy, box, optik=True):
    """Transform bolt: dipusatkan di (cx,cy) dengan tinggi `box` px."""
    scale = box / BOLT_BOX
    ofs = 1.0 if optik else 0.0        # bolt memakai x=4..18, tengahnya 11 bukan 12
    return (f'translate({cx + (ofs - BOLT_BOX / 2) * scale:.3f} '
            f'{cy - BOLT_BOX / 2 * scale:.3f}) scale({scale:.6f})')


def bolt(cx, cy, box, stroke_px=None, dash=None, optik=True):
    """Bolt terpusat di (cx,cy) dengan tinggi `box` px.

    Mengembalikan string atribut path yang SIAP dipakai (sudah termasuk
    transform), dengan stroke-width dikompensasi terhadap skala.

    `optik=True` menggeser bolt 1 unit ke kanan: kotak path-nya 24x24 tapi
    gambarnya cuma memakai x=4..18, jadi titik tengah geometrisnya di x=11 -
    bukan 12. Tanpa kompensasi ini bolt terlihat miring ke kiri (terukur ~19 px
    pada ikon 512).
    """
    scale = box / BOLT_BOX
    stroke_final = stroke_px if stroke_px is not None else box * BOLT_STROKE_RATIO
    stroke_attr = stroke_final / scale      # <- kompensasi: stroke ikut diskala
    d = _tf(cx, cy, box, optik)
    extra = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'd="{BOLT_PATH}" transform="{d}" fill="none" stroke="{BOLT}" '
            f'stroke-width="{stroke_attr:.4f}" stroke-linecap="round" '
            f'stroke-linejoin="round"{extra}')


def app_icon(size=512, radius_ratio=0.225, bolt_ratio=0.900, tanpa_lubang=False):
    """Ikon utama: kotak hijau bergradasi + bolt.

    `tanpa_lubang=True` dipakai untuk favicon sangat kecil (16px): dengan stroke
    setebal 8,5% tinggi, lubang di dalam bolt selebar ~12% tidak muat di 16px,
    jadi hasilnya menggumpal. Versi kecil ini memakai bolt SOLID (fill) yang
    bentuknya tetap kelihatan sebagai petir hitam-putih kecil.
    """
    r = size * radius_ratio
    if tanpa_lubang:
        isi = (f'<path d="{BOLT_PATH}" transform="{_tf(size / 2, size / 2, size * bolt_ratio)}" '
               f'fill="{BOLT}"/>')
    else:
        isi = f'<path {bolt(size / 2, size / 2, size * bolt_ratio)}/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <defs>
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{size}" y2="{size}">
      <stop offset="0" stop-color="{ACCENT}"/>
      <stop offset="1" stop-color="{ACCENT_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" rx="{r:.2f}" ry="{r:.2f}" fill="url(#bg)"/>
  {isi}
</svg>
'''


def maskable_icon(size=512):
    """Versi maskable: bolt dikecilkan ke 62% supaya aman kalau dipotong bundar."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" fill="{ACCENT_STRONG}"/>
  <path {bolt(size / 2, size / 2, size * 0.620)}/>
</svg>
'''


def monogram(size=512):
    """Avatar bundar untuk chat (WhatsApp/Telegram)."""
    sw = size * 0.055
    r = size / 2 - sw / 2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <circle cx="{size / 2}" cy="{size / 2}" r="{r:.2f}" fill="{ACCENT}" stroke="{ACCENT_STRONG}" stroke-width="{sw:.2f}"/>
  <path {bolt(size / 2, size / 2, size * 0.560)}/>
</svg>
'''


# --------------------------------------------------------------- wordmark
# Koordinat vertikal ditulis eksplisit (bukan hasil penjumlahan berantai) supaya
# urutan barisnya gampang diperiksa: judul -> tagline -> garis -> copyright.
WM_W, WM_H = 1200, 320
TILE = 204
TILE_X, TILE_Y = 56, 66
TILE_CY = TILE_Y + TILE / 2          # 168
TEXT_X = 300
TITLE_SIZE = 116
TITLE_BASE = 150
SUB_SIZE = 33
SUB_BASE = 212
RULE_Y = 232
RULE_H = 3
COPY_SIZE = 24
COPY_BASE = 276
SUB = 'Communication Fillment'
COPY = '\u00a9 2026 CCM-Halim \u00b7 UPT CCM Halim'


def _text_block(title_fill, sub_fill, copy_fill, rule=True):
    """Wordmark + tagline + (garis) + baris copyright, huruf sudah jadi path."""
    sg = TextToPath(FONTS / 'SpaceGrotesk-Bold.ttf')
    pl = TextToPath(FONTS / 'SpaceGrotesk-Medium.ttf')
    d_title = sg.text_path('C-Fill', TITLE_SIZE, TEXT_X, TITLE_BASE)
    d_sub = pl.text_path(SUB, SUB_SIZE, TEXT_X + 3, SUB_BASE)
    d_copy = pl.text_path(COPY, COPY_SIZE, TEXT_X + 3, COPY_BASE)
    sub_w = pl.text_width(SUB, SUB_SIZE)
    rule_svg = ''
    if rule:
        rule_svg = (f'\n  <rect x="{TEXT_X + 3}" y="{RULE_Y}" width="{sub_w:.1f}" '
                    f'height="{RULE_H}" rx="{RULE_H / 2}" fill="{sub_fill}" opacity="0.45"/>')
    return d_title, d_sub, d_copy, rule_svg


def wordmark():
    d_title, d_sub, d_copy, rule = _text_block(ACCENT_STRONG, ACCENT, INK)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WM_W}" height="{WM_H}" viewBox="0 0 {WM_W} {WM_H}">
  <defs>
    <linearGradient id="tile" gradientUnits="userSpaceOnUse" x1="{TILE_X}" y1="{TILE_Y}"
                    x2="{TILE_X + TILE}" y2="{TILE_Y + TILE}">
      <stop offset="0" stop-color="{ACCENT}"/>
      <stop offset="1" stop-color="{ACCENT_DEEP}"/>
    </linearGradient>
  </defs>
  <rect x="{TILE_X}" y="{TILE_Y}" width="{TILE}" height="{TILE}" rx="{TILE * 0.225:.1f}" fill="url(#tile)"/>
  <path {bolt(TILE_X + TILE / 2, TILE_CY, TILE * 0.900)}/>
  <path d="{d_title}" fill="{ACCENT_STRONG}"/>
  <path d="{d_sub}" fill="{ACCENT}"/>{rule}
  <path d="{d_copy}" fill="{INK}" opacity="0.75"/>
</svg>
'''


def lockup_dark():
    d_title, d_sub, d_copy, rule = _text_block(BOLT, ACCENT, PAPER, rule=False)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WM_W}" height="{WM_H}" viewBox="0 0 {WM_W} {WM_H}">
  <rect width="{WM_W}" height="{WM_H}" fill="{ACCENT_DEEP}"/>
  <rect x="{TILE_X}" y="{TILE_Y}" width="{TILE}" height="{TILE}" rx="{TILE * 0.225:.1f}" fill="{ACCENT}"/>
  <path {bolt(TILE_X + TILE / 2, TILE_CY, TILE * 0.900)}/>
  <path d="{d_title}" fill="{BOLT}"/>
  <path d="{d_sub}" fill="{ACCENT}"/>{rule}
  <path d="{d_copy}" fill="{PAPER}" opacity="0.62"/>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    svgs = {
        'appicon.svg': app_icon(512),
        'monogram.svg': monogram(512),
        'wordmark.svg': wordmark(),
        'lockup-dark.svg': lockup_dark(),
    }
    for name, svg in svgs.items():
        (OUT / name).write_text(svg, encoding='utf-8')

    renders = [
        (app_icon(512), PUB / 'icon-512.png', 512, 512),
        (app_icon(192), PUB / 'icon-192.png', 192, 192),
        (maskable_icon(512), PUB / 'icon-maskable-512.png', 512, 512),
        (app_icon(180), PUB / 'apple-touch-icon.png', 180, 180),
        (app_icon(32), PUB / 'favicon-32.png', 32, 32),
        (app_icon(16, tanpa_lubang=True), PUB / 'favicon-16.png', 16, 16),
        (monogram(512), OUT / 'monogram-512.png', 512, 512),
        (wordmark(), OUT / 'wordmark.png', 1200, 320),
        (lockup_dark(), OUT / 'lockup-dark.png', 1200, 320),
    ]
    for svg, path, w, h in renders:
        cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=str(path),
                         output_width=w, output_height=h)
        print('render', path.relative_to(ROOT), f'{w}x{h}')


if __name__ == '__main__':
    main()
