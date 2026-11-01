import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { mockOrganisasi } from './organisasi.js';
import { mockUsers } from './users.js';

// Data simulasi untuk halaman Pengelolaan > List Pengajuan PJ.
// Baris Menunggu mengikuti referensi Figma; baris lain untuk menguji tab status.
export const mockRequestPj = [
  {
    id: 'req-pj-1',
    pemohon: mockUsers[0],
    organisasi: mockOrganisasi[1],
    tanggalPengajuan: '2026-10-11T09:00:00',
    status: STATUS_REQUEST_PJ.MENUNGGU,
    alasan: 'Ingin membantu pengelolaan inventaris BEM FT.',
    lampiran: { nama: 'surat_rekomendasi.jpg', ukuran: 245760 },
  },
  {
    id: 'req-pj-2',
    pemohon: mockUsers[3],
    organisasi: mockOrganisasi[0],
    tanggalPengajuan: '2026-10-09T13:30:00',
    status: STATUS_REQUEST_PJ.DISETUJUI,
    alasan: 'Membantu pencatatan dan pemeliharaan inventaris organisasi.',
  },
  {
    id: 'req-pj-3',
    pemohon: mockUsers[2],
    organisasi: mockOrganisasi[1],
    tanggalPengajuan: '2026-10-07T10:15:00',
    status: STATUS_REQUEST_PJ.DITOLAK,
    alasan: 'Pengajuan contoh untuk pengujian status.',
    alasanPenolakan: 'Data persetujuan organisasi belum lengkap.',
  },
  {
    id: 'req-pj-4',
    pemohon: mockUsers[0],
    organisasi: mockOrganisasi[1],
    tanggalPengajuan: '2026-09-20T10:00:00',
    status: STATUS_REQUEST_PJ.DISETUJUI,
    alasan: 'Membantu pencatatan inventaris HMTI.',
    lampiran: { nama: 'surat_tugas_hmti.pdf', ukuran: 512000 },
  },
  {
    id: 'req-pj-5',
    pemohon: mockUsers[0],
    organisasi: mockOrganisasi[1],
    tanggalPengajuan: '2026-08-05T14:20:00',
    status: STATUS_REQUEST_PJ.DITOLAK,
    alasan: 'Pengajuan contoh untuk pengujian status.',
    alasanPenolakan: 'Surat rekomendasi tidak terbaca.',
    lampiran: { nama: 'surat_buram.jpg', ukuran: 98304 },
  },
];
