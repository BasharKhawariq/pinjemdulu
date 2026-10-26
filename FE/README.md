# Panduan Pengembangan PinjemDulu (Vanilla + Tailwind)

Panduan ini menjelaskan struktur folder, fungsi tiap bagian, alur kerja harian, dan langkah membuat halaman baru. Untuk fitur yang sudah ada dan akun contoh, lihat `README.md`.

---

## 1. Gambaran Arsitektur

Aplikasi ini adalah situs statis (tanpa backend). Kodenya dibagi menjadi lapisan yang masing-masing punya satu tugas:

```
 pages/  ui/            <- tampilan: menghasilkan HTML dan memasang event
    |
 services/              <- "API palsu" (mock): satu-satunya jalan ke data
    |
 state/  data/          <- penyimpanan (localStorage) dan data awal
 
 lib/                   <- logika murni (aturan tanggal, kuota, validasi); dipakai semua lapisan
```

Prinsipnya:
- **Logika bisnis ada di `js/lib/` sebagai fungsi murni** (input masuk, hasil keluar; tanpa DOM, tanpa localStorage). Karena murni, mudah diuji di Node tanpa browser.
- **Halaman tidak membaca data mock atau localStorage langsung.** Semua data lewat `js/services/`. Saat nanti backend sungguhan tersedia, yang diganti hanya isi `services/`.
- **Tampilan hanya menerjemahkan data menjadi HTML** dan menghubungkan klik/ketik ke service.

---

## 2. Struktur Folder dan Fungsinya

```
pinjam-dulu/
├─ index.html                  cangkang aplikasi (skip-link, header, sidebar, #app, footer)
├─ package.json                skrip: build:css, watch:css, test
├─ package-lock.json           mengunci versi Tailwind
├─ tailwind.config.mjs         konfigurasi Tailwind (warna dipetakan ke variabel CSS)
├─ README.md                   fitur, akun contoh, cara menjalankan
├─ PANDUAN-PENGEMBANGAN.md     dokumen ini
├─ assets/                     gambar dan aset statis
├─ css/
│  ├─ tokens.css               SATU-SATUNYA tempat nilai warna (variabel CSS)
│  ├─ tailwind.input.css       sumber Tailwind (@tailwind + aturan dasar)
│  └─ app.css                  HASIL BUILD (jangan diedit manual)
├─ js/
│  ├─ main.js                  titik masuk: memasang router, shell, dan sesi
│  ├─ router.js                router berbasis hash (#/...): memilih halaman dan memanggil render/mount
│  ├─ state/
│  │  ├─ store.js              pembungkus localStorage (kunci berawalan pd:v1:), cadangan memori di Node
│  │  └─ session.js            pengguna yang sedang login (login/logout/getUser)
│  ├─ lib/                     logika murni + validasi (tanpa DOM)
│  ├─ data/                    data awal (mock): inventaris, kategori, organisasi, pengguna, peminjaman
│  ├─ services/                layanan mock: auth, inventaris, kategori, peminjaman (jeda ±100 ms)
│  ├─ ui/                      komponen kecil dan pembantu tampilan
│  └─ pages/                   satu berkas per halaman
└─ tests/                      test otomatis (node:test)
```

### 2.1 `js/lib/` (logika murni)
Contoh isi: `date-rules.js` (aturan H+2, hari persiapan/pengecekan, kuota per hari), `range-selection.js` dan `calendar-model.js` (model kalender rentang), `ajukan-form.js` (state form pengajuan), `katalog.js` (filter dan paginasi), `detail-inventaris.js`, `kategori-validation.js`, `kelola-kategori*.js`, `navigation.js` (menu per peran, judul halaman), `route-guard.js` (aturan akses rute), `captcha.js`, `constants.js` (peran, status, kondisi), `format.js` (format tanggal Indonesia).
Aturan: tidak mengimpor dari `ui/`, `pages/`, `services/`, atau `state/`, dan tidak menyentuh `window`, `document`, atau `localStorage`.

