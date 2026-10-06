#!/usr/bin/env bash
# Jalankan SELURUH pemeriksaan QA C-Fill berurutan.
# Uji yang menyentuh Drive butuh /tmp/cfill_access_token.txt (dibuat di bawah).
#
#   bash scripts/qa/run-all.sh
#
# Catatan kuota: Google Sheets membatasi 60 permintaan baca per menit per pengguna.
# Skrip di bawah sengaja dijalankan BERURUTAN (bukan paralel) supaya tidak kena 429.
set -u
cd "$(dirname "$0")/../.." || exit 1

GAGAL=0
jalankan() {
  local label="$1"; shift
  echo ""
  echo "══════════════════════════════════════════════════════════════════"
  echo "  $label"
  echo "══════════════════════════════════════════════════════════════════"
  if "$@"; then
    echo "  → LULUS"
  else
    echo "  → ADA TEMUAN (kode keluar $?)"
    GAGAL=$((GAGAL + 1))
  fi
}

echo "Menyegarkan access token Google…"
node scripts/qa/_token.mjs || { echo "GAGAL ambil token — hentikan."; exit 1; }

jalankan "1. Pemeriksaan statis (config, slot, akses)" \
  npx vite-node scripts/qa/01-statistik.mjs

jalankan "2. Uji suite unit (npm test)" \
  npm test --silent

jalankan "3. Baca data nyata: file site, tab, jadwal, gangguan" \
  npx vite-node scripts/qa/02-live-read.mjs

jalankan "4. Pemisahan penyebab tab gagal" \
  npx vite-node scripts/qa/04-penyebab.mjs

jalankan "5. Pengecekan file site (tanpa menelan error)" \
  npx vite-node scripts/qa/06-cek-file.mjs

jalankan "6. Nama instrumen (masalah karakter /)" \
  npx vite-node scripts/qa/09-instrumen-nama.mjs

jalankan "7. Log gangguan mendetail + filter" \
  npx vite-node scripts/qa/12-gangguan.mjs

jalankan "8. Jadwal kunjungan semua bulan" \
  npx vite-node scripts/qa/13-jadwal.mjs

jalankan "9. Nama tab setelah perbaikan (semua site x kategori)" \
  node scripts/qa/14-tab-pasca-fix.mjs

jalankan "10. Instrumen setelah perbaikan (nama file memuat /)" \
  node scripts/qa/15-instrumen-pasca-fix.mjs

jalankan "11. Kasus khusus K27+985 HFSPS (alias 6M,1Y)" \
  npx vite-node -c scripts/qa/vite.qa.config.mjs scripts/qa/17-k27-hfsps.mjs

jalankan "12. UI produksi (Chrome headless)" \
  node scripts/qa/10-ui.mjs

jalankan "13. Tombol Ulangi unggah Dokumentasi (klik nyata)" \
  bash scripts/qa/run-20.sh

# QA 21 menguji APLIKASI HASIL BUILD, jadi butuh server lokal.
echo ""
echo "Menyalakan server pratinjau untuk QA 21…"
pkill -f "vite preview" 2>/dev/null
sleep 1
npx vite preview --port 4173 --strictPort >/tmp/qa21-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 6

jalan "14. Penanda periode & warna item perawatan (klik nyata)" \
  node scripts/qa/21-periode-warna.mjs

jalan "15. Login sekali & draf checksheet bisa dilanjutkan (klik nyata)" \
  node scripts/qa/22-login-sekali-draf.mjs

kill "$PREVIEW_PID" 2>/dev/null

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  UJI TULIS DI SANDBOX (salinan Drive, dihapus lagi)"
echo "══════════════════════════════════════════════════════════════════"
if npx vite-node -c scripts/qa/vite.qa.config.mjs scripts/qa/11-sandbox-tulis.mjs; then
  echo "  → LULUS"
else
  echo "  → ADA TEMUAN"; GAGAL=$((GAGAL + 1))
fi

echo ""
echo "══════════════════════════════════════════════════════════════════"
if [ "$GAGAL" -eq 0 ]; then
  echo "  SEMUA PEMERIKSAAN LULUS"
else
  echo "  $GAGAL pemeriksaan melaporkan temuan — lihat docs/qa-2026-10.md"
fi
echo "══════════════════════════════════════════════════════════════════"
exit "$GAGAL"
