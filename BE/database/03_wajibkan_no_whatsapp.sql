-- Jalankan pada database yang sudah memakai skema PinjemDulu.
-- Isi nomor WhatsApp asli untuk akun yang masih NULL/kosong sebelum menjalankan ulang.
BEGIN;

DO $$
DECLARE
  v_akun_kosong text;
BEGIN
  SELECT string_agg(format('%s (%s)', nim, nama_pengguna), '; ' ORDER BY nim)
    INTO v_akun_kosong
  FROM (
    SELECT nim, nama_pengguna
    FROM public.pengguna
    WHERE no_whatsapp IS NULL OR btrim(no_whatsapp) = ''
    ORDER BY nim
    LIMIT 30
  ) AS pengguna_kosong;

  IF v_akun_kosong IS NOT NULL THEN
    RAISE EXCEPTION 'Migrasi dibatalkan. Isi nomor WhatsApp asli untuk akun berikut, lalu jalankan ulang: %',
      v_akun_kosong;
  END IF;
END
$$;

ALTER TABLE public.pengguna
  ALTER COLUMN no_whatsapp SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pengguna'::regclass
      AND conname = 'ck_pengguna_no_whatsapp_not_blank'
  ) THEN
    ALTER TABLE public.pengguna
      ADD CONSTRAINT ck_pengguna_no_whatsapp_not_blank
      CHECK (btrim(no_whatsapp) <> '');
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.sp_tambah_pengguna(
  varchar,
  varchar,
  varchar,
  integer,
  role_pengguna
);

DROP FUNCTION IF EXISTS public.sp_ubah_pengguna(
  varchar,
  varchar,
  varchar,
  varchar,
  integer,
  role_pengguna
);

CREATE OR REPLACE FUNCTION public.sp_tambah_pengguna(
  p_pj_nim varchar,
  p_nim varchar,
  p_nama varchar,
  p_id_organisasi integer,
  p_role role_pengguna DEFAULT 'Peminjam',
  p_no_whatsapp varchar DEFAULT ''
)
RETURNS varchar
LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  PERFORM fn_pastikan_pj(p_pj_nim, p_id_organisasi);
  IF p_no_whatsapp IS NULL OR btrim(p_no_whatsapp) = '' THEN
    RAISE EXCEPTION 'Nomor WhatsApp wajib diisi';
  END IF;

  INSERT INTO pengguna (nim, id_organisasi, nama_pengguna, role, no_whatsapp)
  VALUES (p_nim, p_id_organisasi, p_nama, p_role, p_no_whatsapp);
  RETURN p_nim;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'NIM sudah terdaftar';
END
$$;

CREATE OR REPLACE FUNCTION public.sp_ubah_pengguna(
  p_pj_nim varchar,
  p_nim_lama varchar,
  p_nim_baru varchar,
  p_nama varchar,
  p_id_organisasi integer,
  p_role role_pengguna,
  p_no_whatsapp varchar DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_org integer;
BEGIN
  SELECT id_organisasi INTO v_org
  FROM pengguna
  WHERE nim = p_nim_lama
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan';
  END IF;

  PERFORM fn_pastikan_pj(p_pj_nim, v_org);
  IF p_id_organisasi <> v_org THEN
    RAISE EXCEPTION 'Pengguna tidak dapat dipindahkan ke OKI lain';
  END IF;
  IF p_no_whatsapp IS NOT NULL AND btrim(p_no_whatsapp) = '' THEN
    RAISE EXCEPTION 'Nomor WhatsApp wajib diisi';
  END IF;

  UPDATE pengguna
  SET nim = p_nim_baru,
      nama_pengguna = p_nama,
      role = p_role,
      no_whatsapp = COALESCE(p_no_whatsapp, no_whatsapp),
      updated_at = now()
  WHERE nim = p_nim_lama;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'NIM sudah digunakan';
END
$$;

COMMIT;
