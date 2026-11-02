// Template trong profile: "{config.partner}", "{session.user.username}", "{now:yyyyMMddHHmmss}", "{action}", "{signature}".
// Chuỗi CHỈ gồm một template → giữ nguyên kiểu giá trị (null, số…). Template lẫn trong chuỗi → nối chuỗi.
// Hậu tố tái hiện ngữ nghĩa JS của app cũ (ảnh hưởng chữ ký):
//   {x || null}  giá trị falsy ('' / 0 / false / thiếu) → null      (như `x || null`)
//   {x?}         thiếu (undefined) → BỎ key khỏi object             (như JSON.stringify bỏ undefined)
import type {Json} from './types.ts';

export type TemplateContext = Record<string, unknown> & {now?: Date};

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function formatDate(d: Date, fmt: string): string {
  return fmt
    .replace('yyyy', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

const OMIT = Symbol('omit');

function evaluate(raw: string, ctx: TemplateContext): unknown {
  let expr = raw.trim();
  const orNull = /\|\|\s*null$/.test(expr);
  if (orNull) expr = expr.replace(/\s*\|\|\s*null$/, '');
  const optional = expr.endsWith('?');
  if (optional) expr = expr.slice(0, -1);
  const v = expr.startsWith('now:') ? formatDate(ctx.now ?? new Date(), expr.slice(4)) : getPath(ctx, expr);
  if (orNull) return v || null;
  if (optional && v === undefined) return OMIT;
  return v;
}

const WHOLE = /^\{([^{}]+)\}$/;
const INLINE = /\{([^{}]+)\}/g;

export function resolveTemplate(value: Json, ctx: TemplateContext): Json {
  if (typeof value === 'string') {
    const whole = value.match(WHOLE);
    if (whole) return (evaluate(whole[1], ctx) ?? null) as Json;
    return value.replace(INLINE, (_, expr) => {
      const v = evaluate(expr, ctx);
      return v === null || v === undefined || v === OMIT ? '' : String(v);
    });
  }
  if (Array.isArray(value)) return value.map(v => resolveTemplate(v, ctx));
  if (value && typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = resolveTemplate(v, ctx) as unknown;
      if (r !== OMIT) out[k] = r as Json;
    }
    return out;
  }
  return value;
}
