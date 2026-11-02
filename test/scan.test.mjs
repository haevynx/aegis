import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scanRef, scanFeature} from '../lib/scan/index.mjs';
import {findRoutes} from '../lib/scan/routes.mjs';
import {findSecrets} from '../lib/redact.mjs';

const DEMO = new URL('../examples/demo-app', import.meta.url).pathname;
const k = scanRef(DEMO);
const byKey = list => Object.fromEntries(list.map(e => [e.key, e]));

test('nhận diện stack', () => {
  assert.equal(k.stack.platform, 'react-native');
  assert.ok(k.stack.state.includes('redux-toolkit'));
  assert.ok(k.stack.http.includes('axios'));
});

test('3 môi trường, secret và URL bị che, bỏ qua môi trường đã comment', () => {
  assert.deepEqual(
    k.environments.map(e => e.name),
    ['ENV_DEV', 'ENV_UAT', 'ENV_PROD'],
  );
  const dev = byKey(k.environments[0].fields);
  assert.equal(dev.SECRET_KEY.value, '<REDACTED:secret>');
  assert.equal(dev.SECRET_KEY.envVar, 'AEGIS_SECRET_KEY');
  assert.equal(dev.BASE_URL.value, '<URL>');
  assert.equal(dev.BASE_URL.envVar, 'AEGIS_BASE_URL');
  assert.equal(dev.PARTNER_CODE.value, 'DEMO_MOBILE');
  assert.match(k.environments[0].source, /src\/services\/config\.ts:\d+/);
});

test('endpoint và action có comment + nguồn file:line', () => {
  const ep = byKey(k.endpoints);
  assert.equal(ep.EXECUTE.value, 'v1/execute');
  assert.equal(ep.LOGIN.comment, 'đăng nhập');
  const ac = byKey(k.actions);
  assert.deepEqual(Object.keys(ac).sort(), ['CLAIM_DETAIL', 'CLAIM_FINISH', 'CLAIM_LIST', 'LOGIN', 'PHOTO_UPLOAD']);
  assert.equal(ac.CLAIM_FINISH.comment, 'kết thúc giám định');
  assert.equal(ac.CLAIM_LIST.source, 'src/services/config.ts:39');
});

test('message server', () => {
  const m = k.serverMessages.map(e => e.value);
  assert.ok(m.includes('Token has expired.'));
  assert.ok(m.includes('Signed in on another device.'));
});

test('file HTTP có bằng chứng ký/header/phiên', () => {
  const f = k.httpFiles.find(h => h.file === 'src/services/client.ts');
  assert.ok(f);
  assert.equal(f.confidence, 'high');
  const lines = f.evidence.map(e => e.text).join('\n');
  assert.match(lines, /sha256/);
  assert.match(lines, /interceptors/);
});

test('route và feature', () => {
  assert.deepEqual(k.routes.map(r => r.component).sort(), ['ClaimInspectionScreen', 'ClaimListScreen', 'LoginScreen']);
  const slugs = k.features.map(f => f.path).sort();
  assert.deepEqual(slugs, ['src/screens/ClaimInspection', 'src/screens/ClaimList', 'src/screens/Login']);
  const insp = k.features.find(f => f.path === 'src/screens/ClaimInspection');
  assert.deepEqual(insp.actions.sort(), ['CLAIM_DETAIL', 'CLAIM_FINISH', 'PHOTO_UPLOAD']);
});

test('scanFeature: màn, trường, action, điều kiện, message, điều hướng', () => {
  const f = scanFeature(DEMO, 'ClaimInspection');
  assert.equal(f.slug, 'claim-inspection');
  const files = f.screens.map(s => s.file).sort();
  assert.deepEqual(files, ['src/screens/ClaimInspection/ClaimInspectionScreen.tsx', 'src/screens/ClaimInspection/components/PhotoStep.tsx']);
  const all = key => f.screens.flatMap(s => s[key]);
  assert.ok(all('fields').some(x => x.name === 'hang_muc' && x.label === 'Hạng mục tổn thất' && x.required));
  assert.deepEqual([...new Set(all('actions').map(a => a.key))].sort(), ['CLAIM_DETAIL', 'CLAIM_FINISH', 'PHOTO_UPLOAD']);
  assert.ok(all('conditions').some(c => c.text.includes('photos.length < 4')));
  assert.ok(all('messages').some(m => m.text === 'Cần chụp tối thiểu 4 ảnh tổn thất'));
  assert.ok(all('navigation').some(n => n.target === 'SCHEDULE_SCREEN'));
  assert.ok(all('components').includes('Stepper'));
  for (const s of f.screens) for (const c of s.conditions) assert.match(c.source, /:\d+$/);
});

test('scanFeature không tìm thấy → null', () => {
  assert.equal(scanFeature(DEMO, 'KhongTonTai'), null);
});

test('kết quả scan không chứa secret (trừ mã action được giữ)', () => {
  const text = JSON.stringify(k) + JSON.stringify(scanFeature(DEMO, 'ClaimInspection'));
  assert.deepEqual(findSecrets(text), []);
  assert.ok(!text.includes('demo-secret-dev'));
  assert.ok(!text.includes('dev.api.example.com'));
});

test('thư mục rỗng → mảng rỗng, không lỗi', () => {
  const d = mkdtempSync(join(tmpdir(), 'aegis-empty-'));
  const r = scanRef(d);
  assert.deepEqual([r.environments, r.endpoints, r.actions, r.features, r.httpFiles], [[], [], [], [], []]);
  assert.equal(r.stack.platform, 'unknown');
});

test('bố cục lạ: chỉ có src/api.ts → httpFiles độ tin cậy thấp + unknownFiles', () => {
  const d = mkdtempSync(join(tmpdir(), 'aegis-odd-'));
  mkdirSync(join(d, 'src'));
  writeFileSync(join(d, 'src/api.ts'), `export const get = (u) => fetch(u).then(r => r.json());\n`);
  const r = scanRef(d);
  assert.equal(r.httpFiles.length, 1);
  assert.equal(r.httpFiles[0].confidence, 'low');
  assert.ok(r.unknownFiles.includes('src/api.ts'));
});

test('route dạng bảng [HẰNG_SỐ]: Màn hình', () => {
  const src = `export default {\n  [ROUTES.CLAIM_LIST]: ClaimListScreen,\n  PROFILE_SCREEN: ProfileScreen,\n  // [ROUTES.OLD]: OldScreen,\n  TIMEOUT: 3000,\n};`;
  const r = findRoutes('src/navigation/routes.ts', src);
  assert.deepEqual(
    r.map(x => [x.name, x.component, x.source]),
    [
      ['ROUTES.CLAIM_LIST', 'ClaimListScreen', 'src/navigation/routes.ts:2'],
      ['PROFILE_SCREEN', 'ProfileScreen', 'src/navigation/routes.ts:3'],
    ],
  );
});
