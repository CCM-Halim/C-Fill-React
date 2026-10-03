# Progress Kerja — parsing & pengujian

Kartu **"Progress Kerja <Bulan> <Tahun>"** di Dashboard menampilkan donut
1M / 3M / 6M / 1Y plus daftar "rencana / realisasi". Angkanya diambil dari
[`src/lib/jadwalProgress.js`](../src/lib/jadwalProgress.js), yang membaca tab
`Jadwal Kunjungan MR` pada spreadsheet bulanan.

## Peta kolom (baris 2 = header, data mulai baris 3)

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
| L–O | 1M/3M/6M/1Y | angka rencana versi sheet → dipakai sebagai pembanding |

Range yang dibaca: **`B3:O120`**.

> **Riwayat bug (diperbaiki 3 Okt 2026).** Versi sebelumnya memetakan
> lokasi→D tapi Kegiatan→F (harusnya E) dan Status→K (harusnya J, padahal K
> bernilai kosong). Akibatnya kolom Kegiatan selalu kosong, tidak ada baris yang
> terbaca `Finish`, dan **keempat donut tampil 0/0** walau jadwalnya terisi.
> Sekarang pemetaan mengikuti header dan diuji terhadap data September & Oktober
> 2026 yang asli.

## Aturan hitung

- **rencana** = jumlah baris jadwal yang punya tag periode tersebut di kolom E.
  Satu baris bisa dihitung di beberapa periode (`1M, 3M, 6M` → masuk ke 1M, 3M,
  dan 6M sekaligus).
- **realisasi** = baris yang sama tapi kolom J berisi `Finish`.
- Baris kerjaan **tanpa tag periode** (mis. "Pendampingan Perawatan AC" atau
  pekerjaan TL) tidak masuk periode mana pun, dan jumlahnya **ditampilkan
  sebagai peringatan** di kartu — bukan dibuang diam-diam.
- Angka pada kolom bantu L–O dibaca sebagai pembanding. Kalau berbeda dari hasil
  hitung baris, selisihnya muncul kecil di bawah donut (`rencana sheet: N`)
  supaya baris jadwal yang salah tag cepat ketahuan.

## Menjalankan uji

```bash
npm test                  # uji parser terhadap fixture sheet asli
npm run verify:dashboard  # render kartu, buktikan angka yang tampil di donut
npm run fixtures:jadwal   # (manual) perbarui fixture dari spreadsheet asli
```

`npm run fixtures:jadwal` butuh akses `service_account.json` di
`~/.openclaw/workspace/`; fixture disimpan di `test/fixtures/` dan dipakai uji
tanpa jaringan.
