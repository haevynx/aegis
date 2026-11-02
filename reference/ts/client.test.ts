import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClient} from './client.ts';
import type {HttpRequest, HttpResponse, Profile, Session, SessionStore} from './types.ts';

const root = new URL('../../profiles/demo/', import.meta.url);
const profile: Profile = JSON.parse(readFileSync(new URL('profile.json', root), 'utf8'));
const vectors = JSON.parse(readFileSync(new URL('vectors.json', root), 'utf8'));

function memoryStore(initial: Session | null): SessionStore & {value: Session | null; cleared: number} {
  const s = {
    value: initial,
    cleared: 0,
    async get() {
      return s.value;
    },
    async set(v: Session) {
      s.value = v;
    },
    async clear() {
      s.value = null;
      s.cleared++;
    },
  };
  return s;
}

function make(session: Session | null, transport?: (req: HttpRequest) => Promise<HttpResponse>, hooks = {}) {
  const store = memoryStore(session);
  const client = createClient({
    profile,
    config: vectors.config,
    session: store,
    device: async () => vectors.device,
    clock: () => new Date(vectors.now),
    transport: transport ?? (async () => ({status: 200, json: {status: {code: 'OK'}, data: {}}})),
    hooks,
  });
  return {client, store};
}

for (const c of vectors.cases) {
  test(`vector: ${c.name}`, async () => {
    const {client} = make(c.session);
    const req = await client.buildRequest(c.call.action ?? null, c.call.params ?? {}, {route: c.call.route});
    // So từng byte: thứ tự key cũng phải khớp.
    assert.equal(JSON.stringify(req.headers), JSON.stringify(c.expect.headers));
    assert.equal(JSON.stringify(req.body), JSON.stringify(c.expect.body));
    assert.equal(req.url, c.expect.url);
    assert.equal(req.method, c.expect.method);
  });
}

const ok = (data: unknown = {}) => ({status: 200, json: {status: {code: 'OK'}, data}}) as HttpResponse;
const notOk = (message: string, error: string | null = null) => ({status: 200, json: {status: {code: 'FAIL', message, error}}}) as HttpResponse;
const session = (): Session => ({accessToken: 'demo-old', refreshToken: 'demo-refresh', user: {username: 'u'}, credentials: {username: 'u', password: 'demo-password'}});

test('token hết hạn → refresh đúng 1 lần → gọi lại → ok', async () => {
  const calls: string[] = [];
  const {client, store} = make(session(), async req => {
    calls.push(req.url.split('/').pop()!);
    if (req.url.endsWith('refresh')) return ok({access: 'demo-new', refresh: 'demo-refresh-2'});
    return req.headers.xToken === 'demo-new' ? ok({rows: [1]}) : notOk('Token has expired.');
  });
  const r = await client.execute('DEMO_CLAIM_LIST', {});
  assert.equal(r.kind, 'ok');
  assert.deepEqual(r.data, {rows: [1]});
  assert.deepEqual(calls, ['execute', 'refresh', 'execute']);
  assert.equal(store.value?.accessToken, 'demo-new');
});

test('token vẫn hết hạn sau refresh → không lặp vô hạn', async () => {
  let n = 0;
  const {client} = make(session(), async req => {
    n++;
    return req.url.endsWith('refresh') ? ok({access: 'demo-new'}) : notOk('Token has expired.');
  });
  const r = await client.execute('DEMO_CLAIM_LIST', {});
  assert.equal(r.kind, 'token-expired');
  assert.equal(n, 3);
});

