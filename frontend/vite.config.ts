import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'icons/*.svg', 'sw-push.js'],
      manifest: {
        name: 'WorkSchedule - Management Program Lucru',
        short_name: 'WorkSchedule',
        description: 'Aplicatie completa pentru managementul programelor de lucru, pontaj si notificari',
        theme_color: '#2563eb',
        id: '/',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ro',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
        // Import custom push notification handlers
        importScripts: ['/sw-push.js'],
      },
    }),
  ],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Disable sourcemaps in production for smaller bundles
    sourcemap: false,
    // Enable CSS code splitting for smaller initial load
    cssCodeSplit: true,
    // Increase chunk size warning limit (vendor chunks are expected to be large)
    chunkSizeWarningLimit: 800,
    // Minification settings
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Functie (nu obiect): grupeaza DOAR pachetele din node_modules. Varianta cu obiect
        // muta si helper-ele comune (vite/preload-helper, @babel/runtime) in vendor-pdf,
        // iar atunci fiecare pagina - si pornirea aplicatiei - descarca ~400KB de PDF.
        manualChunks(id: string) {
          // Helper-ele comune (folosite de toate paginile) merg in chunk-ul de baza,
          // altfel Rollup le lipeste de un vendor greu si il incarca la pornire.
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers') || id.includes('@babel/runtime')) {
            return 'vendor-react';
          }
          if (!id.includes('node_modules')) return undefined;
          const pkg = id.split('node_modules/').pop()!;
          if (/^(react|react-dom|react-router|react-router-dom|scheduler)\//.test(pkg)) return 'vendor-react';
          if (/^@mui\/(material|system|utils|base|styled-engine|private-theming|core-downloads-tracker)\//.test(pkg) || /^@emotion\//.test(pkg)) return 'vendor-mui';
          if (/^@mui\/icons-material\//.test(pkg)) return 'vendor-mui-icons';
          if (/^(@reduxjs\/toolkit|react-redux|redux|immer|reselect)\//.test(pkg)) return 'vendor-redux';
          if (/^@supabase\//.test(pkg)) return 'vendor-supabase';
          if (/^(chart\.js|react-chartjs-2)\//.test(pkg)) return 'vendor-charts';
          if (/^(leaflet|react-leaflet|@react-leaflet)\//.test(pkg)) return 'vendor-maps';
          if (/^(jspdf|jspdf-autotable)\//.test(pkg)) return 'vendor-pdf';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward authorization header
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        },
      },
    },
  },
})
