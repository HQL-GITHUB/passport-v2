/** What the buttons of the discover page and of a venue do. */
export function createDiscoveryActions(appContext) {
  return {
    'discover-view'() {
      appContext.ui.discoverView = appContext.ui.discoverView === 'map' ? 'list' : 'map';
      appContext.ui.mapVenue = null;
      appContext.render();
      appContext.dom.main.scrollTop = 0;
    },
    'map-pin': (button) => appContext.discovery.chooseVenue(button.dataset.id),
    'choose-city': () => appContext.dialogs.openModal('city'),
    'set-city'(button) {
      appContext.ui.city = button.dataset.value;
      appContext.dialogs.closeModal(false);
      appContext.render();
      appContext.dom.main.scrollTop = 0;
    },
    category(button) {
      appContext.ui.category = button.dataset.value;
      appContext.render(true);
    },
    'clear-search'() {
      appContext.ui.query = '';
      const input = document.getElementById('venue-search');
      input.value = '';
      appContext.discovery.updateSearch();
      input.focus();
    },
    'clear-filters'() {
      appContext.ui.query = '';
      appContext.ui.category = 'all';
      appContext.ui.city = '全部城市';
      appContext.render();
    },
    guide: () => appContext.dialogs.openModal('guide'),
    async want(button) {
      const wanted = await appContext.discovery.toggleWanted(appContext.ui.selected);
      if (wanted === null) return;
      button.classList.toggle('saved', wanted);
      button.setAttribute('aria-pressed', String(wanted));
      button.setAttribute('aria-label', wanted ? '取消想去收藏' : '收藏为想去');
      appContext.feedback.toast(wanted ? '已加入想去，留给下一次出发' : '已从想去中移除');
    },
  };
}

/** What the fields of the discover page do as they are typed in. */
export function createDiscoveryFields(appContext) {
  return {
    search(input) {
      appContext.ui.query = input.value;
      appContext.discovery.updateSearch();
    },
  };
}