test('phiên hết hạn → login lại bằng credentials đã lưu → gọi lại', async () => {
  const calls: string[] = [];
  const {client, store} = make(session(), async req => {
    const last = req.url.split('/').pop()!;
    calls.push(last);
    if (last === 'login') return ok({token: {access: 'demo-relogin', refresh: 'demo-r'}, user: {username: 'u'}});
    return req.headers.xToken === 'demo-relogin' ? ok('done') : notOk('Session has expired.');
  });
  const r = await client.execute('DEMO_CLAIM_LIST', {});
  assert.equal(r.kind, 'ok');
  assert.deepEqual(calls, ['execute', 'login', 'execute']);
  assert.equal(store.value?.accessToken, 'demo-relogin');
  assert.deepEqual(store.value?.credentials, session().credentials);
});

test('refresh báo phiên hết hạn → chuyển sang login lại', async () => {
  const calls: string[] = [];
  const {client} = make(session(), async req => {
    const last = req.url.split('/').pop()!;
    calls.push(last);
    if (last === 'refresh') return notOk('Session has expired.');
    if (last === 'login') return ok({token: {access: 'demo-relogin'}});
    return req.headers.xToken === 'demo-relogin' ? ok() : notOk('Token has expired.');
  });
  assert.equal((await client.execute('DEMO_X', {})).kind, 'ok');
  assert.deepEqual(calls, ['execute', 'refresh', 'login', 'execute']);
});

test('auth-invalid → xoá session + onLogout, không retry', async () => {
  let logout = 0;
  let n = 0;
  const {client, store} = make(
    session(),
    async () => {
      n++;
      return notOk('whatever', 'E_AUTH');
    },
    {onLogout: () => logout++},
  );
  const r = await client.execute('DEMO_X', {});
  assert.equal(r.kind, 'auth-invalid');
  assert.equal(n, 1);
  assert.equal(logout, 1);
  assert.equal(store.value, null);
});

test('login lại thất bại → logout', async () => {
  let logout = 0;
  const {client, store} = make(session(), async req => (req.url.endsWith('login') ? notOk('Wrong password') : notOk('Session has expired.')), {onLogout: () => logout++});
  const r = await client.execute('DEMO_X', {});
  assert.equal(r.kind, 'session-expired');
  assert.equal(logout, 1);
  assert.equal(store.cleared, 1);
});

test('lỗi nghiệp vụ → onServerMessage, trả message/code', async () => {
  const seen: string[] = [];
  const {client} = make(session(), async () => notOk('Hồ sơ chưa đủ ảnh', 'E_BIZ'), {onServerMessage: (r: any) => seen.push(r.message)});
  const r = await client.execute('DEMO_X', {});
  assert.equal(r.kind, 'business-error');
  assert.equal(r.message, 'Hồ sơ chưa đủ ảnh');
  assert.equal(r.code, 'E_BIZ');
  assert.deepEqual(seen, ['Hồ sơ chưa đủ ảnh']);
});

test('transport ném lỗi → network', async () => {
  const {client} = make(session(), async () => {
    throw new Error('Network Error');
  });
  const r = await client.execute('DEMO_X', {});
  assert.equal(r.kind, 'network');
});

test('response không đúng dạng → unexpected', async () => {
  const {client} = make(session(), async () => ({status: 502, json: undefined}));
  const r = await client.execute('DEMO_X', {});
  assert.equal(r.kind, 'unexpected');
  assert.equal(r.httpStatus, 502);
});

test('login thành công lưu session (kèm credentials khi relogin=stored-credentials)', async () => {
  const {client, store} = make(null, async () => ok({token: {access: 'demo-a', refresh: 'demo-r'}, user: {username: 'nguyenvana'}}));
  const r = await client.login({username: 'nguyenvana', password: 'demo-password'});
  assert.equal(r.kind, 'ok');
  assert.equal(store.value?.accessToken, 'demo-a');
  assert.deepEqual(store.value?.user, {username: 'nguyenvana'});
  assert.equal((store.value?.credentials as any).username, 'nguyenvana');
});

test('lõi không import UI/framework', () => {
  for (const f of ['client.ts', 'recipes.ts', 'template.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from ['"](react|react-native|vue|@reduxjs|zustand|axios)/);
  }
});
