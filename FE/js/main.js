/**
 * main.js — Titik masuk utama aplikasi PinjemDulu.
 * Mengkoordinasikan shell Tailwind, otentikasi sesi, dan route guard.
 */

import { getUser, logout } from './state/session.js';
import { checkSession } from './services/auth.js';
import { renderSidebar, renderMobileDrawer, STORAGE_KEY_SIDEBAR, STORAGE_KEY_SIDEBAR_GROUPS } from './ui/sidebar.js';
import { renderNavbar } from './ui/navbar.js';
import { renderFooter } from './ui/footer.js';
import { handleRouteChange, navigate } from './router.js';
import { getPageTitle } from './lib/navigation.js';
import { refreshBadges, resetLiveBadgeCounts } from './services/badge.js';

function initApp() {
  if (typeof document === 'undefined') return;

  // Kunci scroll pada viewport tanpa mengubah posisi atau ukuran body.
  // Ini menjaga navbar sticky dan konten tetap pada posisi scroll semula.
  function setupModalScrollLock() {
    const htmlElement = document.documentElement;
    if (!htmlElement) return;

    const saved = {
      overflow: null,
      scrollbarGutter: null,
      overscrollBehavior: null,
      locked: false,
    };

    const snapshotProperty = (element, property) => ({
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    });
    const restoreProperty = (element, property, snapshot) => {
      if (snapshot.value) {
        element.style.setProperty(property, snapshot.value, snapshot.priority);
      } else {
        element.style.removeProperty(property);
      }
    };

    const hasActivePopup = () => Boolean(document.querySelector(
      'dialog[open], [data-modal-backdrop], [data-modal-overlay], [data-management-modal-backdrop], #mobile-drawer-backdrop.opacity-100'
    ));

    const lockPageScroll = () => {
      if (saved.locked) return;
      saved.locked = true;

      saved.overflow = snapshotProperty(htmlElement, 'overflow');
      saved.scrollbarGutter = snapshotProperty(htmlElement, 'scrollbar-gutter');
      saved.overscrollBehavior = snapshotProperty(htmlElement, 'overscroll-behavior');

      // Kunci scroll viewport saja. Jangan mengubah body menjadi fixed/hidden,
      // karena body adalah induk navbar sticky dan perubahan itu menggeser shell.
      htmlElement.style.setProperty('overflow', 'hidden');
      htmlElement.style.setProperty('scrollbar-gutter', 'stable');
      htmlElement.style.setProperty('overscroll-behavior', 'none');
    };

    const unlockPageScroll = () => {
      if (!saved.locked) return;
      saved.locked = false;

      restoreProperty(htmlElement, 'overflow', saved.overflow);
      restoreProperty(htmlElement, 'scrollbar-gutter', saved.scrollbarGutter);
      restoreProperty(htmlElement, 'overscroll-behavior', saved.overscrollBehavior);
    };

    const syncScrollLock = () => {
      if (hasActivePopup()) lockPageScroll();
      else unlockPageScroll();
    };

    const observer = new MutationObserver(syncScrollLock);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open', 'class', 'style', 'aria-hidden'],
    });

    // Menangani dialog native yang ditutup melalui method close().
    document.addEventListener('close', syncScrollLock, true);
    document.addEventListener('toggle', syncScrollLock, true);
    syncScrollLock();
  }

  setupModalScrollLock();

  const shellRoot = document.getElementById('shell-root');
  const sidebarContainer = document.getElementById('sidebar-container');
  const contentContainer = document.getElementById('content-container');
  const navbarContainer = document.getElementById('navbar-container');
  const footerContainer = document.getElementById('footer-container');
  const drawerContainer = document.getElementById('drawer-container');
  const mainEl = document.getElementById('app');

  if (!mainEl) return;

  let collapsed = false;
  try {
    collapsed = window.localStorage.getItem(STORAGE_KEY_SIDEBAR) === '1';
  } catch {
    collapsed = false;
  }

  let drawerOpen = false;

  function renderShell() {
    // Simpan posisi scroll navigasi sebelum sidebar dirender ulang.
    const previousNavScrollTop = sidebarContainer
      ?.querySelector('nav[aria-label="Navigasi Utama"]')
      ?.scrollTop ?? 0;

    const user = getUser();
    const currentHash = window.location.hash || '';
    const isLoginView = currentHash === '#/login' || currentHash.startsWith('#/reset-password') || !user;

    if (isLoginView) {
      if (sidebarContainer) sidebarContainer.innerHTML = '';
      if (navbarContainer) navbarContainer.innerHTML = '';
      if (footerContainer) footerContainer.innerHTML = '';
      if (drawerContainer) drawerContainer.innerHTML = '';
      if (shellRoot) shellRoot.className = 'w-full min-h-screen bg-white';
      if (contentContainer) contentContainer.className = 'w-full min-h-screen';
      if (mainEl) mainEl.className = 'w-full min-h-screen p-0';
      document.title = 'Masuk | PinjemDulu - Inventaris OKI Kampus';
      return;
    }

    if (shellRoot) shellRoot.className = 'flex min-h-screen w-full bg-zinc-50 text-zinc-900';
    if (contentContainer) contentContainer.className = 'flex min-w-0 flex-1 flex-col';
    if (mainEl) mainEl.className = 'min-w-0 flex-1 p-4 sm:p-7';

    const { title, icon } = getPageTitle(currentHash);
    document.title = `${title || 'Inventaris'} | PinjemDulu - Inventaris OKI Kampus`;

    if (sidebarContainer) {
      sidebarContainer.innerHTML = renderSidebar({ user, currentHash, collapsed });
      const nav = sidebarContainer.querySelector('nav[aria-label="Navigasi Utama"]');
      if (nav) nav.scrollTop = previousNavScrollTop;
    }

    if (navbarContainer) {
      navbarContainer.innerHTML = renderNavbar({ title, icon });
    }

    if (drawerContainer) {
      drawerContainer.innerHTML = renderMobileDrawer({ user, currentHash, open: drawerOpen });
    }

    if (footerContainer) {
      footerContainer.innerHTML = renderFooter();
    }
  }

  function persistSidebarGroupState() {
    if (!sidebarContainer) return;
    const groups = {};
    sidebarContainer.querySelectorAll('[data-action="toggle-group"][data-group]').forEach((button) => {
      const key = button.getAttribute('data-group');
      if (key) groups[key] = button.getAttribute('aria-expanded') === 'true';
    });
    if (Object.keys(groups).length === 0) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY_SIDEBAR_GROUPS) || '{}');
      window.localStorage.setItem(STORAGE_KEY_SIDEBAR_GROUPS, JSON.stringify({ ...saved, ...groups }));
    } catch {
      /* abaikan jika localStorage tidak tersedia */
    }
  }

  async function route() {
    // Simpan status submenu sebelum shell dirender ulang karena perubahan route.
    persistSidebarGroupState();
    if (drawerOpen) {
      drawerOpen = false;
    }
    renderShell();
    const user = getUser();
    if (user) {
      refreshBadges().catch(() => {});
    }
    await handleRouteChange(mainEl, { user });
    renderShell();
  }

  // Event delegation untuk tombol aksi di seluruh dokumen
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) {
      if (drawerOpen && e.target.closest('a[href^="#/"]')) {
        drawerOpen = false;
        renderShell();
      }
      return;
    }

    const action = actionEl.getAttribute('data-action');
    if (action === 'toggle-sidebar') {
      collapsed = !collapsed;
      try {
        window.localStorage.setItem(STORAGE_KEY_SIDEBAR, collapsed ? '1' : '0');
      } catch {
        /* abaikan */
      }
      renderShell();
    } else if (action === 'open-drawer') {
      drawerOpen = true;
      renderShell();
      const closeBtn = drawerContainer?.querySelector('[data-action="close-drawer"]');
      closeBtn?.focus();
    } else if (action === 'close-drawer') {
      drawerOpen = false;
      renderShell();
    } else if (action === 'toggle-group') {
      const groupKey = actionEl.getAttribute('data-group');
      if (collapsed && !drawerOpen) {
        collapsed = false;
        try {
          window.localStorage.setItem(STORAGE_KEY_SIDEBAR, '0');
        } catch {
          /* abaikan */
        }
        renderShell();
        return;
      }
      const targetId = actionEl.getAttribute('aria-controls');
      const container = actionEl.closest('li');
      const sub = (targetId ? document.getElementById(targetId) : null) || container?.querySelector('ul') || document.getElementById(`sub-${groupKey}`);
      if (sub) {
        const isHidden = sub.classList.contains('hidden');
        sub.classList.toggle('hidden', !isHidden);
        actionEl.setAttribute('aria-expanded', String(isHidden));
        const chevron = actionEl.querySelector('[data-chevron]');
        persistSidebarGroupState();
        if (chevron) {
          const chevronIcon = chevron.querySelector('.sidebar-nav-group-chevron-svg');
          chevronIcon?.classList.toggle('rotate-180', isHidden);
        }
      }
    } else if (action === 'logout') {
      logout();
      navigate('#/login');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) {
      drawerOpen = false;
      renderShell();
    }
  });

  window.addEventListener('hashchange', () => {
    route();
  });

  window.addEventListener('pd:session-change', (e) => {
    if (!e?.detail) {
      resetLiveBadgeCounts();
    } else {
      refreshBadges().catch(() => {});
    }
    route();
  });

  // Perbarui badge sidebar setiap data peminjaman berubah (buat pengajuan,
  // persetujuan/penolakan, konfirmasi pengambilan, dan proses pengembalian).
  window.addEventListener('pd:peminjaman-changed', () => {
    refreshBadges().catch(() => {});
    renderShell();
  });

  // Perbarui badge saat notifikasi pada tab/page ditandai sudah dibaca.
  window.addEventListener('pd:notifications-changed', () => {
    renderShell();
  });

  checkSession().then((u) => {
    if (u) refreshBadges().catch(() => {});
  }).catch(() => {});
  route();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
