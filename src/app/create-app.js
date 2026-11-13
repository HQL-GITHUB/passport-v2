import { APP_CONFIG } from '../config.js';
import { createCatalog } from '../domain/catalog.js';
import { visitKey, hashIdentity, isValidDay } from '../domain/visits.js';
import { eligibleStamps } from '../domain/claims.js';
import { createLocalApi } from '../api/local/index.js';
import { createClock } from '../lib/clock.js';
import { TicketMedia } from '../api/local/ticket-media.js';
import { TicketEditor } from '../lib/ticket-editor.js';
import { MedalViewer } from '../lib/medal-viewer.js';
import { Carousel } from '../lib/carousel.js';
import { PageBook } from '../lib/page-flip.js';
import * as images from '../lib/images.js';
import { createUiState, createRuntimeState } from '../state/state.js';
import { bindEvents } from './events.js';
import { assets } from '../assets/index.js';
import { createStore } from '../state/store.js';
import { createSelectors } from '../state/selectors.js';
import { createCommunitySelectors } from '../state/community.js';
import { createScreens } from '../app/screens.js';
import { createNavigation } from '../app/navigation.js';
import { createFeedback } from '../controllers/feedback.js';
import { createCeremony } from '../controllers/ceremony.js';
import { createShellViews } from '../views/shell.js';
import { createPassportViews } from '../views/passport.js';
import { createStampViews } from '../views/stamps.js';
import { createScanViews } from '../views/scan.js';
import { createTicketViews } from '../views/tickets.js';
import { createDiscoveryViews } from '../views/discovery.js';
import { createVisitViews } from '../views/visits.js';
import { createSharingViews } from '../views/sharing.js';
import { createCollectorViews } from '../views/collectors.js';
import { createMapViews } from '../views/map.js';
import { createSquareViews } from '../views/square.js';
import { createRenderer } from '../app/render.js';
import { createDiscoveryController } from '../controllers/discovery.js';
import { createDialogController } from '../controllers/dialogs.js';
import { createClaimController } from '../controllers/claims.js';
import { createMemoryController } from '../controllers/memories.js';
import { createSocialController } from '../controllers/social.js';
import { createShareCardService } from '../controllers/share-card.js';

/** Composition root. Modules use the same context so replacing demo data stays consistent. */
export function createApp() {
  // The single-file build inlines every image as a data URL of several megabytes. The
  // stylesheet refers to each by a short URL instead.
  const urls = images.createImageUrls();
  const clock = createClock(APP_CONFIG.demoDate),
    media = new TicketMedia(APP_CONFIG.mediaDbName);
  const appContext = {
    config: APP_CONFIG,
    clock,
    domain: {
      key: visitKey,
      hash: hashIdentity,
      validDay: (value) => isValidDay(value, clock.today()),
      eligible: eligibleStamps,
    },
    // The backend. Everything the passport keeps is read and changed through it; a server-backed
    // implementation of the same methods takes its place here.
    api: createLocalApi({
      config: APP_CONFIG,
      clock,
      media,
      photos: { venues: assets.venues, venueThumbs: assets.venueThumbs },
    }),
    // The images of saved tickets, by ticket.
    media,
    // What the backend last answered, which `store` loads and changes: the venues and stamps,
    // the other collectors with their posts, and the holder's passport.
    catalog: createCatalog(),
    community: { collectors: [], posts: [] },
    data: null,
    TicketEditor,
    MedalViewer,
    Carousel,
    PageBook,
    images,
    assets,
    ui: createUiState(APP_CONFIG),
    runtime: createRuntimeState(),
    dom: {
      app: document.getElementById('app'),
      header: document.getElementById('app-header'),
      main: document.getElementById('app-main'),
      footer: document.getElementById('app-footer'),
      modalRoot: document.getElementById('modal-root'),
    },
  };
  Object.assign((appContext.store ||= {}), createStore(appContext));
  Object.assign((appContext.selectors ||= {}), createSelectors(appContext));
  Object.assign((appContext.selectors ||= {}), createCommunitySelectors(appContext));
  Object.assign((appContext.screens ||= {}), createScreens(appContext));
  Object.assign((appContext.navigation ||= {}), createNavigation(appContext));
  Object.assign((appContext.feedback ||= {}), createFeedback(appContext));
  Object.assign((appContext.ceremony ||= {}), createCeremony(appContext));
  Object.assign((appContext.views ||= {}), createShellViews(appContext));
  Object.assign((appContext.views ||= {}), createPassportViews(appContext));
  Object.assign((appContext.views ||= {}), createStampViews(appContext));
  Object.assign((appContext.views ||= {}), createScanViews(appContext));
  Object.assign((appContext.views ||= {}), createTicketViews(appContext));
  Object.assign((appContext.views ||= {}), createDiscoveryViews(appContext));
  Object.assign((appContext.views ||= {}), createVisitViews(appContext));
  Object.assign((appContext.views ||= {}), createSharingViews(appContext));
  Object.assign((appContext.views ||= {}), createCollectorViews(appContext));
  Object.assign((appContext.views ||= {}), createMapViews(appContext));
  Object.assign((appContext.views ||= {}), createSquareViews(appContext));
  Object.assign(appContext, createRenderer(appContext));
  Object.assign((appContext.discovery ||= {}), createDiscoveryController(appContext));
  Object.assign((appContext.dialogs ||= {}), createDialogController(appContext));
  Object.assign((appContext.claims ||= {}), createClaimController(appContext));
  Object.assign((appContext.memories ||= {}), createMemoryController(appContext));
  Object.assign((appContext.social ||= {}), createSocialController(appContext));
  Object.assign((appContext.sharing ||= {}), createShareCardService(appContext));
  // The stylesheet reads the stamp illustrations from custom properties: the atlas, and one for
  // each stamp that has an image of its own.
  for (const [name, src] of Object.entries({ atlas: assets.atlas, ...assets.badges }))
    document.documentElement.style.setProperty(`--badge-${name}-url`, `url("${urls.short(src)}")`);
  const unbind = bindEvents(appContext);
  let waiting;
  // Nothing can be drawn before the backend has answered. A wait that can be felt says so; one
  // that fails says that, and offers to try again. Until then the buttons do nothing.
  async function start() {
    waiting = setTimeout(() => {
      appContext.dom.main.innerHTML =
        '<div class="empty-state"><p role="status">正在打开护照…</p></div>';
    }, 400);
    try {
      await appContext.store.load();
    } catch (error) {
      console.error('Passport initialization failed', error);
      clearTimeout(waiting);
      appContext.dom.main.innerHTML =
        '<div class="empty-state" role="alert"><h3>护照暂时没能打开</h3><p>请检查网络后再试一次。</p><button class="button">重试</button></div>';
      appContext.dom.main.querySelector('button').addEventListener('click', start, { once: true });
      return;
    }
    clearTimeout(waiting);
    appContext.navigation.routeFromLocation();
    appContext.render();
  }
  return {
    start,
    destroy() {
      unbind();
      clearTimeout(waiting);
      clearTimeout(appContext.runtime.toastTimer);
      appContext.ceremony.finish();
      appContext.clearPage();
      appContext.claims.cancel();
      appContext.dialogs.closeModal(false);
      for (const id of appContext.media.urls.keys()) appContext.media.revoke(id);
      urls.dispose();
      appContext.api.dispose();
    },
  };
}
