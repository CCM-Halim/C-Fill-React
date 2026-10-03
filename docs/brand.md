# Brand C-Fill v2.0 — ikon, logo, hak cipta

Dibuat 3 Okt 2026. Semua aset dihasilkan oleh satu skrip supaya tidak ada
gambar yang "ditempel manual" lalu tidak ketahuan asalnya.

```bash
npm run brand          # ~/zenith-brand/.venv-svg/bin/python scripts/make-brand.py
npm run verify:brand   # periksa piksel hasil render (28 pemeriksaan)
```

Skrip: [`scripts/make-brand.py`](../scripts/make-brand.py) ·
Pembuat path huruf: [`scripts/textpath.py`](../scripts/textpath.py)

## Berkas yang dihasilkan

| Berkas | Isi |
|---|---|
| `public/icon-512.png` | ikon PWA utama (dipakai juga di manifest) |
| `public/icon-192.png` | ikon PWA kecil |
| `public/icon-maskable-512.png` | versi maskable (aman dipotong bundar) |
| `public/apple-touch-icon.png` | 180×180 untuk iOS |
| `public/favicon-32.png` / `favicon-16.png` | favicon tab browser |
| `public/brand/wordmark.svg` + `.png` | logo horizontal + tagline + **© 2026** |
| `public/brand/lockup-dark.svg` + `.png` | versi latar gelap |
| `public/brand/appicon.svg`, `monogram.svg`, `monogram-512.png` | sumber SVG + avatar bundar untuk chat |

## Warna

Disamakan dengan `src/styles.css` supaya logo dan aplikasi satu bahasa visual:

- `#256D5C` — accent (hijau sinyal, dipakai di aplikasi)
- `#0F3A31` — ujung gradasi ikon
- `#F2F1EB` — tinta bolt (putih hangat, bukan putih murni)
- `#F6F4EE` — latar kertas aplikasi

## Dua cacat yang ditemukan lewat render (dan cara menghindarinya)

**1. `stroke-width` ikut diskalakan oleh `transform`.** SVG menghitung
`stroke-width` di koordinat **lokal**. Menuliskan `stroke-width="1.95"` pada path
yang punya `transform="... scale(20)"` menghasilkan garis setebal ~39 unit —
ikonnya jadi satu blok penuh, bukan bolt. Markup-nya terlihat benar; hanya
hasil render yang menunjukkan masalahnya. Sekarang ketebalan selalu dihitung
`tebal_target_px / skala`.

**2. Warna huruf "C-Fill" memakai accent gelap sehingga judul dan tagline
nyaris sama.** Memakai `#256D5C` untuk judul (bukan `#184F42`) membuat hierarki
tipografi hilang. Sekarang judul memakai accent-strong, tagline accent.

**3. (Kecil) Bolt terlihat geser ke kiri.** Path bolt 24×24 hanya memakai
`x=4..18`, jadi titik tengah geometrisnya di `x=11`, bukan 12 — terukur ~19 px
miring pada ikon 512. Dikompensasi +1 unit pada transform.

## Huruf pada wordmark

Huruf **sudah dikonversi jadi path**, bukan `<text>` — jadi wordmark tetap
tampil benar walau font Space Grotesk tidak terpasang di perangkat pembaca.
Font diambil dari Google Fonts (Space Grotesk Bold untuk judul, Medium untuk
tagline & baris copyright), di-dekompres dengan fontTools, lalu digambar
memakai [`textpath.py`](../scripts/textpath.py).

Font aslinya disimpan di `/tmp/fonts` — kalau folder itu hilang (mis. setelah
reboot), jalankan ulang langkah pengambilan font sebelum `npm run brand`.

## Hak cipta

Baris **`© 2026 CCM-Halim · UPT CCM Halim`** muncul di:

- wordmark & lockup gambar (`public/brand/*`),
- kaki sidebar aplikasi (`src/components/Sidebar.jsx` → `.brand-copyright`),
- footer kartu login (`src/components/LoginScreen.jsx`),
- `<meta name="copyright">` di `index.html`,
- berkas `LICENSE` (MIT, Copyright (c) 2026 CCM-Halim).

Nomor versi dan tahun rilis **satu sumber**: [`src/config/appInfo.js`](../src/config/appInfo.js).
Naik versi = ubah `APP_VERSION` di situ (+ `version` di `package.json`).

## Yang diperiksa `verify:brand`

28 pemeriksaan piksel, antara lain: ukuran tiap PNG, sudut ikon benar-benar
transparan, **porsi tinta bolt wajar** (menangkap cacat stroke di atas — versi
rusak terbaca 42%, versi benar ~16%), **ada lubang latar di dalam bolt**
(bukti garisnya tipis), bolt seimbang kiri-kanan & atas-bawah (toleransi 12 px),
isi maskable berada di dalam 80% jari-jari, ketiga baris wordmark terbaca
dengan tinggi huruf berjenjang (judul 85 px > tagline 24 px > copyright 17 px),
dan SVG tidak memakai `<text>`.

Catatan penting saat menulis pemeriksaan piksel: PNG hasil render punya area
**transparan dengan RGB 0,0,0**, jadi piksel harus dikompositkan ke latar putih
dulu — kalau tidak, area kosong ikut terhitung sebagai "tinta gelap" dan
pengukuran bbox-nya ngawur (ini sempat terjadi, dan membuat 3 pemeriksaan gagal
padahal logonya benar).
