#!/usr/bin/env node
// aegis — Học → Hỏi → Làm: tích hợp backend & nghiệp vụ bảo hiểm vào mọi stack.
import {parseArgs, out} from '../lib/cli/args.mjs';
import {KIT_VERSION, isInstalledKit} from '../lib/project.mjs';

const HELP = `aegis ${KIT_VERSION}

Cài đặt
  aegis [install] [--project] [--hooks] [--skills-only]   cài skill (global; --project: vào project) + cấu hình project hiện tại
  aegis update [--version vX.Y.Z]                         cập nhật kit + skill lên bản mới nhất
  aegis uninstall [--project]                             gỡ skill (giữ .aegis/)

Học
  aegis ref add <path|git-url> [--name n]                 khai báo app tham chiếu (git-url: clone chỉ đọc)
  aegis ref list | remove <n>
  aegis scan [--ref n] [--out dir]                        quét ref → .aegis/knowledge/<ref>/ (đã che secret)
  aegis profile learn [--ref n]                           gom nguyên liệu để agent viết profile giao thức
  aegis profile check | show                              kiểm tra profile (+ chạy vector local)
  aegis feature <tên> [--ref n]                           trích chi tiết một chức năng
  aegis diff --ref a --ref b [--verbose]                  so hai app tham chiếu
  aegis import <path|git-url> [--force]                   lấy .aegis/ đã học từ project khác
  aegis action add <KEY> <mã> "<mô tả>" | list [--missing] [--grep q]
  aegis doc add <file>                                    thêm tài liệu nghiệp vụ (BA)

Kiểm chứng
  aegis vectors [--file f] [--demo]                       so request client mẫu với vector (Node ≥ 22.18)
  aegis doctor [--json]                                   mức sẵn sàng + bước tiếp theo
  aegis scan-secrets [path] [--project] [--denylist f]    quét secret

Tuỳ chọn chung: --dir <project>`;

const COMMANDS = {
  install: () => import('../lib/cli/install.mjs').then(m => m.cmdInstall),
  update: () => import('../lib/cli/install.mjs').then(m => m.cmdUpdate),
  uninstall: () => import('../lib/cli/install.mjs').then(m => m.cmdUninstall),
  ref: () => import('../lib/cli/ref.mjs').then(m => m.cmdRef),
  scan: () => import('../lib/cli/scan.mjs').then(m => m.cmdScan),
  feature: () => import('../lib/cli/scan.mjs').then(m => m.cmdFeature),
  diff: () => import('../lib/cli/scan.mjs').then(m => m.cmdDiff),
  profile: () => import('../lib/cli/profile.mjs').then(m => m.cmdProfile),
  vectors: () => import('../lib/cli/profile.mjs').then(m => m.cmdVectors),
  import: () => import('../lib/cli/knowledge.mjs').then(m => m.cmdImport),
  action: () => import('../lib/cli/knowledge.mjs').then(m => m.cmdAction),
  doc: () => import('../lib/cli/knowledge.mjs').then(m => m.cmdDoc),
  doctor: () => import('../lib/cli/doctor.mjs').then(m => m.cmdDoctor),
  'scan-secrets': () => async ({pos, opts}) => {
    const {scanPath, loadDenylist} = await import('../lib/secret-scan.mjs');
    const {resolve} = await import('node:path');
    const f = scanPath(resolve(pos[0] || '.'), {denylist: loadDenylist(opts.denylist)}).filter(x => !opts.project || x.kind !== 'code-token');
    for (const x of f) console.log(`${x.file}:${x.line}:${x.col} ${x.kind} ${x.excerpt}`);
    console.error(f.length ? `✖ ${f.length} phát hiện` : '✔ không phát hiện secret');
    return f.length ? 1 : 0;
  },
};

const argv = process.argv.slice(2);
// --version / --help phải xử lý TRƯỚC khi mặc định sang `install` (tránh cài nhầm khi chỉ hỏi phiên bản).
if (['--version', '-v', 'version'].includes(argv[0])) {
  console.log(KIT_VERSION);
  process.exit(0);
}
if (['help', '-h', '--help'].includes(argv[0]) || (argv.includes('--help') && !argv[0]?.startsWith('--'))) {
  console.log(HELP);
  process.exit(0);
}
// Chỉ khi chạy qua npx/installer (chưa phải bản đã cài ở ~/.aegis/kit) thì "không tham số" mới nghĩa là install.
// Bản đã cài gọi không tham số → in help (tránh vô tình cấu hình thư mục hiện tại).
const installedCopy = isInstalledKit();
if (installedCopy && (!argv.length || argv[0].startsWith('--'))) {
  console.log(HELP);
  process.exit(argv.length ? 2 : 0);
}
const [cmd = 'install', ...rest] = argv[0]?.startsWith('--') ? ['install', ...argv] : argv;
const load = COMMANDS[cmd];
if (!load) {
  out.err(`lệnh không tồn tại: ${cmd}\n`);
  console.log(HELP);
  process.exit(2);
}
try {
  const fn = await load();
  process.exitCode = (await fn(parseArgs(rest, {bool: ['project', 'hooks', 'skills-only', 'force', 'verbose', 'json', 'demo', 'missing', 'keep-kit', 'local']}))) ?? 0;
} catch (e) {
  out.err(e?.message || String(e));
  if (process.env.AEGIS_DEBUG) console.error(e);
  process.exitCode = 1;
}
