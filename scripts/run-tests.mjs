#!/usr/bin/env node
// Chạy `node --test` với danh sách file tường minh — cách truyền thư mục/glob khác nhau giữa Node 18/22/24+.
// Dùng: node scripts/run-tests.mjs <thư-mục>...
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const files = process.argv.slice(2).flatMap(dir =>
  readdirSync(dir)
    .filter(f => /\.test\.(mjs|js|ts)$/.test(f))
    .sort()
    .map(f => join(dir, f)),
);
if (!files.length) {
  console.error('không tìm thấy file *.test.*');
  process.exit(1);
}
const r = spawnSync(process.execPath, ['--test', ...files], {stdio: 'inherit'});
process.exit(r.status ?? 1);
