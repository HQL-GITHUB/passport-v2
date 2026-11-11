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
        ${
          (appContext.ui.collection === 'footprints' && rows.length) ||
          (appContext.ui.collection === 'collected' && list.length)
            ? `<button class="collection-share" data-action="share-collection" aria-label="${appContext.ui.collection === 'footprints' ? '分享我的足迹' : '分享我的章册'}">${appContext.format.icon('share')}分享</button>`
            : ''
        }
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
            ${wanted ? '' : `<p class="badge-issue">${appContext.format.issue(appContext.data.records[v.id], v)}</p>`}
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
    const years = [];
    for (const v of rows) {
      const year = v.day.slice(0, 4);
      if (years.at(-1)?.year !== year) years.push({ year, stops: [] });
      years.at(-1).stops.push(v);
    }
    return `<div class="footprint-list">${years
      .map(
        ({ year, stops }) =>
          /* HTML */ `<p class="footprint-year">${year}<span>年的文化足迹</span></p>
            <ol class="footprint-timeline">
              ${stops.map(footprintStop).join('')}
            </ol>`,
      )
      .join('')}</div>`;
  }
  // Each stamp of a visit with what makes it collectible: its edition mark and the collector's number.
  function footprintStamps(badges) {
    const lines = badges
      .filter((s) => appContext.data.records[s.id])
      .map(
        (s) =>
          `<span class="footprint-stamp"><span>${s.stamp}</span>${s.edition ? '<i>特展</i>' : s.limit ? '<i>限量</i>' : ''}<b>${appContext.format.issue(appContext.data.records[s.id], s)}</b></span>`,
      );
    return lines.length ? `<span class="footprint-stamps">${lines.join('')}</span>` : '';
  }
  // A visit with a ticket or photo opens as a full page; one that only holds stamps stays a single line.
  function footprintStop(v) {
    const tickets = appContext.selectors.savedTickets(v),
      badges = v.stampIds.map(appContext.catalog.byId),
      rich = tickets.length > 0 || !!v.photo,
      note = v.note?.trim(),
      name = appContext.format.safe(v.name),
      exhibit = appContext.format.safe(v.exhibit || '一次与文化的相遇');
    return /* HTML */ `<li class="footprint-stop">
      <p class="footprint-when">
        <b>${appContext.format.dateShort(v.day)}</b>${appContext.format.safe(v.city)}
      </p>
      <article
        class="footprint-card ${rich ? '' : 'compact'} ${appContext.ui.highlightVisit === v.key ? 'visit-highlight' : ''}"
      >
        <button class="footprint-open" data-action="open-visit" data-key="${v.key}">
          ${
            rich
              ? /* HTML */ `<div class="footprint-head">
                    <h2>${name}</h2>
                    ${appContext.format.icon('chevron')}
                  </div>
                  <p class="footprint-exhibit">${exhibit}</p>
                  <div class="visit-collage ${tickets.length ? 'with-ticket' : 'with-photo'}">
                    ${tickets.length ? `<div class="collage-ticket">${appContext.views.ticketVisual(tickets[0])}</div>` : `<img class="collage-photo" src="${appContext.format.safe(v.photo)}" alt="这次参观的照片">`}
                    <div class="collage-badges">
                      ${badges
                        .slice(0, 2)
                        .map((b) => appContext.format.art(b))
                        .join('')}
                    </div>
                  </div>
                  ${footprintStamps(badges)}
                  ${note ? /* HTML */ `<p class="footprint-note">“${appContext.format.safe(note.length > 52 ? note.slice(0, 52) + '…' : note)}”</p>` : ''}
                  <div class="footprint-meta">
                    <span>${tickets.length ? `${tickets.length} 张票根` : '到访记忆'}</span
                    ><span>翻开这一页${appContext.format.icon('up-right')}</span>
                  </div>`
              : /* HTML */ `<span class="footprint-mark"
                    >${
                      badges.length
                        ? badges
                            .slice(0, 2)
                            .map((b) => appContext.format.art(b))
                            .join('')
                        : appContext.format.icon('book')
                    }</span
                  ><span class="footprint-brief"
                    ><h2>${name}</h2>
                    <p class="footprint-exhibit">${exhibit}</p>
                    ${footprintStamps(badges)}
                    ${note ? /* HTML */ `<p class="footprint-note">“${appContext.format.safe(note)}”</p>` : ''}</span
                  >${appContext.format.icon('chevron')}`
          }
        </button>
      </article>
    </li>`;
  }
  return {
    renderPassport,
    renderCollection,
    renderFootprints,
  };
}
