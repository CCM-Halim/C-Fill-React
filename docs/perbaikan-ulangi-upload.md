# K-12 — Unggah foto gagal "Failed to fetch" (perbaikan 6 Okt 2026)

## Kejadian

Laporan Jo, 5 Okt 2026 pukul 16.35 (halaman **Dokumentasi**, app C-Fill v2.0 di HP):
11 foto berturut-turut gagal diunggah dengan pesan **`gagal: Failed to fetch`**.

Urutan pada layar:

- `TimePhoto_20261005_093824.jpg` → berhasil (1,8 MB → 559 KB)
- sekitarnya → berhasil
- `...093840` sampai `...094040` (11 file) → **gagal semua, "Failed to fetch"**
- `...094118` sampai `...094141` → berhasil lagi

## Akar masalah

Bukan soal folder tujuan, bukan soal format file. Penyebabnya **kode asli di
`src/pages/DokumentasiPage.jsx` hanya mencoba unggah SEKALI**:

```js
await uploadDocumentation({ buildingCategory, siteName, file: fileToUpload });
rows[i] = { name: original.name, status: '✅ berhasil' + savedInfo };
} catch (e) {
rows[i] = { name: files[i].name, status: '❌ gagal: ' + e.message };  // mentah
}
setUploadRows([...rows]);   // <-- file berikutnya langsung jalan
```

Konsekuensinya, tiga hal buruk terjadi sekaligus:

1. **Sekali kedip jaringan = file hilang.** Tidak ada percobaan ulang sama sekali.
2. **Pesan errornya mentah** — `Failed to fetch` adalah bahasa internal browser,
   bukan penjelasan untuk teknisi di lapangan.
3. **Tidak ada jalan memperbaiki.** Satu-satunya cara adalah memilih ulang file
   dari penyimpanan HP, dan itu memutus alur kerja di lapangan.

Pola 11 file gagal **berturut-turut lalu lancar lagi** persis cocok dengan
gangguan jaringan sesaat (sinyal berpindah / HP terkunci / pindah menara BTS) —
bukan kegagalan permanen. File besar (1,8 MB) lebih rawan.

## Perbaikan

### 1. Percobaan ulang otomatis — `src/lib/uploadRetry.js` (baru)

Modul murni, tanpa jaringan, supaya bisa diuji di Node.

- `isTransientError(e)` — memilah kesalahan yang **layak diulang**:
  - `Failed to fetch`, `NetworkError`, `Load failed`
  - `TypeError` dari `fetch` (gejala khas koneksi putus)
  - HTTP `408`, `425`, `429`, `500`, `502`, `503`, `504`
  - "koneksi terputus", "timed out", "socket", "ECONNRESET", "ETIMEDOUT"
- Kesalahan **tidak** diulang kalau: `400`, `401`, `403`, `404`, `409`, `422`
  (salah login, file tak ditemukan, tidak punya izin) — kalau diulang cuma
  memboroskan kuota.
- `withRetry(fn, { attempts })` — jeda bertingkat 0,8 dtk → 1,6 dtk → 3,2 dtk,
  ditambah acak kecil supaya banyak file tidak menyerbu bersamaan.

### 2. Lebih dari satu file sekaligus — `DokumentasiPage.jsx`

- Tiap file tetap diproses **berurutan** (bukan bersamaan), supaya tidak berebut
  bandwidth — penting untuk HP di sinyal lemah.
- Kegagalan satu file **tidak menghentikan** file berikutnya.
- Setiap file menyimpan `File` aslinya di state, jadi bisa dicoba ulang nanti.

### 3. Tombol "Ulangi" — tanpa memilih ulang dari HP

- Baris yang gagal menampilkan tombol **Ulangi** (`.btn-ulangi`).
- Kalau ada beberapa file gagal, muncul **"Ulangi N file yang gagal"**.
- Tombolnya hilang otomatis begitu berhasil.
- Karena `File` aslinya masih disimpan, retry **tidak** perlu buka galeri lagi.

### 4. Pesan yang bisa dimengerti

| Sebelum | Sesudah |
|---|---|
| `gagal: Failed to fetch` | `gagal: koneksi terputus - file sudah dicoba 3x, jaringan HP sempat hilang` |
| `gagal: 403` | `gagal: tidak punya izin ke folder tujuan` |
| `gagal: 401` | `gagal: sesi login berakhir - coba login ulang` |

---

## Pembuktian (dijalankan 6 Okt 2026)

### `npm test` → **68 lolos, 0 gagal** (sebelumnya 50)

`test/uploadRetry.test.mjs` — 16 uji baru. Kasusnya diambil dari kejadian nyata:

- `Failed to fetch` → dinilai kesalahan sesaat ✔
- `TypeError: Failed to fetch` ✔
- `403` → **tidak** diulang ✔
- Kalau gagal terus 3x → melempar kesalahan asli, bukan kesalahan buatan ✔
- Kalau berhasil di percobaan ke-2 → tidak jalan ke-3 ✔
- Jeda antar percobaan benar-benar bertambah ✔

### Uji klik nyata di browser — **11/11 lulus**

`scripts/qa/20-uji-ulangi-upload.mjs` menjalankan **aplikasi hasil build yang
sebenarnya** di Chrome headless (lebar 390 px, ukuran HP), lalu:

1. Masuk halaman Dokumentasi (sesi disuntikkan ke `localStorage`; email QA
   dipakai dari daftar izin di `src/config/access.js`)
2. **Jaringan ke `googleapis.com/upload/*` diputus** — meniru kejadian 5 Okt
3. Klik Upload → 3 percobaan otomatis → gagal, tombol **Ulangi** muncul ✔
4. Pesan sudah jadi "koneksi terputus…", bukan `Failed to fetch` ✔
5. **Jaringan dihidupkan, tombol Ulangi diklik** → file terunggah ✔
6. Diverifikasi di Drive: file memang ada, lalu dihapus ✔

Bukti gambar: `/tmp/qa20/1-setelah-gagal.png` dan `/tmp/qa20/2-setelah-ulangi.png`.

### Folder produksi tidak dikotori

`scripts/qa/run-20.sh` mengarahkan build ke folder sementara
`_QA-C-Fill-Sementara` selama pengujian, lalu **mengembalikan konfigurasi asli
dan build ulang**. Diperiksa setelah jalan: folder QA **0 item**, `.env.local`
kembali seperti semula.

---

## Catatan untuk Jo

- **Sesi login tidak perlu diurus.** `getValidAccessToken()` sudah menyegarkan
  token sebelum tiap unggahan, jadi tombol Ulangi tidak akan mentok gara-gara
  token kedaluwarsa.
- **File sangat besar** tetap bisa gagal kalau sinyal hilang > ~12 detik (total
  jeda 3 percobaan). Kalau sering terjadi, naikkan jumlah percobaan di
  `DokumentasiPage.jsx` (`uploadFileWithRetry(..., { attempts: 5 })`).
- **`.env.local`** dibuat untuk pengujian lokal saja dan sudah masuk `.gitignore`
  — tidak ikut ter-commit, tidak mengubah konfigurasi Vercel.
