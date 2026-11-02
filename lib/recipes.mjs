// Công thức ký tổng quát (bản Node, dùng cho CLI `aegis vectors` và để đối chiếu chéo với client mẫu).
import {createHash, createHmac} from 'node:crypto';

export const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const utf8b64url = str => b64url(Buffer.from(str, 'utf8'));

/** Chuỗi đầu vào của chữ ký theo `over`. */
export function signingInput(signing, data, body) {
  if (signing.over === 'fields') return (signing.fields || []).map(k => `${k}=${data?.[k] ?? ''}`).join('&');
  return JSON.stringify(signing.over === 'body' ? body : data);
}

/**
 * @param {{recipe: string, alg?: string, encoding?: string, jwsHeader?: object, over?: string}} signing
 * @param {unknown} payload  dữ liệu (object) — với jws-hs256 là payload JWS
 * @param {string} input     chuỗi đầu vào đã tính bằng signingInput
 * @param {string} secret
 */
export function sign(signing, input, secret, payload) {
  const enc = signing.encoding || 'hex';
  switch (signing.recipe) {
    case 'hash-b64url-dot-secret':
    case 'kv-string-hash':
      return createHash(signing.alg || 'sha256')
        .update(utf8b64url(input) + '.' + secret, 'utf8')
        .digest(enc);
    case 'hmac-sha256':
      return createHmac('sha256', Buffer.from(secret, 'utf8')).update(input, 'utf8').digest(enc);
    case 'jws-hs256': {
      const head = utf8b64url(JSON.stringify(signing.jwsHeader || {alg: 'HS256', typ: 'JWT'}));
      const body = utf8b64url(JSON.stringify(payload));
      const sig = b64url(createHmac('sha256', Buffer.from(secret, 'utf8')).update(`${head}.${body}`).digest());
      return `${head}.${body}.${sig}`;
    }
    case 'none':
      return '';
    default:
      throw new Error(`recipe không hỗ trợ: ${signing.recipe}`);
  }
}

export const RECIPES = ['hash-b64url-dot-secret', 'jws-hs256', 'hmac-sha256', 'kv-string-hash', 'none'];
