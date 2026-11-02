// Quét app tham chiếu → kiến thức (đã che secret). Không chạy code của app.
import {execFileSync} from 'node:child_process';
import {basename} from 'node:path';
import {listSourceFiles, read, detectStack} from './files.mjs';
import {parseEntries, classify} from './constants.mjs';
import {analyzeHttp} from './http.mjs';
import {findRoutes, featureDirs, filesOfFeature, kebab, ACTION_REF} from './routes.mjs';
import {analyzeScreen} from './feature.mjs';

function gitCommit(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch {
    return null;
  }
}

export function scanRef(root) {
  const stack = detectStack(root);
  const files = listSourceFiles(root, {includeNative: ['android', 'ios', 'unknown'].includes(stack.platform)});
  const texts = new Map(files.map(f => [f, read(root, f)]));

  const constants = classify(files.map(f => ({file: f, entries: parseEntries(texts.get(f))})));
  const rank = {high: 0, medium: 1, low: 2};
  // File nằm trong thư mục tầng service được ưu tiên hơn màn hình có gọi HTTP lẻ.
  const servicePath = f => (/(^|\/)(services?|api|apis|network|http|clients?|data|core|lib\/net)(\/|$)/i.test(f) ? 0 : /(screen|page|view|component)/i.test(f) ? 2 : 1);
  const httpFiles = files
    .map(f => analyzeHttp(f, texts.get(f)))
    .filter(Boolean)
    .sort((a, b) => rank[a.confidence] - rank[b.confidence] || servicePath(a.file) - servicePath(b.file) || b.evidence.length - a.evidence.length || a.file.localeCompare(b.file));
  const routes = files.flatMap(f => findRoutes(f, texts.get(f)));

  const dirs = featureDirs(files);
  const features = dirs.map(dir => {
    const own = filesOfFeature(dir, files, dirs);
    const actions = [...new Set(own.flatMap(f => [...texts.get(f).matchAll(ACTION_REF)].map(m => m[1])))];
    return {slug: kebab(basename(dir)), path: dir, files: own.length, screens: own.filter(f => /Screen|Page|View|\.vue$/.test(f)).map(f => basename(f)), actions};
  });

  const unknownFiles = httpFiles.every(h => h.confidence === 'low') ? files.filter(f => /api|service|client|http|network|request|config/i.test(f)).slice(0, 50) : [];
  const level = n => (n === 0 ? 'none' : n < 3 ? 'low' : 'high');
  return {
    ref: {root, name: basename(root), commit: gitCommit(root)?.slice(0, 12) ?? null, scannedAt: new Date().toISOString()},
    stack,
    environments: constants.environments,
    endpoints: constants.endpoints,
    actions: constants.actions,
    serverMessages: constants.serverMessages,
    httpFiles,
    routes,
    features,
    confidence: {
      environments: level(constants.environments.length),
      endpoints: level(constants.endpoints.length),
      actions: level(constants.actions.length),
      protocol: httpFiles[0]?.confidence ?? 'none',
      features: level(features.length),
    },
    unknownFiles,
  };
}

/** Chi tiết một chức năng theo tên thư mục, slug hoặc đường dẫn. null nếu không thấy. */
export function scanFeature(root, nameOrPath) {
  const files = listSourceFiles(root);
  const dirs = featureDirs(files);
  const q = nameOrPath.replace(/\/+$/, '');
  const hits = dirs.filter(d => d === q || basename(d).toLowerCase() === q.toLowerCase() || kebab(basename(d)) === kebab(q));
  if (!hits.length) return null;
  const dir = hits.sort((a, b) => a.length - b.length)[0];
  const own = filesOfFeature(dir, files, dirs);
  return {
    slug: kebab(basename(dir)),
    dir,
    subFeatures: dirs.filter(d => d !== dir && d.startsWith(dir + '/')),
    screens: own.map(f => analyzeScreen(f, read(root, f))),
  };
}
