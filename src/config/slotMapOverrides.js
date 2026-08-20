// Override slotMap untuk file-file spesifik yang polanya BENERAN beda dari
// mayoritas site lain di kategori yang sama.
//
// Setelah cross-check menyeluruh ke semua 69 file site (2x, dengan perbaikan
// deteksi tanggal bertahap), ternyata SEMUA "anomali" yang sempat ditemukan
// bukan perbedaan struktur template asli - melainkan variasi cara pengisian
// data manual oleh technician (kadang skip baris, format tanggal beda-beda)
// yang mengecoh script deteksi otomatis. Template asli TERBUKTI konsisten di
// semua 69 file, jadi objek ini sengaja dikosongkan (tidak ada override yang
// valid saat ini) - cukup pakai slotMap default per kategori di categories.js.
//
// Struktur ini tetap dipertahankan (bukan dihapus total) untuk jaga-jaga kalau
// suatu saat memang ditemukan site dengan template beneran berbeda.
export const SLOT_MAP_OVERRIDES = {};
