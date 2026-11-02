#!/usr/bin/env node
// Kiểm tra skill: frontmatter hợp lệ, name = tên thư mục, description ≤ 1024 ký tự, link tương đối tồn tại.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
const errors = [];
const mdFiles = dir => readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? mdFiles(join(dir, n)) : n.endsWith('.md') ? [join(dir, n)] : []));

for (const name of readdirSync(root)) {
  const dir = join(root, name);
  if (!statSync(dir).isDirectory()) continue;
  const skill = join(dir, 'SKILL.md');
  if (!existsSync(skill)) {
    errors.push(`${name}: thiếu SKILL.md`);
    continue;
  }
  const text = readFileSync(skill, 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) errors.push(`${name}: thiếu frontmatter`);
  else {
    const get = k => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim();
    if (get('name') !== name) errors.push(`${name}: name trong frontmatter (${get('name')}) ≠ tên thư mục`);
    const d = get('description');
    if (!d) errors.push(`${name}: thiếu description`);
    else if (d.length > 1024) errors.push(`${name}: description ${d.length} > 1024 ký tự`);
  }
  for (const f of mdFiles(dir)) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      const link = m[1];
      if (/^(https?:|mailto:)/.test(link) || link.startsWith('~')) continue;
      if (!existsSync(resolve(dirname(f), link))) errors.push(`${f.slice(root.length + 1)}: link hỏng → ${link}`);
    }
  }
}
for (const e of errors) console.log(`✖ ${e}`);
console.log(errors.length ? `\n${errors.length} lỗi` : `✔ ${readdirSync(root).length} skill hợp lệ`);
process.exit(errors.length ? 1 : 0);
