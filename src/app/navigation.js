/** Application module. Dependencies are provided by createApp(). */
export function createNavigation(appContext) {
  function routeFromLocation() {
    let parts = [];
    try {
      parts = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    } catch {}
    appContext.ui.screen = appContext.config.screens.includes(parts[0]) ? parts[0] : 'passport';
    appContext.ui.selected = appContext.catalog.stamps.some((s) => s.id === parts[1])
      ? parts[1]
      : 'museum';
    if (['visit', 'visit-share', 'ticket-success'].includes(appContext.ui.screen) && parts[2]) {
      const key = appContext.domain.key(parts[1], parts[2]);
      if (appContext.data.visits[key]) {
        appContext.ui.visitKey = key;
        appContext.ui.selected = parts[1];
        appContext.ui.visitDate = parts[2];
        if (appContext.ui.screen === 'ticket-success' && !appContext.ui.ticketResult)
          appContext.ui.screen = 'visit';
      } else appContext.ui.screen = 'passport';
    }
    if (appContext.ui.screen === 'share' && !appContext.data.records[appContext.ui.selected])
      appContext.ui.screen = 'stamp';
    if (appContext.ui.screen === 'success' && !appContext.data.records[appContext.ui.selected])
      appContext.ui.screen = 'scan';
    if (appContext.ui.screen === 'ticket-confirm' && !appContext.ui.ticketDraft)
      appContext.ui.screen = 'ticket';
    if (appContext.ui.screen === 'ticket-success' && !appContext.ui.ticketResult)
      appContext.ui.screen = 'passport';
    if (
      ['visit', 'visit-share'].includes(appContext.ui.screen) &&
      !appContext.data.visits[appContext.ui.visitKey]
    )
      appContext.ui.screen = 'passport';
  }
  function navigate(screen, id = appContext.ui.selected, replace = false) {
    if (!appContext.config.screens.includes(screen)) return;
    appContext.runtime.scrollPositions[
      `${appContext.ui.screen}/${appContext.ui.selected}/${appContext.ui.visitKey || ''}`
    ] = appContext.dom.main.scrollTop;
    appContext.runtime.claimToken++;
    appContext.runtime.ticketToken++;
    appContext.ui.ticketBusy = false;
    appContext.ui.claimBusy = false;
    appContext.dialogs.closeModal(false);
    if (!['ticket', 'ticket-confirm', 'ticket-success', 'scan'].includes(screen))
      appContext.claims.clearTicketDraft();
    appContext.ui.screen = screen;
    const memoryScreen = ['visit', 'visit-share', 'ticket-success'].includes(screen);
    appContext.ui.selected = memoryScreen
      ? id
      : ['venue', 'scan', 'ticket'].includes(screen)
        ? appContext.catalog.venueOf(appContext.catalog.byId(id)).id
        : appContext.catalog.byId(id).id;
    const day = memoryScreen
      ? screen === 'ticket-success'
        ? appContext.ui.ticketResult?.visitedAt
        : appContext.data.visits[appContext.ui.visitKey]?.day
      : null;
    const hash = `#/${screen}/${appContext.ui.selected}${day ? '/' + day : ''}`;
    history[replace ? 'replaceState' : 'pushState'](
      {
        screen,
        id: appContext.ui.selected,
      },
      '',
      hash,
    );
    appContext.render();
    appContext.dom.main.scrollTop =
      appContext.runtime.scrollPositions[
        `${screen}/${appContext.ui.selected}/${appContext.ui.visitKey || ''}`
      ] || 0;
    appContext.dom.main.focus({
      preventScroll: true,
    });
  }
  function goBack() {
    if (appContext.ui.screen === 'visit-share') {
      appContext.navigation.navigate(
        'visit',
        appContext.data.visits[appContext.ui.visitKey].venueId,
      );
      return;
    }
    if (appContext.ui.screen === 'share') {
      appContext.navigation.navigate('stamp');
      return;
    }
    if (
      appContext.ui.screen === 'stamp' &&
      appContext.ui.stampReturn &&
      appContext.data.visits[appContext.ui.stampReturn]
    ) {
      appContext.navigation.openVisit(appContext.ui.stampReturn);
      return;
    }
    if (appContext.ui.screen === 'ticket-confirm') {
      appContext.navigation.navigate(
        'ticket',
        appContext.ui.ticketDraft?.venueId || appContext.ui.selected,
      );
      return;
    }
    if (appContext.ui.screen === 'scan') {
      appContext.navigation.navigate('venue');
      return;
    }
    appContext.navigation.navigate('passport');
  }
  function openVisit(key) {
    const v = appContext.data.visits[key];
    if (!v) {
      appContext.feedback.toast('这次到访暂时没有记录');
      return;
    }
    appContext.ui.visitKey = key;
    appContext.ui.visitDate = v.day;
    appContext.navigation.navigate('visit', v.venueId);
  }
  return {
    routeFromLocation,
    navigate,
    goBack,
    openVisit,
  };
}
