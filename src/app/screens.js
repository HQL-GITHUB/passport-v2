/**
 * The pages of the app, by the name their address begins with. A row says everything that sets
 * its page apart from the others:
 *
 * - `view`, the function that draws it, and `actions`, the one that draws its buttons into the
 *   `#page-actions` slot the view leaves for them. Both are named among `appContext.views`.
 * - `about`, which is the id its address carries: a venue, a stamp, a visit addressed by its
 *   venue and day, a person or a post. The others carry along the last venue or stamp.
 * - `root`, for a page of the navigation: its header shows the brand, and no way back.
 * - `caption`, of the header that is a way back, and `title`, of the browser's tab, which is the
 *   caption unless the page has one of its own. Either may be a function of what is open.
 *   `tools` names the view of the buttons at the header's end.
 * - `parent`, where the way back leads when the page was opened directly and has nothing behind
 *   it: the name of a page, or a function that goes there. Without one it is the passport.
 * - `guard`, which answers the page to show in its place when what it shows is not there.
 * - `place`, which answers what else of a page's state, besides its subject, a scroll position
 *   belongs to.
 * - `claiming`, for the pages of a claim under way, and `keepsDraft`, for those that keep the
 *   ticket being entered.
 *
 * Dependencies are provided by createApp().
 */
