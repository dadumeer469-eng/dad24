import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import {prerenderPlugin} from './scripts/prerender-plugin.mjs';

export default defineConfig(() => {
  // Self-healing: if .env is missing, recreate it from process.env
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Detected missing .env file. Recreating from system process environment...');
    let envContent = '';
    const keys = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_DATABASE_ID',
      'VITE_GOOGLE_MAPS_API_KEY'
    ];
    for (const key of keys) {
      if (process.env[key]) {
        envContent += `${key}=${process.env[key]}\n`;
      }
    }
    if (!process.env.VITE_GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY) {
      envContent += `VITE_GOOGLE_MAPS_API_KEY=${process.env.GOOGLE_MAPS_API_KEY}\n`;
    }
    if (envContent) {
      fs.writeFileSync(envPath, envContent, 'utf-8');
      console.log('Successfully self-healed .env configuration!');
    } else {
      console.warn('Warning: Could not find system Firebase environment variables to write to .env');
    }
  }

  const mapsApiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  return {
    plugins: [react(), tailwindcss(), prerenderPlugin()],
    define: mapsApiKey
      ? {
          'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsApiKey),
        }
      : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split heavy vendor libs out of the first-paint chunk (perf audit
      // 2026-11-27: main bundle was 2.17 MB raw / ~585 KB gzip, single
      // chunk; Vite warned about chunks over 500 kB). Each vendor chunk is
      // cached independently and only downloaded when actually imported.
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('leaflet')) return 'leaflet';
              if (id.includes('framer-motion') || id.includes('/motion/'))
                return 'motion';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
