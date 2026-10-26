import { mockUsers } from '../data/users.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { delay } from './client.js';

export async function getUsers() {
  await delay(50);
  return [...mockUsers];
}

export async function updateMockUser(id, updates = {}) {
  await delay(30);
  const user = mockUsers.find((item) => String(item.id) === String(id));
  if (!user) throw new Error('Pengguna tidak ditemukan.');

  if (updates.nama !== undefined) user.nama = String(updates.nama).trim();
  if (updates.nim !== undefined) user.nim = String(updates.nim).trim();
  if (updates.email !== undefined) user.email = String(updates.email).trim();
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
    managementList: true,
  };
  mockUsers.push(user);
  return { ...user };
}
