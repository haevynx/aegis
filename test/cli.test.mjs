import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';

const BIN = new URL('../bin/aegis.mjs', import.meta.url).pathname;
const DEMO = new URL('../examples/demo-app', import.meta.url).pathname;
const DEMO_PROFILE = new URL('../profiles/demo/', import.meta.url).pathname;
const j = (...p) => p.join('');

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), 'aegis-home-'));
  const proj = mkdtempSync(join(tmpdir(), 'aegis-proj-'));
  execFileSync('git', ['init', '-q'], {cwd: proj});
  writeFileSync(join(proj, 'package.json'), '{"name":"app-moi","dependencies":{"react":"19.0.0","zustand":"5.0.0"}}');
  const run = (...args) => {
    const r = spawnSync(process.execPath, [BIN, ...args], {cwd: proj, encoding: 'utf8', env: {...process.env, HOME: home, AEGIS_HOME: join(home, '.aegis')}});
    return {code: r.status, out: r.stdout + r.stderr};
  };
  return {home, proj, run};
}

test('install: idempotent, giữ nội dung người dùng, cài skill + kit', () => {
  const {home, proj, run} = sandbox();
  writeFileSync(join(proj, 'CLAUDE.md'), '# Ghi chú của tôi\n\nĐừng xoá dòng này.\n');
  assert.equal(run('install').code, 0);
  assert.equal(run('install').code, 0);
  const claude = readFileSync(join(proj, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /Đừng xoá dòng này\./);
  assert.equal(claude.split('<!-- aegis:begin').length - 1, 1);
  assert.ok(existsSync(join(proj, 'AGENTS.md')));
  assert.ok(existsSync(join(proj, '.aegis/config.json')));
  assert.ok(existsSync(join(proj, '.env.example')));
  assert.ok(existsSync(join(home, '.aegis/kit/bin/aegis.mjs')));
  const gi = readFileSync(join(proj, '.gitignore'), 'utf8');
  assert.equal(gi.split(/\r?\n/).filter(l => l === '.env').length, 1);
  assert.match(gi, /\.aegis\/local\.json/);
});

test('install không đè skill cùng tên do người dùng tự viết', () => {
  const {home, run} = sandbox();
  mkdirSync(join(home, '.claude/skills/aegis-integrate'), {recursive: true});
  writeFileSync(join(home, '.claude/skills/aegis-integrate/SKILL.md'), 'của tôi');
  run('install', '--skills-only');
  assert.equal(readFileSync(join(home, '.claude/skills/aegis-integrate/SKILL.md'), 'utf8'), 'của tôi');
});

test('doctor: chỉ-giao-thức → chưa quét → thiếu profile; báo .env bị track', () => {
  const {proj, run} = sandbox();
  run('install');
  assert.match(run('doctor').out, /Mức: chi-giao-thuc/);
  run('ref', 'add', DEMO, '--name', 'demo');
  assert.match(run('doctor').out, /Mức: chua-quet/);
  assert.equal(run('scan').code, 0);
  assert.match(run('doctor').out, /Mức: thieu-profile/);
  writeFileSync(join(proj, '.env'), 'AEGIS_SECRET_KEY=x\n');
  execFileSync('git', ['add', '-f', '.env'], {cwd: proj});
  const d = run('doctor');
  assert.equal(d.code, 1);
  assert.match(d.out, /ĐANG BỊ GIT THEO DÕI/);
});

test('ref add + scan: ghi knowledge, đường dẫn local không vào config.json', () => {
  const {proj, run} = sandbox();
  run('install');
  run('ref', 'add', DEMO, '--name', 'demo');
  const r = run('scan');
  assert.equal(r.code, 0, r.out);
  const actions = JSON.parse(readFileSync(join(proj, '.aegis/knowledge/demo/actions.json'), 'utf8'));
  assert.equal(actions.length, 5);
  const config = readFileSync(join(proj, '.aegis/config.json'), 'utf8');
  assert.ok(!config.includes(DEMO), 'config.json không được chứa đường dẫn máy cá nhân');
  assert.ok(readFileSync(join(proj, '.aegis/local.json'), 'utf8').includes(DEMO));
  const k = readFileSync(join(proj, '.aegis/knowledge/demo/knowledge.json'), 'utf8');
  assert.ok(!k.includes(DEMO) && !k.includes('demo-secret-dev'));
});

test('feature: ghi chi tiết + actionIndex có mã', () => {
  const {proj, run} = sandbox();
  run('install');
  run('ref', 'add', DEMO, '--name', 'demo');
  run('scan');
  const r = run('feature', 'ClaimInspection');
  assert.equal(r.code, 0, r.out);
  const f = JSON.parse(readFileSync(join(proj, '.aegis/knowledge/demo/features/claim-inspection.json'), 'utf8'));
  assert.deepEqual(f.actionIndex.map(a => a.value).sort(), ['DEMO_CLAIM_DETAIL', 'DEMO_CLAIM_FINISH', 'DEMO_PHOTO_UPLOAD']);
  assert.equal(run('feature', 'KhongCo').code, 1);
});

test('profile learn → khung còn TODO → check fail; profile demo + vector → pass', {skip: !process.features?.typescript && 'cần Node ≥ 22.18 (type stripping)'}, () => {
  const {proj, run} = sandbox();
  run('install');
  run('ref', 'add', DEMO, '--name', 'demo');
  run('scan');
  assert.equal(run('profile', 'learn').code, 0);
  assert.match(readFileSync(join(proj, '.aegis/learn/profile-sources.md'), 'utf8'), /src\/services\/client\.ts/);
  const bad = run('profile', 'check');
  assert.equal(bad.code, 1);
  assert.match(bad.out, /TODO/);
  cpSync(join(DEMO_PROFILE, 'profile.json'), join(proj, '.aegis/profile/profile.json'));
  mkdirSync(join(proj, '.aegis/vectors'), {recursive: true});
  cpSync(join(DEMO_PROFILE, 'vectors.json'), join(proj, '.aegis/vectors/demo.json'));
  const ok = run('profile', 'check');
  assert.equal(ok.code, 0, ok.out);
  assert.match(ok.out, /6\/6 vector khớp/);
});

test('action add + placeholder thiếu mã', () => {
  const {proj, run} = sandbox();
  run('install');
  mkdirSync(join(proj, 'src'));
  writeFileSync(join(proj, 'src/api.ts'), "execute('<ACTION:CLAIM_LIST>', {});\nexecute('<ACTION:CLAIM_CLOSE>', {});\n");
  run('action', 'add', 'CLAIM_LIST', 'DEMO_CLAIM_LIST', 'danh sách hồ sơ');
  const m = run('action', 'list', '--missing').out;
  assert.match(m, /THIẾU CLAIM_CLOSE/);
  assert.doesNotMatch(m, /THIẾU CLAIM_LIST/);
  assert.match(run('doctor').out, /CLAIM_CLOSE {2}\(src\/api\.ts:2\)/);
});

test('import từ project khác', () => {
  const a = sandbox();
  a.run('install');
  a.run('ref', 'add', DEMO, '--name', 'demo');
  a.run('scan');
  const b = sandbox();
  b.run('install');
  const r = b.run('import', a.proj);
  assert.equal(r.code, 0, r.out);
  assert.ok(existsSync(join(b.proj, '.aegis/knowledge/demo/actions.json')));
  assert.match(b.run('doctor').out, /Mức: thieu-profile/);
});

test('scan-secrets: exit 1 khi có secret', () => {
  const {proj, run} = sandbox();
  writeFileSync(join(proj, 'x.ts'), j(`const SECRET_KEY = '`, 'realLooking', `Value99';\n`));
  assert.equal(run('scan-secrets', proj).code, 1);
});

test('lệnh lạ → exit 2 + help', () => {
  const {run} = sandbox();
  const r = run('khong-co-lenh-nay');
  assert.equal(r.code, 2);
  assert.match(r.out, /Cài đặt/);
});

test('--version / --help không bao giờ chạy install', () => {
  const {home, proj, run} = sandbox();
  for (const flag of ['--version', '-v', '--help', '-h']) {
    const r = run(flag);
    assert.equal(r.code, 0, flag);
    assert.ok(!existsSync(join(home, '.claude')), `${flag} đã cài skill`);
    assert.ok(!existsSync(join(proj, '.aegis')), `${flag} đã cấu hình project`);
  }
  assert.match(run('--version').out.trim(), /^\d+\.\d+\.\d+$/);
});

test('bản đã cài (~/.aegis/kit) gọi không tham số → chỉ in help, không cấu hình project', () => {
  const {home, proj, run} = sandbox();
  run('install', '--skills-only');
  const kitBin = join(home, '.aegis/kit/bin/aegis.mjs');
  const r = spawnSync(process.execPath, [kitBin], {cwd: proj, encoding: 'utf8', env: {...process.env, HOME: home, AEGIS_HOME: join(home, '.aegis')}});
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Cài đặt/);
  assert.ok(!existsSync(join(proj, '.aegis')));
  assert.ok(!existsSync(join(proj, 'CLAUDE.md')));
});
