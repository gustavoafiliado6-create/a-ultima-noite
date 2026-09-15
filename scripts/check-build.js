import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Check the actual generated artifact, not just the Vite configuration.
const root = resolve('dist');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.ok(!html.includes('/src/'), 'Production HTML still references source files');
const base = new URL('https://gustavoafiliado6-create.github.io/a-ultima-noite/');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
assert.ok(assets.some(asset => asset.endsWith('.js')), 'Missing JavaScript entry');
assert.ok(assets.some(asset => asset.endsWith('.css')), 'Missing CSS');
for (const asset of assets) {
  assert.ok(asset.startsWith('./'), `Asset must use a relative path: ${asset}`);
  const url = new URL(asset, base);
  assert.ok(url.pathname.startsWith(base.pathname), `Asset escapes Pages subdirectory: ${url}`);
  const file = resolve(root, asset);
  assert.ok(existsSync(file), `Missing artifact file: ${file}`);
}
for (const file of readdirSync(resolve(root, 'assets')).filter(file => file.endsWith('.js'))) {
  const path = resolve(root, 'assets', file);
  const js = readFileSync(path, 'utf8');
  assert.ok(!/\bfrom\s*["']three(?:\/[^"']*)?["']/.test(js), 'Unbundled Three.js import');
  const check = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
}
console.log(`Build OK: ${assets.length} assets resolve under ${base.pathname}; JavaScript syntax OK.`);
