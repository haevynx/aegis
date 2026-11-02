// scan | feature | diff
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {scanRef, scanFeature} from '../scan/index.mjs';
import {findSecrets, redactDeep} from '../redact.mjs';
import {loadConfig, paths, projectRoot, readJson, saveConfig, writeJson} from '../project.mjs';
import {resolveRefs} from './ref.mjs';
import {out} from './args.mjs';

/** Chốt chặn cuối: không ghi ra file nếu còn thứ giống secret (mã action được phép). */
function guard(value) {
  const safe = redactDeep(value, {allowUrls: [], keep: ['code-token']});
  const left = findSecrets(JSON.stringify(safe), {allowUrls: []}).filter(f => f.kind !== 'code-token');
  if (left.length) throw new Error(`chặn ghi: còn ${left.length} chuỗi giống secret (${left[0].kind})`);
  return safe;
}

const kdir = (root, refName, outDir) => outDir || join(paths(root).knowledge, refName);

export function writeKnowledge(dir, k) {
  const safe = guard(k);
  writeJson(join(dir, 'knowledge.json'), safe);
  writeJson(join(dir, 'environments.json'), safe.environments);
  writeJson(join(dir, 'endpoints.json'), safe.endpoints);
  writeJson(join(dir, 'actions.json'), safe.actions);
  writeJson(join(dir, 'server-messages.json'), safe.serverMessages);
  writeJson(join(dir, 'http-files.json'), safe.httpFiles);
  writeJson(join(dir, 'routes.json'), safe.routes);
  writeJson(join(dir, 'features', '_index.json'), safe.features);
  return safe;
}

export function cmdScan({opts}) {
  const root = projectRoot(opts.dir || process.cwd());
  const refs = resolveRefs(root, opts.ref);
  if (!refs.length) return out.err('chưa có ref để quét. aegis ref add <path|git-url>'), 1;
  const config = loadConfig(root);
  for (const {ref, path} of refs) {
    const k = scanRef(path);
    k.ref.root = ref.git ? `git:${ref.git}` : `local:${ref.name}`; // không ghi đường dẫn máy cá nhân
    const dir = kdir(root, ref.name, opts.out);
    writeKnowledge(dir, k);
    out.ok(`${ref.name} @ ${k.ref.commit ?? 'không có git'} → ${dir}`);
    out.info(`stack: ${k.stack.platform} · state: ${k.stack.state.join(', ') || '—'} · http: ${k.stack.http.join(', ') || '—'}`);
    out.info(`môi trường ${k.environments.length} · endpoint ${k.endpoints.length} · action ${k.actions.length} · message ${k.serverMessages.length} · route ${k.routes.length} · chức năng ${k.features.length}`);
    out.info(`độ tin cậy: ${Object.entries(k.confidence).map(([a, b]) => `${a}=${b}`).join(' ')}`);
    if (k.unknownFiles.length) out.warn(`bố cục lạ — agent cần đọc tay: ${k.unknownFiles.slice(0, 8).join(', ')}${k.unknownFiles.length > 8 ? '…' : ''}`);
    config.lastScan = {ref: ref.name, commit: k.ref.commit, at: k.ref.scannedAt};
  }
  if (!opts.out) saveConfig(root, config);
  out.step('Tiếp: aegis profile learn (nếu chưa có profile) · aegis feature <tên> (khi làm chức năng)');
  return 0;
}

export function cmdFeature({pos, opts}) {
  const name = pos[0];
  if (!name) return out.err('cần tên chức năng: aegis feature <tên-thư-mục|slug|đường-dẫn> [--ref r]'), 1;
  const root = projectRoot(opts.dir || process.cwd());
  const refs = resolveRefs(root, opts.ref);
  let found = 0;
  for (const {ref, path} of refs) {
    const f = scanFeature(path, name);
    if (!f) continue;
    found++;
    // Bổ sung giá trị + mô tả của action từ kiến thức đã quét.
    const actions = readJson(join(kdir(root, ref.name), 'actions.json'), []);
    const byKey = new Map(actions.map(a => [a.key, a]));
    const keys = [...new Set(f.screens.flatMap(s => s.actions.map(a => a.key)))];
    f.actionIndex = keys.map(k => ({key: k, value: byKey.get(k)?.value ?? `<ACTION:${k}>`, comment: byKey.get(k)?.comment ?? null, source: byKey.get(k)?.source ?? null}));
    f.ref = {name: ref.name, commit: loadConfig(root).lastScan?.commit ?? null};
    const file = join(kdir(root, ref.name, opts.out), 'features', `${f.slug}.json`);
    writeJson(file, guard(f));
    const n = k => f.screens.reduce((a, s) => a + s[k].length, 0);
    out.ok(`${ref.name}: ${f.dir} → ${file}`);
    out.info(`${f.screens.length} file · ${n('fields')} trường · ${keys.length} action · ${n('conditions')} điều kiện · ${n('messages')} message · ${n('navigation')} điều hướng · ${f.subFeatures.length} chức năng con`);
    const missing = f.actionIndex.filter(a => a.value.startsWith('<ACTION:'));
    if (missing.length) out.warn(`${missing.length} action chưa có mã trong knowledge: ${missing.map(a => a.key).join(', ')} — chạy aegis scan hoặc aegis action add`);
  }
  if (!found) return out.err(`không thấy chức năng "${name}" trong ${refs.map(r => r.ref.name).join(', ') || '(không có ref)'}. Xem .aegis/knowledge/<ref>/features/_index.json`), 1;
  out.step(`Tiếp: viết spec .aegis/specs/<slug>.md theo templates/feature-spec.md (skill aegis-feature) → người dùng duyệt → code.`);
  return 0;
}

export function cmdDiff({opts}) {
  const root = projectRoot(opts.dir || process.cwd());
  const names = [].concat(opts.ref || []);
  const avail = existsSync(paths(root).knowledge) ? readdirSync(paths(root).knowledge) : [];
  const [a, b] = names.length >= 2 ? names : avail.slice(0, 2);
  if (!a || !b) return out.err('cần 2 ref đã quét: aegis diff --ref a --ref b'), 1;
  const load = (n, f) => readJson(join(paths(root).knowledge, n, f), []);
  for (const [label, file, id] of [
    ['action', 'actions.json', x => x.key],
    ['endpoint', 'endpoints.json', x => x.key],
    ['chức năng', join('features', '_index.json'), x => x.path],
  ]) {
    const A = new Map(load(a, file).map(x => [id(x), x]));
    const B = new Map(load(b, file).map(x => [id(x), x]));
    const onlyA = [...A.keys()].filter(k => !B.has(k));
    const onlyB = [...B.keys()].filter(k => !A.has(k));
    const changed = [...A.keys()].filter(k => B.has(k) && A.get(k).value !== undefined && A.get(k).value !== B.get(k).value);
    console.log(`\n## ${label}: chỉ ${a} ${onlyA.length} · chỉ ${b} ${onlyB.length} · khác giá trị ${changed.length}`);
    if (opts.verbose) {
      if (onlyA.length) console.log(`  chỉ ${a}: ${onlyA.join(', ')}`);
      if (onlyB.length) console.log(`  chỉ ${b}: ${onlyB.join(', ')}`);
      if (changed.length) console.log(`  khác: ${changed.join(', ')}`);
    }
  }
  if (!opts.verbose) out.info('\nThêm --verbose để xem danh sách.');
  return 0;
}
