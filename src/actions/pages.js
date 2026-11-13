/** What the navigation and the links between pages do. Each action is named by `data-action`. */
export function createPageActions(appContext) {
  // The navigation is on every page; leaving a ticket that is not saved yet asks first.
  const tab = (screen) => (button, id) => {
    if (appContext.claims.hasUnsavedTicket()) {
      appContext.ui.leaveTo = screen;
      appContext.dialogs.openModal('ticket-leave');
      return;
    }
    appContext.navigation.navigate(screen, id);
  };
  return {
    passport: tab('passport'),
    discover: tab('discover'),
    square: tab('square'),
    collectors: tab('collectors'),
    venue: (button, id) => appContext.navigation.navigate('venue', id),
    scan: (button, id) => appContext.navigation.navigate('scan', id),
    stamp(button, id) {
      appContext.ui.visitDate = button.dataset.visitDate || null;
      appContext.ui.stampReturn = button.dataset.fromVisit || null;
      appContext.navigation.navigate('stamp', id);
    },
    'confirm-leave'() {
      appContext.dialogs.closeModal(false);
      appContext.navigation.navigate(appContext.ui.leaveTo);
    },
    back: () => appContext.navigation.goBack(),
    'open-visit': (button) => appContext.navigation.openVisit(button.dataset.key),
    'close-modal': () => appContext.dialogs.closeModal(),
  };
}
