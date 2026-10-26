import test from 'node:test';
import assert from 'node:assert/strict';

import { ROLES, STATUS_AKUN } from '../js/lib/constants.js';
import { login, getCurrentUser, createCaptcha, _resetAuthMockState } from '../js/services/auth.js';
import { mockOrganisasi } from '../js/data/index.js';

// Pastikan mock mode aktif (fallback default 'true' jika env tidak diset).
process.env.NEXT_PUBLIC_USE_MOCK = 'true';

const [bemFt, ukmFoto] = mockOrganisasi;

/*
 * Data user mock saat ini (src/data/mock/users.js):
 *   user-1: Maitri Sakti   peminjam     BEM FT    email: maitri.sakti@mailinator.com    AKTIF
 *   user-2: Siti Rahma     PJ (BEM FT)             email: siti.rahma@bemft.uma.ac.id      AKTIF
 *   user-3: Budi Santoso   PJ (UKM Foto)          email: budi.santoso@ukmfoto.uma.ac.id  AKTIF
 *   user-4: Aulia Putri    peminjam     BEM FT    email: auliaputri@mailinator.com       NONAKTIF
 */

const captchaQuick = () => createCaptcha();

test.beforeEach(() => {
  _resetAuthMockState();
});

/* ========================================================================== */
/*                      LOGIN — email / status akun                          */
/* ========================================================================== */

test('login mock: email tidak terdaftar → 401 "Email tidak terdaftar."', async () => {
  const cap = captchaQuick();
  await assert.rejects(
    () =>
      login({
        email: 'tidak-ada@mailinator.com',
        password: 'apa',
        captchaId: cap.captchaId,
        captchaAnswer: cap.answer,
      }),
    /Email tidak terdaftar/
  );
});

test('login mock: akun nonaktif (Aulia Putri) → 403 "Akun nonaktif, hubungi penanggung jawab"', async () => {
  const cap = captchaQuick();
  await assert.rejects(
    () =>
      login({
        email: 'auliaputri@mailinator.com',
        password: 'x',
        captchaId: cap.captchaId,
        captchaAnswer: cap.answer,
      }),
    /Akun nonaktif/
  );
});

test('login mock: email case-insensitive berhasil (MAITRI.SAKTI vs lowercase)', async () => {
  const cap = captchaQuick();
  const result = await login({
    email: 'MAITRI.SAKTI@MAILINATOR.COM',
    password: 'bebas',
    captchaId: cap.captchaId,
    captchaAnswer: cap.answer,
  });
  const { user } = result;
  assert.equal(user.nim, '254107020789', 'NIM Maitri Sakti 254107020789');
  assert.equal(user.email, 'maitri.sakti@mailinator.com');
  assert.equal(user.nama, 'Maitri Sakti');
  assert.equal(user.role, ROLES.PEMINJAM);
  assert.equal(user.organisasi?.id, bemFt.id);
});

test('login mock: sukses untuk PENANGGUNG_JAWAB aktif, user shape benar tanpa sensitif', async () => {
  const cap = captchaQuick();
  const { user } = await login({
    email: 'siti.rahma@bemft.uma.ac.id',
    password: '',
    captchaId: cap.captchaId,
    captchaAnswer: cap.answer,
  });
  assert.equal(user.role, ROLES.PENANGGUNG_JAWAB);
  assert.equal(user.organisasi?.id, bemFt.id);
  assert.ok(user.id, 'harus punya id');
  assert.ok(user.email, 'harus punya email yang disanitize');
  // status_akun dan password TIDAK ada di shape user (sanitize)
  assert.equal(Object.hasOwn(user, 'status_akun'), false, 'status_akun harus distrip');
  assert.equal(Object.hasOwn(user, 'password'), false, 'password harus distrip');
});

test('login mock: sukses untuk PJ UKM Foto (Budi), organisasi sesuai', async () => {
  const cap = captchaQuick();
  const { user } = await login({
    email: 'budi.santoso@ukmfoto.uma.ac.id',
    password: '',
    captchaId: cap.captchaId,
    captchaAnswer: cap.answer,
  });
  assert.equal(user.nama, 'Budi Santoso');
  assert.equal(user.nim, '2201112233');
  assert.equal(user.role, ROLES.PENANGGUNG_JAWAB);
  assert.equal(user.organisasi?.id, ukmFoto.id);
});

