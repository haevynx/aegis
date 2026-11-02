// Phát hiện và che secret trong văn bản. Không phụ thuộc thư viện ngoài.
// Dùng chung cho: secret-scan (repo kit, pre-commit), scanner (đọc app tham chiếu).

export const DEFAULT_URL_ALLOWLIST = [
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  'github.com',
  'raw.githubusercontent.com',
  'docs.flutter.dev',
  'reactnative.dev',
  'nodejs.org',
  'developer.mozilla.org',
  'pub.dev',
  'npmjs.com',
  'www.npmjs.com',
  'opensource.org',
  'json-schema.org',
  'thaildhe172591.github.io',
  'claude.com',
  'agentskills.io',
  'shields.io',
  'githubusercontent.com',
  'skills.sh',
  'w3.org',
  'keepachangelog.com',
  'semver.org',
  'contributor-covenant.org',
];

// Giá trị trông như placeholder / dữ liệu giả → không phải secret.
const PLACEHOLDER = /^(<[^>]*>|\$\{.*\}|\{[^{}]*\}|(demo|fake|example|dummy|test|sample|your|my)[-_ ].*|x{3,}|\*{3,}|changeme|redacted)$/i;
// Key có tên nhạy cảm nhưng thực chất là hằng số mô tả (vd ACCESS_TOKEN_EXPIRED, token_type).
const NON_SECRET_KEY_SUFFIX = /(expired|invalid|url|uri|path|endpoint|type|name|header|field|label|message|msg|code|key_name|storage_key|registered)$/i;
const SENSITIVE_KEY =
  /(["']?)([A-Za-z0-9_$-]*?(?:secret|password|passwd|pwd|token|api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret)[A-Za-z0-9_$-]*)\1\s*[:=]\s*(["'`])([^\n]*?)\3/gi;

const RULES = [
  {kind: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g},
  {kind: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g},
  {kind: 'google-key', re: /\bAIza[0-9A-Za-z_-]{30,}/g},
  {kind: 'hex32', re: /\b[0-9a-fA-F]{32,}\b/g},
  {kind: 'private-ip', re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g},
  {
    kind: 'code-token',
    re: /\b[A-Z0-9]{12,}\b/g,
    accept: m => (m.match(/\d/g) || []).length >= 3 && (m.match(/[A-Z]/g) || []).length >= 3 && !/^[0-9A-F]{32,}$/.test(m),
  },
];

const PRIORITY = ['private-key', 'jwt', 'google-key', 'hex32', 'private-ip', 'denylist', 'code-token', 'url', 'sensitive-key'];

const looksLikePath =v => /^\/?[a-z][a-z0-9_.-]*(\/[A-Za-z0-9_.{}:-]+)+\/?$/.test(v);
// Đường dẫn JSON / thuộc tính (vd data.token.access) — không phải secret.
const looksLikeDottedPath = v => /^[A-Za-z_$][\w$]*(\.[\w$]+)+$/.test(v);
const looksLikeEnumIdentifier = v => /^[A-Za-z]+(_[A-Za-z0-9]+)+$/.test(v) && (v.match(/\d/g) || []).length <= 2;

function urlFindings(text, allow) {
  const out = [];
  const re = /\b(?:https?|wss?):\/\/[^\s"'`)<>\]\\,;]+/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    if (raw.includes('${') || raw.includes('{{')) continue;
    let host;
    try {
      host = new URL(raw).hostname.toLowerCase();
    } catch {
      host = '';
    }
    const allowed = host && allow.some(a => host === a || host.endsWith('.' + a) || host.endsWith('.test') || host.endsWith('.localhost'));
    if (!allowed) out.push({kind: 'url', start: m.index, end: m.index + raw.length});
  }
  return out;
}

function sensitiveKeyFindings(text) {
  const out = [];
  SENSITIVE_KEY.lastIndex = 0;
  let m;
  while ((m = SENSITIVE_KEY.exec(text))) {
    const [, , key, , value] = m;
    if (value.length < 6) continue;
    if (NON_SECRET_KEY_SUFFIX.test(key)) continue;
    if (PLACEHOLDER.test(value) || /\s/.test(value) || value.includes('example') || value.includes('${')) continue;
    if (looksLikePath(value) || looksLikeDottedPath(value) || looksLikeEnumIdentifier(value) || /^https?:\/\//.test(value)) continue;
    const start = m.index + m[0].length - 1 - value.length;
    out.push({kind: 'sensitive-key', start, end: start + value.length});
  }
  return out;
}

function denyFindings(text, denylist) {
  const out = [];
  const lower = text.toLowerCase();
  for (const word of denylist) {
    if (!word) continue;
    let i = lower.indexOf(word);
    while (i !== -1) {
      out.push({kind: 'denylist', start: i, end: i + word.length});
      i = lower.indexOf(word, i + word.length);
    }
  }
  return out;
}

function lineCol(text, offset) {
  let line = 1;
  let last = -1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      last = i;
    }
  }
  return {line, col: offset - last};
}

function mask(s) {
  return s.length <= 6 ? '***' : `${s.slice(0, 3)}…(${s.length})`;
}

/** Trả về danh sách span có thể là secret, đã sắp xếp và gộp chồng lấn. */
function spans(text, opts = {}) {
  const allow = opts.allowUrls || DEFAULT_URL_ALLOWLIST;
  const all = [...sensitiveKeyFindings(text), ...urlFindings(text, allow), ...denyFindings(text, (opts.denylist || []).map(w => w.toLowerCase()))];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text))) {
      if (rule.accept && !rule.accept(m[0])) continue;
      all.push({kind: rule.kind, start: m.index, end: m.index + m[0].length});
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const keep = new Set(opts.keep || []);
  const merged = [];
  for (const s of all.filter(x => !keep.has(x.kind))) {
    const prev = merged[merged.length - 1];
    if (prev && s.start < prev.end) {
      prev.end = Math.max(prev.end, s.end);
      // Span gộp mang kind cụ thể nhất (vd hex32 thay vì sensitive-key chung chung).
      if (PRIORITY.indexOf(s.kind) < PRIORITY.indexOf(prev.kind)) prev.kind = s.kind;
      continue;
    }
    merged.push({...s});
  }
  return merged;
}

