"""Ambil cuplikan baris asli dari 'Log Book Gangguan Dept Telco Halim' untuk
dijadikan fixture test (test/fixtures/gangguan.json).

Dijalankan manual: python3 scripts/make-gangguan-fixtures.py
Butuh token akses di /tmp/cfill_access_token.txt (refresh via token OAuth Jo).
"""
import json, urllib.request, urllib.parse, pathlib

ACCESS = open('/tmp/cfill_access_token.txt').read().strip()
SID = '1UJZwW1CXeR0DUpoGWqWK4X3L6q7DfXWQbJ13kV6VHgw'  # Log Book Gangguan Dept Telco Halim
OUT = pathlib.Path(__file__).resolve().parent.parent / 'test' / 'fixtures' / 'gangguan.json'


def api(path):
    req = urllib.request.Request('https://sheets.googleapis.com/v4/spreadsheets/' + SID + path,
                                 headers={'Authorization': 'Bearer ' + ACCESS})
    return json.load(urllib.request.urlopen(req, timeout=40))


meta = api('?fields=sheets.properties')
tabs = [s['properties']['title'] for s in meta['sheets']]

fixture = {'spreadsheetId': SID, 'tabs': {}}
for tab in tabs:
    res = api('/values/' + urllib.parse.quote(f"'{tab}'!A2:R500", safe='') + '?valueRenderOption=FORMATTED_VALUE')
    fixture['tabs'][tab] = res.get('values', [])

OUT.write_text(json.dumps(fixture, ensure_ascii=False, indent=1), encoding='utf-8')
print("ditulis:", OUT)
for tab, rows in fixture['tabs'].items():
    print(f"  {tab}: {len(rows)} baris")
