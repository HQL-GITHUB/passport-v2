/** Page rendering. Dependencies are provided by createApp(). */
export function createCollectorViews(appContext) {
  // Other people's days are shown to the month, never to the day.
  const month = (day) => appContext.format.date(day).slice(0, 7);
  // A collector's face: the first letter of the name, on a tint of the collector's own.
  function avatar(p) {
    return `<span class="avatar ${p.me ? 'me' : ''}" style="--hue:${parseInt(appContext.domain.hash(p.id), 16) % 360}" aria-hidden="true">${appContext.format.safe([...p.name][0])}</span>`;
  }
  // The boards are the way in to other people's passports: each row is a collector, with the
  // stamps that put them there.
  function renderCollectors() {
    const current = appContext.selectors.currentBoard(),
      rows = appContext.selectors.board(current.id);
    return /* HTML */ `<section class="page collectors-page screen-enter">
      <h1 class="sr-only">收藏家</h1>
      ${standing(current, rows)}
      <div class="scan-switch board-switch" role="group" aria-label="榜单">
        ${appContext.selectors
          .boards()
          .map(
            (b) =>
              `<button data-action="board" data-value="${b.id}" class="${b.id === current.id ? 'active' : ''}" aria-pressed="${b.id === current.id}">${b.label}</button>`,
          )
          .join('')}
      </div>
      <ol class="board-list">
        ${rows.map((row) => boardRow(row, current)).join('')}
      </ol>
      <p class="foot-hint">
        ${current.yearly ? '只计现场领取，票根补领不计入；每年一月重新开始。' : '只计现场领取的纪念章，票根补领的不计入。'}
      </p>
    </section>`;
  }
  // Where the holder stands on the open board. A passport that is not shown is on no board, and
  // the card says how to change that.
  function standing(current, rows) {
    if (!appContext.selectors.visibility().album)
      return /* HTML */ `<div class="standing-card off">
        <span
          ><strong>你的护照还没有公开</strong
          ><small>公开章册后，现场领取的纪念章会计入榜单。票根始终只有自己可见。</small></span
        ><button data-action="visibility">公开设置</button>
      </div>`;
    const mine = rows.find((row) => row.person.me),
      // The nearest collector with more: the one to draw level with.
      ahead = mine && rows.findLast((row) => row.count > mine.count);
    if (!mine)
      return /* HTML */ `<div class="standing-card off">
        <span
          ><strong>还没有上榜</strong
          ><small
            >${current.yearly ? '今年在现场' : `在${current.label}现场`}领取一枚纪念章，就会出现在这里。</small
          ></span
        ><button data-action="discover">去发现</button>
      </div>`;
    return /* HTML */ `<button class="standing-card" data-action="collector" data-person="me">
      <span
        ><strong>${current.label}第 <b>${mine.rank}</b> 位</strong
        ><small
          >现场收藏 ${mine.count}
          枚${ahead ? ` · 再收 ${ahead.count - mine.count} 枚，追上${appContext.format.safe(ahead.person.name)}` : ''}</small
        ></span
      >${appContext.format.icon('chevron')}
    </button>`;
  }
  function boardRow(row, current) {
    const p = row.person;
    // The first three places stand in a wreath: gold, silver and bronze.
    return /* HTML */ `<li class="board-row ${p.me ? 'me' : ''}">
      <button data-action="collector" data-person="${p.id}">
        <b class="board-rank ${row.rank <= 3 ? `medal medal-${row.rank}` : ''}"
          >${row.rank <= 3 ? appContext.format.icon('laurel') : ''}${row.rank}</b
        >${avatar(p)}<span class="board-who"
          ><strong>${appContext.format.safe(p.name)}</strong
          ><small
            >${row.complete ? `已集齐${current.label}` : `最近 ${month(row.reached)}`}</small
          ></span
        ><span class="board-stamps" aria-hidden="true"
          >${row.latest.map((v) => appContext.format.art(v)).join('')}</span
        ><span class="board-count"><b>${row.count}</b>枚</span>
      </button>
    </li>`;
  }
  // Someone's passport, as far as its holder shows it: the album as a book to leaf through, and
  // the footprints if they are shown too. The holder's own opens here as others see it.
  function renderCollector() {
    const p = appContext.selectors.person(appContext.ui.person),
      tab = appContext.ui.collectorTab === 'footprints' ? 'footprints' : 'album',
      current = appContext.selectors.currentBoard(),
      row = appContext.selectors.board(current.id).find((r) => r.person.id === p.id),
      since = [...p.stamps.map((s) => s.at), ...p.visits.map((v) => v.day)].sort()[0],
      book = tab === 'album' && p.public.album && p.stamps.length > 0,
      count = (shown, n) => (shown ? n : appContext.format.icon('lock'));
    return /* HTML */ `<section
      class="page passport-page collector-page screen-enter ${book ? 'book-open' : ''}"
    >
      <div class="collector-head">
        ${avatar(p)}
        <div>
          <h1>${appContext.format.safe(p.name)}</h1>
          <p>
            ${[p.city, since ? `${month(since)} 启用` : '']
              .filter(Boolean)
              .map(appContext.format.safe)
              .join(' · ')}
          </p>
        </div>
        ${
          row
            ? `<span class="collector-standing">${current.label}<span>第 <b>${row.rank}</b> 位</span></span>`
            : ''
        }
      </div>
      <div class="collection-switch">
        <div class="collection-tabs two" role="group" aria-label="护照内容">
          ${[
            ['album', '章册', count(p.public.album, p.stamps.length)],
            ['footprints', '足迹', count(p.public.footprints, p.visits.length)],
          ]
            .map(
              ([value, label, n]) =>
                `<button data-action="collector-tab" data-value="${value}" class="${tab === value ? 'active' : ''}" aria-pressed="${tab === value}">${label}<span class="count">${n}</span></button>`,
            )
            .join('')}
        </div>
      </div>
      <div id="collection-content">
        ${tab === 'album' ? collectorAlbum(p) : collectorFootprints(p)}
      </div>
    </section>`;
  }
  function hidden(p, what) {
    return /* HTML */ `<div class="empty-state">
      <div class="empty-art">${appContext.format.icon('lock')}</div>
      <h3>${p.me ? `你的${what}没有公开` : `${what}没有公开`}</h3>
      <p>
        ${p.me ? '别人翻开你的护照时，看不到这一部分。' : '每位收藏家自己决定，护照里的哪些内容给别人看。'}
      </p>
      ${p.me ? '<button class="button" data-action="visibility">公开设置</button>' : ''}
    </div>`;
  }
  // The same book as the holder's own, four stamps to a page in the order they were collected.
  // It holds only what was collected: the places still empty are the collector's own business.
  function collectorAlbum(p) {
    if (!p.public.album) return hidden(p, '章册');
    if (!p.stamps.length)
      return /* HTML */ `<div class="empty-state">
        <div class="empty-art">${appContext.format.art(appContext.catalog.venues[0])}</div>
        <h3>章册还是空的</h3>
        <p>收藏第一枚纪念章以后，它会出现在这里。</p>
      </div>`;
    const pages = Array.from({ length: Math.ceil(p.stamps.length / 4) }, (_, n) =>
        p.stamps.slice(n * 4, (n + 1) * 4),
      ),
      shared = p.stamps.filter((s) => appContext.data.records[s.stamp.id]).length;
    appContext.ui.collectorPage = Math.min(appContext.ui.collectorPage, pages.length - 1);
    return appContext.views.bookFrame(
      appContext.ui.collectorPage,
      pages
        .map(
          (items, n) =>
            /* HTML */ `<div
              class="book-page stamp-leaf"
              style="--n:${pages.length - n}"
              role="group"
              aria-label="章册 第 ${n + 1} 页，共 ${pages.length} 页"
              data-section="collector"
              data-local="${n}"
            >
              <div class="leaf-head"><span>纪念章</span><i aria-hidden="true">STAMPS</i></div>
              <div class="stamp-slots">${items.map(heldSlot).join('')}</div>
              <div class="leaf-foot">
                <span>${!n && !p.me && shared ? `其中 ${shared} 枚，你也收藏了` : ''}</span
                ><b>${String(n + 1).padStart(2, '0')}</b>
              </div>
            </div>`,
        )
        .join(''),
      pages.map(() => '<i class="collected"></i>').join(''),
    );
  }
  // A stamp in someone's album opens the stamp's own page: what it is, and how to collect it.
  function heldSlot(s) {
    return /* HTML */ `<button class="badge-card" data-action="stamp" data-id="${s.stamp.id}">
      <div class="badge-frame">${appContext.format.art(s.stamp)}</div>
      <h3>${s.stamp.stamp}</h3>
      <p class="badge-issue">${appContext.format.issue(s, s.stamp)}</p>
      <p class="badge-date">${month(s.at)}${s.method === 'ticket' ? ' · 补领' : ''}</p>
    </button>`;
  }
  // The places a collector has been, by year and month. A note or a photograph appears only if
  // its writer shows those as well; tickets are never part of it.
  function collectorFootprints(p) {
    if (!p.public.footprints) return hidden(p, '足迹');
    if (!p.visits.length)
      return /* HTML */ `<div class="empty-state">
        <div class="empty-art">${appContext.format.icon('ticket')}</div>
        <h3>还没有足迹</h3>
        <p>第一次到访以后，它会出现在这里。</p>
      </div>`;
    const years = [];
    for (const v of p.visits) {
      const year = v.day.slice(0, 4);
      if (years.at(-1)?.year !== year) years.push({ year, stops: [] });
      years.at(-1).stops.push(v);
    }
    return /* HTML */ `<div class="footprint-list public-footprints">
      ${years
        .map(
          ({ year, stops }) =>
            /* HTML */ `<p class="footprint-year">${year}<span>年的文化足迹</span></p>
              <ol class="footprint-timeline">
                ${stops.map((v) => publicStop(v, p.public.memories)).join('')}
              </ol>`,
        )
        .join('')}
      <p class="privacy">
        ${appContext.format.icon('lock')}足迹只显示到月份，票根不会出现在公开的护照里
      </p>
    </div>`;
  }
  function publicStop(v, memories) {
    const known = appContext.catalog.venues.some((item) => item.id === v.venueId),
      note = memories && v.note,
      row = /* HTML */ `<span class="footprint-mark"
          >${
            v.stamps.length
              ? v.stamps
                  .slice(0, 2)
                  .map((s) => appContext.format.art(s))
                  .join('')
              : appContext.format.icon('book')
          }</span
        ><span class="footprint-brief"
          ><h2>${appContext.format.safe(v.name)}</h2>
          <p class="footprint-exhibit">
            ${appContext.format.safe(v.exhibit || '一次与文化的相遇')}
          </p>
          ${note ? `<p class="footprint-note">“${appContext.format.safe(note)}”</p>` : ''}</span
        >`;
    return /* HTML */ `<li class="footprint-stop">
      <p class="footprint-when">
        <b>${Number(v.day.slice(5, 7))}</b>月 · ${appContext.format.safe(v.city)}
      </p>
      <article class="footprint-card compact">
        ${
          known
            ? `<button class="footprint-open" data-action="venue" data-id="${v.venueId}">${row}${appContext.format.icon('chevron')}</button>`
            : `<div class="footprint-open">${row}</div>`
        }
        ${memories && v.photo ? `<img class="public-photo" src="${appContext.format.safe(v.photo)}" alt="这次参观的照片">` : ''}
      </article>
    </li>`;
  }
  // On a stamp's page: who else holds it, in the order of their numbers. The first few, and the
  // holder's own place among them.
  function renderHolders(v) {
    const all = appContext.selectors.holders(v);
    if (!all.length) return '';
    const shown = all.filter((h, n) => n < 5 || h.person.me),
      digits = v.limit ? String(v.limit).length : 6;
    return /* HTML */ `<section class="holders">
      <div class="memory-header">
        <h3>这枚章的收藏者</h3>
        <span>${all.length} 位公开</span>
      </div>
      <ol class="holder-list">
        ${shown
          .map(
            (h) =>
              /* HTML */ `<li class="${h.person.me ? 'me' : ''}">
                <button data-action="collector" data-person="${h.person.id}">
                  <b>No. ${String(h.issue).padStart(digits, '0')}</b>${avatar(h.person)}<strong
                    >${appContext.format.safe(h.person.name)}</strong
                  ><small>${month(h.at)} · ${h.method === 'ticket' ? '补领' : '现场'}</small>
                </button>
              </li>`,
          )
          .join('')}
      </ol>
      <p class="privacy">
        按收藏编号排列${all.length > shown.length ? `，另有 ${all.length - shown.length} 位` : ''} ·
        只列出公开了章册的收藏家
      </p>
    </section>`;
  }
  return {
    avatar,
    renderCollectors,
    renderCollector,
    renderHolders,
  };
}
