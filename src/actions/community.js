/** What the buttons of the square and of the collectors' pages do. */
export function createCommunityActions(appContext) {
  return {
    'open-post'(button, id) {
      appContext.ui.post = id;
      appContext.navigation.navigate('post');
    },
    'publish-pick': () => appContext.dialogs.openModal('publish'),
    async 'publish-post'() {
      if (!(await appContext.social.publishPost())) return;
      appContext.navigation.navigate('square');
      appContext.dom.main.scrollTop = 0;
      appContext.feedback.toast('已发布到广场');
    },
    'withdraw-post'(button) {
      appContext.ui.withdrawing = button.dataset.key;
      appContext.dialogs.openModal('post-withdraw');
    },
    async 'confirm-withdraw'() {
      if (!(await appContext.social.withdrawPost(appContext.ui.withdrawing))) return;
      appContext.dialogs.closeModal(false);
      // The post was taken back from its own page, which is gone with it.
      if (appContext.ui.screen === 'post') appContext.navigation.goBack();
      else appContext.render(true);
      appContext.feedback.toast('已从广场撤回，到访与记忆仍在护照里');
    },
    async 'like-post'(button, id) {
      const on = await appContext.social.toggleLike(id);
      if (on === null) return;
      // Marked where it stands, so the page does not jump under the finger.
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
      button.querySelector('b').textContent = appContext.selectors
        .posts()
        .find((p) => p.id === id).likes;
    },
    async 'post-want'(button, id) {
      const wanted = await appContext.discovery.toggleWanted(id);
      if (wanted === null) return;
      // The same venue may stand in several posts.
      for (const b of appContext.dom.main.querySelectorAll(
        `[data-action="post-want"][data-id="${id}"]`,
      )) {
        b.classList.toggle('saved', wanted);
        b.setAttribute('aria-pressed', String(wanted));
      }
      appContext.feedback.toast(wanted ? '已加入想去，留给下一次出发' : '已从想去中移除');
    },
    board(button) {
      appContext.ui.board = button.dataset.value;
      appContext.render();
      appContext.dom.main.scrollTop = 0;
    },
    collector(button) {
      if (!appContext.selectors.person(button.dataset.person)) return;
      // A passport is opened at its album, on the first page.
      appContext.ui.person = button.dataset.person;
      appContext.ui.collectorTab = 'album';
      appContext.ui.collectorPage = 0;
      appContext.navigation.navigate('collector');
    },
    'collector-tab'(button) {
      appContext.ui.collectorTab = button.dataset.value;
      appContext.render();
    },
    visibility: () => appContext.dialogs.openModal('visibility'),
  };
}
