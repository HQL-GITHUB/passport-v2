/** Page rendering. Dependencies are provided by createApp(). */
export function createPassportViews(appContext) {
  function renderPassport() {
    const rows = appContext.selectors.visitRows(),
      list = appContext.selectors.collected(),
      cities = new Set(rows.map((v) => v.city)).size;
    return /* HTML */ `<section class="page passport-page memory-passport screen-enter">
      <p class="eyebrow">YOUR CULTURAL JOURNAL</p>
      <h1 class="page-title">我的旅行护照</h1>
      <p class="subtitle">一张票根，一枚纪念，一次相遇。</p>
      <div class="passport-stats">
        <div><strong>${String(rows.length).padStart(2, '0')}</strong><span>次到访</span></div>
        <div><strong>${String(list.length).padStart(2, '0')}</strong><span>枚纪念章</span></div>
        <div><strong>${String(cities).padStart(2, '0')}</strong><span>座城市</span></div>
      </div>
      <div class="collection-switch memory-tabs" role="group" aria-label="护照内容">
        ${[
          ['footprints', '足迹', rows.length],
          ['collected', '章册', list.length],
          ['wanted', '想去', appContext.data.wanted.length],
        ]
          .map(
            ([value, label, count]) =>
              `<button data-action="collection" data-value="${value}" class="${appContext.ui.collection === value ? 'active' : ''}" aria-pressed="${appContext.ui.collection === value}">${label}<span class="count">${count}</span></button>`,
          )
          .join('')}
      </div>
      <div id="collection-content">${appContext.views.renderCollection()}</div>
      <p class="foot-hint">让走过的地方，都有一页可翻。</p>
    </section>`;
  }
  function renderCollection() {
    if (appContext.ui.collection === 'footprints') return appContext.views.renderFootprints();
    const wanted = appContext.ui.collection === 'wanted',
      list = wanted
        ? appContext.catalog.venues.filter((v) => appContext.data.wanted.includes(v.id))
        : appContext.selectors.collected();
    if (!list.length)
      return /* HTML */ `<div class="empty-state">
        <div class="empty-art">${appContext.format.art(appContext.catalog.venues[0])}</div>
        <h3>${wanted ? '下一站，留给你的好奇心' : '第一枚纪念章，等你出发'}</h3>
        <p>
          ${wanted ? '收藏喜欢的目的地，留给下一次出发。' : '参观一座喜欢的馆，把纪念收入章册。'}
        </p>
        <button class="button" data-action="discover">
          发现目的地${appContext.format.icon('arrow')}
        </button>
      </div>`;
    return `<div class="badge-grid">${list
      .map(
        (v) =>
          /* HTML */ `<button
            class="badge-card"
            data-action="${wanted ? 'venue' : 'stamp'}"
            data-id="${v.id}"
          >
            <div class="badge-frame">${appContext.format.art(v)}</div>
            <h3>${v.stamp}</h3>
            <p class="badge-meta">
              ${v.name} ·
              ${wanted ? '想去' : appContext.format.displayVisit(appContext.format.firstVisit(appContext.data.records[v.id]))}
            </p>
          </button>`,
      )
      .join('')}</div>`;
  }
  function renderFootprints() {
    const rows = appContext.selectors.visitRows();
    if (!rows.length)
      return /* HTML */ `<div class="empty-state">
        <div class="empty-art">${appContext.format.icon('ticket')}</div>
        <h3>让第一段旅程，有迹可循。</h3>
        <p>保存一张去过的票根，或到馆领取纪念章，开始你的旅行护照。</p>
        <button class="button" data-action="ticket-entry" data-id="museum">
          添加第一张票根${appContext.format.icon('arrow')}
        </button>
      </div>`;
    let year = '';
    return `<div class="footprint-list">${rows
      .map((v) => {
        const tickets = appContext.selectors.savedTickets(v),
          badges = v.stampIds.map(appContext.catalog.byId),
          heading =
            year !== v.day.slice(0, 4)
              ? /* HTML */ `<p class="footprint-year">
                  ${v.day.slice(0, 4)}<span>年的文化足迹</span>
                </p>`
              : '';
        year = v.day.slice(0, 4);
        return /* HTML */ `${heading}
          <article
            class="footprint-card ${appContext.ui.highlightVisit === v.key ? 'visit-highlight' : ''}"
          >
            <button class="footprint-open" data-action="open-visit" data-key="${v.key}">
              <div class="footprint-date">
                <span
                  >${appContext.format.date(v.day)} <i>· ${appContext.format.safe(v.city)}</i></span
                >${appContext.format.icon('chevron')}
              </div>
              <h2>${appContext.format.safe(v.name)}</h2>
              <p class="footprint-exhibit">
                ${appContext.format.safe(v.exhibit || '一次与文化的相遇')}
              </p>
              <div
                class="visit-collage ${tickets.length ? 'with-ticket' : v.photo ? 'with-photo' : 'badges-only'}"
              >
                ${tickets.length ? `<div class="collage-ticket">${appContext.views.ticketVisual(tickets[0])}</div>` : v.photo ? `<img class="collage-photo" src="${appContext.format.safe(v.photo)}" alt="这次参观的照片">` : ''}
                <div class="collage-badges">
                  ${badges
                    .slice(0, 2)
                    .map((b) => appContext.format.art(b))
                    .join(
                      '',
                    )}${!badges.length && !tickets.length && !v.photo ? `<span class="visit-empty-emblem">${appContext.format.icon('book')}旅程已记录</span>` : ''}
                </div>
              </div>
              ${v.note ? /* HTML */ `<p class="footprint-note">“${appContext.format.safe(v.note.length > 52 ? v.note.slice(0, 52) + '…' : v.note)}”</p>` : ''}
              <div class="footprint-meta">
                <span
                  >${tickets.length ? `${tickets.length} 张票根` : '到访记忆'}${badges.length ? ` · ${badges.length} 枚纪念章` : ''}</span
                ><span>翻开这一页${appContext.format.icon('up-right')}</span>
              </div>
            </button>
          </article>`;
      })
      .join('')}</div>`;
  }
  return {
    renderPassport,
    renderCollection,
    renderFootprints,
  };
}
