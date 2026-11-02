// ref add | list | remove — khai báo app tham chiếu.
import {existsSync, mkdirSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {aegisHome, git, isGitUrl, loadConfig, loadLocal, projectRoot, refPath, saveConfig, saveLocal} from '../project.mjs';
import {out} from './args.mjs';

const nameFrom = s => basename(s.replace(/\.git$/, '').replace(/\/+$/, '')).replace(/[^A-Za-z0-9._-]+/g, '-');

export function cloneOrPull(url, dir) {
  if (existsSync(join(dir, '.git'))) {
    try {
      git(['-C', dir, 'pull', '--ff-only', '--depth', '1']);
      return 'pulled';
    } catch (e) {
      out.warn(`không pull được ${dir}: ${String(e.stderr || e.message).split('\n')[0]} — dùng bản đang có`);
      return 'stale';
    }
  }
  mkdirSync(join(dir, '..'), {recursive: true});
  git(['clone', '--depth', '1', url, dir], {stdio: ['ignore', 'pipe', 'pipe']});
  return 'cloned';
}

export function cmdRef({pos, opts}) {
  const [sub, target] = pos;
  const root = projectRoot(opts.dir || process.cwd());
  const config = loadConfig(root);
  const local = loadLocal(root);

  if (sub === 'add') {
    if (!target) return out.err('cần đường dẫn hoặc git-url: aegis ref add <path|git-url> [--name tên]'), 1;
    const name = opts.name || nameFrom(target);
    const entry = {name};
    if (isGitUrl(target)) {
      entry.git = target;
      const dir = join(aegisHome(), 'refs', name);
      try {
        out.step(`${cloneOrPull(target, dir)}: ${target} → ${dir} (chỉ đọc)`);
      } catch (e) {
        out.err(`clone thất bại: ${String(e.stderr || e.message).split('\n')[0]}`);
        out.info('Kiểm tra quyền truy cập repo (ssh key / gh auth login). Nếu không có quyền: `aegis import` từ project khác, hoặc chế độ chỉ giao thức.');
        return 1;
      }
    } else {
      const abs = resolve(target);
      if (!existsSync(abs)) return out.err(`không thấy thư mục ${abs}`), 1;
      local.refs[name] = abs;
      saveLocal(root, local);
    }
    config.refs = [...config.refs.filter(r => r.name !== name), entry];
    saveConfig(root, config);
    out.ok(`ref "${name}" đã khai báo. Tiếp: aegis scan --ref ${name}`);
    return 0;
  }
  if (sub === 'remove') {
    config.refs = config.refs.filter(r => r.name !== target);
    delete local.refs[target];
    saveConfig(root, config);
    saveLocal(root, local);
    out.ok(`đã bỏ ref "${target}" (không xoá source)`);
    return 0;
  }
  if (!config.refs.length) out.info('chưa có ref nào. aegis ref add <path|git-url>');
  for (const r of config.refs) {
    const p = refPath(root, r);
    out.info(`${r.name}  ${r.git ? `git: ${r.git}` : 'local'}  → ${p ? (existsSync(p) ? p : `${p} (KHÔNG TỒN TẠI trên máy này)`) : '(chưa có đường dẫn trên máy này — aegis ref add <path> --name ' + r.name + ')'}`);
  }
  return 0;
}

/** Chọn ref theo --ref, mặc định tất cả. Trả về [{ref, path}] đã kiểm tra tồn tại. */
export function resolveRefs(root, wanted) {
  const config = loadConfig(root);
  const names = wanted ? [].concat(wanted) : config.refs.map(r => r.name);
  const res = [];
  for (const n of names) {
    const ref = config.refs.find(r => r.name === n);
    if (!ref) {
      out.err(`không có ref "${n}". aegis ref list`);
      continue;
    }
    const p = refPath(root, ref);
    if (!p || !existsSync(p)) {
      if (ref.git) {
        try {
          cloneOrPull(ref.git, p);
        } catch (e) {
          out.err(`ref "${n}": không clone được ${ref.git}`);
          continue;
        }
      } else {
        out.err(`ref "${n}" chưa có đường dẫn trên máy này: aegis ref add <path> --name ${n}`);
        continue;
      }
    } else if (ref.git) cloneOrPull(ref.git, p);
    res.push({ref, path: p});
  }
  return res;
}