test('login mock: password tidak diperiksa (apa isinya tidak pengaruh)', async () => {
  const capA = captchaQuick();
  const capB = captchaQuick();
  const a = await login({
    email: 'maitri.sakti@mailinator.com',
    password: '',
    captchaId: capA.captchaId,
    captchaAnswer: capA.answer,
  });
  const b = await login({
    email: 'maitri.sakti@mailinator.com',
    password: 'salah-banget',
    captchaId: capB.captchaId,
    captchaAnswer: capB.answer,
  });
  assert.equal(a.user.id, b.user.id);
});

/* ========================================================================== */
/*                              CAPTCHA                                       */
/* ========================================================================== */

test('login mock: captcha salah ditolak (jawaban berbeda)', async () => {
  const cap = captchaQuick();
  await assert.rejects(
    () =>
      login({
        email: 'maitri.sakti@mailinator.com',
        password: 'apa',
        captchaId: cap.captchaId,
        // jawaban SELALU salah: tidak mungkin cocok dgn captcha 4 huruf acak
        captchaAnswer: 'zzzzzzz',
      }),
    /captcha salah|kadaluarsa/i
  );
});

test('login mock: captcha benar TIDAK peka huruf besar/kecil (jawaban uppercase vs lower asli)', async () => {
  const cap = captchaQuick();
  // cap.answer lowercase (dijamin createCaptcha hanya lowercase). Kita kirim UPPERCASE.
  const jawabanUppercase = String(cap.answer).toUpperCase();
  const { user } = await login({
    email: 'siti.rahma@bemft.uma.ac.id',
    password: 'pppp',
    captchaId: cap.captchaId,
    captchaAnswer: jawabanUppercase,
  });
  assert.equal(user.nama, 'Siti Rahma');
  assert.equal(user.role, ROLES.PENANGGUNG_JAWAB);
});

test('login mock: captcha hanya SATU PAKAI (dipakai sekali → kedua kali ditolak "id tidak ada")', async () => {
  const cap = captchaQuick();
  // pemakaian pertama
  await login({
    email: 'maitri.sakti@mailinator.com',
    password: 'p1',
    captchaId: cap.captchaId,
    captchaAnswer: cap.answer,
  });
  // pemakaian kedua dengan ID + jawaban SAMA → captchaId sudah dihapus dari store
  await assert.rejects(
    () =>
      login({
        email: 'maitri.sakti@mailinator.com',
        password: 'p2',
        captchaId: cap.captchaId,
        captchaAnswer: cap.answer,
      }),
    /captcha salah|kadaluarsa/i
  );
});

test('login mock: captchaId kosong / captchaAnswer kosong → ditolak', async () => {
  await assert.rejects(
    () =>
      login({
        email: 'maitri.sakti@mailinator.com',
        password: 'p',
        captchaId: '',
        captchaAnswer: 'ab',
      }),
    /captcha/i
  );
});

test('login mock: captcha MOCK-QUICKLOGIN khusus mode mock — captchaAnswer bebas, dilewatkan', async () => {
  // Panel "Masuk cepat" di LoginView menggunakan captchaId literal ini
  const { user } = await login({
    email: 'budi.santoso@ukmfoto.uma.ac.id',
    password: 'tidak-dicek',
    captchaId: 'MOCK-QUICKLOGIN',
    captchaAnswer: '', // dikosongi, TETAP berhasil
  });
  assert.equal(user.nama, 'Budi Santoso');
});

test('createCaptcha: menghasilkan answer 4 huruf kecil, captchaId awalan "cap-"', async () => {
  const cap = createCaptcha();
  assert.match(cap.captchaId, /^cap-/);
  assert.equal(cap.answer.length, 4);
  assert.ok(/^[a-z]{4}$/.test(cap.answer), `answer harus 4 lowercase: ${cap.answer}`);
});

/* ========================================================================== */
/*                           getCurrentUser                                   */
/* ========================================================================== */

test('getCurrentUser: id user aktif ditemukan, nonaktif tidak ditemukan', async () => {
  // user aktif: user-1 Maitri
  const aktif = await getCurrentUser('user-1');
  assert.equal(aktif.user?.nim, '254107020789');
  assert.equal(aktif.user?.email, 'maitri.sakti@mailinator.com');

  // user nonaktif: user-4 → harus null
  const nonaktif = await getCurrentUser('user-4');
  assert.equal(nonaktif.user, null, 'akun nonaktif harus dianggap tidak valid');

  // id tidak ada → null
  const tidakAda = await getCurrentUser('user-tidak-ada');
  assert.equal(tidakAda.user, null);
});
