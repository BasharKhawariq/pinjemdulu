/**
 * Data mock ORGANISASI / OKI.
 * Bentuk sesuai kontrak API: { idOrganisasi, namaOrganisasi, icon }.
 * 8 OKI (minimal 6) agar filter OKI dapat diuji.
 * Icon untuk demo menggunakan string path (tidak perlu aset gambar asli;
 * OrganisasiBadge nanti fallback ke huruf awal bila icon tidak ada).
 */
export const mockOrganisasi = [
  { idOrganisasi: 'oki-1', namaOrganisasi: 'BEM', icon: null },
  { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI', icon: null },
  { idOrganisasi: 'oki-3', namaOrganisasi: 'HME', icon: null },
  { idOrganisasi: 'oki-4', namaOrganisasi: 'HIMANIA', icon: null },
  { idOrganisasi: 'oki-5', namaOrganisasi: 'RISPOL', icon: null },
  { idOrganisasi: 'oki-6', namaOrganisasi: 'HMS', icon: null },
  { idOrganisasi: 'oki-7', namaOrganisasi: 'THEATRISIC', icon: null },
  { idOrganisasi: 'oki-8', namaOrganisasi: 'PP', icon: null },
];
