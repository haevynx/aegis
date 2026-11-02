// Kiểm tra profile.json theo spec/profile-schema.md.
import {RECIPES} from './recipes.mjs';

const ROOTS = new Set(['config', 'session', 'device', 'action', 'signature']);

function walkStrings(v, path, fn) {
  if (typeof v === 'string') fn(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, `${path}[${i}]`, fn));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, path ? `${path}.${k}` : k, fn);
}

/** @returns {string[]} danh sách lỗi (rỗng = hợp lệ) */
export function validateProfile(p) {
  const errs = [];
  const need = (cond, msg) => cond || errs.push(msg);
  if (!p || typeof p !== 'object') return ['profile không phải JSON object'];
  need(typeof p.name === 'string' && p.name, 'thiếu "name"');
  need(p.envelope && typeof p.envelope === 'object', 'thiếu "envelope"');
  if (p.envelope) {
    need('dataKey' in p.envelope, 'envelope.dataKey bắt buộc (string hoặc null)');
    need('metaKey' in p.envelope, 'envelope.metaKey bắt buộc (string hoặc null)');
  }
  need(p.headers && typeof p.headers === 'object' && Object.values(p.headers).every(v => typeof v === 'string'), '"headers" phải là object {tên: template chuỗi}');
  need(p.signing && RECIPES.includes(p.signing.recipe), `signing.recipe phải là một trong: ${RECIPES.join(', ')}`);
  need(p.routes?.execute?.path, 'thiếu routes.execute.path');
  for (const [name, r] of Object.entries(p.routes ?? {})) {
    if (r?.signing) need(RECIPES.includes(r.signing.recipe), `routes.${name}.signing.recipe không hợp lệ`);
    if (r?.headers) need(Object.values(r.headers).every(v => typeof v === 'string'), `routes.${name}.headers phải là chuỗi`);
  }
  need(typeof p.response?.statusPath === 'string', 'thiếu response.statusPath');
  need(Array.isArray(p.response?.okValues) && p.response.okValues.length, 'response.okValues phải là mảng không rỗng');
  need(p.session && typeof p.session === 'object', 'thiếu "session"');
  if (p.session?.relogin) need(['stored-credentials', 'none'].includes(p.session.relogin), 'session.relogin: stored-credentials | none');
  walkStrings(p, '', (s, path) => {
    if (/\bTODO\b/.test(s)) errs.push(`${path}: còn TODO`);
    for (const m of s.matchAll(/\{([^{}]+)\}/g)) {
      const root = m[1].startsWith('now:') ? 'now' : m[1].split('.')[0];
      if (root !== 'now' && !ROOTS.has(root) && /^(envelope|headers|routes)/.test(path)) errs.push(`${path}: template "{${m[1]}}" không hợp lệ (dùng config|session|device|action|signature|now:fmt)`);
    }
  });
  return errs;
}
