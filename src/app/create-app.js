import { APP_CONFIG } from '../config.js';
import * as catalog from '../data/catalog.js';
import { createDemoData } from '../data/demo-data.js';
import { visitKey, hashIdentity, ensureVisit, normalizeData } from '../domain/visits.js';
import { TicketMedia } from '../storage/ticket-media.js';
import { TicketEditor } from '../lib/ticket-editor.js';
import * as images from '../lib/images.js';
import { createPresentation } from '../lib/presentation.js';
import { createUiState, createRuntimeState } from '../state/state.js';
import { bindEvents } from './events.js';
import atlas from '../assets/collectible-atlas.png';
import hero from '../assets/museum-courtyard.png';
import { createMetadataStorage } from '../storage/metadata.js';
import { createQueries } from '../state/queries.js';
import { createNavigation } from '../app/navigation.js';
import { createFeedback } from '../ui/feedback.js';
import { createShellViews } from '../views/shell.js';
import { createPassportViews } from '../views/passport.js';
import { createStampViews } from '../views/stamps.js';
import { createScanViews } from '../views/scan.js';
import { createTicketViews } from '../views/tickets.js';
import { createDiscoveryViews } from '../views/discovery.js';
import { createVisitViews } from '../views/visits.js';
import { createSharingViews } from '../views/sharing.js';
import { createRenderer } from '../app/render.js';
import { createDiscoveryController } from '../controllers/discovery.js';
import { createDialogController } from '../controllers/dialogs.js';
import { createClaimController } from '../controllers/claims.js';
import { createMemoryController } from '../controllers/memories.js';
import { createShareCardService } from '../services/share-card.js';

/** Composition root. Modules use the same context so replacing demo data stays consistent. */
export function createApp() {
  const appContext = {
    config: APP_CONFIG,
    catalog,
    fixtures: { initialData: createDemoData },
    domain: { key: visitKey, hash: hashIdentity, ensure: ensureVisit, normalize: normalizeData },
    media: new TicketMedia(),
    TicketEditor,
    images,
    assets: { atlas, hero },
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
  Object.assign((appContext.navigation ||= {}), createNavigation(appContext));
  Object.assign((appContext.feedback ||= {}), createFeedback(appContext));
  Object.assign((appContext.views ||= {}), createShellViews(appContext));
  Object.assign((appContext.views ||= {}), createPassportViews(appContext));
  Object.assign((appContext.views ||= {}), createStampViews(appContext));
  Object.assign((appContext.views ||= {}), createScanViews(appContext));
  Object.assign((appContext.views ||= {}), createTicketViews(appContext));
  Object.assign((appContext.views ||= {}), createDiscoveryViews(appContext));
  Object.assign((appContext.views ||= {}), createVisitViews(appContext));
  Object.assign((appContext.views ||= {}), createSharingViews(appContext));
  Object.assign(appContext, createRenderer(appContext));
  Object.assign((appContext.discovery ||= {}), createDiscoveryController(appContext));
  Object.assign((appContext.dialogs ||= {}), createDialogController(appContext));
  Object.assign((appContext.claims ||= {}), createClaimController(appContext));
  Object.assign((appContext.memories ||= {}), createMemoryController(appContext));
  Object.assign((appContext.sharing ||= {}), createShareCardService(appContext));
  appContext.data = appContext.storage.readData();
  document.documentElement.style.setProperty('--badge-atlas-url', 'url("' + atlas + '")');
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
      appContext.runtime.claimToken++;
      appContext.runtime.ticketToken++;
      appContext.dialogs.closeModal(false);
      for (const id of appContext.media.urls.keys()) appContext.media.revoke(id);
    },
  };
}
