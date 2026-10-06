# Login sekali + pengisian checksheet bisa dilanjutkan besok

Dikerjakan 6 Oktober 2026. Dua permintaan dari teknisi/Jo:

1. Device yang sudah login tidak perlu login ulang tiap membuka aplikasi.
2. Pengisian checksheet yang belum selesai hari ini bisa dilanjutkan besok,
   dan hasil kedua hari masuk ke **file yang sama** — bukan terbelah dua.

---

## 1. Login sekali per device

### Penyebab sebelumnya

Sesi disimpan di **`sessionStorage`** (`src/lib/googleAuth.js`). Storage itu
otomatis kosong begitu tab/browser ditutup — jadi setiap kali aplikasi dibuka
lagi, teknisi harus login dari awal. Ditambah lagi, token yang sudah
kedaluwarsa langsung **membuang** sesi, sehingga layar login muncul sebelum
aplikasi sempat mencoba menyegarkan token. Dan nilai `checkingSilent` di
`AuthContext` di-hardcode `false`, jadi jalur "coba pulihkan sesi diam-diam"
yang sudah ditulis sebenarnya **tidak pernah dijalankan**.

### Perbaikan

- Sesi pindah ke **`localStorage`** + field `savedAt` (modul baru
  `src/lib/sessionStore.js`, murni & bisa diuji di Node).
- Token kedaluwarsa **tidak lagi membuang identitas user**. Sesi tetap dibaca,
  lalu token disegarkan diam-diam tanpa popup saat aplikasi dibuka.
- `AuthContext` sekarang benar-benar menjalankan pemulihan diam-diam
  (`checkingSilent` dihitung dari kondisi sesi, bukan `false`).
- Kalau penyegaran gagal, user **tetap** masuk dengan sesi terakhir — tidak
  dilempar ke layar login. Ini inti permintaan "login sekali".
- Login diam-diam **tidak** dijalankan kalau user menekan logout sendiri
  (penanda `cfill_manual_logout`) — supaya logout tetap terasa logout.
- Jendela penyegaran diam-diam: 30 hari sejak sesi terakhir.

### Yang tidak bisa dipaksa (jujur)

Token OAuth browser hanya bisa diperbarui tanpa interaksi selama **cookie sesi
Google milik user** masih aktif. Kalau dia logout dari Google sendiri, atau
browser membersihkan cookie pihak ketiga, Google mewajibkan popup — aplikasi
tidak bisa mengakalinya. Yang dijamin: aplikasi **tidak akan pernah** minta
login ulang selama sesi masih bisa disegarkan.

---

## 2. Checksheet bisa dilanjutkan besok

### Penyebab sebelumnya

Jawaban hanya hidup di memori React. Begitu aplikasi ditutup di tengah
pengisian (sinyal hilang, baterai habis, jam kerja usai), **semua isian
hilang**. Besoknya teknisi mengisi ulang dari nol — dan kalau proses
penyimpanan memilih berkas berbeda, isian dua hari itu terpisah.

### Perbaikan

- Modul baru `src/lib/checksheetDraft.js`: draf disimpan otomatis ke
  `localStorage` setiap kali isian berubah.
- **Kunci draf memakai SITUS + KATEGORI + BULAN (`YYYY-MM`), bukan tanggal
  persis.** Ini yang membuat draf hari ke-1 tetap ketemu saat dilanjutkan
  besok, karena keduanya menulis ke slot baris yang sama
  (`computeSlotRow` → satu baris per bulan per kategori). Jadi hasil kedua hari
  masuk ke **satu** file/baris.
- Saat disimpan ke sheet, draf lokal **dihapus**, supaya besoknya form tidak
  "memulihkan" isian yang sebenarnya sudah tersimpan.
- Banner di form: "📝 Isian sebelumnya dipulihkan (N item, disimpan …)" +
  tombol **"Kosongkan & mulai baru"** kalau teknisi memang mau mengisi ulang.
- Kedaluwarsa draf: 14 hari.

### Dua bug yang ketemu saat menguji (dan sudah dibetulkan)

