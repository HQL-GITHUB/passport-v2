/** Application module. Dependencies are provided by createApp(). */
export function createSocialController(appContext) {
  // A post is a copy of the card as it stands: the stamps on it, and the note and the photograph
  // only if they were ticked. The ticket stays behind, whatever the card shows.
  async function publishPost() {
    const c = appContext.selectors.getShareContext();
    return !!(await appContext.store.attempt('publishPost', {
      visitKey: c.visit.key,
      stampIds: c.badges.map((s) => s.id),
      note: appContext.ui.includeNote ? c.note : '',
      photo: appContext.ui.includePhoto ? c.photo : '',
    }));
  }
  async function withdrawPost(visitKey) {
    return !!(await appContext.store.attempt('withdrawPost', visitKey));
  }
  // Answers whether the post is liked now, or null if nothing changed.
  async function toggleLike(postId) {
    const on = !appContext.data.liked.includes(postId);
    return (await appContext.store.attempt('setLiked', postId, on)) ? on : null;
  }
  // Switches one part of the passport on or off for others. Answers what is shown now, or null
  // if nothing changed.
  async function setVisibility(part, on) {
    const shown = { ...appContext.selectors.visibility(), [part]: on };
    return (await appContext.store.attempt('setVisibility', shown))
      ? appContext.selectors.visibility()
      : null;
  }
  return {
    publishPost,
    withdrawPost,
    toggleLike,
    setVisibility,
  };
}
