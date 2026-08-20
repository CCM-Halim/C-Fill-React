# C-Fill — Communication Fillment (React + Google OAuth)

Web app untuk:
1. **Pengisian Checksheet** peralatan komunikasi (69 site fisik, 63 kategori
   peralatan) & checksheet instrumen (32 instrumen) — data ditulis ke **file
   .xlsx asli kamu** (dikonversi otomatis jadi Google Sheets), ke slot
   baris/kolom yang sudah ada sesuai bulan pemeriksaan — bukan bikin file
   atau baris baru.
2. **Upload Dokumentasi Pekerjaan** — otomatis tersimpan ke Google Drive, di
   folder `Kategori Bangunan > Site > Dokumentasi`.

Stack: **React (Vite) + Google OAuth 2.0 (Identity Services) + Sheets API v4 +
Drive API v3**, semuanya dipanggil langsung dari browser (tidak perlu backend
server terpisah) — cocok deploy statis di **Vercel**.

> ⚠️ **Prasyarat penting**: file `.xlsx` checksheet asli untuk tiap site
> (dan tiap instrumen) **harus sudah ada** di folder Drive yang sesuai, dengan
> **nama file persis sama** seperti aslinya (lihat `originalFileName` di
> `src/config/sites.js`). Aplikasi mencari file itu untuk dikonversi — kalau
> tidak ketemu, submission akan gagal dengan pesan error yang jelas.

---

## 📂 Struktur Project

```
src/
├── config/
│   ├── categories.js        # 63 kategori peralatan (item + standar pemeriksaan)
│   ├── sites.js              # 69 site + kategori mana saja yang relevan per site
│   ├── instruments.js        # 32 instrumen + item checksheet generik
│   └── mobileEquipment.js    # peralatan mobile/portable (Emergency Comm. Site Area)
├── lib/
│   ├── googleAuth.js         # login Google (OAuth token client)
│   ├── driveApi.js           # wrapper Drive API (folder, upload file)
│   ├── sheetsApi.js          # wrapper Sheets API (buat tab, tulis baris)
│   └── cfillService.js       # logic bisnis: site/instrumen -> folder & sheet yang tepat
├── components/                # Sidebar, LoginScreen, AuthContext, Toast
├── pages/                     # Dashboard, Peralatan (3 level), Instrumen, Dokumentasi
├── App.jsx / main.jsx / styles.css
```

---

## 🔑 Setup Google Cloud OAuth (gratis)

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. **APIs & Services → Library** → aktifkan **Google Sheets API** & **Google Drive API**
3. **APIs & Services → OAuth consent screen**:
   - User type: Internal (kalau Google Workspace) atau External + tambahkan
     email tim di **Test users** (gratis, sampai 100 user, tanpa verifikasi Google)
   - Scopes: tambahkan `.../auth/spreadsheets` dan `.../auth/drive`
4. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` (dev) + domain Vercel kamu nanti
   - Copy **Client ID**-nya

---

## ⚙️ Setup Project

```bash
npm install
cp .env.example .env
```

Isi `.env`:
```
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
VITE_ROOT_CHECKSHEET_FOLDER_ID=<ID folder "Checksheet" di Drive>
VITE_ROOT_INSTRUMEN_FOLDER_ID=<ID folder "Instrumen" di Drive>
```

> ID folder diambil dari URL: `https://drive.google.com/drive/folders/<ID_INI>`

Jalankan lokal:
```bash
npm run dev
```
Buka `http://localhost:5173`, login dengan akun Google yang sudah didaftarkan
sebagai Test user (langkah 3 di atas).

---

## 🚀 Deploy ke Vercel