1. **Draf bisa terhapus sendiri saat form dibuka.** Efek penyimpan ditulis
   sebelum efek pemulihan, jadi saat mount ia menulis `answers` yang masih
   kosong. Diperbaiki: efek pemulihan didahulukan, dan efek penyimpan punya
   penjaga — tidak menulis apa-apa selama draf belum ada **dan** belum ada
   isian.
2. **Item pilihan ya/tidak tersimpan tapi dianggap kosong.** Item itu hanya
   menulis kunci `<id>__raw` (tanpa kunci `<id>`), sehingga `jumlahTerisi`
   menghitungnya nol dan penjaga di atas menolak menyimpan draf. Diperbaiki:
   `jumlahTerisi` menghitung `<id>` maupun `<id>__raw` sebagai satu item.

Pemulihan juga memakai `restoreAnswers()` supaya tipe tiap item dihormati:
item teks polos (`noTglPrefix`) → `{ __rawText: '...' }`, item berpengukur →
`<id>` + `<id>__raw`, tanpa merusak item teks biasa.

---

## 3. Penyebab file checksheet terbelah (bug lama, ikut dibetulkan)

Ini akar keluhan "file yang ter-generate malah file baru lagi".

Di `src/lib/driveApi.js`, `resolveSiteSpreadsheet()` melakukan pencarian file
berulang (3 putaran) dengan jeda bertingkat. **Tapi blok jeda itu tidak pernah
dijalankan**, karena begitu `.xlsx` aslinya ditemukan, fungsi langsung
meng-KONVERSI tanpa memakai nilai `round`. Akibatnya:

- Pengaman "tunggu lalu cari ulang" tidak pernah aktif.
- Verifikasi sesudah konversi berhenti di putaran pertama begitu file milik
  sendiri terlihat — padahal salinan yang lebih tua (buatan perangkat lain)
  sering baru muncul di indeks Drive setelah itu. Aplikasi lalu mengira
  salinannya yang paling tua → dipakai sebagai file baru, sementara file lama
  berisi data tetap ada.

**Bukti di Drive (dibaca langsung, 6 Okt 2026):** 17 nama file punya salinan
ganda; **13 di antaranya dibuat di hari berbeda**. Contoh:
`K52 + 083 Base Station 13` — salinan 1 dibuat 13 Sep, salinan 2 dibuat
**6 Okt 2026** (hari yang sama saat ini), di folder yang **sama**.

**Perbaikan:** jeda + pencarian ulang sekarang benar-benar dijalankan sebelum
memutuskan mengonversi, verifikasi sesudah konversi diperpanjang (dan tidak
berhenti di putaran pertama), plus satu pengecekan tambahan sebelum memakai
file sendiri. Salinan milik sendiri yang ternyata lebih muda tetap dibuang
otomatis — aplikasi **tidak pernah** menghapus file berisi data.

---

## Pengujian

- `npm test` → **141 lulus** (dari 91). Baru: `test/sessionStore.test.mjs`,
  `test/checksheetDraft.test.mjs`.
- **QA 22** (`scripts/qa/22-login-sekali-draf.mjs`) → **15/15**, di browser
  headless dengan aplikasi hasil build:
  - sesi tersimpan di localStorage (bukan sessionStorage)
  - reload halaman → form tetap terbuka, tidak minta login ulang
  - token kedaluwarsa → tetap terbuka, layar login **tidak** muncul
  - isian sebagian → tersimpan; reload → dipulihkan + banner muncul
  - kunci draf memakai bulan (`2026-10`)
  - tombol "Kosongkan & mulai baru" benar-benar mengosongkan form & draf
  - item ya/tidak (radio) juga tersimpan & kembali tercentang
- QA 20 dan QA 21 disesuaikan (sesi sekarang di `localStorage`).
- QA 20 diperbaiki: dulu menunggu 12 detik tetap lalu mengukur di tengah proses
  ("masih percobaan 2/3") dan menyimpulkan gagal — sekarang menunggu sampai
  proses benar-benar selesai.
