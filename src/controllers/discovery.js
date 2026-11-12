/** Application module. Dependencies are provided by createApp(). */
export function createDiscoveryController(appContext) {
  function updateSearch() {
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
  return {
    updateSearch,
  };
}
