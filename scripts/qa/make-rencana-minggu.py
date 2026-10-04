#!/usr/bin/env python3
"""
Susun dokumen Rencana Kerja Mingguan (Senin-Jumat) dari spreadsheet
"Jadwal Kunjungan MR <Bulan> <Tahun>".

Sumber: tab "Jadwal Kunjungan MR" (kolom B=Hari & Tanggal, C=Jam, D=Lokasi,
E=Kegiatan/1M-3M-6M, G=PIC, H=Temuan, J=Status) dan tab "Shift BIPO".

Jalankan:  .venv-docx/bin/python scripts/qa/make-rencana-minggu.py --mulai 2026-10-05
"""

import argparse
import datetime as dt
import json
import os
import subprocess
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

# ---------------------------------------------------------------- data dari Sheets
TOKEN_PATH = "/tmp/cfill_access_token.txt"
SID = "1H62ttfzOcVTuGMdbTdVvprWHNp7ymp4QkldjVKGQkV4"  # Jadwal Kunjungan MR Oktober 2026
TAB_JADWAL = "Jadwal Kunjungan MR"
TAB_SHIFT = "Shift BIPO"

HARI_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                 "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

KODE_SHIFT = {"P": "Pagi", "S": "Siang", "M": "Malam", "L": "Libur", "C": "Cuti"}

# Kegiatan -> label yang enak dibaca teknisi
LABEL_KEGIATAN = {
    "1M": "Bulanan (1M)",
    "1M, 3M": "Bulanan + 3-bulanan",
    "1M, 3M, 6M": "Bulanan + 3M + 6M",
    "3M, 6M": "3-bulanan + 6-bulanan",
    "1M,3M": "Bulanan + 3-bulanan",
}


def ambil_data():
    """Ambil isi spreadsheet lewat skrip Node yang sudah ada (pakai token OAuth)."""
    out = subprocess.run(
        ["node", "scripts/qa/_ambil-jadwal.mjs"],
        capture_output=True, text=True, cwd=os.getcwd(),
    )
    if out.returncode != 0:
        sys.exit("Gagal ambil data spreadsheet:\n" + out.stderr[:600])
    return json.loads(out.stdout)


def rapikan_kegiatan(k):
    k = (k or "").strip()
    return LABEL_KEGIATAN.get(k, k or "—")


def ukuran(s):
    return KODE_SHIFT.get(s, s or "—")


def map_shift(kode):
    """Kode shift di sheet -> keterangan yang jelas."""
    if not kode:
        return "—"
    return {
        "P": "Pagi",
        "S": "Siang",
        "M": "Malam",
        "L": "Libur",
        "C": "Cuti",
        "PM": "Pagi+Siang",
        "R": "Pengganti",
    }.get(kode, kode)


# ---------------------------------------------------------------- docx helpers
def set_cell_bg(cell, warna_hex):
    el = OxmlElement("w:shd")
    el.set(qn("w:val"), "clear")
    el.set(qn("w:fill"), warna_hex)
    cell._tc.get_or_add_tcPr().append(el)


def set_kolom_lebar(table, lebar_cm):
    table.autofit = False
    for row in table.rows:
        for i, w in enumerate(lebar_cm):
            if i < len(row.cells):
                row.cells[i].width = Cm(w)


