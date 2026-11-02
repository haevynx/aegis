// Route khai báo trong navigator + chỉ mục chức năng (thư mục chứa màn hình).
import {dirname} from 'node:path';

const SCREEN_TAG = /<(\w+)\.Screen\b([^>]*)>/g;
const ATTR = (name, attrs) => attrs.match(new RegExp(`\\b${name}=\\{?\\s*['"]?([\\w.$]+)['"]?\\s*\\}?`))?.[1];
const OBJ_ROUTE = /\{\s*(?:name|path)\s*:\s*['"`]?([\w./:$-]+)['"`]?\s*,\s*(?:component|screen|builder|page)\s*:\s*\(?\s*([A-Za-z_$][\w$]*)/g;
// Bảng route: `[ROUTES.X]: XScreen,` hoặc `X_SCREEN: XScreen,`
const MAP_ROUTE = /^[ \t]*(?:\[([A-Za-z_$][\w$.]*)\]|([A-Z][A-Z0-9_]*))\s*:\s*([A-Z][\w$]*(?:Screen|Page|View|Scene|Container|Tab|Stack)?)\s*,?[ \t]*$/gm;
const GOROUTE = /GoRoute\(\s*path:\s*['"]([^'"]+)['"][\s\S]{0,200}?builder:[\s\S]{0,80}?(\b[A-Z]\w*(?:Screen|Page|View))\(/g;

export const ACTION_REF = /\b(?:ACTION_CODE|ACTION_CODES|ACTIONS|ACTION|ActionCode|actionCode|Actions)\.([A-Za-z0-9_]+)/g;
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

export function findRoutes(file, text) {
  const out = [];
  for (const m of text.matchAll(SCREEN_TAG)) {
    const component = ATTR('component', m[2]);
    if (component) out.push({name: ATTR('name', m[2]) ?? null, component, navigator: m[1], source: `${file}:${lineOf(text, m.index)}`});
  }
  for (const re of [OBJ_ROUTE, GOROUTE]) for (const m of text.matchAll(re)) out.push({name: m[1], component: m[2], navigator: null, source: `${file}:${lineOf(text, m.index)}`});
  for (const m of text.matchAll(MAP_ROUTE)) {
    const name = m[1] ?? m[2];
    // Chỉ nhận khi component trông như màn hình (tránh bắt nhầm hằng số thường).
    if (/(Screen|Page|View|Scene)$/.test(m[3]) || m[1]) out.push({name, component: m[3], navigator: 'map', source: `${file}:${lineOf(text, m.index)}`});
  }
  return out;
}

const ROOT_DIR = /(^|\/)(screens?|containers?|features|pages|views|modules|presentation|ui)(\/|$)/i;
const SCREEN_FILE = /(Screen|Page|View|Scene|Container)\.(t|j)sx?$|_(screen|page|view)\.dart$|(Screen|Fragment|Activity|View)\.(kt|swift)$|\.vue$/;

export const kebab = s =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** Chức năng = thư mục (dưới screens/container/pages…) trực tiếp chứa file màn hình. */
export function featureDirs(files) {
  const dirs = new Set();
  for (const f of files) {
    const d = dirname(f);
    if (ROOT_DIR.test(d + '/') && (SCREEN_FILE.test(f) || /(^|\/)pages(\/|$)/.test(d))) dirs.add(d);
  }
  // Bỏ chính thư mục gốc (vd src/screens chứa SplashScreen.tsx) nếu nó là gốc chứa nhiều chức năng con.
  return [...dirs].sort();
}

/** File thuộc chức năng: trong thư mục (đệ quy) nhưng không thuộc chức năng con. */
export function filesOfFeature(dir, files, allDirs) {
  const subs = allDirs.filter(d => d !== dir && d.startsWith(dir + '/'));
  return files.filter(f => f.startsWith(dir + '/') && !subs.some(s => f.startsWith(s + '/')));
}
