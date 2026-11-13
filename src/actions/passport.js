/** What the buttons of the passport, a stamp and a visit do. */
export function createPassportActions(appContext) {
  return {
    collection(button) {
      const value = button.dataset.value,
        book = appContext.runtime.pageBook;
      // The album and the tickets are bookmarks in the same book: between them the pages turn.
      // The bookmark of the open section goes back to its first page.
      if (book && appContext.selectors.inBook(value)) {
        if (value === appContext.ui.collection)
          appContext.ui[value === 'tickets' ? 'ticketPage' : 'stampPage'] = 0;
        book.goTo(appContext.selectors.bookIndex(value));
        return;
      }
      // The tabs stay on screen while scrolling, so each tab opens where it was last left.
      appContext.ui.collection = value;
      appContext.render();
      appContext.dom.main.scrollTop = appContext.navigation.savedScroll();
    },
    // From a claim the album opens on the page that holds the stamp.
    'open-album'() {
      appContext.ui.collection = 'collected';
      appContext.ui.stampPage = appContext.selectors.stampPageOf(appContext.ui.selected);
      appContext.navigation.navigate('passport');
    },
    'share-collection'() {
      appContext.navigation.navigate(
        appContext.ui.collection === 'collected' ? 'share-album' : 'share-footprints',
      );
    },
    'select-visit'(button) {
      if (appContext.data.records[appContext.ui.selected]?.visits.includes(button.dataset.value)) {
        appContext.ui.visitDate = button.dataset.value;
        appContext.render(true);
      }
    },
    zoom: (button) => appContext.dialogs.openModal('zoom', button.dataset.id),
    'edit-memory': () => appContext.dialogs.openModal('memory'),
    'remove-photo'() {
      if (appContext.runtime.modalState?.kind !== 'memory') return;
      appContext.runtime.modalState.draftPhoto = '';
      document.getElementById('photo-draft').innerHTML = '';
    },
    'save-memory': () => appContext.memories.saveMemory(),
  };
}

/** What the fields of a visit's memory do as they change. */
export function createPassportFields(appContext) {
  return {
    'memory-note'(input) {
      document.getElementById('note-count').textContent = input.value.length;
    },
    'memory-photo': (input) => appContext.memories.preparePhoto(input.files[0]),
  };
}
