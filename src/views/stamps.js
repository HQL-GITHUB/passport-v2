/** Page rendering. Dependencies are provided by createApp(). */
export function createStampViews(appContext) {
  function renderStamp() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      r = appContext.data.records[v.id],
      visit = r ? appContext.selectors.visitForStamp(v, r) : null;
    const memory = r
      ? /* HTML */ `${appContext.views.renderVisitTicket(v, r)}<button
            class="stamp-visit-link"
            data-action="open-visit"
            data-key="${visit.key}"
          >
            <span
              >${appContext.format.icon('book')}翻开这次到访的记忆<small
                >${appContext.selectors.savedTickets(visit).length} 张票根 · 照片与感想</small
              ></span
            >${appContext.format.icon('chevron')}
          </button>
          <section class="memory-block">
            <div class="memory-header">
              <h3>这一站的记忆</h3>
              <button data-action="edit-memory">
                ${appContext.format.icon('edit')}${visit.note || visit.photo ? '编辑记忆' : '留下一笔'}
              </button>
            </div>
            ${visit.note ? /* HTML */ `<p class="memory-note">${appContext.format.safe(visit.note)}</p>` : !visit.photo ? '<p class="memory-empty">一张照片，一句话。<br>把当时的心情，也一起收藏。</p>' : ''}${visit.photo ? `<img class="memory-photo" src="${appContext.format.safe(visit.photo)}" alt="这次参观的个人照片">` : ''}
            <p class="privacy">${appContext.format.icon('lock')}仅自己可见，分享时可自行选择</p>
          </section>`
      : `<div class="stamp-unowned">${v.period ? '展览已经结束，可以用当时的票根补领纪念。' : `前往${v.name}，把这枚纪念收入护照。`}</div>`;
    return /* HTML */ `<section class="page stamp-page screen-enter">
      <div class="stamp-intro">
        <span class="stamp-category">${appContext.format.icon('book')}${v.kind}</span>
        <h1 class="stamp-title">${v.stamp}</h1>
        <p class="stamp-subtitle">${v.name} · ${v.city}</p>
      </div>
      <div class="stamp-showcase">
        <button class="stamp-zoom" data-action="zoom" aria-label="放大欣赏${v.stamp}纪念章">
          ${appContext.format.art(v)}</button
        ><span class="zoom-hint">${appContext.format.icon('search')}点击欣赏细节</span>
      </div>
      <p class="stamp-description">${v.description}</p>
      ${memory}
    </section>`;
  }
  function renderVisitTicket(v, r) {
    const day = appContext.format.selectedVisit(r);
    return /* HTML */ `<div class="visit-ticket">
        <div class="visit-ticket-top">
          <span>我的到访印记</span
          ><span class="subtle-label">${appContext.format.icon('check')}已收藏</span>
        </div>
        <div class="visit-ticket-body">
          <div>
            <p class="visit-date">${appContext.format.date(day)}</p>
            <p class="visit-city">${appContext.format.icon('pin')}${v.city} · 参观日期</p>
          </div>
          <div class="visit-ticket-number">
            <div class="visit-number-bars" aria-hidden="true"></div>
            ${v.serial}
          </div>
        </div>
        <dl class="visit-provenance">
          <div>
            <dt>领取方式</dt>
            <dd>${appContext.format.visitMethods(r, day)}</dd>
          </div>
          <div>
            <dt>首次领取</dt>
            <dd>${appContext.format.date(r.firstAt)}</dd>
          </div>
        </dl>
      </div>
      ${
        r.visits.length > 1
          ? /* HTML */ `<div class="visit-history">
              <p>到访记录 · ${r.visits.length} 次</p>
              <div>
                ${[...r.visits]
                  .sort()
                  .reverse()
                  .map(
                    (value) =>
                      `<button data-action="select-visit" data-value="${value}" class="${value === day ? 'active' : ''}" aria-pressed="${value === day}">${appContext.format.date(value)}</button>`,
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }`;
  }
  return {
    renderStamp,
    renderVisitTicket,
  };
}
