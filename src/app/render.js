/** Application module. Dependencies are provided by createApp(). */
export function createRenderer(appContext) {
  function render(keepScroll = false) {
    const pos = appContext.dom.main.scrollTop,
      views = {
        passport: appContext.views.renderPassport,
        discover: appContext.views.renderDiscover,
        venue: appContext.views.renderVenue,
        stamp: appContext.views.renderStamp,
        scan: appContext.views.renderScan,
        success: appContext.views.renderSuccess,
        share: appContext.views.renderShare,
        ticket: appContext.views.renderTicket,
        'ticket-confirm': appContext.views.renderTicketConfirm,
        'ticket-success': appContext.views.renderTicketSuccess,
        visit: appContext.views.renderVisit,
        'visit-share': appContext.views.renderShare,
        'share-footprints': appContext.views.renderJournalShare,
        'share-album': appContext.views.renderJournalShare,
      };
    appContext.views.renderHeader();
    appContext.runtime.pageMedal?.destroy();
    appContext.dom.main.innerHTML = views[appContext.ui.screen]();
    const stage = appContext.dom.main.querySelector('.medal-stage');
    appContext.runtime.pageMedal = stage
      ? new appContext.MedalViewer(stage, {
          canFlip: stage.dataset.flip === 'true',
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          intro: false,
          // The claim ceremony owns the stamp until it settles.
          locked: () => !!stage.closest('.ceremony:not(.settled)'),
        })
      : null;
    appContext.views.renderFooter();
    appContext.dom.app.dataset.screen = appContext.ui.screen;
    document.title = `${
      ['visit', 'visit-share'].includes(appContext.ui.screen)
        ? appContext.data.visits[appContext.ui.visitKey].name
        : {
            passport: '我的旅行护照',
            discover: '发现下一站',
            stamp: appContext.catalog.byId(appContext.ui.selected).stamp,
            venue: appContext.catalog.byId(appContext.ui.selected).name,
            scan: '为旅程盖章',
            success: '旅程已收藏',
            share: '旅行卡预览',
            ticket: '票根入册',
            'ticket-confirm': '确认这次到访',
            'ticket-success': '旅程已收藏',
            'share-footprints': '足迹分享预览',
            'share-album': '章册分享预览',
          }[appContext.ui.screen]
    } · 旅行护照`;
    if (keepScroll) appContext.dom.main.scrollTop = pos;
  }
  return {
    render,
  };
}
