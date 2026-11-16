/**
 * badge.js — Layanan sinkronisasi angka badge notifikasi sidebar dengan Backend API.
 */

import { apiFetch, isMockEnabled } from './client.js';
import { setLiveBadgeCounts, resetLiveBadgeCounts } from '../lib/navigation.js';
import { getToken } from '../state/session.js';

let isFetching = false;

/**
 * Muat angka badge terbaru dari backend dan perbarui sidebar.
 * @returns {Promise<object|null>}
 */
export async function refreshBadges() {
  if (isMockEnabled() || !getToken() || isFetching) {
    return null;
  }

  isFetching = true;
  try {
    const data = await apiFetch('/api/badge');
    if (!data) return null;

    const counts = {
      'nav-pengajuan-saya-peminjaman': Math.max(
        0,
        (Number(data?.pengajuanSaya?.peminjaman?.disetujui) || 0) +
        (Number(data?.pengajuanSaya?.peminjaman?.dipinjam) || 0) +
        (Number(data?.pengajuanSaya?.peminjaman?.ditolak) || 0)
      ),
      'nav-pengajuan-saya-pengembalian': Math.max(
        0,
        (Number(data?.pengajuanSaya?.pengembalian?.dikembalikan) || 0) +
        (Number(data?.pengajuanSaya?.pengembalian?.terlambat) || 0) +
        (Number(data?.pengajuanSaya?.pengembalian?.ditolak) || 0)
      ),
      'nav-kelola-peminjaman': Math.max(0, Number(data?.pj?.kelolaPeminjaman) || 0),
      'nav-kelola-pengembalian': Math.max(0, Number(data?.pj?.kelolaPengembalian) || 0),
      'nav-list-pengajuan-pj': Math.max(0, Number(data?.pj?.listPengajuanPj) || 0),
      'nav-kelola-pengguna': Math.max(0, Number(data?.pj?.requestPassword) || 0),
    };

    setLiveBadgeCounts(counts);
    return counts;
  } catch {
    return null;
  } finally {
    isFetching = false;
  }
}

export { resetLiveBadgeCounts };

