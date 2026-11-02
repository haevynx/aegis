// Tìm tầng HTTP / ký request / xử lý phiên — nguyên liệu cho `profile learn`.
import {redactText} from '../redact.mjs';

const HTTP_IMPORT = /(?:from\s+|require\(\s*|import\s+)['"](axios|ky|ofetch|cross-fetch|node-fetch|package:dio\/dio\.dart|package:http\/http\.dart|retrofit2?[\w.]*|okhttp3[\w.]*|io\.ktor[\w.]*|Alamofire)['"]?/;
const HTTP_USE = /\bfetch\s*\(|axios\.create|\bDio\s*\(|Retrofit\.Builder|URLSession|HttpClient\s*\(|\$fetch\s*\(|useFetch\s*\(/;
const SIGN = /\b(sha256|sha512|hmac|HmacSHA256|KJUR|jws|JWS|signature|sign\w*\(|createHash|CryptoJS|crypto\.subtle|b64u|base64url|utf8tob64u)\b/i;
const HEADERISH = /header|interceptor|Authorization|Bearer/i;
const SESSION = /\b(refresh\w*|logout|expired|token|relogin|login)\b/i;
const EVIDENCE = new RegExp([SIGN.source, HEADERISH.source, SESSION.source, /\b(baseURL|BASE_URL\w*|timeout|status\w*|message\w*|payload|envelope|meta)\b/.source].join('|'), 'i');

const clean = s => redactText(s, {allowUrls: [], keep: ['code-token']}).text;

/** @returns {{file: string, role: string, confidence: 'high'|'medium'|'low', evidence: {line: number, text: string}[]}|null} */
export function analyzeHttp(file, text, {maxEvidence = 80} = {}) {
  const imports = HTTP_IMPORT.test(text) || HTTP_USE.test(text);
  const signs = SIGN.test(text);
  const headers = HEADERISH.test(text);
  if (!imports && !(signs && headers)) return null;
  const evidence = [];
  text.split(/\r?\n/).forEach((l, i) => {
    if (evidence.length < maxEvidence && EVIDENCE.test(l) && !/^\s*(import|\/\/\s*console)/.test(l)) evidence.push({line: i + 1, text: clean(l.trim()).slice(0, 220)});
  });
  const confidence = signs && headers ? 'high' : headers || SESSION.test(text) ? 'medium' : 'low';
  return {file, role: imports ? 'http-client' : 'signing', confidence, evidence};
}
