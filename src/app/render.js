/** Application module. Dependencies are provided by createApp(). */
export function createRenderer(appContext) {
  function render(keepScroll = false) {
    const pos = appContext.dom.main.scrollTop;
    appContext.views.renderHeader();
    // A ceremony does not outlive the page it plays on.
    appContext.ceremony.finish();
    appContext.runtime.pageMedal?.destroy();
    appContext.runtime.pageCarousel?.destroy();
    appContext.dom.main.innerHTML = appContext.screens.draw();
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
    document.title = `${appContext.screens.title()} · 旅行护照`;
    if (keepScroll) appContext.dom.main.scrollTop = pos;
  }
  return {
    render,
  };
}
