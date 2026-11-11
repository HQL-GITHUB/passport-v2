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
    return /* HTML */ `<section class="page stamp-page ${r ? '' : 'unowned'} screen-enter">
      <div class="stamp-intro">
        <span class="stamp-category">${appContext.format.icon('book')}${v.kind}</span
        >${r ? '' : `<span class="stamp-category pending">${appContext.format.icon('lock')}尚未收藏</span>`}
        <h1 class="stamp-title">${v.stamp}</h1>
        <p class="stamp-subtitle">${v.name} · ${v.city}</p>
      </div>
      <div class="stamp-showcase">
        <button class="stamp-zoom" data-action="zoom" aria-label="放大欣赏${v.stamp}纪念章">
          ${renderMedal(v, r)}</button
        ><span class="zoom-hint"
          >${appContext.format.icon('search')}${r ? '点击翻看章面' : '点击预览章面'}</span
        >
      </div>
      <p class="stamp-description">${v.description}</p>
      ${renderEdition(v)}${memory}
    </section>`;
  }
  function renderEdition(v) {
    const e = appContext.selectors.edition(v);
    if (!e) return '';
    const count = (n) => n.toLocaleString('en-US');
    return /* HTML */ `<div class="edition-meter">
      <div class="edition-meter-head">
        <span>${v.period ? '限时 · 限量发行' : '限量发行'}</span
        ><b>${count(e.issued)} / ${count(e.limit)}</b>
      </div>
      <div class="edition-bar" role="img" aria-label="已发行 ${e.issued} 枚，共 ${e.limit} 枚">
        <i style="width:${((e.issued / e.limit) * 100).toFixed(1)}%"></i>
      </div>
      <p>
        ${e.left > 0 ? `还剩 ${count(e.left)} 枚，发完即止。` : '已全部发行完毕。'}${v.period ? `仅限 ${appContext.format.date(v.period[0])} – ${appContext.format.date(v.period[1])} 的参观领取。` : ''}
      </p>
    </div>`;
  }
  // The stamp as a disc that MedalViewer can turn; the back is engraved once the stamp is collected.
  // Its rim is a wall of sixty flat strips, two per <i>, lit from above; the <b> discs fill the inside.
  function renderMedal(v, r) {
    return /* HTML */ `<div class="medal-stage" data-flip="${!!r}">
      <div class="medal medal-${v.art} ${v.edition ? 'medal-edition' : ''}">
        <div class="medal-edge" aria-hidden="true">
          <b></b><b></b>
          ${Array.from({ length: 30 }, (_, n) => `<i style="transform:rotate(${n * 6}deg);--lit:${Math.cos((n * Math.PI) / 30).toFixed(2)}"></i>`).join('')}
        </div>
        <div class="medal-face medal-front">
          ${appContext.format.art(v)}<span class="medal-sheen"></span
          ><span class="stamp-sheen" aria-hidden="true"></span>
        </div>
        ${
          r
            ? /* HTML */ `<div class="medal-face medal-back">
                <small>旅行护照</small>
                <strong>${v.stamp}</strong>
                <span>${v.name} · ${v.city}</span>
                <b>${appContext.format.date(appContext.format.selectedVisit(r))}</b>
                <em>${appContext.format.issue(r, v)}</em>
                <svg class="medal-rim" viewBox="0 0 200 200" aria-hidden="true">
                  <defs><path id="medal-rim-arc" d="M7 100A93 93 0 0 0 193 100" /></defs>
                  <text>
                    <textPath href="#medal-rim-arc" startOffset="50%" text-anchor="middle">
                      ${v.serial} · ${v.kind}
                    </textPath>
                  </text>
                </svg>
                <span class="medal-sheen"></span>
              </div>`
            : ''
        }
      </div>
      <span class="medal-shadow" aria-hidden="true"></span>
    </div>`;
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
            <b>${appContext.format.issue(r, v)}</b>
          </div>
        </div>
        <dl class="visit-provenance">
          <div>
            <dt>纪念章型号</dt>
            <dd>${v.serial}</dd>
          </div>
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
    renderMedal,
    renderVisitTicket,
  };
}
