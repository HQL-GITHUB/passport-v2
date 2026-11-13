/** Application module. Dependencies are provided by createApp(). */
export function createMetadataStorage(appContext) {
  function readData() {
    let raw;
    try {
      raw = JSON.parse(
        localStorage.getItem(appContext.config.storageKey) ||
          localStorage.getItem(appContext.config.legacyStorageKey),
      );
    } catch {}
    if (!raw || ![2, 3].includes(raw.version)) {
      raw = appContext.fixtures.initialData();
      raw.tickets['demo-artmuseum-2026-10-24'] = {
        venueId: 'artmuseum',
        visitedAt: '2026-10-24',
        receivedAt: '2026-10-24',
        redeemed: ['artmuseum'],
        saved: true,
        kind: 'sample',
      };
      raw.tickets['demo-museum-2025-10-10'] = {
        venueId: 'museum',
        visitedAt: '2025-10-10',
        receivedAt: '2025-10-10',
        redeemed: ['museum-exhibition'],
        saved: true,
        kind: 'sample',
      };
    }
    // The demonstration passport shows its album, so its holder has a place on the boards. A
    // passport started from nothing shows nothing until its holder says so.
    raw.profile ||= { public: { album: true } };
    return appContext.domain.normalize(
      raw,
      appContext.catalog.venues,
      appContext.catalog.stamps,
      appContext.format.validDay,
    );
  }
  function persist() {
    if (appContext.ui.firstMode) return true;
    try {
      localStorage.setItem(appContext.config.storageKey, JSON.stringify(appContext.data));
      return true;
    } catch {
      appContext.feedback.toast('本次记录已保留，浏览器暂未允许长期保存');
      return false;
    }
  }
  return {
    readData,
    persist,
  };
}
