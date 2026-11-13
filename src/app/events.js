import { createPageActions } from '../actions/pages.js';
import { createPassportActions, createPassportFields } from '../actions/passport.js';
import { createDiscoveryActions, createDiscoveryFields } from '../actions/discovery.js';
import { createClaimActions, createClaimFields } from '../actions/claims.js';
import { createSharingActions, createSharingFields } from '../actions/sharing.js';
import { createCommunityActions, createCommunityFields } from '../actions/community.js';
import { createDemoActions } from '../actions/demo.js';

/**
 * Registers listeners once and returns a teardown for development reloads. A click on a button
 * runs the action its `data-action` names, and a field does the same as it is typed in or
 * changed; both are grouped by feature in `actions/`.
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
  const fields = {
    ...createPassportFields(appContext),
    ...createDiscoveryFields(appContext),
    ...createClaimFields(appContext),
    ...createSharingFields(appContext),
    ...createCommunityFields(appContext),
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
  // A field that is typed in or changed runs what its `data-input` or `data-change` names.
  const onField = (event) => fields[event.target.dataset?.[event.type]]?.(event.target);
  listen(document, 'input', onField);
  listen(document, 'change', onField);
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
