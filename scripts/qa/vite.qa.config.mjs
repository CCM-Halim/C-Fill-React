/**
 * Konfigurasi Vite khusus pengujian: mengalihkan import './googleAuth' (dan
 * 'driveApi' -> googleAuth) ke stub Node, supaya kode asli di src/lib/ bisa
 * dijalankan lewat vite-node tanpa mengubah satu baris pun di src/.
 *
 * Dipakai: npx vite-node -c scripts/qa/vite.qa.config.mjs <skrip>
 */
import { defineConfig } from 'vite';

const STUB = new URL('./_stub-googleAuth.mjs', import.meta.url).pathname;

export default defineConfig({
  plugins: [
    {
      name: 'stub-googleAuth-untuk-uji',
      enforce: 'pre',
      resolveId(source, importer) {
        // Hanya alihkan import googleAuth yang datang DARI dalam src/lib/.
        if (!importer || !importer.includes('/src/lib/')) return null;
        if (/(^|\/)googleAuth(\.js)?$/.test(source)) return STUB;
        return null;
      },
    },
  ],
});
