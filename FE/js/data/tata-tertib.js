/**
 * Konten halaman Tata Tertib (statis).
 * Bagian A-C mengikuti desain. Bagian D (Ketentuan Keterlambatan) terpotong pada
 * gambar desain, sehingga isinya masih draf dan perlu disamakan dengan teks asli.
 */
export const TATA_TERTIB = Object.freeze({
  label: 'Tata Tertib Peminjaman dan Pengembalian',
  judul: 'Pahami Aturan Sebelum Meminjam',
  subjudul: 'Simak tata tertib peminjaman dan penggunaan inventaris agar proses peminjaman berjalan tertib dan lancar.',
  heading: 'TATA TERTIB',
  pengantar:
    'Tata tertib ini dibuat untuk menjaga inventaris organisasi, memastikan proses peminjaman berjalan tertib, serta membantu seluruh pengguna bertanggung jawab atas barang yang dipinjam.',
  bagian: Object.freeze([
    {
      id: 'pengajuan',
      judul: 'A. Ketentuan Pengajuan Peminjaman',
      butir: [
        'Peminjam wajib menggunakan akun PinjemDulu miliknya sendiri dan memastikan data yang dimasukkan benar.',
        'Peminjam wajib memeriksa informasi barang, jumlah, kondisi, dan ketersediaan sebelum mengajukan peminjaman.',
        'Peminjaman diajukan melalui PinjemDulu dengan memilih barang, menentukan tanggal mulai dan selesai peminjaman, serta mengisi keperluan peminjaman.',
        'Pengajuan yang dikirimkan belum dianggap disetujui sampai memperoleh persetujuan dari Penanggung Jawab Inventaris.',
        'Peminjam hanya diperbolehkan mengambil barang setelah pengajuan disetujui dan mengikuti prosedur penyerahan barang yang berlaku pada organisasi terkait.',
        'Ketersediaan tanggal mengikuti jadwal inventaris dan ketentuan waktu persiapan serta pengembalian yang diperhitungkan oleh sistem.',
      ],
    },
    {
      id: 'penggunaan',
      judul: 'B. Ketentuan Penggunaan Barang',
      butir: [
        'Barang yang dipinjam harus digunakan sesuai dengan keperluan yang dicantumkan dalam pengajuan.',
        'Peminjam wajib menjaga kebersihan, keamanan, dan kondisi barang selama masa peminjaman.',
        'Peminjam wajib memeriksa kondisi barang ketika menerima barang dan segera melaporkan apabila terdapat ketidaksesuaian atau kerusakan.',
        'Peminjam tidak diperbolehkan mengalihkan barang kepada pihak lain tanpa persetujuan Penanggung Jawab Inventaris.',
        'Barang tidak diperbolehkan digunakan untuk tujuan yang bertentangan dengan peraturan organisasi dan ketentuan yang berlaku.',
      ],
    },
    {
      id: 'pengembalian',
      judul: 'C. Ketentuan Pengembalian',
      butir: [
        'Peminjam wajib mengembalikan barang sesuai tanggal selesai peminjaman yang telah disetujui.',
        'Barang harus dikembalikan kepada Penanggung Jawab Inventaris atau pihak yang ditunjuk oleh organisasi terkait.',
        'Peminjam wajib memastikan seluruh barang yang dipinjam telah dikembalikan sesuai jumlah yang tercatat dalam transaksi.',
        'Setelah menyerahkan barang, peminjam wajib memberikan informasi pengembalian melalui PinjemDulu.',
        'Status pengembalian baru dinyatakan selesai setelah Penanggung Jawab Inventaris memeriksa kondisi fisik barang dan mengonfirmasi pengembalian melalui sistem.',
      ],
    },
    {
      id: 'keterlambatan',
      judul: 'D. Ketentuan Keterlambatan',
      draf: true,
      butir: [
        'Pengembalian yang melewati tanggal selesai peminjaman dinyatakan terlambat dan tercatat pada sistem.',
        'Peminjam yang terlambat wajib segera menghubungi Penanggung Jawab Inventaris dan mengembalikan barang.',
        'Keterlambatan dapat dikenai sanksi berupa pembatasan peminjaman sementara sesuai ketentuan organisasi terkait.',
        'Barang yang rusak atau hilang menjadi tanggung jawab peminjam sesuai kesepakatan dengan organisasi terkait.',
      ],
    },
  ]),
});
