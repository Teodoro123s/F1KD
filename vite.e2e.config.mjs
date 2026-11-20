import config from './vite.config.js';

export default {
  ...config,
  cacheDir: process.env.VITE_E2E_CACHE_DIR || 'node_modules/.vite-e2e',
};
