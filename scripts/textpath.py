"""Konversi teks -> path SVG memakai font asli (Space Grotesk / IBM Plex Sans).

Dipakai generator logo C-Fill supaya wordmark-nya memakai huruf yang PERSIS
sama dengan yang dipakai aplikasi (app pakai 'Space Grotesk' untuk judul &
merek, 'IBM Plex Sans' untuk teks biasa) - bukan font sistem seperti DejaVu,
yang bentuk hurufnya beda dari tampilan app.
"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform


class TextToPath:
    def __init__(self, ttf_path):
        self.font = TTFont(ttf_path)
        self.upem = self.font['head'].unitsPerEm
        self.glyphset = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.hmtx = self.font['hmtx']

    def text_width(self, text, size):
        """Lebar teks dalam satuan user (px) pada ukuran font `size`."""
        total = 0
        prev = None
        for ch in text:
            gname = self.cmap.get(ord(ch))
            if gname is None:
                prev = None
                continue
            total += self.hmtx[gname][0]
            if prev is not None:
                total += self._kern(prev, gname)
            prev = gname
        return total * size / self.upem

    def _kern(self, left, right):
        # Cari tabel kern/GPOS sederhana; kalau tidak ada, 0.
        try:
            kern = self.font['kern'].kernTables[0]
            return kern.kernTable.get((left, right), 0)
        except Exception:
            return 0

    def text_path(self, text, size, x=0.0, y=0.0):
        """Kembalikan string 'd' path SVG untuk teks (baseline di titik x,y)."""
        scale = size / self.upem
        pen_out = []
        cursor = 0.0
        prev = None
        for ch in text:
            gname = self.cmap.get(ord(ch))
            if gname is None:
                cursor += size * 0.3
                prev = None
                continue
            if prev is not None:
                cursor += self._kern(prev, gname) * scale
            spen = SVGPathPen(self.glyphset, ntos=lambda v: f"{v:.2f}")
            tpen = TransformPen(spen, Transform(scale, 0, 0, -scale, x + cursor, y))
            self.glyphset[gname].draw(tpen)
            d = spen.getCommands()
            if d:
                pen_out.append(d)
            cursor += self.hmtx[gname][0] * scale
            prev = gname
        return ' '.join(pen_out)
