import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'C-Fill — Communication Fillment',
        short_name: 'C-Fill',
        description: 'Aplikasi pengisian checksheet peralatan komunikasi & instrumen KCIC',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F4EE',
        theme_color: '#256D5C',
        // 'any' (bukan 'portrait') - biar aplikasi bisa dipakai di orientasi
        // apapun, penting buat tablet/HP yang sering dipegang landscape.
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Cache shell aplikasi (HTML/CSS/JS) supaya buka lebih cepat & tetap bisa
        // buka app-nya walau sinyal lemah. Data (Sheets/Drive) TETAP butuh internet
        // - ini cuma percepat load tampilan, bukan bikin app kerja offline penuh.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  server: {
    port: 5173
  }
});
