import {readdirSync, readFileSync, statSync, existsSync} from 'node:fs';
import {join, relative, basename, extname, sep} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {findSecrets} from './redact.mjs';

export const SKIP_DIRS = new Set(['node_modules', '.git', '.dart_tool', 'Pods', '.gradle', 'build', 'DerivedData', '.next', 'dist', 'coverage', '.expo', '.idea', '.cxx']);
const BINARY_EXT = new Set(
  '.png .jpg .jpeg .gif .webp .ico .bmp .tiff .pdf .zip .gz .tgz .rar .7z .jar .aar .so .dylib .a .o .class .ttf .otf .woff .woff2 .eot .mp3 .mp4 .mov .wav .m4a .aac .lottie .riv .ipa .apk .aab .bin .db .sqlite .xcuserstate'.split(
    ' ',
  ),
);
const FORBIDDEN_NAMES = new Set(['google-services.json', 'googleservice-info.plist', 'id_rsa', 'id_ed25519']);
const FORBIDDEN_EXT = new Set(['.keystore', '.jks', '.p12', '.pem', '.mobileprovision', '.p8']);
const MAX_SIZE = 1.5 * 1024 * 1024;

export function isForbiddenFile(name) {
  const b = basename(name).toLowerCase();
  if (FORBIDDEN_NAMES.has(b) || FORBIDDEN_EXT.has(extname(b))) return true;
  return b === '.env' || (b.startsWith('.env.') && b !== '.env.example');
}

export function loadDenylist(path = process.env.AEGIS_DENYLIST || join(homedir(), '.aegis', 'denylist.txt')) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(l => l.replace(/#.*/, '').trim().toLowerCase())
    .filter(Boolean);
}

const globToRe = g =>
  new RegExp(
    '^' +
      g
        .split('**')
        .map(part => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
        .join('.*') +
      '$',
  );

/** `.secretscanignore`: mỗi dòng `glob [kind,kind]` — thiếu kind nghĩa là bỏ qua mọi kind. */
export function loadIgnore(root) {
  const p = join(root, '.secretscanignore');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map(l => l.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map(l => {
      const [glob, kinds] = l.split(/\s+/);
      return {re: globToRe(glob), kinds: kinds ? new Set(kinds.split(',')) : null};
    });
}

const ignored = (rules, file, kind) => rules.some(r => r.re.test(file) && (!r.kinds || r.kinds.has(kind)));

export function scanText(text, file, opts = {}) {
  if (text.includes('\u0000')) return [];
  return findSecrets(text, {...opts, file}).filter(f => !ignored(opts.ignore || [], file, f.kind));
}

function* walk(dir) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(p);
    } else if (entry.isFile()) yield p;
  }
}

/**
 * Quét một thư mục.
 * @param {string} root
 * @param {{denylist?: string[], allowUrls?: string[]}} [opts]
 */
/** Trong git repo: chỉ các file sẽ được commit (tracked + untracked chưa bị .gitignore). */
function gitFiles(root) {
  if (!existsSync(join(root, '.git'))) return null;
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    return out
      .split('\0')
      .filter(Boolean)
      .filter(f => !f.split('/').some(seg => SKIP_DIRS.has(seg)) && existsSync(join(root, f)))
      .map(f => join(root, f));
  } catch {
    return null;
  }
}

/** Ngoài git repo: đọc .gitignore ở gốc (đủ dùng: glob, thư mục/, !phủ định). */
export function gitignoreMatcher(root) {
  const p = join(root, '.gitignore');
  if (!existsSync(p)) return () => false;
  const rules = readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const neg = l.startsWith('!');
      let pat = neg ? l.slice(1) : l;
      const dir = pat.endsWith('/');
      pat = pat.replace(/^\/|\/$/g, '');
      const anchored = l.replace(/^!/, '').startsWith('/') || pat.includes('/');
      return {neg, re: globToRe(pat), dir, anchored};
    });
  return file => {
    let hit = false;
    const segs = file.split('/');
    for (const r of rules) {
      const cands = r.anchored ? segs.map((_, i) => segs.slice(0, i + 1).join('/')) : segs;
      const m = cands.some((c, i) => r.re.test(c) && (!r.dir || i < cands.length - 1));
      if (m) hit = !r.neg;
    }
    return hit;
  };
}

export function scanPath(root, opts = {}) {
  const ignore = loadIgnore(root);
  const out = [];
  const tracked = gitFiles(root);
  const gi = tracked ? () => false : gitignoreMatcher(root);
  for (const abs of tracked ?? walk(root)) {
    if (gi(relative(root, abs).split(sep).join('/'))) continue;
    const file = relative(root, abs).split(sep).join('/');
    if (isForbiddenFile(file)) {
      if (!ignored(ignore, file, 'forbidden-file')) out.push({kind: 'forbidden-file', file, line: 0, col: 0, excerpt: 'file không được commit'});
      continue;
    }
    if (BINARY_EXT.has(extname(abs).toLowerCase()) || statSync(abs).size > MAX_SIZE) continue;
    out.push(...scanText(readFileSync(abs, 'utf8'), file, {...opts, ignore}));
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/** Quét nội dung đã `git add` (dùng cho pre-commit). */
export function scanStaged(cwd, opts = {}) {
  const git = args => execFileSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const names = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
  const ignore = loadIgnore(cwd);
  const out = [];
  for (const file of names) {
    if (isForbiddenFile(file)) {
      out.push({kind: 'forbidden-file', file, line: 0, col: 0, excerpt: 'file không được commit'});
      continue;
    }
    if (BINARY_EXT.has(extname(file).toLowerCase())) continue;
    out.push(...scanText(git(['show', `:${file}`]), file, {...opts, ignore}));
  }
  return out;
}
