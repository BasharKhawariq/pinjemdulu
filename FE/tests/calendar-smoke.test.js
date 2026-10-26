import test from 'node:test';
import assert from 'node:assert/strict';

import { mockInventaris, getMockPeminjamanAktifById } from '../js/data/inventaris.js';
import {
  canStartOn,
  getDayStatus,
  getMaxEndDate,
  isEndDateDisabled,
  isRangeAvailable,
  simulateQuotaWith,
} from '../js/lib/date-rules.js';
import { dateToISO, isoToDate } from '../js/lib/format.js';

function addDaysISO(isoStr, n) {
  const d = isoToDate(isoStr);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
}

const today = '2026-10-01';

for (const inv of mockInventaris) {
  test(
    `smoke test kalender inventaris: ${inv.idInventaris} (${inv.namaBarang})`,
    { timeout: 15000 },
    () => {
      const bookings = getMockPeminjamanAktifById(inv.idInventaris);
      const totalBarang = inv.totalBarang;

      for (let jumlahPinjam = 1; jumlahPinjam <= totalBarang; jumlahPinjam++) {
        for (let startOffset = 0; startOffset < 120; startOffset++) {
          const startISO = addDaysISO(today, startOffset);

          const startCanStart = canStartOn(bookings, totalBarang, jumlahPinjam, startISO, today);
          const startStatus = getDayStatus(startISO, {
            bookings,
            totalBarang,
            jumlahPinjam,
            today,
            phase: 'start',
          });

          // Konsistensi: hari berstatus free pada fase mulai harus lolos canStartOn
          if (startStatus.status === 'free') {
            assert.equal(
              startCanStart,
              true,
              `Hari ${startISO} berstatus free pada fase mulai tapi gagal canStartOn`
            );
          }

          const maxEnd = getMaxEndDate(startISO, bookings, {
            totalBarang,
            jumlah: jumlahPinjam,
            today,
          });

          // Asersi: hasil getMaxEndDate bertipe sah (string ISO, Infinity, atau null)
          assert.ok(
            maxEnd === null || maxEnd === Infinity || typeof maxEnd === 'string',
            `getMaxEndDate mengembalikan tipe tidak sah: ${maxEnd}`
          );

          if (startCanStart) {
            for (let endOffset = 0; endOffset < 60; endOffset++) {
              const endISO = addDaysISO(startISO, endOffset);

              const endDisabled = isEndDateDisabled(endISO, startISO, bookings, {
                totalBarang,
                jumlah: jumlahPinjam,
                today,
              });
              assert.ok(typeof endDisabled === 'boolean');

              const rangeAvail = isRangeAvailable(startISO, endISO, bookings, {
                totalBarang,
                jumlah: jumlahPinjam,
                today,
              });
              assert.ok(typeof rangeAvail.ok === 'boolean');

              const sim = simulateQuotaWith(isoToDate(endISO), bookings, isoToDate(today), {
                start: isoToDate(startISO),
                end: isoToDate(endISO),
                qty: jumlahPinjam,
              });
              assert.ok(typeof sim === 'number');

              const endStatus = getDayStatus(endISO, {
                bookings,
                totalBarang,
                jumlahPinjam,
                today,
                phase: 'end',
                start: startISO,
                maxEndDate: maxEnd,
              });

              // Konsistensi: hari free pada fase kembali harus lolos isRangeAvailable(start, hari)
              if (endStatus.status === 'free') {
                assert.equal(
                  rangeAvail.ok,
                  true,
                  `Hari ${endISO} berstatus free pada fase kembali tapi gagal isRangeAvailable dari ${startISO}`
                );
              }
            }
          }
        }
      }
    }
  );
}
