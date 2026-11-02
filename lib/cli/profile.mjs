// profile learn | show | check ; vectors
import {existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {KIT_ROOT, loadConfig, paths, projectRoot, readJson, writeJson} from '../project.mjs';
import {validateProfile} from '../profile-check.mjs';
import {out} from './args.mjs';

const knowledgeDirs = root => (existsSync(paths(root).knowledge) ? readdirSync(paths(root).knowledge).filter(d => existsSync(join(paths(root).knowledge, d, 'knowledge.json'))) : []);

const SKELETON = {
  name: 'TODO-tên-backend',
  transport: {method: 'POST', contentType: 'application/json', timeoutMs: 300000},
  envelope: {dataKey: 'TODO hoặc null', metaKey: 'TODO hoặc null', meta: {}, defaults: {}},
  headers: {'Content-Type': 'application/json', TODO: '{signature}'},
  signing: {recipe: 'hash-b64url-dot-secret', over: 'data', alg: 'sha256', encoding: 'hex', note: 'TODO xác minh recipe'},
  routes: {execute: {path: 'TODO'}, login: {path: 'TODO', action: 'TODO'}, refresh: {path: 'TODO'}},
  response: {statusPath: 'TODO', okValues: ['TODO'], messagePath: 'TODO', codePath: 'TODO', dataPath: 'TODO'},
  session: {fromLogin: {}, fromRefresh: {}, tokenExpired: {messages: [], codes: []}, sessionExpired: {messages: [], codes: []}, authInvalid: {messages: [], codes: []}, relogin: 'none'},
  env: {environments: [], vars: {baseUrl: 'AEGIS_BASE_URL', secret: 'AEGIS_SECRET_KEY', partner: 'AEGIS_PARTNER_CODE', env: 'AEGIS_ENV'}},
};

export function cmdProfile({pos, opts}) {
  const sub = pos[0] || 'show';
  const root = projectRoot(opts.dir || process.cwd());
  const p = paths(root);

  if (sub === 'learn') {
    const dirs = opts.ref ? [].concat(opts.ref) : knowledgeDirs(root);
    if (!dirs.length) return out.err('chưa có knowledge. Chạy: aegis scan (hoặc aegis import / chế độ chỉ giao thức — xem skill aegis-learn)'), 1;
    const lines = ['# Nguyên liệu để viết profile (đã che secret)', '', '> Sinh bởi `aegis profile learn`. Agent đọc các file nguồn được liệt kê **trực tiếp trong app tham chiếu**, rồi viết `.aegis/profile/profile.json` + `protocol.md` (mỗi dòng có `file:line`). Không chép giá trị secret/URL.', ''];
    for (const d of dirs) {
      const k = readJson(join(p.knowledge, d, 'knowledge.json'));
      if (!k) continue;
      lines.push(`## Ref \`${d}\` @ ${k.ref.commit ?? '—'} · ${k.stack.platform} / ${k.stack.state.join(', ') || '—'} / ${k.stack.http.join(', ') || '—'}`, '');
      lines.push('### Môi trường (giá trị đã che)', '');
      for (const e of k.environments) lines.push(`- **${e.name}** \`${e.source}\`: ${e.fields.map(f => `${f.key}=${f.value}${f.envVar ? ` → ${f.envVar}` : ''}`).join(', ')}`);
      lines.push('', '### File tầng HTTP / ký / phiên (đọc theo thứ tự)', '');
      for (const h of k.httpFiles.slice(0, Number(opts.top) || 8)) {
        lines.push(`#### \`${h.file}\` — ${h.role}, tin cậy ${h.confidence}`, '', '```');
        for (const e of h.evidence.slice(0, 40)) lines.push(`${String(e.line).padStart(5)}  ${e.text}`);
        lines.push('```', '');
      }
      lines.push('### Message/mã server đã khai báo', '');
      for (const m of k.serverMessages.slice(0, 60)) lines.push(`- \`${m.key}\` (${m.kind}) = "${m.value}" — \`${m.source}\``);
      lines.push('', '### Endpoint (mẫu)', '');
      for (const e of k.endpoints.slice(0, 40)) lines.push(`- \`${e.key}\` = \`${e.value}\`${e.comment ? ` — ${e.comment}` : ''} (\`${e.source}\`)`);
      lines.push('');
    }
    lines.push(
      '## Câu hỏi cần trả lời (mỗi câu một nguồn file:line)',
      '',
      '1. Body được đóng gói thế nào? (key dữ liệu, key metadata, các trường meta) → `envelope`',
      '2. Tham số mặc định nào được gộp vào mọi lời gọi? Gộp trước hay sau params? → `envelope.defaults`',
      '3. Danh sách header, đúng chính tả và thứ tự? Giá trị lấy từ đâu? → `headers`',
      '4. Chữ ký: hàm hash/HMAC/JWS nào, ký trên chuỗi nào, encode gì? Login có ký khác không? Upload? → `signing`, `routes.*.signing`',
      '5. Route nào đi qua endpoint chung (execute), route nào riêng? Có cơ chế chuyển URL tự động không? → `routes`',
      '6. Response: trường trạng thái, giá trị thành công, message, mã lỗi, dữ liệu? → `response`',
      '7. Nhận biết token hết hạn / phiên hết hạn / sai thiết bị bằng message hay code nào? Xử lý ra sao? → `session`',
      '8. Login trả token ở đâu? Refresh gửi gì, nhận gì? Có login lại bằng thông tin đã lưu không? → `session.fromLogin/fromRefresh/relogin`',
      '9. Có SSO/OIDC, token cố định, thanh toán, upload đặc biệt không? → ghi vào `protocol.md` mục Biến thể',
      '',
      'Sau đó: sinh vector local `.aegis/vectors/<tên>.json` bằng **thuật toán của app tham chiếu** với secret GIẢ, rồi `aegis profile check` + `aegis vectors`.',
    );
    mkdirSync(p.learn, {recursive: true});
    const learnFile = join(p.learn, 'profile-sources.md');
    writeFileSync(learnFile, lines.join('\n') + '\n');
    if (!existsSync(p.profile)) writeJson(p.profile, SKELETON);
    if (!existsSync(p.protocol)) copyFileSync(join(KIT_ROOT, 'templates', 'protocol.md'), p.protocol);
    out.ok(`nguyên liệu: ${learnFile}`);
    out.info(`khung profile: ${p.profile} (còn TODO) · ${p.protocol}`);
    out.info(`ví dụ đầy đủ: ${join(KIT_ROOT, 'profiles', 'demo', 'profile.json')} · schema: ${join(KIT_ROOT, 'spec', 'profile-schema.md')}`);
    out.step('Agent: đọc file nguồn → điền profile.json + protocol.md (có file:line) → người dùng DUYỆT → aegis profile check');
    return 0;
  }

  const prof = readJson(p.profile);
  if (!prof) return out.err(`chưa có ${p.profile}. Chạy: aegis profile learn`), 1;
  if (sub === 'check') {
    const errs = validateProfile(prof);
    if (errs.length) {
      out.err(`profile chưa hợp lệ (${errs.length}):`);
      for (const e of errs) out.info(`- ${e}`);
      return 1;
    }
    out.ok(`profile "${prof.name}" hợp lệ`);
    return existsSync(p.vectors) && readdirSync(p.vectors).some(f => f.endsWith('.json')) ? cmdVectors({pos: [], opts}) : (out.info('chưa có vector local (.aegis/vectors/*.json) — nên tạo để kiểm chứng chữ ký'), 0);
  }
  console.log(JSON.stringify({name: prof.name, execute: prof.routes?.execute?.path, signing: prof.signing?.recipe, headers: Object.keys(prof.headers ?? {}), envVars: prof.env?.vars}, null, 2));
  return 0;
}

export async function cmdVectors({opts}) {
  if (!process.features?.typescript) return out.err(`cần Node ≥ 22.18 (chạy TypeScript trực tiếp) để chạy vector; đang dùng ${process.version}`), 1;
  const root = projectRoot(opts.dir || process.cwd());
  const demo = !!opts.demo;
  const profile = readJson(demo ? join(KIT_ROOT, 'profiles', 'demo', 'profile.json') : paths(root).profile);
  if (!profile) return out.err('chưa có profile'), 1;
  const files = opts.file ? [].concat(opts.file) : demo ? [join(KIT_ROOT, 'profiles', 'demo', 'vectors.json')] : existsSync(paths(root).vectors) ? readdirSync(paths(root).vectors).filter(f => f.endsWith('.json')).map(f => join(paths(root).vectors, f)) : [];
  if (!files.length) return out.err('không có file vector (.aegis/vectors/*.json)'), 1;
  const {createClient} = await import(pathToFileURL(join(KIT_ROOT, 'reference', 'ts', 'client.ts')).href);
  let fail = 0;
  let total = 0;
  for (const f of files) {
    const v = JSON.parse(readFileSync(f, 'utf8'));
    for (const c of v.cases) {
      total++;
      const store = {value: c.session, get: async () => store.value, set: async s => (store.value = s), clear: async () => (store.value = null)};
      const client = createClient({profile, config: {...v.config, secret: v.secret}, session: store, device: async () => v.device, clock: () => new Date(v.now)});
      const req = await client.buildRequest(c.call.action ?? null, c.call.params ?? {}, {route: c.call.route});
      const diffs = [];
      for (const key of ['url', 'method']) if (req[key] !== c.expect[key]) diffs.push(`${key}: ${req[key]} ≠ ${c.expect[key]}`);
      for (const key of ['headers', 'body']) if (JSON.stringify(req[key]) !== JSON.stringify(c.expect[key])) {
        const a = req[key] ?? {};
        const b = c.expect[key] ?? {};
        const ks = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
        diffs.push(`${key}: khác ở ${ks.length ? ks.join(', ') : 'thứ tự key'}`);
      }
      if (diffs.length) {
        fail++;
        out.err(`${c.name}\n    ${diffs.join('\n    ')}`);
      } else out.ok(c.name);
    }
  }
  console.log(`\n${total - fail}/${total} vector khớp`);
  return fail ? 1 : 0;
}
