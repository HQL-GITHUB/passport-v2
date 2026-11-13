/** Page rendering. Dependencies are provided by createApp(). */
export function createDiscoveryViews(appContext) {
  // A photograph fades in when it arrives; one that has been shown before is simply there, so
  // rendering the page again does not make it blink.
  const fade = (src) =>
    `data-fade ${appContext.runtime.shownImages.has(src) ? 'class="shown"' : ''}`;
  function venueRows() {
    const list = appContext.selectors.filteredVenues();
    if (!list.length)
      return /* HTML */ `<div class="empty-state">
        <h3>暂时没有找到这一站</h3>
        <p>试试其他关键词，或换一个城市看看。</p>
        <button class="button secondary" data-action="clear-filters">查看全部目的地</button>
      </div>`;
    return list.map(venueCard).join('');
  }
  // A venue is a card: its photograph, with its stamp on the corner, or the stamp alone where
  // there is no photograph. The stamp says what can be collected there; one already collected
  // carries a tick on its rim. The places saved for later in the passport are the same cards.
  function venueCard(v) {
    const photo = v.thumb,
      owned = appContext.selectors.owned(v);
    return /* HTML */ `<button class="venue-card" data-action="venue" data-id="${v.id}">
      <span class="venue-thumb ${photo ? 'has-photo' : ''}"
        >${photo ? `<img src="${photo}" alt="" loading="lazy" decoding="async" ${fade(photo)}>` : ''}<span
          class="venue-seal"
          >${appContext.format.art(appContext.catalog.stampOf(v))}${owned ? `<span class="venue-status" role="img" aria-label="馆章已收藏">${appContext.format.icon('check')}</span>` : ''}</span
        ></span
      ><span class="venue-copy"
        ><h3>${v.name}</h3>
        <p>${v.city} · ${v.exhibit}</p></span
      >
    </button>`;
  }
  // The featured venues above the list, each a slide that opens its venue. They stay while the
  // list is narrowed to a category, and give way to the results of a search.
  function renderHero() {
    const slides = appContext.selectors.featuredVenues();
    if (!slides.length) return '';
    return /* HTML */ `<div
      class="discover-hero"
      role="group"
      aria-roledescription="轮播"
      aria-label="推荐的目的地"
      ${appContext.selectors.heroHidden() ? 'hidden' : ''}
    >
      <div class="hero-track" data-carousel-track>
        ${slides
          .map(
            (v, n) =>
              /* HTML */ `<button class="hero-slide" data-action="venue" data-id="${v.id}">
                <img
                  src="${v.photo}"
                  alt=""
                  ${n ? 'loading="lazy"' : ''}
                  decoding="async"
                  ${fade(v.photo)}
                /><span class="hero-copy"
                  ><strong>${v.headline.join('<br />')}</strong
                  ><span>${v.name} · ${v.exhibit}</span></span
                >
              </button>`,
          )
          .join('')}
      </div>
      ${
        slides.length > 1
          ? `<div class="hero-dots">${slides.map((v, n) => `<button data-carousel-dot aria-label="第 ${n + 1} 张，共 ${slides.length} 张：${v.name}" aria-current="${!n}"></button>`).join('')}</div>`
          : ''
      }
    </div>`;
  }
  // The destinations are shown as a list or on the map; the search box and the categories serve
  // both. On the map the featured row and the list's title make way for it.
  function renderDiscover() {
    const map = appContext.ui.discoverView === 'map';
    return /* HTML */ `<section class="page discover-page ${map ? 'map-open' : ''} screen-enter">
      <h1 class="sr-only">发现下一站</h1>
      <div class="search-box">
        ${appContext.format.icon('search')}<label class="sr-only" for="venue-search"
          >搜索场馆或展览</label
        ><input
          id="venue-search"
          data-input="search"
          type="search"
          placeholder="每一次探索，都值得留下印记"
          value="${appContext.format.safe(appContext.ui.query)}"
          autocomplete="off"
        /><button
          class="icon-button"
          data-action="clear-search"
          aria-label="清空搜索"
          ${appContext.ui.query ? '' : 'hidden'}
        >
          ${appContext.format.icon('close')}
        </button>
      </div>
      ${
        map
          ? ''
          : /* HTML */ `${renderHero()}
              <div class="row">
                <h2 class="section-title">值得出发的地方</h2>
                <span id="venue-count" class="section-count"
                  >${appContext.selectors.filteredVenues().length} 个目的地</span
                >
              </div>`
      }
      <div class="category-tabs" role="group" aria-label="场馆类别">
        ${[
          ['all', '全部'],
          ['museum', '博物馆'],
          ['artmuseum', '美术馆'],
          ['space', '艺术空间'],
        ]
          .map(
            ([key, label]) =>
              `<button class="${appContext.ui.category === key ? 'active' : ''}" data-action="category" data-value="${key}" aria-pressed="${appContext.ui.category === key}">${label}</button>`,
          )
          .join('')}
      </div>
      ${
        map
          ? appContext.views.renderVenueMap()
          : `<div id="venue-list" class="venue-list" aria-live="polite">${appContext.views.venueRows()}</div><p class="foot-hint">所有场馆及开放信息均为原型演示内容</p>`
      }
    </section>`;
  }
  function renderVenue() {
    const v = appContext.selectors.venue(),
      s = appContext.catalog.stampOf(v),
      owned = appContext.selectors.owned(v),
      wanted = appContext.data.wanted.includes(v.id),
      photo = v.photo;
    // Saving the place for later belongs to the venue, so it sits by its name. The stamp and the
    // way to claim it are one panel: what can be collected here, and the button that collects it.
    return /* HTML */ `<section class="page venue-page screen-enter">
      ${photo ? `<img class="venue-photo" src="${photo}" alt="${v.name}概念建筑">` : `<div class="venue-poster" data-word="${v.word}">${appContext.format.art(s)}</div>`}
      <div class="venue-inner">
        <div class="venue-heading">
          <div>
            <p class="venue-category">${v.city} / ${v.type}</p>
            <h1 class="venue-title">${v.name}</h1>
          </div>
          <button
            class="heart-button ${wanted ? 'saved' : ''}"
            data-action="want"
            aria-label="${wanted ? '取消想去收藏' : '收藏为想去'}"
            aria-pressed="${wanted}"
          >
            ${appContext.format.icon('heart')}想去
          </button>
        </div>
        <p class="venue-intro">${v.intro}</p>
        <div class="venue-stamp">
          <button class="venue-chapter" data-action="stamp" data-id="${s.id}">
            ${appContext.format.art(s)}<span style="flex:1"
              ><small>这次到访，可以收藏</small>
              <h3>${s.title}</h3>
              <p>
                ${s.kind} ·
                ${owned ? '已在你的护照里' : s.limit ? `限量 ${s.limit} 枚` : '现场领取'}
              </p></span
            >${appContext.format.icon('chevron')}
          </button>
          <div id="page-actions"></div>
        </div>
        <div class="info-row">
          ${appContext.format.icon('book')}
          <div>正在展出：${v.exhibit}<small>留一点时间，慢慢看一场展。</small></div>
        </div>
        <div class="info-row">
          ${appContext.format.icon('clock')}
          <div>周二至周日 09:00–17:00<small>16:30 停止入馆 · 示例开放信息</small></div>
        </div>
        <div class="info-row">
          ${appContext.format.icon('pin')}
          <div>${v.location}<small>纪念章领取点位于场馆内部</small></div>
          <button data-action="guide">查看位置</button>
        </div>
        ${appContext.views.renderGuestbook(v)}
        <p class="venue-disclaimer">纪念章用于保存参观经历；入馆预约需通过场馆渠道另行完成。</p>
      </div>
    </section>`;
  }
  return {
    venueRows,
    venueCard,
    renderDiscover,
    renderVenue,
  };
}
