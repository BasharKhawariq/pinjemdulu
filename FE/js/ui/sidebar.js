/**
 * sidebar.js — Komponen Sidebar Desktop & Mobile Drawer PinjemDulu.
 * Acuan: _sumber/src/components/Mixins/Sidebar.jsx
 *
 * Animasi collapse/expand:
 * Keadaan collapsed dan expanded memakai SATU markup yang sama. Perbedaan lebar,
 * label, badge, submenu, dan tombol toggle diatur lewat CSS berdasarkan atribut
 * `data-collapsed` pada `<aside class="pd-sidebar">` (lihat css/tailwind.input.css).
 * Karena DOM tidak dibangun ulang saat toggle, hanya lebar container yang
 * beranimasi — logo, ikon menu, dan tombol toggle tetap pada posisinya.
 */

import { renderIcon } from './icons.js';
import { escapeHtml } from './html.js';
import { getNavForRole, ROLE_LABEL, isActivePath, getInitials } from '../lib/navigation.js';
import { ROLES } from '../lib/constants.js';

export const STORAGE_KEY_SIDEBAR = 'pd:v1:sidebar-collapsed';
export const STORAGE_KEY_SIDEBAR_GROUPS = 'pd:v1:sidebar-groups';

function getStoredGroupOpen(groupKey) {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_SIDEBAR_GROUPS);
    if (!saved) return null;
    const groups = JSON.parse(saved);
    return typeof groups?.[groupKey] === 'boolean' ? groups[groupKey] : null;
  } catch {
    return null;
  }
}

/**
 * Render Brand Header di Sidebar.
 * Markup identik untuk kedua keadaan; tombol toggle diletakkan di tepi kanan
 * header sehingga otomatis tepat berada di atas logo saat sidebar collapsed.
 * @param {boolean} collapsed
 * @returns {string}
 */
function renderSidebarBrand(collapsed) {
  const toggleLabel = collapsed ? 'Lebarkan sidebar' : 'Persempit sidebar';

  return `
    <div class="pd-sb-brand relative flex w-full items-center gap-3 px-5 pt-5 pb-5">
      <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Logo PinjemDulu">
        <img
          src="assets/img/Logo-PinjemDulu.png"
          alt="Logo PinjemDulu"
          class="pd-sb-brand-logo h-11 w-11 shrink-0 rounded-[12px] object-contain shadow-sm"
        />
      </div>
      <div class="pd-sb-label flex min-w-0 flex-col leading-none">
        <span class="truncate text-[20px] font-bold tracking-tight sm:text-[24px]">
          <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
        </span>
        <span
          class="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.24em] text-zinc-500"
        >
          INVENTARIS OKI KAMPUS
        </span>
      </div>
      <button
        type="button"
        data-action="toggle-sidebar"
        aria-label="${toggleLabel}"
        title="${toggleLabel}"
        aria-expanded="${collapsed ? 'false' : 'true'}"
        class="pd-sb-toggle ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ${renderIcon('PanelLeft', 'h-5 w-5')}
      </button>
    </div>
  `;
}

/**
 * Render Navigasi Menu Sidebar.
 * Satu markup untuk collapsed & expanded; posisi ikon tidak bergeser karena
 * padding kiri item selalu sama (lihat `.pd-sidebar[data-collapsed]`).
 * @param {Array<object>} items
 * @param {string} currentHash
 * @param {string} [role]
 * @param {string} [idPrefix]
 * @returns {string}
 */
