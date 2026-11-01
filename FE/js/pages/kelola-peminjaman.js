/**
 * Halaman Pengelolaan > Kelola Peminjaman.
 * Data berasal dari service mock frontend, dengan aksi setujui/tolak untuk demo.
 */
import {
  getPeminjaman,
  updateMockPeminjamanStatus,
} from "../services/peminjaman.js";
import { STATUS_PEMINJAMAN } from "../lib/constants.js";
import { formatTanggal } from "../lib/format.js";
import { renderIcon } from "../ui/icons.js";
import { escapeHtml } from "../ui/html.js";
import { renderSearchInput } from "../ui/search-input.js";
import { renderModal as renderModalComponent } from "../ui/modal.js";
import { renderFilterButton, renderFilterModal } from "../ui/filter.js";
import { renderStatusChip } from "../ui/status-chip.js";
import { selectClass, inputClass } from "../ui/classes.js";

const OKI_LIST = [
  "BEM",
  "HMTI",
  "HME",
  "HIMANIA",
  "RISPOL",
  "HMS",
  "THEATRISIC",
  "PP",
];

let rows = [];
let searchTerm = "";
let okiFilter = "all";
let tanggalFilter = "";
let statusFilter = "all";
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let clickHandler = null;
let inputHandler = null;
let toastMessage = "";
let toastType = "success";
let modalRow = null;
let feedbackModal = null;
let confirmModal = null;

function dateLabel(value) {
  if (!value) return "—";
  try {
    return formatTanggal(String(value).slice(0, 10));
  } catch {
    return String(value).slice(0, 10);
  }
}

function statusInfo(status) {
  const value = String(status || "").toLowerCase();
  if (
    value === STATUS_PEMINJAMAN.DIAJUKAN ||
    value === "diajukan" ||
    value === "menunggu_persetujuan"
  )
    return { label: "Diajukan", cls: "bg-info text-info-foreground" };
  if (value === STATUS_PEMINJAMAN.DISETUJUI || value === "disetujui")
    return { label: "Disetujui", cls: "bg-success text-success-foreground" };
  if (value === STATUS_PEMINJAMAN.DITOLAK || value === "ditolak")
    return { label: "Ditolak", cls: "bg-danger text-danger-foreground" };
  if (
    value === STATUS_PEMINJAMAN.DIPINJAM ||
    value === "dipinjam" ||
    value === "sedang dipinjam" ||
    value === "sedang_dipinjam"
  )
    return { label: "Dipinjam", cls: "bg-warning text-warning-foreground" };
  if (
    value === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
    value === "menunggu_pengembalian"
  )
    return {
      label: "Menunggu Pengembalian",
      cls: "bg-warning text-warning-foreground",
    };
  if (
    value === STATUS_PEMINJAMAN.DIKEMBALIKAN ||
    value === "selesai" ||
    value === "dikembalikan"
  )
    return { label: "Dikembalikan", cls: "bg-success text-success-foreground" };
  if (value === STATUS_PEMINJAMAN.TERLAMBAT || value === "terlambat")
    return { label: "Terlambat", cls: "bg-danger text-danger-foreground" };
  return { label: status || "—", cls: "bg-zinc-100 text-zinc-700" };
}

function personName(row) {
  return (
    row.pengguna?.nama || row.peminjam?.nama || row.namaPeminjam || "Peminjam"
  );
}

function organizationName(row) {
  return (
    row.peminjam?.displayOrganization ||
    row.pengguna?.displayOrganization ||
    row.peminjam?.organisasi?.namaOrganisasi ||
    row.peminjam?.namaOrganisasi ||
    row.inventaris?.namaOrganisasi ||
    row.barang?.namaOrganisasi ||
    "Organisasi"
  );
}

function itemName(row) {
  return (
    row.inventaris?.namaBarang ||
    row.barang?.namaBarang ||
    row.barang?.nama ||
    "Barang inventaris"
  );
}

function initials(name) {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "P"
  );
}

function countActiveFilters() {
  let count = 0;
  if (okiFilter && okiFilter !== "all") count++;
  if (tanggalFilter) count++;
  if (statusFilter && statusFilter !== "all") count++;
  return count;
}

function matchTanggalPeminjaman(row, selectedDate) {
  if (!selectedDate) return true;
  const start = String(
    row.startDate || row.mulai || row.tanggalMulai || "",
  ).slice(0, 10);
  const end = String(
    row.endDate || row.selesai || row.tanggalSelesai || start,
  ).slice(0, 10);
  if (!start) return false;
  return (
    selectedDate === start || (selectedDate >= start && selectedDate <= end)
  );
}

