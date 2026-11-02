#!/usr/bin/env node
// Sinh profiles/demo/vectors.json — viết tay theo profile demo, KHÔNG dùng template engine của client,
// để test client đối chiếu với một implementation độc lập.
import {writeFileSync} from 'node:fs';
import {sign, signingInput} from '../lib/recipes.mjs';

const SECRET = 'demo-secret';
const config = {baseUrl: 'https://api.example.com/', secret: SECRET, partner: 'DEMO_MOBILE', env: 'DEV'};
const device = {id: 'device-0001', bundleId: 'com.example.demo', userAgent: 'Demo/1.0'};
const now = '2026-01-02T03:04:05';
const time = '20260102030405';
const session = {accessToken: 'demo-access', refreshToken: 'demo-refresh', user: {username: 'nguyenvana', branch: null}};
const meta = {app: device.bundleId, agent: device.userAgent, device: device.id, time};
// branch: `x || null` (falsy → null); username: thiếu thì BỎ key (JSON.stringify bỏ undefined).
const defaults = s => JSON.parse(JSON.stringify({channel: 'MOBILE', device_id: device.id, partner: config.partner, branch: s?.user?.branch || null, username: s?.user?.username}));

function execCase(name, action, params, s = session) {
  const data = {...defaults(s), ...params};
  const signature = sign({recipe: 'hash-b64url-dot-secret', alg: 'sha256', encoding: 'hex'}, signingInput({over: 'data'}, data), SECRET);
  return {
    name,
    call: {route: 'execute', action, params},
    session: s,
    expect: {
      url: 'https://api.example.com/v1/execute',
      method: 'POST',
      headers: {'Content-Type': 'application/json', xPartner: 'DEMO_MOBILE', xAction: action, xToken: s?.accessToken ?? '', xEnv: 'DEV', xSign: signature},
      body: {meta, payload: data},
    },
  };
}

const loginParams = {username: 'nguyenvana', password: 'demo-password', device_id: device.id};
const jwsHeader = {alg: 'HS256', typ: 'JWT', partner: 'DEMO_MOBILE'};
const vectors = {
  profile: 'demo',
  secret: SECRET,
  config,
  device,
  now,
  cases: [
    execCase('execute: tiếng Việt có dấu, null, số 0, object lồng', 'DEMO_CLAIM_LIST', {
      ten_khach_hang: 'Nguyễn Văn A — “Bảo hiểm” ô tô',
      so_tien: 0,
      ghi_chu: null,
      bo_loc: {trang: 1, so_dong: 20, trang_thai: ['MOI', 'DANG_XU_LY']},
    }),
    execCase('execute: params ghi đè defaults, giữ thứ tự key', 'DEMO_CLAIM_DETAIL', {channel: 'WEB', claim_id: 123456789012, z: 1, a: 2}),
    execCase('execute: chưa đăng nhập (không có session) — username bị bỏ, branch = null', 'DEMO_APP_VERSION', {platform: 'ios'}, null),
    execCase('execute: branch rỗng → null (|| null)', 'DEMO_CLAIM_LIST', {}, {...session, user: {username: 'nguyenvana', branch: ''}}),
    {
      name: 'login: JWS HS256, không gộp defaults',
      call: {route: 'login', params: loginParams},
      session: null,
      expect: {
        url: 'https://api.example.com/v1/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          xPartner: 'DEMO_MOBILE',
          xAction: 'DEMO_LOGIN',
          xSign: sign({recipe: 'jws-hs256', jwsHeader}, null, SECRET, loginParams),
        },
        body: {meta, payload: loginParams},
      },
    },
    {
      name: 'refresh: body cố định, header rút gọn',
      call: {route: 'refresh'},
      session,
      expect: {
        url: 'https://api.example.com/v1/refresh',
        method: 'POST',
        headers: {'Content-Type': 'application/json', xPartner: 'DEMO_MOBILE'},
        body: {access: 'demo-access', refresh: 'demo-refresh'},
      },
    },
  ],
};
writeFileSync(new URL('../profiles/demo/vectors.json', import.meta.url), JSON.stringify(vectors, null, 2) + '\n');
console.log(`✔ ${vectors.cases.length} vector`);