### 2.2 `js/data/` dan `js/services/`
- `data/` berisi data awal. Data dimuat ke localStorage saat pertama kali dipakai, sehingga mengubah data mock umumnya baru terlihat setelah data situs dihapus (atau versi kunci `pd:v1` dinaikkan).
- `services/` meniru API: fungsi asinkron yang membaca/menulis lewat `state/store.js`, menegakkan aturan bisnis (hak akses per peran, validasi, konflik kuota), dan melempar galat berstatus HTTP (mis. 403, 404, 409, 422) dengan kode (mis. `MASIH_DIPINJAM`) mengikuti pola layanan yang ada.

### 2.3 `js/ui/` (komponen dan pembantu)
- `html.js`: pembantu pembuat HTML dan **escape** data pengguna. Semua data dari pengguna/penyimpanan wajib lewat sini sebelum masuk ke HTML.
- `classes.js`: fungsi pembuat kelas Tailwind untuk komponen berulang (tombol, input, badge, kartu, dsb.), diporting dari desain versi Next.js.
- `icons.js`: ikon SVG inline (`currentColor`).
- `sidebar.js`, `navbar.js`, `footer.js`: cangkang aplikasi.
- `dialog.js`, `toast.js`: dialog native `<dialog>` dan notifikasi.
- `range-calendar.js`: kalender rentang untuk form pengajuan.

### 2.3 `js/pages/`
Satu berkas per halaman (mis. `login.js`, `inventaris.js`, `detail.js`, `ajukan.js`, `kelola-inventaris.js`, `kelola-inventaris-form.js`, `kelola-kategori.js`, `placeholder.js`, `notfound.js`). Setiap halaman mengikuti "kontrak halaman" pada bagian 4.

### 2.4 `tests/`
Satu berkas test per modul (`*.test.js`). Ada juga test penjaga: `tailwind-guard.test.js` (tidak ada kelas Tailwind dirangkai dinamis; tidak ada warna hex di luar `tokens.css`) dan test render halaman (tidak ada teks "undefined" atau "[object Object]", data pengguna ter-escape).

---

## 3. Rute, Penjaga Rute, dan Navigasi

Router memakai hash URL. Rute yang ada:

| Rute | Halaman | Akses |
|---|---|---|
| `#/login` | Login | belum login |
| `#/inventaris` | Katalog | login |
| `#/inventaris/:id` | Detail barang | login |
| `#/inventaris/:id/ajukan` | Form pengajuan | login |
| `#/dashboard` | Dashboard (placeholder) | login |
| `#/kelola/inventaris` | Kelola inventaris | PJ |
| `#/kelola/inventaris/tambah` dan `.../:id/ubah` | Form barang | PJ |
| `#/kelola/kategori` | Kelola kategori | PJ |

Penjaga rute (`lib/route-guard.js`): belum login diarahkan ke `#/login`; sudah login membuka `#/login` diarahkan ke `#/inventaris`; peminjam membuka `#/kelola/*` diarahkan ke `#/inventaris`; rute tak dikenal menampilkan halaman 404.

Menu sidebar dan judul halaman berasal dari `lib/navigation.js` (menu per peran, judul per rute, penanda item aktif).

---

## 4. Kontrak Halaman

Setiap berkas di `js/pages/` mengekspor dua fungsi:

- `render(ctx)`: mengembalikan **string HTML** halaman. Tidak menyentuh DOM.
- `mount(root, ctx)`: dipanggil setelah HTML dimasukkan ke `root`. Memasang event dan memuat data. Boleh mengembalikan fungsi `unmount` untuk membersihkan (event, timer) saat pindah halaman.

`ctx` berisi informasi konteks halaman (pengguna aktif, parameter rute, query); lihat halaman yang sudah ada sebagai contoh pemakaian.

Event dipasang dengan **delegasi `data-action`**: satu listener di `root`, dan elemen interaktif diberi atribut `data-action="nama-aksi"`.

