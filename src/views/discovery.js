import { safe, icon, art } from '../lib/format.js';

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
          >${art(appContext.catalog.stampOf(v))}${owned ? `<span class="venue-status" role="img" aria-label="馆章已收藏">${icon('check')}</span>` : ''}</span
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
        ${icon('search')}<label class="sr-only" for="venue-search">搜索场馆或展览</label
        ><input
          id="venue-search"
          data-input="search"
          type="search"
          placeholder="每一次探索，都值得留下印记"
          value="${safe(appContext.ui.query)}"
          autocomplete="off"
        /><button
          class="icon-button"
          data-action="clear-search"
          aria-label="清空搜索"
          ${appContext.ui.query ? '' : 'hidden'}
        >
          ${icon('close')}
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
  // In the header: the change between the list and the map, and the city.
  function discoverTools() {
    const map = appContext.ui.discoverView === 'map';
    return `<button class="ticket-home-entry view-toggle" data-action="discover-view">${icon(map ? 'list' : 'map')}${map ? '列表' : '地图'}</button><button class="city-button" data-action="choose-city">${icon('pin')}${safe(appContext.ui.city)}${icon('chevron')}</button>`;
  }
  function cityDialog() {
    return {
      title: '选择下一站的城市',
      body: `<div class="choice-list">${['全部城市', ...appContext.catalog.cities].map((city) => `<button data-action="set-city" data-value="${city}" class="${appContext.ui.city === city ? 'active' : ''}">${city}${appContext.ui.city === city ? icon('check') : ''}</button>`).join('')}</div>`,
    };
  }
  // Where in the venue in view its stamp is collected, on a sketch of the floor.
  function guideDialog() {
    const venue = appContext.selectors.venue();
    return {
      title: '找到这枚纪念章',
      body: /* HTML */ `<p class="modal-sub">${venue.name} · 示例楼层指引</p>
        <svg
          class="guide-map"
          viewBox="0 0 340 180"
          role="img"
          aria-label="从入口经过大厅，到参观出口的纪念章台"
        >
          <rect
            x="20"
            y="23"
            width="300"
            height="134"
            rx="8"
            fill="var(--paper)"
            stroke="var(--line-strong)"
          />
          <path d="M127 23v57h70v-57M127 157V99h70v58" stroke="var(--line-strong)" fill="none" />
          <path
            d="M55 116h72V90h92v27h47"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-dasharray="5 5"
            fill="none"
          />
          <circle cx="55" cy="116" r="5" fill="var(--accent-line)" stroke="none" />
          <circle cx="269" cy="117" r="11" fill="var(--accent)" stroke="none" />
          <path d="m264 117 3 3 6-6" stroke="var(--on-fill)" fill="none" stroke-width="2" />
          <text x="43" y="138">入口</text>
          <text x="145" y="58">公共大厅</text>
          <text x="220" y="138" class="guide-label">纪念章台</text>
          <text x="227" y="64">参观出口</text>
        </svg>
        <p class="guide-description">
          ${venue.location}。<br />参观结束后，寻找“旅行护照”领取标识。
        </p>
        <button class="button" data-action="close-modal">知道了</button>`,
    };
  }
  function venueActions() {
    const owned = appContext.selectors.owned(appContext.selectors.venue());
    return `<div class="page-actions"><button class="button" data-action="scan">${icon('scan')}${owned ? '再次到馆盖章' : '到馆领取纪念章'}</button></div>`;
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
      ${photo ? `<img class="venue-photo" src="${photo}" alt="${v.name}概念建筑">` : `<div class="venue-poster" data-word="${v.word}">${art(s)}</div>`}
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
            ${icon('heart')}想去
          </button>
        </div>
        <p class="venue-intro">${v.intro}</p>
        <div class="venue-stamp">
          <button class="venue-chapter" data-action="stamp" data-id="${s.id}">
            ${art(s)}<span style="flex:1"
              ><small>这次到访，可以收藏</small>
              <h3>${s.title}</h3>
              <p>
                ${s.kind} ·
                ${owned ? '已在你的护照里' : s.limit ? `限量 ${s.limit} 枚` : '现场领取'}
              </p></span
            >${icon('chevron')}
          </button>
          <div id="page-actions"></div>
        </div>
        <div class="info-row">
          ${icon('book')}
          <div>正在展出：${v.exhibit}<small>留一点时间，慢慢看一场展。</small></div>
        </div>
        <div class="info-row">
          ${icon('clock')}
          <div>周二至周日 09:00–17:00<small>16:30 停止入馆 · 示例开放信息</small></div>
        </div>
        <div class="info-row">
          ${icon('pin')}
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
    discoverTools,
    cityDialog,
    guideDialog,
    renderVenue,
    venueActions,
  };
}
