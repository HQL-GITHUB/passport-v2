import { createPageActions } from '../actions/pages.js';
import { createPassportActions } from '../actions/passport.js';
import { createDiscoveryActions } from '../actions/discovery.js';
import { createClaimActions } from '../actions/claims.js';
import { createSharingActions } from '../actions/sharing.js';
import { createCommunityActions } from '../actions/community.js';
import { createDemoActions } from '../actions/demo.js';

/**
 * Registers listeners once and returns a teardown for development reloads. A click on a button
 * runs the action its `data-action` names; the actions are grouped by feature in `actions/`.
 */
export function bindEvents(appContext) {
  const disposers = [];
  function listen(target, event, handler, capture = false) {
    target.addEventListener(event, handler, capture);
    disposers.push(() => target.removeEventListener(event, handler, capture));
  }
  const actions = {
    ...createPageActions(appContext),
    ...createPassportActions(appContext),
    ...createDiscoveryActions(appContext),
    ...createClaimActions(appContext),
    ...createSharingActions(appContext),
    ...createCommunityActions(appContext),
    ...createDemoActions(appContext),
  };
  listen(document, 'click', async (event) => {
    const backdrop = event.target.closest('[data-modal-backdrop]');
    if (backdrop && event.target === backdrop) {
      appContext.dialogs.closeModal();
      return;
    }
    const button = event.target.closest('button[data-action]');
    // Before the passport has been loaded there is nothing for an action to act on.
    if (!button || button.disabled || !appContext.data) return;
    // Captured before the action changes anything, so the page left keeps its own state.
    appContext.navigation.rememberPage();
    await actions[button.dataset.action]?.(button, button.dataset.id || appContext.ui.selected);
  });
  listen(document, 'input', (event) => {
    if (event.target.id === 'venue-search') {
      appContext.ui.query = event.target.value;
      appContext.discovery.updateSearch();
    }
    if (event.target.id === 'memory-input')
      document.getElementById('note-count').textContent = event.target.value.length;
    if (
      ['ticket-custom-name', 'ticket-custom-city', 'ticket-custom-exhibit'].includes(
        event.target.id,
      ) &&
      appContext.ui.ticketDraft &&
      !appContext.data.tickets[appContext.ui.ticketDraft.id]
    ) {
      const prop = {
        'ticket-custom-name': 'customName',
        'ticket-custom-city': 'customCity',
        'ticket-custom-exhibit': 'customExhibit',
      }[event.target.id];
      appContext.ui.ticketDraft[prop] = event.target.value;
      appContext.claims.updateTicketConfirmation();
    }
  });
  // A switch of the visibility dialog. Notes and photographs are shown with the visits they
  // belong to, or not at all, so their switch follows the one of the footprints.
  async function changeVisibility(input) {
    const shown = await appContext.social.setVisibility(input.dataset.visibility, input.checked);
    if (!shown) {
      input.checked = !input.checked;
      return;
    }
    const memories = appContext.dom.modalRoot.querySelector('[data-visibility="memories"]');
    if (memories) {
      memories.checked = shown.memories;
      memories.disabled = !shown.footprints;
    }
    appContext.render(true);
  }
  listen(document, 'change', (event) => {
    if (event.target.id === 'photo-input') appContext.memories.preparePhoto(event.target.files[0]);
    if (['ticket-camera-input', 'ticket-album-input'].includes(event.target.id))
      appContext.claims.prepareTicketImage(event.target.files[0]);
    if (event.target.id === 'save-ticket-memory' && appContext.ui.ticketDraft) {
      appContext.ui.ticketDraft.saveTicket = event.target.checked;
      appContext.views.renderFooter();
    }
    if (event.target.id === 'share-ticket-select')
      appContext.dialogs.setupTicketEditor(event.target.value);
    if (event.target.dataset.visibility) changeVisibility(event.target);
    if (
      ['ticket-venue', 'ticket-date'].includes(event.target.id) &&
      appContext.ui.ticketDraft &&
      !appContext.ui.claimBusy
    ) {
      if (appContext.data.tickets[appContext.ui.ticketDraft.id]) return;
      if (event.target.id === 'ticket-venue')
        appContext.ui.ticketDraft.venueId = event.target.value;
      else appContext.ui.ticketDraft.visitedAt = event.target.value;
      appContext.claims.resetTicketSelection();
      if (event.target.id === 'ticket-venue') {
        appContext.ui.ticketError = '';
        appContext.render(true);
      } else appContext.claims.updateTicketConfirmation();
    }
    if (
      event.target.dataset.ticketReward &&
      appContext.ui.ticketDraft &&
      !appContext.ui.claimBusy
    ) {
      const id = event.target.dataset.ticketReward;
      if (
        !appContext.selectors.ticketRewards(appContext.ui.ticketDraft).some((v) => v.id === id) ||
        appContext.data.tickets[appContext.ui.ticketDraft.id]?.redeemed.includes(id)
      )
        return;
      appContext.ui.ticketDraft.selected = event.target.checked
        ? [...new Set([...appContext.ui.ticketDraft.selected, id])]
        : appContext.ui.ticketDraft.selected.filter((value) => value !== id);
      appContext.views.renderFooter();
    }
    if (event.target.dataset.option) {
      if (event.target.dataset.option === 'ticket') {
        if (event.target.checked) {
          event.target.checked = appContext.ui.includeTicket;
          appContext.dialogs.openModal('ticket-editor');
        } else {
          appContext.ui.includeTicket = false;
          appContext.ui.shareTicket = '';
          appContext.render(true);
        }
        return;
      }
      appContext.ui[event.target.dataset.option === 'note' ? 'includeNote' : 'includePhoto'] =
        event.target.checked;
      document.getElementById('share-card-preview').innerHTML = appContext.views.sharePaper();
    }
  });
  listen(document, 'keydown', (event) => {
    if (!appContext.runtime.modalState) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      appContext.dialogs.closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = [
      ...appContext.dom.modalRoot.querySelectorAll(
        'button:not([disabled]),textarea,input:not([type="file"])',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  // A photograph fades in once it has arrived. `load` does not bubble, so it is caught on its
  // way down.
  listen(
    document,
    'load',
    (event) => {
      if (!event.target.matches?.('img[data-fade]')) return;
      appContext.runtime.shownImages.add(event.target.getAttribute('src'));
      event.target.classList.add('shown');
    },
    true,
  );
  listen(window, 'popstate', () => appContext.data && appContext.navigation.restorePage());
  return () => disposers.reverse().forEach((dispose) => dispose());
}
