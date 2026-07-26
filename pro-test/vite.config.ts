import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { PRO_BUILD_OUTPUT } from './build-output.mjs';
import { healthRadarProPlugin } from './vite-healthradar.mjs';
import { applyHealthRadarClientEnvAliases } from '../scripts/healthradar-client-env.mts';

const STATIC_SCRIPT_NONCE = 'wm-static-bootstrap';

function isWelcomeHtml(hostId: string) {
  return hostId === 'welcome.html' || hostId.endsWith('/welcome.html');
}

function isWelcomeHydrationPreload(dep: string) {
  const basename = dep.split('/').pop() ?? dep;
  return basename.startsWith('index-') && basename.endsWith('.js');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  Object.assign(process.env, env);
  applyHealthRadarClientEnvAliases(env, process.env);

  return {
  plugins: [react(), tailwindcss(), healthRadarProPlugin()],
  base: '/pro/',
  html: {
    cspNonce: STATIC_SCRIPT_NONCE,
  },
  build: {
    modulePreload: {
      resolveDependencies: (filename, deps, context) => {
        if (context.hostType !== 'html') return deps;

        const hostId = 'hostId' in context && typeof context.hostId === 'string'
          ? context.hostId
          : filename;
        if (!isWelcomeHtml(hostId)) return deps;

        return deps.filter(dep => !isWelcomeHydrationPreload(dep));
      },
    },
    outDir: PRO_BUILD_OUTPUT,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        welcome: path.resolve(__dirname, 'welcome.html'),
      },
      output: {
        // Split the Sentry SDK into its own stable chunk. It's a critical-path
        // dependency (initSentry() runs before render to catch early errors, so
        // it isn't deferrable), but pulling it out of the catch-all vendor chunk
        // keeps it cacheable across the frequent app-code redeploys that would
        // otherwise re-bust its bytes.
        manualChunks: (id) => {
          if (id.includes('/node_modules/@sentry/')) return 'sentry';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  };
});
