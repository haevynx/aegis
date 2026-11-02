// Client mẫu chạy theo profile. Lõi thuần: không UI, không điều hướng, không state manager.
// Tầng UI nhận kết quả qua Result + hooks và tự quyết cách hiển thị.
import {sign, signingInput, webCrypto} from './recipes.ts';
import {getPath, resolveTemplate} from './template.ts';
import type {ClientConfig, CryptoProvider, Hooks, HttpRequest, HttpResponse, Json, MatchRule, Profile, Result, Session, SessionStore, Transport} from './types.ts';

export interface ClientOptions {
  profile: Profile;
  config: ClientConfig;
  session: SessionStore;
  device: () => Promise<Record<string, Json>>;
  transport?: Transport;
  hooks?: Hooks;
  clock?: () => Date;
  crypto?: CryptoProvider;
}

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export function fetchTransport(timeoutMs = 300000): Transport {
  return async req => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(req.url, {method: req.method, headers: req.headers, body: JSON.stringify(req.body), signal: ctrl.signal});
      let json: Json | undefined;
      try {
        json = (await res.json()) as Json;
      } catch {
        json = undefined;
      }
      return {status: res.status, json};
    } finally {
      clearTimeout(t);
    }
  };
}

function matches(rule: MatchRule | undefined, message: string | null, code: string | null) {
  if (!rule) return false;
  return (!!message && (rule.messages ?? []).includes(message.trim())) || (!!code && (rule.codes ?? []).includes(code));
}

function extract(map: Record<string, string> | undefined, json: Json | undefined): Session {
  const out: Session = {};
  for (const [key, path] of Object.entries(map ?? {})) {
    const v = getPath(json, path);
    if (v !== undefined) out[key] = v as Json;
  }
  return out;
}

export function createClient(opts: ClientOptions) {
  const {profile, config, session, device, hooks = {}} = opts;
  const transport = opts.transport ?? fetchTransport(profile.transport?.timeoutMs);
  const clock = opts.clock ?? (() => new Date());
  const crypto = opts.crypto ?? webCrypto;

  async function buildRequest(action: string | null, params: Record<string, Json> = {}, o: {route?: string} = {}): Promise<HttpRequest> {
    const routeName = o.route ?? 'execute';
    const route = profile.routes[routeName];
    if (!route) throw new Error(`profile không có route "${routeName}"`);
    const ctx = {config, session: await session.get(), device: await device(), now: clock(), action: route.action ?? action};

    let data: Json;
    let body: Json;
    if (route.body) {
      body = resolveTemplate(route.body, ctx);
      data = body;
    } else {
      const defaults = route.defaults === false ? {} : (resolveTemplate(profile.envelope.defaults ?? {}, ctx) as Record<string, Json>);
      data = {...defaults, ...params};
      const {metaKey, dataKey} = profile.envelope;
      const meta = metaKey ? resolveTemplate(profile.envelope.meta ?? {}, ctx) : undefined;
      if (dataKey) body = metaKey ? {[metaKey]: meta as Json, [dataKey]: data} : {[dataKey]: data};
      else body = metaKey ? {[metaKey]: meta as Json, ...data} : data;
    }

    const headerTpl = route.headers ?? profile.headers;
    let signature = '';
    if (Object.values(headerTpl).some(v => v.includes('{signature}'))) {
      const signing = route.signing ?? profile.signing;
      signature = await sign(signing, signingInput(signing, data, body), config.secret, data, crypto);
    }
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(headerTpl)) {
      const r = resolveTemplate(v, {...ctx, signature});
      headers[k] = r === null || r === undefined ? '' : String(r);
    }
    return {url: joinUrl(config.baseUrl, route.path), method: profile.transport?.method ?? 'POST', headers, body};
  }

  function classify(res: HttpResponse): Result {
    const json = res.json;
    if (!json || typeof json !== 'object') return {kind: 'unexpected', httpStatus: res.status, raw: json};
    const status = getPath(json, profile.response.statusPath);
    const message = (profile.response.messagePath ? getPath(json, profile.response.messagePath) : null) as string | null;
    const code = (profile.response.codePath ? getPath(json, profile.response.codePath) : null) as string | null;
    const data = (profile.response.dataPath ? getPath(json, profile.response.dataPath) : json) as Json;
    const base = {httpStatus: res.status, raw: json, message: message ?? null, code: code ?? null};
    if (profile.response.okValues.includes(status as Json)) return {kind: 'ok', data, ...base};
    if (status === undefined) return {kind: 'unexpected', ...base};
    const s = profile.session;
    if (matches(s.tokenExpired, message, code)) return {kind: 'token-expired', ...base};
    if (matches(s.sessionExpired, message, code)) return {kind: 'session-expired', ...base};
    if (matches(s.authInvalid, message, code)) return {kind: 'auth-invalid', ...base};
    return {kind: 'business-error', data, ...base};
  }

  async function send(req: HttpRequest): Promise<Result> {
    try {
      return classify(await transport(req));
    } catch (error) {
      return {kind: 'network', error, message: error instanceof Error ? error.message : String(error)};
    }
  }

  async function logout(r: Result) {
    await session.clear();
    hooks.onLogout?.(r);
  }

  async function login(credentials: Record<string, Json>): Promise<Result> {
    const r = await send(await buildRequest(null, credentials, {route: 'login'}));
    if (r.kind === 'ok') {
      const next = extract(profile.session.fromLogin, r.raw);
      if (profile.session.relogin === 'stored-credentials') next.credentials = credentials;
      await session.set(next);
    }
    return r;
  }

  async function refresh(): Promise<Result> {
    if (!profile.routes.refresh) return {kind: 'unexpected', message: 'profile không có route refresh'};
    const r = await send(await buildRequest(null, {}, {route: 'refresh'}));
    if (r.kind === 'ok') await session.set({...((await session.get()) ?? {}), ...extract(profile.session.fromRefresh, r.raw)});
    return r;
  }

  type State = {refreshed: boolean; relogged: boolean};

  async function onSessionExpired(r: Result, retry: () => Promise<Result>, st: State): Promise<Result> {
    const creds = (await session.get())?.credentials;
    if (profile.session.relogin === 'stored-credentials' && creds && !st.relogged) {
      st.relogged = true;
      if ((await login(creds)).kind === 'ok') return retry();
      await logout(r);
      return r;
    }
    hooks.onSessionExpired?.(r);
    return r;
  }

  async function run(action: string, params: Record<string, Json>, o: {route?: string}, st: State): Promise<Result> {
    const r = await send(await buildRequest(action, params, o));
    const retry = () => run(action, params, o, st);
    switch (r.kind) {
      case 'token-expired': {
        if (st.refreshed) return r;
        st.refreshed = true;
        const rr = await refresh();
        if (rr.kind === 'ok') return retry();
        if (rr.kind === 'session-expired') return onSessionExpired(rr, retry, st);
        if (rr.kind !== 'network') await logout(rr);
        return rr;
      }
      case 'session-expired':
        return onSessionExpired(r, retry, st);
      case 'auth-invalid':
        await logout(r);
        return r;
      case 'business-error':
        hooks.onServerMessage?.(r);
        return r;
      default:
        return r;
    }
  }

  return {
    buildRequest,
    login,
    refresh,
    logout: () => logout({kind: 'ok'}),
    execute: (action: string, params: Record<string, Json> = {}, o: {route?: string} = {}) => run(action, params, o, {refreshed: false, relogged: false}),
  };
}

export type AegisClient = ReturnType<typeof createClient>;
