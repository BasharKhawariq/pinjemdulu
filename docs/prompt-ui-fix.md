# Prompt Perbaikan Tampilan UI — PinjemDulu

PERAN
Kamu adalah front-end engineer senior yang bekerja pada project PinjemDulu
(vanilla JS SPA + Tailwind CSS, tanpa framework UI). Kamu dibatasi oleh
design token dan guard test yang sudah ada.

KONTEKS PROJECT
- Lokasi FE: FE/
- Render halaman berbasis JS ke index.html; komponen UI ada di FE/js/ui/*.js
  dan kelas Tailwind terpusat di FE/js/ui/classes.js.
- Warna HANYA boleh lewat token CSS di FE/css/tokens.css (mis. --brand-solid,
  --primary, --secondary-hover). Dilarang menulis hex/hsl/oklch di
  js/**.js, css/*.css (selain tokens.css), dan tailwind.config.mjs.
- app.css adalah hasil build: `npm run build:css` (Tailwind CLI).
- Ada guard test: FE/tests/tailwind-guard.test.js (kelas dinamis & warna terlarang),
  serta FE/tests/classes.test.js. Semua `npm test` wajib lulus.

OBJEKTIF
Membetulkan dan membenarkan SUDUT PANDANG VISUAL aplikasi pada tiga area:
(1) Responsiveness, (2) Hover effect, (3) Smooth animation — secara konsisten
di SELURUH halaman, tanpa mengubah logika bisnis atau kontrak API.

RUANG LINGKUP
- Halaman: login, dashboard-peminjam, dashboard-pj, inventaris, detail, ajukan,
  peminjaman, pengembalian, pengajuan-pj, tata-tertib, profil, reset-password,
  notfound, dan seluruh halaman kelola-* (lihat FE/js/pages/*.js).
- Komponen: sidebar, navbar, footer, modal, pagination, filter, search-input,
  status-chip, empty-state, loading-state, organisasi-badge, kelola-tabs,
  range-calendar, drawer (mobile), toast/alert.

PERSYARATAN DETAIL

A. RESPONSIVENESS
1. Pastikan layout benar pada breakpoint 360px, 480px, 768px, 1024px, 1280px+.
2. Tidak boleh ada horizontal scroll tak sengaja; semua container pakai
   min-w-0 / overflow yang tepat.
3. Tabel / daftar panjang harus punya strategi mobile (stack kartu atau
   overflow-x yang terkontrol dengan indikator).
4. Sidebar berubah menjadi drawer/bottom-sheet di mobile; navbar tetap
   sticky dan tidak menutupi konten.
5. Modal & dialog selalu muat di viewport kecil (maksimal tinggi + scroll
   internal), tidak terpotong.
6. Tombol & target sentuh minimal 44x44px di mobile.

B. HOVER EFFECT
1. Semua elemen interaktif WAJIB punya state hover + focus-visible + active
   yang konsisten: tombol, tautan, item dropdown, kartu inventaris, baris
   tabel, ikon, tab, pagination, badge yang bisa diklik.
2. Gunakan token warna (mis. hover ke --secondary-hover, --primary);
   dilarang hardcode warna.
3. Efek hover tidak boleh menggeser layout (hindari perubahan ukuran/posisi;
   boleh transform yang tidak memicu reflow, mis. translateY kecil pada kartu).
4. Konsisten untuk seluruh varian di classes.js (default, destructive, outline,
   secondary, ghost, link) dan kelas hover khusus yang sudah ada
   (.button-hover-soft-red, .button-hover-soft-primary, dropdown-item).
5. Sediakan state hover yang bermakna untuk perangkat tanpa hover (media
   (hover: hover) / (hover: none)).
6. KONVENSI WARNA HOVER TOMBOL BERDASARKAN MAKNA AKSI (WAJIB & KONSISTEN):

   | Makna aksi              | Contoh label                              | Efek hover       |
   |-------------------------|-------------------------------------------|------------------|
   | Batal / Batalkan / Tolak| "Batal", "Batalkan", "Tidak"              | MERAH            |
   | Kembali / Back / Tutup  | "Kembali", "Back", "Tutup"                | ABU-ABU (netral) |
   | OK / Setujui / ACC      | "OK", "Ya", "Benar", "Setujui", "ACC"      | HIJAU            |

   Ketentuan penerapan:
   - Hanya mengubah warna (background, teks, border) dan/atau opacity.
     DILARANG menggeser posisi atau mengubah ukuran saat hover.
   - Implementasi lewat kelas util yang dapat dipakai ulang, BUKAN inline style:
       * Batal   → .button-hover-soft-red      (sudah ada di css/tailwind.input.css)
       * Kembali → .button-hover-soft-neutral  (baru; abu-abu netral)
       * OK/ACC  → .button-hover-soft-green    (baru; hijau)
   - Kelas baru TIDAK boleh memakai hex/hsl/oklch langsung (guard test).
     Tambahkan token di FE/css/tokens.css lebih dulu, mis.
     --neutral-hover dan --positive-solid (+ -foreground), lalu kelas util
     mereferensikan var(...) token tersebut.
   - Berlaku konsisten pada SEMUA tombol, termasuk tombol aksi di dalam modal,
     drawer, dan dialog konfirmasi.
   - Aturan "Batal = merah" menimpa varian outline/default apa pun pada tombol
     tersebut, sehingga makna aksi selalu terbaca dari warna hover.

C. SMOOTH ANIMATION
1. Tambahkan transisi halus pada: buka/tutup modal & drawer (fade + scale/translate),
   transisi halaman/pergantian route, dropdown, tooltip, accordion/tab,
   progress & loading state, serta animasi masuk daftar/kartu.
2. Durasi standar 150–250ms, easing konsisten (mis. ease-out untuk muncul),
   hindari animasi yang mengganggu (tidak lebih dari ~300ms untuk UI mikro).
3. Gunakan HANYA properti yang ramah performa (transform & opacity); hindari
   menganimasikan width/height/top/left.
4. Wajib hormati `@media (prefers-reduced-motion: reduce)` — matikan/ringkas
   animasi dan scroll-behavior smooth untuk pengguna yang memintanya.
5. Animasi tidak boleh memblokir interaksi (tidak menahan input) dan tidak
   menyebabkan layout shift (CLS).

BATASAN WAJIB (CONSTRAINTS)
- DILARANG menulis warna hex/hsl/oklch di luar FE/css/tokens.css. Semua lewat
  token / variabel CSS.
- DILARANG merangkai kelas Tailwind secara dinamis (`bg-${...}`) di js/**.js.
- Perubahan kelas statis harus tercermin di build css/app.css
  (`npm run build:css`), dan tidak boleh membuat guard test gagal.
- Jangan mengubah logika bisnis, service (FE/js/services/*), state, routing,
  atau kontrak API (BE/docs/API.md).
- Pertahankan aksesibilitas: focus-visible tetap jelas, kontras teks memadai,
  atribut ARIA tidak dihapus.
- Utamakan komponen/kelas yang bisa dipakai ulang (mis. tambah util animasi di
  css atau variant di classes.js) daripada menyalin gaya per halaman.
- Tidak menambah dependency baru kecuali benar-benar perlu dan disetujui.

KRITERIA PENERIMAAN (ACCEPTANCE)
- [ ] Semua halaman diuji pada 360/480/768/1024/1280px: tidak ada overflow,
      konten tidak terpotong, target sentuh memadai.
- [ ] Setiap elemen interaktif punya hover + focus-visible + active konsisten.
- [ ] Modal, drawer, dropdown, dan transisi halaman tampil halus (transform/opacity).
- [ ] `prefers-reduced-motion: reduce` menonaktifkan/menyederhanakan animasi.
- [ ] Tidak ada warna hardcoded baru; semua via token.
- [ ] `npm run build:css` menghasilkan app.css terbaru.
- [ ] `npm test` lulus 100% (termasuk tailwind-guard & classes).

VERIFIKASI
1. Jalankan `npm run build:css` lalu `npm test` — semua hijau.
2. Cek manual daftar halaman di 5 breakpoint (minimal: login, dashboard,
   inventaris, detail, tabel kelola, modal).
3. Cek dengan fitur "reduce motion" OS aktif.
4. Laporkan perubahan dalam tabel: [Halaman/Komponen] | [Masalah] | [Perbaikan]
   | [File yang diubah].

OUTPUT YANG DIMINTA
- Ringkasan perubahan per area (responsiveness / hover / animation).
- Daftar file yang diubah beserta alasan singkat.
- Perintah verifikasi yang dijalankan dan hasilnya.

========================================================================
PROMPT REUSABLE PER HALAMAN (salin-tempel untuk setiap halaman berikutnya)
========================================================================
Kerjakan HANYA halaman: {NAMA_HALAMAN} (FE/js/pages/{file}.js) beserta
komponen yang dipakainya (jangan sentuh halaman lain). Patuhi seluruh
ketentuan di dokumen ini — utamanya:
  - Bagian A (Responsiveness)
  - Bagian B (Hover), termasuk konvensi warna tombol:
        Batal = MERAH, Kembali/Back = ABU-ABU, OK/Setujui/ACC = HIJAU
  - Bagian C (Smooth animation)

Alur kerja:
1. AUDIT dulu (mode audit-only, jangan ubah kode). Sajikan tabel temuan:
   [Elemen] | [Area: responsiveness/hover/animation] | [Bukti baris kode] | [Usulan].
2. Tunggu persetujuan, lalu IMPLEMENTASI perbaikan tanpa mengubah logika
   bisnis / service / state / routing / kontrak API.
3. VERIFIKASI:
   - npm run build:css
   - node --test tests/tailwind-guard.test.js tests/pages-render.test.js
   Wajib hijau dan tanpa regresi.
4. LAPORKAN tabel: [Elemen] | [Sebelum] | [Sesudah] | [File], plus hasil build
   dan test.

Placeholder yang diganti:
  {NAMA_HALAMAN} = nama tampilan (mis. "Dashboard Peminjam")
  {file}         = nama modul tanpa .js (mis. "dashboard-peminjam")

Contoh pemakaian singkat (untuk diucapkan di chat):
  "Lanjut halaman berikutnya: dashboard-peminjam. Ikuti prompt reusable di
   docs/prompt-ui-fix.md (audit dulu, lalu implementasi, build, test)."

========================================================================
ROADMAP URUTAN FILE + SCOPE PERUBAHAN
========================================================================
Urutan mengikuti alur pengguna (auth -> dashboard -> katalog -> pengajuan ->
pengelolaan -> statis) lalu komponen bersama. Cukup ucapkan "lanjut" untuk
mengerjakan item berikutnya sesuai urutan ini.

SCOPE STANDAR tiap halaman (tiga area wajib):
- R Responsiveness: grid/flex & breakpoint (360/480/768/1024/1280+),
  min-w-0 + overflow terkendali, tabel -> kartu/overflow-x, modal muat
  viewport, target sentuh >= 44px, min-h-[100dvh], tanpa scroll horizontal.
- H Hover: state hover + focus-visible + active konsisten; konvensi warna
  tombol Bagian B.6 (Batal = merah, Kembali = abu-abu, OK/ACC = hijau);
  tidak menggeser layout.
- A Animation: transisi 150-250ms (transform/opacity), animasi masuk
  daftar/kartu, hormati prefers-reduced-motion.

Tahap 1 - Auth (layar penuh)
  1. FE/js/pages/login.js ............ SELESAI
     R: min-h-[100dvh]; captcha responsif (text-lg -> sm:text-xl).
     H: toggle password (hover bg), tautan "Lupa Password?" (hover/active).
     A: .pd-spin-once pada ikon refresh captcha; logo self-start.
  2. FE/js/pages/reset-password.js ... SELESAI
     R: min-h-screen -> min-h-[100dvh]; alert token fixed jadi
        w-[calc(100%-2rem)] max-w-md agar ada margin di mobile.
     H: toggle password (hover bg); "Batal" -> button-hover-soft-red;
        "Kembali"/"Kembali ke Login" -> button-hover-soft-neutral (B.6).
     A: alert tautan tidak valid dapat .pd-fade-in.

Tahap 2 - Dashboard
  3. FE/js/pages/dashboard-peminjam.js ... SELESAI
     R: min-h 100vh -> 100dvh; modal detail max-h 90vh -> 90dvh; grid kartu
        (2 -> 4 kolom) & tabel tetap pakai overflow-x.
     H: tombol ikon detail/tutup dapat active:scale; tombol "Tutup" ->
        button-hover-soft-neutral (B.6).
     A: modal detail dapat .pd-fade-in (overlay) + .pd-pop-in (panel).
  4. FE/js/pages/dashboard-pj.js ... SELESAI
     R: grid kartu statistik (2 -> 4 kolom) & daftar tetap overflow-x;
        min-h 100vh -> 100dvh.
     H: tombol ikon aksi/tutup modal dapat active:scale-95; konversi tombol
        ke konvensi B.6 (Batal/Batalkan/Tolak = merah, Kembali/Tutup = abu-abu,
        Setujui = hijau, Kirim = primary).
     A: .pd-page-in pada section; .pd-rise-in pada kartu statistik & banner;
        modal detail .pd-fade-in (overlay) + .pd-pop-in (panel).

Tahap 3 - Katalog & Pengajuan Barang
  5. FE/js/pages/inventaris.js ... SELESAI
     R: grid kartu barang 1/2/3/4 kolom (sudah ada); toolbar filter/search
        stack di mobile (md:grid-cols-12); pagination kini flex-wrap
        (className 'flex-wrap justify-center') agar tidak meluber di 360px.
     H: kartu barang hover shadow + translateY kecil (sudah ada) & panah
        bulat group-hover (sudah ada); tombol filter outline pakai hover
        bawaan buttonClass (active:scale).
     A: kartu dibungkus wrapper .pd-rise-in + animation-delay stagger
        (index * 40ms, cap 11 kartu); empty/error state .pd-fade-in.
        Catatan: animasi dipasang di wrapper (bukan <a>) agar hover:-translate-y
        tidak konflik dengan transform animasi.
  6. FE/js/pages/detail.js ... SELESAI
     R: grid 2 kolom -> 1 kolom di mobile sudah ada (lg:grid-cols-5); galeri
        aspect-[16/10] object-contain & info card flex-col-sm tidak overflow.
     H: tombol "Ajukan" sudah hover -translate-y + shadow; tombol "Kembali"
        (panah header + "Kembali ke Katalog") -> .button-hover-soft-neutral
        + active:scale-95 (konvensi B.6).
     A: root konten .pd-page-in; kartu foto .pd-fade-in; panel akordeon jadwal
        ditambah .pd-fade-in saat dibuka (dibersihkan saat ditutup).
  7. FE/js/pages/ajukan.js ... SELESAI
     R: form tunggal (tanpa ringkasan sticky/wizard) sudah stack 1 kolom dan
        muat 360px; container px/py responsif; pemicu range-calendar 1 baris.
     H: Batal -> .button-hover-soft-red; Kirim Pengajuan -> .button-hover-soft-primary;
        "Kembali ke Katalog/Detail Barang" + aksi modal "Kembali" ->
        .button-hover-soft-neutral; aksi modal "Batalkan" -> .button-hover-soft-red;
        aksi modal "Kirim" -> .button-hover-soft-primary (className sizing
        'flex-1 rounded-xl' / 'w-full rounded-xl' disertakan).
     A: root form + semua container state (loading/error/gate/barang-null)
        ditambah .pd-page-in; ikon breadcrumb Inventaris active:scale-95.

Tahap 4 - Pengajuan Saya
  8. FE/js/pages/peminjaman.js ... SELESAI
     R: tabel jadi kartu di mobile (<md): daftar kartu `[data-card-list]`
        (md:hidden) + tabel dibungkus `hidden md:block`; filter bar sudah
        flex-col -> sm:flex-row; tab overflow-x terkontrol; aksi kartu h-10 w-10.
     H: B.6 -> "Tutup" (detail) & "Kembali" (konfirmasi/sukses) = neutral;
        "Kirim" = primary; tombol aksi ikon + tab + X diberi focus-visible ring
        & active:scale-95; baris tabel transition-colors hover.
     A: root .pd-page-in; kartu .pd-rise-in (stagger 40ms via delay); overlay
        detail .pd-fade-in + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].
  9. FE/js/pages/pengembalian.js ... SELESAI
     R: tabel `min-w-[900px]` -> kartu stack di mobile (`[data-card-list]`
        md:hidden) + tabel `hidden md:block`; helper `getVisibleRows()` dipakai
        bersama renderRows()/renderCards(); filter bar sudah responsif; aksi
        kartu h-10 w-10 (target sentuh).
     H: B.6 -> "Tutup" (detail) & "Kembali" (aksi dialog sukses/konfirmasi) =
        neutral; "Kirim" = primary (ganti hover:brightness-110); tombol ikon
        aksi/tab/X/Tutup diberi focus-visible ring & active:scale-95; baris
        tabel transition-colors hover.
     A: root .pd-page-in; kartu .pd-rise-in (stagger 40ms); overlay detail
        .pd-fade-in + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].
 10. FE/js/pages/pengajuan-pj.js ... SELESAI
     R: tabel `min-w-[560px]` -> kartu stack di mobile (`[data-card-list]`
        md:hidden) + tabel `hidden md:block`; helper `getVisibleRows()` dipakai
        bersama renderRows()/renderCards(); tombol "Tambah Pengajuan" tetap
        h-11; aksi kartu h-10 w-10.
     H: B.6 -> "Tutup" (detail) & "Kembali" (form X / dialog sukses / konfirmasi)
        = neutral; "Batal" (form) = red; "Ajukan" & "Kirim" = primary
        (ganti hover:brightness-110 / hover:bg-primary/90 / hover bordir merah
        manual); tab + X + tombol aksi diberi focus-visible ring & active:scale-95;
        baris tabel transition-colors hover.
     A: root .pd-page-in; kartu .pd-rise-in (stagger 40ms); overlay modal
        detail/form .pd-fade-in + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].

Tahap 5 - Pengelolaan (PJ)
 11. FE/js/pages/kelola-inventaris.js ... SELESAI
     R: tabel (7 kolom, min-w lebar) -> kartu stack di mobile (`[data-card-list]`
        md:hidden) + tabel dibungkus `hidden md:block`; helper `renderCard()`
        baru dipakai bersama; aksi kartu h-10 w-10 (target sentuh), tabel
        h-8 w-8; konten empty/galat dipusatkan lewat helper
        `renderEmptyContent()`/`renderErrorContent()` agar tampil sama di
        tabel & kartu; form dialog grid 2 kolom sudah `sm:grid-cols-2`.
     H: konvensi B.6 -> "Tutup" (modal detail) & "Kembali" (dialog hapus &
        feedback) = neutral (mengganti hover:bg-secondary-hover... & default);
        "Batal" (form) = red; "Terapkan" (filter) & submit form = primary
        (mengganti hover:brightness-110); tombol ikon aksi baris/kartu (Ubah/
        Detail/Hapus) + X dialog diberi focus-visible ring & active:scale-95;
        baris tabel transition-colors hover.
     A: root .pd-page-in; kartu .pd-rise-in (stagger 40ms via animation-delay);
        dialog native filter/detail/form diberi konten .pd-pop-in (fade dialog
        sudah dari aturan global `dialog[open]`); max-h-[90vh] -> max-h-[90dvh]
        pada dialog detail (x2) & form (x2).
 12. FE/js/pages/kelola-inventaris-form.js ... SELESAI
     R: form sudah adaptif (`grid-cols-1 lg:grid-cols-12`); baris tombol aksi
        bawah diubah `flex-col-reverse sm:flex-row sm:justify-end` agar tombol
        bertumpuk penuh-lebar di mobile (target sentuh) dan rata-kanan di
        desktop; tombol Kembali atas diberi focus-visible ring + active:scale.
     H: B.6 -> footer form "Batal" = red (menggantikan kelas bespoke
        .cancel-form-button), submit = primary (mengganti hover:brightness-110);
        tautan "Kembali ke Kelola Inventaris" (notFound & forbidden) = neutral;
        tombol "remove-foto" = red + focus ring + active:scale-95; aksi dialog
        bersama: confirm-submit Kembali=neutral/Kirim-Simpan=primary,
        confirm-cancel Kembali=neutral/Batalkan=red, feedback Kembali=neutral
        (semua memuat sizing `flex-1 rounded-xl`/`w-full rounded-xl`).
     A: root #kelola-form-root .pd-page-in; dialog konfirmasi & feedback
        (via renderModal asDialog) sudah otomatis .pd-fade-in + konten
        .pd-pop-in + max-h-[90dvh] dari komponen bersama.
 13. FE/js/pages/kelola-kategori.js ... SELESAI
     R: tabel 4 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
        md:hidden, helper `renderKategoriCard()`) + tabel `hidden md:block`;
        baris tabel dipindah ke helper `renderKategoriTableRow()`; skeleton
        loading juga dua representasi (kartu pulse mobile + tabel pulse
        desktop); dialog CRUD (form/confirm/delete/feedback) diberi
        `max-h-[90dvh] overflow-y-auto` agar selalu muat viewport.
     H: konvensi B.6 -> "Kembali" (form footer tak ada; confirm/delete/feedback)
        = neutral (mengganti hover:bg-secondary-hover... & hover:border-red
        manual pada delete), submit form & confirm = primary (mengganti
        hover:brightness-110), "Batal" form = red (menggantikan kelas bespoke
        .cancel-form-button); aksi baris dikumpulkan ke helper
        `renderKategoriActions(kat, sizeClass)` (Ubah/Detail-Hapus) dengan
        focus-visible ring + active:scale-95; X dialog diberi focus ring +
        active:scale-95; baris tabel transition-colors hover.
     A: root #kelola-kategori-root .pd-page-in; kartu .pd-rise-in stagger 40ms;
        konten tiap dialog native (form/confirm/delete/feedback) diberi
        .pd-pop-in (fade `dialog[open]` sudah global).
 14. FE/js/pages/kelola-peminjaman.js ... SELESAI
     R: tabel 9 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
        md:hidden, helper `renderCard()`) + tabel `hidden md:block`; baris
        tabel dipindah ke helper `renderTableRow()`; perhitungan baris halaman
        dipusatkan ke helper `getVisiblePageRows()` agar paginasi tabel & kartu
        konsisten; input pencarian memperbarui tbody DAN [data-card-list];
        modal pickup/reject-reason/detail diberi `max-h-[90dvh] overflow-y-auto`
        (detail dari max-h-[90vh]); dialog filter diberi `max-h-[90dvh]
        overflow-y-auto`; konten tiap modal inline diberi `.pd-pop-in`.
     H: konvensi B.6 -> pickup & reject-reason "Batal" = red (mengganti hover
        border/bg rose manual), pickup/reject-reason "Kirim" & filter "Terapkan"
        = primary (mengganti hover:brightness-110); "Tutup" detail & feedback
        = neutral (dari hover:brightness-110);
        modal approve/reject: "Kembali" = neutral, "Setujui" = green,
        "Tolak" = red (semua memuat sizing `w-1/2 rounded-xl`); aksi baris
        dikumpulkan ke helper `renderActions(row, sizeClass)` (Info/Setujui/
        Tolak/Ambil) dengan focus-visible ring + active:scale-95; X dialog
        (detail & filter) diberi focus ring + active:scale-95; baris tabel
        transition -> transition-colors.
     A: root .pd-page-in; kartu .pd-rise-in stagger 40ms; `.pd-pop-in` pada
        elemen konten modal inline (pickup/reject-reason/detail) & konten dialog
        filter (fade `dialog[open]` sudah global).
 15. FE/js/pages/kelola-pengembalian.js ... SELESAI
     R: tabel 8 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
        md:hidden, helper `renderReturnCard()`) + tabel `hidden md:block`;
        baris tabel diekstrak ke `renderReturnTableRow()`; perhitungan baris
        halaman dipusatkan ke `getVisiblePageRows()`; handler pencarian
        memperbarui tbody DAN `[data-card-list]`; detail modal `max-h-[90vh]`
        -> `max-h-[90dvh]`; modal form-reject diberi `max-h-[90dvh]
        overflow-y-auto`; dialog filter diberi `max-h-[90dvh] overflow-y-auto`;
        form pengembalian & halaman list diberi `.pd-page-in`.
     H: B.6 -> pickup form & form-reject "Batal" = red (ganti hover border/bg
        rose manual); "Kirim" (form + confirm-submit) & filter "Terapkan" =
        primary (ganti hover:brightness-110); modal approve/reject/success:
        "Kembali" = neutral, "Setujui" = green, "Tolak" = red, "Batalkan" =
        red (semua memuat sizing `w-1/2`/`w-full`); "Tutup" (detail) = neutral;
        aksi baris dikumpulkan ke helper `renderReturnActions(row, sizeClass)`
        (Info/Setujui/Tolak) dengan focus-visible ring + active:scale-95; X
        detail & filter diberi focus ring + active:scale-95; baris tabel
        transition -> transition-colors.
     A: root (list + form) .pd-page-in; kartu .pd-rise-in stagger 40ms;
        konten modal inline detail/form-reject + konten dialog filter diberi
        `.pd-pop-in` (fade `dialog[open]`/backdrop sudah global).
 16. FE/js/pages/kelola-pengajuan-pj.js ... SELESAI
     R: tabel 5 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
        md:hidden, helper `renderCard()`) + tabel `hidden md:block`; baris
        tabel diekstrak ke `renderTableRow()`; perhitungan baris halaman
        dipusatkan ke `getVisiblePageRows()`; handler pencarian memperbarui
        tbody DAN `[data-card-list]`; nama organisasi dipusatkan ke helper
        `organizationName()`; detail modal `max-h-[90vh]` -> `max-h-[90dvh]`;
        modal approve/reject-confirm & reject-form diberi `max-h-[90dvh]
        overflow-y-auto`.
     H: B.6 -> "Kembali" (approve/reject-confirm) = neutral (ganti
        hover:bg-secondary-hover*); reject-form "Batal" = red (ganti hover
        border/bg rose manual), "Kirim" = primary (ganti hover:brightness-110);
        "Setujui" = green, "Tolak" = red; "Tutup" (detail & result) = neutral;
        aksi baris dikumpulkan ke helper `renderActions(row, sizeClass)`
        (Info/Setujui/Tolak) dengan focus-visible ring + active:scale-95; X
        detail diberi focus ring + active:scale-95; tab & baris tabel transition
        -> transition-colors.
     A: root .pd-page-in; kartu .pd-rise-in stagger 40ms; konten modal inline
        (approve/reject-confirm, reject-form, detail) diberi `.pd-pop-in`
        (fade backdrop sudah global).
 17. FE/js/pages/kelola-pengguna.js ... SELESAI
     R: tabel List Pengguna (6 kolom) & List Request Password (6 kolom) ->
        pola ganda: kartu stack mobile (`[data-card-list]` md:hidden, helper
        `renderUserCards()`/`renderRpCards()`) + tabel dibungkus `hidden
        md:block`; baris tabel diekstrak ke `renderUserTableRow()`/
        `renderRpTableRow()`; perhitungan baris halaman dipusatkan ke
        `getVisibleUserRows()`; modal CRUD/detail/request-password diberi
        `max-h-[90dvh] overflow-y-auto`; form pengguna memang sudah 1 kolom
        (tak ada grid 2 kolom); aksi kartu h-10 w-10, tabel h-8 w-8.
     H: B.6 -> "Setujui" (rp) & "Ya, saya yakin" (status) = green; "Kirim"
        (add/edit-confirm) & "Konfirmasi Pengiriman"/"Terapkan" = primary;
        "Kembali"/"Tutup"/"tutup" (semua modal) = neutral; form "Batal" =
        red (ganti kelas bespoke `.cancel-form-button`); aksi baris
        (Edit/Detail, Setujui/Detail rp) diekstrak ke helper
        `renderUserActions()`/`renderRpActions()` dengan focus-visible ring +
        active:scale-95; X filter & tab kelola diberi active:scale-95; baris
        tabel transition -> transition-colors.
     A: root .pd-page-in; kartu .pd-rise-in stagger 40ms; konten modal inline
        (preview/confirm-send/success/detail-rp/detail-pengguna/form) +
        konten dialog filter diberi `.pd-pop-in` (fade `dialog[open]`/
        backdrop sudah global); toast .pd-rise-in.

Tahap 6 - Halaman Statis & Lain
 18. FE/js/pages/tata-tertib.js ... SELESAI
     R: tipografi responsif -> h1 `text-2xl sm:text-3xl`, heading hero
        `text-xl sm:text-2xl`, judul bagian `text-base sm:text-lg`, butir ol
        `text-sm sm:text-base`; tambah navigasi "Daftar Isi" (nav + tombol)
        untuk konten panjang; tiap judul bagian diberi `scroll-mt-6` -->
        DIKOREKSI jadi `scroll-mt-20` (Tahap 7 no.23: navbar sticky ~76px).
     H: tombol Daftar Isi -> border/bg slate + hover:border-primary/30,
        hover:bg-primary/10, hover:text-primary, active:scale-95, focus ring.
        Catatan: TIDAK memakai anchor `href="#id"` karena hash dipakai routing
        SPA (akan memicu rute notfound) -> pakai `<button data-tt-anchor>` +
        scrollIntoView di mount().
     A: root .pd-page-in; tiap bagian .pd-rise-in stagger 40ms; scroll
        menghormati prefers-reduced-motion (behavior auto bila reduce).
 19. FE/js/pages/profil.js ... SELESAI
     R: modal form inline (password-form & wa-form) -> `pd-pop-in` + `max-h-
        [90dvh] overflow-y-auto` pada `<section role="dialog">` agar muat di
        viewport pendek; tombol toggle password dinaikkan ke target sentuh
        `h-8 w-8` (input `pr-10` selaras); tombol pensil Edit -> `h-10 w-10`.
     H: B.6 -> form "Batal" (password & wa) = red (ganti manual
        hover:border-rose-700/hover:bg-rose-700/hover:text-white); "Kirim"/
        "Edit" = primary (ganti hover:brightness-110); "Kembali" (password/
        wa success & confirm, password-cancel) = neutral; "Batalkan"
        (password-cancel) = red; toggle password + tombol pensil diberi
        hover:bg + active:scale-95 + focus ring (transition -> transition-
        colors).
     A: root .pd-page-in; baris header avatar + 2 kartu .pd-rise-in stagger
        (0/60/120ms); backdrop modal inline .pd-fade-in (modal
        renderModal({asDialog:false}) sudah otomatis fade+pop+max-h).
 20. FE/js/pages/placeholder.js ... SELESAI
     R: `min-h-[60vh]` -> `min-h-[60dvh]` (konsisten unit dvh). Kartu tetap
        center di sumbu X/Y (flex items-center justify-center).
     H: tombol CTA "Kembali ke Inventaris" tetap pakai `buttonClass` default
        (sudah punya hover token) — tidak diubah agar fokus item ini pada
        center + ikon.
     A: root .pd-page-in; kartu .pd-rise-in. Ikon Sparkles tetap
        `h-7 w-7 text-primary` (dijaga test pages-render).
 21. FE/js/pages/notfound.js ... SELESAI
     R: `min-h-[60vh]` -> `min-h-[60dvh]`; kartu tetap center X/Y.
     H: tombol "Kembali ke Inventaris" -> tambah `.button-hover-soft-neutral`
        (B.6: Kembali = abu-abu netral) di samping `buttonClass` default.
     A: root .pd-page-in; kartu .pd-rise-in. Ikon AlertCircle tetap
        `h-7 w-7 text-rose-600`; `mount()` fokus judul tetap.

Tahap 7 - Komponen Bersama (sentuh ulang bila masih ada temuan)
 22. FE/js/ui/sidebar.js ... SELESAI
     R: aside desktop `h-screen` -> `h-[100dvh]`; tombol tutup drawer
        `h-10 w-10` -> `h-11 w-11` (target sentuh >=44px). Drawer tetap
        `w-[280px] max-w-[90vw]` + nav `overflow-y-auto` (tanpa scroll
        horizontal). Item nav & tombol grup tetap penuh-lebar/mudah dijangkau.
     H: tombol toggle sidebar (2x), tombol grup toggle (collapsed & expanded),
        item nav (child + tunggal), avatar & nama user, logout, dan tombol
        tutup drawer -> tambah `active:scale-95` (ikon) / `active:scale-[0.98]`
        (baris nav) + `focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring`; `transition` -> `transition-colors` (warna
        saja agar tak ada pergeseran layout); avatar/nama -> `transition-
        opacity hover:opacity-90/80`. Tombol "Tutup menu" & "Keluar" tetap
        memakai makna hover netral/merah (B.6).
     A: drawer buka/tutup tetap `transition-transform` + `translate-x-0`/
        `-translate-x-full`; backdrop `transition-opacity` — sudah halus dan
        otomatis menghormati prefers-reduced-motion (aturan global). Catatan:
        `transition-[width]` pada collapse desktop DIBIARKAN karena collapse
        memang mengubah lebar layout (transform akan merusak flex konten).
     Pembersihan: inline style dihapus -> `letter-spacing: 0.24em` menjadi
        `tracking-[0.24em]`, dan `font-size:24px;line-height:1` menjadi
        `text-[24px] leading-none`.
 23. FE/js/ui/navbar.js ... SELESAI
     R: sticky sudah ditangani wrapper `#navbar-container` (index.html L33,
        `sticky top-0 z-50`) — header TIDAK perlu diubah; judul
        `min-w-0 truncate text-xl sm:text-2xl` + padding `px-4 sm:px-7` (selaras
        `main`); hamburger `h-11 w-11` (44px). Tidak ada markup responsif yang
        perlu diubah.
     H: hamburger "Buka menu" -> `transition` menjadi `transition-colors` +
        tambah `hover:text-zinc-900`, `active:scale-95`, dan
        `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
     A: TIDAK menambah animasi masuk navbar karena `renderShell()` dipanggil
        ulang tiap drawer buka/tutup & toggle sidebar -> fade akan ter-flash
        berulang; animasi halaman sudah ditangani `.pd-page-in` di `main`.
     Catatan: "menu user" TIDAK ditambahkan ke navbar — aksi profil/logout sudah
        ada di kartu user sidebar (hindari duplikasi aksi & wiring event baru).
 24. FE/js/ui/footer.js ... SELESAI (dipasang)
     TEMUAN: `#footer-container` TIDAK ADA di index.html padahal main.js
        (L96 + L163-165) sudah memanggil renderFooter() -> footer tak pernah
        tampil. Ditambahkan `<div id="footer-container"></div>` setelah
        `</main>` di dalam `#content-container` (index.html).
     R: footer `px-4 py-4 text-center text-xs text-zinc-400` (tambah `px-4`
        agar aman di 360px). Duduk di dasar kolom karena `#app` `flex-1`.
     H: tidak ada elemen tautan di footer -> N/A.
     A: TIDAK ada animasi masuk (footer di-innerHTML ulang tiap renderShell()
        -> akan flash).
 25. FE/js/ui/search-input.js ... SELESAI
     R: tombol bersihkan dipusatkan ke helper bersama `searchClearButtonClass()`
        (dan `renderSearchClearButton()`), ukuran target sentuh `h-5 w-5` (20px)
        -> `h-9 w-9` (36px) dengan `right-2`, tetap di dalam input `h-11` (44px).
     H: tombol bersihkan -> `transition` -> `transition-colors` + tambah
        `hover:bg-slate-100` + `focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring` + `active:scale-95` (K2). Input sendiri sudah
        punya `focus:ring-2 focus:ring-primary/20`.
     A: N/A (input statis; tak perlu animasi masuk).
     Bersih: typo doc header "Global Serach Input" -> "Global Search Input";
        tombol "x" bawaan browser pada `input[type="search"]` disembunyikan via
        aturan base (`::-webkit-search-cancel-button`/`-webkit-search-decoration
        { -webkit-appearance:none }`) agar tidak dobel dengan tombol kustom;
        DUPLIKASI tombol clear manual di `kelola-inventaris.js` (createElement +
        inline `<svg>`, kelas `right-2.5 text-muted-foreground` yang berbeda)
        dihapus -> kini memakai `renderSearchClearButton()` dari komponen.
 26. FE/js/ui/filter.js ... SELESAI
     R: dialog filter ditambah `max-h-[90dvh] overflow-y-auto` (konten filter
        bisa panjang & dulu bisa melampaui viewport pendek). Tombol filter tetap
        `h-11 w-11` (44px).
     H: `filterButtonClass` -> `hover:text-white` diganti token
        `hover:text-primary-foreground` + tambah `active:scale-95`; tombol X
        dialog -> `transition` menjadi `transition-colors` + tambah
        `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
        + `active:scale-95`; tautan "Reset" (default `resetClass`) diselaraskan
        dengan 4 halaman kelola -> `.filter-reset-link ... transition-colors
        focus-visible:...ring-primary/30`; tombol "Terapkan" -> `.button-hover-
        soft-primary` (B.6).
     A: konten dialog `<div class="flex flex-col">` -> `.pd-pop-in` (fade
        `dialog[open]`/backdrop sudah global).
     Bersih: impor `renderFilterModal` tak terpakai di `kelola-peminjaman.js`
        dihapus (halaman itu memakai konten dialog filter sendiri).
 27. FE/js/ui/status-chip.js ... SELESAI
     R: chip ditambah `whitespace-nowrap` agar label status tidak terpecah
        di kartu/kolom sempit (target responsif hingga 360px).
     H: N/A — chip selalu `<span>` statis (8 konsumen: tabel/kartu, tanpa
        `data-action`), jadi tidak butuh hover/active/focus ring.
     A: N/A — elemen statis.
     Bersih: cabang warna duplikat digabung (DIKEMBALIKAN+selesai+disetujui ->
        emerald; TERLAMBAT+ditolak -> rose) dengan komentar warna per grup.
     BUG WARNA (kelas CSS tak terdefinisi) DIPERBAIKI: `status-chip-return-
        rejected` & `status-chip-return-rejected-dashboard` TIDAK ADA di CSS
        mana pun -> chip "Ditolak" (Pengembalian) di `dashboard-pj.js` tampil
        TANPA warna. Referensi bespoke dihapus (searah kebijakan proyek: hapus
        kelas bespoke, pakai utility): `getStatusBadge(status)` (param `isReturn`
        dihapus + 2 pemanggil disesuaikan), td chip `dashboard-pj.js` disatukan,
        dan wrapper `renderReturnStatusChip` di `kelola-pengembalian.js` dihapus
        (3 pemanggil -> `renderStatusChip({ status: row.status })`).
 28. FE/js/ui/empty-state.js ... SELESAI
     R: konten ditambah `px-4` (pesan tak menempel tepi di layar 360px);
        ilustrasi tetap `h-32 w-32 sm:h-36 sm:w-36`; aset
        `assets/animations/empty-state.gif` terverifikasi ADA.
     H: N/A — elemen statis (tak ada elemen klikabel).
     A: konten `<div>` -> `.pd-rise-in` (ilustrasi + pesan naik halus,
        menghormati prefers-reduced-motion).
     Bersih: `message` kini di-escape (`escapeHtml`) — sebelumnya interpolasi
        mentah ke HTML (tak ada konsumen yang mengirim HTML/berisi pesan dinamis,
        jadi aman). Header doc diperjelas.
     CTA: TIDAK ditambahkan — 29 pemanggil hanya mengirim `colspan`/
        `classContainer`; prop CTA = kode mati (hindari over-engineering).
     CATATAN REGRESI (item 26): `tests/filter.test.js` masih menguji
        `hover:text-white` -> diperbarui ke `hover:text-primary-foreground`
        (mengikuti perubahan token pada `filterButtonClass`).
 29. FE/js/ui/loading-state.js ... SELESAI
     R: `renderTableLoadingRow` td + `px-4` (pesan tak menempel tepi di 360px),
        padding tinggi jadi responsif `py-10 sm:py-14`; `renderContainerLoading`
        tinggi minimum responsif `min-h-[220px] sm:min-h-[260px]` + `px-4` +
        `py-10 sm:py-12` (tidak terlalu tinggi di layar pendek). Target sentuh
        N/A (komponen status non-interaktif).
     H: N/A — tidak ada elemen klikabel (spinner/teks status saja).
     A: kedua state (`renderTableLoadingRow`, `renderContainerLoading`) diberi
        `.pd-fade-in` (muncul halus, opacity saja) + spin `animate-spin`
        (sudah otomatis dihormati prefers-reduced-motion via aturan global).
     Bersih: spinner border inline di `renderContainerLoading`
        (`h-9 w-9 ... border-2 border-slate-200 border-t-primary`) diganti
        memakai komponen bersama `renderSpinner({ size: 'h-9 w-9' })` agar
        satu implementasi spinner di seluruh modul.
 30. FE/js/ui/organisasi-badge.js ... SELESAI
     R: `renderOrganisasiBadge` span luar + `min-w-0 max-w-full` dan span teks
        + `min-w-0` (sebelumnya `truncate` tanpa `min-w-0` -> flex item
        `min-width:auto`, nama panjang seperti "OPA GANENDRA GIRI" tidak
        ter-ellipsis & bisa melebarkan sel tabel / memicu scroll horizontal).
        Logo & wrapper logo sudah `shrink-0` (tetap utuh saat teks dipotong).
     H: N/A — badge statis non-interaktif (klik ditangani kartu/baris induk).
     A: N/A — badge tetap, tak perlu animasi masuk.
     Bersih: `textSizeClass` cabang `'lg'` & `'md'` identik (`text-xs`)
        diringkas menjadi `size === 'sm' ? 'text-[11px]' : 'text-xs'`.
 31. FE/js/ui/kelola-tabs.js ... SELESAI
     R: `<a>` tab `px-4 py-2 text-[11px]` (tinggi ~30px, di bawah target
        sentuh 44px) -> `px-4 py-2.5 text-xs` (selaras tab di `peminjaman.js`/
        `pengembalian.js`) + `shrink-0`; `<nav>` + `max-w-full` agar tidak
        meluber di 360px. `nav[aria-label="Pilihan Kelola"]` tetap cocok
        dengan aturan `text-align:center` global.
     H: `<a>` tab + `focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring active:scale-95` (sebelumnya tanpa focus/
        active). Hover inactive tetap `hover:bg-slate-50`.
     A: `transition` dipertahankan (menganimasikan warna + `active:scale`;
        `transition-colors` akan mematikan animasi scale).
 32. FE/js/ui/range-calendar.js ... SELESAI
     R: Dialog `w-full max-w-[380px]` (bisa lebih tinggi dari viewport &
        terpotong di layar pendek) -> `w-[92vw] max-w-[380px]
        max-h-[90dvh] overflow-y-auto` (scroll internal, aman 360px & layar
        pendek). Trigger `pl-10 pr-10` -> `pl-10 pr-20` agar teks tidak
        bertabrakan dengan tombol hapus + chevron; teks span + `min-w-0`
        (`class="min-w-0 truncate"`). Grid kalender dibatasi & ditengahkan:
        nama hari & grid tanggal `mx-auto w-full max-w-[308px]`; pembungkus
        `p-4` -> `px-3 py-4 sm:p-4`. Sel hari `h-9 w-9 p-0.5` (32px, < target
        sentuh 44px) -> `aspect-square w-full` (≈44px pada 308/7) dalam
        button `h-full w-full`; sel kosong (luar bulan) juga `aspect-square
        w-full` agar grid tidak melompat.
     H: Trigger + `hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100`.
        Tombol hapus diubah ke lingkaran target sentuh penuh `h-9 w-9`
        `rounded-full` + `hover:bg-zinc-100 hover:text-zinc-600
        active:bg-zinc-200`. Footer: Batal -> `button-hover-soft-red`;
        Terapkan -> `button-hover-soft-primary`. Sel hari disabled tanpa
        hover; sel aktif `active:scale-95`.
     Bersih: `text-white` -> `text-primary-foreground` (start/end bg &
        tombol Terapkan); `focus:outline-none focus:ring-primary` ->
        `focus-visible:outline-none focus-visible:ring-ring`
        (focus-visible:ring-offset-1) pada sel & tombol hapus.
     A: Dialog memakai animasi global `dialog[open]` (fade) — tidak perlu
        kelas baru; sel `transition-colors` (bukan `transition-all`).

========================================================================
LOG PROGRESS (terbaru di paling atas)
========================================================================
[2026-11-20] Tahap 7 - range-calendar.js (SELESAI) -> TAHAP 7 TUNTAS (no.22-32):
  - R: Dialog `w-full max-w-[380px]` -> `w-[92vw] max-w-[380px]
       max-h-[90dvh] overflow-y-auto` (scroll internal, aman 360px & layar
       pendek). Trigger + `pr-20` & teks span + `min-w-0` (hindari tabrakan
       dengan tombol hapus + chevron). Grid kalender `mx-auto w-full
       max-w-[308px]`; pembungkus `px-3 py-4 sm:p-4`. Sel hari
       `h-9 w-9 p-0.5` (32px) -> `aspect-square w-full` (≈44px pada 308/7);
       sel luar bulan `aspect-square w-full` agar grid stabil.
  - H: Trigger + `hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100`.
       Tombol hapus -> lingkaran target sentuh `h-9 w-9 rounded-full` +
       `hover:bg-zinc-100 active:bg-zinc-200`. Batal -> `button-hover-soft-red`;
       Terapkan -> `button-hover-soft-primary`. Sel aktif `active:scale-95`.
  - A: Dialog animasi global `dialog[open]`; sel `transition-colors`.
  - Bersih: `text-white` -> `text-primary-foreground`; `focus:ring-primary`
       -> `focus-visible:ring-ring`.
  - Verifikasi: npm run build:css OK; 12 suite relevan = 91/91 pass.

[2026-11-20] Tahap 7 - kelola-tabs.js (SELESAI):
  - R: `<a>` tab `px-4 py-2 text-[11px]` (~30px, < target sentuh 44px) ->
       `px-4 py-2.5 text-xs` + `shrink-0`; `<nav>` + `max-w-full`.
  - H: `<a>` tab + `focus-visible:outline-none focus-visible:ring-2
       focus-visible:ring-ring active:scale-95`.
  - A: `transition` dipertahankan (warna + `active:scale`).
  - Verifikasi: npm run build:css OK; 14 suite relevan = 90/90 pass.

[2026-11-20] Tahap 7 - organisasi-badge.js (SELESAI):
  - R: `renderOrganisasiBadge` span luar + `min-w-0 max-w-full`; span teks
       + `min-w-0` agar `truncate` benar-benar aktif (nama OKI panjang seperti
       "OPA GANENDRA GIRI"/"KMK St. YOHANES" tidak melebarkan sel tabel).
       Logo & wrapper logo sudah `shrink-0`.
  - H: N/A (badge statis non-interaktif). A: N/A (badge tetap).
  - Bersih: `textSizeClass` cabang `'lg'`/`'md'` identik -> diringkas.
  - Verifikasi: npm run build:css OK; 18 suite relevan = 123/123 pass.

[2026-11-20] Tahap 7 - loading-state.js (SELESAI):
  - R: `renderTableLoadingRow` td + `px-4`; tinggi responsif `py-10 sm:py-14`.
       `renderContainerLoading` `min-h-[220px] sm:min-h-[260px]` + `px-4` +
       `py-10 sm:py-12` (aman di 360px & layar pendek). Target sentuh N/A.
  - H: N/A (komponen status non-interaktif).
  - A: `renderTableLoadingRow` & `renderContainerLoading` -> `.pd-fade-in`;
       spin `animate-spin` sudah hormati prefers-reduced-motion (aturan global).
  - Bersih: spinner border inline di `renderContainerLoading` diganti
       `renderSpinner({ size: 'h-9 w-9' })` -> satu implementasi spinner.
  - Verifikasi: npm run build:css OK; 15 suite relevan = 96/96 pass.

[2026-11-20] Tahap 7 - empty-state.js (SELESAI):
  - R: konten + `px-4` (pesan tidak menempel tepi pada 360px). Aset GIF ada.
  - H: N/A (statis). A: konten -> `.pd-rise-in`.
  - Bersih: `message` kini `escapeHtml` (sebelumnya interpolasi mentah).
  - CTA tidak ditambahkan (29 pemanggil tidak membutuhkannya -> hindari kode mati).
  - REGRESI item 26 diperbaiki: `tests/filter.test.js` `hover:text-white` ->
    `hover:text-primary-foreground`.
  - Verifikasi: npm run build:css OK; 14 suite relevan = 88/88 pass.

[2026-11-20] Tahap 7 - status-chip.js (SELESAI):
  - R: chip + `whitespace-nowrap` (label status tak terpecah di kolom/kartu sempit).
  - H: N/A (chip `<span>` statis, non-interaktif). A: N/A.
  - Bersih: cabang warna duplikat digabung (emerald: dikembalikan/selesai/
       disetujui; rose: terlambat/ditolak) + komentar warna per grup.
  - BUG WARNA: kelas `status-chip-return-rejected[(-dashboard)]` tak terdefinisi
       di CSS -> chip Ditolak (Pengembalian) tanpa warna. Referensi bespoke
       dihapus: `dashboard-pj.js` `getStatusBadge` (param `isReturn` dibuang,
       td chip disatukan) & `kelola-pengembalian.js` wrapper `renderReturnStatusChip`
       dihapus (3 pemanggil -> `renderStatusChip`).
  - Verifikasi: npm run build:css OK; 4 suite utama + peminjaman-dummy-flow
    = 39/39 pass.

[2026-11-20] Tahap 7 - filter.js (SELESAI):
  - R: dialog filter (+`max-h-[90dvh] overflow-y-auto`) agar konten panjang
       tidak melampaui viewport pendek; tombol filter tetap `h-11 w-11` (44px).
  - H: `filterButtonClass` `hover:text-white` -> `hover:text-primary-foreground`
       (token) + `active:scale-95`; X dialog `transition`->`transition-colors`
       + focus-visible ring + `active:scale-95`; `resetClass` default diselaraskan
       ke `.filter-reset-link ... ring-primary/30` (sama dengan 4 halaman kelola);
       "Terapkan" -> `.button-hover-soft-primary` (B.6).
  - A: konten dialog `.pd-pop-in` (fade `dialog[open]`/backdrop sudah global).
  - Bersih: impor `renderFilterModal` tak terpakai di `kelola-peminjaman.js`
       dihapus.
  - Verifikasi: npm run build:css OK; tailwind-guard + pages-render +
    classes + route-guard = 33/33 pass.

[2026-11-20] Tahap 7 - search-input.js (SELESAI):
  - R: tombol clear dipusatkan ke helper bersama `searchClearButtonClass()` +
       `renderSearchClearButton()`; target sentuh `h-5 w-5` (20px) -> `h-9 w-9`
       (36px) dengan `right-2` (tetap di dalam input `h-11` = 44px).
  - H: tombol clear -> `transition-colors` + `hover:bg-slate-100` + tambah
       `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
       + `active:scale-95`. Input sudah punya `focus:ring-2 focus:ring-primary/20`.
  - A: N/A (input statis).
  - Bersih: typo header "Global Serach Input" -> "Global Search Input"; tombol
       "x" bawaan browser (`input[type="search"]::-webkit-search-cancel-button`
       /`::-webkit-search-decoration`) disembunyikan via @layer base agar tidak
       dobel dengan tombol kustom; DUPLIKASI tombol clear manual di
       `kelola-inventaris.js` (createElement + inline `<svg>`, kelas berbeda
       `right-2.5 text-muted-foreground`) dihapus -> memakai
       `renderSearchClearButton()` dari komponen (impor ditambah di L18).
  - Verifikasi: npm run build:css OK; tailwind-guard + pages-render +
    classes + route-guard = 33/33 pass.

[2026-11-20] Tahap 7 - footer.js (SELESAI, dipasang):
  - TEMUAN: `#footer-container` tidak ada di index.html padahal main.js
       (L96, L163-165) sudah memanggil renderFooter() -> footer tak pernah
       tampil. DIPASANG: `<div id="footer-container"></div>` setelah `</main>`.
  - R: `px-4 py-4 text-center text-xs text-zinc-400` (tambah `px-4`).
  - H: tidak ada tautan di footer -> N/A. A: tidak ada animasi masuk.
  - Verifikasi: npm run build:css OK; 33/33 pass (renderFooter tetap
    memuat "2026. PinjemDulu - All Rights Reserved.").

[2026-11-20] Tahap 7 - navbar.js (SELESAI):
  - R: sticky sudah ada via wrapper `#navbar-container` (index.html L33
       `sticky top-0 z-50`) — header tidak diubah; judul `min-w-0 truncate
       text-xl sm:text-2xl`, padding `px-4 sm:px-7` selaras `main`, hamburger
       `h-11 w-11` (44px).
  - H: hamburger "Buka menu" -> `transition-colors` + `hover:text-zinc-900` +
       `active:scale-95` + `focus-visible:outline-none focus-visible:ring-2
       focus-visible:ring-ring`.
  - A: tidak menambah animasi masuk (renderShell() dipanggil ulang saat drawer
       toggle -> akan flash); animasi halaman sudah `.pd-page-in` di `main`.
  - Catatan: "menu user" tidak ditambahkan (profil/logout sudah di kartu user
       sidebar; hindari duplikasi).
  - Koreksi lintas-item: navbar TERNYATA sticky (wrapper `#navbar-container`
       `index.html` L33 `sticky top-0 z-50`, tinggi ~76px). Maka `scroll-mt-6`
       pada judul bagian `tata-tertib.js` dinaikkan -> `scroll-mt-20` agar
       judul tidak tertutup navbar saat tombol "Daftar Isi" diklik
       (memenuhi A.4 "navbar tidak menutupi konten").
  - Verifikasi: npm run build:css OK; tailwind-guard + pages-render +
    classes + route-guard = 33/33 pass.

[2026-11-20] Tahap 7 - sidebar.js (SELESAI):
  - R: aside desktop `h-screen` -> `h-[100dvh]`; tombol tutup drawer
       `h-10 w-10` -> `h-11 w-11` (target sentuh >=44px). Drawer tetap
       `w-[280px] max-w-[90vw]`, nav `overflow-y-auto` (tanpa scroll-x).
  - H: tombol toggle sidebar (2x), grup toggle (collapsed/expanded), item nav
       (child + tunggal), avatar & nama user, logout, tombol tutup drawer ->
       tambah active:scale (ikon 95 / baris nav [0.98]) + focus-visible ring;
       `transition` -> `transition-colors`; avatar/nama -> transition-opacity
       + hover:opacity-90/80. "Tutup menu" (netral) & "Keluar" (rose) tetap
       sesuai makna (B.6).
  - A: drawer buka/tutup `transition-transform` + translate-x, backdrop
       `transition-opacity` (sudah halus; reduced-motion otomatis dari aturan
       global). `transition-[width]` collapse desktop dibiarkan (collapse
       memang mengubah lebar layout).
  - Bersih: inline style dihapus -> `tracking-[0.24em]` dan
       `text-[24px] leading-none`.
  - Verifikasi: npm run build:css OK; tailwind-guard + pages-render +
    classes + route-guard = 33/33 pass (termasuk renderSidebar Peminjam/PJ,
    renderMobileDrawer, dan XSS nama pengguna).

[2026-11-20] Tahap 6 - notfound.js (SELESAI):
  - R: tinggi minimum container `min-h-[60vh]` -> `min-h-[60dvh]`; kartu tetap
       center X/Y.
  - H: tombol "Kembali ke Inventaris" -> tambah `.button-hover-soft-neutral`
       (B.6: Kembali = abu-abu netral) melengkapi `buttonClass` default.
  - A: root .pd-page-in; kartu .pd-rise-in. Ikon AlertCircle tetap
       `h-7 w-7 text-rose-600` (dijaga test); `mount()` tetap memfokus judul.
  - Verifikasi: npm run build:css OK; pages-render + tailwind-guard +
    classes + route-guard = 33/33 pass.
  - Tahap 6 TUNTAS (no.18–21).

[2026-11-20] Tahap 6 - placeholder.js (SELESAI):
  - R: tinggi minimum container `min-h-[60vh]` -> `min-h-[60dvh]` agar stabil
       di browser mobile (address bar dinamis). Kartu tetap center X/Y.
  - H: tombol CTA tetap `buttonClass({variant:'default'})` (sudah punya hover
       token) — sengaja tidak diubah, fokus item = center + ikon.
  - A: root .pd-page-in; kartu .pd-rise-in. Ikon Sparkles tetap
       `h-7 w-7 text-primary` (dijaga test pages-render).
  - Verifikasi: npm run build:css OK; pages-render + tailwind-guard +
    classes = 25/25 pass.

[2026-11-20] Tahap 6 - profil.js (SELESAI):
  - R: modal form inline (password & whatsapp) -> konten `<section role=
       "dialog">` diberi `.pd-pop-in` + `max-h-[90dvh] overflow-y-auto` agar
       tidak terpotong di viewport pendek; toggle password -> `h-8 w-8`
       (selaras input `pr-10`, target sentuh lebih besar); tombol pensil
       (Ubah Password / Edit WA) -> `h-10 w-10 shrink-0` rounded-xl.
  - H: B.6 -> "Batal" (form password & wa) = red (ganti hover manual
       rose-700); "Kirim"/"Edit" = primary (ganti hover:brightness-110);
       "Kembali" (password-success/confirm, wa-success/confirm, password-
       cancel) = neutral; "Batalkan" (password-cancel) = red; sizing modal
       tetap `w-full rounded-xl` (1 aksi) / `w-1/2 rounded-xl` (2 aksi);
       toggle password & tombol pensil -> transition-colors + hover:bg +
       active:scale-95 + focus-visible ring.
  - A: root .pd-page-in; baris header avatar + kartu Identitas (60ms) +
       kartu Informasi Akun (120ms) `.pd-rise-in`; backdrop modal inline
       `.pd-fade-in` (modal `renderModal({asDialog:false})` sudah otomatis
       fade + pop-in + max-h).
  - Verifikasi: npm run build:css OK; tailwind-guard + pages-render +
    classes + pages-kelola-pengguna-fixes = 29/29 pass.

[2026-11-20] Tahap 6 - tata-tertib.js (SELESAI):
  - R: tipografi responsif -> h1 `text-2xl sm:text-3xl`, heading hero
       `text-xl sm:text-2xl`, judul bagian `text-base sm:text-lg`, butir `ol`
       `text-sm sm:text-base`; tambah "Daftar Isi" (nav + tombol) untuk
       navigasi konten panjang; judul bagian dapat `scroll-mt-6`
       [DIKOREKSI -> `scroll-mt-20` pada Tahap 7 no.23, lihat LOG di atas].
  - H: tombol Daftar Isi -> hover:border-primary/30 + hover:bg-primary/10 +
       hover:text-primary, active:scale-95, focus-visible ring.
       Catatan: TIDAK memakai anchor `href="#id"` (hash = routing SPA -> akan
       memicu rute `notfound`); dipakai `<button data-tt-anchor>` +
       scrollIntoView di `mount()`.
  - A: root .pd-page-in; tiap bagian .pd-rise-in stagger 40ms; scroll
       menghormati prefers-reduced-motion (behavior 'auto' saat reduce).
  - Verifikasi: npm run build:css OK; tata-tertib + tailwind-guard +
    pages-render + classes = 28/28 pass.

[2026-11-20] Tahap 0 - Fondasi lintas halaman (SELESAI):
  - tailwind.input.css: transisi dasar elemen interaktif; keyframes & kelas
    .pd-fade-in / .pd-pop-in / .pd-rise-in / .pd-page-in / .pd-spin-once;
    dukungan prefers-reduced-motion.
  - classes.js: buttonClass base -> transition-all + active:scale-[0.98].
  - main.js: playPageEnter() + transisi halaman; kelas view login -> 100dvh.
  - modal.js: pd-pop-in + max-h-[90dvh] overflow internal.
  - pagination.js: hover/active pada tombol prev/next/nomor.
  - icons.js: helper renderWhatsappFlag (bendera WA tanpa inline style).
  - Pembersihan guard: hex inline di profil.js & kelola-pengguna.js; kelas
    yatim sidebar-nav-group di sidebar.js. Hasil: guard 16/16 hijau.

[2026-11-20] Tahap 1 - login.js (SELESAI):
  - R: min-h-[100dvh]; captcha text-lg / sm:text-xl + tracking responsif;
       logo self-start pada halaman lupa password.
  - H: toggle password (hover:bg-zinc-100); tautan "Lupa Password?"
       (transition-colors hover:text-primary/80).
  - A: .pd-spin-once dipicu tiap klik refresh captcha (animasi di <span> anak
       agar tidak bentrok dengan transform tombol).
  - Verifikasi: npm run build:css OK; node --test tailwind-guard + pages-render
    = 16/16 pass.

[2026-11-20] Ketentuan baru ditambahkan (Bagian B.6 + prompt reusable):
  - Konvensi hover tombol: Batal = merah, Kembali = abu-abu, OK/ACC = hijau.
  - Catatan: saat pertama dipakai, perlu token baru (mis. --neutral-hover,
    --positive-solid) di tokens.css + kelas .button-hover-soft-neutral dan
    .button-hover-soft-green di tailwind.input.css.

[2026-11-20] Tahap 1 - reset-password.js (SELESAI):
  - R: min-h-screen -> min-h-[100dvh] (main + wrapper); alert token fixed jadi
       w-[calc(100%-2rem)] max-w-md agar ada margin di viewport kecil.
  - H: toggle password (rounded-lg + hover:bg-zinc-100); "Batal" ->
       .button-hover-soft-red; "Kembali"/"Kembali ke Login" ->
       .button-hover-soft-neutral (konvensi B.6).
  - A: alert tautan tidak valid dapat .pd-fade-in.
  - Fondasi B.6 dibuat di langkah ini: token --neutral-hover(+fg) &
    --positive-solid(+fg) di tokens.css; kelas .button-hover-soft-neutral
    dan .button-hover-soft-green baru; .button-hover-soft-red diperluas
    (set border + warna teks) agar kontras di varian outline.
  - Verifikasi: npm run build:css OK; guard + pages-render 16/16 pass.

[2026-11-20] Tahap 2 - dashboard-peminjam.js (SELESAI):
  - R: min-h-[calc(100vh-112px)] -> 100dvh; modal detail max-h-[90vh] ->
       90dvh; grid kartu 2 -> 4 kolom & tabel tetap pakai overflow-x.
  - H: tombol ikon (lihat detail & tutup modal) dapat active:scale-95;
       tombol "Tutup" -> .button-hover-soft-neutral (konvensi B.6).
  - A: modal detail dapat .pd-fade-in (overlay) + .pd-pop-in (panel).
  - Catatan: kartu ringkasan & banner kanan TIDAK diberi hover karena
    non-interaktif (tidak bisa diklik) agar tidak menyesatkan.
  - Verifikasi: npm run build:css OK; guard + pages-render 16/16 pass.

[2026-11-20] Tahap 2 - dashboard-pj.js (SELESAI):
  - R: min-h-[calc(100vh-112px)] -> 100dvh; modal max-h 90vh -> 90dvh;
       detail modal overlay bg-slate-900/35 + pd-fade-in; grid kartu
       statistik 2 -> 4 kolom; tabel Pengelolaan/Pengajuan tetap overflow-x.
  - H: helper primary() dapat param hoverClass (default button-hover-soft-primary);
       konversi B.6: "Batal"/"Batalkan" -> .button-hover-soft-red,
       "Kembali"/"Tutup" -> .button-hover-soft-neutral,
       "Setujui" -> .button-hover-soft-green, "Kirim" -> .button-hover-soft-primary;
       tombol ikon aksi/tutup (tabel + modal) dapat active:scale-95.
  - A: .pd-page-in pada section utama; .pd-rise-in pada kartu statistik &
       banner kanan; modal detail .pd-fade-in + .pd-pop-in.
  - Verifikasi: npm run build:css OK; guard + pages-render 16/16 pass.
  - Catatan: semua hover:brightness-110 / hover:opacity-90 lama sudah diganti
    kelas konvensi (grep bersih).

[2026-11-20] Tahap 3 - inventaris.js (SELESAI):
  - R: grid kartu 1/2/3/4 kolom & toolbar stack sudah ada; pagination
       diberi className 'flex-wrap justify-center' via renderSharedPagination
       agar tidak meluber di 360px.
  - H: kartu barang hover shadow/translateY + panah group-hover sudah ada;
       tombol filter outline tetap pakai hover buttonClass.
  - A: renderInventarisCard(inv, index) membungkus <a> dengan div .pd-rise-in
       + style animation-delay stagger (index*40ms, cap 11); <a> diberi h-full.
       Empty-state & error-state diberi .pd-fade-in.
       Catatan penting: animasi di wrapper, BUKAN di <a>, agar
       hover:-translate-y-0.5 tidak dianulir oleh fill-mode animasi.
  - Verifikasi: npm run build:css OK; pages-inventaris + katalog + guard +
    pages-render = 33/33 pass.

[2026-11-20] Tahap 3 - detail.js (SELESAI):
  - R: grid 2 kolom -> 1 kolom mobile sudah ada (grid-cols-1 lg:grid-cols-5);
       gambar aspect-[16/10] + object-contain; baris info flex-col -> sm:flex-row.
  - H: tombol "Ajukan Peminjaman" sudah hover -translate-y-0.5 + shadow-md;
       tombol "Kembali" (panah header + "Kembali ke Katalog") dikonversi ke
       .button-hover-soft-neutral + active:scale-95 (B.6).
  - A: root konten .pd-page-in; kartu foto .pd-fade-in; akordeon jadwal
       (details-jadwal-*) diberi/tutup .pd-fade-in pada handleClick.
  - Verifikasi: npm run build:css OK; pages-detail + detail-inventaris +
    guard + pages-render = 29/29 pass.

[2026-11-20] Tahap 3 - ajukan.js (SELESAI):
  - R: form tunggal stack 1 kolom (space-y-6) sudah muat 360px; container
       state (loading/error/gate/barang-null) pakai px responsif; pemicu
       range-calendar satu baris penuh.
  - H: Batal -> .button-hover-soft-red; Kirim Pengajuan -> .button-hover-soft-primary
       (ganti hover:bg-primary/90); "Kembali ke Katalog/Detail Barang" &
       aksi modal "Kembali" -> .button-hover-soft-neutral; aksi modal
       "Batalkan" -> .button-hover-soft-red; aksi modal "Kirim" ->
       .button-hover-soft-primary. className sizing ('flex-1 rounded-xl' /
       'w-full rounded-xl') disertakan agar lebar tombol modal tidak hilang.
  - A: root form + keempat container state -> .pd-page-in; ikon breadcrumb
       "Inventaris" -> transition-transform active:scale-95.
  - Verifikasi: npm run build:css OK; pages-ajukan + ajukan-service +
    ajukan-page + ajukan-form + ajukan-state + guard + pages-render = 55/55 pass.

[2026-11-20] Tahap 4 - peminjaman.js (SELESAI):
  - R: tabel `min-w-[900px]` -> strategi ganda: daftar KARTU stack di mobile
       (container `[data-card-list]` md:hidden) & tabel dibungkus
       `hidden md:block`; refactor getVisibleRows() dipakai bersama oleh
       renderRows() & renderCards() agar paginasi konsisten; aksi di kartu
       dinaikkan ke h-10 w-10 (target sentuh); filter bar sudah responsif.
  - H: konvensi B.6 -> tombol "Tutup" (modal detail) & "Kembali"
       (konfirmasi/sukses) -> .button-hover-soft-neutral; "Kirim" ->
       .button-hover-soft-primary (ganti hover:brightness-110); tombol aksi
       ikon + tab + X + tombol Tutup diberi focus-visible ring & active:scale-95;
       baris tabel transition-colors hover.
  - A: root .pd-page-in; kartu .pd-rise-in dengan stagger 40ms
       (style="animation-delay:${i*40}ms"); overlay modal detail .pd-fade-in
       + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].
  - Verifikasi: npm run build:css OK; peminjaman-service + peminjaman-aksi +
    peminjaman-validation + peminjaman-dummy-flow + pages-kelola-peminjaman +
    guard + pages-render = 46/46 pass. (Kegagalan `npm test` lain murni pada
    suite "Real API"/integrasi BE yang butuh server hidup, bukan regresi.)

[2026-11-20] Tahap 4 - pengembalian.js (SELESAI):
  - R: tabel `min-w-[900px]` -> kartu stack di mobile (`[data-card-list]`
       md:hidden) + tabel dibungkus `hidden md:block`; refactor helper
       `getVisibleRows()` dipakai bersama renderRows() & renderCards();
       aksi di kartu h-10 w-10 (target sentuh); filter bar sudah responsif.
  - H: B.6 -> "Tutup" (modal detail) & "Kembali" (dialog sukses/konfirmasi)
       -> .button-hover-soft-neutral; "Kirim" -> .button-hover-soft-primary
       (ganti hover:brightness-110); tombol ikon aksi + tab + X + Tutup diberi
       focus-visible ring & active:scale-95; baris tabel transition-colors hover.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms; overlay modal detail
       .pd-fade-in + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].
  - Verifikasi: npm run build:css OK; pengembalian-service + pengembalian-aksi +
    pages-pengembalian + guard + pages-render = 20/20 pass.

[2026-11-20] Tahap 4 - pengajuan-pj.js (SELESAI) -> TAHAP 4 TUNTAS:
  - R: tabel `min-w-[560px]` -> kartu stack di mobile (`[data-card-list]`
       md:hidden) + tabel dibungkus `hidden md:block`; refactor helper
       `getVisibleRows()` dipakai bersama renderRows() & renderCards();
       aksi di kartu h-10 w-10; tombol "Tambah Pengajuan" tetap h-11.
  - H: B.6 -> "Tutup" (detail) & "Kembali" (X form / dialog sukses / konfirmasi)
       -> .button-hover-soft-neutral; "Batal" (form) -> .button-hover-soft-red
       (mengganti hover bordir merah manual); "Ajukan" & "Kirim" ->
       .button-hover-soft-primary (mengganti hover:brightness-110 /
       hover:bg-primary/90); tab + X + tombol aksi diberi focus-visible ring &
       active:scale-95; baris tabel transition-colors hover.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms; overlay modal
       detail/form .pd-fade-in + panel .pd-pop-in; max-h-[90vh] -> max-h-[90dvh].
  - Verifikasi: npm run build:css OK; pengajuan-pj + guard + pages-render =
    25/25 pass.

[2026-11-20] Tahap 5 - kelola-inventaris.js (SELESAI):
  - R: tabel 7 kolom (`min-w-full`) -> strategi ganda: kartu stack di mobile
       (`[data-card-list]` md:hidden) + tabel dibungkus `hidden md:block`;
       helper `renderCard(it, index, page, perPage)` baru; konten empty &
       galat dijadikan helper `renderEmptyContent(adaFilter)` /
       `renderErrorContent(error)` agar tabel & kartu konsisten; loading kartu
       pakai `renderContainerLoading`; aksi kartu h-10 w-10, tabel h-8 w-8.
  - H: B.6 -> "Tutup" (modal detail) & "Kembali" (dialog hapus/feedback) =
       .button-hover-soft-neutral (ganti hover:brightness-110 &
       hover:bg-secondary-hover...); "Batal" (form) = .button-hover-soft-red;
       "Terapkan" (filter) & submit form = .button-hover-soft-primary;
       helper `renderActions(it, sizeClass)` dipakai tabel & kartu; tombol
       ikon aksi + X dialog (filter/detail/form) diberi focus-visible ring &
       active:scale-95; baris tabel transition-colors hover.
  - A: root `#kelola-inventaris-root` .pd-page-in (aman untuk dialog native
       karena showModal() memakai top layer, tak terpengaruh transform
       leluhur); kartu .pd-rise-in stagger 40ms (animation-delay); dialog
       native filter/detail/form diberi konten .pd-pop-in (dialog fade sudah
       otomatis dari aturan global `dialog[open]`); max-h-[90vh] -> 90dvh
       pada dialog detail (x2) & form (x2).
  - Verifikasi: npm run build:css OK; pages-kelola-inventaris +
    pages-kelola-actions + pages-kelola-form + kelola-inventaris +
    inventaris-kelola + tailwind-guard + pages-render = 74/74 pass.

[2026-11-20] Tahap 5 - kelola-inventaris-form.js (SELESAI):
  - R: baris tombol aksi bawah `flex-col-reverse sm:flex-row sm:justify-end`
       (mobile bertumpuk penuh-lebar, desktop rata-kanan); tombol Kembali atas
       diberi focus-visible ring + active:scale-95.
  - H: B.6 -> footer form "Batal" = .button-hover-soft-red (ganti kelas
       bespoke .cancel-form-button), submit = .button-hover-soft-primary
       (ganti hover:brightness-110); tautan "Kembali ke Kelola Inventaris"
       (notFound & forbidden) = .button-hover-soft-neutral; tombol
       "remove-foto" = red + focus ring + active:scale-95; aksi dialog bersama:
       confirm-submit (Kembali=neutral, Kirim/Simpan=primary), confirm-cancel
       (Kembali=neutral, Batalkan=red), feedback (Kembali=neutral) — semua
       className memuat sizing `flex-1 rounded-xl`/`w-full rounded-xl`.
  - A: root #kelola-form-root .pd-page-in; dialog konfirmasi & feedback
       (renderModal asDialog) sudah otomatis .pd-fade-in + konten .pd-pop-in +
       max-h-[90dvh] dari komponen bersama (tak perlu ditambah manual).
  - Verifikasi: npm run build:css OK; pages-kelola-form + store +
    inventaris-form + inventaris-form-validation + tailwind-guard +
    pages-render = 60/60 pass.

[2026-11-20] Tahap 5 - kelola-kategori.js (SELESAI):
  - R: pola tabel -> kartu mobile: kartu stack (`[data-card-list]` md:hidden,
       helper `renderKategoriCard()` baru) + tabel dibungkus `hidden md:block`;
       baris tabel diekstrak ke `renderKategoriTableRow()`; skeleton loading
       juga dua representasi (kartu pulse mobile + tabel pulse desktop);
       dialog CRUD (form/confirm/delete/feedback) diberi `max-h-[90dvh]
       overflow-y-auto` agar selalu muat di viewport kecil.
  - H: B.6 -> "Kembali" (confirm/delete/feedback) = .button-hover-soft-neutral
       (ganti hover:bg-secondary-hover... & hover:border-red manual pada
       delete); submit form & confirm = .button-hover-soft-primary (ganti
       hover:brightness-110); "Batal" form = .button-hover-soft-red (ganti
       kelas bespoke .cancel-form-button); aksi baris diekstrak ke
       `renderKategoriActions(kat, sizeClass)` (Ubah + Hapus/disabled) dengan
       focus-visible ring + active:scale-95; X dialog diberi focus ring +
       active:scale-95; baris tabel transition-colors hover.
  - A: root #kelola-kategori-root .pd-page-in; kartu .pd-rise-in stagger 40ms;
       konten tiap dialog native diberi .pd-pop-in (fade dialog[open] global).
  - Verifikasi: npm run build:css OK; pages-kelola-kategori + kelola-kategori +
    kelola-kategori-state + kategori-validation + kategori-crud +
    kategori-combobox + tailwind-guard + pages-render = 64/64 pass.

[2026-11-20] Tahap 5 - kelola-peminjaman.js (SELESAI):
  - R: tabel 9 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
       md:hidden, helper `renderCard()` baru) + tabel dibungkus `hidden md:block`;
       baris tabel diekstrak ke `renderTableRow()`; perhitungan baris halaman
       dipusatkan ke `getVisiblePageRows()` (paginasi tabel & kartu konsisten);
       handler pencarian memperbarui tbody DAN `[data-card-list]`; modal
       pickup/reject-reason/detail diberi `max-h-[90dvh] overflow-y-auto`
       (detail dari max-h-[90vh]); dialog filter diberi `max-h-[90dvh]
       overflow-y-auto`; aksi kartu h-10 w-10, tabel h-8 w-8.
  - H: B.6 -> pickup & reject-reason "Batal" = .button-hover-soft-red (ganti
       hover border/bg rose manual); pickup/reject-reason "Kirim" + filter
       "Terapkan" = .button-hover-soft-primary (ganti hover:brightness-110);
       "Tutup" detail & feedback = .button-hover-soft-neutral (dari
       hover:brightness-110); modal approve/reject: "Kembali" = neutral,
       "Setujui" = .button-hover-soft-green, "Tolak" = .button-hover-soft-red
       (semua memuat sizing `w-1/2 rounded-xl`); aksi baris diekstrak ke
       `renderActions(row, sizeClass)` (Info/Setujui/Tolak/Ambil) dengan
       focus-visible ring + active:scale-95; X dialog (detail & filter) diberi
       focus ring + active:scale-95; baris tabel transition -> transition-colors.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms (animation-delay);
       konten modal inline pickup/reject-reason/detail + konten dialog filter
       diberi .pd-pop-in (fade `dialog[open]` sudah global).
  - Verifikasi: npm run build:css OK; pages-kelola-peminjaman + peminjaman-aksi
    + tailwind-guard + pages-render + classes = 28/28 pass.

[2026-11-20] Tahap 5 - kelola-pengembalian.js (SELESAI):
  - R: tabel 8 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
       md:hidden, helper `renderReturnCard()` baru) + tabel dibungkus
       `hidden md:block`; baris tabel diekstrak ke `renderReturnTableRow()`;
       perhitungan baris halaman dipusatkan ke `getVisiblePageRows()`;
       handler pencarian memperbarui tbody DAN `[data-card-list]`; detail
       modal `max-h-[90vh]` -> `max-h-[90dvh]`; modal form-reject diberi
       `max-h-[90dvh] overflow-y-auto`; dialog filter diberi `max-h-[90dvh]
       overflow-y-auto`; aksi kartu h-10 w-10, tabel h-8 w-8; root list &
       form diberi `.pd-page-in`.
  - H: B.6 -> form "Batal" (form pengembalian & form-reject) = red (ganti
       hover border/bg rose manual); "Kirim" (form + confirm-submit) & filter
       "Terapkan" = primary (ganti hover:brightness-110); modal approve/reject
       + dialog sukses: "Kembali"/"Tutup" = neutral, "Setujui" = green,
       "Tolak" = red, "Batalkan" = red (semua memuat sizing `w-1/2`/`w-full`);
       aksi baris diekstrak ke `renderReturnActions(row, sizeClass)`
       (Info/Setujui/Tolak) dengan focus-visible ring + active:scale-95; X
       detail & filter diberi focus ring + active:scale-95; baris tabel
       transition -> transition-colors.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms (animation-delay);
       konten modal inline detail/form-reject + konten dialog filter diberi
       .pd-pop-in (fade `dialog[open]` sudah global).
  - Bersih: fungsi `statusInfo` & import `statusChipClass` yang tak terpakai
    dihapus.
  - Verifikasi: npm run build:css OK; pages-kelola-pengembalian +
    pengembalian-service + tailwind-guard + pages-render + classes = 31/31 pass.

[2026-11-20] Tahap 5 - kelola-pengajuan-pj.js (SELESAI):
  - R: tabel 5 kolom -> pola ganda: kartu stack mobile (`[data-card-list]`
       md:hidden, helper `renderCard()` baru) + tabel dibungkus `hidden md:block`;
       baris tabel diekstrak ke `renderTableRow()`; perhitungan baris halaman
       dipusatkan ke `getVisiblePageRows()`; handler pencarian memperbarui tbody
       DAN `[data-card-list]`; nama organisasi dipusatkan ke helper
       `organizationName()`; detail modal `max-h-[90vh]` -> `max-h-[90dvh]`;
       modal approve/reject-confirm & reject-form diberi `max-h-[90dvh]
       overflow-y-auto`; aksi kartu h-10 w-10, tabel h-8 w-8.
  - H: B.6 -> "Kembali" (approve/reject-confirm) = neutral (ganti
       hover:bg-secondary-hover*); reject-form "Batal" = red (ganti hover
       border/bg rose manual), "Kirim" = primary (ganti hover:brightness-110);
       "Setujui" = green, "Tolak" = red;"Tutup" (detail & result) = neutral;
       aksi baris diekstrak ke `renderActions(row, sizeClass)` (Info/Setujui/
       Tolak) dengan focus-visible ring + active:scale-95; X detail diberi focus
       ring + active:scale-95; tab & baris tabel transition -> transition-colors.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms (animation-delay);
       konten modal inline (approve/reject-confirm, reject-form, detail) diberi
       .pd-pop-in (fade backdrop sudah global).
  - Verifikasi: npm run build:css OK; pengajuan-pj + tailwind-guard +
    pages-render + classes = 34/34 pass.

[2026-11-20] Tahap 5 - kelola-pengguna.js (SELESAI):
  - R: kedua tabel (List Pengguna & List Request Password, 6 kolom) -> pola
       ganda: kartu stack mobile (`[data-card-list]` md:hidden, helper
       `renderUserCards()`/`renderRpCards()`) + tabel dibungkus `hidden
       md:block`; baris tabel diekstrak ke `renderUserTableRow()`/
       `renderRpTableRow()`; perhitungan baris halaman dipusatkan ke
       `getVisibleUserRows()`; aksi kartu h-10 w-10, tabel h-8 w-8; semua
       modal inline (preview/confirm-send/success/detail-rp/detail-pengguna/
       form) `max-h-[90vh]` -> `max-h-[90dvh] overflow-y-auto`; dialog filter
       dikunci `max-h-[90dvh] overflow-y-auto`; form pengguna memang sudah 1
       kolom.
  - H: B.6 -> "Setujui" (rp-confirm) & "Ya, saya yakin" (status-confirm) =
       green; "Kirim" (add/edit-confirm), "Konfirmasi Pengiriman" (preview) &
       "Terapkan" (filter) = primary; "Kembali"/"Tutup"/"tutup" di semua modal
       = neutral; form "Batal" = red (ganti kelas bespoke `.cancel-form-button`
       yang kini tak dipakai lagi di mana pun); aksi baris (Edit/Detail,
       Setujui/Detail rp) diekstrak ke `renderUserActions()`/`renderRpActions()`
       dengan focus-visible ring + active:scale-95; X filter & tab kelola diberi
       active:scale-95; baris tabel transition -> transition-colors.
  - A: root .pd-page-in; kartu .pd-rise-in stagger 40ms (animation-delay);
       konten modal inline + konten dialog filter diberi `.pd-pop-in` (fade
       `dialog[open]`/backdrop sudah global); toast .pd-rise-in.
  - Verifikasi: npm run build:css OK; pages-kelola-pengguna-fixes +
    tailwind-guard + pages-render + classes = 29/29 pass. (Sisa kegagalan pada
    `npm test` seluruhnya suite integrasi Real API yang butuh backend/TOKEN_SECRET
    — gagal karena lingkungan, bukan regresi UI.)

BERIKUTNYA: SELURUH ROADMAP SELESAI — Tahap 0-7 tuntas (32/32 item). Tidak ada item tersisa.

