/** Application module. Dependencies are provided by createApp(). */
export function createMemoryController(appContext) {
  async function preparePhoto(file) {
    if (!file || !appContext.runtime.modalState || appContext.runtime.modalState.kind !== 'memory')
      return;
    const state = appContext.runtime.modalState,
      error = document.getElementById('memory-error');
    error.hidden = true;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      error.textContent = '请选择 10 MB 以内的 JPG、PNG 或 WebP 照片。';
      error.hidden = false;
      return;
    }
    state.photoBusy = true;
    document.getElementById('photo-status').hidden = false;
    appContext.dom.modalRoot.querySelector('[data-action="save-memory"]').disabled = true;
    let url;
    try {
      url = URL.createObjectURL(file);
      const img = await appContext.images.loadImage(url);
      const ratio = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.8);
      if (appContext.runtime.modalState !== state) return;
      state.draftPhoto = photo;
      document.getElementById('photo-draft').innerHTML =
        `<img class="photo-edit-preview" src="${photo}" alt="待保存的参观照片"><button class="remove-photo" data-action="remove-photo">移除这张照片</button>`;
    } catch {
      if (appContext.runtime.modalState === state) {
        error.textContent = '这张照片未能读取，请换一张试试。';
        error.hidden = false;
      }
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (appContext.runtime.modalState === state) {
        state.photoBusy = false;
        document.getElementById('photo-status').hidden = true;
        appContext.dom.modalRoot.querySelector('[data-action="save-memory"]').disabled = false;
      }
    }
  }
  // Keeps what the open dialog holds with its visit. Answers whether it was kept.
  async function saveMemory() {
    const state = appContext.runtime.modalState;
    if (state?.kind !== 'memory' || state.photoBusy) return false;
    const saved = await appContext.store.attempt('saveMemory', state.visitKey, {
      note: document.getElementById('memory-input').value.slice(0, 120),
      photo: state.draftPhoto,
    });
    if (!saved) return false;
    appContext.dialogs.closeModal(false);
    appContext.render(true);
    if (saved.persisted) appContext.feedback.toast('这一刻，已好好收藏');
    return true;
  }
  return {
    preparePhoto,
    saveMemory,
  };
}
