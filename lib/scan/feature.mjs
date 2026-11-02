// Trích chi tiết một chức năng: màn, component, trường, action, điều kiện, message, điều hướng.
import {redactText} from '../redact.mjs';
import {ACTION_REF} from './routes.mjs';

const clean = s => redactText(s, {allowUrls: [], keep: ['code-token']}).text;
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const str = q => `(['"\`])((?:\\\\.|(?!\\${q}).)*)\\${q}`;

const TAG = /<([A-Z][\w.]*)\b((?:[^<>]|=>|\{[^{}]*\})*?)\/?>/g;
const attr = (name, attrs) => attrs.match(new RegExp(`\\b${name}=(?:\\{\\s*)?(['"\`])((?:(?!\\1).)*)\\1`))?.[2];
// Đối số thứ 2 có thể là chuỗi (message cố định) hoặc biểu thức (message động từ server).
const ALERT = new RegExp(`(?:Alert\\.alert|showFlashMessage|showMessage|Toast\\.show|toast(?:\\.\\w+)?|FlashMessageHelper\\.\\w+|\\balert|showDialog|showSnackBar|SnackBar|notify)\\(\\s*${str(1)}(?:\\s*,\\s*(?:${str(3)}|([^,)'"\`]+)))?`, 'g');
const SERVER_CMP = /message\w*\s*(?:===?|!==?)\s*(['"`])((?:\\.|(?!\1).)*)\1|\.(?:startsWith|includes)\(\s*(['"`])((?:\\.|(?!\3).)*)\3\s*\)/g;
const NAV = /\b(?:navigate|navigation\.(?:push|replace|reset)|NavigationUtil\.\w+|navigateTo|router\.(?:push|replace)|Navigator\.(?:push|pushNamed|pushReplacementNamed)|pushNamed|goNamed|context\.(?:go|push))\(\s*(?:(['"`])([^'"`]+)\1|([A-Za-z_$][\w$.]*))/g;
const CONDITION = /\bif\s*\(|\belse\s+if\b|\{[^{}]*&&\s*\(?\s*</;
const ENDPOINT_CALL = /\b(\w*End[Pp]oint\w*|\w*Api|\w*Service)\.(\w+)\(/g;

export function analyzeScreen(file, text, {maxConditions = 150} = {}) {
  const src = idx => `${file}:${lineOf(text, idx)}`;
  const components = [...new Set([...text.matchAll(/<([A-Z][\w]*)(?=[\s/>.])/g)].map(m => m[1]))];
  const fields = [];
  for (const m of text.matchAll(TAG)) {
    const name = attr('name', m[2]);
    const label = attr('label', m[2]) ?? attr('placeholder', m[2]);
    if (!name && !label) continue;
    fields.push({component: m[1], name: name ?? null, label: label ? clean(label) : null, required: /\b(required|isRequired)\b(?!\s*=\s*\{?\s*false)/.test(m[2]), source: src(m.index)});
  }
  const actions = [...text.matchAll(ACTION_REF)].map(m => ({key: m[1], source: src(m.index)}));
  const calls = [...text.matchAll(ENDPOINT_CALL)].map(m => ({call: `${m[1]}.${m[2]}`, source: src(m.index)}));
  const messages = [];
  for (const m of text.matchAll(ALERT)) {
    if (m[4] !== undefined) messages.push({kind: 'ui', title: clean(m[2]), text: clean(m[4]), source: src(m.index)});
    else if (m[5]) messages.push({kind: 'ui-dynamic', title: clean(m[2]), text: null, expr: clean(m[5].trim()).slice(0, 160), source: src(m.index)});
    else messages.push({kind: 'ui', title: null, text: clean(m[2]), source: src(m.index)});
  }
  for (const m of text.matchAll(SERVER_CMP)) messages.push({kind: 'server', text: clean(m[2] ?? m[4]), source: src(m.index)});
  const navigation = [...text.matchAll(NAV)].map(m => ({target: m[2] ?? m[3], source: src(m.index)}));
  const conditions = [];
  text.split(/\r?\n/).forEach((l, i) => {
    if (conditions.length < maxConditions && CONDITION.test(l)) conditions.push({text: clean(l.trim()).slice(0, 220), source: `${file}:${i + 1}`});
  });
  return {file, components, fields, actions, calls, messages, navigation, conditions};
}
