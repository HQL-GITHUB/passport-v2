/** Registers listeners once and returns a teardown for development reloads. */
export function bindEvents(appContext) {
  const disposers = [];
  function listen(target, event, handler, capture = false) {
    target.addEventListener(event, handler, capture);
    disposers.push(() => target.removeEventListener(event, handler, capture));
  }
  listen(document, 'click', async (event) => {
    const backdrop = event.target.closest('[data-modal-backdrop]');
    if (backdrop && event.target === backdrop) {
      appContext.dialogs.closeModal();
      return;
    }
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    appContext.navigation.rememberPage();
    const action = button.dataset.action,
      id = button.dataset.id || appContext.ui.selected;
    if (['passport', 'discover', 'venue', 'stamp', 'scan'].includes(action)) {
      // The navigation is on every page; leaving a ticket that is not saved yet asks first.
      if (['passport', 'discover'].includes(action) && appContext.claims.hasUnsavedTicket()) {
        appContext.ui.leaveTo = action;
        appContext.dialogs.openModal('ticket-leave');
        return;
      }
      if (action === 'stamp') {
        appContext.ui.visitDate = button.dataset.visitDate || null;
        appContext.ui.stampReturn = button.dataset.fromVisit || null;
      }
      appContext.navigation.navigate(action, id);
      return;
    }
    if (action === 'confirm-leave') {
      appContext.dialogs.closeModal(false);
      appContext.navigation.navigate(appContext.ui.leaveTo);
      return;
    }
    if (action === 'open-visit') {
      appContext.navigation.openVisit(button.dataset.key);
      return;
    }
    if (action === 'preview-visit') {
      const row =
        appContext.selectors.visitRows().find((v) => appContext.selectors.savedTickets(v).length) ||
        appContext.selectors.visitRows()[0];
      if (row) appContext.navigation.openVisit(row.key);
      else {
        appContext.ui.ticketContext = null;
        appContext.navigation.navigate('ticket', 'museum');
      }
      return;
    }
    if (action === 'preview-album' || action === 'open-album') {
      appContext.ui.collection = 'collected';
      // From a claim the album opens on the page that holds the stamp.
      if (action === 'open-album')
        appContext.ui.stampPage = appContext.views.stampPageOf(appContext.ui.selected);
      appContext.navigation.navigate('passport');
      return;
    }
    if (action === 'add-visit-ticket') {
      const v = appContext.data.visits[appContext.ui.visitKey];
      appContext.claims.clearTicketDraft();
      appContext.ui.ticketContext = {
        ...v,
      };
      appContext.ui.ticketResult = null;
      appContext.navigation.navigate('ticket', v.venueId);
      return;
    }
    if (action === 'view-ticket') {
      appContext.ui.viewingTicket = button.dataset.ticketId;
      appContext.dialogs.openModal('ticket-view');
      return;
    }
    if (action === 'ticket-open-visit') {
      const t = appContext.data.tickets[appContext.ui.viewingTicket];
      appContext.navigation.openVisit(appContext.domain.key(t.venueId, t.visitedAt));
      return;
    }
    if (action === 'remove-ticket-dialog') {
      appContext.ui.viewingTicket = button.dataset.ticketId;
      appContext.dialogs.openModal('ticket-remove');
      return;
    }
    if (action === 'confirm-remove-ticket') {
      const ticketId = appContext.ui.viewingTicket;
      try {
        await appContext.media.remove(ticketId);
        appContext.data.tickets[ticketId].saved = false;
        appContext.storage.persist();
        appContext.dialogs.closeModal(false);
        appContext.render(true);
        appContext.feedback.toast('票根已移除，到访与纪念章仍在');
      } catch {
        appContext.feedback.toast('票根暂未移除，请再试一次');
      }
      return;
    }
    if (action === 'ticket-visit') {
      appContext.navigation.openVisit(appContext.ui.ticketResult.visitKey);
      return;
    }
    if (action === 'visit-share') {
      appContext.ui.includeNote = false;
      appContext.ui.includePhoto = false;
      appContext.ui.includeTicket = false;
      appContext.ui.shareTicket = '';
      appContext.navigation.navigate(
        'visit-share',
        appContext.data.visits[appContext.ui.visitKey].venueId,
      );
      return;
    }
    if (action === 'share-edit-ticket') {
      appContext.dialogs.openModal('ticket-editor');
      return;
    }
    if (action === 'editor-mode' && appContext.runtime.modalState?.editor) {
      appContext.runtime.modalState.mode = button.dataset.value;
      appContext.runtime.modalState.editor.mode = button.dataset.value;
      appContext.dom.modalRoot.querySelectorAll('[data-action="editor-mode"]').forEach((b) => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      return;
    }
    if (action === 'editor-undo') {
      appContext.runtime.modalState?.editor?.undo();
      return;
    }
    if (action === 'editor-reset') {
      appContext.runtime.modalState?.editor?.reset();
      return;
    }
    if (action === 'editor-apply' && appContext.runtime.modalState?.editor) {
      appContext.ui.shareTicket = appContext.runtime.modalState.editor.export();
      appContext.ui.includeTicket = true;
      appContext.dialogs.closeModal(false);
      appContext.render(true);
      return;
    }
    if (action === 'back') {
      appContext.navigation.goBack();
      return;
    }
    if (action === 'preview-home') {
      appContext.ui.collection = 'footprints';
      appContext.navigation.navigate('passport');
      return;
    }
    if (action === 'preview-stamp') {
      appContext.navigation.navigate('stamp', appContext.selectors.collected()[0]?.id || 'museum');
      return;
    }
    if (action === 'preview-scan') {
      appContext.navigation.navigate('scan', 'museum');
      return;
    }
    if (action === 'ticket-entry' || action === 'new-ticket' || action === 'preview-ticket') {
      appContext.claims.clearTicketDraft();
      appContext.ui.ticketContext = null;
      appContext.ui.ticketResult = null;
      appContext.navigation.navigate('ticket', action === 'ticket-entry' ? id : 'museum');
      return;
    }
    if (action === 'ticket-camera') {
      document.getElementById('ticket-camera-input').click();
      return;
    }
    if (action === 'ticket-album') {
      document.getElementById('ticket-album-input').click();
      return;
    }
    if (action === 'recognize-ticket') {
      appContext.claims.recognizeTicket();
      return;
    }
    if (action === 'redeem-ticket') {
      appContext.claims.redeemTicket();
      return;
    }
    if (action === 'view-ticket-record') {
      const d = appContext.ui.ticketDraft,
        t = appContext.data.tickets[d.id];
      appContext.navigation.openVisit(appContext.domain.key(t.venueId, t.visitedAt));
      return;
    }
    if (action === 'ticket-passport') {
      const result = appContext.ui.ticketResult;
      appContext.ui.collection = 'footprints';
      appContext.ui.highlightVisit = `${result.venueId}/${result.visitedAt}`;
      appContext.navigation.navigate('passport', result.venueId);
      requestAnimationFrame(() =>
        appContext.dom.main
          .querySelector(`[data-visit-key="${appContext.ui.highlightVisit}"]`)
          ?.scrollIntoView({
            block: 'center',
          }),
      );
      return;
    }
    if (action === 'select-visit') {
      if (appContext.data.records[appContext.ui.selected]?.visits.includes(button.dataset.value)) {
        appContext.ui.visitDate = button.dataset.value;
        appContext.render(true);
      }
      return;
    }
    if (action === 'toggle-first-use') {
      if (!appContext.ui.firstMode) {
        appContext.runtime.savedExperience = appContext.format.clone(appContext.data);
        appContext.data = {
          version: 3,
          records: {},
          wanted: [],
          tickets: {},
          visits: {},
        };
        appContext.ui.firstMode = true;
        button.childNodes[0].textContent = '返回已有收藏';
      } else {
        appContext.media.clearTemporary();
        appContext.data = appContext.runtime.savedExperience || appContext.storage.readData();
        appContext.runtime.savedExperience = null;
        appContext.ui.firstMode = false;
        button.childNodes[0].textContent = '体验首次使用';
        appContext.media.load(appContext.data.tickets).then(() => appContext.render(true));
      }
      appContext.ui.collection = 'collected';
      appContext.ui.stampPage = appContext.ui.ticketPage = 0;
      appContext.ui.visitKey = null;
      appContext.navigation.navigate('passport');
      return;
    }
    if (action === 'collection') {
      const value = button.dataset.value,
        book = appContext.runtime.pageBook;
      // The album and the tickets are bookmarks in the same book: between them the pages turn.
      // The bookmark of the open section goes back to its first page.
      if (book && appContext.views.inBook(value)) {
        if (value === appContext.ui.collection)
          appContext.ui[value === 'tickets' ? 'ticketPage' : 'stampPage'] = 0;
        book.goTo(appContext.views.bookIndex(value));
        return;
      }
      // The tabs stay on screen while scrolling, so each tab opens where it was last left.
      appContext.ui.collection = value;
      appContext.render();
      appContext.dom.main.scrollTop =
        appContext.runtime.scrollPositions[`passport/${button.dataset.value}`] || 0;
      return;
    }
    if (action === 'toggle-layout') {
      appContext.ui.timeline = !appContext.ui.timeline;
      appContext.render(true);
      return;
    }
    if (action === 'zoom') {
      appContext.dialogs.openModal('zoom', button.dataset.id);
      return;
    }
    if (action === 'guide') {
      appContext.dialogs.openModal('guide');
      return;
    }
    if (action === 'choose-city') {
      appContext.dialogs.openModal('city');
      return;
    }
    if (action === 'set-city') {
      appContext.ui.city = button.dataset.value;
      appContext.dialogs.closeModal(false);
      appContext.render();
      appContext.dom.main.scrollTop = 0;
      return;
    }
    if (action === 'scan-mode') {
      if (button.dataset.value === 'ticket') {
        appContext.navigation.navigate('ticket', appContext.ui.selected);
        return;
      }
      appContext.ui.scanMode = button.dataset.value === 'nfc' ? 'nfc' : 'qr';
      if (appContext.ui.screen !== 'scan') appContext.navigation.navigate('scan');
      else appContext.render(true);
      return;
    }
    if (action === 'collect') {
      appContext.claims.collectStamp();
      return;
    }
    if (action === 'share') {
      appContext.ui.includeNote = false;
      appContext.ui.includePhoto = false;
      appContext.ui.includeTicket = false;
      appContext.ui.shareTicket = '';
      appContext.navigation.navigate('share');
      return;
    }
    if (action === 'edit-memory') {
      appContext.dialogs.openModal('memory');
      return;
    }
    if (action === 'close-modal') {
      appContext.dialogs.closeModal();
      return;
    }
    if (action === 'remove-photo' && appContext.runtime.modalState?.kind === 'memory') {
      appContext.runtime.modalState.draftPhoto = '';
      document.getElementById('photo-draft').innerHTML = '';
      return;
    }
    if (action === 'save-memory' && appContext.runtime.modalState?.kind === 'memory') {
      if (appContext.runtime.modalState.photoBusy) return;
      const v = appContext.data.visits[appContext.runtime.modalState.visitKey];
      v.note = document.getElementById('memory-input').value.slice(0, 120);
      v.photo = appContext.runtime.modalState.draftPhoto;
      const stored = appContext.storage.persist();
      appContext.dialogs.closeModal(false);
      appContext.render(true);
      if (stored) appContext.feedback.toast('这一刻，已好好收藏');
      return;
    }
    if (action === 'want') {
      const wanted = appContext.data.wanted.includes(appContext.ui.selected);
      appContext.data.wanted = wanted
        ? appContext.data.wanted.filter((v) => v !== appContext.ui.selected)
        : [...appContext.data.wanted, appContext.ui.selected];
      appContext.storage.persist();
      button.classList.toggle('saved', !wanted);
      button.setAttribute('aria-pressed', String(!wanted));
      button.setAttribute('aria-label', wanted ? '收藏为想去' : '取消想去收藏');
      appContext.feedback.toast(wanted ? '已从想去中移除' : '已加入想去，留给下一次出发');
      return;
    }
    if (action === 'category') {
      appContext.ui.category = button.dataset.value;
      appContext.render(true);
      return;
    }
    if (action === 'clear-search') {
      appContext.ui.query = '';
      const input = document.getElementById('venue-search');
      input.value = '';
      appContext.discovery.updateSearch();
      input.focus();
      return;
    }
    if (action === 'clear-filters') {
      appContext.ui.query = '';
      appContext.ui.category = 'all';
      appContext.ui.city = '全部城市';
      appContext.render();
      return;
    }
    if (action === 'share-collection') {
      appContext.navigation.navigate(
        appContext.ui.collection === 'collected' ? 'share-album' : 'share-footprints',
      );
      return;
    }
    if (action === 'download-card') {
      if (['share-footprints', 'share-album'].includes(appContext.ui.screen))
        appContext.sharing.downloadJournalCard();
      else appContext.sharing.downloadCard();
      return;
    }
  });
  listen(document, 'input', (event) => {
    if (event.target.id === 'venue-search') {
      appContext.ui.query = event.target.value;
      appContext.discovery.updateSearch();
    }
    if (event.target.id === 'memory-input')
      document.getElementById('note-count').textContent = event.target.value.length;
    if (
      ['ticket-custom-name', 'ticket-custom-city', 'ticket-custom-exhibit'].includes(
        event.target.id,
      ) &&
      appContext.ui.ticketDraft &&
      !appContext.data.tickets[appContext.ui.ticketDraft.id]
    ) {
      const prop = {
        'ticket-custom-name': 'customName',
        'ticket-custom-city': 'customCity',
        'ticket-custom-exhibit': 'customExhibit',
      }[event.target.id];
      appContext.ui.ticketDraft[prop] = event.target.value;
      appContext.claims.updateTicketConfirmation();
    }
  });
  listen(document, 'change', (event) => {
    if (event.target.id === 'photo-input') appContext.memories.preparePhoto(event.target.files[0]);
    if (['ticket-camera-input', 'ticket-album-input'].includes(event.target.id))
      appContext.claims.prepareTicketImage(event.target.files[0]);
    if (event.target.id === 'save-ticket-memory' && appContext.ui.ticketDraft) {
      appContext.ui.ticketDraft.saveTicket = event.target.checked;
      appContext.views.renderFooter();
    }
    if (event.target.id === 'share-ticket-select')
      appContext.dialogs.setupTicketEditor(event.target.value);
    if (
      ['ticket-venue', 'ticket-date'].includes(event.target.id) &&
      appContext.ui.ticketDraft &&
      !appContext.ui.claimBusy
    ) {
      if (appContext.data.tickets[appContext.ui.ticketDraft.id]) return;
      if (event.target.id === 'ticket-venue')
        appContext.ui.ticketDraft.venueId = event.target.value;
      else appContext.ui.ticketDraft.visitedAt = event.target.value;
      appContext.claims.resetTicketSelection();
      if (event.target.id === 'ticket-venue') {
        appContext.ui.ticketError = '';
        appContext.render(true);
      } else appContext.claims.updateTicketConfirmation();
    }
    if (
      event.target.dataset.ticketReward &&
      appContext.ui.ticketDraft &&
      !appContext.ui.claimBusy
    ) {
      const id = event.target.dataset.ticketReward;
      if (
        !appContext.selectors.ticketRewards(appContext.ui.ticketDraft).some((v) => v.id === id) ||
        appContext.data.tickets[appContext.ui.ticketDraft.id]?.redeemed.includes(id)
      )
        return;
      appContext.ui.ticketDraft.selected = event.target.checked
        ? [...new Set([...appContext.ui.ticketDraft.selected, id])]
        : appContext.ui.ticketDraft.selected.filter((value) => value !== id);
      appContext.views.renderFooter();
    }
    if (event.target.dataset.option) {
      if (event.target.dataset.option === 'ticket') {
        if (event.target.checked) {
          event.target.checked = appContext.ui.includeTicket;
          appContext.dialogs.openModal('ticket-editor');
        } else {
          appContext.ui.includeTicket = false;
          appContext.ui.shareTicket = '';
          appContext.render(true);
        }
        return;
      }
      appContext.ui[event.target.dataset.option === 'note' ? 'includeNote' : 'includePhoto'] =
        event.target.checked;
      document.getElementById('share-card-preview').innerHTML = appContext.views.sharePaper();
    }
  });
  listen(document, 'keydown', (event) => {
    if (!appContext.runtime.modalState) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      appContext.dialogs.closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = [
      ...appContext.dom.modalRoot.querySelectorAll(
        'button:not([disabled]),textarea,input:not([type="file"])',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  // A photograph fades in once it has arrived. `load` does not bubble, so it is caught on its
  // way down.
  listen(
    document,
    'load',
    (event) => {
      if (!event.target.matches?.('img[data-fade]')) return;
      appContext.runtime.shownImages.add(event.target.getAttribute('src'));
      event.target.classList.add('shown');
    },
    true,
  );
  listen(window, 'popstate', appContext.navigation.restorePage);
  return () => disposers.reverse().forEach((dispose) => dispose());
}
