/**
 * classes.js — Helper kelas Tailwind untuk komponen UI PinjemDulu.
 * Port murni tanpa DOM dari cva di _sumber/src/components/ui/*.jsx.
 */

import { cn } from '../lib/utils.js';

export { cn };

/**
 * Helper kelas tombol (Button).
 * @param {{ variant?: 'default'|'destructive'|'outline'|'secondary'|'ghost'|'link', size?: 'default'|'sm'|'lg'|'icon', className?: string }} [options]
 * @returns {string}
 */
export function buttonClass(options = {}) {
  const opts = typeof options === 'string' ? { variant: options } : options || {};
  const variant = opts.variant || 'default';
  const size = opts.size || 'default';
  const extra = opts.className || '';

  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

  const variants = {
    default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline: 'border border-input bg-background shadow-sm hover:bg-secondary-hover hover:text-secondary-hover-foreground hover:border-secondary-hover',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover hover:text-secondary-hover-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizes = {
    default: 'h-11 px-5 py-2.5',
    sm: 'h-9 rounded-lg px-3 text-xs',
    lg: 'h-12 rounded-2xl px-6 text-base',
    icon: 'h-10 w-10',
  };

  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;

  return cn(base, variantClass, sizeClass, extra);
}

/**
 * Helper kelas input formulir (Input).
 * @param {string} [className]
 * @returns {string}
 */
export function inputClass(className = '') {
  const base =
    'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20';
  return cn(base, className);
}

/**
 * Helper kelas label formulir (Label).
 * @param {string} [className]
 * @returns {string}
 */
export function labelClass(className = '') {
  const base =
    'text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
  return cn(base, className);
}

/**
 * Helper kelas checkbox (Checkbox).
 * @param {string} [className]
 * @returns {string}
 */
export function checkboxClass(className = '') {
  const base =
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground';
  return cn(base, className);
}

/**
 * Helper kelas badge (Badge).
 * @param {'default'|'secondary'|'destructive'|'outline'|'info'|'success'|'warning'|'danger'|{ variant?: string, className?: string }} [options]
 * @returns {string}
 */
export function badgeClass(options = 'default') {
  const opts = typeof options === 'string' ? { variant: options } : options || {};
  const variant = opts.variant || 'default';
  const extra = opts.className || '';

  const base =
    'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
    outline: 'text-foreground',
    info: 'border-transparent bg-info text-info-foreground',
    success: 'border-transparent bg-success text-success-foreground',
    warning: 'border-transparent bg-warning text-warning-foreground',
    danger: 'border-transparent bg-danger text-danger-foreground',
  };

  const variantClass = variants[variant] || variants.default;
  return cn(base, variantClass, extra);
}

/**
 * Helper kelas kartu (Card).
 * @param {string} [className]
 * @returns {string}
 */
export function cardClass(className = '') {
  const base = 'rounded-lg border bg-card text-card-foreground shadow-sm';
  return cn(base, className);
}

/**
 * Helper kelas alert/pesan peringatan (Alert).
 * @param {'destructive'|'info'|'success'|'warning'|'default'|{ variant?: string, className?: string }} [options]
 * @returns {string}
 */
export function alertClass(options = 'destructive') {
  const opts = typeof options === 'string' ? { variant: options } : options || {};
  const variant = opts.variant || 'destructive';
  const extra = opts.className || '';

  const base = 'rounded-2xl border px-4 py-3 text-sm';

  const variants = {
    destructive: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    default: 'border-zinc-200 bg-zinc-50 text-zinc-800',
  };

  const variantClass = variants[variant] || variants.destructive;
  return cn(base, variantClass, extra);
}

/**
 * Helper kelas skeleton animasi pulsa (Skeleton).
 * @param {string} [className]
 * @returns {string}
 */
export function skeletonClass(className = '') {
  const base = 'animate-pulse rounded-md bg-muted';
  return cn(base, className);
}

/**
 * Helper kelas tabel (Table).
 */
export function tableClass(className = '') {
  return cn('min-w-full border-collapse text-left text-sm', className);
}

export function thClass(className = '') {
  return cn('px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30', className);
}

export function tdClass(className = '') {
  return cn('px-3 py-3 text-sm text-foreground align-top border-b border-border', className);
}

/**
 * Helper kelas textarea formulir.
 */
export function textareaClass(className = '') {
  const base =
    'flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive';
  return cn(base, className);
}

/**
 * Helper kelas select formulir.
 */
export function selectClass(options = '') {
  let extra = '';
  let error = false;
  if (typeof options === 'string') {
    extra = options;
  } else if (options && typeof options === 'object') {
    extra = options.className || '';
    error = Boolean(options.error);
  }
  const base =
    'flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive cursor-pointer';
  return cn(base, error && 'border-destructive focus-visible:ring-destructive', extra);
}

/**
 * Helper kelas dialog native.
 */
export function dialogBackdropClass(className = '') {
  return cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className);
}

export function dialogContentClass(className = '') {
  return cn('fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-xl', className);
}

/**
 * Helper pesan galat bidang formulir.
 */
export function fieldErrorClass(className = '') {
  return cn('text-xs text-destructive mt-1 font-medium', className);
}

/**
 * Helper tombol ikon bulat / kompak.
 */
export function iconButtonClass(className = '') {
  return cn('inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', className);
}


