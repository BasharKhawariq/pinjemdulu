/**
 * sidebar.js — Komponen Sidebar Desktop & Mobile Drawer PinjemDulu.
 * Acuan: _sumber/src/components/Mixins/Sidebar.jsx
 */

import { renderIcon } from './icons.js';
import { escapeHtml } from './html.js';
import { getNavForRole, ROLE_LABEL, isActivePath, getInitials } from '../lib/navigation.js';
import { ROLES } from '../lib/constants.js';

export const STORAGE_KEY_SIDEBAR = 'pd:v1:sidebar-collapsed';

/**
 * Render Brand Header di Sidebar.
 * @param {boolean} collapsed
 * @returns {string}
 */
function renderSidebarBrand(collapsed) {
  if (collapsed) {
    return `
      <div class="flex w-full items-center justify-center px-2 pt-5 pb-5">
        <button
          type="button"
          data-action="toggle-sidebar"
          aria-label="Lebarkan sidebar"
          title="Lebarkan sidebar"
          aria-expanded="false"
          class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          ${renderIcon('PanelLeft', 'h-5 w-5')}
        </button>
      </div>
    `;
  }

  return `
    <div class="flex w-full items-center justify-between px-4 pt-6 pb-5">
      <a href="#/inventaris" aria-label="PinjemDulu beranda" class="inline-flex min-w-0 items-center gap-3">
        <span class="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-brand-solid text-white shadow-sm sm:h-[44px] sm:w-[44px]">
          ${renderIcon('Sparkles', 'h-6 w-6')}
        </span>
        <div class="flex min-w-0 flex-col leading-none">
          <span class="truncate text-[20px] font-bold tracking-tight sm:text-[24px]">
            <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
          </span>
          <span class="mt-1.5 truncate text-[8px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
            INVENTARIS OKI KAMPUS
          </span>
        </div>
      </a>
      <button
        type="button"
        data-action="toggle-sidebar"
        aria-label="Persempit sidebar"
        title="Persempit sidebar"
        aria-expanded="true"
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
      >
        ${renderIcon('PanelLeft', 'h-5 w-5')}
      </button>
    </div>
  `;
}

/**
 * Render Navigasi Menu Sidebar.
 * @param {Array<object>} items
 * @param {boolean} collapsed
 * @param {string} currentHash
 * @param {string} [role]
 * @returns {string}
 */
