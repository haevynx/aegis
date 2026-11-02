import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {scanPath, loadDenylist} from '../lib/secret-scan.mjs';

const j = (...p) => p.join('');
const tmp = () => mkdtempSync(join(tmpdir(), 'aegis-scan-'));
const SCRIPT = new URL('../scripts/secret-scan.mjs', import.meta.url).pathname;

test('đánh dấu file cấm, bỏ qua .env.example', () => {
  const d = tmp();
  for (const f of ['google-services.json', '.env', 'release.keystore', '.env.example', 'GoogleService-Info.plist']) writeFileSync(join(d, f), 'x');
  const files = scanPath(d)
    .filter(f => f.kind === 'forbidden-file')
    .map(f => f.file)
    .sort();
  assert.deepEqual(files, ['.env', 'GoogleService-Info.plist', 'google-services.json', 'release.keystore']);
});

test('bỏ qua node_modules và .git', () => {
  const d = tmp();
  mkdirSync(join(d, 'node_modules/x'), {recursive: true});
  writeFileSync(join(d, 'node_modules/x/a.js'), `SECRET_KEY: '${j('abc', 'def123')}'`);
  assert.deepEqual(scanPath(d), []);
});

test('.secretscanignore cho phép theo path + kind', () => {
  const d = tmp();
  mkdirSync(join(d, 'profiles/demo'), {recursive: true});
  const sig = 'a'.repeat(64);
  writeFileSync(join(d, 'profiles/demo/vectors.json'), `{"sig": "${sig}"}`);
  writeFileSync(join(d, 'other.json'), `{"sig": "${sig}"}`);
  writeFileSync(join(d, '.secretscanignore'), 'profiles/*/vectors.json hex32\n');
  assert.deepEqual(
    scanPath(d).map(f => f.file),
    ['other.json'],
  );
});

test('loadDenylist bỏ comment và dòng trống', () => {
  const d = tmp();
  const p = join(d, 'deny.txt');
  writeFileSync(p, '# tên đối tác\nAcmeIns\n\n  acmeclaim  \n');
  assert.deepEqual(loadDenylist(p), ['acmeins', 'acmeclaim']);
  assert.deepEqual(loadDenylist(join(d, 'missing.txt')), []);
});

test('CLI exit 1 khi có secret, exit 0 khi sạch', () => {
  const d = tmp();
  writeFileSync(join(d, 'ok.ts'), `export const BASE = 'https://api.example.com';\n`);
  let r = spawnSync(process.execPath, [SCRIPT, d], {encoding: 'utf8'});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  writeFileSync(join(d, 'bad.ts'), j(`const SECRET_KEY = '`, 'realLooking', `Value99';\n`));
  r = spawnSync(process.execPath, [SCRIPT, d], {encoding: 'utf8'});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /bad\.ts:1:\d+ sensitive-key/);
});

test('trong git repo: tôn trọng .gitignore', () => {
  const d = tmp();
  spawnSync('git', ['init', '-q'], {cwd: d});
  writeFileSync(join(d, '.gitignore'), 'generated.lock\n');
  writeFileSync(join(d, 'generated.lock'), `sha256: "${'b'.repeat(64)}"`);
  writeFileSync(join(d, 'src.ts'), `const SECRET_KEY = '${j('realLooking', 'Value99')}';`);
  assert.deepEqual(
    scanPath(d).map(f => f.file),
    ['src.ts'],
  );
});

test('ngoài git repo: vẫn đọc .gitignore (glob, thư mục/, !phủ định)', () => {
  const d = tmp();
  mkdirSync(join(d, 'ref/dart'), {recursive: true});
  mkdirSync(join(d, 'cache'), {recursive: true});
  writeFileSync(join(d, '.gitignore'), 'ref/dart/pubspec.lock\ncache/\n*.gen\n!keep.gen\n');
  const bad = `sha256: "${'c'.repeat(64)}"`;
  for (const f of ['ref/dart/pubspec.lock', 'cache/x.txt', 'a.gen', 'keep.gen', 'ok.txt']) writeFileSync(join(d, f), bad);
  assert.deepEqual(
    [...new Set(scanPath(d).map(f => f.file))].sort(),
    ['keep.gen', 'ok.txt'],
  );
});
