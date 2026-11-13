/** Application module. Dependencies are provided by createApp(). */
export function createFeedback(appContext) {
  function toast(message) {
    const node = document.getElementById('toast');
    clearTimeout(appContext.runtime.toastTimer);
    node.textContent = message;
    node.hidden = false;
    appContext.runtime.toastTimer = setTimeout(() => {
      node.hidden = true;
    }, 2700);
  }
  return {
    toast,
  };
}
