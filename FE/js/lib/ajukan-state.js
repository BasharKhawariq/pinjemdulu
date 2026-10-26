/**
 * ajukan-state.js — Logika murni state management halaman ajukan peminjaman.
 */

export const INITIAL_AJUKAN_STATE = Object.freeze({
  jumlah: 1,
  keperluan: '',
  startDate: null,
  endDate: null,
  errors: {},
  isSubmitting: false,
  isSuccess: false,
  generalError: null,
  idPeminjaman: null,
  isDirty: false, // Untuk konfirmasi pembatalan
  showCancelModal: false,
  showConfirmModal: false,
});

/**
 * Reducer murni untuk halaman ajukan peminjaman.
 * @param {typeof INITIAL_AJUKAN_STATE} state
 * @param {object} action
 * @returns {typeof INITIAL_AJUKAN_STATE}
 */
export function reduceAjukanAction(state, action) {
  const { type, payload } = action;

  switch (type) {
    case 'ubah-jumlah':
      return {
        ...state,
        jumlah: Number(payload) || 1,
        errors: { ...state.errors, jumlah: null },
        isDirty: true,
      };

    case 'ubah-keperluan':
      return {
        ...state,
        keperluan: payload || '',
        errors: { ...state.errors, keperluan: null },
        isDirty: true,
      };

    case 'terapkan-tanggal':
      return {
        ...state,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        errors: { ...state.errors, tanggal: null },
        isDirty: true,
      };

    case 'hapus-tanggal':
      return {
        ...state,
        startDate: null,
        endDate: null,
        errors: { ...state.errors, tanggal: null },
        isDirty: true,
      };

    case 'kirim':
      return {
        ...state,
        isSubmitting: true,
        generalError: null,
        errors: {},
      };

    case 'kirim-sukses':
      return {
        ...state,
        isSubmitting: false,
        isSuccess: true,
        isDirty: false,
        idPeminjaman: payload.idPeminjaman,
      };

    case 'kirim-gagal':
      return {
        ...state,
        isSubmitting: false,
        isSuccess: false,
        errors: payload.errors || {},
        generalError: payload.generalError || null,
      };

    case 'tutup-dialog-umpan-balik':
      return {
        ...state,
        isSuccess: false,
      };

    case 'buka-dialog-batal':
      return {
        ...state,
        showCancelModal: true,
      };

    case 'tutup-dialog-batal':
      return {
        ...state,
        showCancelModal: false,
      };

    case 'buka-dialog-konfirmasi':
      return {
        ...state,
        showConfirmModal: true,
      };

    case 'tutup-dialog-konfirmasi':
      return {
        ...state,
        showConfirmModal: false,
      };

    case 'reset-form':
      return {
        ...INITIAL_AJUKAN_STATE,
      };

    default:
      return state;
  }
}
