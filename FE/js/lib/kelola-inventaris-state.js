/**
 * kelola-inventaris-state.js — Fungsi murni pengelola state halaman Kelola Inventaris (R1).
 * Mengatur transisi state pencarian, filter draft/aktif, paginasi, dan dialog.
 * Bebas efek samping DOM, aman diuji di node:test.
 */

/**
 * @typedef {Object} KelolaFilters
 * @property {string|null} kategori
 * @property {string|null} kondisi
 * @property {string|null} status
 */

/**
 * @typedef {Object} KelolaPageState
 * @property {string} cari
 * @property {KelolaFilters} filterDraft
 * @property {KelolaFilters} filterAktif
 * @property {number} halaman
 * @property {'filter'|'detail'|'hapus'|'feedback'|null} dialog
 * @property {object|null} detailItem
 * @property {object|null} deleteItem
 * @property {object|null} feedback
 */

/**
 * Inisialisasi state awal halaman kelola inventaris.
 * @param {Partial<KelolaPageState>} [overrides]
 * @returns {KelolaPageState}
 */
export function createInitialState(overrides = {}) {
  const defaultFilters = { kategori: null, kondisi: null, status: null };
  return {
    cari: '',
    filterDraft: { ...defaultFilters, ...(overrides.filterDraft || overrides.filterAktif || {}) },
    filterAktif: { ...defaultFilters, ...(overrides.filterAktif || {}) },
    halaman: 1,
    dialog: null,
    detailItem: null,
    deleteItem: null,
    feedback: null,
    ...overrides,
  };
}

/**
 * Reducer murni untuk transisi state kelola inventaris.
 *
 * @param {KelolaPageState} state
 * @param {{ type: string, payload?: any }} action
 * @returns {KelolaPageState}
 */
export function kelolaStateReducer(state, action) {
  if (!state) state = createInitialState();
  if (!action || !action.type) return state;

  switch (action.type) {
    case 'cari-berubah': {
      const cari = typeof action.payload?.cari === 'string' ? action.payload.cari : '';
      return {
        ...state,
        cari,
        halaman: 1,
      };
    }

    case 'buka-filter': {
      return {
        ...state,
        filterDraft: { ...state.filterAktif },
        dialog: 'filter',
      };
    }

    case 'filter-ubah-kategori': {
      const kat = action.payload?.kategori || null;
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          kategori: kat && kat.length > 0 ? kat : null,
        },
      };
    }

    case 'filter-ubah-kondisi': {
      const kon = action.payload?.kondisi || null;
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          kondisi: kon && kon.length > 0 ? kon : null,
        },
      };
    }

    case 'filter-ubah-status': {
      const st = action.payload?.status || null;
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          status: st && st.length > 0 ? st : null,
        },
      };
    }

    case 'filter-reset': {
      return {
        ...state,
        filterDraft: {
          kategori: null,
          kondisi: null,
          status: null,
        },
      };
    }

    case 'filter-terapkan': {
      return {
        ...state,
        filterAktif: { ...state.filterDraft },
        halaman: 1,
        dialog: null,
      };
    }

    case 'filter-tutup': {
      return {
        ...state,
        filterDraft: { ...state.filterAktif },
        dialog: state.dialog === 'filter' ? null : state.dialog,
      };
    }

    case 'buka-detail': {
      return {
        ...state,
        detailItem: action.payload?.item || null,
        dialog: 'detail',
      };
    }

    case 'tutup-detail': {
      return {
        ...state,
        detailItem: null,
        dialog: state.dialog === 'detail' ? null : state.dialog,
      };
    }

    case 'buka-hapus': {
      return {
        ...state,
        deleteItem: action.payload?.item || null,
        dialog: 'hapus',
      };
    }

    case 'tutup-hapus': {
      return {
        ...state,
        deleteItem: null,
        dialog: state.dialog === 'hapus' ? null : state.dialog,
      };
    }

    case 'buka-feedback': {
      return {
        ...state,
        feedback: action.payload?.feedback || null,
        dialog: 'feedback',
      };
    }

    case 'tutup-feedback': {
      return {
        ...state,
        feedback: null,
        dialog: state.dialog === 'feedback' ? null : state.dialog,
      };
    }

    case 'ganti-halaman': {
      const h = Number(action.payload?.halaman);
      if (Number.isInteger(h) && h >= 1) {
        return {
          ...state,
          halaman: h,
        };
      }
      return state;
    }

    case 'reset-semua': {
      const emptyFilters = { kategori: null, kondisi: null, status: null };
      return {
        ...state,
        cari: '',
        filterAktif: { ...emptyFilters },
        filterDraft: { ...emptyFilters },
        halaman: 1,
      };
    }

    default:
      return state;
  }
}
