// Trích hằng số dạng object literal: môi trường, endpoint, mã action, message server.
// Parser theo dòng + đếm ngoặc — đủ cho file cấu hình, không cần AST.
import {redactText} from '../redact.mjs';

const stripStrings = s => s.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
const OPEN = /^\s*(?:export\s+)?(?:default\s+)?(?:(?:const|let|var|static\s+const|final)\s+)?(?:[\w<>, ]+\s+)?['"]?([A-Za-z_$][\w$]*)?['"]?\s*[:=]?\s*\{\s*(?:\/\/.*)?$/;
const ENTRY = /^\s*['"]?([A-Za-z_$][\w$-]*)['"]?\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2\s*,?\s*(?:\/\/\s*(.*?))?\s*$/;

export const isCommentLine = l => /^\s*(\/\/|\*|\/\*)/.test(l);

/** @returns {{path: string[], key: string, value: string, comment: string|null, line: number}[]} */
export function parseEntries(text) {
  const out = [];
  const stack = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (isCommentLine(line)) return;
    const bare = stripStrings(line.replace(/\/\/.*$/, ''));
    const net = (bare.match(/\{/g) || []).length - (bare.match(/\}/g) || []).length;
    const open = line.match(OPEN);
    if (open && net === 1) {
      stack.push(open[1] && open[1] !== 'default' ? open[1] : null);
      return;
    }
    const m = line.match(ENTRY);
    if (m) out.push({path: stack.filter(Boolean), key: m[1], value: m[3], comment: m[4] ? m[4].trim() : null, line: i + 1});
    if (net > 0) for (let n = 0; n < net; n++) stack.push(null);
    else if (net < 0) for (let n = 0; n < -net; n++) stack.pop();
  });
  return out;
}

const URLISH = /^(https?|wss?):\/\//i;
const BASE_KEY = /^(base_?url(_api)?|api_?url|base_?api(_url)?|server(_url)?|host|endpoint_?url)$/i;
const SECRET_KEY = /(secret|token|password|passwd|pwd|api_?key|private|client_?secret|signing_?key)/i;
const PATHISH = /^\/?(?:[A-Za-z0-9_{}:.-]+\/)+[A-Za-z0-9_{}:.-]*\/?$/;
const ASSET = /\.(png|jpe?g|gif|svg|webp|json|ttf|otf|mp3|mp4|lottie|html?)$/i;
const CODE_TOKEN = v => /^[A-Z0-9]{12,}$/.test(v) && (v.match(/\d/g) || []).length >= 3 && (v.match(/[A-Z]/g) || []).length >= 3;

export const envVarFor = key => {
  if (BASE_KEY.test(key)) return 'AEGIS_BASE_URL';
  if (/secret|signing/i.test(key)) return 'AEGIS_SECRET_KEY';
  if (/partner/i.test(key)) return 'AEGIS_PARTNER_CODE';
  if (/^(e_?)?env(ironment|irontment)?$/i.test(key)) return 'AEGIS_ENV';
  return 'AEGIS_' + key.replace(/[^A-Za-z0-9]+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
};

// Kho chỉ ghi vào project private nên mã action được giữ; mọi URL bị che (allowUrls rỗng).
const clean = s => (s == null ? s : redactText(s, {allowUrls: [], keep: ['code-token']}).text);

/**
 * Phân loại entry của nhiều file.
 * @param {{file: string, entries: ReturnType<typeof parseEntries>}[]} files
 */
export function classify(files) {
  const environments = [];
  const endpoints = [];
  const actions = [];
  const serverMessages = [];
  const seen = new Set();
  const push = (list, kind, e, file, extra = {}) => {
    const id = `${kind}|${e.path.join('.')}|${e.key}|${e.value}`;
    if (seen.has(id)) return;
    seen.add(id);
    list.push({key: e.key, value: clean(e.value), comment: clean(e.comment), group: e.path.join('.') || null, source: `${file}:${e.line}`, ...extra});
  };

  for (const {file, entries} of files) {
    // Nhóm theo object cha; object có base URL là một môi trường.
    const groups = new Map();
    for (const e of entries) {
      const g = e.path.join('.');
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    }
    const envPaths = [...groups.entries()].filter(([g, es]) => g && es.some(e => BASE_KEY.test(e.key) && URLISH.test(e.value))).map(([g]) => g);
    const inEnv = e => envPaths.find(p => e.path.join('.') === p || e.path.join('.').startsWith(p + '.'));

    for (const p of envPaths) {
      const fields = entries
        .filter(e => inEnv(e) === p)
        .map(e => {
          const key = [...e.path.slice(p.split('.').length), e.key].join('.');
          const secret = SECRET_KEY.test(e.key) && !/^(alg|typ)$/i.test(e.key);
          const value = secret ? '<REDACTED:secret>' : URLISH.test(e.value) ? '<URL>' : clean(e.value);
          const needsEnv = secret || URLISH.test(e.value) || /partner|^(e_?)?env/i.test(e.key);
          return {key, value, ...(needsEnv ? {envVar: envVarFor(e.key)} : {}), source: `${file}:${e.line}`};
        });
      environments.push({name: p.split('.').pop(), group: p, source: fields[0]?.source ?? file, fields});
    }

    for (const e of entries) {
      if (inEnv(e)) continue;
      const v = e.value;
      const group = e.path.join('.');
      if (PATHISH.test(v) && !v.startsWith('.') && !ASSET.test(v) && !/\s/.test(v)) push(endpoints, 'ep', e, file);
      else if (URLISH.test(v)) push(endpoints, 'ep', e, file, {absolute: true});
      else if ((/action/i.test(group) && /^[A-Za-z0-9_.:-]{3,}$/.test(v)) || CODE_TOKEN(v)) push(actions, 'ac', e, file);
      else if (/(message|msg|error|response|status|text)/i.test(group) && v.trim()) push(serverMessages, 'msg', e, file, {kind: /code/i.test(group) ? 'code' : /status/i.test(group) ? 'status' : 'message'});
    }
  }
  return {environments, endpoints, actions, serverMessages};
}
