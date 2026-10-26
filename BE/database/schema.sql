-- =====================================================================
-- PinjemDulu - skema database (PostgreSQL / Supabase)
-- DRAFT hasil rekonstruksi dari katalog sistem (information_schema,
-- pg_constraint, pg_indexes, pg_trigger, pg_proc, pg_views).
--
-- PERINGATAN
--  * Untuk membuat database BARU / kosong (mis. project Supabase cadangan).
--    JANGAN dijalankan di database yang sudah berisi tabel-tabel ini.
--  * Belum diuji dengan menjalankannya; uji dulu di project percobaan.
--
-- BELUM TERMASUK (belum diambil dari Supabase):
--  * Row Level Security, policy, dan GRANT
--  * Trigger pada auth.users yang memanggil internal.fn_buat_pengguna_dari_auth()
--  * Jadwal pg_cron yang memanggil internal.fn_tandai_terlambat()
--  * Constraint tabel peminjaman mungkin kurang (hasil ekspor terpotong 100 baris)
--  * peminjaman.tanggal_mulai / tanggal_selesai: belum diketahui apakah
--    kolom biasa atau generated column (lihat TODO di bawah)
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- ---------- ENUM ----------
CREATE TYPE public.kondisi AS ENUM ('Baik', 'Rusak');
CREATE TYPE public.role_pengguna AS ENUM ('Peminjam', 'Pengelola');
CREATE TYPE public.status_peminjaman AS ENUM ('Diajukan', 'Disetujui', 'Ditolak', 'Dipinjam', 'Dikembalikan', 'Terlambat');
CREATE TYPE public.status_request AS ENUM ('Diajukan', 'Disetujui', 'Ditolak');

-- ---------- TABEL ----------
CREATE TABLE public.kategori (
    id_kategori serial,
    nama_kategori character varying(50) NOT NULL
);

CREATE TABLE public.organisasi (
    id_organisasi serial,
    nama_organisasi character varying(100) NOT NULL,
    icon bytea
);

CREATE TABLE public.pengguna (
    nim character varying(15) NOT NULL,
    id_organisasi integer,
    nama_pengguna character varying(100) NOT NULL,
    role role_pengguna NOT NULL DEFAULT 'Peminjam'::role_pengguna,
    status_akun boolean NOT NULL DEFAULT true,
    auth_id uuid
);

CREATE TABLE public.inventaris (
    id_inventaris serial,
    id_kategori integer NOT NULL,
    id_organisasi integer NOT NULL,
    nama_barang character varying(100) NOT NULL,
    total_barang integer NOT NULL,
    kondisi kondisi NOT NULL,
    deskripsi_barang character varying(255),
    thumbnail bytea
);

CREATE TABLE public.peminjaman (
    id_peminjaman serial,
    nim character varying(15) NOT NULL,
    id_inventaris integer NOT NULL,
    tanggal_pengajuan date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date,
    start_date date NOT NULL,
    end_date date NOT NULL,
    tanggal_pengembalian date,
    status status_peminjaman NOT NULL DEFAULT 'Diajukan'::status_peminjaman,
    alasan_penolakan character varying(255),
    keperluan character varying(255) NOT NULL,
    kondisi_sebelum kondisi,
    kondisi_sesudah kondisi,
    sanksi character varying(255),
    jumlah_pinjam integer NOT NULL,
    tanggal_mulai date,
    tanggal_selesai date
);

CREATE TABLE public.request_pj (
    id_request serial,
    id_organisasi integer NOT NULL,
    nim character varying(15) NOT NULL,
    lampiran_approval bytea NOT NULL,
    status status_request NOT NULL DEFAULT 'Diajukan'::status_request,
    tanggal_request date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date,
    alasan_penolakan character varying(255)
);

-- TODO: periksa apakah dua kolom ini generated column di Supabase:
--   peminjaman.tanggal_mulai, peminjaman.tanggal_selesai
-- Fungsi internal.fn_jml_dipakai() membacanya untuk menghitung stok.

