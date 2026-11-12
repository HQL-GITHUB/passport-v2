/** Page rendering. Dependencies are provided by createApp(). */
export function createScanViews(appContext) {
  function renderScan() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      nfc = appContext.ui.scanMode === 'nfc';
    return /* HTML */ `<section class="page scan-page screen-enter">
      ${appContext.views.renderClaimModes()}
      <h1 class="scan-title">${v.stamp}</h1>
      <p class="scan-subtitle">${v.name} · ${v.kind}</p>
      <div class="scan-area ${nfc ? 'nfc' : ''} ${appContext.ui.claimBusy ? 'claim-progress' : ''}">
        <div class="scan-brackets"></div>
        ${appContext.format.art(v)}<span class="scan-line" aria-hidden="true"></span>
      </div>
      <p class="scan-help">
        ${nfc ? '将手机靠近场馆的纪念章感应点' : '对准场馆内的纪念章领取码'}<small
          >请在参观结束后，到领取点操作</small
        >
      </p>
      <div id="page-actions"></div>
      <div class="scan-place">
        ${appContext.format.icon('pin')}
        <div>
          <strong>${v.location}</strong>
          <p>纪念章领取点</p>
        </div>
        <button data-action="guide">位置</button>
      </div>
    </section>`;
  }
  function renderSuccess() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      r = appContext.data.records[v.id],
      again = appContext.ui.duplicate,
      count = appContext.selectors.collected().length,
      total = appContext.catalog.stamps.length,
      [, serial, edition = ''] = appContext.format.issue(r, v).match(/^No\. (\d+)(.*)$/);
    // The stamp leads. Under it, what belongs to the stamp: its name and its number, set in the
    // stamp's own colour. Then what belongs to the collector: its place among their own stamps, or
    // the date of a return visit. The ceremony brings these in one by one and ends on the closing line.
    return /* HTML */ `<section
      class="page success-page onsite-success medal-${v.art} ${v.edition ? 'medal-edition' : ''} screen-enter"
    >
      <div class="success-art medal-${v.art} ${v.edition ? 'medal-edition' : ''}">
        <span class="stamp-ground" aria-hidden="true"></span>
        <span class="stamp-seat" aria-hidden="true"></span>
        ${appContext.views.renderMedal(v, r)}
        <span class="stamp-ring" aria-hidden="true"></span>
        ${r ? appContext.views.renderMedalFlip() : ''}
      </div>
      <h1 class="success-place">${v.stamp}</h1>
      <p class="issue-plate"><small>No.</small> <b>${serial}</b><small>${edition}</small></p>
      ${renderShelf(v, again)}
      <p class="success-moment">
        ${
          again
            ? `<b>${appContext.format.date(appContext.config.demoDate)}</b> · ${r.visits.length > 1 ? `第 ${r.visits.length} 次到访` : '今日到访'}`
            : `我的第 <strong>${count}</strong> 枚 · 已收入护照`
        }
      </p>
      <p class="page-title success-line">
        ${again ? '熟悉的地方，又添新的记忆' : count === total ? '这一册纪念章，集齐了' : '这一站，值得被记住'}
      </p>
      <div id="page-actions"></div>
    </section>`;
  }
  // The collector's own stamps in the order they were collected, with this one in its place: "my
  // fifth" shown as the fifth in the row. A new stamp takes the next place; one collected before
  // keeps the place it has. Five fit, around this stamp; the row opens the album.
  function renderShelf(v, again) {
    const earlier = appContext.selectors
        .collected()
        .filter((s) => s.id !== v.id)
        .reverse(),
      // Stamps collected on the same day have no order of their own; a new one always comes last.
      at = again
        ? earlier.filter(
            (s) => appContext.data.records[s.id].firstAt <= appContext.data.records[v.id].firstAt,
          ).length
        : earlier.length,
      mine = [...earlier.slice(0, at), v, ...earlier.slice(at)],
      first = Math.max(0, Math.min(at - 2, mine.length - 5)),
      shown = mine.slice(first, first + 5),
      more = '<span class="shelf-more" aria-hidden="true">…</span>',
      place = (n) => String(n).padStart(2, '0');
    return /* HTML */ `<button
      class="success-shelf"
      data-action="open-album"
      aria-label="我的第 ${at + 1} 枚纪念章${again ? '' : '，已收入护照'}。查看章册"
    >
      ${first ? more : ''}
      ${shown.map((s, i) => `<span class="shelf-item ${s === v ? 'shelf-current' : ''}">${appContext.format.art(s)}<i>${place(first + i + 1)}</i></span>`).join('')}
      ${first + shown.length < mine.length ? more : ''}
    </button>`;
  }
  return {
    renderScan,
    renderSuccess,
  };
}