```js
// js/pages/contoh.js
import { escapeHtml } from '../ui/html.js'; // sesuaikan dengan nama ekspor helper escape di js/ui/html.js

export function render(ctx) {
  return `
    <section class="mx-auto max-w-3xl space-y-4">
      <h1 class="text-2xl font-semibold text-foreground">Judul Halaman</h1>
      <p id="contoh-status" class="text-sm text-muted-foreground">Memuat...</p>
      <button type="button" data-action="muat-ulang"
        class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Muat Ulang
      </button>
    </section>`;
}

export function mount(root, ctx) {
  const status = root.querySelector('#contoh-status');

  async function muat() {
    // data hanya lewat service
    // const data = await getContoh();
    status.textContent = 'Selesai';
  }

  function onClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    if (el.dataset.action === 'muat-ulang') muat();
  }

  root.addEventListener('click', onClick);
  muat();

  return function unmount() {
    root.removeEventListener('click', onClick);
  };
}
```

Catatan penting saat menulis HTML:
- Escape SEMUA data dinamis (nama, keperluan, deskripsi, dsb.) dengan helper dari `js/ui/html.js`.
- Beri `aria-label`/`aria-*` yang sesuai, dan pastikan elemen interaktif bisa dijangkau keyboard dengan fokus terlihat.
- Jika hanya sebagian halaman yang berubah (mis. tabel saat mengetik di kolom cari), perbarui bagian itu saja agar fokus input tidak hilang.

---

## 5. Styling dengan Tailwind

1. Tulis kelas Tailwind langsung di string HTML di `js/`. Tailwind membaca teks sumber di `index.html` dan `js/**/*.js`.
2. **Nama kelas harus utuh.** `bg-primary` benar; `` `bg-${warna}` `` salah (kelasnya tidak akan ikut di-build). Test penjaga akan gagal bila ada kelas dirangkai dinamis. Jika kelas bergantung pada kondisi, tulis dua nama utuh: `kondisi ? 'bg-primary' : 'bg-muted'`.
3. **Warna hanya dari token.** Pakai kelas seperti `bg-primary`, `text-muted-foreground`, `border-border`. Nilai warna (hex) hanya boleh ada di `css/tokens.css`. Mengubah warna tema cukup mengedit `tokens.css`; tidak perlu build ulang selama nama kelas tidak berubah.
4. Komponen yang dipakai berulang dibuatkan fungsi di `js/ui/classes.js`, supaya tampilan seragam.
5. Setelah menambah atau mengubah kelas, jalankan `npm run build:css` (atau biarkan `npm run watch:css` berjalan). `css/app.css` wajib ikut di-commit/dikirim.
6. Tidak ada `tailwind-merge`: jangan menumpuk dua kelas yang bertabrakan (mis. dua `p-*`) pada elemen yang sama.

---

## 6. Penyimpanan dan State

- `state/store.js` membungkus `localStorage` dengan kunci berawalan `pd:v1:` (contoh: `pd:v1:session`, `pd:v1:data:peminjaman`, `pd:v1:data:kategori`, `pd:v1:sidebar-collapsed`). Di Node (saat test) store memakai cadangan memori. Katalog juga menyimpan query filter di `sessionStorage` (`pinjemdulu-katalog-query`).
- Penyimpanan browser terbatas (±5 MB). Foto barang dikompresi sebelum disimpan, dan galat penyimpanan penuh ditangani (kode 507 `PENYIMPANAN_PENUH`).
- Untuk mengembalikan data ke awal saat mengembangkan: DevTools > Application > Storage > Clear site data.
- Bila struktur data berubah (skema), naikkan versi kunci (`pd:v1` menjadi `pd:v2`) agar data lama tidak bentrok.

---

## 7. Alur Kerja Harian

Buka tiga terminal di folder proyek:

```bash
# Terminal 1: bangun CSS otomatis saat kelas berubah
npm run watch:css

# Terminal 2: server statis
npx -y serve .
# (atau Live Server di VS Code)

# Terminal 3: test (jalankan sebelum commit)
npm test
```