function matchStatus(rowStatus, filterStatus) {
  if (!filterStatus || filterStatus === "all") return true;
  const r = String(rowStatus || "").toLowerCase();
  const f = String(filterStatus || "").toLowerCase();
  if (
    f === STATUS_PEMINJAMAN.DIAJUKAN ||
    f === "diajukan" ||
    f === "menunggu_persetujuan"
  ) {
    return (
      r === STATUS_PEMINJAMAN.DIAJUKAN ||
      r === "diajukan" ||
      r === "menunggu_persetujuan"
    );
  }
  if (f === STATUS_PEMINJAMAN.DISETUJUI || f === "disetujui") {
    return r === STATUS_PEMINJAMAN.DISETUJUI || r === "disetujui";
  }
  if (
    f === STATUS_PEMINJAMAN.DIPINJAM ||
    f === "dipinjam" ||
    f === "sedang dipinjam" ||
    f === "sedang_dipinjam"
  ) {
    return (
      r === STATUS_PEMINJAMAN.DIPINJAM ||
      r === "dipinjam" ||
      r === "sedang dipinjam" ||
      r === "sedang_dipinjam"
    );
  }
  if (f === STATUS_PEMINJAMAN.DITOLAK || f === "ditolak") {
    return r === STATUS_PEMINJAMAN.DITOLAK || r === "ditolak";
  }
  return r === f || r.replaceAll("_", " ") === f.replaceAll("_", " ");
}

function matchOki(row, filterOki) {
  if (!filterOki || filterOki === "all") return true;
  const org = organizationName(row);
  return org.toLowerCase() === filterOki.toLowerCase();
}

function visibleRows() {
  const q = searchTerm.trim().toLowerCase();
  return rows.filter((row) => {
    const mOki = matchOki(row, okiFilter);
    const mTanggal = matchTanggalPeminjaman(row, tanggalFilter);
    const mStatus = matchStatus(row.status, statusFilter);
    const mQuery =
      !q ||
      `${personName(row)} ${organizationName(row)} ${itemName(row)}`
        .toLowerCase()
        .includes(q);
    return mOki && mTanggal && mStatus && mQuery;
  });
}

function renderTableRows() {
  const filtered = visibleRows();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  if (!pageRows.length)
    return `<tr><td colspan="8" class="px-6 py-16 text-center text-sm text-slate-400">${renderIcon("Search", "mr-2 inline h-4 w-4")}Tidak ada pengajuan peminjaman yang cocok.</td></tr>`;
  return pageRows
    .map((row, index) => {
      const id = String(row.id || row.idPeminjaman);
      const name = personName(row);
      const org = organizationName(row);
      const status = statusInfo(row.status);
      const pending =
        row.status === STATUS_PEMINJAMAN.DIAJUKAN ||
        String(row.status).toLowerCase() === "diajukan" ||
        String(row.status).toLowerCase() === "menunggu_persetujuan";
      return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[210px] px-4 py-3">
        <div class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials(name))}</span>
          <span class="min-w-0"><span class="block truncate text-xs font-medium text-slate-500">${escapeHtml(name)}</span><span class="mt-1 flex items-center gap-1.5 text-[11px] text-slate-700"><span class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-100 text-[8px] font-bold text-amber-800">${escapeHtml(org.slice(0, 1).toUpperCase())}</span>${escapeHtml(org)}</span></span>
        </div>
      </td>
      <td class="min-w-[150px] px-4 py-4 text-xs text-slate-400">${escapeHtml(itemName(row))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.startDate || row.mulai || row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.endDate || row.selesai || row.tanggalSelesai))}</td>
      <td class="px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</td>
      <td class="px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>
      
<td class="whitespace-nowrap px-1 py-4">
  <div class="flex items-center justify-center gap-0">
    <button
      type="button"
      data-action="detail"
      data-id="${escapeHtml(id)}"
      title="Lihat detail"
      aria-label="Lihat detail"
      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
    >${renderIcon("Info", "h-4 w-4")}</button>
    ${
      pending
        ? `
      <button
        type="button"
        data-action="approve"
        data-id="${escapeHtml(id)}"
        title="Setujui pengajuan"
        aria-label="Setujui pengajuan"
        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-green-600 transition hover:bg-green-50"
      >${renderIcon("CircleCheck", "h-4 w-4")}</button>
      <button
        type="button"
        data-action="reject"
        data-id="${escapeHtml(id)}"
        title="Tolak pengajuan"
        aria-label="Tolak pengajuan"
        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50"
      >${renderIcon("CircleX", "h-4 w-4")}</button>
    `
        : ""
    }
  </div>
