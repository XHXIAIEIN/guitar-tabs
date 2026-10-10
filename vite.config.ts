import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
// The core entry keeps the application's Worker message protocol in control.
const alphaCore = join(dirname(require.resolve('@coderline/alphatab')), 'alphaTab.core.mjs');
export default defineConfig({
  resolve: { alias: [{ find: /^@coderline\/alphatab$/, replacement: alphaCore }] },
  worker: { format: 'es' }
});
