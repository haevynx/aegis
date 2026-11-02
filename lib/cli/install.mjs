// install | update | uninstall
import {cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, chmodSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {KIT_ROOT, KIT_VERSION, aegisHome, isInstalledKit, paths, projectRoot, looksLikeProject, loadConfig, saveConfig, upsertBlock, removeBlock, ensureGitignore, gitTracks} from '../project.mjs';
import {installPreCommit} from '../../scripts/install-hooks.mjs';
import {out} from './args.mjs';

const MANAGED = '.aegis-managed';
const KIT_PARTS = ['bin', 'lib', 'scripts', 'templates', 'spec', 'profiles', 'reference', 'skills', 'package.json', 'LICENSE', 'install.sh', 'install.ps1'];
export const INSTALL_SH = 'https://raw.githubusercontent.com/haevynx/aegis/main/install.sh';
export const INSTALL_PS1 = 'https://raw.githubusercontent.com/haevynx/aegis/main/install.ps1';

export const skillTargets = ({project, root}) =>
  project ? [join(root, '.claude', 'skills'), join(root, '.agents', 'skills')] : [join(homedir(), '.claude', 'skills'), join(homedir(), '.agents', 'skills')];

export const kitSkills = () => (existsSync(join(KIT_ROOT, 'skills')) ? readdirSync(join(KIT_ROOT, 'skills')).filter(n => existsSync(join(KIT_ROOT, 'skills', n, 'SKILL.md'))) : []);

function installSkills(targets) {
  const done = [];
  for (const base of targets) {
    for (const name of kitSkills()) {
      const dest = join(base, name);
      if (existsSync(dest) && !existsSync(join(dest, MANAGED))) {
        out.warn(`bỏ qua ${dest}: đã có skill cùng tên không do aegis quản lý`);
        continue;
      }
      rmSync(dest, {recursive: true, force: true});
      mkdirSync(base, {recursive: true});
      cpSync(join(KIT_ROOT, 'skills', name), dest, {recursive: true});
      writeFileSync(join(dest, MANAGED), `aegis ${KIT_VERSION}\n`);
      done.push(dest);
    }
  }
  return done;
}

/** Copy kit vào ~/.aegis/kit để gọi lại CLI mà không cần npx. */
function installKit() {
  const home = aegisHome();
  const kit = join(home, 'kit');
  if (isInstalledKit()) return kit; // không bao giờ tự xoá chính mình
  rmSync(kit, {recursive: true, force: true});
  mkdirSync(kit, {recursive: true});
  for (const p of KIT_PARTS) if (existsSync(join(KIT_ROOT, p))) cpSync(join(KIT_ROOT, p), join(kit, p), {recursive: true});
  mkdirSync(join(home, 'bin'), {recursive: true});
  const entry = join(kit, 'bin', 'aegis.mjs');
  const shim = join(home, 'bin', 'aegis');
  writeFileSync(shim, `#!/bin/sh\nexec node "${entry}" "$@"\n`);
  chmodSync(shim, 0o755);
  if (process.platform === 'win32') writeFileSync(join(home, 'bin', 'aegis.cmd'), `@echo off\r\nnode "${entry}" %*\r\n`);
  return kit;
}

export function setupProject(root, {hooks = false, kit = null} = {}) {
  const p = paths(root);
  const created = [];
  if (!existsSync(p.config)) {
    saveConfig(root, loadConfig(root));
    created.push('.aegis/config.json');
  }
  const block = readFileSync(join(KIT_ROOT, 'templates', 'agents-block.md'), 'utf8');
  for (const f of ['CLAUDE.md', 'AGENTS.md']) {
    const r = upsertBlock(join(root, f), block);
    if (r !== 'unchanged') created.push(`${f} (${r === 'created' ? 'tạo mới' : 'cập nhật khối aegis'})`);
  }
  if (!existsSync(join(root, '.env.example'))) {
    cpSync(join(KIT_ROOT, 'templates', 'env.example'), join(root, '.env.example'));
    created.push('.env.example');
  }
  const added = ensureGitignore(root, ['.env', '.env.*', '!.env.example', '.aegis/local.json', '.aegis/learn/']);
  if (added.length) created.push(`.gitignore (+${added.join(', ')})`);
  if (hooks) {
    const r = installPreCommit(root, {project: true, scanner: kit ? join(kit, 'scripts', 'secret-scan.mjs') : undefined});
    created.push(r.ok ? `pre-commit secret-scan (${r.hook})` : `pre-commit: ${r.reason}`);
  }
  return created;
}

export function cmdInstall({opts}) {
  const root = projectRoot(opts.dir || process.cwd());
  const targets = skillTargets({project: !!opts.project, root});
  const kit = opts.project ? null : installKit();
  const skills = installSkills(targets);
  out.ok(`aegis ${KIT_VERSION}: ${kitSkills().length} skill → ${targets.join(', ')}`);
  if (kit) out.info(`CLI: ${join(aegisHome(), 'bin', 'aegis')} (thêm ${join(aegisHome(), 'bin')} vào PATH, hoặc gọi \`node ${join(kit, 'bin', 'aegis.mjs')}\`)`);
  if (!skills.length && kitSkills().length) out.warn('không cài được skill nào (xem cảnh báo ở trên)');

  if (opts['skills-only']) return 0;
  if (!looksLikeProject(root)) {
    out.info(`${root} không giống một project (không có .git / package.json / pubspec.yaml…) — bỏ qua bước cấu hình project.`);
    out.info('Chạy lại `aegis install` trong thư mục gốc của project cần tích hợp.');
    return 0;
  }
  for (const c of setupProject(root, {hooks: !!opts.hooks, kit})) out.info(`+ ${c}`);
  if (gitTracks(root, '.env')) out.err('.env ĐANG BỊ GIT THEO DÕI — chạy `git rm --cached .env` và đổi toàn bộ secret trong đó.');
  out.step('Tiếp theo: khởi động lại phiên Claude Code/Codex để nạp skill, rồi nói "tích hợp backend bảo hiểm vào project này" — hoặc chạy `aegis doctor`.');
  return 0;
}

/** update: bản đã cài (~/.aegis/kit) → tải bản mới bằng installer; chạy qua npx/clone → cài lại từ bản đang chạy. */
export function cmdUpdate(args) {
  if (!isInstalledKit() || args.opts.local) return cmdInstall(args);
  const win = process.platform === 'win32';
  const cmd = win ? ['powershell', ['-NoProfile', '-Command', `irm ${INSTALL_PS1} | iex`]] : ['sh', ['-c', `curl -fsSL ${INSTALL_SH} | sh -s -- --skills-only`]];
  out.step(`cập nhật từ GitHub (${args.opts.version ? `AEGIS_VERSION=${args.opts.version}` : 'main'})…`);
  const r = spawnSync(cmd[0], cmd[1], {stdio: 'inherit', env: {...process.env, ...(args.opts.version ? {AEGIS_VERSION: args.opts.version} : {})}});
  return r.status ?? 1;
}

export function cmdUninstall({opts}) {
  const root = projectRoot(opts.dir || process.cwd());
  let n = 0;
  for (const base of [...skillTargets({project: false, root}), ...skillTargets({project: true, root})]) {
    for (const name of kitSkills()) {
      const d = join(base, name);
      if (existsSync(join(d, MANAGED))) {
        rmSync(d, {recursive: true, force: true});
        n++;
      }
    }
  }
  if (opts.project) for (const f of ['CLAUDE.md', 'AGENTS.md']) if (removeBlock(join(root, f))) out.info(`- khối aegis trong ${f}`);
  if (!opts['keep-kit']) rmSync(join(aegisHome(), 'kit'), {recursive: true, force: true});
  out.ok(`đã gỡ ${n} skill. Giữ nguyên .aegis/ trong các project (dữ liệu của bạn).`);
  return 0;
}
