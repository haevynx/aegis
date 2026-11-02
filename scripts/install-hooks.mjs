#!/usr/bin/env node
// Cài pre-commit hook chạy secret-scan trên nội dung đã stage.
// Dùng: node scripts/install-hooks.mjs [repo-dir]
import {writeFileSync, chmodSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** @param {{project?: boolean, scanner?: string}} [opts] project: chế độ project private (cho phép mã action); scanner: đường dẫn secret-scan.mjs bền vững (vd ~/.aegis/kit/…). */
export function installPreCommit(repoDir, opts = {}) {
  const gitDir = join(repoDir, '.git');
  if (!existsSync(gitDir)) return {ok: false, reason: 'không phải git repo (chưa có .git)'};
  const hooks = join(gitDir, 'hooks');
  mkdirSync(hooks, {recursive: true});
  const scanner = opts.scanner || fileURLToPath(new URL('./secret-scan.mjs', import.meta.url));
  const hook = join(hooks, 'pre-commit');
  const marker = '# aegis:secret-scan';
  const line = `${marker}\nnode "${scanner}" --staged${opts.project ? ' --project' : ''} || { echo "aegis: commit bị chặn vì có secret/dữ liệu riêng."; exit 1; }\n`;
  let body = existsSync(hook) ? readFileSync(hook, 'utf8') : '#!/bin/sh\n';
  if (body.includes(marker)) return {ok: true, hook, reason: 'đã cài trước đó'};
  body += (body.endsWith('\n') ? '' : '\n') + line;
  writeFileSync(hook, body);
  chmodSync(hook, 0o755);
  return {ok: true, hook};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = installPreCommit(resolve(process.argv[2] || '.'));
  console.log(r.ok ? `✔ pre-commit: ${r.hook}${r.reason ? ` (${r.reason})` : ''}` : `✖ ${r.reason}`);
  process.exit(r.ok ? 0 : 1);
}