function renderSidebarNav(items, currentHash, role = '', idPrefix = 'sidebar') {
  const listItems = items
    .map((item) => {
      const isGroup = item.type === 'group' || (Array.isArray(item.children) && item.children.length > 0);

      if (isGroup) {
        const hasActiveChild = (item.children || []).some((c) => isActivePath(c.href, currentHash));
        const isDashboardOpen =
          role === ROLES.PEMINJAM &&
          item.key === 'nav-pengajuan-saya' &&
          isActivePath('#/dashboard-peminjam', currentHash);
        // Preferensi buka/tutup manual tetap dipertahankan saat berpindah halaman.
        // Jika belum ada preferensi, buka otomatis ketika salah satu submenu aktif.
        const storedOpen = getStoredGroupOpen(item.key);
        const isOpen = storedOpen ?? (hasActiveChild || isDashboardOpen);
        const icon = item.icon ? renderIcon(item.icon, 'h-6 w-6 transition-colors sidebar-nav-group-icon-svg') : '';
        const chevron = isOpen ? renderIcon('ChevronUp', 'h-4 w-4 transition-colors sidebar-nav-group-chevron-svg') : renderIcon('ChevronDown', 'h-4 w-4 transition-colors sidebar-nav-group-chevron-svg');
        const groupBadge = item.badge
          ? `<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">${escapeHtml(String(item.badge))}</span>`
          : '';

        const childItems = (item.children || [])
          .map((child) => {
            // Kelola Kategori merupakan tab di dalam halaman Kelola Inventaris,
            // sehingga menu sidebar Kelola Inventaris tetap aktif pada kedua route.
            const isKelolaInventarisMenu = child.key === 'nav-kelola-inventaris';
            const childActive =
              isActivePath(child.href, currentHash) ||
              (isKelolaInventarisMenu && isActivePath('#/kelola/kategori', currentHash));
            const childBadge = child.badge
              ? `<span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">${escapeHtml(String(child.badge))}</span>`
              : '';
            return `
              <li>
                <a
                  href="${escapeHtml(child.href)}"
                  aria-current="${childActive ? 'page' : 'false'}"
                  class="group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14.5px] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    childActive
                      ? 'bg-zinc-100/90 font-semibold text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50/80 hover:text-zinc-900'
                  }"
                >
                  <span class="inline-block size-2 shrink-0 rounded-full ${
                    childActive ? 'bg-zinc-900' : 'bg-zinc-600 group-hover:bg-zinc-800'
                  }"></span>
                  <span class="leading-tight ${child.key === 'nav-kelola-pengembalian' ? 'whitespace-nowrap text-[14px]' : ''}">${escapeHtml(child.label)}</span>
                  ${childBadge}
                </a>
              </li>
            `;
          })
          .join('');

        const subId = `sub-${idPrefix}-${item.key}`;

        return `
          <li class="flex flex-col gap-1">
            <button
              type="button"
              data-action="toggle-group"
              data-group="${escapeHtml(item.key)}"
              aria-expanded="${isOpen}"
              aria-controls="${escapeHtml(subId)}"
              class="pd-sb-item group flex w-full items-center gap-3 rounded-2xl py-3 pl-[18px] pr-3 text-[15px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50/60 hover:text-zinc-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                ${icon}
              </span>
              <span class="pd-sb-label min-w-0 truncate text-left text-[15.5px] leading-tight">${escapeHtml(item.label)}</span>
              <span class="pd-sb-trailing ml-auto flex shrink-0 items-center gap-2">
                ${groupBadge}
                <span class="transition-transform duration-200" data-chevron="${escapeHtml(item.key)}">
                  ${chevron}
                </span>
              </span>
            </button>
            <div class="pd-sb-sub" data-open="${isOpen ? 'true' : 'false'}">
              <ul id="${escapeHtml(subId)}" class="pd-sb-sub-list flex flex-col gap-1 pl-4">
                ${childItems}
              </ul>
            </div>
          </li>
        `;
      }

      // Item tunggal
      const active = isActivePath(item.href, currentHash);
      const icon = item.icon ? renderIcon(item.icon, active ? 'h-6 w-6 text-primary' : 'h-6 w-6') : '';

      return `
        <li>
          <a
            href="${escapeHtml(item.href)}"
            aria-current="${active ? 'page' : 'false'}"
            class="pd-sb-item group flex w-full items-center gap-3 rounded-2xl py-3 pl-[18px] pr-3 text-[15px] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-zinc-50 font-semibold text-primary'
                : 'text-zinc-500 hover:bg-zinc-50/60 hover:text-zinc-900'
            }"
          >
            <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center">
              ${icon}
            </span>
            <span class="pd-sb-label min-w-0 truncate text-[15.5px] font-medium leading-tight">${escapeHtml(item.label)}</span>
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
 * Satu markup untuk kedua keadaan; nama/role dan tombol keluar disembunyikan
 * lewat CSS saat collapsed sehingga avatar tetap pada posisi yang sama.
 * @param {object|null} user
 * @returns {string}
 */
function renderSidebarUserCard(user) {
  const nama = user?.nama || 'Pengguna';
  const role = user?.role || '';
  const roleText = ROLE_LABEL[role] || (role === 'peminjam' ? 'Peminjam' : 'PJ Inventaris');
  const initials = getInitials(nama) || 'PD';

  return `
    <div class="mt-auto border-t border-zinc-100 px-3 pb-5 pt-4">
      <div class="flex items-center gap-3 rounded-[20px] px-2 py-3">
        <a
          href="#/profil"
          aria-label="Buka profil ${escapeHtml(nama)}"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-avatar text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ${escapeHtml(initials)}
        </a>
        <a
          href="#/profil"
          aria-label="Buka profil ${escapeHtml(nama)}"
          class="pd-sb-label min-w-0 flex-1 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p class="truncate text-[15px] font-semibold text-zinc-900">
            ${escapeHtml(nama)}
          </p>
          <p class="mt-0.5 truncate text-[13px] text-zinc-500">
            ${escapeHtml(roleText)}
          </p>
        </a>
        <button
          type="button"
          data-action="logout"
          aria-label="Keluar"
          title="Keluar"
          class="pd-sb-trailing inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-rose-500 transition-colors hover:bg-rose-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

  return `
    <aside
      id="app-sidebar"
      data-collapsed="${collapsed ? 'true' : 'false'}"
      aria-label="Sidebar Navigasi"
      class="pd-sidebar sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-zinc-100 bg-white md:flex ${collapsed ? 'w-[84px]' : 'w-[280px]'}"
    >
      ${renderSidebarBrand(collapsed)}
      ${renderSidebarNav(items, currentHash, user?.role, 'sidebar')}
      ${renderSidebarUserCard(user)}
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
      <div class="flex w-full items-center justify-between px-4 pt-5 pb-5">
        <div aria-label="Logo PinjemDulu" class="inline-flex min-w-0 items-center gap-3">
          <img
            src="assets/img/Logo-PinjemDulu.png"
            alt="Logo PinjemDulu"
            class="h-11 w-11 shrink-0 rounded-[12px] object-contain shadow-sm"
          />
          <div class="flex min-w-0 flex-col leading-none">
            <span class="whitespace-nowrap text-[24px] font-bold leading-none tracking-tight">
              <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
            </span>
            <span
              class="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.24em] text-zinc-500"
            >
              INVENTARIS OKI KAMPUS
            </span>
          </div>
        </div>
        <button
          type="button"
          data-action="close-drawer"
          aria-label="Tutup menu"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ${renderIcon('X', 'h-5 w-5')}
        </button>
      </div>

      ${renderSidebarNav(items, currentHash, user?.role, 'drawer')}
      ${renderSidebarUserCard(user)}
    </aside>
  `;
}
