/** Page rendering. Dependencies are provided by createApp(). */
export function createScanViews(appContext) {
  function renderScan() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      nfc = appContext.ui.scanMode === 'nfc';
    return /* HTML */ `<section class="page scan-page screen-enter">
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
      <div class="success-art medal-${v.art} ${v.edition ? 'medal-edition' : ''}">
        <span class="stamp-seat" aria-hidden="true"></span>
        ${appContext.views.renderMedal(v, r)}
        <span class="stamp-ring" aria-hidden="true"></span>
      </div>
      <h2 class="success-place">${v.stamp}</h2>
      ${
        r
          ? `<p class="issue-plate">${appContext.format.issue(r, v)}</p>
            <button class="medal-flip" data-medal-flip aria-pressed="false">翻到背面</button>`
          : ''
      }
    </section>`;
  }
  return {
    renderScan,
    renderSuccess,
  };
}
