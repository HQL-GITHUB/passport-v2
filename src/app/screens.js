/**
 * The pages of the app, by the name their address begins with. For each: the view that draws it;
 * what it is about, which is the id its address carries (a venue, a stamp, or a visit addressed
 * by its venue and day; the others carry along the last of these); the caption of its header,
 * where the header is a way back and not the brand; and the title of the browser's tab, which is
 * the caption unless the page has one of its own. A caption or a title that depends on what is
 * open is a function. Dependencies are provided by createApp().
 */
export function createScreens(appContext) {
  const visitName = () => appContext.data.visits[appContext.ui.visitKey].name;
  const table = {
    passport: { view: 'renderPassport', title: '我的旅行护照' },
    discover: { view: 'renderDiscover', title: '发现下一站' },
    venue: {
      view: 'renderVenue',
      about: 'venue',
      caption: '文化目的地',
      title: () => appContext.selectors.venue()?.name,
    },
    stamp: {
      view: 'renderStamp',
      about: 'stamp',
      caption: () => (appContext.data.records[appContext.ui.selected] ? '我的纪念章' : '纪念章'),
      title: () => appContext.selectors.stamp()?.title,
    },
    // A ticket being entered is kept for as long as one of the pages of claiming is open.
    scan: { view: 'renderScan', about: 'venue', caption: '为旅程盖章', keepsDraft: true },
    success: {
      view: 'renderSuccess',
      about: 'stamp',
      caption: '这一站，已收藏',
      title: '旅程已收藏',
    },
    share: { view: 'renderShare', about: 'stamp', caption: '旅行卡预览' },
    ticket: { view: 'renderTicket', about: 'venue', caption: '票根入册', keepsDraft: true },
    'ticket-confirm': { view: 'renderTicketConfirm', caption: '确认这次到访', keepsDraft: true },
    'ticket-success': {
      view: 'renderTicketSuccess',
      about: 'visit',
      caption: '旅程已收藏',
      keepsDraft: true,
    },
    visit: { view: 'renderVisit', about: 'visit', caption: '这次到访的记忆', title: visitName },
    'visit-share': {
      view: 'renderShare',
      about: 'visit',
      caption: '到访分享预览',
      title: visitName,
    },
    'share-footprints': { view: 'renderJournalShare', caption: '足迹分享预览' },
    'share-album': { view: 'renderJournalShare', caption: '章册分享预览' },
    collectors: { view: 'renderCollectors', title: '收藏家' },
    collector: {
      view: 'renderCollector',
      caption: () => (appContext.ui.person === 'me' ? '我的公开护照' : '收藏家的护照'),
      title: () => `${appContext.selectors.person(appContext.ui.person)?.name}的护照`,
    },
    square: { view: 'renderSquare', title: '广场' },
    post: { view: 'renderPost', caption: '广场', title: '广场上的到访' },
  };
  const say = (text) => (typeof text === 'function' ? text() : text),
    current = () => table[appContext.ui.screen];
  return {
    known: (screen) => Object.hasOwn(table, screen),
    about: (screen) => table[screen]?.about,
    keepsDraft: (screen) => !!table[screen]?.keepsDraft,
    // The page in view: its content, the caption of its header and the title of its tab.
    draw: () => appContext.views[current().view](),
    caption: () => say(current().caption),
    title: () => say(current().title ?? current().caption),
  };
}
