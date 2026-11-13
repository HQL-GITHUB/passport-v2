import { safe, icon, art, date, issue } from '../lib/format.js';

/** Page rendering. Dependencies are provided by createApp(). */
export function createScanViews(appContext) {
  function renderScan() {
    const venue = appContext.selectors.venue(),
      v = appContext.catalog.stampOf(venue),
      nfc = appContext.ui.scanMode === 'nfc';
    return /* HTML */ `<section class="page scan-page screen-enter">
      ${appContext.views.renderClaimModes()}
      <h1 class="scan-title">${safe(v.title)}</h1>
      <p class="scan-subtitle">${safe(venue.name)} · ${safe(v.kind)}</p>
      <div class="scan-area ${nfc ? 'nfc' : ''} ${appContext.ui.claimBusy ? 'claim-progress' : ''}">
        <div class="scan-brackets"></div>
        ${art(v)}<span class="scan-line" aria-hidden="true"></span>
      </div>
      <p class="scan-help">
        ${nfc ? '将手机靠近场馆的纪念章感应点' : '对准场馆内的纪念章领取码'}<small
          >请在参观结束后，到领取点操作</small
        >
      </p>
      <div id="page-actions"></div>
      <div class="scan-place">
        ${icon('pin')}
        <div>
          <strong>${safe(venue.location)}</strong>
          <p>纪念章领取点</p>
        </div>
        <button data-action="guide">位置</button>
      </div>
    </section>`;
  }
  function scanActions() {
    const owned = appContext.selectors.owned(appContext.selectors.venue());
    return /* HTML */ `<div class="page-actions">
      <button
        class="button ${appContext.ui.claimBusy ? 'loading-dots' : ''}"
        data-action="collect"
        ${appContext.ui.claimBusy ? 'disabled' : ''}
      >
        ${appContext.ui.claimBusy ? '正在收入护照…' : owned ? '模拟再次到访' : '模拟现场领取'}
      </button>
    </div>`;
  }
  function successActions() {
    return `<div class="page-actions success-footer"><button class="button" data-action="share">${icon('share')}分享这一刻</button><button class="button secondary" data-action="edit-memory">${icon('edit')}记录此刻的心情</button></div>`;
  }
  function renderSuccess() {
    const v = appContext.selectors.stamp(),
      r = appContext.data.records[v.id],
      again = appContext.ui.duplicate,
      count = appContext.selectors.collected().length,
      total = appContext.catalog.stamps.length,
      [, serial, edition = ''] = issue(r, v).match(/^No\. (\d+)(.*)$/);
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
      <h1 class="success-place">${safe(v.title)}</h1>
      <p class="issue-plate"><small>No.</small> <b>${serial}</b><small>${edition}</small></p>
      ${renderShelf(v, again)}
      <p class="success-moment">
        ${
          again
            ? `<b>${date(appContext.clock.today())}</b> · ${r.visits.length > 1 ? `第 ${r.visits.length} 次到访` : '今日到访'}`
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
  // keeps the place it has. Five fit, around this stamp; the row opens the album, where the
  // stamps lie in the same order.
  function renderShelf(v, again) {
    const mine = appContext.selectors.collectedInOrder(),
      at = mine.indexOf(v),
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
      ${shown.map((s, i) => `<span class="shelf-item ${s === v ? 'shelf-current' : ''}">${art(s)}<i>${place(first + i + 1)}</i></span>`).join('')}
      ${first + shown.length < mine.length ? more : ''}
    </button>`;
  }
  return {
    renderScan,
    scanActions,
    renderSuccess,
    successActions,
  };
}
