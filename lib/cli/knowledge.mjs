// import | action add|list | doc add
import {cpSync, existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, join, resolve, relative, extname} from 'node:path';
import {aegisHome, isGitUrl, loadConfig, paths, projectRoot, readJson, saveConfig, writeJson} from '../project.mjs';
import {scanPath} from '../secret-scan.mjs';
import {listSourceFiles} from '../scan/files.mjs';
import {cloneOrPull} from './ref.mjs';
import {out} from './args.mjs';

function warnSecrets(dir) {
  const f = scanPath(dir).filter(x => x.kind !== 'code-token');
  if (f.length) {
    out.warn(`${f.length} chuỗi giống secret trong dữ liệu vừa nhập — kiểm tra và xoá:`);
    for (const x of f.slice(0, 10)) out.info(`${x.file}:${x.line} ${x.kind} ${x.excerpt}`);
  }
  return f.length;
}

export function cmdImport({pos, opts}) {
  const src = pos[0];
  if (!src) return out.err('aegis import <path|git-url> [--force]'), 1;
  const root = projectRoot(opts.dir || process.cwd());
  let base = resolve(src);
  if (isGitUrl(src)) {
    base = join(aegisHome(), 'imports', basename(src).replace(/\.git$/, ''));
    try {
      out.step(`${cloneOrPull(src, base)}: ${src}`);
    } catch (e) {
      return out.err(`không clone được ${src}: ${String(e.stderr || e.message).split('\n')[0]}`), 1;
    }
  }
  const from = existsSync(join(base, '.aegis', 'knowledge')) ? join(base, '.aegis') : existsSync(join(base, 'knowledge')) ? base : null;
  if (!from) return out.err(`không thấy .aegis/knowledge trong ${base}`), 1;
  const p = paths(root);
  const copied = [];
  for (const part of ['knowledge', 'profile', 'specs', 'docs', 'vectors']) {
    const s = join(from, part);
    if (!existsSync(s)) continue;
    const d = join(p.dir, part);
    cpSync(s, d, {recursive: true, force: !!opts.force, errorOnExist: false});
    copied.push(part);
  }
  const config = loadConfig(root);
  config.imports = [...(config.imports ?? []), {from: isGitUrl(src) ? src : `local:${basename(base)}`, at: new Date().toISOString(), parts: copied}];
  saveConfig(root, config);
  warnSecrets(p.dir);
  out.ok(`đã nhập ${copied.join(', ')} từ ${src}${opts.force ? '' : ' (không ghi đè file đã có; thêm --force để ghi đè)'}`);
  out.info('Lưu ý: kiến thức nhập về có thể cũ hơn source hiện tại — xem "commit" trong knowledge.json.');
  return 0;
}

const PLACEHOLDER = /<ACTION:([A-Za-z0-9_]+)>/g;

export function allActions(root) {
  const k = paths(root).knowledge;
  if (!existsSync(k)) return [];
  return readdirSync(k).flatMap(d => (readJson(join(k, d, 'actions.json'), []) || []).map(a => ({...a, ref: d})));
}

export function placeholders(root) {
  const found = new Map();
  for (const f of listSourceFiles(root)) {
    if (f.startsWith('.aegis/')) continue;
    const text = readFileSync(join(root, f), 'utf8');
    for (const m of text.matchAll(PLACEHOLDER)) if (!found.has(m[1])) found.set(m[1], `${f}:${text.slice(0, m.index).split('\n').length}`);
  }
  return found;
}

export function cmdAction({pos, opts}) {
  const [sub, key, code, ...desc] = pos;
  const root = projectRoot(opts.dir || process.cwd());
  if (sub === 'add') {
    if (!key || !code) return out.err('aegis action add <KEY> <mã> "<mô tả>"'), 1;
    const file = join(paths(root).knowledge, 'manual', 'actions.json');
    const list = (readJson(file, []) || []).filter(a => a.key !== key);
    list.push({key, value: code, comment: desc.join(' ') || null, group: 'manual', source: opts.source || 'manual (người dùng nhập)'});
    writeJson(file, list);
    out.ok(`${key} = ${code} → ${relative(root, file)}`);
    return 0;
  }
  const actions = allActions(root);
  const byKey = new Map(actions.map(a => [a.key, a]));
  const ph = placeholders(root);
  if (opts.missing || sub === 'missing') {
    const miss = [...ph].filter(([k]) => !byKey.has(k));
    if (!miss.length) out.ok('không có placeholder <ACTION:…> nào thiếu mã');
    for (const [k, src] of miss) out.info(`THIẾU ${k}  (dùng ở ${src})`);
    return 0;
  }
  const q = (opts.grep || '').toLowerCase();
  for (const a of actions) if (!q || `${a.key} ${a.comment}`.toLowerCase().includes(q)) console.log(`${a.key.padEnd(40)} ${String(a.value).padEnd(20)} ${a.ref.padEnd(18)} ${a.comment ?? ''}`);
  out.info(`${actions.length} action · ${ph.size} placeholder trong code (${[...ph.keys()].filter(k => !byKey.has(k)).length} chưa có mã)`);
  return 0;
}

export function cmdDoc({pos, opts}) {
  const [sub, file] = pos;
  if (sub !== 'add' || !file) return out.err('aegis doc add <file>'), 1;
  const root = projectRoot(opts.dir || process.cwd());
  const src = resolve(file);
  if (!existsSync(src) || !statSync(src).isFile()) return out.err(`không thấy file ${src}`), 1;
  const dest = join(paths(root).docs, basename(src));
  cpSync(src, dest);
  if (['.md', '.txt', '.json', '.yaml', '.yml', '.csv'].includes(extname(src).toLowerCase())) warnSecrets(paths(root).docs);
  else out.info('file nhị phân (pdf/docx…): agent đọc bằng công cụ phù hợp; nên kèm bản .md tóm tắt có nguồn trang/mục.');
  out.ok(`→ ${relative(root, dest)}`);
  return 0;
}