Urutan kerja yang disarankan untuk satu fitur:
1. Tentukan perilaku dan aturannya, lalu tulis logikanya sebagai fungsi murni di `js/lib/` **beserta test-nya** lebih dulu.
2. Sediakan data dan layanan bila perlu (`js/data/`, `js/services/`).
3. Buat halamannya (`js/pages/`) dan komponen pendukung (`js/ui/`).
4. Daftarkan rute, menu, dan aturan akses.
5. Jalankan `npm run build:css`, `npm test`, lalu coba di browser (alur utama, data kosong, galat, keyboard, layar sempit 360px).
6. Perbarui `README.md` bila ada fitur baru, lalu commit termasuk `css/app.css`.

Prinsip umum: satu perubahan kecil per langkah, test lama tidak boleh dilemahkan, tanpa `console.log` tersisa, teks antarmuka berbahasa Indonesia.

---

## 8. Membuat Halaman Baru (Langkah demi Langkah)

Contoh: halaman "Tata Tertib" di `#/tata-tertib` untuk semua pengguna yang login.

**Langkah 0: tentukan.** Rute (`#/tata-tertib`), siapa yang boleh (semua peran login), data apa yang dibutuhkan (isi statis), dan tampilan keadaan (memuat/kosong/galat bila ada data dinamis).

**Langkah 1: logika murni (jika ada).** Contoh: bila ada pemrosesan data, tulis di `js/lib/tata-tertib.js` sebagai fungsi murni dan buat `tests/tata-tertib.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { urutkanPasal } from '../js/lib/tata-tertib.js'; // impor internal wajib berekstensi .js

test('urutkanPasal mengurutkan berdasarkan nomor', () => {
  const hasil = urutkanPasal([{ no: 2 }, { no: 1 }]);
  assert.deepEqual(hasil.map((p) => p.no), [1, 2]);
});
```

**Langkah 2: data dan layanan (jika dinamis).** Tambahkan data awal di `js/data/`, lalu layanan di `js/services/` yang membaca lewat `state/store.js`, menegakkan hak akses, dan melempar galat berstatus + kode untuk kasus gagal. Halaman tidak boleh membaca `data/` langsung.

**Langkah 3: berkas halaman.** Buat `js/pages/tata-tertib.js` dengan `render(ctx)` dan `mount(root, ctx)` mengikuti contoh pada bagian 4. Semua data dinamis di-escape.

**Langkah 4: daftarkan rute.** Tambahkan entri rute `#/tata-tertib` di `js/router.js`, mengikuti pola rute yang sudah ada (mis. `#/kelola/kategori`).

**Langkah 5: menu dan judul.** Di `js/lib/navigation.js` tambahkan item menu (ikon, label, rute) untuk peran yang berhak dan judul halamannya; perbarui `tests/navigation.test.js`. Jika ikon baru dibutuhkan, tambahkan SVG di `js/ui/icons.js`.

**Langkah 6: aturan akses.** Jika halaman khusus peran tertentu, atur di `js/lib/route-guard.js` dan tambahkan kasus di `tests/route-guard.test.js`. Untuk halaman terbuka bagi semua yang login, biasanya tidak perlu perubahan.

**Langkah 7: styling.** Pakai kelas utuh dan token warna; gunakan helper `js/ui/classes.js` untuk komponen yang sudah ada. Jalankan `npm run build:css`.

**Langkah 8: test render.** Tambahkan kasus di test render halaman: halaman dirender tanpa "undefined"/"[object Object]", dan data berisi karakter HTML (mis. `<b>`) tampil ter-escape.

**Langkah 9: verifikasi dan commit.** `npm test` hijau, coba di browser (termasuk keyboard dan layar 360px), perbarui README, commit (sertakan `css/app.css`).

