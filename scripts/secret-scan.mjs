#!/usr/bin/env node
// Quét secret / dữ liệu riêng của công ty. Exit 1 nếu phát hiện.
// Dùng: node scripts/secret-scan.mjs [path] [--denylist file] [--staged] [--json] [--project]
// --project: chế độ project private — mã action (code-token) được phép.
import {resolve} from 'node:path';
import {scanPath, scanStaged, loadDenylist} from '../lib/secret-scan.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const opt = name => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--denylist');

const denylist = loadDenylist(opt('--denylist'));
const raw = flag('--staged') ? scanStaged(process.cwd(), {denylist}) : scanPath(resolve(positional[0] || '.'), {denylist});
const findings = flag('--project') ? raw.filter(f => f.kind !== 'code-token') : raw;

if (flag('--json')) {
  console.log(JSON.stringify(findings.map(({start, end, ...f}) => f), null, 2));
} else {
  for (const f of findings) console.log(`${f.file}:${f.line}:${f.col} ${f.kind} ${f.excerpt}`);
  console.error(
    findings.length
      ? `\n✖ ${findings.length} phát hiện. Thay bằng placeholder (<SECRET_KEY>, https://api.example.com, DEMO_*) hoặc khai báo ngoại lệ có lý do trong .secretscanignore.`
      : `✔ Không phát hiện secret${denylist.length ? ` (denylist: ${denylist.length} từ)` : ' (không có denylist local — chỉ quét pattern chung)'}.`,
  );
}
process.exit(findings.length ? 1 : 0);
