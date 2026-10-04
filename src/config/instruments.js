// 32 instrumen tetap (nama file .xlsx aslinya sama persis dengan nama ini + '.xlsx'),
// + slotMap. Item i6 ('Latihan Pengujian instrumen di lapangan') pakai
// inputType 'location_note' - formatnya 'Lokasi Uji Fungsi: ... Catatan: ...'
// (BEDA dari item lain yang otomatis 'Tgl: ... Catatan: ...').
export const INSTRUMENTS = [
  "2M Digital Data Performance Analyzer",
  "Antena Feeder Cable Comprehensive Tester",
  "Batre comprehensive tester (501)",
  "Battery Internal Resistance Tester",
  "Clamp ammeter (Tang Ampere)",
  "Electric Level Oscillator",
  "GSM-R Base Station Comprehensive Tester",
  "Genset (501)",
  "Ground Resistance Tester",
  "Infrared Thermometer",
  "Insulation Table(meter)",
  "Kompas Azimuth",
  "Level Meter",
  "Lightning Protection Unit Tester",
  "Multimeter",
  "Network Performance Tester_analyzer (10 G)",
  "Network cable tester (LAN Tester)",
  "OTDR",
  "Optic Power Meter (OPM)",
  "Optic Power Source (OPS_OLS)",
  "Optical Cable Path Detector",
  "Optical Fiber Splicer",
  "Portable Field Strenght Tester (Spectrum Analyzer)",
  "Power Meter _ Dynamometer",
  "Telephone GSMR (OPH)",
  "Temperature and humidity meter",
  "Teropong Binocular (Telescope)",
  "Theodolite Elektronik (Termasuk Fungsi Pengukuran Vertikalitas Tower)",
  "VSWR Tester (Standing wave ratio tester)",
  "Video Surveillence Tester",
  "kompas Gonometer",
  "portable GSM-R _ GPRS Network drive test device (501)"
];

/**
 * Nama alternatif -> nama kanonik yang benar-benar ada sebagai file di Drive.
 *
 * Empat alat di bawah NAMANYA DITULIS DENGAN "/" di dokumen aslinya, tetapi
 * Google Drive TIDAK MENGIZINKAN karakter "/" di nama file - saat diunggah,
 * "/" berubah jadi "_" (spasi di sekitarnya tetap). Jadi nama bertanda "/"
 * tetap diterima di formulir (orang lapangan mengetiknya begitu), lalu
 * diterjemahkan ke nama file yang sebenarnya.
 *
 * Daftar INSTRUMENTS di atas memakai nama FILE (pakai "_") supaya cocok dengan
 * isi Drive; alias ini yang membuat penulisan asli tetap bisa dipakai.
 */
export const INSTRUMENT_ALIASES = {
  "Network Performance Tester/analyzer (10 G)": "Network Performance Tester_analyzer (10 G)",
  "Optic Power Source (OPS/OLS)": "Optic Power Source (OPS_OLS)",
  "Power Meter / Dynamometer": "Power Meter _ Dynamometer",
  "portable GSM-R / GPRS Network drive test device (501)": "portable GSM-R _ GPRS Network drive test device (501)"
};

/**
 * Nama instrumen -> nama file .xlsx yang dipakai di Drive.
 * Terima nama kanonik maupun alias (beda huruf besar/kecil & spasi juga aman).
 */
export function resolveInstrumentName(nama) {
  const raw = String(nama || "").trim();
  if (!raw) return raw;
  const kunci = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const target = kunci(raw);
  for (const [alias, kanonik] of Object.entries(INSTRUMENT_ALIASES)) {
    if (kunci(alias) === target || kunci(kanonik) === target) return kanonik;
  }
  const kanonik = INSTRUMENTS.find((i) => kunci(i) === target);
  return kanonik || raw;
}

export const INSTRUMENT_ITEMS = [
  {
    "id": "i1",
    "label": "Pemeriksaan aksesoris, body, display, tombol dan port",
    "standar": "kondisi baik dan lengkap sesuai manual book"
  },
  {
    "id": "i2",
    "label": "Pembersihan aksesoris, body dan cache storage (jika ada)",
    "standar": "Bersih"
  },
  {
    "id": "i3",
    "label": "Pemeriksaan daya baterai dan pengisian daya baterai",
    "standar": "Pengisian Normal dan terisi penuh"
  },
  {
    "id": "i4",
    "label": "Pemeriksaan file storage (hasil pengukuran) dan Update Software (jika ada)",
    "standar": "File tersusun rapih dan sudah update"
  },
  {
    "id": "i5",
    "label": "Pemeriksaan akurasi hasil pengukuran dengan alat referensi (kalibrasi internal/basic check)",
    "standar": "Hasil akurat dan sudah terkalibrasi"
  },
  {
    "id": "i6",
    "label": "Latihan Pengujian instrumen di lapangan (simulasi pengukuran, fault detection, dan reporting)",
    "standar": "Performa bagus dan penggunaan dapat dipahami",
    "inputType": "location_note",
    "defaultLocation": "Gudang CCM Halim"
  }
];

export const INSTRUMENT_PERIODS = [
  "1 Bulanan",
  "3 Bulanan",
  "1 Tahunan"
];

export const INSTRUMENT_SLOT_MAP = {
  "type": "monthly_slot",
  "headerRow": 6,
  "dateCol": 1,
  "petugasCol": 8,
  "slotStartRow": 10,
  "slotStep": 1,
  "slotCount": 12,
  "itemColumns": [
    {
      "id": "i1",
      "colStart": 2,
      "colWidth": 1
    },
    {
      "id": "i2",
      "colStart": 3,
      "colWidth": 1
    },
    {
      "id": "i3",
      "colStart": 4,
      "colWidth": 1
    },
    {
      "id": "i4",
      "colStart": 5,
      "colWidth": 1
    },
    {
      "id": "i5",
      "colStart": 6,
      "colWidth": 1
    },
    {
      "id": "i6",
      "colStart": 7,
      "colWidth": 1
    }
  ]
};
