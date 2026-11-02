// Công thức ký tổng quát. Crypto được inject để chạy được trên web, React Native, Node, Deno…
import type {CryptoProvider, Json, SigningConfig} from './types.ts';

const enc = new TextEncoder();
export const utf8 = (s: string) => enc.encode(s);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}
export const base64url = (bytes: Uint8Array) => base64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/** Mặc định dùng WebCrypto (trình duyệt, Node ≥ 19, Deno, Bun). React Native: inject provider (vd react-native-quick-crypto). */
export const webCrypto: CryptoProvider = {
  async sha256(input) {
    return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', input));
  },
  async sha512(input) {
    return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-512', input));
  },
  async hmacSha256(key, input) {
    const k = await globalThis.crypto.subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    return new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', k, input));
  },
};

/** Chuỗi đầu vào của chữ ký theo `over`. */
export function signingInput(signing: SigningConfig, data: Json, body: Json): string {
  if (signing.over === 'fields') {
    const d = (data ?? {}) as Record<string, Json>;
    return (signing.fields ?? []).map(k => `${k}=${d[k] ?? ''}`).join('&');
  }
  return JSON.stringify(signing.over === 'body' ? body : data);
}

export async function sign(signing: SigningConfig, input: string, secret: string, payload: Json, crypto: CryptoProvider = webCrypto): Promise<string> {
  const out = (bytes: Uint8Array) => (signing.encoding === 'base64' ? base64(bytes) : hex(bytes));
  switch (signing.recipe) {
    case 'hash-b64url-dot-secret':
    case 'kv-string-hash': {
      const material = utf8(base64url(utf8(input)) + '.' + secret);
      return out(signing.alg === 'sha512' ? await crypto.sha512(material) : await crypto.sha256(material));
    }
    case 'hmac-sha256':
      return out(await crypto.hmacSha256(utf8(secret), utf8(input)));
    case 'jws-hs256': {
      const head = base64url(utf8(JSON.stringify(signing.jwsHeader ?? {alg: 'HS256', typ: 'JWT'})));
      const body = base64url(utf8(JSON.stringify(payload)));
      const sig = base64url(await crypto.hmacSha256(utf8(secret), utf8(`${head}.${body}`)));
      return `${head}.${body}.${sig}`;
    }
    case 'none':
      return '';
    default:
      throw new Error(`recipe không hỗ trợ: ${signing.recipe}`);
  }
}
