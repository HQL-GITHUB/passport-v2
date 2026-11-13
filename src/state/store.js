import { createCatalog } from '../domain/catalog.js';

/**
 * The passport's data as the pages read it, and the one way to change it. `appContext.data` is a
 * copy of what the backend keeps: it changes only when the backend has answered a command.
 */
export function createStore(appContext) {
  // Everything the pages are drawn from: the catalogue, the other collectors and the holder's
  // passport.
  async function load() {
    const [catalog, community, data] = await Promise.all([
      appContext.api.loadCatalog(),
      appContext.api.loadCommunity(),
      appContext.api.load(),
    ]);
    appContext.catalog = createCatalog(catalog);
    appContext.community = community;
    appContext.data = data;
  }
  // Sends a command to the backend and takes its answer into the data. A command that fails
  // rejects, and the data stays as it was.
  async function send(command, ...args) {
    const { data, persisted = true, ...result } = await appContext.api[command](...args);
    if (data) appContext.data = { ...appContext.data, ...data };
    if (!persisted) appContext.feedback.toast('本次记录已保留，浏览器暂未允许长期保存');
    return { ...result, persisted };
  }
  // The same, for a change that has nothing of its own to do when it fails: it says so, and
  // answers null.
  async function attempt(command, ...args) {
    try {
      return await send(command, ...args);
    } catch {
      appContext.feedback.toast('暂时没有保存成功，请再试一次');
      return null;
    }
  }
  return { load, send, attempt };
}