```bash
npm install -g vercel
vercel
```
Atau lewat dashboard [vercel.com](https://vercel.com) → Import Project → pilih
repo ini. Framework preset: **Vite**. Jangan lupa isi 3 Environment Variables
yang sama seperti di `.env` pada pengaturan project Vercel.

Setelah dapat domain Vercel (`https://xxx.vercel.app`), **kembali** ke Google
Cloud Console → Credentials → edit OAuth Client ID → tambahkan domain itu ke
**Authorized JavaScript origins**.

---

## 🗂️ Cara data tersimpan (isi ke slot, bukan tambah baris)

**Checksheet Peralatan & Instrumen** tidak lagi bikin file/tab baru dari nol.
Sebagai gantinya:

1. Aplikasi cari file **.xlsx asli** kamu (nama file harus sama persis dengan
   yang ada di folder Drive site/instrumen tsb — lihat `originalFileName` di
   `src/config/sites.js`)
2. **Sekali saja per site/instrumen**, file itu dikonversi jadi Google Sheets
   (pakai Drive API `files.copy` dengan `mimeType` diganti ke
   `application/vnd.google-apps.spreadsheet`) — file .xlsx aslinya **tidak
   disentuh/dihapus**, tetap ada sebagai arsip. Hasil konversi disimpan
   sebagai file baru bertipe Google Sheets dengan nama yang sama persis, di
   folder yang sama.
3. Submission berikutnya untuk site/kategori yang sama otomatis pakai file
   hasil konversi itu (dicari lagi berdasarkan nama, tidak convert ulang).
4. Data ditulis ke **baris/kolom spesifik** sesuai posisi bulan pada tanggal
   pemeriksaan (Januari = slot pertama, dst — lihat `slotMap` di tiap kategori
   pada `categories.js` dan `instruments.js`). **Kalau bulan yang sama diisi
   ulang, isinya DITIMPA** (bukan nambah baris baru) — cocok dengan struktur
   form asli yang cuma punya 1 slot per bulan.

**Upload Dokumentasi** → tetap ke folder terpisah (bukan bagian dari sheet):
```
[Folder Checksheet] / [Kategori Bangunan] / [Nama Site] / Dokumentasi / nama_file.jpg
```

---

## 🧩 Soal `slotMap` — bagaimana posisi sel ditentukan

Tiap kategori di `categories.js` (dan instrumen di `instruments.js`) punya
field `slotMap`, hasil analisis otomatis terhadap struktur baris/kolom file
Excel asli kamu:

```js
slotMap: {
  type: "monthly_slot",   // atau "matrix" (khusus APAR & Lightning Protection)
  dateCol: 1,              // kolom A = tanggal
  petugasCol: 20,          // kolom tempat nama petugas (kalau ada di template)
  slotStartRow: 11,        // baris slot bulan Januari
  slotStep: 2,              // jarak antar baris bulan (beda-beda tiap kategori!)
  itemColumns: [
    { id: "i1", colStart: 2, colWidth: 1 },   // item biasa = 1 kolom
    { id: "i6", colStart: 7, colWidth: 12 }   // item tabel baterai = banyak kolom
  ]
}
```

⚠️ **Ini hasil analisis otomatis, bukan dijamin 100% sempurna untuk semua
variasi.** Sudah divalidasi manual untuk beberapa kategori representatif
(Baterai HFSPS Grup 1, UPS, BTS-A, CCTV, Video Access Node, dan template
Instrumen) — tapi kalau nanti ada kategori lain yang polanya ternyata beda
(baris "Tgl" tidak konsisten, dsb), submission bisa salah tempat. **Sangat
disarankan testing dulu ke 2-3 site nyata** (cek langsung ke Google Sheets
hasil konversinya, pastikan data masuk ke baris/kolom yang benar) sebelum
dipakai penuh oleh seluruh tim.

**APAR** dan **Lightning Protection** pakai `type: "matrix"` (baris = item
pemeriksaan, kolom = nomor unit) — beda logika dari kategori bulanan lainnya.

---



## ⚠️ Catatan Penting Soal Data

- **63 kategori peralatan** diekstrak otomatis dari 69 file checksheet asli
  kamu (bukan cuma dari 1 Master Checksheet) — beberapa kategori punya varian
  seperti `BTS-A`/`BTS-B`, `HFSPS-A`/`HFSPS-B`, `Telephone IP`/`Telephone AG`,
  `Baterai HFSPS Grup 1`/`Grup 2`, dll — ini semua **kategori terpisah**
  (bukan digabung), karena memang berbeda unit fisik.
- **APAR** dan **Lightning Protection** aslinya berbentuk form matriks
  (per-unit/per-serial-number), bukan format item+standar biasa. Di C-Fill
  ini disederhanakan jadi isian rekap per item — cek `src/config/categories.js`
  kalau mau menyesuaikan lebih detail.
- **Emergency Communication Site Area** (`src/config/mobileEquipment.js`)
  adalah peralatan mobile/portable yang tidak terikat 1 site tetap — saat ini
  cuma disimpan sebagai referensi data, belum ada halaman form khusus untuk
  ini di UI. Kalau perlu, bilang saja dan saya tambahkan halaman terpisah
  untuk pengecekan peralatan mobile ini (mirip Instrumen: submit tanpa perlu
  pilih site).
- Kalau ada site baru / kategori berubah di masa depan, tinggal edit
  `src/config/sites.js` & `src/config/categories.js` — tidak perlu ubah kode lain.

## 🔒 Catatan Keamanan

- Access token OAuth disimpan di memori JS (bukan localStorage) — kalau
  halaman di-refresh, user perlu login ulang (biasanya 1 klik tanpa perlu
  pilih akun lagi).
- Scope yang diminta: `spreadsheets` (baca/tulis Sheet) dan `drive` (akses
  penuh Drive, supaya bisa baca/tulis folder yang sudah ada sebelumnya —
  bukan cuma file yang dibuat app ini). Kalau nanti mau perketat, bisa
  diganti ke `drive.file` tapi konsekuensinya user harus pilih file/folder
  manual lewat Google Picker setiap kali (lebih ribet untuk kebutuhan ini).
