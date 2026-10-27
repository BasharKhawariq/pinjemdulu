/**
 * modal.js — Global Modal Component untuk PinjemDulu.
 *
 * Fitur:
 * - Varian ikon sesuai referensi animasi:
 *   - 'send': konfirmasi kirim (Send / paper airplane)
 *   - 'cancel': konfirmasi batal (AlertTriangle / warning)
 *   - 'delete': konfirmasi hapus (Trash2 / delete)
 *   - 'success': berhasil melakukan action (CheckCircle2 / checkmark)
 *   - 'save'/'edit'/'tambah': konfirmasi tambah/edit inventaris (Package/Pencil)
 *   - 'approve': konfirmasi penyetujuan (CircleCheck)
 *   - 'reject': konfirmasi penolakan (CircleX)
 *   - 'info': informasi / detail
 */

import { html, raw, escapeHtml } from './html.js';
import { renderIcon } from './icons.js';
import { buttonClass } from './classes.js';

export const MODAL_VARIANTS = {
  SUCCESS: 'success',
  APPROVE: 'approve',
  REJECT: 'reject',
  DELETE: 'delete',
  CANCEL: 'cancel',
  WARNING: 'warning',
  SEND: 'send',
  SUBMIT: 'submit',
  SAVE: 'save',
  EDIT: 'edit',
  INFO: 'info',
};

/**
 * Dapatkan konfigurasi icon dan badge berdasarkan varian.
 * @param {string} variant
 * @returns {{ badgeClass: string, iconName: string }}
 */
export function getModalVariantConfig(variant) {
  switch (variant) {
    case 'success':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-600',
        iconName: 'CircleCheck',
        gifSrc: 'assets/animations/modal-success.gif',
      };
    case 'approve':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-600',
        iconName: 'CircleCheck',
        gifSrc: 'assets/animations/modal-approve.gif',
      };
    case 'reject':
    case 'error':
      return {
        badgeClass: 'bg-rose-50 text-rose-600',
        iconName: 'CircleX',
        gifSrc: 'assets/animations/modal-reject.gif',
      };
    case 'delete':
      return {
        badgeClass: 'bg-rose-50 text-rose-600',
        iconName: 'Trash2',
        gifSrc: 'assets/animations/modal-delete.gif',
      };
    case 'cancel':
    case 'warning':
      return {
        badgeClass: 'bg-amber-50 text-amber-600',
        iconName: 'AlertTriangle',
        gifSrc: 'assets/animations/modal-cancel.gif',
      };
    case 'send':
      return {
        badgeClass: 'bg-primary/10 text-primary',
        iconName: 'Send',
        gifSrc: 'assets/animations/modal-send.gif',
      };
    case 'save':
    case 'edit':
    case 'submit':
      return {
        badgeClass: 'bg-primary/10 text-primary',
        iconName: 'Package',
        gifSrc: 'assets/animations/modal-inventaris.gif',
      };
    case 'info':
    default:
      return {
        badgeClass: 'bg-blue-50 text-blue-600',
        iconName: 'Info',
        gifSrc: '',
      };
  }
}

/**
 * Render modal dialog bersama.
 * @param {object} props
 * @param {string} [props.id=''] ID modal/dialog
 * @param {string} [props.titleId=''] ID elemen judul untuk aria-labelledby
 * @param {string} props.title Judul modal
 * @param {string} [props.description=''] Deskripsi modal
 * @param {'success'|'approve'|'reject'|'error'|'delete'|'cancel'|'warning'|'send'|'submit'|'save'|'edit'|'info'|'custom'} [props.variant='info']
 * @param {string|import('./html.js').SafeHtml} [props.customIcon=''] SVG icon kustom jika variant='custom'
 * @param {string} [props.customBadgeClass=''] Kelas badge kustom jika variant='custom'
 * @param {boolean} [props.useGif=true] Menggunakan animasi GIF dari LottieFiles jika tersedia
 * @param {string|import('./html.js').SafeHtml} [props.content=''] Konten opsional (misal data ringkasan)
 * @param {Array<{ label: string, action?: string, id?: string, dataId?: string, variant?: string, className?: string, disabled?: boolean, type?: string }>|string|import('./html.js').SafeHtml} [props.actions=[]]
 * @param {boolean} [props.asDialog=false] Apakah merender tag <dialog> native
 * @param {boolean} [props.open=false] Atribut open pada dialog
 * @param {string} [props.maxWidth='max-w-md'] Lebar modal
 * @param {boolean} [props.showCloseButton=false] Tampilkan tombol silang di pojok kanan atas
 * @param {string} [props.closeAction='close-modal'] Aksi tombol silang
 * @returns {import('./html.js').SafeHtml}
 */
