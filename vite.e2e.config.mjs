import config from './vite.config.js';

export default {
  ...config,
  cacheDir: 'node_modules/.vite-e2e',
};
