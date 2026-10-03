"""Bikin fixture JSON dari spreadsheet ASLI untuk test/jadwalProgress.test.mjs.
Range harus sama dengan yang dibaca app: readRawRange(id, tab, 'B3:O120').
Dijalankan manual (butuh akses service account), bukan bagian dari test suite.
"""
import json, os, gspread
from google.oauth2.service_account import Credentials

SA = '/home/dandysetiawan/.openclaw/workspace/service_account.json'
OUT = '/home/dandysetiawan/c-fill/test/fixtures'
os.makedirs(OUT, exist_ok=True)

SHEETS = {
    'september-2026': "1ReNGtsXGIz_bbA6StMl78mXVZzOqPFjTt-w5gjs4ABE",
    'oktober-2026':   "1H62ttfzOcVTuGMdbTdVvprWHNp7ymp4QkldjVKGQkV4",
}

creds = Credentials.from_service_account_file(
    SA, scopes=['https://www.googleapis.com/auth/spreadsheets'])
gc = gspread.authorize(creds)

for name, sid in SHEETS.items():
    rows = gc.open_by_key(sid).worksheet('Jadwal Kunjungan MR').get('B3:O120')
    path = os.path.join(OUT, f'{name}.B3-O120.json')
    with open(path, 'w') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    print(f'{name}: {len(rows)} baris -> {path}')
