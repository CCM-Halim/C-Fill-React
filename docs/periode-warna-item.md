# Penanda periode & warna item perawatan (6 Okt 2026)

## Permintaan

1. Teks periode pada item perawatan dibedakan warnanya:
   **1 bulan hijau · 3 bulan kuning · 6 bulan oranye · 1 tahun merah**
2. Periodenya dipindah ke baris tersendiri di atas teks item:

   ```
   Periode 6 bulan
   Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya
   ```

   (sebelumnya periode menempel di ujung: `…cek labelnya(6 bulan)`)
3. Teks item dibuat rata kiri-kanan (justify).

## Sumber data periode

`periodMonths` pada tiap item di `src/config/categories.js`.

Sebelum dipakai, diperiksa dulu ke seluruh berkas: **321 item** punya
`periodMonths`, dan nilainya **selalu cocok** dengan angka di dalam teks label
(**0 selisih**). Jadi `periodMonths` dipakai sebagai acuan dan tulisan di teks
hanya jadi cadangan.

Karena itu 30 item yang teksnya belum punya penanda (contoh: "Periksa kondisi
dan kekuatan koneksi kabel grounding", "Verivikasi Discharge Test") tetap
mendapat penanda periode dengan benar.

## Yang dijaga saat memisahkan teks

Tanda kurung yang **bukan** periode tidak boleh ikut terhapus:

- `Arus (I)` — singkatan Arus, bukan "1 bulan"
- `Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)`
- `Tekanan / Masa sesuai ketentuan (jarum indikator)`

Selain itu penanda hanya dikenali di **ujung** teks, jadi kalimat seperti
"Ganti filter (3 bulan) sekali lalu periksa ulang" tidak salah dipotong.

Teks item **tidak dirapikan** — salah ketik yang memang ada di data
(`pemeriksaann`, `Peeriksaan`, `Verivikasi`, `perapian`) dibiarkan apa adanya.

## Kenapa warnanya bukan sekadar warna teks

Warna teks saja kurang aman di lapangan:

- **Kuning** paling terang cuma mencapai **4,04:1** di atas kartu putih — di
  bawah ambang WCAG AA (4,5:1). Kuning murni praktis tidak terbaca.
- **Hijau dan merah** nyaris sama terangnya (**1,14:1** terhadap satu sama
  lain) — bagi yang buta warna, dua periode itu bisa tertukar.

Karena itu tiap periode dapat **teks berwarna + latar senada + garis tepi**,
dan kontrasnya sudah diperiksa satu per satu:

| Periode | Teks | Latar | Kontras |
|---|---|---|---|
| 1 bulan | `#12604A` | `#E4F1EA` | **6,46:1** |
| 3 bulan | `#7A5B00` | `#FBF2D6` | **5,65:1** |
| 6 bulan | `#A8440E` | `#FBE9DC` | **5,09:1** |
| 1 tahun | `#9A2A1B` | `#FBE4DF` | **6,34:1** |

Semuanya lolos ambang AA. Periode 24 & 36 bulan ikut kelompok tahunan (merah)
dengan teks "2 tahun" / "3 tahun" — tidak dipaksa jadi "1 tahun".

## Catatan penting soal justify — ada trade-off

Justify **bekerja**, tapi bukan tanpa biaya. Diukur langsung di browser
(lebar 390 px = ukuran HP, kolom teks hanya **265 px**):

- celah antar kata normal: **3 px**
- celah pada baris yang harus ditarik penuh: sampai **23–28 px**

Artinya, pada baris yang panjangnya pas-pasan, jarak antar kata jadi melebar
dan terlihat "renggang". Ini konsekuensi wajar justify di kolom sempit —
makin sempit kolomnya, makin sering terjadi.

Yang sudah dicoba untuk meredam:

- `text-align-last:left` — **wajib**, kalau tidak baris terakhir ikut ditarik
  dan hasilnya lebih buruk lagi.
- `hyphens:auto` — dipasang, tapi **belum bisa dibuktikan di sini**: Chrome
  headless di mesin ini tidak punya kamus pemenggalan kata (diuji dengan kata
  Inggris panjang "extraordinarily" — tidak terpenggal sama sekali). Di HP
  sebenarnya kamusnya ada, jadi hasilnya kemungkinan lebih rapi. **Perlu
  diperiksa di HP.**

Kalau di HP hasilnya masih terasa renggang, pilihannya:

1. kembali ke rata kiri (`text-align:left`) — tepi kanan bergerigi, tapi jarak
  antar kata selalu normal;
2. kurangi lebar kartu; atau
3. biarkan justify, terima celah melebar.

## Pembuktian

- `npm test` → **91 lolos, 0 gagal** (sebelumnya 71). `test/itemPeriod.test.mjs`
  menambah 20 uji; teksnya diambil apa adanya dari config, termasuk salah
  ketik yang memang ada di data.
- `scripts/qa/21-periode-warna.mjs` → **13/13 lulus** dengan memeriksa layar
  sungguhan: 9 penanda periode muncul, keempat warnanya benar, teks penanda
  tebal, penanda tidak lagi menempel di ujung teks, teks rata kiri-kanan,
  kontras lolos AA, tanpa error konsol.
- Halaman **Instrumen tidak terpengaruh**: item instrumen tidak punya
  `periodMonths` dan teksnya tidak memuat penanda periode, jadi tidak ada
  penanda yang muncul di sana.

Bukti gambar: `/tmp/qa21/periode-warna.png`.
