// doctor — báo mức sẵn sàng và bước tiếp theo.
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {KIT_VERSION, aegisHome, gitTracks, loadConfig, paths, projectRoot, readJson, refPath} from '../project.mjs';
import {validateProfile} from '../profile-check.mjs';
import {skillTargets, kitSkills} from './install.mjs';
import {allActions, placeholders} from './knowledge.mjs';

const mark = ok => (ok ? '✔' : '✖');

function envKeys(root) {
  const f = join(root, '.env');
  if (!existsSync(f)) return null;
  const keys = new Map();
  for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) keys.set(m[1], m[2].trim().replace(/^['"]|['"]$/g, '') !== '');
  }
  return keys;
}

export function diagnose(root) {
  const p = paths(root);
  const config = existsSync(p.config) ? loadConfig(root) : null;
  const skillsOk = kitSkills().every(n => skillTargets({project: false, root}).concat(skillTargets({project: true, root})).some(b => existsSync(join(b, n, 'SKILL.md'))));
  const refs = (config?.refs ?? []).map(r => ({name: r.name, git: r.git ?? null, path: refPath(root, r), exists: !!refPath(root, r) && existsSync(refPath(root, r))}));
  const kdirs = existsSync(p.knowledge) ? readdirSync(p.knowledge).filter(d => existsSync(join(p.knowledge, d, 'knowledge.json')) || existsSync(join(p.knowledge, d, 'actions.json'))) : [];
  const profile = readJson(p.profile);
  const profileErrors = profile ? validateProfile(profile) : null;
  const vectors = existsSync(p.vectors) ? readdirSync(p.vectors).filter(f => f.endsWith('.json')) : [];
  const vars = Object.values(profile?.env?.vars ?? {AEGIS_BASE_URL: 1, AEGIS_SECRET_KEY: 1}).filter(v => typeof v === 'string');
  const env = envKeys(root);
  const envMissing = env ? vars.filter(v => !env.get(v)) : vars;
  const gitignore = existsSync(join(root, '.gitignore')) && /^\.env$/m.test(readFileSync(join(root, '.gitignore'), 'utf8'));
  const envTracked = gitTracks(root, '.env');
  const actions = new Set(allActions(root).map(a => a.key));
  const missingActions = [...placeholders(root)].filter(([k]) => !actions.has(k));

  let level;
  if (!config) level = 'chua-cai';
  else if (!kdirs.length && !profile) level = refs.length ? 'chua-quet' : 'chi-giao-thuc';
  else if (!profile || profileErrors?.length) level = 'thieu-profile';
  else if (envMissing.length) level = 'thieu-env';
  else level = 'san-sang';
  return {kit: KIT_VERSION, home: aegisHome(), skillsOk, config: !!config, refs, knowledge: kdirs, lastScan: config?.lastScan ?? null, profile: !!profile, profileErrors, vectors, env: !!env, envMissing, gitignore, envTracked, missingActions, level};
}

const NEXT = {
  'chua-cai': 'aegis install (trong thư mục gốc project)',
  'chi-giao-thuc': 'aegis ref add <path|git-url>  — không có source? aegis import <project-khác> hoặc làm theo "chế độ chỉ giao thức" (skill aegis-learn)',
  'chua-quet': 'aegis scan',
  'thieu-profile': 'aegis profile learn → agent điền profile.json → người dùng duyệt → aegis profile check',
  'thieu-env': 'người dùng tự điền .env (xem .env.example) — agent không tự lấy secret',
  'san-sang': 'tích hợp client (skill aegis-integrate) · làm chức năng: aegis feature <tên>',
};

export function cmdDoctor({opts}) {
  const root = projectRoot(opts.dir || process.cwd());
  const d = diagnose(root);
  if (opts.json) {
    console.log(JSON.stringify(d, null, 2));
    return d.envTracked ? 1 : 0;
  }
  console.log(`aegis ${d.kit} · project: ${root}\n`);
  console.log(`${mark(d.skillsOk)} skill đã cài (global hoặc project)`);
  console.log(`${mark(d.config)} .aegis/config.json`);
  for (const r of d.refs) console.log(`${mark(r.exists)} ref ${r.name}${r.git ? ` (git)` : ''} ${r.exists ? '' : '— chưa có trên máy này'}`);
  if (!d.refs.length) console.log('· chưa khai báo app tham chiếu');
  console.log(`${mark(d.knowledge.length)} knowledge: ${d.knowledge.join(', ') || '—'}${d.lastScan ? ` (quét ${d.lastScan.ref} @ ${d.lastScan.commit ?? '—'}, ${d.lastScan.at.slice(0, 10)})` : ''}`);
  console.log(`${mark(d.profile && !d.profileErrors?.length)} profile${d.profileErrors?.length ? ` — ${d.profileErrors.length} lỗi (aegis profile check)` : d.profile ? '' : ' — chưa có'}`);
  console.log(`${mark(d.vectors.length)} vector local: ${d.vectors.length}`);
  console.log(`${mark(d.env && !d.envMissing.length)} .env${d.env ? (d.envMissing.length ? ` — thiếu/rỗng: ${d.envMissing.join(', ')}` : '') : ' — chưa có'}`);
  console.log(`${mark(d.gitignore)} .env nằm trong .gitignore`);
  if (d.envTracked) console.log('✖ .env ĐANG BỊ GIT THEO DÕI — git rm --cached .env và đổi toàn bộ secret');
  if (d.missingActions.length) {
    console.log(`✖ ${d.missingActions.length} placeholder <ACTION:…> chưa có mã:`);
    for (const [k, src] of d.missingActions) console.log(`    ${k}  (${src})`);
  }
  console.log(`\nMức: ${d.level}\n→ ${NEXT[d.level]}`);
  return d.envTracked ? 1 : 0;
}