function renderSidebarNav(items, collapsed, currentHash, role = '') {
  const listItems = items
    .map((item) => {
      const isGroup = item.type === 'group' || (Array.isArray(item.children) && item.children.length > 0);

      if (isGroup) {
        const hasActiveChild = (item.children || []).some((c) => isActivePath(c.href, currentHash));
        const isDashboardOpen =
          role === ROLES.PEMINJAM &&
          item.key === 'nav-pengajuan-saya' &&
          isActivePath('#/dashboard-peminjam', currentHash);
        const isOpen = hasActiveChild || isDashboardOpen;
        const icon = item.icon ? renderIcon(item.icon, 'h-6 w-6 text-zinc-400') : '';
        const chevron = isOpen ? renderIcon('ChevronUp', 'h-4 w-4 text-zinc-400') : renderIcon('ChevronDown', 'h-4 w-4 text-zinc-400');
        const tooltip = collapsed ? `title="${escapeHtml(item.label)}"` : '';
        const groupBadge = item.badge
          ? `<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">${escapeHtml(String(item.badge))}</span>`
          : '';

        if (collapsed) {
          return `
            <li>
              <button
                type="button"
                data-action="toggle-group"
                data-group="${escapeHtml(item.key)}"
                ${tooltip}
                aria-expanded="${isOpen}"
                class="group flex w-full items-center justify-center rounded-2xl px-0 py-3 text-[15px] transition text-zinc-500 hover:bg-zinc-50/60 hover:text-zinc-900"
              >
                <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                  ${icon}
                </span>
              </button>
            </li>
          `;
        }

        const childItems = (item.children || [])
          .map((child) => {
            const childActive = isActivePath(child.href, currentHash);
            const childBadge = child.badge
              ? `<span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">${escapeHtml(String(child.badge))}</span>`
              : '';
            return `
              <li>
                <a
                  href="${escapeHtml(child.href)}"
                  aria-current="${childActive ? 'page' : 'false'}"
                  class="group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14.5px] transition ${
                    childActive
                      ? 'bg-zinc-100/90 font-semibold text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50/80 hover:text-zinc-900'
                  }"
                >
                  <span class="inline-block size-2 shrink-0 rounded-full ${
                    childActive ? 'bg-zinc-900' : 'bg-zinc-600 group-hover:bg-zinc-800'
                  }"></span>
                  <span class="leading-tight">${escapeHtml(child.label)}</span>
                  ${childBadge}
                </a>
              </li>
            `;
          })
          .join('');

        return `
          <li class="flex flex-col gap-1">
            <button
              type="button"
              data-action="toggle-group"
              data-group="${escapeHtml(item.key)}"
              aria-expanded="${isOpen}"
              aria-controls="sub-${escapeHtml(item.key)}"
              class="group flex w-full items-center justify-between rounded-2xl px-3 py-3 text-[15px] text-zinc-400 transition hover:bg-zinc-50/60 hover:text-zinc-900 font-medium"
            >
              <div class="flex items-center gap-3">
                <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                  ${icon}
                </span>
                <span class="leading-tight text-[15.5px]">${escapeHtml(item.label)}</span>
              </div>
              <div class="flex items-center gap-2">
                ${groupBadge}
                <span class="transition-transform duration-200" data-chevron="${escapeHtml(item.key)}">
                  ${chevron}
                </span>
              </div>
            </button>
            <ul
              id="sub-${escapeHtml(item.key)}"
              class="flex flex-col gap-1 pl-4 ${isOpen ? '' : 'hidden'}"
            >
              ${childItems}
            </ul>
          </li>
        `;
      }

      // Item tunggal
      const active = isActivePath(item.href, currentHash);
      const icon = item.icon ? renderIcon(item.icon, active ? 'h-6 w-6 text-primary' : 'h-6 w-6') : '';
      const tooltip = collapsed ? `title="${escapeHtml(item.label)}"` : '';

      if (collapsed) {
        return `
          <li>
            <a
              href="${escapeHtml(item.href)}"
              ${tooltip}
              aria-current="${active ? 'page' : 'false'}"
              class="group flex w-full items-center justify-center rounded-2xl px-0 py-3 text-[15px] transition ${
                active
                  ? 'bg-zinc-50 font-semibold text-primary'
                  : 'text-zinc-500 hover:bg-zinc-50/60 hover:text-zinc-900'
              }"
            >
              <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                ${icon}
              </span>
            </a>
          </li>
        `;
      }

      return `
        <li>
          <a
            href="${escapeHtml(item.href)}"
            aria-current="${active ? 'page' : 'false'}"
            class="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-[15px] transition ${
              active
                ? 'bg-zinc-50 font-semibold text-primary'
                : 'text-zinc-500 hover:bg-zinc-50/60 hover:text-zinc-900'
            }"
          >
            <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center ${active ? 'text-primary' : ''}">
              ${icon}
            </span>
            <span class="leading-tight text-[15.5px] font-medium">${escapeHtml(item.label)}</span>
          </a>
        </li>
      `;
    })
    .join('');

  return `
    <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi Utama">
      <ul class="flex flex-col gap-1.5">
        ${listItems}
      </ul>
    </nav>
  `;
}

/**
 * Render Kartu Pengguna di bagian bawah Sidebar.
 * @param {object|null} user
 * @param {boolean} collapsed
 * @returns {string}
 */
