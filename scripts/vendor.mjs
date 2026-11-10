// Copies the third-party files the page loads from node_modules into assets/vendor/: the alphaTab bundle that the
// score importer loads, and the monospace font that lines up text tabs and song text.
// The versions are the ones pinned in package.json, so the tests and the site use the same files.
// Usage: npm ci && node scripts/vendor.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const modules = new URL('../node_modules/', import.meta.url);
const vendor = new URL('../assets/vendor/', import.meta.url);

function copy(pkg, dir, files) {
  const from = new URL(pkg + '/', modules);
  const to = new URL(dir + '/', vendor);
  const { version } = JSON.parse(readFileSync(new URL('package.json', from), 'utf8'));
  mkdirSync(to, { recursive: true });
  for (const [src, dest] of files) copyFileSync(new URL(src, from), new URL(dest, to));
  copyFileSync(new URL('LICENSE', from), new URL('LICENSE', to));
  writeFileSync(new URL('VERSION', to), version + '\n');
  console.log(`${pkg} ${version} → assets/vendor/${dir}/`);
}

// The core bundle has no imports; the outer alphaTab.min.mjs also starts workers, which the importer does not need.
copy('@coderline/alphatab', 'alphatab', [['dist/alphaTab.core.min.mjs', 'alphatab.min.js']]);
// Latin only: tabs and code are ASCII, and Chinese text falls back to the system fonts.
copy('@fontsource/jetbrains-mono', 'jetbrains-mono', [['files/jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-400.woff2']]);