def tulis_sel(cell, teks, tebal=False, ukuran_pt=9, rata=None, warna=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    if rata:
        p.alignment = rata
    run = p.add_run(str(teks))
    run.bold = tebal
    run.font.size = Pt(ukuran_pt)
    run.font.name = "Calibri"
    if warna:
        run.font.color.rgb = RGBColor.from_string(warna)
    return p


def judul(doc, teks, ukuran=14, spasi_sebelum=0, spasi_sesudah=6, rata=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(spasi_sebelum)
    p.paragraph_format.space_after = Pt(spasi_sesudah)
    if rata:
        p.alignment = rata
    r = p.add_run(teks)
    r.bold = True
    r.font.size = Pt(ukuran)
    r.font.name = "Calibri"
    return p


def isi(doc, teks, ukuran=10, tebal=False, spasi_sesudah=3):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(spasi_sesudah)
    r = p.add_run(teks)
    r.bold = tebal
    r.font.size = Pt(ukuran)
    r.font.name = "Calibri"
    return p


# ---------------------------------------------------------------- dokumen
def buat(data, mulai, keluaran):
    jadwal = data["jadwal"]
    peta_shift = data["petaShift"]

    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(1.6)
        s.bottom_margin = Cm(1.6)
        s.left_margin = Cm(1.8)
        s.right_margin = Cm(1.8)

    akhir = mulai + dt.timedelta(days=4)
    rentang = (f"{mulai.day} {BULAN_ID[mulai.month - 1]} – {akhir.day} {BULAN_ID[akhir.month - 1]} {akhir.year}")

    judul(doc, "RENCANA KERJA MINGGUAN", 15, rata=WD_ALIGN_PARAGRAPH.CENTER, spasi_sesudah=2)
    judul(doc, "Biro Communication — UPT CCM Halim", 12, rata=WD_ALIGN_PARAGRAPH.CENTER, spasi_sesudah=2)
    isi(doc, f"Periode: {rentang}", 11, tebal=True, spasi_sesudah=1)
    isi(doc, f"Sumber: Jadwal Kunjungan MR {BULAN_ID[mulai.month - 1]} {mulai.year} · Departemen Fixed Assets Maintenance",
        9, spasi_sesudah=10)

    # ---------- ringkasan per hari ----------
    # PENTING: hanya ambil 5 hari kerja minggu ini (mulai..mulai+4). Tanpa filter
    # ini, ringkasan ikut menghitung pekerjaan sebulan penuh.
    hariMingguIni = []
    for i in range(5):
        t = mulai + dt.timedelta(days=i)
        hariMingguIni.append(t.isoformat())   # kunci ISO, sama dengan keluaran skrip Node

    per_hari = {}
    for hari in hariMingguIni:
        if hari in jadwal and jadwal[hari]:
            per_hari[hari] = jadwal[hari]

    total = sum(len(v) for v in per_hari.values())
    hari_kerja = len(per_hari)

    semua_personil = list(peta_shift.keys())
    kode_per_hari = {tgl.isoformat(): [peta_shift[n].get(tgl.strftime("%d/%m"), "") for n in semua_personil]
                     for tgl in [mulai + dt.timedelta(days=i) for i in range(5)]}

    judul(doc, "RINGKASAN", 11, spasi_sebelum=2, spasi_sesudah=4)
    t = doc.add_table(rows=1, cols=4)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(["Hari Kerja", "Total Pekerjaan", "Lokasi Terjadwal", "Personil Terlibat"]):
        tulis_sel(t.rows[0].cells[i], h, tebal=True)
        set_cell_bg(t.rows[0].cells[i], "E8F1EE")

    lokasi_unik = {p["lokasi"] for v in per_hari.values() for p in v}
    personil = {p["pic"] for v in per_hari.values() for p in v if p["pic"]}
    baris = t.add_row()
    for i, v in enumerate([f"{hari_kerja} hari", f"{total} pekerjaan",
                           f"{len(lokasi_unik)} lokasi", f"{len(personil)} orang"]):
        tulis_sel(baris.cells[i], v, rata=WD_ALIGN_PARAGRAPH.CENTER)
    set_kolom_lebar(t, [4.3, 4.3, 4.3, 4.3])

    # ---------- rincian per hari ----------
    kolom = ["Jam", "Lokasi MR / Peralatan", "Jenis Pekerjaan", "PIC", "Shift", "Temuan Dibawa (dari kunjungan lalu)"]
    lebar = [1.7, 4.5, 3.1, 1.9, 1.5, 5.0]

    for i in range(5):
        tgl = mulai + dt.timedelta(days=i)
        kunci = tgl.isoformat()
        daftar = per_hari.get(kunci) or []
        if not daftar:
            continue

        judul(doc, f"{HARI_ID[tgl.weekday()].upper()}, {tgl.day} {BULAN_ID[tgl.month-1]} {tgl.year} — {len(daftar)} pekerjaan",
              11, spasi_sebelum=12, spasi_sesudah=4)

        tab = doc.add_table(rows=1, cols=len(kolom))
        tab.style = "Table Grid"
        for j, h in enumerate(kolom):
            tulis_sel(tab.rows[0].cells[j], h, tebal=True, ukuran_pt=8)
            set_cell_bg(tab.rows[0].cells[j], "E8F1EE")

        # urutkan: pagi dulu, lalu malam
        def kunci_urut(p):
            return (0 if p["jam"] == "9:00 AM" else 1, p["lokasi"])
        for p in sorted(daftar, key=kunci_urut):
            st = tgl.strftime("%d/%m")
            s_kode = peta_shift.get(p["pic"], {}).get(st, "") if p["pic"] else ""
            jam = "08:00–16:00" if p["jam"] == "9:00 AM" else "22:00–08:00"
            b = tab.add_row()
            tulis_sel(b.cells[0], jam, ukuran_pt=8)
            tulis_sel(b.cells[1], p["lokasi"], ukuran_pt=8)
            tulis_sel(b.cells[2], rapikan_kegiatan(p["kegiatan"]), ukuran_pt=8)
            tulis_sel(b.cells[3], p["pic"] or "BELUM DITENTUKAN", ukuran_pt=8,
                      tebal=not p["pic"], warna=None if p["pic"] else "B00020")
            shift_txt = ukuran(s_kode) if p["pic"] else "—"
            bentrok = p["pic"] and s_kode and (
                (p["jam"] == "9:00 AM" and s_kode != "P") or (p["jam"] == "10:00 PM" and s_kode != "M")
            )
            tulis_sel(b.cells[4], ("⚠ " + shift_txt) if bentrok else shift_txt, ukuran_pt=8)
            if bentrok:
                set_cell_bg(b.cells[4], "FDE7E9")
            tulis_sel(b.cells[5], (p["temuan"] or "—").replace("\n", " "), ukuran_pt=8)

        set_kolom_lebar(tab, lebar)

    # ---------- catatan ----------
    doc.add_page_break()
    judul(doc, "CATATAN PELAKSANAAN", 12, spasi_sesudah=5)

    catatan = [
        "Setiap pekerjaan WAJIB diisi checksheet-nya lewat aplikasi C-Fill pada hari yang sama, "
        "dan didampingi foto Dokumentasi Kegiatan.",
        "Isi juga Entry and Exit Registration (masuk & keluar jalur) setiap kali memasuki area site.",
        "Pengisian checksheet per kategori hanya bisa 1 kali per bulan per site. Kalau slot bulan itu "
        "sudah terisi, aplikasi akan menanyakan: \"Perbaikan\" (menimpa isian lama) atau "
        "\"Perawatan Baru\" (isian lama tetap tersimpan sebagai riwayat di sel yang sama).",
        "Kolom \"Temuan Dibawa\" berisi catatan dari kunjungan sebelumnya — pastikan item tersebut "
        "dicek dan diperbarui statusnya di kunjungan ini.",
        "Jadwal shift mengikuti tab \"Shift BIPO\": Pagi 08:00–16:00, Siang 16:00–22:00, "
        "Malam 22:00–08:00.",
    ]
    # temuan yang perlu ditindaklanjuti khusus - hanya dari minggu ini
    temuan_khusus = []
    for kunci, daftar in per_hari.items():
        for p in daftar:
            if p["temuan"]:
                temuan_khusus.append((kunci, p["lokasi"], p["pic"], p["temuan"]))

    for i, c in enumerate(catatan, 1):
        p = doc.add_paragraph(style="List Number")
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(c)
        r.font.size = Pt(9.5)
        r.font.name = "Calibri"

    if temuan_khusus:
        judul(doc, "TEMUAN YANG HARUS DITINDAKLANJUTI", 11, spasi_sebelum=10, spasi_sesudah=4)
        tt = doc.add_table(rows=1, cols=3)
        tt.style = "Table Grid"
        for j, h in enumerate(["Hari", "Lokasi", "Temuan / Tindak Lanjut"]):
            tulis_sel(tt.rows[0].cells[j], h, tebal=True, ukuran_pt=9)
            set_cell_bg(tt.rows[0].cells[j], "E8F1EE")
        for kunci, lok, pic, tem in temuan_khusus:
            b = tt.add_row()
            d = dt.date.fromisoformat(kunci)
            tulis_sel(b.cells[0], f"{HARI_ID[d.weekday()][:3]}, {d.day} {BULAN_SINGKAT[d.month-1]}", ukuran_pt=8.5)
            tulis_sel(b.cells[1], lok, ukuran_pt=8.5)
            tulis_sel(b.cells[2], tem.replace("\n", " "), ukuran_pt=8.5)
        set_kolom_lebar(tt, [2.2, 4.6, 10.9])

    # ---------- susunan shift lengkap (SEMUA personil, bukan cuma yang dapat tugas MR) ----------
    # beban = jumlah penugasan MR per orang (dipakai di tabel di bawah)
    beban = {}
    for daftar in per_hari.values():
        for p in daftar:
            k = p["pic"] or "BELUM DITENTUKAN"
            beban[k] = beban.get(k, 0) + 1
    beban_semua = dict(beban)

    doc.add_page_break()
    judul(doc, "SUSUNAN SHIFT — SEMUA PERSONIL", 12, spasi_sesudah=3)
    isi(doc, "Sumber: tab \"Shift BIPO\". Pagi 08:00-16:00 · Siang 16:00-22:00 · "
             "Malam 22:00-08:00 · Libur. Tanda \"C\" = Cuti, \"PM\" = Pagi+Siang, \"R\" = pengganti.",
        8.5, spasi_sesudah=6)

    kolom_wajib = ["Pagi", "Siang", "Malam", "Libur"]
    st = doc.add_table(rows=1, cols=8)
    st.style = "Table Grid"
    for j, h in enumerate(["Nama", "Sen 05", "Sel 06", "Rab 07", "Kam 08", "Jum 09", "Total Tugas MR", "Libur/Cuti"]):
        tulis_sel(st.rows[0].cells[j], h, tebal=True, ukuran_pt=8.5)
        set_cell_bg(st.rows[0].cells[j], "E8F1EE")

    # urutkan: personil shift Pagi dulu (yang diminta), lalu Siang/Malam, lalu non-shift
    def urut_personil(item):
        nama, v = item
        kode5 = [v.get(tgl.strftime("%d/%m"), "") for tgl in [mulai + dt.timedelta(days=i) for i in range(5)]]
        prioritas = 0 if "P" in kode5 else (1 if "S" in kode5 else (2 if "M" in kode5 else 3))
        return (prioritas, nama)

    for nama, v in sorted(peta_shift.items(), key=urut_personil):
        b = st.add_row()
        sudah = beban.get(nama, 0)
        tulis_sel(b.cells[0], nama, ukuran_pt=8.5, tebal=True)
        for i in range(5):
            tgl = mulai + dt.timedelta(days=i)
            kode = v.get(tgl.strftime("%d/%m"), "")
            tulis_sel(b.cells[1 + i], map_shift(kode), ukuran_pt=8.5, rata=WD_ALIGN_PARAGRAPH.CENTER)
        tulis_sel(b.cells[6], f"{sudah} pekerjaan" if sudah else "—", ukuran_pt=8.5,
                  rata=WD_ALIGN_PARAGRAPH.CENTER)
        # hitung libur/cuti minggu ini
        hari_ini = [v.get((mulai + dt.timedelta(days=i)).strftime("%d/%m"), "") for i in range(5)]
        tulis_sel(b.cells[7], f"{hari_ini.count('L')} libur" + (f", {hari_ini.count('C')} cuti" if "C" in hari_ini else ""),
                  ukuran_pt=8.5, rata=WD_ALIGN_PARAGRAPH.CENTER)
    set_kolom_lebar(st, [2.6, 1.9, 1.9, 1.9, 1.9, 1.9, 2.8, 2.5])

    # keterangan kesesuaian jadwal MR vs shift
    judul(doc, "PEMERIKSAAN JADWAL MR ↔ SHIFT", 11, spasi_sebelum=12, spasi_sesudah=4)
    ceks = []
    for i in range(5):
        tgl = mulai + dt.timedelta(days=i)
        for p in per_hari.get(tgl.isoformat(), []):
            if not p["pic"]:
                ceks.append((tgl, p["lokasi"], "PIC belum ditentukan", "peringatan"))
                continue
            kode = peta_shift.get(p["pic"], {}).get(tgl.strftime("%d/%m"), "")
            perlu = "P" if p["jam"] == "9:00 AM" else "M"
            if kode != perlu:
                ceks.append((tgl, f"{p['lokasi']} ({p['pic']})",
                             f"jadwal MR jam {perlu}, tapi shift hari itu {map_shift(kode)}", "bentrok"))
    if ceks:
        ct = doc.add_table(rows=1, cols=3)
        ct.style = "Table Grid"
        for j, h in enumerate(["Tanggal", "Lokasi (PIC)", "Catatan"]):
            tulis_sel(ct.rows[0].cells[j], h, tebal=True, ukuran_pt=8.5)
            set_cell_bg(ct.rows[0].cells[j], "FDE7E9")
        for tgl, lok, cat, jenis in ceks:
            b = ct.add_row()
            tulis_sel(b.cells[0], f"{HARI_ID[tgl.weekday()]}, {tgl.day} {BULAN_SINGKAT[tgl.month-1]}", ukuran_pt=8.5)
            tulis_sel(b.cells[1], lok, ukuran_pt=8.5)
            tulis_sel(b.cells[2], cat, ukuran_pt=8.5, warna="B00020" if jenis == "bentrok" else "8A6D00")
        set_kolom_lebar(ct, [2.6, 6.4, 8.7])
    else:
        isi(doc, "Semua penugasan cocok dengan shift masing-masing.", 9)

    # ---------- tanda tangan ----------
    doc.save(keluaran)
    print(f"tersimpan: {keluaran}")
    print(f"periode  : {rentang}")
    print(f"pekerjaan: {total} di {len(lokasi_unik)} lokasi, {len(personil)} personil")
    for k, v in sorted(beban_semua.items(), key=lambda x: (-x[1], x[0])):
        print(f"   {k}: {v}")
    if temuan_khusus:
        print(f"temuan   : {len(temuan_khusus)} item perlu ditindaklanjuti")
    return total, len(temuan_khusus)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mulai", default="2026-10-05", help="tanggal Senin (YYYY-MM-DD)")
    ap.add_argument("--keluar", default=None, help="path .docx keluaran")
    a = ap.parse_args()

    mulai = dt.date.fromisoformat(a.mulai)
    if mulai.weekday() != 0:
        sys.exit(f"{mulai} bukan hari Senin (weekday={mulai.weekday()})")

    keluar = a.keluar or os.path.expanduser(
        f"~/Rencana_Kerja_Mingguan_{mulai.day}_{BULAN_ID[mulai.month-1]}_{mulai.year}.docx")
    data = ambil_data()
    buat(data, mulai, keluar)


if __name__ == "__main__":
    main()
