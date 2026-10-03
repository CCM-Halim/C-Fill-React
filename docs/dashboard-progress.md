# Dashboard — Progress Kerja & Temuan/Gangguan

Dashboard punya dua bagian data, keduanya dibaca dari Google Sheets langsung
(tanpa backend), lalu di-parse di modul murni supaya bisa diuji tanpa jaringan.

- **Progress Kerja `<Bulan> <Tahun>`** → [`src/lib/jadwalProgress.js`](../src/lib/jadwalProgress.js)
- **Temuan & Gangguan** → [`src/lib/gangguanLog.js`](../src/lib/gangguanLog.js)

---

## 1. Progress Kerja

Kartu ini menampilkan donut **1 Bulanan / 3 Bulanan / 6 Bulanan / 1 Tahunan**
dengan angka **selesai/total** di tengahnya, plus baris "rencana / realisasi".

### Peta kolom (baris 2 = header, data mulai baris 3)

| Kolom | Isi | Dipakai untuk |
|---|---|---|
| B | Hari & Tanggal | `tanggal` |
| C | Jam | `jam` |
| D | lokasi MR - ECS3 | `lokasi` — penanda "ini baris pekerjaan" |
| E | Kegiatan (`1M`, `1M, 3M, 6M`, …) | tag periode → `rencana` |
| F | Detail Pekerjaan | — |
| G | PIC Checksheet | `pic` |
| H | Temuan | `temuan` |
| I | Realisasi | — |
| J | Status Kegiatan (`Finish` / `Not Yet`) | penentu `realisasi` |
| K | Keterangan | `keterangan` |
| L–O | 1M/3M/6M/1Y | angka rencana versi sheet → pembanding |

Range yang dibaca: **`B3:O120`**.

> **Riwayat bug (diperbaiki 3 Okt 2026).** Versi sebelumnya memetakan
> lokasi→D tapi Kegiatan→F (harusnya E) dan Status→K (harusnya J, padahal K
> bernilai kosong). Akibatnya kolom Kegiatan selalu kosong, tidak ada baris yang
> terbaca `Finish`, dan **keempat donut tampil 0/0** walau jadwalnya terisi.

### Aturan hitung

- **rencana** = jumlah baris jadwal yang punya tag periode tersebut di kolom E.
  Satu baris bisa dihitung di beberapa periode (`1M, 3M, 6M` → masuk ke 1M, 3M,
  dan 6M sekaligus).
- **realisasi** = baris yang sama tapi kolom J berisi `Finish`.
- Baris kerjaan **tanpa tag periode** tidak masuk periode mana pun, dan
  jumlahnya **ditampilkan sebagai peringatan** di kartu — bukan dibuang diam-diam.
- Angka pada kolom bantu L–O dibaca sebagai pembanding. Kalau berbeda dari hasil
  hitung baris, selisihnya muncul kecil di bawah donut (`rencana sheet: N`).

### Cara update saat ganti bulan

File jadwal dibaca **per bulan berjalan**, jadi saat ganti bulan harus ada file
baru. Urutannya ada di halaman **Panduan** di dalam aplikasi
(`/panduan`, [`src/pages/PanduanProgressPage.jsx`](../src/pages/PanduanProgressPage.jsx)):

1. Salin file bulan lalu, ganti isi tabelnya (jangan edit file bulan lama).
2. Simpan di `Jadwal Kunjungan MR / <Tahun> / "<nomor>. <Nama Bulan>"`.
3. Nama file wajib memuat tahun berjalan.
4. Isi kolom Kegiatan (E) dengan tag `1M` / `3M` / `6M` / `1Y`.
5. Isi kolom Status Kegiatan (J) dengan `Finish` untuk pekerjaan yang selesai.

Kalau file belum ada, Dashboard menampilkan **alasannya**, bukan angka 0/0 yang
menyesatkan.

---

## 2. Temuan & Gangguan (Log Book Gangguan)

Sumber: spreadsheet **"Log Book Gangguan Dept Telco Halim"**, 6 tab:
`Gangguan Peralatan`, `Gangguan AC`, `Gangguan K3`, `Gangguan Kontruksi`,
`Gangguan Instrumen`, `Gangguan Lain-Lain`.

Semua tab dibaca sekaligus ([`getAllLogGangguan()`](../src/lib/cfillService.js)),
lalu difilter di sisi klien — jadi ganti-ganti filter tidak memanggil Sheets
berulang kali.

### Filter yang tersedia

| Filter | Nilai |
|---|---|
| **Status** | Semua / **Open** (belum selesai) / **Close** (selesai) |
| Tanpa tanggal | baris yang tanggalnya belum diisi |
| Tahun | hanya tahun yang ada datanya |
| Bulan | hanya bulan yang ada datanya di tahun terpilih |
| Jenis | nama tab |
| Cari | lokasi / peralatan / sistem / analisis |

