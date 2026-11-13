import { APP_CONFIG } from '../config.js';
import * as catalog from '../data/catalog.js';
import { createDemoData } from '../data/demo-data.js';
import { collectors, posts } from '../data/collectors.js';
import {
  visitKey,
  hashIdentity,
  issueNumber,
  ensureVisit,
  normalizeData,
} from '../domain/visits.js';
import { TicketMedia } from '../storage/ticket-media.js';
import { TicketEditor } from '../lib/ticket-editor.js';
import { MedalViewer } from '../lib/medal-viewer.js';
import { Carousel } from '../lib/carousel.js';
import { PageBook } from '../lib/page-flip.js';
import * as images from '../lib/images.js';
import { createPresentation } from '../lib/presentation.js';
import { createUiState, createRuntimeState } from '../state/state.js';
import { bindEvents } from './events.js';
import { assets } from '../data/assets.js';
import { createMetadataStorage } from '../storage/metadata.js';
import { createQueries } from '../state/queries.js';
import { createCommunityQueries } from '../state/community.js';
import { createNavigation } from '../app/navigation.js';
import { createFeedback } from '../ui/feedback.js';
import { createCeremony } from '../ui/ceremony.js';
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
import { createShareCardService } from '../services/share-card.js';

/** Composition root. Modules use the same context so replacing demo data stays consistent. */
export function createApp() {
  // The single-file build inlines every image as a data URL of several megabytes. Stylesheets
  // and the pages, which are written as HTML strings, refer to each by a short URL instead.
  const blobUrls = [],
    short = (src) => {
      const url = images.imageUrl(src);
      if (url !== src) blobUrls.push(url);
      return url;
    },
    shortAll = (map) =>
      Object.fromEntries(Object.entries(map).map(([id, src]) => [id, short(src)]));
  const appContext = {
    config: APP_CONFIG,
    catalog,
    fixtures: { initialData: createDemoData, collectors, posts },
    domain: {
      key: visitKey,
      hash: hashIdentity,
      issue: issueNumber,
      ensure: ensureVisit,
      normalize: normalizeData,
    },
    media: new TicketMedia(),
    TicketEditor,
    MedalViewer,
    Carousel,
    PageBook,
    images,
    assets: {
      ...assets,
      venues: shortAll(assets.venues),
      venueThumbs: shortAll(assets.venueThumbs),
    },
    ui: createUiState(),
    runtime: createRuntimeState(),
    dom: {
      app: document.getElementById('app'),
      header: document.getElementById('app-header'),
      main: document.getElementById('app-main'),
      footer: document.getElementById('app-footer'),
      modalRoot: document.getElementById('modal-root'),
    },
  };
  appContext.format = createPresentation(appContext);
  Object.assign((appContext.storage ||= {}), createMetadataStorage(appContext));
  Object.assign((appContext.selectors ||= {}), createQueries(appContext));
  Object.assign((appContext.selectors ||= {}), createCommunityQueries(appContext));
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
  Object.assign((appContext.sharing ||= {}), createShareCardService(appContext));
  appContext.data = appContext.storage.readData();
  // The stylesheet reads the stamp illustrations from custom properties: the atlas, and one for
  // each stamp that has an image of its own.
  for (const [name, src] of Object.entries({ atlas: assets.atlas, ...assets.badges }))
    document.documentElement.style.setProperty(`--badge-${name}-url`, `url("${short(src)}")`);
  const unbind = bindEvents(appContext);
  return {
    async start() {
      await appContext.media.load(appContext.data.tickets).finally(() => {
        appContext.navigation.routeFromLocation();
        appContext.render();
      });
    },
    destroy() {
      unbind();
      clearTimeout(appContext.runtime.toastTimer);
      appContext.ceremony.finish();
      appContext.runtime.pageMedal?.destroy();
      appContext.runtime.pageCarousel?.destroy();
      appContext.runtime.pageBook?.destroy();
      appContext.runtime.claimToken++;
      appContext.runtime.ticketToken++;
      appContext.dialogs.closeModal(false);
      for (const id of appContext.media.urls.keys()) appContext.media.revoke(id);
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
