// Kategori peralatan + slotMap + semua inputType khusus (battery_table,
// measurement_ohm, status_ohm, measurement_multi, unit_value_table).
// noTglPrefix diperbaiki menyeluruh (sempat hilang di 260 item akibat regenerasi
// slotMap berkali-kali sebelumnya).
export const CATEGORIES = [
  {
    "id": "cat01",
    "sheetName": "AC Distribution Cabinet (box) (",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan AC Distribution Cabinet (box) (1 Bulanan, 3 Bulanan, 6 Bulanan, 1 Tahunan)",
    "short_name": "AC Distribution Cabinet (box)",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan panel (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan tampilan instrumen, lampu indikator, dan posisi sakelar (1 bulan)",
        "standar": "Hasil Pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan tampilan pemutus sirkuit dan kontaktor (1 bulan)",
        "standar": "Hasil Pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pengujian alarm pemadaman listrik (3 bulan)",
        "standar": "Hasil Pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian fungsi Switching Main & Backup listrik AC (3 bulan)",
        "standar": "Hasil pengujian swtching baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan rak kabel (parit/bagian bawah) dan pemeriksaan penampilan saluran listrik (3 bulan)",
        "standar": "Sudah dibersihkan dan kabel dalam kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya(6 bulan)",
        "standar": "Hasil pemeriksaann baik dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Periksa kondisi dan kekuatan koneksi kabel grounding",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i9",
        "label": "Periksa pembagian beban arus dan kapasitas pemutus sirkuit",
        "standar": "Circuit Breaker minimal bernilai 1,5 kali arus pengukuran",
        "hasTglCatatan": true,
        "periodMonths": 1,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 11,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 1
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat02",
    "sheetName": "APAR",
    "title": "Lembar Pemeriksaan Alat Pemadam Api Ringan (APAR)",
    "short_name": "Alat Pemadam Api Ringan",
    "items": [
      {
        "id": "i1",
        "label": "Kondisi Casing Alat Pemadam Api",
        "standar": "Casing tidak rusak/berkarat (isi untuk tiap unit APAR di lokasi)"
      },
      {
        "id": "i2",
        "label": "Kondisi pin / segel",
        "standar": "Pin & segel utuh, tidak pernah terpakai"
      },
      {
        "id": "i3",
        "label": "Tekanan / Masa sesuai ketentuan (jarum indikator)",
        "standar": "Jarum indikator di area hijau"
      },
      {
        "id": "i4",
        "label": "Masa kadaluarsa APAR",
        "standar": "Belum melewati tanggal kadaluarsa"
      }
    ],
    "note": "Form asli berbentuk matriks (1 baris/item x kolom per nomor unit APAR 1-10). Di C-Fill disederhanakan jadi isian per item (isi rekap untuk semua unit APAR di lokasi tsb).",
    "periods": [
      "Sesuai jadwal"
    ],
    "slotMap": {
      "type": "matrix",
      "itemRowStart": 7,
      "unitColStart": 2,
      "defaultUnitCount": 12,
      "dateRow": 11
    }
  },
  {
    "id": "cat03",
    "sheetName": "BTS (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan BTS (1 Bulanan, 3 Bulanan)",
    "short_name": "BTS",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status pengoperasian BBU dan RRU (3 bulan)",
        "standar": "Pemeriksaan operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i3",
        "label": "Peeriksaan konektor dan kabel (3 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan operasi kipas dan bersihkan kipas/filter debu (3 bulan)",
        "standar": "Pemeriksaan baik dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian panggilan di tempat (3 bulan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian layanan intelligent Network (3 Bulanan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat04",
    "sheetName": "BTS-A (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan BTS (1 Bulanan, 3 Bulanan)",
    "short_name": "BTS A",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status pengoperasian BBU dan RRU (3 bulan)",
        "standar": "Pemeriksaan operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i3",
        "label": "Peeriksaan konektor dan kabel (3 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan operasi kipas dan bersihkan kipas/filter debu (3 bulan)",
        "standar": "Pemeriksaan baik dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian panggilan di tempat (3 bulan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian layanan intelligent Network (3 Bulanan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat05",
    "sheetName": "BTS-B (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan BTS (1 Bulanan, 3 Bulanan)",
    "short_name": "BTS B",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status pengoperasian BBU dan RRU (3 bulan)",
        "standar": "Pemeriksaan operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i3",
        "label": "Peeriksaan konektor dan kabel (3 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan operasi kipas dan bersihkan kipas/filter debu (3 bulan)",
        "standar": "Pemeriksaan baik dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian panggilan di tempat (3 bulan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian layanan intelligent Network (3 Bulanan)",
        "standar": "Hasil pengujian panggilan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat06",
    "sheetName": "Baterai HFSPS (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai HFSPS",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "53.52V - 54.52V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 2V：2.23V-2.27V; Tegangan Baterai 12V:13.38-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": true,
        "periodMonths": 3
      },
      {
        "id": "i7",
        "label": "Balanced charging / Pengisian seimbang dari grup baterai (3 bulan)",
        "standar": "55.2V-56.4V",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 20,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 19,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat07",
    "sheetName": "Baterai HFSPS (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Tahunan)",
    "short_name": "Baterai HFSPS",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat08",
    "sheetName": "Baterai HFSPS Grup 1 (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai HFSPS - Grup 1",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "53.52V - 54.52V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 2V：2.23V-2.27V; Tegangan Baterai 12V:13.38-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": false,
        "periodMonths": 3
      },
      {
        "id": "i7",
        "label": "Balanced charging / Pengisian seimbang dari grup baterai (3 bulan)",
        "standar": "55.2V-56.4V",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 20,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 19,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat09",
    "sheetName": "Baterai HFSPS Grup 1 (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Tahunan)",
    "short_name": "Baterai HFSPS - Grup 1",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat10",
    "sheetName": "Baterai HFSPS Grup 2 (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai HFSPS - Grup 2",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "53.52V - 54.52V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 2V：2.23V-2.27V; Tegangan Baterai 12V:13.38-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": false,
        "periodMonths": 3
      },
      {
        "id": "i7",
        "label": "Balanced charging / Pengisian seimbang dari grup baterai (3 bulan)",
        "standar": "55.2V-56.4V",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 20,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 19,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat11",
    "sheetName": "Baterai HFSPS Grup 2 (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai HFSPS (1 Tahunan)",
    "short_name": "Baterai HFSPS - Grup 2",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat12",
    "sheetName": "Baterai UPS MR (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS MR(1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai UPS MR",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "214.08V- 218.08V 428.16V- 436.16V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 12V:13.38V-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": false,
        "periodMonths": 3
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 19,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat13",
    "sheetName": "Baterai UPS MR (1Y, 3Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS MR (1 Tahunan, 3 Tahunan)",
    "short_name": "Baterai UPS MR",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester) (3 Tahun)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 36,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Tahunan",
      "3 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 36
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat14",
    "sheetName": "Baterai UPS MR Grup 1 (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS MR(1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai UPS MR - Grup 1",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "214.08V- 218.08V 428.16V- 436.16V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 12V:13.38V-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": false,
        "periodMonths": 3
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 19,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat15",
    "sheetName": "Baterai UPS MR Grup 1(1Y, 3Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS MR (1 Tahunan, 3 Tahunan)",
    "short_name": "Baterai UPS MR - Grup 1",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester) (3 Tahun)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 36,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Tahunan",
      "3 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 36
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat16",
    "sheetName": "Baterai UPS RPT (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS RPT(1 Bulanan, 3 Bulanan)",
    "short_name": "Baterai UPS RPT Repeater",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan dan pemeriksaan baterai (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan casing luar apakah menggelembung / kembung atau rusak (1 bulan)",
        "standar": "Tidak ada kerusakan",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kebocoran elektrolit atau kebocoran asam di terminal kutub baterai (1 bulan)",
        "standar": "Tidak ada kebocoran",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kekuatan koneksi (1 bulan)",
        "standar": "Tidak ada kelonggaran",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pengujian tegangan floating charge total dan arus floating charge dari battery bank / grup baterai (3 bulan)",
        "standar": "40.14V - 40.89V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian tegangan floating charge dan resistansi internal seluruh unit sel dari battery bank / grup baterai (3 bulan)",
        "standar": "Tegangan Baterai 12V:13.38-13.63V",
        "inputType": "battery_table",
        "defaultBatteryCount": 24,
        "hasTglCatatan": true,
        "periodMonths": 3
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 19,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat17",
    "sheetName": "Baterai UPS RPT (1Y, 3Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Baterai UPS Repeater (1 Tahunan, 3 Tahunan)",
    "short_name": "Baterai UPS Repeater",
    "items": [
      {
        "id": "i1",
        "label": "Verivikasi Discharge Test (1 tahun)",
        "standar": "Lakukan discharge test dengan beban aktual, melepaskan 30%-40% dari kapasitas nominal baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian Penurunan Tegangan Busbar Voltage Drop Test (1 tahun)",
        "standar": "2V : Kurang dari 90mV 12V : Kurang dari 480mV",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Tes Kapasitas Baterai (Menggunakan battery comprehensive tester) (3 Tahun)",
        "standar": "2V : 6 tahun sekali 12V : 3 Tahun sekali",
        "hasTglCatatan": true,
        "periodMonths": 36,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Tahunan",
      "3 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 36
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat18",
    "sheetName": "CCTV (3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan CCTV (3 Bulanan)",
    "short_name": "CCTV",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan kondisi pemasangan kamera, kepala pan/tilt, topi pelindung, lampu inframerah, dll di lapangan. (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kondisi pemasangan panel box peralatan luar ruangan di lapangan (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan Video vertikalitas tiang (tower), status pondasi dan lingkungan sekitar, dll di lapangan. (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan dan pembersihan status peralatan seperti codec, transceiver optik video, peralatan switching jaringan, dll. (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pemeriksaan dan Pengukuran proteksi petir dan grounding serta catat nilainya (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "inputType": "status_ohm",
        "unit": "Ω",
        "periodMonths": 3,
        "noTglPrefix": true,
        "statusOptions": [
          "Hasil pemeriksaan baik",
          "Hasil pemeriksaan tidak baik"
        ]
      }
    ],
    "periods": [
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat19",
    "sheetName": "CCTV (6M,1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan CCTV (6 Bulanan, 1 Tahunan)",
    "short_name": "CCTV",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan tampilan, kekuatan penyangga kamera, kekuatan koneksi kabel, kepala pan/tilt, cover pelindung, lampu inframerah,dan peralatan lainnya (6 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Bersihkan benda dan objek yang menghalangi pandangan kamera (6 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kekuatan struktur tiang CCTV, kekuatan setiap komponen dan bagian pemeriksaan baut rutin (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kondisi sambungan las komponen utama tiang CCTV (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan lapisan anti korosi dan kondisi karat pada komponen tiang video (tower), las, baut, mur, dll. (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan pondasi tiang video (tower) dan struktur geologi di sekitarnya (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "pemeriksaan di lapangan, penguatan dan pengaturan kotak peralatan luar ruangan (termasuk peralatan tambahan internal) (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Deteksi vertikalitas tiang video (tower) (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i9",
        "label": "Pemeliharaan peralatan seperti codec, transceiver optik video, peralatan switching jaringan, dll. (1 tahun)",
        "standar": "Kondisi Baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 11,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat20",
    "sheetName": "Clock synchronization (1M,3M,1Y",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Clock synchronization (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Clock synchronization",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi receiver satelit (1 bulan)",
        "standar": "Bekerja dengan baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pembersihan permukaan peralatan (3 bulan)",
        "standar": "Bersih tanpa debu",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i3",
        "label": "Pemeriksaan Feeder dan receiver antena satelit dan lingkungan sekitar (3 bulan)",
        "standar": "Kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel ground peralatan, pemeriksaan perangkat proteksi petir feeder antena (1 tahun)",
        "standar": "Konektor yang kuat",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan kabel dan pelabelan (1 tahun)",
        "standar": "Pengkabelan rapi dan pelabelan sesuai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat21",
    "sheetName": "Comprehensive Lightning Protect",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Comprehensive Lightning Protection (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Comprehensive Lightning Protection",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan indikator kegagalan dan status sakelar pemutus pelindung lonjakan arus (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan lampu indikator kotak proteksi petir, tampilan display, periksa dan catat jumlah sambaran petir (1 bulan)",
        "standar": "Hasil pemeriksaan baik (catat nilai sambaran)",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan Waktu / Time Calibration (1 bulan)",
        "standar": "Sama dengan waktu Jakarta",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan heating status modul pelindung lonjakan daya (3 bulan)",
        "standar": "-40ºCº ~ 85ºC",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksa kualitas koneksi grounding bar, kabel grounding, ikatan ekuipotensial, dan kabel jaringan grounding (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan tampilan dan kualitas sambungan pelindung lonjakan arus (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pemeriksaan dan pengukuran nilai resistansi grounding (1 tahun)",
        "standar": "Tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "inputType": "measurement_ohm",
        "unit": "Ω",
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 9,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat22",
    "sheetName": "Conference (1M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Conference (1 Bulanan)",
    "short_name": "Conference",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan dan pemeriksaan status (1 bulan)",
        "standar": "Pembersihan peralatan dan pemeriksaan status operasi (1 bulan)",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Periksa kabel sambungan dan label (1 bulan)",
        "standar": "Konektor bagus, label sesuai",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan pengaturan dan kontrol kamera (1 bulan)",
        "standar": "Berfungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Uji suara dan gambar: input dan output audio dan video (1 bulan)",
        "standar": "Uji fungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pemeriksaan fungsi mixer (1 bulan)",
        "standar": "Berfungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i6",
        "label": "Pemeriksaan fungsi TV (monitor, dll) (1 bulan)",
        "standar": "Berfungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i7",
        "label": "Pemeriksaan fungsi amplifier (1 bulan)",
        "standar": "Berfungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i8",
        "label": "Pemeriksaan fungsi mikrofon (1 bulan)",
        "standar": "Berfungsi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 1
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat23",
    "sheetName": "Data Network (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Data Network Router dan Switch(3 Bulanan, 6 Bulanan)",
    "short_name": "Data Network Router dan Switch",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan dan periksa status pengoperasian (3 bulan)",
        "standar": "Sudah dibersihkan, status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan aksesoris peralatan, kabel dan label (3 bulan)",
        "standar": "Hasil pemeriksaan baik, kabel rapi, dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan filter debu peralatan (3 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 6,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat24",
    "sheetName": "Dispatch Console FAS (1M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Dispatch Console (1 Bulanan)",
    "short_name": "Dispatch Console",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan operasi peralatan (Cek lampu led indikator operasi) (1 bulan)",
        "standar": "Peralatan bekerja dengan baik,tidak ada alarm",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Bersihkan permukaan peralatan, periksa mikrofon dan koneksi (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Periksa status peralatan, atur sensitivitas layar, waktu di display, dan lainnya",
        "standar": "Hasil pemeriksaan lampu indikator normal, sentuhan sensitif, dan waktu akurat",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan saluran utama dan cadangan (interface ganda), saluran utama dan tambahan panggilan, bicara, uji peralihan gagang (1 bulan)",
        "standar": "Peralihan normal dan layanan panggilan baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Uji Panggilan Dispatch : area layanan stasiun, antar stasiun, OCE dengan petugas lapangan (1 bulan)",
        "standar": "Layanan panggilan baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i6",
        "label": "Pengujian panggilan masuk dan keluar ekstensi darurat (1 bulan)",
        "standar": "Hasil pengujian layanan panggilan baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i7",
        "label": "Pembaruan pemeriksaan label aplikasi (1 bulan)",
        "standar": "Pelabelan jelas",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 9,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 1
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat25",
    "sheetName": "Dispatch Console FAS (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Dispatch Console (1 Tahunan)",
    "short_name": "Dispatch Console",
    "items": [
      {
        "id": "i1",
        "label": "Pengujian, inspeksi dan penyesuaian keamanan perangkat dan cek kabel grounding (1 tahun)",
        "standar": "Dispatch Console dalam kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i2",
        "label": "Pembersihan, pemeriksaan, perbaikan dan penggantian suku cadang peralatan jika diperlukan (1 tahun)",
        "standar": "Hasil pemeriksaan seluruh mesin dan komponennya dalam kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kondisi dan pengujian mikrofon, atau ganti mikrofon jika diperlukan (1 tahun)",
        "standar": "Hasil pemeriksaan mikrofon dalam kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pengujian fungsi utama seperti panggilan, rekaman panggilan dan uji permintaan, uji mandiri daya, dll. (1 tahun)",
        "standar": "Status panggilan baik, query rekaman panggilan normal, dan pengujian fungsi normal",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 6,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat26",
    "sheetName": "Emergency Communication Site Ar",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Emergency Site (1 Bulanan, 3 Bulanan)",
    "short_name": "Emergency Site",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan dan pembersihan berbagai kabel dan plug-in peralatan (1 bulan)",
        "standar": "Bersih dan dalam kondisi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan, pembersihan dan pengujian berbagai peralatan (1 bulan)",
        "standar": "Bersih dan dalam kondisi baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan dan verifikasi kuantitas kabel optik darurat (1 bulan)",
        "standar": "Kondisi bagus, kuantitas sesuai",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan daya baterai dan pengisian daya baterai (1 bulan)",
        "standar": "Terisi penuh",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pemeriksaan kinerja dan verifikasi kuantitas peralatan darurat dan peralatan lainnya (1 bulan)",
        "standar": "Performa bagus dan kuantitas sesuai",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i6",
        "label": "Uji coba panggilan telepon (1 bulan)",
        "standar": "Uji panggilan bagus",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i7",
        "label": "Uji coba transmisi gambar, data, dan video conference (1 bulan)",
        "standar": "Uji transmisi bagus",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i8",
        "label": "Pemeriksaan dan pengujian kabel optik darurat (1 bulan)",
        "standar": "Uji fungsi bagus",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i9",
        "label": "Latihan di lapangan : uji panggilan internal di lapangan, uji panggilan di lapangan dengan pusat komando darurat (OCC), uji pengiriman dokumen dan uji transmisi gambar dinamis (1 bulan)",
        "standar": "Hasil uji bagus",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 11,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 1
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat27",
    "sheetName": "Fiber Optic RU MR (3M, 1Y, 2Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Fiber Optic Repeater Unit MR (3 Bulanan, 1 Tahunan, 2 Tahunan)",
    "short_name": "Fiber Optic Repeater Unit MR",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan peralatan dan status operasi peralatan (3 bulan)",
        "standar": "Hasil pemeriksaan baik, status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian layanan dasar panggilan (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kabel dan kekuatan koneksi (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pembersihan debu repeater (3 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pengujian serat optik cadangan (1 tahun)",
        "standar": "Hasil pengujian sesuai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian RF output power RU (2 Tahunan)",
        "standar": "Menggunakan Spectrume Analyzer",
        "hasTglCatatan": true,
        "periodMonths": 24,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "1 Tahunan",
      "2 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 24
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat28",
    "sheetName": "Fiber Optic RU RPT (3M, 1Y, 2Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Fiber Optic Repeater Unit RPT (3 Bulanan, 1 Tahunan, 2 Tahunan)",
    "short_name": "Fiber Optic Repeater Unit RPT",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan peralatan dan status operasi peralatan (3 bulan)",
        "standar": "Hasil pemeriksaan baik, status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pengujian layanan dasar panggilan (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kabel dan kekuatan koneksi (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pembersihan debu repeater (3 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pengujian serat optik cadangan (1 tahun)",
        "standar": "Hasil pengujian sesuai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian RF output power RU (2 Tahunan)",
        "standar": "Menggunakan Spectrume Analyzer",
        "hasTglCatatan": true,
        "periodMonths": 24,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "1 Tahunan",
      "2 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 24
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat29",
    "sheetName": "HFSPS (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (1 Bulanan, 3 Bulanan)",
    "short_name": "High-frequency switching power supply",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status operasi dan catat tegangan dan Arus output /keluaran (1 bulan)",
        "standar": "Status normal dan catat tegangan output",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan ATS/transfer switch,sekring, pemutus sirkuit/circuit breaker, kontaktor, unit proteksi petir, dan kipas (1 bulan)",
        "standar": "Hasil pemeriksaan Baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pengujian tegangan keluaran & arus keluaran (3 bulan)",
        "standar": "Tegangan: 53,2-57,6 V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan Waktu / Time Calibration (3 bulan)",
        "standar": "Sama dengan waktu Jakarta",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan pembagian arus merata (current sharing) modul rectifier (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "inputType": "unit_value_table",
        "unit": "A",
        "defaultUnitCount": 4,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pengujian alarm pemadaman listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian fungsi Switching Main & Backup listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat30",
    "sheetName": "HFSPS (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (6 Bulanan, 1 Tahunan)",
    "short_name": "High-frequency switching power supply",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan kipas beroperasi dengan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kekuatan setiap sambungan, pengaturan wiring kabel,dan periksa label (6 bulan)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Inspeksi Visual/Tampilan dan inspeksi kekuatan sambungan kabel ground protektif (1 tahun)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pengujian fungsi pembatas arus/current limiting (1 tahun)",
        "standar": "Pembatasan arus pengisian baterai adalah 1/10 dari kapasitas baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian arus beban DC dan pemeriksaan kapasitas sekring (Pemutus sirkuit/Circuit Breaker) (1 tahun)",
        "standar": "Circuit Breaker minimal bernilai 1,5 kali arus pengukuran",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian penurunan/Drop tegangan ujung ke ujung/End to End voltage pada rangkaian catu daya DC (1 tahun)",
        "standar": "Nilai output catu daya switching dikurangi nilai input pada sisi perangkat tidak boleh melebihi 3,2V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pemeriksaan verifikasi pengaturan parameter sistem (1 tahun)",
        "standar": "Alarm batas bawah tegangan rendah ditetapkan 48V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian Fungsi Alarm (1 tahun)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat31",
    "sheetName": "HFSPS-A (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (1 Bulanan, 3 Bulanan)",
    "short_name": "High-frequency switching power supply A",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status operasi dan catat tegangan dan Arus output /keluaran (1 bulan)",
        "standar": "Status normal dan catat tegangan output",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan ATS/transfer switch,sekring, pemutus sirkuit/circuit breaker, kontaktor, unit proteksi petir, dan kipas (1 bulan)",
        "standar": "Hasil pemeriksaan Baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pengujian tegangan keluaran & arus keluaran (3 bulan)",
        "standar": "Tegangan: 53,2-57,6 V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan Waktu / Time Calibration (3 bulan)",
        "standar": "Sama dengan waktu Jakarta",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan pembagian arus merata (current sharing) modul rectifier (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "inputType": "unit_value_table",
        "unit": "A",
        "defaultUnitCount": 4,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pengujian alarm pemadaman listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian fungsi Switching Main & Backup listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat32",
    "sheetName": "HFSPS-A (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (6 Bulanan, 1 Tahunan)",
    "short_name": "High-frequency switching power supply A",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan kipas beroperasi dengan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kekuatan setiap sambungan, pengaturan wiring kabel,dan periksa label (6 bulan)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Inspeksi Visual/Tampilan dan inspeksi kekuatan sambungan kabel ground protektif (1 tahun)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pengujian fungsi pembatas arus/current limiting (1 tahun)",
        "standar": "Pembatasan arus pengisian baterai adalah 1/10 dari kapasitas baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian arus beban DC dan pemeriksaan kapasitas sekring (Pemutus sirkuit/Circuit Breaker) (1 tahun)",
        "standar": "Circuit Breaker minimal bernilai 1,5 kali arus pengukuran",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian penurunan/Drop tegangan ujung ke ujung/End to End voltage pada rangkaian catu daya DC (1 tahun)",
        "standar": "Nilai output catu daya switching dikurangi nilai input pada sisi perangkat tidak boleh melebihi 3,2V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pemeriksaan verifikasi pengaturan parameter sistem (1 tahun)",
        "standar": "Alarm batas bawah tegangan rendah ditetapkan 48V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian Fungsi Alarm (1 tahun)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat33",
    "sheetName": "HFSPS-B (1M, 3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (1 Bulanan, 3 Bulanan)",
    "short_name": "High-frequency switching power supply B",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status operasi dan catat tegangan dan Arus output /keluaran (1 bulan)",
        "standar": "Status normal dan catat tegangan output",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan ATS/transfer switch,sekring, pemutus sirkuit/circuit breaker, kontaktor, unit proteksi petir, dan kipas (1 bulan)",
        "standar": "Hasil pemeriksaan Baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pengujian tegangan keluaran & arus keluaran (3 bulan)",
        "standar": "Tegangan: 53,2-57,6 V",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan Waktu / Time Calibration (3 bulan)",
        "standar": "Sama dengan waktu Jakarta",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan pembagian arus merata (current sharing) modul rectifier (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "inputType": "unit_value_table",
        "unit": "A",
        "defaultUnitCount": 4,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pengujian alarm pemadaman listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian fungsi Switching Main & Backup listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat34",
    "sheetName": "HFSPS-B (1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan High-frequency switching power supply (6 Bulanan, 1 Tahunan)",
    "short_name": "High-frequency switching power supply B",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan kipas beroperasi dengan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kekuatan setiap sambungan, pengaturan wiring kabel,dan periksa label (6 bulan)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Inspeksi Visual/Tampilan dan inspeksi kekuatan sambungan kabel ground protektif (1 tahun)",
        "standar": "Koneksi kuat dan labelnya benar",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pengujian fungsi pembatas arus/current limiting (1 tahun)",
        "standar": "Pembatasan arus pengisian baterai adalah 1/10 dari kapasitas baterai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pengujian arus beban DC dan pemeriksaan kapasitas sekring (Pemutus sirkuit/Circuit Breaker) (1 tahun)",
        "standar": "Circuit Breaker minimal bernilai 1,5 kali arus pengukuran",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian penurunan/Drop tegangan ujung ke ujung/End to End voltage pada rangkaian catu daya DC (1 tahun)",
        "standar": "Nilai output catu daya switching dikurangi nilai input pada sisi perangkat tidak boleh melebihi 3,2V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pemeriksaan verifikasi pengaturan parameter sistem (1 tahun)",
        "standar": "Alarm batas bawah tegangan rendah ditetapkan 48V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian Fungsi Alarm (1 tahun)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 10,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat35",
    "sheetName": "Pemeriksaan jalur FO (1M, 3M, 1",
    "title": "Lembar Pemeriksaan dan Perawatan Jalur Kabel Optik (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Kabel Optik",
    "items": [
      {
        "id": "i1",
        "label": "Periksa kabel optik dan saluran pipa untuk mengetahui adanya kelainan dan pengaruh eksternal, dan tangani masalah dengan segera jika ditemukan (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Bersihkan gulma di sekitar patok pada bagian kabel optik yang ditanam jari-jari 50 cm dari patok, lalu luruskan dan perkuat patok tersebut (1 bulan)",
        "standar": "Sudah dibersihkan dan patok sudah kokoh",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kekuatan dan pemeliharaan saluran kabel optik dan fasilitas tambahan (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Deteksi dan konfirmasi jalur kabel optik yang terkubur langsung, inspeksi kedalaman penguburan, penguatan dan konsolidasi tanah (1 tahun)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan sambungan isolasi dan grounding kabel optik yang masuk ke machinery room (1 tahun)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 11,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat36",
    "sheetName": "Lightning",
    "title": "Lembar Pemeriksaan Lightning Protection Module",
    "short_name": "Lightning Protection Module",
    "items": [
      {
        "id": "i1",
        "label": "Data pemeriksaan tiap modul (Serial Number, Hasil Pengecekan, Keterangan)",
        "standar": "Hasil pengecekan baik, tidak ada kerusakan"
      }
    ],
    "note": "Form asli berbentuk tabel per Serial Number modul (bisa >1 modul per lokasi). Di C-Fill disederhanakan jadi 1 isian rekap (bisa dituliskan per-SN di kolom Catatan).",
    "periods": [
      "Sesuai jadwal"
    ],
    "slotMap": {
      "type": "matrix",
      "itemRowStart": 2,
      "unitColStart": 2,
      "defaultUnitCount": 10,
      "dateRow": null
    }
  },
  {
    "id": "cat37",
    "sheetName": "Pemeriksaan lingkungan MR (1M)",
    "title": "Lembar Pemeriksaan Lingkungan Machinery Room 1 Bulanan",
    "short_name": "Lingkungan Machinery Room 1 Bulanan",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan ruangan dan lingkungan",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan suhu dan kelembaban ruangan",
        "standar": "MR Kelas II: suhu 18ºC~28ºC. Kelembaban relatif 30%~75%RH MR kelas III: suhu 5ºC~30ºC. Kelembaban relatif: 15%~ 85%RH",
        "hasTglCatatan": false,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "kelas",
            "label": "MR Kelas",
            "prefix": "MR Kelas",
            "type": "select",
            "options": [
              "II",
              "III"
            ]
          },
          {
            "id": "suhu",
            "label": "Suhu",
            "prefix": "C",
            "unit": "ºC"
          },
          {
            "id": "rh",
            "label": "Kelembaban",
            "prefix": "RH",
            "unit": "%"
          }
        ],
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan kinerja AC",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan fasilitas pencahayaan",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i5",
        "label": "Pemeriksaan pintu dan ventilasi ruangan",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i6",
        "label": "Pemeriksaan peralatan pemadam kebakaran",
        "standar": "Catat tanggal kadaluarsa",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      }
    ],
    "periods": [
      "1 Bulanan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 1
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat38",
    "sheetName": "Perekam Suara (1M,3M,1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Perekam Suara (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Perekam Suara",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan dan pemeriksaan status pengoperasian (1 bulan)",
        "standar": "Sudah dibersihkan, operasi normal, dan tidak ada alarm",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kabel dan konektor (1 bulan)",
        "standar": "Hasil pemeriksaan baik dan konektor kuat",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan waktu / Time Calibration (1 bulan)",
        "standar": "Sama dengan waktu Jakarta",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pengujian/play file rekaman suara (1 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i5",
        "label": "Pembaruan verifikasi label (1 bulan)",
        "standar": "Label Sesuai",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i6",
        "label": "Pemeriksaan display perekam: status pengoperasian, status perekaman, status pemutaran rekaman (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pengujian fungsi alarm perekam (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Memeriksa dan mengatur file rekaman (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i9",
        "label": "Pemeriksaan, pengukuran dan penyesuaian kabel ground (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i10",
        "label": "Pembersihan, pemeriksaan dan penggantian komponen seluruh mesin (Overhaul/Opsional) (1 tahun)",
        "standar": "Sudah dibersihkan dan dalam kondisi baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i11",
        "label": "Penggantian kabel yang sudah usang (Opsional) (1 tahun)",
        "standar": "Keadaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i12",
        "label": "Uji fungsi seperti penyetelan, pemantauan, penghapusan, tampilan, dan sinkronisasi waktu (1 tahun)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 14,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i10",
          "colStart": 11,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i11",
          "colStart": 12,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i12",
          "colStart": 13,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat39",
    "sheetName": "Sistem Leacky Cable & Antena Fe",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Sistem Leacky Cable & Antena Feeder(1 Bulanan, 6 Bulanan, 1 Tahunan)",
    "short_name": "Sistem Leacky Cable & Antena Feeder",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan tampilan tower dan kabel feeder antena (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Inspeksi pagar dan kontrol akses (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan jalur dan kelengkapan leacky cable (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pemeriksaan sambungan leacky cable (6 bulanan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan sambungan, antena feeder dan pengencangan tower (6 bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian inspeksi sudut elevasi antena dan sudut azimuth (6 bulan)",
        "standar": "Gunakan compas untuk menyesuaikan dengan database BTS",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "pemeriksaan kekuatan dan sealing kabel antena dan feeder (6 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i8",
        "label": "Pengujian SWR (Standing Wave ratio) antena dan feeder (1 tahun)",
        "standar": "Nilai VSWR dibawah 1.4",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i9",
        "label": "Pemeriksaan bersama, perbaikan dan penggantian jika diperlukan (1 tahun)",
        "standar": "Hasil pemeriksaan baik (Tidak ada pemggantian komponen)",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i10",
        "label": "Pengujian SWR (Standing Wave ratio) kabel LCX (1 tahun)",
        "standar": "Nilai VSWR dibawah 1.4",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i11",
        "label": "Pemeriksaan peralatan pendukung kabel LCX (bracket parts, hanging wires and fixing parts) (1 tahun)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 13,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i10",
          "colStart": 11,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i11",
          "colStart": 12,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat40",
    "sheetName": "Sistem Monitoring LCX (1M,3M,1Y",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Sistem Monitoring LCX(1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Sistem Monitoring LCX",
    "items": [
      {
        "id": "i1",
        "label": "Bersihkan permukaan LCX monitoring/FSU dan periksa status operasi (1 Bulan)",
        "standar": "Sudah dibersihkan, status operasi normal tidak ada alarm",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan dan inspeksi kondisi perangkat host LCX Monitoring/FSU (1 Bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "periodMonths": 1,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan label peralatan dan label kabel (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan pelabelan benar",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan penampilan, pemasangan dan kekuatan koneksi sensor front-end (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Verifikasi fungsi manajemen sistem pemantauan dan pemeriksaan data pemantauan (1 Tahun)",
        "standar": "Berkordinasi dengan NMC",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan dan pengukuran grounding peralatan serta catat nilainya (1 Tahun)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "inputType": "measurement_ohm",
        "unit": "Ω",
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat41",
    "sheetName": "Sistem Monitoring RTU (1M,3M,1Y",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Sistem Monitoring RTU (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Sistem Monitoring RTU",
    "items": [
      {
        "id": "i1",
        "label": "Bersihkan permukaan RTU dan periksa status operasi (1 Bulan)",
        "standar": "Sudah dibersihkan, status operasi normal tidak ada alarm",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Periksa dan kalibrasi waktu peralatan (1 Bulan)",
        "standar": "Sama dengan waktu jakarta",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan label peralatan dan label kabel (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan pelabelan benar",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kondisi sensor, pemasangan sensor dan kekuatan koneksi sensor (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Verifikasi fungsi manajemen sistem pemantauan dan pemeriksaan data pemantauan (1 Tahun)",
        "standar": "Berkordinasi dengan NMC",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pemeriksaan dan pengukuran grounding peralatan serta catat nilainya (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "inputType": "measurement_ohm",
        "unit": "Ω",
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat42",
    "sheetName": "Sistem Tower Monitoring (1M,3M,",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Sistem Tower Monitoring (1 Bulanan, 3 Bulanan, 1 Tahunan)",
    "short_name": "Sistem Tower Monitoring",
    "items": [
      {
        "id": "i1",
        "label": "Bersihkan permukaan tower monitoring dan periksa status operasi (1 Bulan)",
        "standar": "Sudah dibersihkan, status operasi normal tidak ada alarm",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan dan inspeksi kondisi perangkat tower monitoring (1 Bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i3",
        "label": "Pemeriksaan data tower monitoring (Berkordinasi dan verifikasi ke NMC) (3 Bulan)",
        "standar": "Sudah diverifikasi",
        "hasTglCatatan": false,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan label peralatan dan label kabel (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan pelabelan benar",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan penampilan, pemasangan dan kekuatan koneksi sensor front-end (3 Bulan)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Verifikasi fungsi manajemen sistem pemantauan dan pemeriksaan data pemantauan (1 Tahun)",
        "standar": "Berkordinasi dengan NMC",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i7",
        "label": "Pemeriksaan dan pengukuran grounding peralatan serta catat nilainya (1 Tahun)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": true,
        "inputType": "measurement_ohm",
        "unit": "Ω",
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 9,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat43",
    "sheetName": "Station dispatching switch (3M,",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Stasion Dispatch Switch (3 Bulanan, 1 Tahunan)",
    "short_name": "Stasion Dispatch Switch",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan eksterior peralatan (3 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan peralatan tambahan dan kabel (3 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Periksa dan bersihkan atau ganti filter debu dan kipas (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pengukuran tegangan daya input (1 tahun)",
        "standar": "53V-54V",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan kabel dan tampilan kabel ground dan unit proteksi (1 tahun)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian fungsi utama: Panggilan prioritas, penyisipan panggilan secara paksa, panggilan individual, panggilan darurat, panggilan grup, dan panggilan konferensi (1 Tahun)",
        "standar": "Dilakukan Emergency Drill Terpadu",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat44",
    "sheetName": "Telephone AG (3,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Telephone dan Softswitch AG (3 Bulanan, 6 Bulanan)",
    "short_name": "Telephone dan Softswitch AG",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan dan periksa status operasi (3 bulan)",
        "standar": "Sudah dibersihkan,pemeriksaan status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan aksesoris, kabel dan label peralatan (3 bulan)",
        "standar": "Hasil pemeriksaan kabel rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Uji dial panggilan (Cek modulasi dan nada notifikasi panggilan) (6 bulan)",
        "standar": "Uji panggilan baik (Pengujian softswitch hanya di stasiun & Signal Building)",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat45",
    "sheetName": "Telephone IP (3,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Telephone dan Softswitch AG (3 Bulanan, 6 Bulanan)",
    "short_name": "Telephone dan Softswitch IP",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan peralatan dan periksa status operasi (3 bulan)",
        "standar": "Sudah dibersihkan,pemeriksaan status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan aksesoris, kabel dan label peralatan (3 bulan)",
        "standar": "Hasil pemeriksaan kabel rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Uji dial panggilan (Cek modulasi dan nada notifikasi panggilan) (6 bulan)",
        "standar": "Uji panggilan baik (Pengujian softswitch hanya di stasiun & Signal Building)",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat46",
    "sheetName": "Tower (3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Tower(3 Bulanan)",
    "short_name": "Tower",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan tampilan struktur tower, anchors dan baut (3 bulan)",
        "standar": "Hasil pemeriksaan dalam keadaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 3
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kondisi pondasi tower dan lingkungan sekitar (3 bulan)",
        "standar": "Hasil pemeriksaan dalam keadaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 3
      },
      {
        "id": "i3",
        "label": "Pemeriksaan koneksi ground (3 bulan)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 3
      },
      {
        "id": "i4",
        "label": "Pemeriksaan lampu tanda penerbangan dan tanda peringatan keselamatan (3 bulan)",
        "standar": "Hasil pemeriksaan lampu dalam kondisi baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 3
      }
    ],
    "periods": [
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 6,
      "slotStartRow": 11,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat47",
    "sheetName": "Tower (6M,1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Tower(6 Bulanan, 1 Tahunan)",
    "short_name": "Tower",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan kekuatan struktur eksterior tower, pemeriksaan baut pengikat masing-masing komponen dan bagian, serta pengencangan baut seluruh tower. (6 bulan)",
        "standar": "Hasil pemeriksaan dalam keadaan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Periksa kekencangan pemasangan platform tower, tangga, jaring pelindung, bracket antena dan komponen tambahan lainnya, dan kencangkan bautnya (6 bulan)",
        "standar": "Hasil pemeriksaan dalam keadaan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pengujian vertikalitas tower (1 tahun)",
        "standar": "Menggunakan theodolit/hasil NMC tower monitoring",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pengujian dan perbaikan kabel ground, inspeksi dan perbaikan penangkal petir dan konduktor penangkal petir (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 10Ω",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan dan perawatan pondasi tower dan struktur geologi sekitarnya (1 tahun)",
        "standar": "Hasil pemeriksaan dalam keadaan baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat48",
    "sheetName": "Transmisi (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Transmisi SDH/MSTP (3 Bulanan, 6 Bulanan)",
    "short_name": "Transmisi SDH/MSTP",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi peralatan (3 bulan)",
        "standar": "Status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan pengkabelan, pelabelan dan verivikasi EDF,DDF,ODF (3 bulan)",
        "standar": "Hasil pemeriksaan rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan permukaan peralatan dan filter debu (3 bulan)",
        "standar": "Status operasi normal, tidak ada alarm, dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel dan kekuatan koneksi grounding peralatan (6 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Uji tegangan daya input dan output (6 bulan)",
        "standar": "Lakukan pengukuran V.in dan V.out",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "input",
            "label": "Input",
            "prefix": "Input",
            "unit": "V"
          },
          {
            "id": "output",
            "label": "Output",
            "prefix": "Output",
            "unit": "V"
          }
        ],
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat49",
    "sheetName": "Transmisi 10G (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Transmisi SDH/MSTP (3 Bulanan, 6 Bulanan)",
    "short_name": "Transmisi SDH/MSTP 10G",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi peralatan (3 bulan)",
        "standar": "Status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan pengkabelan, pelabelan dan verivikasi EDF,DDF,ODF (3 bulan)",
        "standar": "Hasil pemeriksaan rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan permukaan peralatan dan filter debu (3 bulan)",
        "standar": "Status operasi normal, tidak ada alarm, dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel dan kekuatan koneksi grounding peralatan (6 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Uji tegangan daya input dan output (6 bulan)",
        "standar": "Lakukan pengukuran V.in dan V.out",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "input",
            "label": "Input",
            "prefix": "Input",
            "unit": "V"
          },
          {
            "id": "output",
            "label": "Output",
            "prefix": "Output",
            "unit": "V"
          }
        ],
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat50",
    "sheetName": "Transmisi 2,5G (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Transmisi SDH/MSTP (3 Bulanan, 6 Bulanan)",
    "short_name": "Transmisi SDH/MSTP 2,5G",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi peralatan (3 bulan)",
        "standar": "Status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan pengkabelan, pelabelan dan verivikasi EDF,DDF,ODF (3 bulan)",
        "standar": "Hasil pemeriksaan rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan permukaan peralatan dan filter debu (3 bulan)",
        "standar": "Status operasi normal, tidak ada alarm, dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel dan kekuatan koneksi grounding peralatan (6 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Uji tegangan daya input dan output (6 bulan)",
        "standar": "Lakukan pengukuran V.in dan V.out",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "input",
            "label": "Input",
            "prefix": "Input",
            "unit": "V"
          },
          {
            "id": "output",
            "label": "Output",
            "prefix": "Output",
            "unit": "V"
          }
        ],
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat51",
    "sheetName": "Transmisi BTS-A (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Transmisi SDH/MSTP (3 Bulanan, 6 Bulanan)",
    "short_name": "Transmisi SDH/MSTP A",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi peralatan (3 bulan)",
        "standar": "Status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan pengkabelan, pelabelan dan verivikasi EDF,DDF,ODF (3 bulan)",
        "standar": "Hasil pemeriksaan rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan permukaan peralatan dan filter debu (3 bulan)",
        "standar": "Status operasi normal, tidak ada alarm, dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel dan kekuatan koneksi grounding peralatan (6 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Uji tegangan daya input dan output (6 bulan)",
        "standar": "Lakukan pengukuran V.in dan V.out",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "input",
            "label": "Input",
            "prefix": "Input",
            "unit": "V"
          },
          {
            "id": "output",
            "label": "Output",
            "prefix": "Output",
            "unit": "V"
          }
        ],
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat52",
    "sheetName": "Transmisi BTS-B (3M,6M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Transmisi SDH/MSTP (3 Bulanan, 6 Bulanan)",
    "short_name": "Transmisi SDH/MSTP B",
    "items": [
      {
        "id": "i1",
        "label": "Pemeriksaan status operasi peralatan (3 bulan)",
        "standar": "Status operasi normal dan tidak ada alarm",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan pengkabelan, pelabelan dan verivikasi EDF,DDF,ODF (3 bulan)",
        "standar": "Hasil pemeriksaan rapi dan label sesuai",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pembersihan permukaan peralatan dan filter debu (3 bulan)",
        "standar": "Status operasi normal, tidak ada alarm, dan sudah dibersihkan",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i4",
        "label": "Pemeriksaan kabel dan kekuatan koneksi grounding peralatan (6 bulan)",
        "standar": "Pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Uji tegangan daya input dan output (6 bulan)",
        "standar": "Lakukan pengukuran V.in dan V.out",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "input",
            "label": "Input",
            "prefix": "Input",
            "unit": "V"
          },
          {
            "id": "output",
            "label": "Output",
            "prefix": "Output",
            "unit": "V"
          }
        ],
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihkan dan operasi kipas baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "3 Bulanan",
      "6 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 6
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat53",
    "sheetName": "UPS (1M,3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan UPS (1 Bulanan, 3 Bulanan)",
    "short_name": "UPS",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan dan pembersihan filter debu/kipas (1 bulan)",
        "standar": "Sudah dibersihkan",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i2",
        "label": "Pemeriksaan status operasi dan catat tegangan output/keluaran (1 bulan)",
        "standar": "Status normal dan catat tegangan dan arus output",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "status",
            "label": "Status",
            "prefix": "Status",
            "type": "select",
            "options": [
              "Normal",
              "Tidak Normal"
            ]
          },
          {
            "id": "output_header",
            "label": "Output",
            "type": "section"
          },
          {
            "id": "v",
            "label": "Tegangan (V)",
            "prefix": "V",
            "unit": "V"
          },
          {
            "id": "i",
            "label": "Arus (I)",
            "prefix": "I",
            "unit": "A"
          }
        ]
      },
      {
        "id": "i3",
        "label": "Pemeriksaan tampilan dan status pemutus sirkuit, kipas angin, unit proteksi dan komponen lainnya (1 bulan)",
        "standar": "Hasil pemeriksaan baik",
        "hasTglCatatan": false,
        "noTglPrefix": true,
        "periodMonths": 1
      },
      {
        "id": "i4",
        "label": "Pengujian tegangan Output, Arus, Frekuensi (3 bulan)",
        "standar": "Catat hasil pengukuran/tampilan di display",
        "hasTglCatatan": true,
        "inputType": "measurement_multi",
        "measurementFields": [
          {
            "id": "v",
            "label": "Tegangan",
            "unit": "V",
            "prefix": "V"
          },
          {
            "id": "i",
            "label": "Arus",
            "unit": "A",
            "prefix": "I"
          },
          {
            "id": "hz",
            "label": "Frekuensi",
            "unit": "Hz",
            "prefix": "Hz"
          }
        ],
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Pemeriksaan waktu / Time Calibration (Ruangan Signal Building) (3 bulan)",
        "standar": "Sama dengan waktu jakarta (selain signal building tidak ada time calibration)",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian fungsi Switching Main & Backup listrik AC (3 bulan)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 3,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "1 Bulanan",
      "3 Bulanan"
    ],
    "slotMap": {
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
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat54",
    "sheetName": "UPS (6M,1Y)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan UPS (6 Bulanan, 1 Tahunan)",
    "short_name": "UPS",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan kipas (6 bulan)",
        "standar": "Sudah dibersihan dan kipas berfungsi dengan baik",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Pemeriksaan kekuatan setiap sambungan, perapian wiring, dan periksa label (6 bulan)",
        "standar": "Hasil pemeriksaan baik, koneksi kuat dan label benar",
        "hasTglCatatan": true,
        "periodMonths": 6,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan penampilan dan kekuatan sambungan kabel ground (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan koneksi kuat",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i4",
        "label": "Pemeriksaan dan verifikasi nilai pengaturan parameter sistem (1 tahun)",
        "standar": "Hasil pemeriksaan baik dan parameter sesuai",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i5",
        "label": "Inspeksi verifikasi kapasitas beban (1 tahun)",
        "standar": "Tidak lebih dari 80% dari kapasitas terukur (Jika normal tulis normal, jika tidak normal tulis tidak normal)",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      },
      {
        "id": "i6",
        "label": "Pengujian fungsi alarm (1 tahun)",
        "standar": "Hasil pengujian baik",
        "hasTglCatatan": true,
        "periodMonths": 12,
        "noTglPrefix": false
      }
    ],
    "periods": [
      "6 Bulanan",
      "1 Tahunan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 8,
      "slotStartRow": 10,
      "slotStep": 6,
      "slotCount": 2,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  {
    "id": "cat55",
    "sheetName": "Video Acces Node (3M)",
    "title": "Lembar Pemeriksaan dan Perawatan Peralatan Video Access Node（3 bulanan）",
    "short_name": "Video Access Node（3 bulanan）",
    "items": [
      {
        "id": "i1",
        "label": "Pembersihan permukaan server, penyimpanan, peralatan switching jaringan dan peralatan lainnya, pembersihan kipas dan pemeriksaan status operasi (3 bulan)",
        "standar": "Sudah dibersihkan, status operasi normal",
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i2",
        "label": "Verifikasi alamat IP camera dengan ledger (buku besar) （3 bulan）",
        "standar": "Alamat IP sesuai dengan buku besar",
        "periodMonths": 3,
        "noTglPrefix": true
      },
      {
        "id": "i3",
        "label": "Pemeriksaan proteksi petir dan grounding （3 bulan）",
        "standar": "Hasil pemeriksaan baik dan tidak lebih dari 1Ω",
        "inputType": "measurement_ohm",
        "unit": "Ω",
        "periodMonths": 3,
        "noTglPrefix": true
      }
    ],
    "periods": [
      "3 Bulanan"
    ],
    "slotMap": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 5,
      "slotStartRow": 10,
      "slotStep": 3,
      "slotCount": 4,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  }
];
