/**
 * main.js — Titik masuk utama aplikasi PinjemDulu.
 * Mengkoordinasikan shell Tailwind, otentikasi sesi, dan route guard.
 */

import { getUser, logout } from './state/session.js';
import { renderSidebar, renderMobileDrawer, STORAGE_KEY_SIDEBAR } from './ui/sidebar.js';
import { renderNavbar } from './ui/navbar.js';
import { renderFooter } from './ui/footer.js';
import { handleRouteChange, navigate } from './router.js';
import { getPageTitle } from './lib/navigation.js';

function initApp() {
  if (typeof document === 'undefined') return;

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
    const user = getUser();
    const currentHash = window.location.hash || '';
    const isLoginView = currentHash === '#/login' || !user;

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

  async function route() {
    if (drawerOpen) {
      drawerOpen = false;
    }
    renderShell();
    const user = getUser();
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
        if (chevron) {
          chevron.innerHTML = isHidden
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
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

  window.addEventListener('pd:session-change', () => {
    route();
  });

  route();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
