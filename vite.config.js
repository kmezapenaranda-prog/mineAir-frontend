import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](jspdf|jspdf-autotable|html2canvas)[\\/]/.test(id)) return 'pdf-export'
        },
      },
    },
  },
  server: {
    allowedHosts: true, // Permite conexiones entrantes desde ngrok
    proxy: {
      // El desarrollo local usa el servicio backend en el mismo equipo.
      // Para Railway, VITE_EDGE_API_URL apunta directamente al servicio API.
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-512-maskable.png',
        'icons/icon-180.png',
        'notification-sw.js',
      ],
      manifest: {
        name: 'MineAIr — Monitoreo atmosférico predictivo',
        short_name: 'MineAIr',
        description:
          'Monitoreo atmosférico con IA predictiva para minería subterránea de carbón.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#08191d',
        theme_color: '#08191d',
        lang: 'es',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['notification-sw.js'],
        // Estáticos de la app: cache-first vía precache automático de Workbox.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/pdf-export-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/pdf-export-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-export-v1',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Telemetría/predicciones del nodo de borde: siempre intentar red primero,
            // porque el dato en vivo nunca debe quedar oculto por un snapshot viejo.
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'edge-api-v2',
              networkTimeoutSeconds: 4,
              // Una lectura operacional con más de un minuto nunca debe
              // reaparecer como si fuera telemetría vigente.
              expiration: { maxEntries: 200, maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // false a propósito: un service worker en dev cachea el bundle (cache-first
        // para js/css/html) y puede quedar sirviendo una versión vieja de la app
        // en el celular aunque el código ya haya cambiado — confunde por completo
        // las pruebas mientras se itera. El SW real solo se activa en `npm run build`.
        enabled: false,
      },
    }),
  ],
})
