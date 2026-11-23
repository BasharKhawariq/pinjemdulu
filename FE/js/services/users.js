import { mockUsers } from '../data/users.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { delay, isMockEnabled, apiFetch } from './client.js';


// Data mockup List Request Password untuk pengembangan frontend.
const mockRequestPasswords = [
  { idRequestPassword: 1, namaPengguna: 'Ahmad Fauzan', nim: '254107020001', okiPemohon: 'HMTI', logoUrl: null, tanggalRequest: '2026-11-18T08:30:00', status: 'Menunggu' },
  { idRequestPassword: 2, namaPengguna: 'Siti Nurhaliza', nim: '254107020002', okiPemohon: 'HIMANIA', logoUrl: null, tanggalRequest: '2026-11-18T09:15:00', status: 'Dikonfirmasi' },
  { idRequestPassword: 3, namaPengguna: 'Rizky Ramadhan', nim: '254107020003', okiPemohon: 'BEM', logoUrl: null, tanggalRequest: '2026-11-18T10:20:00', status: 'Menunggu' },
  { idRequestPassword: 4, namaPengguna: 'Dinda Maharani', nim: '254107020004', okiPemohon: 'HME', logoUrl: null, tanggalRequest: '2026-11-17T13:45:00', status: 'Dikonfirmasi' },
  { idRequestPassword: 5, namaPengguna: 'Fajar Maulana', nim: '254107020005', okiPemohon: 'RISPOL', logoUrl: null, tanggalRequest: '2026-11-17T14:10:00', status: 'Menunggu' },
  { idRequestPassword: 6, namaPengguna: 'Nabila Putri', nim: '254107020006', okiPemohon: 'HMS', logoUrl: null, tanggalRequest: '2026-11-16T08:00:00', status: 'Dikonfirmasi' },
  { idRequestPassword: 7, namaPengguna: 'Bagas Pratama', nim: '254107020007', okiPemohon: 'THEATRISIC', logoUrl: null, tanggalRequest: '2026-11-16T11:30:00', status: 'Menunggu' },
  { idRequestPassword: 8, namaPengguna: 'Citra Lestari', nim: '254107020008', okiPemohon: 'PP', logoUrl: null, tanggalRequest: '2026-11-15T09:25:00', status: 'Dikonfirmasi' },
  { idRequestPassword: 9, namaPengguna: 'Dimas Arya', nim: '254107020009', okiPemohon: 'HMTI', logoUrl: null, tanggalRequest: '2026-11-14T15:40:00', status: 'Menunggu' },
  { idRequestPassword: 10, namaPengguna: 'Intan Permata', nim: '254107020010', okiPemohon: 'HIMANIA', logoUrl: null, tanggalRequest: '2026-11-14T16:20:00', status: 'Dikonfirmasi' },
];

function requireWhatsapp(value) {
  const whatsapp = String(value ?? '').trim();
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits) throw new Error('No WhatsApp wajib diisi.');
  if (digits.length < 10) throw new Error('Nomor WhatsApp minimal 10 angka.');
  if (whatsapp.length > 20) throw new Error('Nomor WhatsApp maksimal 20 karakter.');
  return whatsapp;
}

export async function getUsers(params = {}) {
  if (!isMockEnabled()) {
    const queryParams = new URLSearchParams();
    if (params.role && params.role !== 'all') queryParams.set('role', params.role);
    if (params.status && params.status !== 'all') queryParams.set('status', params.status);
    if (params.q) queryParams.set('q', params.q);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const res = await apiFetch(`/api/kelola-pengguna${qs}`);
    const list = Array.isArray(res) ? res : res?.data || [];
    return list.map((u) => ({
      ...u,
      id: u.nim,
      nim: u.nim,
      nama: u.namaPengguna,
      namaPengguna: u.namaPengguna,
      noWhatsapp: u.noWhatsapp || u.no_whatsapp || '',
      role: (u.role === 'Penanggung Jawab' || String(u.role).toLowerCase().includes('jawab')) ? ROLES.PENANGGUNG_JAWAB : ROLES.PEMINJAM,
      statusAkun: u.statusAkun ? STATUS_AKUN.AKTIF : STATUS_AKUN.NONAKTIF,
      status_akun: u.statusAkun ? STATUS_AKUN.AKTIF : STATUS_AKUN.NONAKTIF,
      idOrganisasi: u.idOrganisasi,
      displayOrganization: u.singkatan || u.namaOrganisasi || 'Organisasi',
      organisasi: {
        idOrganisasi: u.idOrganisasi,
        nama: u.namaOrganisasi,
        singkatan: u.singkatan,
        logoUrl: u.logoUrl,
      },
      logoUrl: u.logoUrl || null,
      managementList: true,
    }));
  }

  await delay(50);
  return [...mockUsers];
}