/**
 * @param {string} text
 * @param {{denylist?: string[], allowUrls?: string[], file?: string}} [opts]
 * @returns {{kind: string, line: number, col: number, excerpt: string, start: number, end: number, file?: string}[]}
 */
export function findSecrets(text, opts = {}) {
  return spans(text, opts).map(s => {
    const {line, col} = lineCol(text, s.start);
    const lineStart = text.lastIndexOf('\n', s.start - 1) + 1;
    let lineEnd = text.indexOf('\n', s.start);
    if (lineEnd === -1) lineEnd = text.length;
    const before = text.slice(lineStart, s.start);
    const after = text.slice(s.end, Math.min(lineEnd, s.end + 40));
    const excerpt = (before.slice(-40) + mask(text.slice(s.start, s.end)) + after).trim();
    return {kind: s.kind, line, col, excerpt, start: s.start, end: s.end, ...(opts.file ? {file: opts.file} : {})};
  });
}

/**
 * Che mọi secret: URL → <URL>, còn lại → <REDACTED:kind>.
 * `opts.keep`: các kind được giữ nguyên (scanner giữ 'code-token' vì mã action
 * cần cho project private; repo public thì không giữ).
 * @returns {{text: string, count: number}}
 */
export function redactText(text, opts = {}) {
  const list = spans(text, opts);
  let out = '';
  let pos = 0;
  for (const s of list) {
    out += text.slice(pos, s.start) + (s.kind === 'url' ? '<URL>' : `<REDACTED:${s.kind}>`);
    pos = s.end;
  }
  out += text.slice(pos);
  return {text: out, count: list.length};
}

/** Che secret trong mọi chuỗi của một giá trị JSON (dùng trước khi ghi file). */
export function redactDeep(value, opts = {}) {
  if (typeof value === 'string') return redactText(value, opts).text;
  if (Array.isArray(value)) return value.map(v => redactDeep(v, opts));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v, opts)]));
  return value;
}
