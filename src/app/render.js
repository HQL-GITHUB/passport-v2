/** Application module. Dependencies are provided by createApp(). */
export function createRenderer(appContext) {
  const animate = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // What a page may hold that has to be set up once the page is drawn, and taken down before
  // the next one is: each under the name it is kept by in `appContext.runtime`. `on` is the
  // element it is set up on, wherever a page has one, and `make` sets it up; it is also told
  // whether the page before held one too.
  const parts = {
    pageMedal: {
      on: '.medal-stage',
      make: (stage) =>
        new appContext.MedalViewer(stage, {
          canFlip: stage.dataset.flip === 'true',
          animate: animate(),
          intro: false,
          // On the stamp page the medal is a button: a tap opens the viewer instead of turning it over.
          tapFlips: !stage.closest('button'),
          // The claim ceremony owns the stamp until it settles.
          locked: () => !!stage.closest('.ceremony:not(.settled)'),
        }),
    },
    pageCarousel: {
      on: '.discover-hero',
      make(hero) {
        const slideIds = [...hero.querySelectorAll('.hero-slide')].map((el) => el.dataset.id);
        return new appContext.Carousel(hero, {
          animate: animate(),
          // Back from a venue, the row is where it was left.
          start: Math.max(0, slideIds.indexOf(appContext.runtime.heroVenue)),
          enabled: () => !appContext.runtime.modalState,
          onChange: (n) => (appContext.runtime.heroVenue = slideIds[n]),
        });
      },
    },
    pageBook: {
      on: '.passport-book',
      make(book, held) {
        const made = new appContext.PageBook(book, {
          animate: animate(),
          // Moving between the album and the tickets turns pages without rendering; any other
          // way in finds the passport closed, and its cover opens.
          cover: !held,
          // The first time the book is opened, its page lifts to show that it turns.
          intro: !appContext.runtime.bookShown,
          enabled: () => !appContext.runtime.modalState,
          onTurn: appContext.views.bookTurned,
        });
        appContext.runtime.bookShown = true;
        return made;
      },
    },
  };
  // Takes down what the page in view holds, and answers with the names of what it held.
  function clearPage() {
    const held = Object.keys(parts).filter((name) => appContext.runtime[name]);
    for (const name of held) {
      appContext.runtime[name].destroy();
      appContext.runtime[name] = null;
    }
    return held;
  }
  function render(keepScroll = false) {
    const pos = appContext.dom.main.scrollTop;
    appContext.views.renderHeader();
    // A ceremony does not outlive the page it plays on.
    appContext.ceremony.finish();
    const held = clearPage();
    appContext.dom.main.innerHTML = appContext.screens.draw();
    for (const [name, part] of Object.entries(parts)) {
      const el = appContext.dom.main.querySelector(part.on);
      appContext.runtime[name] = el ? part.make(el, held.includes(name)) : null;
    }
    appContext.views.renderFooter();
    appContext.dom.app.dataset.screen = appContext.ui.screen;
    document.title = `${appContext.screens.title()} · 旅行护照`;
    if (keepScroll) appContext.dom.main.scrollTop = pos;
  }
  return {
    render,
    clearPage,
  };
}
