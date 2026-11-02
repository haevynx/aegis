// Kiểu dữ liệu dùng chung của client mẫu. Không phụ thuộc framework/UI.

export type Json = null | boolean | number | string | Json[] | {[k: string]: Json};

export interface SigningConfig {
  /** hash-b64url-dot-secret | jws-hs256 | hmac-sha256 | kv-string-hash | none */
  recipe: string;
  /** Ký trên gì: 'data' (dữ liệu nghiệp vụ), 'body' (cả body), 'fields' (chuỗi k=v&…) */
  over?: 'data' | 'body' | 'fields';
  fields?: string[];
  alg?: 'sha256' | 'sha512';
  encoding?: 'hex' | 'base64';
  jwsHeader?: Record<string, Json>;
}

export interface RouteConfig {
  path: string;
  /** Mã action cố định cho route (vd login). */
  action?: string;
  /** Có gộp envelope.defaults vào dữ liệu không (mặc định true). */
  defaults?: boolean;
  signing?: SigningConfig;
  /** Thay toàn bộ bảng header cho route này. */
  headers?: Record<string, string>;
  /** Body cố định dạng template, bỏ qua envelope (vd refresh token). */
  body?: Record<string, Json>;
}

export interface MatchRule {
  messages?: string[];
  codes?: string[];
}

export interface Profile {
  name: string;
  transport?: {method?: string; contentType?: string; timeoutMs?: number};
  envelope: {
    dataKey: string | null;
    metaKey: string | null;
    meta?: Record<string, Json>;
    defaults?: Record<string, Json>;
  };
  headers: Record<string, string>;
  signing: SigningConfig;
  routes: {execute: RouteConfig; login?: RouteConfig; refresh?: RouteConfig; [name: string]: RouteConfig | undefined};
  response: {statusPath: string; okValues: Json[]; messagePath?: string; codePath?: string; dataPath?: string};
  session: {
    fromLogin?: Record<string, string>;
    fromRefresh?: Record<string, string>;
    tokenExpired?: MatchRule;
    sessionExpired?: MatchRule;
    authInvalid?: MatchRule;
    /** 'stored-credentials': khi hết phiên thì login lại bằng thông tin đã lưu. 'none': báo UI. */
    relogin?: 'stored-credentials' | 'none';
  };
  env?: {environments?: string[]; vars?: Record<string, string>};
}

export interface ClientConfig {
  baseUrl: string;
  secret: string;
  partner?: string;
  env?: string;
  [k: string]: Json | undefined;
}

export interface Session {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: Json;
  /** Chỉ có khi profile.session.relogin = 'stored-credentials'. Lưu ở secure storage. */
  credentials?: Record<string, Json>;
  [k: string]: Json | undefined;
}

export interface SessionStore {
  get(): Promise<Session | null>;
  set(session: Session): Promise<void>;
  clear(): Promise<void>;
}

export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Json;
}

export interface HttpResponse {
  status: number;
  json: Json | undefined;
}

export type Transport = (req: HttpRequest) => Promise<HttpResponse>;

export type ResultKind = 'ok' | 'business-error' | 'token-expired' | 'session-expired' | 'auth-invalid' | 'network' | 'unexpected';

export interface Result {
  kind: ResultKind;
  data?: Json;
  message?: string | null;
  code?: string | null;
  httpStatus?: number;
  raw?: Json;
  error?: unknown;
}

export interface Hooks {
  onSessionExpired?(result: Result): void;
  onLogout?(result: Result): void;
  /** Lỗi nghiệp vụ từ server — UI tự quyết hiển thị (alert/toast/inline). */
  onServerMessage?(result: Result): void;
}

export interface CryptoProvider {
  sha256(input: Uint8Array): Promise<Uint8Array>;
  sha512(input: Uint8Array): Promise<Uint8Array>;
  hmacSha256(key: Uint8Array, input: Uint8Array): Promise<Uint8Array>;
}
