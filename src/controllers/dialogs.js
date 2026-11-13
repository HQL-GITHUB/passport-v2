import { safe, icon } from '../lib/format.js';

/** Application module. Dependencies are provided by createApp(). */
export function createDialogController(appContext) {
  // The dialogs, by kind. `view` names, among `appContext.views`, the function that answers what
  // a dialog shows: its `title`, its `body` and, where it keeps any, the `state` it opens with;
  // or nothing, where there is nothing to open it on. `extra` is a class of its own, `focus`
  // what takes the focus where that is not the first button, and `opened` what is set up once
  // the dialog is on the page.
  const table = {
    memory: { view: 'memoryDialog', focus: 'textarea' },
    'ticket-view': { view: 'ticketDialog', extra: 'full-ticket-modal' },
    'ticket-remove': { view: 'ticketRemoveDialog' },
    'ticket-leave': { view: 'ticketLeaveDialog' },
    'ticket-editor': {
      view: 'ticketEditorDialog',
      extra: 'ticket-editor-modal',
      opened: () => setupTicketEditor(appContext.selectors.getShareContext().tickets[0]),
    },
    zoom: {
      view: 'zoomDialog',
      extra: 'zoom-modal',
      opened(state) {
        state.viewer = new appContext.MedalViewer(
          appContext.dom.modalRoot.querySelector('.medal-stage'),
          state,
        );
      },
    },
    visibility: { view: 'visibilityDialog' },
    publish: { view: 'publishDialog' },
    'post-withdraw': { view: 'withdrawDialog' },
    city: { view: 'cityDialog' },
    guide: { view: 'guideDialog' },
  };
  // Opens the dialog of a kind, on what `subject` names where the kind takes one.
  function openModal(kind, subject) {
    appContext.dialogs.closeModal(false);
    appContext.runtime.lastFocused = document.activeElement;
    const dialog = table[kind],
      shown = appContext.views[dialog.view](subject);
    if (!shown) return;
    const state = (appContext.runtime.modalState = { kind, ...shown.state });
    appContext.dom.modalRoot.innerHTML = `<div class="modal-overlay" data-modal-backdrop><section class="modal ${dialog.extra || ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><h2 id="modal-title">${safe(shown.title)}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon('close')}</button></header>${shown.body}</section></div>`;
    appContext.dom.app.inert = true;
    document.querySelector('.design-rail').inert = true;
    document.body.style.overflow = 'hidden';
    appContext.dom.modalRoot.querySelector(dialog.focus || 'button')?.focus({
      preventScroll: true,
    });
    dialog.opened?.(state);
  }
  function closeModal(restoreFocus = true) {
    const hadModal = !!appContext.runtime.modalState;
    appContext.runtime.modalState?.viewer?.destroy();
    appContext.dom.modalRoot.innerHTML = '';
    appContext.runtime.modalState = null;
    appContext.dom.app.inert = false;
    document.querySelector('.design-rail').inert = false;
    document.body.style.overflow = '';
    if (hadModal && restoreFocus && appContext.runtime.lastFocused?.isConnected)
      appContext.runtime.lastFocused.focus({
        preventScroll: true,
      });
  }
  async function setupTicketEditor(id) {
    const state = appContext.runtime.modalState;
    if (!state || state.kind !== 'ticket-editor') return;
    state.ticketId = id;
    state.editor = null;
    const loading = appContext.dom.modalRoot.querySelector('.ticket-editor-loading'),
      apply = appContext.dom.modalRoot.querySelector('[data-action="editor-apply"]');
    apply.disabled = true;
    loading.hidden = false;
    try {
      const t = appContext.data.tickets[id],
        image =
          t.kind === 'sample'
            ? await appContext.sharing.sampleTicketImage(id)
            : await appContext.images.loadImage(appContext.media.url(id));
      if (appContext.runtime.modalState !== state || state.ticketId !== id) return;
      const old = appContext.dom.modalRoot.querySelector('#ticket-edit-canvas');
      old.replaceWith(old.cloneNode(false));
      const canvas = appContext.dom.modalRoot.querySelector('#ticket-edit-canvas');
      state.editor = new appContext.TicketEditor(canvas, image);
      state.editor.mode = state.mode || 'mask';
      apply.disabled = false;
      loading.hidden = true;
    } catch {
      if (appContext.runtime.modalState === state)
        loading.textContent = '原图暂不可用，请重新导入票根后再分享。';
    }
  }
  return {
    openModal,
    closeModal,
    setupTicketEditor,
  };
}
