// Copies the alphaTab bundle that the score importer loads from node_modules into assets/vendor/alphatab/.
// The version is the one pinned in package.json, so the tests and the site use the same alphaTab.
// Usage: npm ci && node scripts/vendor-alphatab.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const from = new URL('../node_modules/@coderline/alphatab/', import.meta.url);
const to = new URL('../assets/vendor/alphatab/', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('package.json', from), 'utf8'));

mkdirSync(to, { recursive: true });
// The core bundle has no imports; the outer alphaTab.min.mjs also starts workers, which the importer does not need.
copyFileSync(new URL('dist/alphaTab.core.min.mjs', from), new URL('alphatab.min.js', to));
copyFileSync(new URL('LICENSE', from), new URL('LICENSE', to));
writeFileSync(new URL('VERSION', to), version + '\n');
console.log(`alphaTab ${version} → assets/vendor/alphatab/`);
