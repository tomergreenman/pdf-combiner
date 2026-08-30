import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Minimal typing for the one Node global we read here (no @types/node needed).
declare const process: { env: Record<string, string | undefined> };

// `base` defaults to '/' for local dev / preview and any root-domain host.
// The GitHub Pages workflow sets DEPLOY_BASE=/pdf-combiner/ so assets resolve
// under the project-site subpath. Always keep a trailing slash.
const base = process.env.DEPLOY_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'PDF / Image Merger',
        short_name: 'PDF Merger',
        description: 'Merge images and PDFs into one PDF, with reorder and per-page rotation.',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        orientation: 'any',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2,wasm}'],
        // pdf.js worker + libs can be large; raise the precache size ceiling.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
});
