import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findSecrets, redactText} from '../lib/redact.mjs';

// Ghép chuỗi lúc chạy để chính file test không chứa literal giống secret.
const j = (...p) => p.join('');
const HEX32 = j('9f2c', 'ab31', '77de', '4a10', 'b5c6', 'e2f0', '1d3a', '8c47');
const JWT = j('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', '.', 'c2lnbmF0dXJlX2Zha2VfZmFrZQ');
const GKEY = j('AI', 'za', 'Sy', 'D3moFakeKeyFakeKeyFakeKey1234567');
const CODE = j('QX7K', 'D2LM9', 'PZ4WR1');

const kinds = text => findSecrets(text).map(f => f.kind);

test('bắt hex32 dưới key không tên "secret" (vd xSessionToken)', () => {
  assert.ok(kinds(`xSessionToken: '${HEX32}',`).includes('hex32'));
});

test('bắt JWT, Google key, private key', () => {
  assert.ok(kinds(`const t = "${JWT}";`).includes('jwt'));
  assert.ok(kinds(`apiKey: '${GKEY}'`).includes('google-key'));
  assert.ok(kinds(j('-----BEGIN RSA ', 'PRIVATE KEY-----')).includes('private-key'));
});

test('bắt key nhạy cảm có giá trị literal', () => {
  assert.ok(kinds(`SECRET_KEY: '${j('abc', 'def123')}',`).includes('sensitive-key'));
  assert.ok(kinds(`password = "${j('hunter2', 'hunter')}"`).includes('sensitive-key'));
});

test('bắt URL ngoài allowlist và IP private', () => {
  assert.ok(kinds(j(`BASE: 'https://`, 'internal.corp', `.vn/api'`)).includes('url'));
  assert.ok(kinds(j('http://', '10.0', '.0.5', ':8080/x')).includes('private-ip'));
});

test('bắt mã action dạng code-token', () => {
  assert.ok(kinds(`LOGIN: '${CODE}', //đăng nhập`).includes('code-token'));
});

test('bắt từ khoá denylist không phân biệt hoa thường', () => {
  const f = findSecrets('call api/AcmeClaim/execute', {denylist: ['acmeclaim']});
  assert.deepEqual(
    f.map(x => x.kind),
    ['denylist'],
  );
});

test('không bắt placeholder, biến môi trường, dữ liệu demo, URL allowlist', () => {
  const ok = [
    `BASE_URL: 'https://api.example.com/v1'`,
    `LOGIN: 'DEMO_LOGIN',`,
    `SECRET_KEY: process.env.AEGIS_SECRET_KEY,`,
    `SECRET_KEY: '<SECRET_KEY>',`,
    `secret: 'demo-secret',`,
    `see https://github.com/owner/repo and http://localhost:3000`,
    `const SCREEN_ROUTER_APP = {HOME: 'HOME_SCREEN'};`,
    `"xToken": "{session.accessToken}",`,
    `"accessToken": "data.token.access",`,
    `REFRESH_TOKEN: 'api/v1/refresh-token',`,
    `ACCESS_TOKEN_EXPIRED: 'Token has expired.',`,
  ];
  for (const line of ok) assert.deepEqual(kinds(line), [], line);
});

test('excerpt không in nguyên secret', () => {
  const [f] = findSecrets(`xSessionToken: '${HEX32}'`);
  assert.ok(!f.excerpt.includes(HEX32));
});

test('redactText che hết, quét lại không còn gì', () => {
  const src = [
    `SECRET_KEY: '${j('abc', 'def123')}',`,
    `xSessionToken: '${HEX32}',`,
    j(`BASE_URL_API: 'https://`, 'internal.corp', `.vn/api/',`),
    `LOGIN: '${CODE}', // đăng nhập`,
    `jwt: "${JWT}"`,
  ].join('\n');
  const {text, count} = redactText(src);
  assert.ok(count >= 5);
  assert.deepEqual(findSecrets(text), []);
  assert.match(text, /<URL>/);
  assert.match(text, /\/\/ đăng nhập/);
  assert.match(text, /SECRET_KEY: '<REDACTED:sensitive-key>'/);
});

test('keep giữ mã action nhưng vẫn che secret', () => {
  const src = `LOGIN: '${CODE}',\nSECRET_KEY: '${HEX32}',`;
  const {text} = redactText(src, {keep: ['code-token']});
  assert.ok(text.includes(CODE));
  assert.ok(!text.includes(HEX32));
});

test('số dòng/cột đúng', () => {
  const [f] = findSecrets(`a\nb\n  token: '${HEX32}'`);
  assert.equal(f.line, 3);
  assert.ok(f.col > 1);
});
