/**
 * kelola-kategori-state.js — State murni halaman Kelola Kategori (V4a).
 * Mengatur transisi pencarian, paginasi, dan dialog (tambah, edit, hapus, feedback).
 * Fungsi murni, bebas DOM dan efek samping, aman untuk unit test node:test.
 */

/**
 * @typedef {Object} KategoriPageState
 * @property {string} cari
 * @property {number} halaman
 * @property {number} perPage
 * @property {'tambah'|'confirm-tambah'|'edit'|'confirm-edit'|'hapus'|'feedback'|null} dialog
 * @property {object|null} editItem
 * @property {object|null} deleteItem
 * @property {string} inputNama
 * @property {string|null} inputError
 * @property {boolean} isSubmitting
 * @property {{ type: 'success'|'error', title: string, message: string }|null} feedback
 */

/**
 * Inisialisasi state awal halaman kelola kategori.
 * @param {Partial<KategoriPageState>} [overrides]
 * @returns {KategoriPageState}
 */
export function createInitialKategoriState(overrides = {}) {
  return {
    cari: '',
    halaman: 1,
    perPage: 10,
    dialog: null,
    editItem: null,
    deleteItem: null,
    inputNama: '',
    inputError: null,
    isSubmitting: false,
    feedback: null,
    ...overrides,
  };
}

/**
 * Reducer transisi state murni untuk kelola kategori.
 *
 * @param {KategoriPageState} state
 * @param {{ type: string, payload?: any }} action
 * @returns {KategoriPageState}
 */
export function kategoriStateReducer(state, action) {
  if (!state) state = createInitialKategoriState();
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

    case 'ganti-halaman': {
      const hal = Number(action.payload?.halaman || 1);
      return {
        ...state,
        halaman: hal > 0 ? hal : 1,
      };
    }

    case 'buka-dialog-tambah': {
      return {
        ...state,
        dialog: 'tambah',
        editItem: null,
        inputNama: '',
        inputError: null,
      };
    }

    case 'ubah-input-nama': {
      const nama = typeof action.payload?.nama === 'string' ? action.payload.nama : '';
      return {
        ...state,
        inputNama: nama,
        inputError: null,
      };
    }

    case 'set-input-error': {
      const error = action.payload?.error || null;
      return {
        ...state,
        inputError: error,
      };
    }

    case 'konfirmasi-tambah': {
      return {
        ...state,
        dialog: 'confirm-tambah',
      };
    }

    case 'kembali-ke-form-tambah': {
      return {
        ...state,
        dialog: 'tambah',
      };
    }

    case 'buka-dialog-edit': {
      const item = action.payload?.item || null;
      return {
        ...state,
        dialog: 'edit',
        editItem: item,
        inputNama: item?.namaKategori || '',
        inputError: null,
      };
    }

    case 'konfirmasi-edit': {
      return {
        ...state,
        dialog: 'confirm-edit',
      };
    }

    case 'kembali-ke-form-edit': {
      return {
        ...state,
        dialog: 'edit',
      };
    }

    case 'buka-dialog-hapus': {
      const item = action.payload?.item || null;
      return {
        ...state,
        dialog: 'hapus',
        deleteItem: item,
      };
    }

    case 'set-submitting': {
      return {
        ...state,
        isSubmitting: Boolean(action.payload?.isSubmitting),
      };
    }

    case 'buka-feedback': {
      const fb = action.payload?.feedback || null;
      return {
        ...state,
        dialog: 'feedback',
        feedback: fb,
      };
    }

    case 'tutup-dialog':
    case 'batal-dialog':
    case 'backdrop-klik':
    case 'escape-tekan': {
      // Jika di dialog konfirmasi submit (tambah/edit), Batal/Esc mengembalikan ke form input
      if (state.dialog === 'confirm-tambah') {
        return {
          ...state,
          dialog: 'tambah',
        };
      }
      if (state.dialog === 'confirm-edit') {
        return {
          ...state,
          dialog: 'edit',
        };
      }

      // Dialog lainnya ditutup sepenuhnya
      return {
        ...state,
        dialog: null,
        editItem: null,
        deleteItem: null,
        inputNama: '',
        inputError: null,
        feedback: null,
        isSubmitting: false,
      };
    }

    default:
      return state;
  }
}