function renderSidebarUserCard(user, collapsed) {
  const nama = user?.nama || 'Pengguna';
  const role = user?.role || '';
  const roleText = ROLE_LABEL[role] || (role === 'peminjam' ? 'Peminjam' : 'PJ Inventaris');
  const initials = getInitials(nama) || 'PD';

  if (collapsed) {
    return `
      <div class="mt-auto flex flex-col items-center gap-3 border-t border-zinc-100 px-2 pb-5 pt-4">
        <div
          title="${escapeHtml(nama)} · ${escapeHtml(roleText)}"
          class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-avatar text-base font-bold text-white shadow-sm"
        >
          ${escapeHtml(initials)}
        </div>
      </div>
    `;
  }

  return `
    <div class="mt-auto border-t border-zinc-100 px-3 pb-5 pt-4">
      <div class="flex items-center gap-3 rounded-[20px] px-2 py-3">
        <div class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-avatar text-base font-bold text-white shadow-sm">
          ${escapeHtml(initials)}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-semibold text-zinc-900">
            ${escapeHtml(nama)}
          </p>
          <p class="mt-0.5 truncate text-[13px] text-zinc-500">
            ${escapeHtml(roleText)}
          </p>
        </div>
        <button
          type="button"
          data-action="logout"
          aria-label="Keluar"
          title="Keluar"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-50"
        >
          ${renderIcon('LogOut', 'h-5 w-5')}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Desktop Sidebar.
 * @param {{ user: object|null, currentHash: string, collapsed?: boolean }} props
 * @returns {string}
 */
export function renderSidebar({ user = null, currentHash = '#/dashboard-peminjam', collapsed = false } = {}) {
  const items = getNavForRole(user?.role);
  const widthClass = collapsed ? 'w-[84px]' : 'w-[280px]';

  return `
    <aside
      id="app-sidebar"
      aria-label="Sidebar Navigasi"
      class="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-zinc-100 bg-white transition-[width] duration-200 ease-out md:flex ${widthClass}"
    >
      ${renderSidebarBrand(collapsed)}
      ${renderSidebarNav(items, collapsed, currentHash, user?.role)}
      ${renderSidebarUserCard(user, collapsed)}
    </aside>
  `;
}

/**
 * Render Mobile Drawer Sidebar + Backdrop.
 * @param {{ user: object|null, currentHash: string, open?: boolean }} props
 * @returns {string}
 */
export function renderMobileDrawer({ user = null, currentHash = '#/dashboard-peminjam', open = false } = {}) {
  const items = getNavForRole(user?.role);

  return `
    <div
      id="mobile-drawer-backdrop"
      data-action="close-drawer"
      aria-hidden="${!open}"
      class="fixed inset-0 z-40 bg-zinc-950/30 backdrop-blur-sm transition-opacity md:hidden ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }"
    ></div>
    <aside
      id="mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi Mobile"
      aria-hidden="${!open}"
      class="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[90vw] shrink-0 flex-col border-r border-zinc-100 bg-white shadow-xl transition-transform duration-200 ease-out md:hidden ${
        open ? 'translate-x-0' : '-translate-x-full'
      }"
    >
      <div class="flex w-full items-center justify-between px-4 pt-6 pb-5">
        <a href="#/inventaris" aria-label="PinjemDulu beranda" class="inline-flex min-w-0 items-center gap-3">
          <span class="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-brand-solid text-white shadow-sm">
            ${renderIcon('Sparkles', 'h-6 w-6')}
          </span>
          <div class="flex min-w-0 flex-col leading-none">
            <span class="truncate text-[20px] font-bold tracking-tight">
              <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
            </span>
            <span class="mt-1.5 truncate text-[8px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
              INVENTARIS OKI KAMPUS
            </span>
          </div>
        </a>
        <button
          type="button"
          data-action="close-drawer"
          aria-label="Tutup menu"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
        >
          ${renderIcon('X', 'h-5 w-5')}
        </button>
      </div>

      ${renderSidebarNav(items, false, currentHash, user?.role)}
      ${renderSidebarUserCard(user, false)}
    </aside>
  `;
}
