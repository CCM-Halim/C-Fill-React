import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PERIODS, PERIOD_LABEL } from '../components/ProgressKerjaCard';
import { APP_VERSION, COPYRIGHT_LINE } from '../config/appInfo';

/**
 * Panduan singkat: cara memperbarui Progress Kerja saat sudah ganti bulan.
 *
 * Ditulis setelah menelusuri isi folder "Rencana Kerja" di Drive (Agustus-
 * September 2026): caranya BUKAN mengganti isi file lama, tapi menaruh file
 * BARU di folder bulan yang baru. Penamaan folder/bulan yang dipakai app:
 * Rencana Kerja / <Tahun> / "<nomor>. <Nama Bulan>" / "Jadwal Kunjungan MR
 * <Nama Bulan> <Tahun>".
 */
const LANGKAH = [
  {
    judul: 'Buat file jadwal bulan baru',
    isi: 'Salin file jadwal bulan lalu (biar header & rumus kolom bantu L:O ikut terbawa), '
      + 'lalu ganti isi tabelnya. Jangan mengedit file bulan lama untuk bulan baru — '
      + 'riwayat bulan lama jadi hilang.',
  },
  {
    judul: 'Simpan di folder bulan yang benar',
    isi: 'Folder "Jadwal Kunjungan MR" → folder tahun → folder bulan. Nama folder bulan '
      + 'harus memuat nama bulannya, mis. "10. Oktober". Kalau nama folder tidak memuat '
      + 'nama bulan, app tidak menemukannya.',
  },
  {
    judul: 'Beri nama file sesuai pola',
    isi: 'Contoh: "Jadwal Kunjungan MR Oktober 2026". Nama file WAJIB memuat tahun berjalan, '
      + 'karena itulah yang dipakai app untuk memilih file di dalam folder bulan. Kalau di '
      + 'folder itu hanya ada satu file, file tunggal itu yang dipakai.',
  },
  {
    judul: 'Isi kolom Kegiatan dengan tag periode',
    isi: 'Kolom Kegiatan (kolom E) berisi tag periode: 1M, 3M, 6M, 1Y. Satu baris boleh '
      + 'beberapa tag, mis. "1M, 3M, 6M". Baris tanpa tag periode tidak masuk hitungan '
      + 'donut mana pun — Dashboard akan menandainya dengan peringatan di kartu Progress Kerja.',
  },
  {
    judul: 'Tandai pekerjaan yang sudah selesai',
    isi: 'Kolom Status Kegiatan (kolom J) diisi "Finish" kalau pekerjaan sudah selesai. '
      + 'Realisasi di Dashboard = jumlah baris yang kolom Status Kegiatan-nya "Finish". '
      + 'Selama belum diisi, donut menampilkan 0 meski pekerjaannya sudah dikerjakan.',
  },
  {
    judul: 'Periksa kolom bantu L:O',
    isi: 'Kolom bantu L:O menyimpan angka rencana per periode. App membandingkan angka itu '
      + 'dengan hasil hitung baris — kalau beda, selisihnya ditampilkan kecil di bawah donut '
      + 'supaya ketahuan kalau ada baris yang salah tag.',
  },
  {
    judul: 'Cek hasilnya di Dashboard',
    isi: 'Dashboard membaca file bulan berjalan otomatis saat dibuka. Kalau file belum ketemu, '
      + 'dashboard menampilkan alasannya (folder bulan tidak ada / file tidak ada) — bukan '
      + 'angka 0 yang menyesatkan.',
  },
];

export default function PanduanProgressPage() {
  const navigate = useNavigate();

  return (
    <section>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Cara Update Progress Kerja Saat Ganti Bulan</div>
        <div className="muted" style={{ fontSize: 13 }}>
          Kartu <b>Progress Kerja</b> di Dashboard selalu membaca jadwal kunjungan
          <b> bulan berjalan</b>. Begitu masuk bulan baru, yang perlu dilakukan adalah
          menyiapkan file jadwal bulan itu — bukan mengubah angka di aplikasi.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Urutan langkah</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
          {LANGKAH.map((l, i) => (
            <div key={l.judul} style={{ display: 'flex', gap: 12 }}>
              <div style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)',
                fontWeight: 700, fontSize: 13, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.judul}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{l.isi}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Struktur folder di Google Drive</div>
        <pre style={{
          fontSize: 12, background: 'var(--surface-alt)', padding: 12, borderRadius: 10,
          overflowX: 'auto', border: '1px solid var(--border-soft)', marginTop: 8,
        }}>{`Rencana Kerja/
└── 2026/
    ├── 9. September/
    │   └── Jadwal Kunjungan MR September 2026
    └── 10. Oktober/            <-- bulan berjalan
        └── Jadwal Kunjungan MR Oktober 2026   <-- file yang dibaca Dashboard`}</pre>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Yang dicari app: folder yang namanya <b>mengandung</b> nama bulan
          ({['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus',
            'September', 'Oktober', 'November', 'Desember'].slice(0, 3).join(', ')}, …),
          lalu di dalamnya file yang namanya <b>mengandung tahun berjalan</b>.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Arti kolom di sheet jadwal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {[
            ['B', 'Hari & Tanggal', 'Tanggal kunjungan.'],
            ['C', 'Jam', 'Jam kunjungan.'],
            ['D', 'Lokasi MR - ECS3', 'Lokasi yang dikunjungi.'],
            ['E', 'Kegiatan', `Tag periode — ${PERIODS.map((p) => `${p} (${PERIOD_LABEL[p]})`).join(', ')}.`],
            ['F', 'Detail Pekerjaan', 'Rincian pekerjaan.'],
            ['G', 'PIC Checksheet', 'Nama petugas.'],
            ['H', 'Temuan', 'Temuan saat kunjungan.'],
            ['I', 'Realisasi', 'Catatan realisasi.'],
            ['J', 'Status Kegiatan', 'Isi "Finish" kalau sudah selesai. Ini yang dihitung sebagai realisasi.'],
            ['K', 'Keterangan', 'Catatan tambahan.'],
            ['L–O', 'Kolom bantu rencana', 'Angka rencana per periode (1M/3M/6M/1Y) — dipakai app sebagai pembanding.'],
          ].map(([kolom, nama, ket]) => (
            <div key={kolom} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
              <span className="badge" style={{ minWidth: 44, justifyContent: 'center' }}>{kolom}</span>
              <span style={{ fontWeight: 600, minWidth: 140 }}>{nama}</span>
              <span style={{ color: 'var(--ink-soft)' }}>{ket}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Kalau ada yang tidak muncul</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, marginTop: 8 }}>
          <div>• <b>Donut 0/0 semua</b> — file jadwal bulan ini belum ketemu. Cek nama folder bulan
            dan nama file (harus memuat tahun).</div>
          <div>• <b>Rencana ada, realisasi 0</b> — kolom Status Kegiatan (J) belum ada isi
            &quot;Finish&quot;.</div>
          <div>• <b>Angka donut beda dari hitungan sendiri</b> — ada baris yang kolom Kegiatan-nya
            belum diberi tag periode; jumlahnya ditampilkan sebagai peringatan di kartu.</div>
          <div>• <b>Angka rencana kecil di bawah donut</b> — kolom bantu L:O di sheet beda dengan
            jumlah baris jadwal. Samakan salah satunya.</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Kembali ke Dashboard</button>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 14 }}>
          C-Fill {APP_VERSION} · {COPYRIGHT_LINE}
        </div>
      </div>
    </section>
  );
}
