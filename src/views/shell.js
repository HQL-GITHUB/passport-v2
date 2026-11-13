import { icon } from '../lib/format.js';

/** Page rendering. Dependencies are provided by createApp(). */
export function createShellViews(appContext) {
  // A page of the navigation carries the brand; any other is a way back under its caption. Either
  // ends with the buttons the page puts there.
  function renderHeader() {
    const tools = appContext.screens.tools();
    appContext.dom.header.innerHTML = appContext.screens.root()
      ? `<div class="app-brand">${icon('passport', 'brand-icon')}旅行护照</div><div class="header-actions">${tools}</div>`
      : `<button class="header-back" data-action="back" aria-label="返回">${icon('back')}</button><span class="header-caption">${appContext.screens.caption()}</span>${tools || '<span style="width:28px" aria-hidden="true"></span>'}`;
  }
  // The navigation stays under every page. A page's own actions sit in its content, in the
  // #page-actions slot its view leaves for them, so they can be refreshed without a full render.
  function renderFooter() {
    const screen = appContext.ui.screen,
      current = (name) => (screen === name ? 'aria-current="page" class="active"' : ''),
      // Already claiming: the middle button marks the place instead of starting over.
      claiming = appContext.screens.claiming(),
      // Where the middle button claims: at the venue in view, or else at the demonstration's.
      // A page of the navigation has none in view, nor has a collector's passport or a post.
      here =
        (!appContext.screens.root() && appContext.selectors.venue()) ||
        appContext.selectors.defaultVenue();
    appContext.dom.footer.innerHTML = `<nav class="bottom-nav" aria-label="主要导航"><button data-action="discover" ${current('discover')}>${icon('compass')}发现</button><button data-action="square" ${current('square')}>${icon('plaza')}广场</button><button class="nav-claim" ${claiming ? 'aria-current="page"' : `data-action="scan" data-id="${here.id}"`} aria-label="现场盖章">${icon('scan')}<span>盖章</span></button><button data-action="collectors" ${current('collectors')}>${icon('medal')}收藏家</button><button data-action="passport" ${current('passport')}>${icon('passport')}护照</button></nav>`;
    const slot = document.getElementById('page-actions');
    if (slot) slot.innerHTML = appContext.screens.actions();
  }
  function renderClaimModes() {
    const active = appContext.ui.screen === 'ticket' ? 'ticket' : appContext.ui.scanMode;
    return `<div class="scan-switch claim-methods" role="group" aria-label="领取方式">${[
      ['qr', 'scan', '现场扫码'],
      ['nfc', 'nfc', '碰一碰'],
      ['ticket', 'ticket', '票根领取'],
    ]
      .map(
        ([value, mark, label]) =>
          `<button class="${active === value ? 'active' : ''}" data-action="scan-mode" data-value="${value}" aria-pressed="${active === value}">${icon(mark)}${label}</button>`,
      )
      .join('')}</div>`;
  }
  return {
    renderHeader,
    renderFooter,
    renderClaimModes,
  };
}