### Daftar periksa cepat halaman baru
- [ ] Logika murni ada di `js/lib/` dan punya test
- [ ] Halaman tidak mengakses `data/` atau localStorage langsung
- [ ] Rute terdaftar di router; menu dan judul di `navigation.js`; aturan akses di `route-guard.js`
- [ ] Semua data dinamis di-escape
- [ ] Kelas Tailwind utuh, warna dari token
- [ ] Keadaan memuat, kosong, dan galat ditangani
- [ ] Bisa dioperasikan dengan keyboard, fokus terlihat, `aria-*` sesuai
- [ ] `npm run build:css` dan `npm test` berhasil; `css/app.css` ikut di-commit

---

## 9. Tugas Umum Lain

**Menambah komponen UI baru.** Tambahkan fungsi kelas di `js/ui/classes.js` (kelas utuh, tanpa duplikat), lalu pakai di halaman. Tambahkan test pada `tests/classes.test.js`.

**Menambah dialog.** Gunakan elemen native `<dialog>` lewat `js/ui/dialog.js`. Pastikan bisa ditutup dengan tombol Escape dan klik latar, dan fokus kembali ke pemicu setelah ditutup.

**Menambah layanan atau endpoint mock.** Tambahkan fungsi di `js/services/`, tegakkan hak akses di awal fungsi, validasi masukan memakai fungsi murni dari `js/lib/`, dan tulis test layanan.

**Mengubah aturan bisnis (mis. batas durasi).** Ubah di `js/lib/` (satu tempat), perbarui test, lalu periksa layanan dan UI yang memakainya. Jangan menduplikasi aturan di halaman.

**Menambah kategori atau data awal.** Ubah berkas di `js/data/`, lalu hapus data situs di browser agar data awal dimuat ulang.

**Mengubah warna tema.** Edit nilai variabel di `css/tokens.css`. Bila menambah nama warna baru, petakan juga di `tailwind.config.mjs` lalu jalankan `npm run build:css`.

---

## 10. Penyelesaian Masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| Halaman putih / modul gagal dimuat | `index.html` dibuka dengan klik ganda (`file://`). Jalankan lewat server statis. |
| Kelas Tailwind baru tidak berefek | `npm run build:css` belum dijalankan, atau kelas ditulis tidak utuh (dirangkai), atau berkas berada di luar `content` (`index.html`, `js/**/*.js`). |
| `tailwind-guard.test.js` gagal | Ada kelas dirangkai dinamis atau warna hex di luar `tokens.css`. Perbaiki sesuai pesan test. |
| Perubahan data mock tidak terlihat | Data lama masih tersimpan di localStorage. Clear site data atau naikkan versi kunci. |
| Teks "undefined" / "[object Object]" di halaman | Data kosong tidak ditangani atau objek dimasukkan langsung ke HTML. Tambahkan nilai bawaan dan format ke teks. |
| Fokus input hilang saat mengetik di pencarian | Seluruh halaman dirender ulang. Perbarui hanya kontainer hasilnya. |
| Test gagal di Node dengan galat `window`/`localStorage` | Modul menyentuh `window`/`document`/`localStorage` di level atas. Pindahkan ke dalam fungsi, atau gunakan `state/store.js`. |
| Dialog tidak menutup / fokus tersesat | Pastikan memakai `js/ui/dialog.js`, dan listener dilepas pada `unmount`. |
| Penyimpanan penuh (507) | Foto terlalu besar. Pakai foto yang lebih kecil atau hapus data situs. |

---

## 11. Konvensi Kode

- Teks antarmuka, pesan galat, dan komentar singkat dalam Bahasa Indonesia.
- Impor antar-berkas di `js/` dan `tests/` wajib menyertakan ekstensi `.js`.
- Tidak ada `console.log` yang tertinggal.
- Fungsi logika dibuat murni dan diberi test; test lama tidak dilemahkan.
- Aksesibilitas bagian dari definisi selesai: keyboard, fokus terlihat, `aria-*`, dan teks non-warna untuk status.
- Satu commit per perubahan yang utuh, dengan `css/app.css` ikut bila kelas berubah.