/**
 * What a page can be about, by the name its row in `screens.js` gives as `about`: a venue, a
 * stamp, a visit, a person or a post. `none` is for the pages that name nothing, which carry
 * along the last venue or stamp. A row says everything that differs with the kind of thing:
 *
 * - `of`, which answers what of a page's state names the thing. A scroll position belongs to it.
 * - `read`, which takes from the parts of an address what names the thing, where that is more
 *   than the venue or the stamp the page keeps.
 * - `take`, which answers the venue or the stamp a page keeps as `selected`, when it is gone to
 *   with an id or opened at an address that begins with one.
 * - `address`, which answers how the address names the thing, after the name of the page.
 * - `venue`, `stamp` and `visit`, which answer the ones in view, if there are any.
 *
 * Dependencies are provided by createApp().
 */
export function createSubjects(appContext) {
  // An id the catalogue does not know gives way to the demonstration's venue.
  const fallback = () => appContext.selectors.defaultVenue(),
    visit = () => appContext.data.visits[appContext.ui.visitKey];
  const none = {
    of: (page) => page.selected,
    take: (id) =>
      appContext.catalog.venue(id) || appContext.catalog.stamp(id) ? id : fallback().id,
    address: () => appContext.ui.selected,
    venue: () => appContext.catalog.venue(appContext.ui.selected),
    // The stamp every visitor of the venue can collect.
    stamp: () => appContext.catalog.stampOf(appContext.catalog.venue(appContext.ui.selected)),
    // The visit the stamp in view is being looked at for, once it is collected.
    visit() {
      const s = appContext.selectors.stamp(),
        r = s && appContext.data.records[s.id];
      return r ? appContext.selectors.visitForStamp(s, r) : null;
    },
  };
  // A collector's passport and a post keep the venue they were come to with, and show none.
  const nothing = { venue: () => undefined, stamp: () => undefined, visit: () => null };
  return {
    none,
    venue: { ...none, take: (id) => (appContext.catalog.venue(id) || fallback()).id },
    stamp: {
      ...none,
      take: (id) => (appContext.catalog.stamp(id) || appContext.catalog.stampOf(fallback())).id,
      venue: () => appContext.catalog.venueOf(appContext.catalog.stamp(appContext.ui.selected)),
      stamp: () => appContext.catalog.stamp(appContext.ui.selected),
    },
    // A visit is addressed by its venue and its day. The venue need not be one of the
    // catalogue's: the page keeps it for as long as the visit that is open is to it.
    visit: {
      ...none,
      of: (page) => page.visitKey,
      read([venueId, day]) {
        if (!day) return;
        appContext.ui.visitKey = appContext.domain.key(venueId, day);
        if (visit()) appContext.ui.visitDate = day;
      },
      take: (id) => (visit()?.venueId === id ? id : none.take(id)),
      address: () => `${appContext.ui.selected}${visit() ? '/' + visit().day : ''}`,
      venue: () => appContext.catalog.venue(visit()?.venueId),
      visit,
    },
    person: {
      ...none,
      ...nothing,
      of: (page) => page.person,
      read([id]) {
        appContext.ui.person = id;
      },
      address: () => appContext.ui.person,
    },
    // A post is addressed by its writer, its venue and the day of the visit.
    post: {
      ...none,
      ...nothing,
      of: (page) => page.post,
      read(parts) {
        appContext.ui.post = parts.join('/');
      },
      address: () => appContext.ui.post,
    },
  };
}
