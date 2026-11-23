/**
 * main.js — Titik masuk utama aplikasi PinjemDulu.
 * Mengkoordinasikan shell Tailwind, otentikasi sesi, dan route guard.
 */

import { getUser, logout } from './state/session.js';
import { checkSession } from './services/auth.js';
import { renderSidebar, renderMobileDrawer, STORAGE_KEY_SIDEBAR, STORAGE_KEY_SIDEBAR_GROUPS } from './ui/sidebar.js';
import { renderNavbar } from './ui/navbar.js';
import { renderFooter } from './ui/footer.js';
import { renderModal } from './ui/modal.js';
import { renderIcon } from './ui/icons.js';
import { handleRouteChange, navigate } from './router.js';
import { getPageTitle } from './lib/navigation.js';
import { refreshBadges, resetLiveBadgeCounts } from './services/badge.js';

function initApp() {
  if (typeof document === 'undefined') return;

  // Kunci scroll viewport sambil mengimbangi lebar scrollbar yang disembunyikan.
  // Body tidak dibuat fixed/hidden agar navbar sticky tetap stabil.
  function setupModalScrollLock() {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    if (!htmlElement || !bodyElement) return;

    const saved = {
      overflow: null,
      overscrollBehavior: null,
      bodyPaddingRight: null,
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

    const modalRootSelector =
      '[data-modal-backdrop], [data-modal-overlay], [data-management-modal-backdrop], dialog[open]';
    const prefersReducedMotion = () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animatedNativeDialogs = new WeakSet();

    const prepareExitClone = (clone) => {
      clone.setAttribute('data-modal-exit-clone', 'true');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('inert', '');
      clone.inert = true;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      clone.querySelectorAll('.pd-fade-in, .pd-pop-in').forEach((element) => {
        element.classList.remove('pd-fade-in', 'pd-pop-in');
      });
    };

    const removeExitCloneLater = (clone) => {
      window.setTimeout(() => clone.remove(), 560);
    };

    const hasReplacementDialog = (dialog) => {
      const titleId = dialog.getAttribute('aria-labelledby');
      if (!titleId) return false;
      return [...document.querySelectorAll('[role="dialog"], dialog[open]')].some(
        (candidate) =>
          candidate !== dialog &&
          !candidate.closest('[data-modal-exit-clone]') &&
          candidate.getAttribute('aria-labelledby') === titleId
      );
    };

    const animateNativeDialogExit = (dialog) => {
      if (
        !dialog ||
        animatedNativeDialogs.has(dialog) ||
        prefersReducedMotion() ||
        dialog.hasAttribute('data-modal-exit-content') ||
        hasReplacementDialog(dialog)
      ) {
        return;
      }
      animatedNativeDialogs.add(dialog);

      const backdrop = document.createElement('div');
      backdrop.className =
        'pd-modal-exit-native fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4';
      backdrop.setAttribute('data-modal-exit-clone', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('inert', '');
      backdrop.inert = true;

      const clone = dialog.cloneNode(true);
      prepareExitClone(clone);
      clone.removeAttribute('data-modal-exit-clone');
      clone.setAttribute('data-modal-exit-content', 'true');
      clone.setAttribute('open', '');
      backdrop.appendChild(clone);
      document.body.appendChild(backdrop);
      removeExitCloneLater(backdrop);
    };

    const animateRemovedModal = (modal) => {
      if (!modal || modal.hasAttribute('data-modal-exit-clone')) return;
      if (modal.matches('dialog')) {
        animateNativeDialogExit(modal);
        return;
      }
      if (prefersReducedMotion()) return;
      if (modal.id && document.getElementById(modal.id)) return;

      const dialog = modal.querySelector('[role="dialog"], dialog');
      if (dialog && hasReplacementDialog(dialog)) return;

      const clone = modal.cloneNode(true);
      prepareExitClone(clone);
      document.body.appendChild(clone);
      removeExitCloneLater(clone);
    };

    const collectModalRoots = (node) => {
      if (!node || node.nodeType !== 1) return [];
      const roots = [
        ...(node.matches(modalRootSelector) ? [node] : []),
        ...node.querySelectorAll(modalRootSelector),
      ];
      return roots.filter(
        (candidate) => !roots.some((other) => other !== candidate && other.contains(candidate))
      );
    };

    const hasActivePopup = () => Boolean(document.querySelector(
      'dialog[open], [data-modal-backdrop], [data-modal-overlay], [data-management-modal-backdrop], #mobile-drawer-backdrop.opacity-100'
    ));

    const lockPageScroll = () => {
      if (saved.locked) return;
      const scrollbarWidth = Math.max(0, window.innerWidth - htmlElement.clientWidth);
      const currentBodyPaddingRight =
        Number.parseFloat(window.getComputedStyle(bodyElement).paddingRight) || 0;

      saved.locked = true;
      saved.overflow = snapshotProperty(htmlElement, 'overflow');
      saved.overscrollBehavior = snapshotProperty(htmlElement, 'overscroll-behavior');
      saved.bodyPaddingRight = snapshotProperty(bodyElement, 'padding-right');

      // Kunci scroll viewport saja. Jangan mengubah body menjadi fixed/hidden,
      // karena body adalah induk navbar sticky dan perubahan itu menggeser shell.
      // Padding mengimbangi lebar scrollbar yang hilang tanpa menyisakan gutter.
      if (scrollbarWidth > 0) {
        bodyElement.style.setProperty(
          'padding-right',
          `${currentBodyPaddingRight + scrollbarWidth}px`,
          'important'
        );
      }
      htmlElement.style.setProperty('overflow', 'hidden');
      htmlElement.style.setProperty('overscroll-behavior', 'none');
    };

    const unlockPageScroll = () => {
      if (!saved.locked) return;
      saved.locked = false;

      restoreProperty(htmlElement, 'overflow', saved.overflow);
      restoreProperty(htmlElement, 'overscroll-behavior', saved.overscrollBehavior);
      restoreProperty(bodyElement, 'padding-right', saved.bodyPaddingRight);
    };

    const syncScrollLock = () => {
      if (hasActivePopup()) lockPageScroll();
      else unlockPageScroll();
    };

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (
          record.type === 'attributes' &&
          record.attributeName === 'open' &&
          record.target.matches('dialog')
        ) {
          if (record.target.hasAttribute('open')) {
            animatedNativeDialogs.delete(record.target);
          } else if (record.oldValue !== null) {
            animateNativeDialogExit(record.target);
          }
        }
        record.removedNodes?.forEach((node) => {
          collectModalRoots(node).forEach(animateRemovedModal);
        });
      });
      syncScrollLock();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['open', 'class', 'style', 'aria-hidden'],
    });

    // Menangani dialog native yang ditutup melalui method close().
    document.addEventListener(
      'close',
      (event) => {
        if (event.target?.tagName === 'DIALOG') animateNativeDialogExit(event.target);
        syncScrollLock();
      },
      true
    );
    document.addEventListener('toggle', syncScrollLock, true);
    syncScrollLock();
  }

  setupModalScrollLock();

  // Pasang animasi Lottie pada setiap indikator loading ([data-pd-lottie]) di seluruh
  // aplikasi, termasuk konten yang dirender ulang secara dinamis oleh tiap halaman.
  // Animasi dihancurkan saat elemennya dilepas dari DOM agar tidak bocor (memori/CPU).
  function setupLottieLoading() {
    const lottie = window.lottie;
    if (!lottie || typeof lottie.loadAnimation !== 'function') return;

    const collect = (node) => {
      if (!node || node.nodeType !== 1) return [];
      const nodes = [];
      if (node.matches('[data-pd-lottie]')) nodes.push(node);
      nodes.push(...node.querySelectorAll('[data-pd-lottie]'));
      return nodes;
    };

    const mount = (el) => {
      if (el.dataset.pdLottieReady === '1') return;
      const path = el.getAttribute('data-pd-lottie');
      if (!path) return;

      // Hormati preferensi pengguna: bila animasi diminta diminimalkan, cukup
      // tampilkan spinner CSS statis bawaan tanpa memutar animasi.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        el.dataset.pdLottieReady = '1';
        return;
      }

      el.dataset.pdLottieReady = '1';
      const fallbackMarkup = el.innerHTML;
      const restoreFallback = () => {
        el.innerHTML = fallbackMarkup;
        el.dataset.pdLottieReady = '0';
      };

      try {
        el.innerHTML = '';
        const anim = lottie.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        });
        // Bila aset animasi gagal dimuat (offline atau dibuka via file://),
        // kembalikan spinner CSS agar indikator loading tidak kosong.
        anim.addEventListener('data_failed', restoreFallback);
        el._pdLottieAnim = anim;
      } catch {
        restoreFallback();
      }
    };

    const unmount = (el) => {
      if (el._pdLottieAnim) {
        try {
          el._pdLottieAnim.destroy();
        } catch {
          /* abaikan */
        }
        el._pdLottieAnim = null;
      }
      el.dataset.pdLottieReady = '0';
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes?.forEach((node) => collect(node).forEach(mount));
        record.removedNodes?.forEach((node) => collect(node).forEach(unmount));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    collect(document.body).forEach(mount);
  }

  setupLottieLoading();

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
  let logoutTrigger = null;

  function closeLogoutConfirm({ restoreFocus = true } = {}) {
    const modal = document.getElementById('logout-confirm-modal');
    modal?.remove();

    if (restoreFocus) logoutTrigger?.focus();
    logoutTrigger = null;
  }

  function openLogoutConfirm(trigger) {
    if (document.getElementById('logout-confirm-modal')) return;

    logoutTrigger = trigger;
    const mount = document.createElement('template');
    mount.innerHTML = renderModal({
      id: 'logout-confirm-modal',
      title: 'Keluar dari akun?',
      description: 'Apakah Anda yakin ingin keluar?',
      variant: 'cancel',
      maxWidth: 'max-w-sm',
      showCloseButton: true,
      closeAction: 'cancel-logout',
      actions: [
        { label: 'Batal', action: 'cancel-logout', variant: 'outline' },
        { label: 'Ya, keluar', action: 'confirm-logout', variant: 'destructive' },
      ],
    });

    const modal = mount.content.firstElementChild;
    if (!modal) {
      logoutTrigger = null;
      return;
    }

    document.body.appendChild(modal);
    modal.querySelector('[data-action="cancel-logout"]')?.focus();
  }

  // Mainkan animasi masuk halaman setiap kali rute berubah.
  // Class dihapus dan ditambah ulang dengan pemaksaan reflow agar animasi tidak terlewat.
  function playPageEnter(el) {
    if (!el) return;
    el.classList.remove('pd-page-in');
    void el.offsetWidth;
    el.classList.add('pd-page-in');
  }

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
      if (shellRoot) shellRoot.className = 'w-full min-h-[100dvh] bg-white';
      if (contentContainer) contentContainer.className = 'w-full min-h-[100dvh]';
      if (mainEl) mainEl.className = 'w-full min-h-[100dvh] p-0';
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
      if (collapsed) persistSidebarGroupState();
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

  // Terapkan status collapsed langsung ke DOM tanpa membangun ulang sidebar,
  // supaya transisi lebar CSS beranimasi mulus dan posisi logo/ikon tidak bergeser.
  function setSidebarCollapsed(nextCollapsed, { persist = false } = {}) {
    collapsed = nextCollapsed;

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY_SIDEBAR, collapsed ? '1' : '0');
      } catch {
        /* abaikan jika localStorage tidak tersedia */
      }
    }

    const aside = sidebarContainer?.querySelector('#app-sidebar');
    if (!aside) {
      renderShell();
      return;
    }

    aside.setAttribute('data-collapsed', collapsed ? 'true' : 'false');

    const toggle = aside.querySelector('[data-action="toggle-sidebar"]');
    if (toggle) {
      const label = collapsed ? 'Lebarkan sidebar' : 'Persempit sidebar';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    if (collapsed) {
      closeSidebarSubmenus(aside);
      persistSidebarGroupState();
    }
  }

  function closeSidebarSubmenus(aside) {
    aside.querySelectorAll('[data-action="toggle-group"][data-group]').forEach((button) => {
      const sub = button.closest('li')?.querySelector('.pd-sb-sub');
      if (!sub) return;

      sub.setAttribute('data-open', 'false');
      button.setAttribute('aria-expanded', 'false');

      const chevron = button.querySelector('[data-chevron]');
      if (chevron) {
        chevron.innerHTML = renderIcon(
          'ChevronDown',
          'h-4 w-4 transition-colors sidebar-nav-group-chevron-svg'
        );
      }
    });
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
    playPageEnter(mainEl);
  }

  // Event delegation untuk tombol aksi di seluruh dokumen
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) {
      const logoutModal = document.getElementById('logout-confirm-modal');
      if (logoutModal && e.target === logoutModal) {
        closeLogoutConfirm();
        return;
      }
      if (drawerOpen && e.target.closest('a[href^="#/"]')) {
        drawerOpen = false;
        renderShell();
      }
      return;
    }

    const action = actionEl.getAttribute('data-action');
    if (action === 'toggle-sidebar') {
      setSidebarCollapsed(!collapsed, { persist: true });
    } else if (action === 'open-drawer') {
      drawerOpen = true;
      renderShell();
      const closeBtn = drawerContainer?.querySelector('[data-action="close-drawer"]');
      closeBtn?.focus();
    } else if (action === 'close-drawer') {
      drawerOpen = false;
      renderShell();
    } else if (action === 'toggle-group') {
      if (collapsed && !drawerOpen) {
        setSidebarCollapsed(false, { persist: true });
        return;
      }
      // Animasi buka/tutup submenu diatur CSS lewat atribut data-open; DOM tidak
      // dibangun ulang agar transisinya tetap berjalan.
      const sub = actionEl.closest('li')?.querySelector('.pd-sb-sub');
      if (sub) {
        const willOpen = sub.getAttribute('data-open') !== 'true';
        sub.setAttribute('data-open', String(willOpen));
        actionEl.setAttribute('aria-expanded', String(willOpen));
        persistSidebarGroupState();
        const chevronIcon = actionEl.querySelector('[data-chevron] .sidebar-nav-group-chevron-svg');
        chevronIcon?.classList.toggle('rotate-180', willOpen);
      }
    } else if (action === 'logout') {
      openLogoutConfirm(actionEl);
    } else if (action === 'cancel-logout') {
      closeLogoutConfirm();
    } else if (action === 'confirm-logout') {
      closeLogoutConfirm({ restoreFocus: false });
      logout();
      navigate('#/login');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('logout-confirm-modal')) {
      closeLogoutConfirm();
      return;
    }
    if (drawerOpen) {
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

  // Indikator spinner dan soft-loading halus global saat panggilan API berlangsung
  window.addEventListener('pd:loading-state', (e) => {
    const isActive = Boolean(e?.detail?.active);
    const indicator = document.getElementById('navbar-loading-indicator');
    const progressBar = document.getElementById('global-progress-bar');

    if (indicator) {
      if (isActive) {
        indicator.classList.remove('hidden');
        indicator.classList.add('inline-flex');
      } else {
        indicator.classList.remove('inline-flex');
        indicator.classList.add('hidden');
      }
    }

    if (progressBar) {
      if (isActive) {
        progressBar.classList.remove('opacity-0');
        progressBar.classList.add('opacity-100');
      } else {
        progressBar.classList.remove('opacity-100');
        progressBar.classList.add('opacity-0');
      }
    }
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
