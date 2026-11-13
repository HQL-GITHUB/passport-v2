/** Application module. Dependencies are provided by createApp(). */
export function createDiscoveryController(appContext) {
  function updateSearch() {
    if (document.getElementById('venue-map')) {
      document.querySelector('[data-action="clear-search"]').hidden = !appContext.ui.query;
      syncMap();
      return;
    }
    const list = document.getElementById('venue-list');
    if (!list) return;
    list.innerHTML = appContext.views.venueRows();
    document.getElementById('venue-count').textContent =
      `${appContext.selectors.filteredVenues().length} 个目的地`;
    document.querySelector('[data-action="clear-search"]').hidden = !appContext.ui.query;
    const hero = document.querySelector('.discover-hero');
    if (hero) hero.hidden = appContext.selectors.heroHidden();
    appContext.runtime.pageCarousel?.sync();
  }
  // A mark on the map is chosen by a tap, and let go by another.
  function chooseVenue(id) {
    appContext.ui.mapVenue = appContext.ui.mapVenue === id ? null : id;
    syncMap();
  }
  // Brings the map in line with the search and the chosen venue where it stands: the marks keep
  // their places and the focus stays on the one that was pressed.
  function syncMap() {
    const map = document.getElementById('venue-map');
    if (!map) return;
    const shown = new Set(appContext.selectors.filteredVenues().map((v) => v.id));
    if (!shown.has(appContext.ui.mapVenue)) appContext.ui.mapVenue = null;
    for (const pin of map.querySelectorAll('.map-pin')) {
      const selected = pin.dataset.id === appContext.ui.mapVenue;
      pin.classList.toggle('selected', selected);
      pin.setAttribute('aria-pressed', String(selected));
      pin.classList.toggle('dim', !shown.has(pin.dataset.id));
      pin.inert = !shown.has(pin.dataset.id);
    }
    map.querySelector('.map-panel').innerHTML = appContext.views.mapPanel();
  }
  return {
    updateSearch,
    chooseVenue,
  };
}
