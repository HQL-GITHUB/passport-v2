import { safe, icon, art, date, issue, visitMethods } from '../lib/format.js';

/** Page rendering. Dependencies are provided by createApp(). */
export function createStampViews(appContext) {
  function renderStamp() {
    const v = appContext.selectors.stamp(),
      venue = appContext.catalog.venueOf(v),
      r = appContext.data.records[v.id],
      visit = r ? appContext.selectors.visitForStamp(v, r) : null;
    const memory = r
      ? /* HTML */ `${appContext.views.renderVisitTicket(v, r)}<button
            class="stamp-visit-link"
            data-action="open-visit"
            data-key="${visit.key}"
          >
            <span
              >${icon('book')}翻开这次到访的记忆<small
                >${appContext.selectors.savedTickets(visit).length} 张票根 · 照片与感想</small
              ></span
            >${icon('chevron')}
          </button>
          <section class="memory-block">
            <div class="memory-header">
              <h3>这一站的记忆</h3>
              <button data-action="edit-memory">
                ${icon('edit')}${visit.note || visit.photo ? '编辑记忆' : '留下一笔'}
              </button>
            </div>
            ${visit.note ? /* HTML */ `<p class="memory-note">${safe(visit.note)}</p>` : !visit.photo ? '<p class="memory-empty">一张照片，一句话。<br>把当时的心情，也一起收藏。</p>' : ''}${visit.photo ? `<img class="memory-photo" src="${safe(visit.photo)}" alt="这次参观的个人照片">` : ''}
            <p class="privacy">${appContext.views.memoryPrivacy('仅自己可见，分享时可自行选择')}</p>
          </section>`
      : `<div class="stamp-unowned">${v.period ? '展览已经结束，可以用当时的票根补领纪念。' : `前往${safe(venue.name)}，把这枚纪念收入护照。`}</div>`;
    return /* HTML */ `<section class="page stamp-page ${r ? '' : 'unowned'} screen-enter">
      <div class="stamp-intro">
        <span class="stamp-category">${icon('book')}${safe(v.kind)}</span
        >${r ? '' : `<span class="stamp-category pending">${icon('lock')}尚未收藏</span>`}
        <h1 class="stamp-title">${safe(v.title)}</h1>
        <p class="stamp-subtitle">${safe(venue.name)} · ${safe(venue.city)}</p>
      </div>
      <div class="stamp-showcase">
        <button
          class="stamp-zoom medal-${v.art} ${v.edition ? 'medal-edition' : ''}"
          data-action="zoom"
          aria-label="放大欣赏${safe(v.title)}纪念章"
        >
          <span class="stamp-ground" aria-hidden="true"></span>${renderMedal(v, r)}</button
        ><span class="zoom-hint">${icon('search')}${r ? '点击翻看章面' : '点击预览章面'}</span>
      </div>
      <p class="stamp-description">${safe(v.description)}</p>
      ${renderEdition(v)}
      ${r ? `<div id="page-actions"></div>${memory}` : `${memory}<div id="page-actions"></div>`}
      ${appContext.views.renderHolders(v)}
    </section>`;
  }
  // A stamp in the passport is shared; one still to collect says how to get it: on site, or with
  // a ticket once its exhibition has ended.
  function stampActions() {
    const s = appContext.selectors.stamp(),
      owned = !!appContext.data.records[s.id],
      historic = s.period && s.period[1] < appContext.clock.today();
    return `<div class="page-actions"><button class="button" data-action="${owned ? 'share' : historic ? 'ticket-entry' : 'scan'}" ${owned ? '' : `data-id="${s.venueId}"`}>${icon(owned ? 'share' : historic ? 'ticket' : 'scan')}${owned ? '分享这枚纪念' : historic ? '用票根补领这枚章' : '到馆领取这枚章'}</button></div>`;
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
        ${e.left > 0 ? `还剩 ${count(e.left)} 枚，发完即止。` : '已全部发行完毕。'}${v.period ? `仅限 ${date(v.period[0])} – ${date(v.period[1])} 的参观领取。` : ''}
      </p>
    </div>`;
  }
  // The stamp as a disc that MedalViewer can turn; the back is engraved once the stamp is collected.
  // Its rim is a wall of sixty flat strips, two per <i>, lit from above.
  function renderMedal(v, r) {
    const venue = appContext.catalog.venueOf(v);
    return /* HTML */ `<div class="medal-stage" data-flip="${!!r}">
      <div class="medal medal-${v.art} ${v.edition ? 'medal-edition' : ''}">
        <div class="medal-edge" aria-hidden="true">
          ${Array.from({ length: 30 }, (_, n) => `<i style="transform:rotate(${n * 6}deg);--lit:${Math.cos((n * Math.PI) / 30).toFixed(2)}"></i>`).join('')}
        </div>
        <div class="medal-face medal-front">
          ${art(v)}<span class="medal-sheen"></span
          ><span class="stamp-sheen" aria-hidden="true"></span>
        </div>
        ${
          r
            ? /* HTML */ `<div class="medal-face medal-back">
                <small>旅行护照</small>
                <strong>${safe(v.title)}</strong>
                <span>${safe(venue.name)} · ${safe(venue.city)}</span>
                <b>${date(appContext.selectors.selectedVisit(r))}</b>
                <em>${issue(r, v)}</em>
                <svg class="medal-rim" viewBox="0 0 200 200" aria-hidden="true">
                  <defs><path id="medal-rim-arc" d="M7 100A93 93 0 0 0 193 100" /></defs>
                  <text>
                    <textPath href="#medal-rim-arc" startOffset="50%" text-anchor="middle">
                      ${safe(v.serial)} · ${safe(v.kind)}
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
  // Turns the medal over for those who cannot tap or drag it. It sits at the medal's lower right;
  // MedalViewer wires it up and keeps its label in step with the side shown.
  function renderMedalFlip() {
    return `<button class="medal-flip" data-medal-flip aria-pressed="false" aria-label="翻到背面" title="翻到背面">${icon('flip')}</button>`;
  }
  // A stamp at full size, to tilt and, once it is collected, to turn over: the one named, or the
  // one the page is about. What it opens with is also what its MedalViewer is set up with.
  function zoomDialog(stampId) {
    const stamp = appContext.catalog.stamp(stampId) || appContext.selectors.stamp(),
      record = appContext.data.records[stamp.id],
      animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      title: stamp.title,
      state: { viewer: null, canFlip: !!record, animate },
      body: /* HTML */ `<div class="zoom-medal">
          ${renderMedal(stamp, record)}${record ? renderMedalFlip() : ''}
        </div>
        <p class="modal-sub">
          ${safe(appContext.catalog.venueOf(stamp).name)} · ${safe(stamp.kind)}
        </p>
        <p class="medal-hint">
          ${record ? (animate ? '拖动章面，翻看背面的到访印记。' : '背面刻着这次到访的日期与编号。') : animate ? '拖动可以倾斜章面，收藏后可翻看背面。' : '收藏后，可以翻看背面的到访印记。'}
        </p>`,
    };
  }
  function renderVisitTicket(v, r) {
    const day = appContext.selectors.selectedVisit(r);
    return /* HTML */ `<div class="visit-ticket">
        <div class="visit-ticket-top">
          <span>我的到访印记</span><span class="subtle-label">${icon('check')}已收藏</span>
        </div>
        <div class="visit-ticket-body">
          <div>
            <p class="visit-date">${date(day)}</p>
            <p class="visit-city">
              ${icon('pin')}${safe(appContext.catalog.venueOf(v).city)} · 参观日期
            </p>
          </div>
          <div class="visit-ticket-number">
            <div class="visit-number-bars" aria-hidden="true"></div>
            <b>${issue(r, v)}</b>
          </div>
        </div>
        <dl class="visit-provenance">
          <div>
            <dt>纪念章型号</dt>
            <dd>${safe(v.serial)}</dd>
          </div>
          <div>
            <dt>领取方式</dt>
            <dd>${visitMethods(r, day)}</dd>
          </div>
          <div>
            <dt>首次领取</dt>
            <dd>${date(r.firstAt)}</dd>
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
                      `<button data-action="select-visit" data-value="${value}" class="${value === day ? 'active' : ''}" aria-pressed="${value === day}">${date(value)}</button>`,
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }`;
  }
  return {
    renderStamp,
    stampActions,
    renderMedal,
    renderMedalFlip,
    zoomDialog,
    renderVisitTicket,
  };
}
