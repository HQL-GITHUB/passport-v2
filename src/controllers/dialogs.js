/** Application module. Dependencies are provided by createApp(). */
export function createDialogController(appContext) {
  function openModal(kind, stampId) {
    appContext.dialogs.closeModal(false);
    appContext.runtime.lastFocused = document.activeElement;
    const stamp = appContext.catalog.stamp(stampId) || appContext.selectors.stamp(),
      venue = appContext.selectors.venue(),
      visit = appContext.selectors.currentVisit();
    let body = '',
      label = '',
      extra = '';
    if (kind === 'memory') {
      if (!visit) return;
      label = '给这一天留一笔';
      appContext.runtime.modalState = {
        kind,
        visitKey: visit.key,
        draftPhoto: visit.photo || '',
        photoBusy: false,
      };
      body = /* HTML */ `<p class="modal-sub">
          ${appContext.format.safe(visit.name)} · ${appContext.format.date(visit.day)}
        </p>
        <label class="field-label" for="memory-input">这次参观，什么让你停下脚步？</label
        ><textarea
          id="memory-input"
          data-input="memory-note"
          class="memory-textarea"
          maxlength="120"
          placeholder="一句话，留住当时的心情。"
        >
${appContext.format.safe(visit.note)}</textarea>
        <p class="character-count"><span id="note-count">${visit.note.length}</span> / 120</p>
        <label class="photo-upload"
          >${appContext.format.icon('photo')}添加一张参观照片<input
            id="photo-input"
            data-change="memory-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
        /></label>
        <div id="photo-draft">
          ${visit.photo ? `<img class="photo-edit-preview" src="${appContext.format.safe(visit.photo)}" alt="这次到访的个人照片"><button class="remove-photo" data-action="remove-photo">移除这张照片</button>` : ''}
        </div>
        <p id="photo-status" class="photo-loading" hidden>正在准备照片…</p>
        <p class="privacy">${appContext.selectors.memoryPrivacy('仅自己可见，分享时由你选择')}</p>
        <p id="memory-error" class="modal-error" role="alert" hidden></p>
        <button class="button" data-action="save-memory">保存这一刻</button>`;
    } else if (kind === 'ticket-view') {
      label = '那天的票根';
      extra = 'full-ticket-modal';
      const id = appContext.ui.viewingTicket,
        t = appContext.data.tickets[id],
        // Opened from the passport's ticket wallet, the ticket names its visit and leads to it.
        wallet = appContext.ui.screen === 'passport';
      body = /* HTML */ `<div class="full-ticket-preview">${appContext.views.ticketVisual(id)}</div>
        <p class="modal-sub">
          ${
            wallet
              ? `${appContext.format.safe(appContext.data.visits[appContext.domain.key(t.venueId, t.visitedAt)]?.name || t.name)} · ${appContext.format.date(t.visitedAt)}<br />`
              : ''
          }${t.kind === 'sample' ? '示例票根' : '保存的原图'}
          · 仅自己可见${wallet ? '' : '<br />移除票根不会影响到访记录与徽章。'}
        </p>
        ${
          wallet
            ? `<button class="button" data-action="ticket-open-visit">查看这次到访${appContext.format.icon('arrow')}</button>`
            : ''
        }`;
    } else if (kind === 'ticket-remove') {
      label = '移除这张票根？';
      body =
        '<p class="modal-sub">票根图片将从本机护照移除。这次到访、纪念章、照片与感想会继续保留。</p><button class="button secondary" data-action="close-modal">保留票根</button><button class="button" data-action="confirm-remove-ticket">移除票根，保留到访</button>';
    } else if (kind === 'ticket-leave') {
      label = '离开票根入册？';
      body =
        '<p class="modal-sub">这张票根还没有保存。离开后，导入的票根和填写的信息不会保留。</p><button class="button secondary" data-action="close-modal">继续入册</button><button class="button" data-action="confirm-leave">离开，不保存</button>';
    } else if (kind === 'ticket-editor') {
      const c = appContext.selectors.getShareContext();
      label = '确认分享的票根';
      extra = 'ticket-editor-modal';
      appContext.runtime.modalState = {
        kind,
        editor: null,
        mode: 'mask',
      };
      body = /* HTML */ `<p class="modal-sub">
          鼠标或手指拖动框选，可遮挡姓名、订单号或二维码。原图保持完整。
        </p>
        ${c.tickets.length > 1 ? `<label class="field-label" for="share-ticket-select">选择这次到访的票根</label><select id="share-ticket-select" data-change="share-ticket">${c.tickets.map((id, i) => `<option value="${id}">票根 ${i + 1} · ${appContext.data.tickets[id].kind === 'sample' ? '示例票根' : '原图'}</option>`).join('')}</select>` : ''}
        <div class="ticket-editor-modes" role="group" aria-label="票根处理方式">
          <button data-action="editor-mode" data-value="mask" class="active" aria-pressed="true">
            遮挡信息</button
          ><button data-action="editor-mode" data-value="crop" aria-pressed="false">
            裁剪区域
          </button>
        </div>
        <div class="ticket-editor-stage">
          <canvas id="ticket-edit-canvas" aria-label="拖动框选需要遮挡或裁剪的票面区域"></canvas>
          <p class="ticket-editor-loading">正在打开原图…</p>
        </div>
        <div class="ticket-editor-tools">
          <button data-action="editor-undo">撤销</button
          ><button data-action="editor-reset">还原</button>
        </div>
        <p class="share-privacy">请查看下方预览，确认希望公开的票面内容。</p>
        <button class="button" data-action="editor-apply" disabled>使用当前票根</button>`;
    } else if (kind === 'zoom') {
      const record = appContext.data.records[stamp.id],
        animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      label = stamp.title;
      extra = 'zoom-modal';
      appContext.runtime.modalState = { kind, viewer: null, canFlip: !!record, animate };
      body = /* HTML */ `<div class="zoom-medal">
          ${appContext.views.renderMedal(stamp, record)}${record ? appContext.views.renderMedalFlip() : ''}
        </div>
        <p class="modal-sub">${appContext.catalog.venueOf(stamp).name} · ${stamp.kind}</p>
        <p class="medal-hint">
          ${record ? (animate ? '拖动章面，翻看背面的到访印记。' : '背面刻着这次到访的日期与编号。') : animate ? '拖动可以倾斜章面，收藏后可翻看背面。' : '收藏后，可以翻看背面的到访印记。'}
        </p>`;
    } else if (kind === 'visibility') {
      const shown = appContext.selectors.visibility(),
        row = (key, title, text, disabled = false) =>
          `<label class="visibility-row"><span><strong>${title}</strong><small>${text}</small></span><input type="checkbox" role="switch" data-change="set-visibility" data-visibility="${key}" ${shown[key] ? 'checked' : ''} ${disabled ? 'disabled' : ''}></label>`;
      label = '公开设置';
      body = /* HTML */ `<p class="modal-sub">
          公开的部分，其他收藏家可以在你的护照里翻看。不打开的，只有你自己看得到。
        </p>
        <div class="visibility-list">
          ${row('album', '章册', '纪念章、收藏编号与收藏月份。公开后，现场领取的章计入榜单。')}
          ${row('footprints', '足迹', '去过的场馆与月份，不显示具体日期。')}
          ${row('memories', '感想与照片', '随足迹一起展示，需要先公开足迹。', !shown.footprints)}
        </div>
        <p class="privacy">
          ${appContext.format.icon('lock')}票根始终仅自己可见，只能通过遮挡后的旅行卡分享
        </p>
        ${
          appContext.ui.screen === 'collector'
            ? ''
            : '<button class="button secondary" data-action="collector" data-person="me">看看别人眼中的我的护照</button>'
        }`;
    } else if (kind === 'publish') {
      const rows = appContext.selectors.visitRows();
      label = '分享一次到访';
      body = rows.length
        ? /* HTML */ `<p class="modal-sub">
              选一次到访，在旅行卡上勾选要带上的感想和照片，再发布到广场。票根不会发布。
            </p>
            <div class="choice-list publish-list">
              ${rows
                .map(
                  (v) =>
                    `<button data-action="publish-visit" data-key="${v.key}"><span><small>${appContext.format.date(v.day)}</small>${appContext.format.safe(v.name)}</span>${appContext.selectors.myPost(v.key) ? '<i>已发布</i>' : appContext.format.icon('chevron')}</button>`,
                )
                .join('')}
            </div>`
        : '<p class="modal-sub">护照里还没有到访。先去收藏一枚纪念章，或保存一张票根，再回来分享。</p><button class="button" data-action="discover">去发现目的地</button>';
    } else if (kind === 'post-withdraw') {
      label = '从广场撤回这一条？';
      body =
        '<p class="modal-sub">撤回后别人不再看到它。这次到访、纪念章和你的记忆仍在护照里，以后可以重新发布。</p><button class="button secondary" data-action="close-modal">保留</button><button class="button" data-action="confirm-withdraw">撤回</button>';
    } else if (kind === 'city') {
      label = '选择下一站的城市';
      body = `<div class="choice-list">${['全部城市', ...appContext.catalog.cities].map((city) => `<button data-action="set-city" data-value="${city}" class="${appContext.ui.city === city ? 'active' : ''}">${city}${appContext.ui.city === city ? appContext.format.icon('check') : ''}</button>`).join('')}</div>`;
    } else if (kind === 'guide') {
      label = '找到这枚纪念章';
      body = /* HTML */ `<p class="modal-sub">${venue.name} · 示例楼层指引</p>
        <svg
          class="guide-map"
          viewBox="0 0 340 180"
          role="img"
          aria-label="从入口经过大厅，到参观出口的纪念章台"
        >
          <rect
            x="20"
            y="23"
            width="300"
            height="134"
            rx="8"
            fill="var(--paper)"
            stroke="var(--line-strong)"
          />
          <path d="M127 23v57h70v-57M127 157V99h70v58" stroke="var(--line-strong)" fill="none" />
          <path
            d="M55 116h72V90h92v27h47"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-dasharray="5 5"
            fill="none"
          />
          <circle cx="55" cy="116" r="5" fill="var(--accent-line)" stroke="none" />
          <circle cx="269" cy="117" r="11" fill="var(--accent)" stroke="none" />
          <path d="m264 117 3 3 6-6" stroke="var(--on-fill)" fill="none" stroke-width="2" />
          <text x="43" y="138">入口</text>
          <text x="145" y="58">公共大厅</text>
          <text x="220" y="138" class="guide-label">纪念章台</text>
          <text x="227" y="64">参观出口</text>
        </svg>
        <p class="guide-description">
          ${venue.location}。<br />参观结束后，寻找“旅行护照”领取标识。
        </p>
        <button class="button" data-action="close-modal">知道了</button>`;
    }
    if (!appContext.runtime.modalState)
      appContext.runtime.modalState = {
        kind,
      };
    appContext.dom.modalRoot.innerHTML = `<div class="modal-overlay" data-modal-backdrop><section class="modal ${extra}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><h2 id="modal-title">${appContext.format.safe(label)}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭">${appContext.format.icon('close')}</button></header>${body}</section></div>`;
    appContext.dom.app.inert = true;
    document.querySelector('.design-rail').inert = true;
    document.body.style.overflow = 'hidden';
    appContext.dom.modalRoot.querySelector(kind === 'memory' ? 'textarea' : 'button')?.focus({
      preventScroll: true,
    });
    if (kind === 'ticket-editor')
      appContext.dialogs.setupTicketEditor(appContext.selectors.getShareContext().tickets[0]);
    if (kind === 'zoom')
      appContext.runtime.modalState.viewer = new appContext.MedalViewer(
        appContext.dom.modalRoot.querySelector('.medal-stage'),
        appContext.runtime.modalState,
      );
  }
  function closeModal(restoreFocus = true) {
    const hadModal = !!appContext.runtime.modalState;
    appContext.runtime.modalState?.viewer?.destroy();
    appContext.dom.modalRoot.innerHTML = '';
    appContext.runtime.modalState = null;
    appContext.dom.app.inert = false;
    document.querySelector('.design-rail').inert = false;
    document.body.style.overflow = '';
    if (hadModal && restoreFocus && appContext.runtime.lastFocused?.isConnected)
      appContext.runtime.lastFocused.focus({
        preventScroll: true,
      });
  }
  async function setupTicketEditor(id) {
    const state = appContext.runtime.modalState;
    if (!state || state.kind !== 'ticket-editor') return;
    state.ticketId = id;
    state.editor = null;
    const loading = appContext.dom.modalRoot.querySelector('.ticket-editor-loading'),
      apply = appContext.dom.modalRoot.querySelector('[data-action="editor-apply"]');
    apply.disabled = true;
    loading.hidden = false;
    try {
      const t = appContext.data.tickets[id],
        image =
          t.kind === 'sample'
            ? await appContext.sharing.sampleTicketImage(id)
            : await appContext.images.loadImage(appContext.media.url(id));
      if (appContext.runtime.modalState !== state || state.ticketId !== id) return;
      const old = appContext.dom.modalRoot.querySelector('#ticket-edit-canvas');
      old.replaceWith(old.cloneNode(false));
      const canvas = appContext.dom.modalRoot.querySelector('#ticket-edit-canvas');
      state.editor = new appContext.TicketEditor(canvas, image);
      state.editor.mode = state.mode || 'mask';
      apply.disabled = false;
      loading.hidden = true;
    } catch {
      if (appContext.runtime.modalState === state)
        loading.textContent = '原图暂不可用，请重新导入票根后再分享。';
    }
  }
  return {
    openModal,
    closeModal,
    setupTicketEditor,
  };
}
