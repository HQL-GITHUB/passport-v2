/** What the buttons of the travel cards do. */
export function createSharingActions(appContext) {
  // A card opens with nothing private on it: the note, the photograph and the ticket are added
  // by ticking them.
  function openCard(screen, id) {
    appContext.ui.includeNote = false;
    appContext.ui.includePhoto = false;
    appContext.ui.includeTicket = false;
    appContext.ui.shareTicket = '';
    appContext.navigation.navigate(screen, id);
  }
  return {
    share: () => openCard('share'),
    'visit-share': () =>
      openCard('visit-share', appContext.data.visits[appContext.ui.visitKey].venueId),
    // From the square: the visit is chosen first, and published from its card.
    'publish-visit'(button) {
      const v = appContext.data.visits[button.dataset.key];
      if (!v) return;
      appContext.ui.visitKey = v.key;
      openCard('visit-share', v.venueId);
    },
    'share-edit-ticket': () => appContext.dialogs.openModal('ticket-editor'),
    'editor-mode'(button) {
      const state = appContext.runtime.modalState;
      if (!state?.editor) return;
      state.mode = button.dataset.value;
      state.editor.mode = button.dataset.value;
      appContext.dom.modalRoot.querySelectorAll('[data-action="editor-mode"]').forEach((b) => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    },
    'editor-undo': () => appContext.runtime.modalState?.editor?.undo(),
    'editor-reset': () => appContext.runtime.modalState?.editor?.reset(),
    'editor-apply'() {
      if (!appContext.runtime.modalState?.editor) return;
      appContext.ui.shareTicket = appContext.runtime.modalState.editor.export();
      appContext.ui.includeTicket = true;
      appContext.dialogs.closeModal(false);
      appContext.render(true);
    },
    'download-card'() {
      if (['share-footprints', 'share-album'].includes(appContext.ui.screen))
        appContext.sharing.downloadJournalCard();
      else appContext.sharing.downloadCard();
    },
  };
}
