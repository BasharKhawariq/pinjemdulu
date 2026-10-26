import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { mockOrganisasi } from './organisasi.js';

const [bemFt, ukmFoto] = mockOrganisasi;

/*
 * Mock pengguna (FE only, backend impor akun via seed / admin).
 * Semua akun diberi email dan statusAkun, karena login via email + captcha.
 */
export const mockUsers = [
  {
    id: 'user-1',
    nama: 'Maitri Sakti',
    nim: '254107020789',
    email: 'maitri.sakti@mailinator.com',
    organisasi: bemFt,
    role: ROLES.PEMINJAM,
    statusAkun: STATUS_AKUN.AKTIF,
    status_akun: STATUS_AKUN.AKTIF,
    businessUnit: 'Software Engineering',
    displayOrganization: 'HMTI',
    managementList: true,
  },
  {
    id: 'user-2',
    nama: 'Siti Rahma',
    nim: '2101987654',
    email: 'siti.rahma@bemft.uma.ac.id',
    organisasi: bemFt,
    role: ROLES.PENANGGUNG_JAWAB,
    statusAkun: STATUS_AKUN.AKTIF,
    status_akun: STATUS_AKUN.AKTIF,
    managementList: false,
  },
  {
    id: 'user-3',
    nama: 'Budi Santoso',
    nim: '2201112233',
    email: 'budi.santoso@ukmfoto.uma.ac.id',
    organisasi: ukmFoto,
    role: ROLES.PENANGGUNG_JAWAB,
    statusAkun: STATUS_AKUN.AKTIF,
    status_akun: STATUS_AKUN.AKTIF,
    managementList: false,
  },
  {
    id: 'user-4',
    nama: 'Aulia Putri',
    nim: '2301555666',
    email: 'auliaputri@mailinator.com',
    organisasi: bemFt,
    role: ROLES.PEMINJAM,
    statusAkun: STATUS_AKUN.NONAKTIF,
    status_akun: STATUS_AKUN.NONAKTIF,
    managementList: false,
  },
  { id: 'user-5', nama: 'Bintang Putra', nim: '254107020001', email: 'bintang.putra@example.test', organisasi: ukmFoto, businessUnit: 'Research and Development', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HIMANIA', managementList: true },
  { id: 'user-6', nama: 'Berbinar Neira', nim: '254107020002', email: 'berbinar.neira@example.test', organisasi: ukmFoto, businessUnit: 'Product Development', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HIMANIA', managementList: true },
  { id: 'user-7', nama: 'Gama Punta', nim: '254107020003', email: 'gama.punta@example.test', organisasi: bemFt, businessUnit: 'Software Engineering', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HMS', managementList: true },
  { id: 'user-8', nama: 'Gentala Arka', nim: '254107020004', email: 'gentala.arka@example.test', organisasi: ukmFoto, businessUnit: 'Software Engineering', role: ROLES.PENANGGUNG_JAWAB, statusAkun: STATUS_AKUN.NONAKTIF, status_akun: STATUS_AKUN.NONAKTIF, displayOrganization: 'THEATRISIC', managementList: true },
  { id: 'user-9', nama: 'Hanin Maizah', nim: '254107020005', email: 'hanin.maizah@example.test', organisasi: bemFt, businessUnit: 'Hardware Engineering', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HME', managementList: true },
  { id: 'user-10', nama: 'Jingga Pratama', nim: '254107020006', email: 'jingga.pratama@example.test', organisasi: ukmFoto, businessUnit: 'Software Engineering', role: ROLES.PENANGGUNG_JAWAB, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'THEATRISIC', managementList: true },
  { id: 'user-11', nama: 'Maria Khalda', nim: '254107020007', email: 'maria.khalda@example.test', organisasi: bemFt, businessUnit: 'Software Engineering', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HMS', managementList: true },
  { id: 'user-12', nama: 'Rion Ardian', nim: '254107020008', email: 'rion.ardian@example.test', organisasi: bemFt, businessUnit: 'Sales Marketing', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HME', managementList: true },
  { id: 'user-13', nama: 'Tiara Ayudya', nim: '254107020009', email: 'tiara.ayudya@example.test', organisasi: bemFt, businessUnit: 'Sales Marketing', role: ROLES.PEMINJAM, statusAkun: STATUS_AKUN.AKTIF, status_akun: STATUS_AKUN.AKTIF, displayOrganization: 'HMTI', managementList: true },
];
