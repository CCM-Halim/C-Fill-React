#!/usr/bin/env bash
# QA 20 - uji tombol "Ulangi" di halaman Dokumentasi.
#
# PENTING: pengujian ini benar-benar MENGUNGGAH file ke Drive. Supaya tidak
# mengotori folder produksi, build-nya diarahkan dulu ke folder sementara
# "_QA-C-Fill-Sementara". Setelah selesai, .env.local asli dikembalikan dan
# build diulang.
#
#   bash scripts/qa/run-20.sh
set -u
cd "$(dirname "$0")/../.." || exit 1

ENV_ASLI=".env.local"
ENV_CADANG="/tmp/qa20-env-asli.bak"
QA_FOLDER_FILE="/tmp/qa-folder-id.txt"

# Simpan konfigurasi asli
if [ -f "$ENV_ASLI" ]; then cp "$ENV_ASLI" "$ENV_CADANG"; else rm -f "$ENV_CADANG"; fi

bersihkan() {
  echo ""
  echo "Mengembalikan konfigurasi asli…"
  if [ -f "$ENV_CADANG" ]; then
    cp "$ENV_CADANG" "$ENV_ASLI"
  else
    rm -f "$ENV_ASLI"
  fi
  npm run build >/dev/null 2>&1 && echo "Build dikembalikan ke konfigurasi asli."
  # Hapus isi folder QA supaya Drive tidak menumpuk sampah uji
  if [ -f "$QA_FOLDER_FILE" ]; then
    node scripts/qa/_bersih-folder-qa.mjs "$(cat "$QA_FOLDER_FILE")" || true
  fi
}
trap bersihkan EXIT

# Siapkan folder QA + token
node scripts/qa/_token.mjs >/dev/null 2>&1 || { echo "GAGAL ambil token"; exit 1; }
node scripts/qa/_buat-folder-qa.mjs

if [ ! -f "$QA_FOLDER_FILE" ]; then
  echo "GAGAL menyiapkan folder QA"; exit 1
fi
QA_FOLDER_ID="$(cat "$QA_FOLDER_FILE")"

# Build dengan folder QA sebagai tujuan unggahan
{
  echo "# Dibuat OTOMATIS oleh scripts/qa/run-20.sh untuk pengujian."
  grep -E '^VITE_GOOGLE_CLIENT_ID=' "$ENV_ASLI" 2>/dev/null || \
    echo "VITE_GOOGLE_CLIENT_ID=770830762921-chb0229b9bgqd9t2eas2jt3edn87n1m0.apps.googleusercontent.com"
  echo "VITE_ROOT_DOKUMENTASI_FOLDER_ID=$QA_FOLDER_ID"
} > "$ENV_ASLI"

echo "Membangun aplikasi dengan folder QA ($QA_FOLDER_ID)…"
npm run build >/dev/null 2>&1 || { echo "GAGAL build"; exit 1; }

# Jalankan preview + uji
pkill -f "vite preview" 2>/dev/null
sleep 1
npx vite preview --port 4173 --strictPort >/tmp/qa20/preview.log 2>&1 &
PREVIEW_PID=$!
sleep 6

node scripts/qa/20-uji-ulangi-upload.mjs
HASIL=$?

kill "$PREVIEW_PID" 2>/dev/null
exit "$HASIL"
