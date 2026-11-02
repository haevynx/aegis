// Đường dẫn, cấu hình project (.aegis/), khối marker trong CLAUDE.md/AGENTS.md, .gitignore.
import {existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const real = p => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
export const KIT_ROOT = real(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
/** Kit đang chạy có phải bản đã cài ở ~/.aegis/kit không (so realpath — /var vs /private/var trên macOS). */
export const isInstalledKit = () => KIT_ROOT === real(join(aegisHome(), 'kit'));
export const aegisHome = () => process.env.AEGIS_HOME || join(homedir(), '.aegis');
export const KIT_VERSION = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8')).version;

export const readJson = (p, fallback = null) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};
export const writeJson = (p, v) => {
  mkdirSync(dirname(p), {recursive: true});
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
};

/** Gốc project: thư mục gần nhất (đi lên) có .aegis/config.json, nếu không có thì cwd. */
export function projectRoot(start = process.cwd()) {
  let d = resolve(start);
  for (;;) {
    if (existsSync(join(d, '.aegis', 'config.json'))) return d;
    const up = dirname(d);
    if (up === d) return resolve(start);
    d = up;
  }
}

export const looksLikeProject = d => ['.git', 'package.json', 'pubspec.yaml', 'build.gradle', 'build.gradle.kts', 'Package.swift'].some(f => existsSync(join(d, f)));

export function paths(root) {
  const a = join(root, '.aegis');
  return {
    dir: a,
    config: join(a, 'config.json'),
    local: join(a, 'local.json'),
    knowledge: join(a, 'knowledge'),
    profile: join(a, 'profile', 'profile.json'),
    protocol: join(a, 'profile', 'protocol.md'),
    vectors: join(a, 'vectors'),
    specs: join(a, 'specs'),
    docs: join(a, 'docs'),
    learn: join(a, 'learn'),
  };
}

export const defaultConfig = () => ({version: 1, profile: 'profile/profile.json', refs: [], imports: [], lastScan: null});
export const loadConfig = root => readJson(paths(root).config) ?? defaultConfig();
export const saveConfig = (root, c) => writeJson(paths(root).config, c);
// local.json: đường dẫn trên máy này (không commit).
export const loadLocal = root => readJson(paths(root).local) ?? {refs: {}};
export const saveLocal = (root, l) => writeJson(paths(root).local, l);

/** Đường dẫn thực của một ref trên máy này. */
export function refPath(root, ref) {
  const local = loadLocal(root).refs[ref.name];
  if (local) return local;
  if (ref.git) return join(aegisHome(), 'refs', ref.name);
  return null;
}

const BEGIN = '<!-- aegis:begin';
const END = '<!-- aegis:end -->';

/** Chèn/thay khối marker; giữ nguyên nội dung của người dùng. Trả về 'created' | 'updated' | 'unchanged'. */
export function upsertBlock(file, block) {
  const body = block.trim() + '\n';
  if (!existsSync(file)) {
    writeFileSync(file, body);
    return 'created';
  }
  const cur = readFileSync(file, 'utf8');
  const s = cur.indexOf(BEGIN);
  const e = cur.indexOf(END);
  let next;
  if (s !== -1 && e > s) next = cur.slice(0, s) + body.trimEnd() + cur.slice(e + END.length);
  else next = cur.replace(/\s*$/, '') + '\n\n' + body;
  if (!next.endsWith('\n')) next += '\n';
  if (next === cur) return 'unchanged';
  writeFileSync(file, next);
  return 'updated';
}

export function removeBlock(file) {
  if (!existsSync(file)) return false;
  const cur = readFileSync(file, 'utf8');
  const s = cur.indexOf(BEGIN);
  const e = cur.indexOf(END);
  if (s === -1 || e < s) return false;
  writeFileSync(file, (cur.slice(0, s).replace(/\s*$/, '') + cur.slice(e + END.length)).replace(/^\s*/, '') || '');
  return true;
}

/** Đảm bảo các dòng có trong .gitignore. Trả về các dòng đã thêm. */
export function ensureGitignore(root, lines) {
  const f = join(root, '.gitignore');
  const cur = existsSync(f) ? readFileSync(f, 'utf8') : '';
  const have = new Set(cur.split(/\r?\n/).map(l => l.trim()));
  const add = lines.filter(l => !have.has(l));
  if (add.length) writeFileSync(f, cur.replace(/\s*$/, '') + (cur.trim() ? '\n\n' : '') + '# aegis\n' + add.join('\n') + '\n');
  return add;
}

export function gitTracks(root, file) {
  try {
    execFileSync('git', ['-C', root, 'ls-files', '--error-unmatch', file], {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

export const isGitUrl = s => /^(git@|ssh:\/\/|git:\/\/|https?:\/\/.+\.git$|https?:\/\/(github|gitlab|bitbucket)\.[a-z]+\/)/.test(s) || s.endsWith('.git');

export function git(args, opts = {}) {
  return execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts}).trim();
}
