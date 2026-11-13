/** Page rendering. Dependencies are provided by createApp(). */
export function createMapViews(appContext) {
  // The two invented cities on one drawn map, 360 across and 540 down: 云川 among the hills where
  // the river rises, 临江 where it runs out into the sea. Land is the grey of the box, roads are
  // white, water is a pale blue; the band at the top stays clear for the panel laid over it. It is
  // a sketch to find the venues on, not the map of any real place, so it is free to stretch: the
  // sheet takes whatever room the screen has, and the drawing is pulled to fit it.
  const art = /* HTML */ `<svg
    class="map-art"
    viewBox="0 0 360 540"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g fill="none" stroke="#dde3ec">
      <ellipse cx="276" cy="130" rx="76" ry="58" transform="rotate(-14 276 130)" />
      <ellipse cx="274" cy="133" rx="55" ry="41" transform="rotate(-10 274 133)" />
      <ellipse cx="270" cy="137" rx="34" ry="25" transform="rotate(-6 270 137)" />
      <ellipse cx="74" cy="156" rx="84" ry="60" transform="rotate(12 74 156)" />
      <ellipse cx="80" cy="160" rx="61" ry="42" transform="rotate(16 80 160)" />
      <ellipse cx="87" cy="165" rx="37" ry="25" transform="rotate(20 87 165)" />
      <path d="M-10 60C40 32 70 64 112 46S190 22 232 48 320 32 370 56" />
      <path d="M-10 82C50 60 96 88 150 70S250 56 300 78 350 70 370 80" />
    </g>
    <path
      d="M196-10C188 40 150 60 156 110 162 160 178 176 170 214 160 262 132 280 140 322 146 352 158 372 160 400"
      fill="none"
      stroke="#d7e4fb"
      stroke-width="13"
      stroke-linecap="round"
    />
    <path
      d="M150 388C140 420 96 440 60 470 36 490 10 500-10 506V550H370V486C340 492 316 500 292 496 262 490 236 452 214 428 196 408 178 396 170 388Z"
      fill="#d7e4fb"
    />
    <path
      d="M136 462C134 442 156 430 180 432 204 434 222 446 218 466 214 484 190 492 168 490 150 488 138 478 136 462Z"
      fill="#f3f5f9"
    />
    <g fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round">
      <path d="M14 208C80 216 130 206 200 196S310 204 348 198" />
      <path d="M128 124C134 170 122 220 128 268" />
      <path d="M238 176C246 220 236 262 250 296" />
      <path d="M12 346C80 352 140 344 214 336S320 342 350 334" />
      <path d="M56 300C62 350 50 400 44 452" />
      <path d="M268 296C262 360 270 420 300 476" />
      <path d="M176 296C190 330 230 380 330 396" />
      <path d="M212 456C224 450 234 446 250 440" />
    </g>
    <g fill="none" stroke="#bcd0f5" stroke-width="1.2" stroke-linecap="round">
      <path d="M40 522q6-5 12 0t12 0" />
      <path d="M118 514q6-5 12 0t12 0" />
      <path d="M306 524q6-5 12 0t12 0" />
      <path d="M92 480q5-4 10 0t10 0" />
    </g>
  </svg>`;
  // What is set on the drawing, a mark or a name, says where in the drawing's own units; the
  // stylesheet turns that into a place on the sheet as it stands.
  const place = ([x, y]) => `--x:${x};--y:${y}`;
  // The names of the two cities are lettering, not drawing: they keep their shape when the map
  // is pulled.
  const cities = [
    ['云川', 'YUNCHUAN', [322, 250]],
    ['临江', 'LINJIANG', [320, 366]],
  ]
    .map(
      ([name, latin, at]) =>
        `<span class="map-city" style="${place(at)}" aria-hidden="true">${name}<i>${latin}</i></span>`,
    )
    .join('');
  // The destinations as marks on the map. Each mark is the venue's own stamp: in colour once it
  // is collected, dimmed in a dashed ring while it waits, as its place in the album is. Search,
  // city and category do not remove a mark; the ones they leave out fade back.
  function renderVenueMap() {
    const shown = new Set(appContext.selectors.filteredVenues().map((v) => v.id));
    if (!shown.has(appContext.ui.mapVenue)) appContext.ui.mapVenue = null;
    return /* HTML */ `<div id="venue-map" class="venue-map" role="group" aria-label="目的地地图">
      <div class="map-panel" aria-live="polite">${mapPanel()}</div>
      ${art}${cities}${appContext.catalog.venues.map((v) => mapPin(v, shown.has(v.id))).join('')}
    </div>`;
  }
  function mapPin(v, shown) {
    const owned = !!appContext.data.records[v.id],
      wanted = appContext.data.wanted.includes(v.id),
      selected = appContext.ui.mapVenue === v.id;
    return /* HTML */ `<button
      class="map-pin ${owned ? 'owned' : ''} ${selected ? 'selected' : ''} ${shown ? '' : 'dim'}"
      style="${place(v.at)}"
      data-action="map-pin"
      data-id="${v.id}"
      aria-pressed="${selected}"
      aria-label="${v.name}，${owned ? '馆章已收藏' : wanted ? '想去' : '馆章待收藏'}"
      ${shown ? '' : 'inert'}
    >
      <span class="pin-seal"
        >${appContext.format.art(v)}${
          owned
            ? `<i class="pin-mark">${appContext.format.icon('check')}</i>`
            : wanted
              ? `<i class="pin-mark want">${appContext.format.icon('heart')}</i>`
              : ''
        }</span
      ><span class="pin-name">${v.name}</span>
    </button>`;
  }
  // Over the top of the map: how much of it is lit and what the marks mean, or, once a mark is
  // chosen, that venue as a card that opens it. Should the screen be too short for the whole map,
  // it stays in view while the map scrolls under it.
  function mapPanel() {
    const v = appContext.catalog.venues.find((item) => item.id === appContext.ui.mapVenue),
      list = appContext.selectors.filteredVenues();
    if (v) {
      const photo = appContext.assets.venueThumbs[v.id],
        owned = !!appContext.data.records[v.id];
      return /* HTML */ `<button class="map-card" data-action="venue" data-id="${v.id}">
        <span class="map-thumb"
          >${photo ? `<img src="${photo}" alt="" />` : appContext.format.art(v)}</span
        ><span class="map-copy"
          ><strong>${v.name}</strong><small>${v.city} · ${v.exhibit}</small
          ><small class="map-state"
            >${owned ? '馆章已收藏' : `${appContext.data.wanted.includes(v.id) ? '想去 · ' : ''}到馆可领取「${v.stamp}」`}</small
          ></span
        >${appContext.format.icon('chevron')}
      </button>`;
    }
    if (!list.length)
      return /* HTML */ `<div class="map-summary">
        <strong>暂时没有找到这一站</strong
        ><button data-action="clear-filters">查看全部目的地</button>
      </div>`;
    return /* HTML */ `<div class="map-summary">
      <strong
        >已点亮 <b>${list.filter((item) => appContext.data.records[item.id]).length}</b> /
        ${list.length}</strong
      ><span class="map-legend"
        ><i class="owned">${appContext.format.icon('check')}</i>已收藏<i class="open"></i>待出发<i
          class="want"
          >${appContext.format.icon('heart')}</i
        >想去</span
      >
    </div>`;
  }
  return {
    renderVenueMap,
    mapPanel,
  };
}
