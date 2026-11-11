/** Page rendering. Dependencies are provided by createApp(). */
export function createShellViews(appContext) {
  function renderHeader() {
    const owned = !!appContext.data.records[appContext.ui.selected];
    if (['passport', 'discover'].includes(appContext.ui.screen)) {
      appContext.dom.header.innerHTML = `<div class="app-brand">${appContext.format.icon('passport', 'brand-icon')}旅行护照</div>${appContext.ui.screen === 'discover' ? `<button class="city-button" data-action="choose-city">${appContext.format.icon('pin')}${appContext.format.safe(appContext.ui.city)}${appContext.format.icon('chevron')}</button>` : `<button class="ticket-home-entry" data-action="ticket-entry" data-id="museum">${appContext.format.icon('ticket')}添加票根</button>`}`;
      return;
    }
    const titles = {
      venue: '文化目的地',
      stamp: owned ? '我的纪念章' : '纪念章',
      scan: '为旅程盖章',
      success: '这一站，已收藏',
      share: '旅行卡预览',
      ticket: '票根入册',
      'ticket-confirm': '确认这次到访',
      'ticket-success': '旅程已收藏',
      visit: '这次到访的记忆',
      'visit-share': '到访分享预览',
      'share-footprints': '足迹分享预览',
      'share-album': '章册分享预览',
    };
    appContext.dom.header.innerHTML = `<button class="header-back" data-action="back" aria-label="返回">${appContext.format.icon('back')}</button><span class="header-caption">${titles[appContext.ui.screen]}</span><span style="width:28px" aria-hidden="true"></span>`;
  }
  function renderFooter() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      owned = !!appContext.data.records[v.id];
    if (['passport', 'discover'].includes(appContext.ui.screen)) {
      appContext.dom.footer.innerHTML = `<nav class="bottom-nav" aria-label="主要导航"><button data-action="discover" ${appContext.ui.screen === 'discover' ? 'aria-current="page" class="active"' : ''}>${appContext.format.icon('compass')}发现</button><button class="nav-claim" data-action="scan" data-id="museum" aria-label="现场盖章">${appContext.format.icon('scan')}<span>盖章</span></button><button data-action="passport" ${appContext.ui.screen === 'passport' ? 'aria-current="page" class="active"' : ''}>${appContext.format.icon('passport')}护照</button></nav>`;
      return;
    }
    if (appContext.ui.screen === 'venue') {
      const wanted = appContext.data.wanted.includes(v.id);
      appContext.dom.footer.innerHTML = `<div class="page-actions two-column"><button class="heart-button ${wanted ? 'saved' : ''}" data-action="want" aria-label="${wanted ? '取消想去收藏' : '收藏为想去'}" aria-pressed="${wanted}">${appContext.format.icon('heart')}</button><button class="button" data-action="scan">${appContext.format.icon('scan')}${owned ? '再次到馆盖章' : '到馆领取纪念章'}</button></div>`;
      return;
    }
    if (appContext.ui.screen === 'stamp') {
      const historic = v.period && v.period[1] < appContext.config.demoDate;
      appContext.dom.footer.innerHTML = `<div class="page-actions"><button class="button" data-action="${owned ? 'share' : historic ? 'ticket-entry' : 'scan'}">${appContext.format.icon(owned ? 'share' : historic ? 'ticket' : 'scan')}${owned ? '分享这枚纪念' : historic ? '用票根补领这枚章' : '到馆领取这枚章'}</button></div>`;
      return;
    }
    if (appContext.ui.screen === 'scan') {
      appContext.dom.footer.innerHTML = /* HTML */ `<div class="page-actions">
        <p class="demo-notice">交互演示 · 无需开启相机或 NFC</p>
        <button
          class="button ${appContext.ui.claimBusy ? 'loading-dots' : ''}"
          data-action="collect"
          ${appContext.ui.claimBusy ? 'disabled' : ''}
        >
          ${appContext.ui.claimBusy ? '正在收入护照…' : owned ? '模拟再次到访' : '模拟现场领取'}
        </button>
      </div>`;
      return;
    }
    if (appContext.ui.screen === 'success') {
      appContext.dom.footer.innerHTML = `<div class="page-actions success-footer"><button class="button" data-action="onsite-visit">查看这次到访${appContext.format.icon('arrow')}</button><button class="button secondary" data-action="edit-memory">${appContext.format.icon('edit')}给这一站留一句话</button></div>`;
      return;
    }
    if (
      ['share', 'visit-share', 'share-footprints', 'share-album'].includes(appContext.ui.screen)
    ) {
      appContext.dom.footer.innerHTML = `<div class="page-actions"><button class="button" data-action="download-card">${appContext.format.icon('download')}保存旅行卡</button></div>`;
      return;
    }
    if (appContext.ui.screen === 'visit') {
      appContext.dom.footer.innerHTML = `<div class="page-actions"><button class="button" data-action="visit-share">${appContext.format.icon('share')}分享这次到访</button></div>`;
      return;
    }
    if (appContext.ui.screen === 'ticket') {
      appContext.dom.footer.innerHTML = /* HTML */ `<div class="page-actions">
        <p class="demo-notice">识别为交互演示 · 下一步可选择保存原图</p>
        <button
          class="button ${appContext.ui.ticketBusy ? 'loading-dots' : ''}"
          data-action="recognize-ticket"
          ${appContext.ui.ticketBusy ? 'disabled' : ''}
        >
          ${appContext.ui.ticketBusy ? (appContext.ui.ticketBusy === 'image' ? '正在准备票根…' : '正在演示识别…') : appContext.ui.ticketDraft?.image ? '模拟识别票根' : '用示例票根体验'}${appContext.ui.ticketBusy ? '' : appContext.format.icon('arrow')}
        </button>
      </div>`;
      return;
    }
    if (appContext.ui.screen === 'ticket-confirm') {
      const d = appContext.ui.ticketDraft,
        r = appContext.data.tickets[d.id],
        rewards = appContext.selectors.selectedTicketRewards(),
        complete =
          !!r && appContext.selectors.ticketRewards(d).every((s) => r.redeemed.includes(s.id)),
        viewOnly = complete && (!d.saveTicket || r.saved),
        label = viewOnly
          ? '查看这次到访'
          : rewards.length
            ? `确认收藏 ${rewards.length} 枚纪念章`
            : '保存这次到访';
      appContext.dom.footer.innerHTML = /* HTML */ `<div class="page-actions">
        <p class="demo-notice">
          ${viewOnly ? '到访与已领取的纪念章均已保留' : d.saveTicket ? '票根同时入册 · 默认仅自己可见' : '只保存到访信息与所选纪念章'}
        </p>
        <button
          class="button ${appContext.ui.claimBusy ? 'loading-dots' : ''}"
          data-action="${viewOnly ? 'view-ticket-record' : 'redeem-ticket'}"
          ${appContext.ui.claimBusy ? 'disabled' : ''}
        >
          ${appContext.ui.claimBusy ? '正在收藏这一页…' : label}${appContext.ui.claimBusy ? '' : appContext.format.icon('arrow')}
        </button>
      </div>`;
      return;
    }
    if (appContext.ui.screen === 'ticket-success')
      appContext.dom.footer.innerHTML = `<div class="page-actions success-footer"><button class="button" data-action="ticket-visit">查看这次到访${appContext.format.icon('arrow')}</button><button class="button secondary" data-action="passport">回到我的护照</button></div>`;
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
          `<button class="${active === value ? 'active' : ''}" data-action="scan-mode" data-value="${value}" aria-pressed="${active === value}">${appContext.format.icon(mark)}${label}</button>`,
      )
      .join('')}</div>`;
  }
  return {
    renderHeader,
    renderFooter,
    renderClaimModes,
  };
}
