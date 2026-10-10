import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

test('offline cache supports project paths and preserves other app caches', async () => {
  const script = fileURLToPath(new URL('../scripts/build-offline.mjs', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'songbook-offline-'));
  try {
    await mkdir(join(directory, 'dist/assets'), { recursive: true });
    for (const path of ['index.html', 'manifest.webmanifest', 'icon.svg', 'assets/app.js']) {
      await writeFile(join(directory, 'dist', path), 'fixture');
    }
    const cacheNames: string[] = [];
    for (const base of ['/', '/songbook/']) {
      execFileSync(process.execPath, [script], { cwd: directory, env: { ...process.env, VITE_BASE_PATH: base } });
      const handlers: Record<string, (event: any) => void> = {};
      let files: string[] = [], cacheName = '';
      const deleted: string[] = [];
      const fallback = { html: true };
      const cache = {
        addAll: async (paths: string[]) => { files = paths; },
        match: async (path: string) => path === base + 'index.html' ? fallback : undefined
      };
      runInNewContext(await readFile(join(directory, 'dist/sw.js'), 'utf8'), {
        URL,
        self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {} },
          addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; } },
        caches: { open: async (name: string) => { cacheName = name; return cache; },
          keys: async () => [cacheName, cacheName.slice(0, -12) + 'old', 'other-app-cache', ...cacheNames],
          delete: async (name: string) => { deleted.push(name); } },
        fetch: async () => { throw new Error('offline'); }
      });
      let pending: Promise<unknown> | undefined;
      handlers.install({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
      await pending;
      assert.deepEqual([...files], ['index.html', 'manifest.webmanifest', 'icon.svg', 'assets/app.js'].map(path => base + path));
      handlers.activate({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
      await pending;
      assert.equal(deleted.length, 1);
      assert.ok(!deleted.includes('other-app-cache'));
      for (const name of cacheNames) assert.ok(!deleted.includes(name));
      cacheNames.push(cacheName);
      handlers.fetch({ request: { method: 'GET', url: 'https://example.test' + base, mode: 'navigate' },
        respondWith: (promise: Promise<unknown>) => { pending = promise; } });
      assert.equal(await pending, fallback);
      let intercepted = false;
      handlers.fetch({ request: { method: 'GET', url: 'https://other.test' + base, mode: 'navigate' },
        respondWith: () => { intercepted = true; } });
      assert.equal(intercepted, false);
    }
    assert.notEqual(cacheNames[0], cacheNames[1]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
