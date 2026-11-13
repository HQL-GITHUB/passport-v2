/** What the buttons of claiming do: on site, and with a ticket. */
export function createClaimActions(appContext) {
  return {
    'scan-mode'(button) {
      if (button.dataset.value === 'ticket') {
        appContext.navigation.navigate('ticket', appContext.ui.selected);
        return;
      }
      appContext.ui.scanMode = button.dataset.value === 'nfc' ? 'nfc' : 'qr';
      if (appContext.ui.screen !== 'scan') appContext.navigation.navigate('scan');
      else appContext.render(true);
    },
    collect: () => appContext.claims.collectStamp(),
    // A ticket of its own, for the venue the button names.
    'ticket-entry'(button, id) {
      appContext.claims.clearTicketDraft();
      appContext.ui.ticketContext = null;
      appContext.ui.ticketResult = null;
      appContext.navigation.navigate('ticket', id);
    },
    // Another ticket for the visit that is open.
    'add-visit-ticket'() {
      const v = appContext.data.visits[appContext.ui.visitKey];
      appContext.claims.clearTicketDraft();
      appContext.ui.ticketContext = { ...v };
      appContext.ui.ticketResult = null;
      appContext.navigation.navigate('ticket', v.venueId);
    },
    'ticket-camera': () => document.getElementById('ticket-camera-input').click(),
    'ticket-album': () => document.getElementById('ticket-album-input').click(),
    'recognize-ticket': () => appContext.claims.recognizeTicket(),
    'redeem-ticket': () => appContext.claims.redeemTicket(),
    'view-ticket-record'() {
      const t = appContext.data.tickets[appContext.ui.ticketDraft.id];
      appContext.navigation.openVisit(appContext.domain.key(t.venueId, t.visitedAt));
    },
    'ticket-visit': () => appContext.navigation.openVisit(appContext.ui.ticketResult.visitKey),
    'ticket-passport'() {
      const result = appContext.ui.ticketResult;
      appContext.ui.collection = 'footprints';
      appContext.ui.highlightVisit = result.visitKey;
      appContext.navigation.navigate('passport', result.venueId);
      requestAnimationFrame(() =>
        appContext.dom.main
          .querySelector(`[data-visit-key="${appContext.ui.highlightVisit}"]`)
          ?.scrollIntoView({
            block: 'center',
          }),
      );
    },
    'view-ticket'(button) {
      appContext.ui.viewingTicket = button.dataset.ticketId;
      appContext.dialogs.openModal('ticket-view');
    },
    'ticket-open-visit'() {
      const t = appContext.data.tickets[appContext.ui.viewingTicket];
      appContext.navigation.openVisit(appContext.domain.key(t.venueId, t.visitedAt));
    },
    'remove-ticket-dialog'(button) {
      appContext.ui.viewingTicket = button.dataset.ticketId;
      appContext.dialogs.openModal('ticket-remove');
    },
    async 'confirm-remove-ticket'() {
      if (!(await appContext.claims.removeTicket(appContext.ui.viewingTicket))) {
        appContext.feedback.toast('票根暂未移除，请再试一次');
        return;
      }
      appContext.dialogs.closeModal(false);
      appContext.render(true);
      appContext.feedback.toast('票根已移除，到访与纪念章仍在');
    },
  };
}

/** What the fields of a ticket do as they change. */
export function createClaimFields(appContext) {
  // The ticket being entered, for as long as it can still be changed: one that is already in
  // the passport cannot.
  function draft() {
    const d = appContext.ui.ticketDraft;
    return d && !appContext.data.tickets[d.id] ? d : null;
  }
  return {
    'ticket-image': (input) => appContext.claims.prepareTicketImage(input.files[0]),
    'ticket-venue'(select) {
      if (!draft() || appContext.ui.claimBusy) return;
      draft().venueId = select.value;
      appContext.claims.resetTicketSelection();
      appContext.ui.ticketError = '';
      appContext.render(true);
    },
    'ticket-date'(input) {
      if (!draft() || appContext.ui.claimBusy) return;
      draft().visitedAt = input.value;
      appContext.claims.resetTicketSelection();
      appContext.claims.updateTicketConfirmation();
    },
    // A venue of the visitor's own: its name, city and exhibition, each in the field of the
    // ticket that `data-value` names.
    'ticket-custom'(input) {
      if (!draft()) return;
      draft()[input.dataset.value] = input.value;
      appContext.claims.updateTicketConfirmation();
    },
    'ticket-save'(input) {
      if (!appContext.ui.ticketDraft) return;
      appContext.ui.ticketDraft.saveTicket = input.checked;
      appContext.views.renderFooter();
    },
    'ticket-reward'(input) {
      const d = appContext.ui.ticketDraft,
        id = input.dataset.ticketReward;
      if (!d || appContext.ui.claimBusy) return;
      if (
        !appContext.selectors.ticketRewards(d).some((v) => v.id === id) ||
        appContext.data.tickets[d.id]?.redeemed.includes(id)
      )
        return;
      d.selected = input.checked
        ? [...new Set([...d.selected, id])]
        : d.selected.filter((value) => value !== id);
      appContext.views.renderFooter();
    },
  };
}
