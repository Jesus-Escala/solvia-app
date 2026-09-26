import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { preloadFonts } from './vite/preloadFonts';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In development the API is proxied so the app can use same-origin relative URLs,
  // exactly like the production nginx setup.
  const apiTarget = env.VITE_PROXY_TARGET ?? 'http://localhost:4000';

  return {
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    plugins: [
      react(),
      preloadFonts(),
      tailwindcss(),
      // Installable app (manifest + service worker), also enabled in development so the
      // browser's native "Install" prompt can be tested locally.
      VitePWA({
        registerType: 'prompt',
        devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          id: '/',
          name: 'Solvia',
          short_name: 'Solvia',
          description: 'Ventas, cobranza e inventario para pequeños negocios',
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#0f766e',
          background_color: '#0b0f14',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Country flags (phone field) load on demand; don't precache ~260 SVGs. The PDF and
          // Excel readers of the file viewer (~1 MB) also load only when a file is opened.
          globIgnores: ['**/assets/*.svg', '**/assets/pdf-*.js', '**/assets/xlsx-*.js'],
          // API calls and uploaded files always go to the network.
          navigateFallbackDenylist: [/^\/api\//, /^\/files\//],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // Keep large vendor libraries in their own long-term cacheable chunks.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/files': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