export async function updateMockUser(id, updates = {}) {
  const noWhatsapp = updates.noWhatsapp !== undefined
    ? requireWhatsapp(updates.noWhatsapp)
    : undefined;

  if (!isMockEnabled()) {
    const nim = String(id).trim();
    if (updates.statusAkun !== undefined) {
      const isAktif = updates.statusAkun === STATUS_AKUN.AKTIF || updates.statusAkun === true;
      await apiFetch(`/api/kelola-pengguna/${nim}/status`, {
        method: 'PUT',
        body: { statusAkun: isAktif },
      });
    }
    if (updates.nama !== undefined || updates.role !== undefined || updates.noWhatsapp !== undefined || (updates.nim !== undefined && updates.nim !== nim)) {
      const roleFormatted = (updates.role === ROLES.PENANGGUNG_JAWAB || updates.role === 'Penanggung Jawab')
        ? 'Penanggung Jawab'
        : 'Peminjam';
      await apiFetch(`/api/kelola-pengguna/${nim}`, {
        method: 'PUT',
        body: {
          namaPengguna: updates.nama ? String(updates.nama).trim() : undefined,
          role: updates.role ? roleFormatted : undefined,
          nim: updates.nim ? String(updates.nim).trim() : undefined,
          noWhatsapp,
        },
      });
    }
    return { id, nim, ...updates };
  }

  await delay(30);
  const user = mockUsers.find((item) => String(item.id) === String(id));
  if (!user) throw new Error('Pengguna tidak ditemukan.');

  if (updates.nama !== undefined) user.nama = String(updates.nama).trim();
  if (updates.nim !== undefined) user.nim = String(updates.nim).trim();
  if (updates.email !== undefined) user.email = String(updates.email).trim();
  if (noWhatsapp !== undefined) user.noWhatsapp = noWhatsapp;
  if (updates.businessUnit !== undefined) user.businessUnit = String(updates.businessUnit).trim();
  if (updates.displayOrganization !== undefined) user.displayOrganization = String(updates.displayOrganization).trim();
  if (updates.role !== undefined) {
    if (![ROLES.PEMINJAM, ROLES.PENANGGUNG_JAWAB].includes(updates.role)) throw new Error('Peran pengguna tidak valid.');
    user.role = updates.role;
  }
  if (updates.statusAkun !== undefined) {
    if (![STATUS_AKUN.AKTIF, STATUS_AKUN.NONAKTIF].includes(updates.statusAkun)) throw new Error('Status akun tidak valid.');
    user.statusAkun = updates.statusAkun;
    user.status_akun = updates.statusAkun;
  }
  return { ...user };
}

