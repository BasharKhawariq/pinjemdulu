/**
 * Helper penggabung kelas CSS murni tanpa dependensi eksternal (clsx / tailwind-merge).
 * Mendukung string, array, boolean conditional, dan objek { 'class-name': boolean }.
 * Menangani bentrok kelas Tailwind umum (p-, px-, py-, text-size, dsb).
 */
export function cn(...inputs) {
  const classes = [];
  function process(input) {
    if (!input) return;
    if (typeof input === 'string') {
      input.split(/\s+/).forEach((c) => {
        if (c) classes.push(c);
      });
    } else if (Array.isArray(input)) {
      input.forEach(process);
    } else if (typeof input === 'object') {
      for (const [k, v] of Object.entries(input)) {
        if (v) {
          k.split(/\s+/).forEach((c) => {
            if (c) classes.push(c);
          });
        }
      }
    }
  }
  inputs.forEach(process);

  function getConflictKey(c) {
    if (/^text-(xs|sm|base|lg|[2-9]?xl)$/.test(c)) return 'text-size';
    if (/^text-(left|center|right|justify|start|end)$/.test(c)) return 'text-align';
    if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(c)) return 'font-weight';
    if (/^rounded(-[a-z0-9]+)?$/.test(c)) return 'rounded';
    if (/^h-[^\s]+$/.test(c)) return 'h';
    if (/^w-[^\s]+$/.test(c)) return 'w';
    const match = c.match(/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|bg)-/);
    if (match) return match[1];
    return null;
  }

  const seenPrefix = new Set();
  const resolved = [];
  for (let i = classes.length - 1; i >= 0; i--) {
    const c = classes[i];
    const key = getConflictKey(c);
    if (key) {
      if (!seenPrefix.has(key)) {
        seenPrefix.add(key);
        resolved.unshift(c);
      }
    } else {
      if (!seenPrefix.has(c)) {
        seenPrefix.add(c);
        resolved.unshift(c);
      }
    }
  }
  return resolved.join(' ');
}
