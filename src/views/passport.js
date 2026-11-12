/** Page rendering. Dependencies are provided by createApp(). */
export function createPassportViews(appContext) {
  function renderPassport() {
    const rows = appContext.selectors.visitRows(),
      list = appContext.selectors.collected();
    // The tabs are the passport's figures: each carries its count above its name and stays in
    // reach while the page scrolls. The two bookmarks of the book come first, and the passport
    // opens on the album. The header already names the page, so the title is not shown; sharing
    // the open tab sits in the header too.
    return /* HTML */ `<section
      class="page passport-page memory-passport screen-enter ${inBook() ? 'book-open' : ''}"
    >
      <h1 class="sr-only">我的旅行护照</h1>
      <div class="collection-switch memory-tabs">
        <div class="collection-tabs" role="group" aria-label="护照内容">
          ${[
            ['collected', '章册', `${list.length}/${appContext.catalog.stamps.length}`],
            ['tickets', '票根', appContext.selectors.ticketRows().length],
            ['footprints', '足迹', rows.length],
            ['wanted', '想去', appContext.data.wanted.length],
          ]
            .map(
              ([value, label, count]) =>
                `<button data-action="collection" data-value="${value}" class="${appContext.ui.collection === value ? 'active' : ''}" aria-pressed="${appContext.ui.collection === value}">${label}<span class="count">${count}</span></button>`,
            )
            .join('')}
        </div>
      </div>
      <div id="collection-content">${appContext.views.renderCollection()}</div>
    </section>`;
  }
  function renderCollection() {
    if (appContext.ui.collection === 'footprints') return appContext.views.renderFootprints();
    if (inBook()) return renderBook();
    const list = appContext.catalog.venues.filter((v) => appContext.data.wanted.includes(v.id));
    if (!list.length)
      return /* HTML */ `<div class="empty-state">
        <div class="empty-art">${appContext.format.art(appContext.catalog.venues[0])}</div>
        <h3>下一站，留给你的好奇心</h3>
        <p>收藏喜欢的目的地，留给下一次出发。</p>
        <button class="button" data-action="discover">
          发现目的地${appContext.format.icon('arrow')}
        </button>
      </div>`;
    return `<div class="badge-grid">${list
      .map(
        (v) =>
          /* HTML */ `<button class="badge-card" data-action="venue" data-id="${v.id}">
            <div class="badge-frame">${appContext.format.art(v)}</div>
            <h3>${v.stamp}</h3>
            <p class="badge-meta">${v.name} · 想去</p>
          </button>`,
      )
      .join('')}</div>`;
  }
  // The album and the tickets are the two sections of one book, opened inside the passport: a page
  // holds four stamps or two tickets, and the tabs are its bookmarks.
  const sections = { collected: '章册', tickets: '票根' };
  function inBook(section = appContext.ui.collection) {
    return Object.hasOwn(sections, section);
  }
  // The album fills like a passport: the stamps in the order they were collected, then the places
  // still empty. A new stamp takes the first empty place and nothing before it moves.
  function albumStamps() {
    return [...appContext.selectors.collectedInOrder(), ...appContext.selectors.uncollected()];
  }
  function bookPages() {
    const pages = (list, size) =>
        Array.from({ length: Math.ceil(list.length / size) }, (_, n) =>
          list.slice(n * size, (n + 1) * size),
        ),
      tickets = appContext.selectors.ticketRows();
    return {
      collected: pages(albumStamps(), 4),
      // After the last ticket there is always a place for the next one.
      tickets: pages([...tickets, null], 2),
    };
  }
  // The page a section opens on, counted through the whole book. Each section keeps its own place.
  function bookIndex(section = appContext.ui.collection) {
    const pages = bookPages();
    appContext.ui.stampPage = Math.min(appContext.ui.stampPage, pages.collected.length - 1);
    appContext.ui.ticketPage = Math.min(appContext.ui.ticketPage, pages.tickets.length - 1);
    return section === 'tickets'
      ? pages.collected.length + appContext.ui.ticketPage
      : appContext.ui.stampPage;
  }
  function stampPageOf(id) {
    return Math.floor(
      Math.max(
        0,
        albumStamps().findIndex((v) => v.id === id),
      ) / 4,
    );
  }
  // A page was turned: the tab of its section takes over, and the header shares that section.
  function bookTurned(leaf) {
    const section = leaf.dataset.section,
      changed = section !== appContext.ui.collection;
    appContext.ui.collection = section;
    appContext.ui[section === 'tickets' ? 'ticketPage' : 'stampPage'] = Number(leaf.dataset.local);
    if (!changed) return;
    for (const tab of appContext.dom.main.querySelectorAll('[data-action="collection"]')) {
      const active = tab.dataset.value === section;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    }
    appContext.views.renderHeader();
  }
  // Stamped on the cover in foil: a globe inside a compass, ringed like a seal.
  const coverEmblem = /* HTML */ `<svg class="cover-emblem" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="cover-foil" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eadbab" />
        <stop offset=".45" stop-color="#b8985a" />
        <stop offset=".62" stop-color="#f3e6bd" />
        <stop offset="1" stop-color="#a5854a" />
      </linearGradient>
    </defs>
    <g stroke="url(#cover-foil)">
      <circle cx="60" cy="60" r="56" stroke-width="1" />
      <circle
        cx="60"
        cy="60"
        r="51"
        stroke-width="2.4"
        stroke-dasharray=".9 3.55"
        stroke-linecap="butt"
      />
      <circle cx="60" cy="60" r="45.5" stroke-width=".7" />
      <circle cx="60" cy="60" r="27" stroke-width="1.1" />
      <ellipse cx="60" cy="60" rx="11" ry="27" stroke-width=".8" />
      <ellipse cx="60" cy="60" rx="20.5" ry="27" stroke-width=".6" />
      <path d="M33 60h54M36.4 47h47.2M36.4 73h47.2" stroke-width=".8" />
    </g>
    <g fill="url(#cover-foil)" stroke="none">
      <path d="m60 14 3.2 15h-6.4ZM60 106l3.2-15h-6.4ZM14 60l15-3.2v6.4ZM106 60l-15-3.2v6.4Z" />
      <circle cx="33.5" cy="33.5" r="1.4" />
      <circle cx="86.5" cy="33.5" r="1.4" />
      <circle cx="33.5" cy="86.5" r="1.4" />
      <circle cx="86.5" cy="86.5" r="1.4" />
    </g>
  </svg>`;
  // The claim ceremony shows the book too, and names the stamps just collected: that book opens
  // on the page of the first of them, with their places still empty. It is only looked at, so
  // it holds the album alone and has no pager.
  function renderBook(claimed) {
    const pages = bookPages(),
      leaves = [
        ...pages.collected.map((items, local) => ['collected', local, items]),
        ...(claimed ? [] : pages.tickets).map((items, local) => ['tickets', local, items]),
      ],
      owned = appContext.selectors.collected().length,
      pending = appContext.selectors.uncollected().length;
    return /* HTML */ `<div
      class="passport-book"
      data-page="${claimed ? stampPageOf(claimed[0]) : bookIndex()}"
    >
      <div class="book-stage">
        <div class="book-cover" aria-hidden="true"></div>
        <div class="book-leaves">
          <div class="book-left" aria-hidden="true"></div>
          ${leaves
            .map(([section, local, items], n) => {
              const album = section === 'collected',
                // The first page with an empty slot says how many are still to come.
                note =
                  album && pending && local === Math.floor(owned / 4)
                    ? `<span class="album-pending">${owned ? `还有 ${pending} 枚，等你出发` : '第一枚纪念章，等你出发'}</span>`
                    : album
                      ? '<span></span>'
                      : `<span class="privacy">${appContext.format.icon('lock')}票根仅自己可见，原图只保存在本机</span>`;
              return /* HTML */ `<div
                class="book-page ${album ? 'stamp-leaf' : 'ticket-leaf'}"
                style="--n:${leaves.length - n}"
                role="group"
                aria-label="${sections[section]} 第 ${local + 1} 页，共 ${pages[section].length} 页"
                data-section="${section}"
                data-local="${local}"
              >
                <div class="leaf-head">
                  <span>${album ? '纪念章' : '票根'}</span
                  ><i aria-hidden="true">${album ? 'STAMPS' : 'TICKETS'}</i>
                </div>
                ${
                  album
                    ? `<div class="stamp-slots">${items.map((v) => stampSlot(v, claimed?.includes(v.id))).join('')}</div>`
                    : appContext.selectors.ticketRows().length
                      ? `<div class="ticket-slots">${items.map(ticketSlot).join('')}</div>`
                      : emptyTickets()
                }
                <div class="leaf-foot">${note}<b>${String(n + 1).padStart(2, '0')}</b></div>
              </div>`;
            })
            .join('')}
        </div>
        <div class="book-front-wrap" aria-hidden="true">
          <div class="book-front">
            <div class="front-out">
              <i>CULTURAL TRAVEL</i>
              <b>旅行护照</b>
              ${coverEmblem}
              <i>PASSPORT</i>
              <span class="cover-chip"></span>
            </div>
            <div class="front-in"></div>
          </div>
        </div>
      </div>
      ${
        claimed
          ? ''
          : /* HTML */ `<div class="book-pager">
              <button data-book-step="-1" aria-label="上一页">
                ${appContext.format.icon('back')}
              </button>
              <span class="book-dots" aria-hidden="true"
                ><i class="cover"></i
                >${leaves.map(([section]) => `<i class="${section}"></i>`).join('')}</span
              >
              <button data-book-step="1" aria-label="下一页">
                ${appContext.format.icon('chevron')}
              </button>
              <span class="sr-only book-status" role="status"></span>
            </div>`
      }
    </div>`;
  }
  // A place in the album. A collected stamp sits on the page with its number and, under it, the
  // day it was collected; one still to collect is a dimmed slot that opens the stamp's own page, which says how
  // to get it: on site, or with a ticket once its exhibition has ended. In the book of the claim
  // ceremony the place of a new stamp also holds what was there before, the dimmed stamp in its
  // dashed ring, for the stamp to come down on.
  function stampSlot(v, awaited) {
    const record = appContext.data.records[v.id];
    if (record)
      return /* HTML */ `<button class="badge-card" data-action="stamp" data-id="${v.id}">
        <div class="badge-frame">
          ${awaited ? `<span class="slot-seat">${appContext.format.art(v)}</span>` : ''}
          ${record.firstAt === appContext.config.demoDate ? '<span class="badge-kind new">新</span>' : ''}${appContext.format.art(v)}
        </div>
        <h3>${v.stamp}</h3>
        <p class="badge-issue">${appContext.format.issue(record, v)}</p>
        <p class="badge-date">${appContext.format.date(record.firstAt)}</p>
      </button>`;
    const e = appContext.selectors.edition(v),
      ended = v.period && v.period[1] < appContext.config.demoDate;
    return /* HTML */ `<button class="badge-card unowned" data-action="stamp" data-id="${v.id}">
      <div class="badge-frame">${appContext.format.art(v)}</div>
      <h3>${v.stamp}</h3>
      <p class="badge-pending">
        ${ended ? '可用票根补领' : !e ? '到馆领取' : e.left > 0 ? `限量 · 还剩 ${e.left.toLocaleString('en-US')} 枚` : '已全部发行完毕'}
      </p>
    </button>`;
  }
  function emptyTickets() {
    return /* HTML */ `<div class="empty-state">
      <div class="empty-art">${appContext.format.icon('ticket')}</div>
      <h3>去过的票根，都夹在这里。</h3>
      <p>拍下纸质票根，或导入电子票截图。原图只保存在本机。</p>
      <button class="button" data-action="ticket-entry" data-id="museum">
        添加第一张票根${appContext.format.icon('arrow')}
      </button>
    </div>`;
  }
  // A saved ticket tucked into the page by its corners, newest visit first. It opens at full size;
  // the stamps it was redeemed for sit on its corner.
  function ticketSlot(row) {
    if (!row)
      return /* HTML */ `<button class="ticket-add" data-action="ticket-entry" data-id="museum">
        ${appContext.format.icon('ticket')}再添一张票根
      </button>`;
    const { id, ticket, visit } = row;
    return /* HTML */ `<button class="ticket-card" data-action="view-ticket" data-ticket-id="${id}">
      <span class="ticket-mount ${ticket.kind === 'image' ? 'original' : ''}">
        ${appContext.views.ticketVisual(id)}
        <span class="ticket-thumb-badges">
          ${ticket.redeemed
            .slice(0, 2)
            .map((s) => appContext.format.art(appContext.catalog.byId(s)))
            .join('')}
        </span>
      </span>
      <b>${appContext.format.date(visit.day)}</b>
      <strong>${appContext.format.safe(visit.name)}</strong>
    </button>`;
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
      // A printed ticket already names the venue and the exhibition, so the card does not repeat
      // them above it. An imported photo of a ticket, or a visit photo, still gets the heading.
      printed = tickets.length > 0 && appContext.data.tickets[tickets[0]].kind === 'sample',
      note = v.note?.trim(),
      name = appContext.format.safe(v.name),
      exhibit = appContext.format.safe(v.exhibit || '一次与文化的相遇');
    return /* HTML */ `<li class="footprint-stop">
      <p class="footprint-when">
        <b>${appContext.format.dateShort(v.day)}</b>${appContext.format.safe(v.city)}
      </p>
      <article
        class="footprint-card ${rich ? (printed ? 'printed' : '') : 'compact'} ${appContext.ui.highlightVisit === v.key ? 'visit-highlight' : ''}"
      >
        <button class="footprint-open" data-action="open-visit" data-key="${v.key}">
          ${
            rich
              ? /* HTML */ `${
                    printed
                      ? ''
                      : /* HTML */ `<div class="footprint-head">
                            <h2>${name}</h2>
                            ${appContext.format.icon('chevron')}
                          </div>
                          <p class="footprint-exhibit">${exhibit}</p>`
                  }
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
    inBook,
    bookIndex,
    renderBook,
    stampPageOf,
    bookTurned,
  };
}