export async function addMockUser(data = {}) {
  const noWhatsapp = requireWhatsapp(data.noWhatsapp);

  if (!isMockEnabled()) {
    const roleFormatted = (data.role === ROLES.PENANGGUNG_JAWAB || data.role === 'Penanggung Jawab')
      ? 'Penanggung Jawab'
      : 'Peminjam';
    const res = await apiFetch('/api/kelola-pengguna', {
      method: 'POST',
      body: {
        nim: String(data.nim).trim(),
        namaPengguna: String(data.nama || data.namaPengguna).trim(),
        role: roleFormatted,
        noWhatsapp,
      },
    });
    return res?.data || res;
  }

  await delay(30);
  const nama = String(data.nama || '').trim();
  const nim = String(data.nim || '').trim();
  const email = String(data.email || (nim ? `${nim}@mail.uma.ac.id` : '')).trim();
  if (!nama || !nim) throw new Error('Nama dan NIM wajib diisi.');
  if (mockUsers.some((user) => user.nim === nim)) throw new Error('NIM sudah terdaftar.');
  if (email && mockUsers.some((user) => user.email?.toLowerCase() === email.toLowerCase())) throw new Error('Email sudah terdaftar.');
  const user = {
    id: `user-${Date.now()}`,
    nama,
    nim,
    email,
    organisasi: null,
    displayOrganization: String(data.displayOrganization || 'HMTI').trim(),
    businessUnit: String(data.businessUnit || '').trim(),
    role: data.role === ROLES.PENANGGUNG_JAWAB ? ROLES.PENANGGUNG_JAWAB : ROLES.PEMINJAM,
    statusAkun: data.statusAkun === STATUS_AKUN.NONAKTIF ? STATUS_AKUN.NONAKTIF : STATUS_AKUN.AKTIF,
    status_akun: data.statusAkun === STATUS_AKUN.NONAKTIF ? STATUS_AKUN.NONAKTIF : STATUS_AKUN.AKTIF,
    noWhatsapp,
    managementList: true,
  };
  mockUsers.push(user);
  return { ...user };
}

/**
 * Dapatkan daftar request password untuk PJ.
 * @param {{ page?: number, limit?: number, q?: string, status?: string }} [params]
 */
export async function getRequestPasswordList(params = {}) {
  if (!isMockEnabled()) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page);
    if (params.limit) queryParams.set('limit', params.limit);
    if (params.status && params.status !== 'all') queryParams.set('status', params.status);
    if (params.q) queryParams.set('q', params.q);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await apiFetch(`/api/kelola-pengguna/request-password${qs}`);
    return res || { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  }

  await delay(50);

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 10);
  const query = String(params.q || '').trim().toLowerCase();
  const status = String(params.status || 'all').toLowerCase();

  const filtered = mockRequestPasswords.filter((item) => {
    const matchesQuery = !query
      || item.namaPengguna.toLowerCase().includes(query)
      || item.nim.includes(query);
    const matchesStatus = status === 'all'
      || item.status.toLowerCase() === status;
    return matchesQuery && matchesStatus;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit).map((item) => ({ ...item })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Dapatkan detail satu request password.
 * @param {number|string} id
 */
export async function getRequestPasswordDetail(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/kelola-pengguna/request-password/${id}`);
  }
  await delay(50);
  const item = mockRequestPasswords.find((row) => String(row.idRequestPassword) === String(id));
  return item ? { ...item } : null;
}

/**
 * Proses request password: buat token reset (24 jam) & respons memuat tautan serta pesan WA.
 * @param {number|string} id
 */
export async function prosesRequestPassword(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/kelola-pengguna/request-password/${id}/proses`, {
      method: 'POST',
    });
  }

  await delay(50);
  const tautan = `${window.location.origin}${window.location.pathname}#/reset-password?token=mock-token-${Date.now()}`;
  return {
    message: 'Tautan reset password dibuat',
    tautanReset: tautan,
    pesan: `Halo, ini tautan untuk mengatur ulang password akun PinjemDulu kamu:\n${tautan}`,
    waUrl: `https://wa.me/?text=${encodeURIComponent(tautan)}`,
    berlakuSampai: new Date(Date.now() + 86400000).toISOString(),
  };
}

/**
 * Konfirmasi bahwa tautan reset password sudah dikirim ke peminjam.
 * @param {number|string} id
 * @param {string} pesan
 */
export async function konfirmasiRequestPassword(id, pesan) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/kelola-pengguna/request-password/${id}/konfirmasi`, {
      method: 'POST',
      body: { pesan },
    });
  }

  await delay(50);
  const item = mockRequestPasswords.find((row) => String(row.idRequestPassword) === String(id));
  if (item) item.status = 'Dikonfirmasi';
  return { message: 'Request password dikonfirmasi' };
}
