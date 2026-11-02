// Parse đối số đơn giản: positional + --flag + --key value.
export function parseArgs(argv, {bool = []} = {}) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=');
      if (inline !== undefined) opts[k] = inline;
      else if (bool.includes(k) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) opts[k] = true;
      else {
        const v = argv[++i];
        opts[k] = opts[k] === undefined ? v : [].concat(opts[k], v);
      }
    } else pos.push(a);
  }
  return {pos, opts};
}

export const out = {
  ok: m => console.log(`✔ ${m}`),
  info: m => console.log(`  ${m}`),
  warn: m => console.log(`⚠ ${m}`),
  err: m => console.error(`✖ ${m}`),
  step: m => console.log(`→ ${m}`),
};