Ringkasan di atas daftar menampilkan `N kejadian · X open · Y close` dan
gangguan **open terlama**.

### Peta kolom — DIBACA DARI HEADER, bukan posisi tetap

Enam tab itu **tidak seragam**:

| Tab | Lokasi Gangguan | Sistem Terkait |
|---|---|---|
| Gangguan Peralatan | E | P |
| Gangguan AC | E | P |
| Gangguan K3 | **D** | P |
| Gangguan Kontruksi | E | P |
| Gangguan Lain-Lain | E | P |
| Gangguan Instrumen | **D** | **Q** |

> **Riwayat bug (diperbaiki 3 Okt 2026).** Kode lama menulis `lokasi = r[3]`
> (kolom E) untuk **semua** tab. Di tab "Gangguan K3" kolom E isinya
> "Waktu Pelaporan" (jam) → yang terbaca sebagai lokasi adalah `"1:00"`, dan
> baris yang kolom E-nya kosong **dibuang** padahal lokasinya ada di kolom D.
> Sekarang kolom dicari lewat nama header [`findColumn()`](../src/lib/gangguanLog.js).

> **Bug kedua di tab yang sama.** Filter bulan lama mencocokkan "angka apa pun"
> di string tanggal:
> ```js
> const angka = (it.tanggalAlarm || '').match(/\d+/g);
> return angka.some((n) => parseInt(n, 10) === bulan + 1 && parseInt(n, 10) <= 12);
> ```
> Saat memilih **Oktober** (bulan ke-10), kejadian `01/10/2026` (1 Oktober) lolos —
> tapi `10/01/2026` (10 Januari) **ikut lolos** karena angka `10` ada di posisi
> hari. Sekarang tanggal di-parse jadi `{hari, bulan, tahun}` dulu.

### Aturan hitung & data yang perlu diketahui

- **"Temuan"** = seluruh baris kejadian di Log Book (open maupun close), lintas tab.
- Status dibaca apa adanya: `Close`/`Closed` → selesai; `Open`/`New`/`In Progress`
  → belum selesai; tulisan lain → `unknown` dan **dihitung terpisah** supaya
  kelihatan kalau ada penulisan status baru.
- **Baris template** (ratusan baris di bawah tabel, statusnya sudah terisi tapi
  lokasi kosong) **tidak dihitung**. Tab `Gangguan Lain-Lain` punya 201 baris di
  sheet tapi 0 kejadian nyata.
- Baris tanpa tanggal sama sekali tetap tampil, bisa dijaring tombol
  **"Tanpa tanggal"**.
- **Tanggal ambigu** ditandai ⚠️: kolom Tanggal dan Waktu Gangguan menunjukkan
  hari/bulan tertukar (contoh nyata: `09/01/2026` vs `01/09/2026 12:00`).
  Filter bulan memakai kolom Tanggal.

### Temuan data di sheet (bukan bug aplikasi)

1. Di tab **Gangguan K3**, kolom "Lokasi Gangguan" (D) isinya **jam** (`1:00`,
   `7:41`) — lokasi aslinya tertulis di kolom "Item Gangguan". Aplikasi
   menampilkan apa adanya dari sheet.
2. Ada baris dengan tahun **2027** (salah ketik), sehingga dropdown tahun
   menampilkan 2026 **dan** 2027.
3. 16 baris punya tanggal & waktu gangguan yang hari/bulannya tertukar.
4. 2 baris berstatus Open tanpa tanggal.

---

## Menjalankan uji

```bash
npm test                       # uji parser (jadwal + log gangguan) vs fixture sheet asli
npm run verify:dashboard       # render kartu, buktikan angka yang benar-benar tampil
npm run verify:brand           # periksa piksel logo/ikon (lihat docs/brand.md)
npm run verify:all             # build + test + kedua verifier di atas

# manual (butuh token OAuth / service account):
npm run fixtures:jadwal        # perbarui fixture jadwal
npm run fixtures:gangguan      # perbarui fixture log gangguan
npm run verify:live-jadwal     # baca sheet asli lewat API, bandingkan dgn fixture
npm run verify:live-gangguan   # idem untuk log gangguan
```

`npm run fixtures:jadwal` butuh `service_account.json` di
`~/.openclaw/workspace/`; `fixtures:gangguan` dan `verify:live-*` butuh token
OAuth user di `~/.hermes/google_token.json`. Fixture disimpan di `test/fixtures/`
dan dipakai uji tanpa jaringan.