-- ---------- CONSTRAINT ----------
ALTER TABLE public.kategori ADD CONSTRAINT kategori_pkey PRIMARY KEY (id_kategori);
ALTER TABLE public.kategori ADD CONSTRAINT kategori_pkey PRIMARY KEY (id_kategori);
ALTER TABLE public.organisasi ADD CONSTRAINT organisasi_pkey PRIMARY KEY (id_organisasi);
ALTER TABLE public.organisasi ADD CONSTRAINT organisasi_pkey PRIMARY KEY (id_organisasi);
ALTER TABLE public.pengguna ADD CONSTRAINT pengguna_pkey PRIMARY KEY (nim);
ALTER TABLE public.pengguna ADD CONSTRAINT pengguna_auth_id_key UNIQUE (auth_id);
ALTER TABLE public.pengguna ADD CONSTRAINT chk_pengguna_pengelola_org CHECK (((role <> 'Pengelola'::role_pengguna) OR (id_organisasi IS NOT NULL)));
ALTER TABLE public.pengguna ADD CONSTRAINT fk_pengguna_organisasi FOREIGN KEY (id_organisasi) REFERENCES organisasi(id_organisasi);
ALTER TABLE public.pengguna ADD CONSTRAINT fk_pengguna_auth FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.inventaris ADD CONSTRAINT inventaris_pkey PRIMARY KEY (id_inventaris);
ALTER TABLE public.inventaris ADD CONSTRAINT chk_total_barang CHECK ((total_barang >= 0));
ALTER TABLE public.inventaris ADD CONSTRAINT fk_inventaris_kategori FOREIGN KEY (id_kategori) REFERENCES kategori(id_kategori);
ALTER TABLE public.inventaris ADD CONSTRAINT fk_inventaris_organisasi FOREIGN KEY (id_organisasi) REFERENCES organisasi(id_organisasi);
ALTER TABLE public.peminjaman ADD CONSTRAINT peminjaman_pkey PRIMARY KEY (id_peminjaman);
ALTER TABLE public.peminjaman ADD CONSTRAINT chk_tanggal_peminjaman CHECK ((end_date >= start_date));
ALTER TABLE public.peminjaman ADD CONSTRAINT chk_alasan_penolakan CHECK (((status <> 'Ditolak'::status_peminjaman) OR (alasan_penolakan IS NOT NULL)));
ALTER TABLE public.peminjaman ADD CONSTRAINT chk_jumlah_pinjam CHECK ((jumlah_pinjam > 0));
ALTER TABLE public.peminjaman ADD CONSTRAINT fk_peminjaman_pengguna FOREIGN KEY (nim) REFERENCES pengguna(nim);
ALTER TABLE public.peminjaman ADD CONSTRAINT fk_peminjaman_inventaris FOREIGN KEY (id_inventaris) REFERENCES inventaris(id_inventaris);
ALTER TABLE public.request_pj ADD CONSTRAINT request_pj_pkey PRIMARY KEY (id_request);
ALTER TABLE public.request_pj ADD CONSTRAINT chk_alasan_penolakan_request CHECK (((status <> 'Ditolak'::status_request) OR (alasan_penolakan IS NOT NULL)));
ALTER TABLE public.request_pj ADD CONSTRAINT fk_request_pj_organisasi FOREIGN KEY (id_organisasi) REFERENCES organisasi(id_organisasi);
ALTER TABLE public.request_pj ADD CONSTRAINT fk_request_pj_pengguna FOREIGN KEY (nim) REFERENCES pengguna(nim);

-- ---------- INDEX ----------
CREATE INDEX ix_peminjaman_nim ON public.peminjaman USING btree (nim);
CREATE INDEX ix_peminjaman_inventaris ON public.peminjaman USING btree (id_inventaris, status);
CREATE INDEX ix_peminjaman_terlambat ON public.peminjaman USING btree (end_date) WHERE ((status = 'Dipinjam'::status_peminjaman) AND (tanggal_pengembalian IS NULL));
CREATE INDEX ix_request_organisasi ON public.request_pj USING btree (id_organisasi);
CREATE INDEX ix_request_nim ON public.request_pj USING btree (nim);
CREATE UNIQUE INDEX uq_request_menunggu ON public.request_pj USING btree (nim, id_organisasi) WHERE (status = 'Diajukan'::status_request);
CREATE INDEX ix_inventaris_kategori ON public.inventaris USING btree (id_kategori);
CREATE INDEX ix_inventaris_organisasi ON public.inventaris USING btree (id_organisasi);
CREATE INDEX ix_pengguna_organisasi ON public.pengguna USING btree (id_organisasi);
CREATE UNIQUE INDEX uq_kategori_nama ON public.kategori USING btree (lower(TRIM(BOTH FROM nama_kategori)));