export function createScreens(appContext) {
  const visit = () => appContext.data.visits[appContext.ui.visitKey],
    visitName = () => visit().name,
    visitGone = () => !visit() && 'passport',
    to = (screen, id) => appContext.navigation.navigate(screen, id, true),
    // An overview is shared from a tab of the passport, and returns to it.
    toTab = (collection) => () => {
      appContext.ui.collection = collection;
      to('passport');
    };
  const table = {
    passport: {
      view: 'renderPassport',
      root: true,
      title: '我的旅行护照',
      tools: 'passportTools',
      place: (page) => [page.collection],
    },
    discover: {
      view: 'renderDiscover',
      root: true,
      title: '发现下一站',
      tools: 'discoverTools',
      place: (page) => [page.city, page.category, page.query, page.discoverView],
    },
    venue: {
      view: 'renderVenue',
      actions: 'venueActions',
      about: 'venue',
      caption: '文化目的地',
      title: () => appContext.selectors.venue()?.name,
      parent: 'discover',
    },
    stamp: {
      view: 'renderStamp',
      actions: 'stampActions',
      about: 'stamp',
      caption: () => (appContext.data.records[appContext.ui.selected] ? '我的纪念章' : '纪念章'),
      title: () => appContext.selectors.stamp()?.title,
      // Opened from a visit, a stamp returns to it.
      parent: () =>
        appContext.data.visits[appContext.ui.stampReturn]
          ? appContext.navigation.openVisit(appContext.ui.stampReturn, true)
          : to('passport'),
      // The stamp is looked at for one of the days it was collected on.
      place: (page) => [page.visitDate || ''],
    },
    // A ticket being entered is kept for as long as one of the pages of claiming is open.
    scan: {
      view: 'renderScan',
      actions: 'scanActions',
      about: 'venue',
      caption: '为旅程盖章',
      parent: 'venue',
      claiming: true,
      keepsDraft: true,
    },
    success: {
      view: 'renderSuccess',
      actions: 'successActions',
      about: 'stamp',
      caption: '这一站，已收藏',
      title: '旅程已收藏',
      // A stamp that was not collected is still to claim, at its venue.
      guard() {
        if (appContext.data.records[appContext.ui.selected]) return;
        appContext.ui.selected = appContext.catalog.stamp(appContext.ui.selected).venueId;
        return 'scan';
      },
    },
    share: {
      view: 'renderShare',
      actions: 'shareActions',
      about: 'stamp',
      caption: '旅行卡预览',
      parent: 'stamp',
      guard: () => !appContext.data.records[appContext.ui.selected] && 'stamp',
    },
    ticket: {
      view: 'renderTicket',
      actions: 'ticketActions',
      about: 'venue',
      caption: '票根入册',
      claiming: true,
      keepsDraft: true,
    },
    'ticket-confirm': {
      view: 'renderTicketConfirm',
      actions: 'ticketConfirmActions',
      caption: '确认这次到访',
      parent: () => to('ticket', appContext.ui.ticketDraft?.venueId || appContext.ui.selected),
      guard: () => !appContext.ui.ticketDraft && 'ticket',
      claiming: true,
      keepsDraft: true,
    },
    'ticket-success': {
      view: 'renderTicketSuccess',
      actions: 'ticketSuccessActions',
      about: 'visit',
      caption: '旅程已收藏',
      // What the ticket was redeemed for is told once; afterwards the visit itself is shown.
      guard: () => (!visit() ? 'passport' : !appContext.ui.ticketResult && 'visit'),
      keepsDraft: true,
    },
    visit: {
      view: 'renderVisit',
      actions: 'visitActions',
      about: 'visit',
      caption: '这次到访的记忆',
      title: visitName,
      guard: visitGone,
    },
    'visit-share': {
      view: 'renderShare',
      actions: 'shareActions',
      about: 'visit',
      caption: '到访分享预览',
      title: visitName,
      parent: () => to('visit', visit().venueId),
      guard: visitGone,
    },
    'share-footprints': {
      view: 'renderJournalShare',
      actions: 'journalShareActions',
      caption: '足迹分享预览',
      parent: toTab('footprints'),
      guard: () => !Object.keys(appContext.data.visits).length && 'passport',
    },
    'share-album': {
      view: 'renderJournalShare',
      actions: 'journalShareActions',
      caption: '章册分享预览',
      parent: toTab('collected'),
      guard: () => !Object.keys(appContext.data.records).length && 'passport',
    },
    collectors: {
      view: 'renderCollectors',
      root: true,
      title: '收藏家',
      tools: 'collectorsTools',
      place: (page) => [page.board],
    },
    collector: {
      view: 'renderCollector',
      about: 'person',
      caption: () => (appContext.ui.person === 'me' ? '我的公开护照' : '收藏家的护照'),
      title: () => `${appContext.selectors.person(appContext.ui.person)?.name}的护照`,
      tools: 'collectorTools',
      parent: 'collectors',
      guard: () => !appContext.selectors.person(appContext.ui.person) && 'collectors',
      place: (page) => [page.collectorTab],
    },
    square: { view: 'renderSquare', root: true, title: '广场', tools: 'squareTools' },
    post: {
      view: 'renderPost',
      about: 'post',
      caption: '广场',
      title: '广场上的到访',
      parent: 'square',
      guard: () =>
        !appContext.selectors.posts().some((p) => p.id === appContext.ui.post) && 'square',
    },
  };
  const say = (text) => (typeof text === 'function' ? text() : text),
    current = () => table[appContext.ui.screen],
    // What a view named by the page in view draws, or nothing where the page names none.
    draw = (name) => (name ? appContext.views[name]() : '');
  return {
    known: (screen) => Object.hasOwn(table, screen),
    about: (screen = appContext.ui.screen) => table[screen]?.about,
    root: (screen = appContext.ui.screen) => !!table[screen]?.root,
    keepsDraft: (screen) => !!table[screen]?.keepsDraft,
    place: (page) => table[page.screen].place?.(page) || [],
    // The page in view: its content, its own buttons, the caption and the buttons of its header
    // and the title of its tab.
    draw: () => draw(current().view),
    actions: () => draw(current().actions),
    tools: () => draw(current().tools),
    caption: () => say(current().caption),
    title: () => say(current().title ?? current().caption),
    claiming: () => !!current().claiming,
    parent: () => current().parent ?? 'passport',
    // Where what the page in view shows is not there, the page that takes its place does.
    settle() {
      for (let next; (next = current().guard?.());) appContext.ui.screen = next;
    },
  };
}
