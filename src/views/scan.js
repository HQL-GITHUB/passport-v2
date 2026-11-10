/** Page rendering. Dependencies are provided by createApp(). */
export function createScanViews(appContext) {
  function renderScan() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      nfc = appContext.ui.scanMode === 'nfc';
    return /* HTML */ `<section class="page scan-page screen-enter">
      <p class="eyebrow">YOU WERE HERE</p>
      <h1 class="scan-title">把这一刻，<br />盖进护照。</h1>
      ${appContext.views.renderClaimModes()}
      <div class="scan-area ${nfc ? 'nfc' : ''} ${appContext.ui.claimBusy ? 'claim-progress' : ''}">
        <div class="scan-brackets"></div>
        ${appContext.format.art(v)}<span class="scan-line" aria-hidden="true"></span>
      </div>
      <p class="scan-help">
        ${nfc ? '将手机靠近场馆的纪念章感应点' : '对准场馆内的纪念章领取码'}<small
          >${nfc ? '实际设备兼容性将在后续验证' : '请在参观结束后，到领取点操作'}</small
        >
      </p>
      <div class="scan-place">
        ${appContext.format.icon('pin')}
        <div>
          <strong>${v.name}</strong>
          <p>${v.location}</p>
        </div>
        <button data-action="guide">位置</button>
      </div>
    </section>`;
  }
  function renderSuccess() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      r = appContext.data.records[v.id];
    return /* HTML */ `<section class="page success-page screen-enter">
      <div class="success-check">${appContext.format.icon('check')}</div>
      <h1 class="page-title">
        ${appContext.ui.duplicate ? '熟悉的地方，<br>又添新的记忆。' : '这一站，<br>值得被记住。'}
      </h1>
      <p class="success-sub">
        ${appContext.ui.duplicate ? '馆章已收藏，首次领取日期依然保留。' : `你的第 ${appContext.selectors.collected().length} 枚纪念章，已收入护照。`}
      </p>
      <div class="success-art">${appContext.format.art(v)}</div>
      <h2 class="success-place">${v.stamp}</h2>
      <p class="success-place-sub">
        ${v.name} · ${appContext.format.date(r?.firstAt || appContext.config.demoDate)}
      </p>
      <div class="success-divider">A MEMORY TO KEEP</div>
      <p class="success-caption">走过的地方，会成为你的故事。<br />愿下一次出发，也有所遇见。</p>
    </section>`;
  }
  return {
    renderScan,
    renderSuccess,
  };
}