-- ---------- FUNGSI ----------
CREATE OR REPLACE FUNCTION internal.fn_hari_ini()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_my_nim()
 RETURNS character varying
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT p.nim
      FROM public.pengguna AS p
     WHERE p.auth_id = (SELECT auth.uid())
       AND p.status_akun
     LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_my_role()
 RETURNS role_pengguna
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT p.role
      FROM public.pengguna AS p
     WHERE p.auth_id = (SELECT auth.uid())
       AND p.status_akun
     LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_my_id_org()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT p.id_organisasi
      FROM public.pengguna AS p
     WHERE p.auth_id = (SELECT auth.uid())
       AND p.status_akun
     LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_jml_dipakai(p_id_inventaris integer, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT COALESCE(SUM(p.jumlah_pinjam), 0)::INTEGER
      FROM public.peminjaman AS p
     WHERE p.id_inventaris = p_id_inventaris
       AND (
            -- disetujui: memblokir barang selama jendela H-1 .. H+2
            (
                p.status = 'Disetujui'
                AND p.tanggal_mulai   <= (p_end_date + 2)
                AND p.tanggal_selesai >= (p_start_date - 1)
            )
            OR
            -- sedang dipinjam: memblokir bila jendelanya beririsan atau sudah lewat jatuh tempo
            (
                p.status = 'Dipinjam'
                AND p.tanggal_pengembalian IS NULL
                AND (
                    (p.tanggal_mulai <= (p_end_date + 2) AND p.tanggal_selesai >= (p_start_date - 1))
                    OR p.end_date < internal.fn_hari_ini()
                )
            )
            OR
            -- terlambat: barang belum kembali, selalu memblokir
            (
                p.status = 'Terlambat'
                AND p.tanggal_pengembalian IS NULL
            )
       );
$function$;

CREATE OR REPLACE FUNCTION internal.fn_jml_tersedia(p_id_inventaris integer, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total   INTEGER;
    v_kondisi public.kondisi;
BEGIN
    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
        RAISE EXCEPTION 'Rentang tanggal peminjaman tidak valid.';
    END IF;

    SELECT i.total_barang, i.kondisi
      INTO v_total, v_kondisi
      FROM public.inventaris AS i
     WHERE i.id_inventaris = p_id_inventaris;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventaris dengan ID % tidak ditemukan.', p_id_inventaris;
    END IF;

    IF v_kondisi = 'Rusak' THEN
        RETURN 0;
    END IF;

    RETURN GREATEST(v_total - internal.fn_jml_dipakai(p_id_inventaris, p_start_date, p_end_date), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_pengguna_kunci_kolom()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF NEW.nim           IS DISTINCT FROM OLD.nim
        OR NEW.auth_id       IS DISTINCT FROM OLD.auth_id
        OR NEW.id_organisasi IS DISTINCT FROM OLD.id_organisasi
        OR NEW.role          IS DISTINCT FROM OLD.role
        OR NEW.status_akun   IS DISTINCT FROM OLD.status_akun
        THEN
            RAISE EXCEPTION 'Hanya nama (nama_pengguna) yang boleh diubah oleh pengguna.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_request_validasi()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF NEW.nim               IS DISTINCT FROM OLD.nim
        OR NEW.id_organisasi     IS DISTINCT FROM OLD.id_organisasi
        OR NEW.lampiran_approval IS DISTINCT FROM OLD.lampiran_approval
        OR NEW.tanggal_request   IS DISTINCT FROM OLD.tanggal_request
        THEN
            RAISE EXCEPTION 'Data request (pengaju, organisasi, lampiran, tanggal) tidak boleh diubah.';
        END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status <> 'Diajukan' THEN
            RAISE EXCEPTION 'Request sudah diproses dan statusnya tidak dapat diubah lagi.';
        END IF;

        IF current_user IN ('anon', 'authenticated') THEN
            IF internal.fn_my_role() IS DISTINCT FROM 'Pengelola'
               OR internal.fn_my_id_org() IS DISTINCT FROM NEW.id_organisasi
            THEN
                RAISE EXCEPTION 'Hanya Pengelola dari organisasi terkait yang berhak memproses request.';
            END IF;
        END IF;

        IF NEW.status = 'Ditolak' AND NEW.alasan_penolakan IS NULL THEN
            RAISE EXCEPTION 'Alasan penolakan (alasan_penolakan) wajib diisi.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_request_setelah_setuju()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.status = 'Diajukan' AND NEW.status = 'Disetujui' THEN
        PERFORM 1
           FROM public.pengguna
          WHERE nim = NEW.nim
            AND role = 'Pengelola'
            AND id_organisasi IS NOT NULL
            AND id_organisasi <> NEW.id_organisasi;

        IF FOUND THEN
            RAISE EXCEPTION 'Pengguna % sudah menjadi Pengelola di organisasi lain.', NEW.nim;
        END IF;

        UPDATE public.pengguna
           SET role = 'Pengelola',
               id_organisasi = NEW.id_organisasi
         WHERE nim = NEW.nim;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_buat_pengguna_dari_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_nim  TEXT;
    v_nama TEXT;
BEGIN
    v_nim  := NULLIF(btrim(NEW.raw_user_meta_data ->> 'nim'), '');
    v_nama := NULLIF(btrim(NEW.raw_user_meta_data ->> 'nama_pengguna'), '');

    IF v_nim IS NULL THEN
        RAISE NOTICE 'User % dibuat tanpa metadata nim; baris pengguna tidak dibuat.', NEW.id;
        RETURN NEW;
    END IF;

    INSERT INTO public.pengguna (nim, auth_id, nama_pengguna)
    VALUES (v_nim, NEW.id, COALESCE(v_nama, v_nim));

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_peminjaman_sebelum_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_kondisi  public.kondisi;
    v_tersedia INTEGER;
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        -- Kolom hasil proses tidak boleh diisi pemohon
        NEW.tanggal_pengajuan    := internal.fn_hari_ini();
        NEW.tanggal_pengembalian := NULL;
        NEW.kondisi_sebelum      := NULL;
        NEW.kondisi_sesudah      := NULL;
        NEW.sanksi               := NULL;
        NEW.alasan_penolakan     := NULL;

        IF NEW.start_date < NEW.tanggal_pengajuan THEN
            RAISE EXCEPTION 'Tanggal mulai peminjaman tidak boleh di masa lalu.';
        END IF;
    END IF;

    IF NEW.status = 'Diajukan' THEN
        SELECT i.kondisi
          INTO v_kondisi
          FROM public.inventaris AS i
         WHERE i.id_inventaris = NEW.id_inventaris;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inventaris ID % tidak ditemukan.', NEW.id_inventaris;
        END IF;

        IF v_kondisi = 'Rusak' THEN
            RAISE EXCEPTION 'Barang dalam kondisi Rusak, tidak dapat dipinjam.';
        END IF;

        v_tersedia := internal.fn_jml_tersedia(NEW.id_inventaris, NEW.start_date, NEW.end_date);
        IF v_tersedia < NEW.jumlah_pinjam THEN
            RAISE EXCEPTION 'Stok tidak cukup. Tersedia: %, diminta: %.', v_tersedia, NEW.jumlah_pinjam;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_peminjaman_kunci_kolom()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF NEW.nim                IS DISTINCT FROM OLD.nim
        OR NEW.id_inventaris      IS DISTINCT FROM OLD.id_inventaris
        OR NEW.tanggal_pengajuan  IS DISTINCT FROM OLD.tanggal_pengajuan
        OR NEW.start_date         IS DISTINCT FROM OLD.start_date
        OR NEW.end_date           IS DISTINCT FROM OLD.end_date
        OR NEW.jumlah_pinjam      IS DISTINCT FROM OLD.jumlah_pinjam
        OR NEW.keperluan          IS DISTINCT FROM OLD.keperluan
        THEN
            RAISE EXCEPTION 'Data pengajuan (peminjam, barang, tanggal, jumlah, keperluan) tidak boleh diubah.';
        END IF;

        -- kondisi_sebelum hanya diisi otomatis saat persetujuan
        IF NEW.kondisi_sebelum IS DISTINCT FROM OLD.kondisi_sebelum
           AND NOT (OLD.status = 'Diajukan' AND NEW.status = 'Disetujui')
        THEN
            RAISE EXCEPTION 'Kondisi sebelum (kondisi_sebelum) diisi otomatis dan tidak boleh diubah manual.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_peminjaman_alur()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_org_inventaris INTEGER;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF NOT (
           (OLD.status = 'Diajukan'  AND NEW.status IN ('Disetujui', 'Ditolak'))
        OR (OLD.status = 'Disetujui' AND NEW.status = 'Dipinjam')
        OR (OLD.status = 'Dipinjam'  AND NEW.status IN ('Dikembalikan', 'Terlambat'))
        OR (OLD.status = 'Terlambat' AND NEW.status = 'Dikembalikan')
    ) THEN
        RAISE EXCEPTION 'Transisi status tidak valid: "%" -> "%".', OLD.status, NEW.status;
    END IF;

    -- Hanya Pengelola dari organisasi pemilik barang yang boleh mengubah status
    IF current_user IN ('anon', 'authenticated') THEN
        SELECT i.id_organisasi INTO v_org_inventaris
          FROM public.inventaris AS i
         WHERE i.id_inventaris = NEW.id_inventaris;

        IF internal.fn_my_role() IS DISTINCT FROM 'Pengelola'
           OR internal.fn_my_id_org() IS DISTINCT FROM v_org_inventaris
        THEN
            RAISE EXCEPTION 'Hanya Pengelola dari organisasi pemilik barang yang berhak mengubah status peminjaman.';
        END IF;
    END IF;

    IF NEW.status = 'Ditolak' AND NEW.alasan_penolakan IS NULL THEN
        RAISE EXCEPTION 'Alasan penolakan (alasan_penolakan) wajib diisi.';
    END IF;

    IF NEW.status = 'Dikembalikan' THEN
        IF NEW.tanggal_pengembalian IS NULL THEN
            RAISE EXCEPTION 'Tanggal pengembalian (tanggal_pengembalian) harus diisi sebelum peminjaman diselesaikan.';
        END IF;
        IF NEW.kondisi_sesudah IS NULL THEN
            RAISE EXCEPTION 'Kondisi barang setelah pengembalian (kondisi_sesudah) harus diisi.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_peminjaman_awal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_kondisi  public.kondisi;
    v_tersedia INTEGER;
BEGIN
    IF OLD.status = 'Diajukan' AND NEW.status = 'Disetujui' THEN
        -- Kunci baris barang agar dua persetujuan tidak saling menyalip
        SELECT i.kondisi
          INTO v_kondisi
          FROM public.inventaris AS i
         WHERE i.id_inventaris = NEW.id_inventaris
         FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Data inventaris tidak ditemukan.';
        END IF;

        IF v_kondisi = 'Rusak' THEN
            RAISE EXCEPTION 'Peminjaman tidak dapat disetujui karena barang dalam kondisi Rusak.';
        END IF;

        v_tersedia := internal.fn_jml_tersedia(NEW.id_inventaris, NEW.start_date, NEW.end_date);
        IF v_tersedia < NEW.jumlah_pinjam THEN
            RAISE EXCEPTION 'Stok tidak mencukupi saat persetujuan. Tersedia: %, diminta: %.', v_tersedia, NEW.jumlah_pinjam;
        END IF;

        NEW.kondisi_sebelum := v_kondisi;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_peminjaman_setelah_kembali()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'Dikembalikan'
       AND NEW.kondisi_sesudah = 'Rusak'
    THEN
        UPDATE public.inventaris
           SET kondisi = 'Rusak'
         WHERE id_inventaris = NEW.id_inventaris;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_request_sebelum_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        NEW.tanggal_request  := internal.fn_hari_ini();
        NEW.alasan_penolakan := NULL;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION internal.fn_tandai_terlambat()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.peminjaman
       SET status = 'Terlambat'
     WHERE status = 'Dipinjam'
       AND end_date < internal.fn_hari_ini()
       AND tanggal_pengembalian IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG '[cron] % peminjaman ditandai Terlambat.', v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cek_jml_tersedia(p_id_inventaris integer, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
    SELECT internal.fn_jml_tersedia(p_id_inventaris, p_start_date, p_end_date);
$function$;

-- ---------- TRIGGER ----------
CREATE TRIGGER trg_pengguna_kunci_kolom BEFORE UPDATE ON public.pengguna FOR EACH ROW EXECUTE FUNCTION internal.fn_pengguna_kunci_kolom();
CREATE TRIGGER trg_peminjaman_a_insert BEFORE INSERT ON public.peminjaman FOR EACH ROW EXECUTE FUNCTION internal.fn_peminjaman_sebelum_insert();
CREATE TRIGGER trg_peminjaman_b1_kunci BEFORE UPDATE ON public.peminjaman FOR EACH ROW EXECUTE FUNCTION internal.fn_peminjaman_kunci_kolom();
CREATE TRIGGER trg_peminjaman_b2_alur BEFORE UPDATE OF status ON public.peminjaman FOR EACH ROW EXECUTE FUNCTION internal.fn_peminjaman_alur();
CREATE TRIGGER trg_peminjaman_b3_awal BEFORE UPDATE OF status ON public.peminjaman FOR EACH ROW EXECUTE FUNCTION internal.fn_peminjaman_awal();
CREATE TRIGGER trg_peminjaman_c_kembali AFTER UPDATE OF status ON public.peminjaman FOR EACH ROW EXECUTE FUNCTION internal.fn_peminjaman_setelah_kembali();
CREATE TRIGGER trg_request_a_insert BEFORE INSERT ON public.request_pj FOR EACH ROW EXECUTE FUNCTION internal.fn_request_sebelum_insert();
CREATE TRIGGER trg_request_b_validasi BEFORE UPDATE ON public.request_pj FOR EACH ROW EXECUTE FUNCTION internal.fn_request_validasi();
CREATE TRIGGER trg_request_c_setuju AFTER UPDATE OF status ON public.request_pj FOR EACH ROW EXECUTE FUNCTION internal.fn_request_setelah_setuju();

-- ---------- VIEW ----------
CREATE OR REPLACE VIEW public.v_pgn_aman AS
SELECT nim,
    auth_id,
    id_organisasi,
    nama_pengguna,
    role,
    status_akun
   FROM pengguna;

CREATE OR REPLACE VIEW public.v_riw_pjm AS
SELECT p.id_peminjaman,
    p.tanggal_pengajuan,
    p.nim,
    u.nama_pengguna,
    op.nama_organisasi AS organisasi_peminjam,
    i.id_inventaris,
    i.nama_barang,
    ob.nama_organisasi AS organisasi_pemilik_barang,
    p.jumlah_pinjam,
    p.start_date,
    p.end_date,
    p.tanggal_mulai,
    p.tanggal_selesai,
    p.tanggal_pengembalian,
    p.status,
    p.keperluan,
    p.kondisi_sebelum,
    p.kondisi_sesudah,
    p.alasan_penolakan,
    p.sanksi
   FROM peminjaman p
     LEFT JOIN pengguna u ON u.nim::text = p.nim::text
     LEFT JOIN organisasi op ON op.id_organisasi = u.id_organisasi
     JOIN inventaris i ON i.id_inventaris = p.id_inventaris
     JOIN organisasi ob ON ob.id_organisasi = i.id_organisasi;

CREATE OR REPLACE VIEW public.v_inv_ringkas AS
SELECT i.id_inventaris,
    i.nama_barang,
    k.nama_kategori,
    o.nama_organisasi,
    i.total_barang,
    i.kondisi,
    internal.fn_jml_dipakai(i.id_inventaris, internal.fn_hari_ini(), internal.fn_hari_ini()) AS jumlah_dipakai,
    internal.fn_jml_tersedia(i.id_inventaris, internal.fn_hari_ini(), internal.fn_hari_ini()) AS jumlah_tersedia
   FROM inventaris i
     JOIN kategori k ON k.id_kategori = i.id_kategori
     JOIN organisasi o ON o.id_organisasi = i.id_organisasi;

CREATE OR REPLACE VIEW public.v_pjm_harusnya_terlambat AS
SELECT p.id_peminjaman,
    p.nim,
    u.nama_pengguna,
    i.nama_barang,
    p.start_date,
    p.end_date,
    internal.fn_hari_ini() - p.end_date AS hari_terlambat
   FROM peminjaman p
     LEFT JOIN pengguna u ON u.nim::text = p.nim::text
     JOIN inventaris i ON i.id_inventaris = p.id_inventaris
  WHERE p.status = 'Dipinjam'::status_peminjaman AND p.end_date < internal.fn_hari_ini() AND p.tanggal_pengembalian IS NULL
  ORDER BY (internal.fn_hari_ini() - p.end_date) DESC;

CREATE OR REPLACE VIEW public.v_rkp_sts_pjm AS
SELECT status,
    count(*) AS jumlah_peminjaman,
    count(DISTINCT nim) AS total_peminjam_unik,
    count(DISTINCT id_inventaris) AS total_barang_unik,
    COALESCE(sum(jumlah_pinjam), 0::bigint) AS total_unit_barang
   FROM peminjaman
  GROUP BY status;