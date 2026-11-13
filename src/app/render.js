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
        square: appContext.views.renderSquare,
        post: appContext.views.renderPost,
        collectors: appContext.views.renderCollectors,
        collector: appContext.views.renderCollector,
      };
    appContext.views.renderHeader();
    // A ceremony does not outlive the page it plays on.
    appContext.ceremony.finish();
    appContext.runtime.pageMedal?.destroy();
    appContext.runtime.pageCarousel?.destroy();
    appContext.dom.main.innerHTML = views[appContext.ui.screen]();
    const stage = appContext.dom.main.querySelector('.medal-stage');
    appContext.runtime.pageMedal = stage
      ? new appContext.MedalViewer(stage, {
          canFlip: stage.dataset.flip === 'true',
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          intro: false,
          // On the stamp page the medal is a button: a tap opens the viewer instead of turning it over.
          tapFlips: !stage.closest('button'),
          // The claim ceremony owns the stamp until it settles.
          locked: () => !!stage.closest('.ceremony:not(.settled)'),
        })
      : null;
    const hero = appContext.dom.main.querySelector('.discover-hero'),
      slideIds = [...(hero?.querySelectorAll('.hero-slide') || [])].map((el) => el.dataset.id);
    appContext.runtime.pageCarousel = hero
      ? new appContext.Carousel(hero, {
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          // Back from a venue, the row is where it was left.
          start: Math.max(0, slideIds.indexOf(appContext.runtime.heroVenue)),
          enabled: () => !appContext.runtime.modalState,
          onChange: (n) => (appContext.runtime.heroVenue = slideIds[n]),
        })
      : null;
    const book = appContext.dom.main.querySelector('.passport-book'),
      still = matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Moving between the album and the tickets turns pages without rendering; any other way
      // in finds the passport closed, and its cover opens.
      closed = !appContext.runtime.pageBook;
    appContext.runtime.pageBook?.destroy();
    appContext.runtime.pageBook = book
      ? new appContext.PageBook(book, {
          animate: !still,
          cover: closed,
          // The first time the book is opened, its page lifts to show that it turns.
          intro: !appContext.runtime.bookShown,
          enabled: () => !appContext.runtime.modalState,
          onTurn: appContext.views.bookTurned,
        })
      : null;
    appContext.runtime.bookShown ||= !!book;
    appContext.views.renderFooter();
    appContext.dom.app.dataset.screen = appContext.ui.screen;
    document.title = `${
      ['visit', 'visit-share'].includes(appContext.ui.screen)
        ? appContext.data.visits[appContext.ui.visitKey].name
        : {
            passport: '我的旅行护照',
            discover: '发现下一站',
            stamp: appContext.selectors.stamp()?.title,
            venue: appContext.selectors.venue()?.name,
            scan: '为旅程盖章',
            success: '旅程已收藏',
            share: '旅行卡预览',
            ticket: '票根入册',
            'ticket-confirm': '确认这次到访',
            'ticket-success': '旅程已收藏',
            'share-footprints': '足迹分享预览',
            'share-album': '章册分享预览',
            square: '广场',
            post: '广场上的到访',
            collectors: '收藏家',
            collector: `${appContext.selectors.person(appContext.ui.person)?.name}的护照`,
          }[appContext.ui.screen]
    } · 旅行护照`;
    if (keepScroll) appContext.dom.main.scrollTop = pos;
  }
  return {
    render,
  };
}