</td>

    </tr>`;
    })
    .join("");
}

import { renderPagination as renderSharedPagination } from "../ui/pagination.js";

function renderPagination() {
  const pages = Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE));
  return renderSharedPagination({
    currentPage,
    totalPages: pages,
    prevAction: "prev",
    nextAction: "next",
    showNumbers: false,
    className: "justify-end",
  });
}

function renderModal() {
  if (confirmModal) {
    const isApprove = confirmModal.type === "approve";
    return renderModalComponent({
      variant: isApprove ? "approve" : "reject",
      title: isApprove
        ? "Setujui pengajuan peminjaman?"
        : "Tolak pengajuan peminjaman?",
      description: isApprove
        ? "Saya yakin ingin menyetujui peminjaman ini"
        : "Saya yakin ingin menolak peminjaman ini",
      actions: [
        {
          label: "Kembali",
          action: "close-confirm-modal",
          variant: "outline",
          className: "w-1/2 rounded-xl",
        },
        {
          label: isApprove ? "Setujui" : "Tolak",
          action: isApprove ? "execute-approve" : "execute-reject",
          dataId: String(confirmModal.id),
          variant: "default",
          className: isApprove
            ? "w-1/2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            : "w-1/2 rounded-xl bg-rose-600 text-white hover:bg-rose-700",
        },
      ],
    });
  }

  if (feedbackModal) {
    return renderModalComponent({
      variant: feedbackModal.variant,
      title: feedbackModal.title,
      description: feedbackModal.description,
      primaryAction: {
        label: "Tutup",
        action: "close-feedback-modal",
        className: "w-full rounded-xl",
      },
    });
  }

  if (!modalRow) return "";
  const row = modalRow;
  const item = row.inventaris || row.barang || {};
  const name = item.namaBarang || row.namaBarang || "Barang inventaris";
  const org = organizationName(row);
  const isTerlambat =
    row.status === STATUS_PEMINJAMAN.TERLAMBAT ||
    String(row.status).toLowerCase() === "terlambat";
  const isDitolak =
    row.status === STATUS_PEMINJAMAN.DITOLAK ||
    String(row.status).toLowerCase() === "ditolak";
  const daysLate = row.waktuTerlambat || 3;
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="detail-title" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <h2 id="detail-title" class="text-xl font-bold text-slate-900">Detail Peminjaman</h2>
          <button type="button" data-action="close-modal" aria-label="Tutup detail" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">${renderIcon("X", "h-5 w-5")}</button>
        </div>
        <div class="mt-6 space-y-5">
          <div>
            <p class="text-xs font-semibold text-slate-900">Nama Barang</p>
            <div class="mt-2 flex items-center justify-between">
              <span class="text-sm font-normal text-slate-800">${escapeHtml(name)}</span>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span class="inline-block h-3 w-3 rounded-full bg-slate-400" aria-hidden="true"></span>
                ${escapeHtml(org)}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-zinc-200">
            <div class="sm:pr-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Pengajuan</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateLabel(row.tanggalPengajuan || row.createdAt))}</p>
            </div>
            <div class="sm:px-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Mulai</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateLabel(row.startDate || row.mulai))}</p>
            </div>
            <div class="sm:pl-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Selesai</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateLabel(row.endDate || row.selesai))}</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-900">Jumlah</p>
            <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</p>
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-900">Keperluan Peminjaman Barang</p>
            <div class="mt-2 rounded-2xl border border-zinc-200/80 p-3.5 text-xs sm:text-sm text-slate-700 bg-white">
              ${escapeHtml(row.keperluan || "Seminar BEM")}
            </div>
          </div>

          ${
            row.diprosesOleh
              ? `
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-900">Diproses Oleh</span>
              <span class="text-sm font-medium text-slate-800">${escapeHtml(row.diprosesOleh)}</span>
            </div>
          `
              : ""
          }

          <div>
            <p class="text-xs font-semibold text-slate-900">Status</p>
            <div class="mt-2 flex items-center">
              ${renderStatusChip({ status: row.status })}
              ${
                isTerlambat
                  ? `
                <div class="relative group ml-2 inline-flex items-center">
                  <span class="inline-flex h-5 w-5 items-center justify-center text-rose-600 cursor-pointer" aria-label="Informasi keterlambatan">
                    ${renderIcon("AlertCircle", "h-5 w-5")}
                  </span>
                  <div class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xl border border-slate-200">
                    Waktu Terlambat: ${daysLate} Hari
                    <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          ${
            isDitolak
              ? `
            <div>
              <p class="text-xs font-semibold text-slate-900">Alasan Ditolak</p>
              <div class="mt-2 rounded-2xl border border-zinc-200/80 p-3.5 text-xs sm:text-sm text-slate-700 bg-white">
                ${escapeHtml(row.alasanPenolakan || "Peminjaman tidak dapat diproses karena alasan operasional")}
              </div>
            </div>
          `
              : ""
          }
        </div>

        <div class="mt-6 flex justify-end">
          <button type="button" data-action="close-modal" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            Tutup
          </button>
        </div>
      </section>
    </div>`;
}

async function loadRows() {
  const all = await getPeminjaman();
  const active = all.filter(
    (row) =>
      row.status !== STATUS_PEMINJAMAN.DIKEMBALIKAN &&
      String(row.status).toLowerCase() !== "selesai",
  );
  const pending = active.filter(
    (row) =>
      row.status === STATUS_PEMINJAMAN.DIAJUKAN ||
      String(row.status).toLowerCase() === "diajukan" ||
      String(row.status).toLowerCase() === "menunggu_persetujuan",
  );
  const borrowed = active.find(
    (row) =>
      row.status === STATUS_PEMINJAMAN.DIPINJAM ||
      String(row.status).toLowerCase() === "sedang_dipinjam" ||
      String(row.status).toLowerCase() === "dipinjam",
  );
  const rejected = active.find(
    (row) =>
      row.status === STATUS_PEMINJAMAN.DITOLAK ||
      String(row.status).toLowerCase() === "ditolak",
  );
  const approved = active.find(
    (row) =>
      row.status === STATUS_PEMINJAMAN.DISETUJUI ||
      String(row.status).toLowerCase() === "disetujui",
  );
  const initialFive = [
    ...pending.slice(0, 2),
    borrowed,
    rejected,
    approved,
  ].filter(Boolean);
  const rest = active.filter((r) => !initialFive.includes(r));
  return [...initialFive, ...rest];
}

function renderContent() {
  const count = visibleRows().length;
  const nAktif = countActiveFilters();
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-9"><h1 class="text-3xl font-semibold tracking-tight text-slate-900">Kelola Peminjaman</h1><p class="mt-1 text-sm text-slate-400">Pantau dan kelola pengajuan peminjaman barang dari peminjam.</p></div>
    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-4">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold text-slate-900">List Peminjam</h2>
        <div class="flex items-center gap-3">
          ${renderSearchInput({ id: "search-peminjam", value: searchTerm, placeholder: "Cari nama peminjam", ariaLabel: "Cari nama peminjam", className: "w-full sm:w-[260px]" })}
          ${renderFilterButton({
            id: "btn-filter-peminjaman",
            action: "open-filter-dialog",
            title: "Filter kelola peminjaman",
            ariaLabel: "Filter kelola peminjaman",
            countActive: nAktif,
          })}
        </div>
      </div>
      ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}">${escapeHtml(toastMessage)}</div>` : ""}
      <div class="w-full overflow-x-auto"><table class="w-full min-w-full border-collapse text-left">
        <thead>
            <tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">
            <th class="px-4 py-4 text-center font-semibold">No</th>
            <th class="px-4 py-4 font-semibold">Nama Peminjam</th>
            <th class="px-4 py-4 font-semibold">Barang Dipinjam</th>
            <th class="px-4 py-4 text-center font-semibold">Tanggal Mulai</th>
            <th class="px-4 py-4 text-center font-semibold">Tanggal Selesai</th>
            <th class="px-4 py-4 text-center font-semibold">Jumlah Unit</th>
            <th class="px-4 py-4 text-center font-semibold">Status</th>
            <th class="px-4 py-4 text-center font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows()}
        </tbody>
        </table>
      </div>
      <div class="mt-6 flex items-center justify-between gap-3"><p class="text-xs text-slate-400">Menampilkan ${count ? Math.min((currentPage - 1) * PAGE_SIZE + 1, count) : 0}–${Math.min(currentPage * PAGE_SIZE, count)} dari ${count} pengajuan</p>${renderPagination()}</div>
    </div>
  </section>
  ${renderModal()}
  ${renderFilterModal({
    id: "dialog-filter-peminjaman",
    title: "Filter Kelola Peminjaman",
    countActive: nAktif,
    closeAction: "close-filter-dialog",
    resetAction: "reset-filter-dialog",
    applyAction: "apply-filter-dialog",
    formId: "form-filter-peminjaman",
    bodyContent: `
      <div class="space-y-4">
        <!-- OKI Peminjam -->
        <div class="space-y-1.5">
          <label for="filter-peminjaman-oki" class="text-sm font-medium text-foreground">OKI Peminjam</label>
          <div class="relative">
            <select id="filter-peminjaman-oki" name="oki" class="${selectClass("appearance-none pr-10 cursor-pointer")}">
              <option value="all" ${okiFilter === "all" ? "selected" : ""}>Pilih OKI</option>
              ${OKI_LIST.map((oki) => `<option value="${escapeHtml(oki)}" ${okiFilter === oki ? "selected" : ""}>${escapeHtml(oki)}</option>`).join("")}
            </select>
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon("ChevronDown", "h-4 w-4")}
            </span>
          </div>
        </div>

        <!-- Tanggal Peminjaman -->
        <div class="space-y-1.5">
          <label for="filter-peminjaman-tanggal" class="text-sm font-medium text-foreground">Tanggal Peminjaman</label>
          <div class="relative">
            <input
              type="date"
              id="filter-peminjaman-tanggal"
              name="tanggal"
              value="${escapeHtml(tanggalFilter)}"
              placeholder="Pilih Tanggal"
              class="${inputClass("appearance-none pr-10 cursor-pointer text-slate-700 w-full")}"
            />
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon("CalendarDays", "h-4 w-4")}
            </span>
          </div>
        </div>

        <!-- Status -->
        <div class="space-y-1.5">
          <label for="filter-peminjaman-status" class="text-sm font-medium text-foreground">Status</label>
          <div class="relative">
            <select id="filter-peminjaman-status" name="status" class="${selectClass("appearance-none pr-10 cursor-pointer")}">
              <option value="all" ${statusFilter === "all" ? "selected" : ""}>Pilih status</option>
              <option value="${STATUS_PEMINJAMAN.DIAJUKAN}" ${statusFilter === STATUS_PEMINJAMAN.DIAJUKAN ? "selected" : ""}>Diajukan</option>
              <option value="${STATUS_PEMINJAMAN.DISETUJUI}" ${statusFilter === STATUS_PEMINJAMAN.DISETUJUI ? "selected" : ""}>Disetujui</option>
              <option value="${STATUS_PEMINJAMAN.DIPINJAM}" ${statusFilter === STATUS_PEMINJAMAN.DIPINJAM ? "selected" : ""}>Dipinjam</option>
              <option value="${STATUS_PEMINJAMAN.DITOLAK}" ${statusFilter === STATUS_PEMINJAMAN.DITOLAK ? "selected" : ""}>Ditolak</option>
            </select>
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon("ChevronDown", "h-4 w-4")}
            </span>
          </div>
        </div>
      </div>
    `,
  })}`;
}

function refresh() {
  if (!rootElement) return;
  const search = rootElement.querySelector("#search-peminjam");
  const selection = search
    ? { start: search.selectionStart, end: search.selectionEnd }
    : null;
  rootElement.innerHTML = renderContent();
  const nextSearch = rootElement.querySelector("#search-peminjam");
  if (
    nextSearch &&
    selection &&
    document.activeElement?.id === "search-peminjam"
  ) {
    nextSearch.focus();
    try {
      nextSearch.setSelectionRange(selection.start, selection.end);
    } catch {}
  }
}

export function render() {
  return renderContent();
}

export async function mount(root) {
  rootElement = root;
  searchTerm = "";
  currentPage = 1;
  toastMessage = "";
  modalRow = null;
  feedbackModal = null;
  okiFilter = "all";
  tanggalFilter = "";
  statusFilter = "all";
  rows = await loadRows();
  rootElement.innerHTML = renderContent();

  clickHandler = async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      if (
        event.target.closest("[data-modal-backdrop]") &&
        event.target === event.target.closest("[data-modal-backdrop]")
      ) {
        modalRow = null;
        refresh();
      }
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "close-modal") {
      modalRow = null;
      refresh();
      return;
    }
    if (action === "close-feedback-modal") {
      feedbackModal = null;
      refresh();
      return;
    }
    if (action === "detail") {
      modalRow =
        rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) ||
        null;
      refresh();
      return;
    }
    if (action === "prev") {
      currentPage = Math.max(1, currentPage - 1);
      refresh();
      return;
    }
    if (action === "next") {
      currentPage = Math.min(
        Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE)),
        currentPage + 1,
      );
      refresh();
      return;
    }
    if (action === "open-filter-dialog") {
      rootElement.querySelector("#dialog-filter-peminjaman")?.showModal();
      return;
    }
    if (action === "close-filter-dialog") {
      rootElement.querySelector("#dialog-filter-peminjaman")?.close();
      return;
    }
    if (action === "reset-filter-dialog") {
      okiFilter = "all";
      tanggalFilter = "";
      statusFilter = "all";
      currentPage = 1;
      rootElement.querySelector("#dialog-filter-peminjaman")?.close();
      refresh();
      return;
    }
    if (action === "apply-filter-dialog") {
      okiFilter =
        rootElement.querySelector("#filter-peminjaman-oki")?.value || "all";
      tanggalFilter =
        rootElement.querySelector("#filter-peminjaman-tanggal")?.value || "";
      statusFilter =
        rootElement.querySelector("#filter-peminjaman-status")?.value || "all";
      currentPage = 1;
      rootElement.querySelector("#dialog-filter-peminjaman")?.close();
      refresh();
      return;
    }
    if (action === "approve") {
      confirmModal = { type: "approve", id };
      refresh();
      return;
    }
    if (action === "reject") {
      confirmModal = { type: "reject", id };
      refresh();
      return;
    }
    if (action === "close-confirm-modal") {
      confirmModal = null;
      refresh();
      return;
    }
    if (action === "execute-approve" || action === "execute-reject") {
      const isApprove = action === "execute-approve";
      const targetId = button.dataset.id || confirmModal?.id;
      confirmModal = null;
      const nextStatus = isApprove
        ? STATUS_PEMINJAMAN.DISETUJUI
        : STATUS_PEMINJAMAN.DITOLAK;
      try {
        await updateMockPeminjamanStatus(targetId, nextStatus);
        rows = await loadRows();
        toastType = "success";
        toastMessage = isApprove
          ? "Pengajuan berhasil disetujui."
          : "Pengajuan berhasil ditolak.";
        feedbackModal = {
          variant: isApprove ? "approve" : "reject",
          title: isApprove ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
          description: isApprove
            ? "Pengajuan peminjaman barang berhasil disetujui dan status telah diperbarui."
            : "Pengajuan peminjaman barang telah ditolak.",
        };
      } catch (error) {
        toastType = "error";
        toastMessage = error?.message || "Status pengajuan gagal diperbarui.";
      }
      refresh();
      return;
    }
  };

  inputHandler = (event) => {
    if (event.target.id !== "search-peminjam") return;
    searchTerm = event.target.value;
    currentPage = 1;
    const cursor = event.target.selectionStart;
    const filtered = visibleRows();
    const tbody = rootElement.querySelector("tbody");
    if (tbody) tbody.innerHTML = renderTableRows();
    const footer = rootElement.querySelector(
      ".mt-6.flex.items-center.justify-between",
    );
    if (footer)
      footer.innerHTML = `<p class="text-xs text-slate-400">Menampilkan ${filtered.length ? 1 : 0}–${Math.min(PAGE_SIZE, filtered.length)} dari ${filtered.length} pengajuan</p>${renderPagination()}`;
    const input = rootElement.querySelector("#search-peminjam");
    if (input) {
      input.focus();
      try {
        input.setSelectionRange(cursor, cursor);
      } catch {}
    }
  };

  rootElement.addEventListener("click", clickHandler);
  rootElement.addEventListener("input", inputHandler);
}

export function unmount() {
  if (rootElement && clickHandler)
    rootElement.removeEventListener("click", clickHandler);
  if (rootElement && inputHandler)
    rootElement.removeEventListener("input", inputHandler);
  rootElement = null;
  clickHandler = null;
  inputHandler = null;
  rows = [];
  modalRow = null;
  feedbackModal = null;
  confirmModal = null;
  okiFilter = "all";
  tanggalFilter = "";
  statusFilter = "all";
}
