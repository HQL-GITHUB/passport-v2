/** Page rendering. Dependencies are provided by createApp(). */
export function createDiscoveryViews(appContext) {
  function venueRows() {
    const list = appContext.selectors.filteredVenues();
    if (!list.length)
      return /* HTML */ `<div class="empty-state">
        <h3>暂时没有找到这一站</h3>
        <p>试试其他关键词，或换一个城市看看。</p>
        <button class="button secondary" data-action="clear-filters">查看全部目的地</button>
      </div>`;
    return list
      .map(
        (v) =>
          /* HTML */ `<button class="venue-card" data-action="venue" data-id="${v.id}">
            <span class="venue-thumb">${appContext.format.art(v)}</span
            ><span class="venue-copy"
              ><h3>${v.name}</h3>
              <p>${v.city} · ${v.exhibit}</p>
              <span class="venue-status ${appContext.data.records[v.id] ? 'owned' : ''}"
                >${appContext.format.icon(appContext.data.records[v.id] ? 'check' : 'pin')}${appContext.data.records[v.id] ? '馆章已收藏' : '到馆可领取纪念章'}</span
              ></span
            >${appContext.format.icon('chevron')}
          </button>`,
      )
      .join('');
  }
  function renderDiscover() {
    return /* HTML */ `<section class="page discover-page screen-enter">
      <p class="eyebrow">THE NEXT CHAPTER</p>
      <h1 class="page-title">下一站，去看什么？</h1>
      <div class="search-box">
        ${appContext.format.icon('search')}<label class="sr-only" for="venue-search"
          >搜索场馆或展览</label
        ><input
          id="venue-search"
          type="search"
          placeholder="搜索场馆、展览或城市"
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
      <div
        class="discover-hero"
        ${appContext.ui.query || appContext.ui.category !== 'all' || appContext.ui.city === '云川' ? 'hidden' : ''}
      >
        <img src="${appContext.assets.hero}" alt="虚构博物馆的弧形建筑与雕塑庭院" />
        <div class="hero-copy">
          <small>THIS MONTH / 本月灵感</small>
          <h2>从一件器物，<br />读一座城。</h2>
          <p>临江博物馆 · 器物与时间</p>
          <button
            class="hero-open"
            data-action="venue"
            data-id="museum"
            aria-label="查看临江博物馆"
          >
            ${appContext.format.icon('up-right')}
          </button>
        </div>
      </div>
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
      <div class="row">
        <h2 class="section-title">值得出发的地方</h2>
        <span id="venue-count" class="section-count"
          >${appContext.selectors.filteredVenues().length} 个目的地</span
        >
      </div>
      <div id="venue-list" class="venue-list" aria-live="polite">
        ${appContext.views.venueRows()}
      </div>
      <p class="foot-hint">所有场馆及开放信息均为原型演示内容</p>
    </section>`;
  }
  function renderVenue() {
    const v = appContext.catalog.byId(appContext.ui.selected),
      owned = !!appContext.data.records[v.id];
    return /* HTML */ `<section class="page venue-page screen-enter">
      ${v.id === 'museum' ? `<img class="venue-photo" src="${appContext.assets.hero}" alt="概念博物馆建筑庭院">` : `<div class="venue-poster" data-word="${v.word}">${appContext.format.art(v)}</div>`}
      <div class="venue-inner">
        <p class="venue-category">${v.city} / ${v.type}</p>
        <h1 class="venue-title">${v.name}</h1>
        <p class="venue-intro">${v.intro}</p>
        <button class="venue-chapter" data-action="stamp">
          ${appContext.format.art(v)}<span style="flex:1"
            ><small>这次到访，可以收藏</small>
            <h3>${v.stamp}</h3>
            <p>${v.kind} · ${owned ? '已在你的护照里' : '现场领取'}</p></span
          >${appContext.format.icon('chevron')}
        </button>
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
        <p class="subtitle" style="font-size:10px;margin-top:14px">
          纪念章用于保存参观经历；入馆预约需通过场馆渠道另行完成。
        </p>
      </div>
    </section>`;
  }
  return {
    venueRows,
    renderDiscover,
    renderVenue,
  };
}