export function renderModal({
  id = '',
  titleId = '',
  title = '',
  description = '',
  variant = 'info',
  customIcon = '',
  customBadgeClass = '',
  useGif = true,
  content = '',
  actions = [],
  primaryAction = null,
  secondaryAction = null,
  asDialog = false,
  open = false,
  maxWidth = 'max-w-md',
  showCloseButton = false,
  closeAction = 'close-modal',
} = {}) {
  const conf = getModalVariantConfig(variant);
  const badgeClass = customBadgeClass || conf.badgeClass;
  const iconHtml = customIcon || renderIcon(conf.iconName, 'h-8 w-8');
  const tId = titleId || (id ? `${id}-title` : 'modal-title');
  const gifSrc = conf.gifSrc;

  let actionList = Array.isArray(actions) && actions.length > 0 ? actions : [];
  if (actionList.length === 0) {
    if (secondaryAction) actionList.push(secondaryAction);
    if (primaryAction) actionList.push(primaryAction);
  }

  let actionsHtml = '';
  if (actionList.length > 0) {
    actionsHtml = actionList
      .map((btn) => {
        const btnVariant = btn.variant || 'default';
        const cls = buttonClass({
          variant: btnVariant,
          size: 'default',
          className: btn.className || (actionList.length === 1 ? 'w-full rounded-xl' : 'flex-1 rounded-xl'),
        });
        const actionAttr = btn.action ? `data-action="${escapeHtml(btn.action)}"` : '';
        const idAttr = btn.id ? `id="${escapeHtml(btn.id)}"` : '';
        const dataIdAttr = btn.dataId ? `data-id="${escapeHtml(btn.dataId)}"` : '';
        const disabledAttr = btn.disabled ? 'disabled' : '';
        const typeAttr = btn.type ? `type="${btn.type}"` : 'type="button"';
        return `<button ${typeAttr} ${actionAttr} ${idAttr} ${dataIdAttr} ${disabledAttr} class="${cls}">${escapeHtml(btn.label)}</button>`;
      })
      .join('');
  } else if (actions && !Array.isArray(actions)) {
    actionsHtml = actions.toString();
  }

  const illustrationHtml = customIcon
    ? html`
        <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${badgeClass}">
          ${raw(customIcon.toString())}
        </div>
      `
    : useGif && gifSrc
      ? html`
          <div class="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl ${badgeClass} p-1">
            <img
              src="${gifSrc}"
              alt="${title || 'Animasi'}"
              class="h-full w-full object-contain select-none pointer-events-none drop-shadow-sm"
              loading="eager"
            />
          </div>
        `
      : html`
          <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${badgeClass}">
            ${raw(iconHtml.toString())}
          </div>
        `;

  const innerContent = html`
    <div class="relative flex flex-col items-center p-6 text-center">
      ${showCloseButton
        ? html`
            <button
              type="button"
              data-action="${escapeHtml(closeAction)}"
              aria-label="Tutup modal"
              class="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              ${renderIcon('X', 'h-5 w-5')}
            </button>
          `
        : raw('')}

      <!-- Icon / Animated Illustration -->
      ${illustrationHtml}

      <!-- Title -->
      <h2 id="${escapeHtml(tId)}" class="text-xl font-bold text-slate-900">${title}</h2>

      <!-- Description -->
      ${description
        ? html`<p class="mt-2 text-sm text-slate-500">${description}</p>`
        : raw('')}

      <!-- Extra Content Slot -->
      ${content ? (typeof content === 'string' ? raw(content) : content) : raw('')}

      <!-- Actions -->
      ${actionsHtml
        ? html`
            <div class="mt-6 flex w-full items-center justify-center gap-3">
              ${raw(actionsHtml)}
            </div>
          `
        : raw('')}
    </div>
  `;

  if (asDialog) {
    return html`
      <dialog
        ${id ? raw(`id="${escapeHtml(id)}"`) : ''}
        aria-labelledby="${escapeHtml(tId)}"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !m-0 z-50 w-full ${maxWidth} rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        ${open ? raw('open') : ''}
      >
        ${innerContent}
      </dialog>
    `;
  }

  return html`
    <div
      ${id ? raw(`id="${escapeHtml(id)}"`) : ''}
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      data-modal-backdrop
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="${escapeHtml(tId)}"
        class="w-full ${maxWidth} rounded-2xl border border-slate-100 bg-white shadow-2xl transition-all"
      >
        ${innerContent}
      </section>
    </div>
  `;
}
