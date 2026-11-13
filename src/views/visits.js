import { safe, icon, art, date, issue } from '../lib/format.js';

/** Page rendering. Dependencies are provided by createApp(). */
export function createVisitViews(appContext) {
  function renderVisit() {
    const v = appContext.data.visits[appContext.ui.visitKey],
      tickets = appContext.selectors.savedTickets(v),
      // A note of only spaces still counts as an unwritten page.
      hasNote = !!v.note?.trim();
    return /* HTML */ `<section class="page visit-page screen-enter">
      <p class="visit-day-heading">${date(v.day)}</p>
      <p class="visit-place-caption">${icon('pin')}${safe(v.city)} · 参观日期</p>
      <h1 class="visit-name">${safe(v.name)}</h1>
      <p class="visit-exhibit-name">${safe(v.exhibit || '这一天，与文化相遇')}</p>
      <div class="visit-section-heading">
        <h2>那天的票根 <small>${tickets.length}</small></h2>
        <button data-action="add-visit-ticket">${icon('photo')}添加</button>
      </div>
      ${tickets.length ? `<div class="visit-ticket-gallery">${tickets.map((id) => `<article class="saved-ticket-card"><button class="saved-ticket-open" data-action="view-ticket" data-ticket-id="${id}">${appContext.views.ticketVisual(id)}<span class="ticket-full-hint">${icon('search')}查看完整票根</span></button><div class="saved-ticket-caption"><span>${appContext.data.tickets[id].kind === 'sample' ? '示例票根' : '原图'} · 仅自己可见</span><button data-action="remove-ticket-dialog" data-ticket-id="${id}">移除票根</button></div></article>`).join('')}</div>` : `<button class="visit-add" data-action="add-visit-ticket">${icon('ticket')}把这一天的票根，也一起收藏。</button>`}
      <div class="visit-section-heading">
        <h2>这一站的纪念 <small>${v.stampIds.length}</small></h2>
      </div>
      ${
        v.stampIds.length
          ? `<div class="visit-stamp-grid">${appContext.catalog
              .stampsFor(v.stampIds)
              .map(
                (s) =>
                  `<button data-action="stamp" data-id="${s.id}" data-visit-date="${v.day}" data-from-visit="${v.key}">${art(s)}<strong>${s.title}</strong><small>${s.kind}</small><small class="badge-issue">${issue(appContext.data.records[s.id], s)}</small></button>`,
              )
              .join('')}</div>`
          : '<p class="visit-no-stamps">这一站暂时没有纪念章。<br>票根与到访记忆，已经好好保存。</p>'
      }
      <section class="memory-block">
        <div class="memory-header">
          <h3>留住当时的心情</h3>
          <button data-action="edit-memory">
            ${icon('edit')}${hasNote || v.photo ? '编辑记忆' : '留下一笔'}
          </button>
        </div>
        ${hasNote ? /* HTML */ `<p class="memory-note">${safe(v.note)}</p>` : !v.photo ? `<button class="visit-add" data-action="edit-memory">${icon('edit')}一张照片，一句话，留住那一天。</button>` : ''}${v.photo ? `<img class="memory-photo" src="${safe(v.photo)}" alt="这次到访的个人照片">` : ''}
        <p class="privacy">
          ${icon('lock')}${
            appContext.selectors.visibility().memories
              ? '票根仅自己可见；感想与照片已随足迹公开'
              : '票根、照片和感想默认仅自己可见'
          }
        </p>
      </section>
      <div id="page-actions"></div>
    </section>`;
  }
  // The line under a note or a photograph, about who sees it: locked, unless its writer shows them.
  function memoryPrivacy(kept) {
    return appContext.selectors.visibility().memories
      ? `${icon('check')}已随足迹公开，可在公开设置中关闭`
      : `${icon('lock')}${kept}`;
  }
  function visitActions() {
    return `<div class="page-actions"><button class="button" data-action="visit-share">${icon('share')}分享这次到访</button></div>`;
  }
  // The dialog that writes the line and the photograph of the visit in view. It opens with the
  // photograph as it is kept, to be changed before it is saved.
  function memoryDialog() {
    const visit = appContext.selectors.currentVisit();
    if (!visit) return null;
    return {
      title: '给这一天留一笔',
      state: { visitKey: visit.key, draftPhoto: visit.photo || '', photoBusy: false },
      body: /* HTML */ `<p class="modal-sub">${safe(visit.name)} · ${date(visit.day)}</p>
        <label class="field-label" for="memory-input">这次参观，什么让你停下脚步？</label
        ><textarea
          id="memory-input"
          data-input="memory-note"
          class="memory-textarea"
          maxlength="120"
          placeholder="一句话，留住当时的心情。"
        >
${safe(visit.note)}</textarea>
        <p class="character-count"><span id="note-count">${visit.note.length}</span> / 120</p>
        <label class="photo-upload"
          >${icon('photo')}添加一张参观照片<input
            id="photo-input"
            data-change="memory-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
        /></label>
        <div id="photo-draft">
          ${visit.photo ? `<img class="photo-edit-preview" src="${safe(visit.photo)}" alt="这次到访的个人照片"><button class="remove-photo" data-action="remove-photo">移除这张照片</button>` : ''}
        </div>
        <p id="photo-status" class="photo-loading" hidden>正在准备照片…</p>
        <p class="privacy">${memoryPrivacy('仅自己可见，分享时由你选择')}</p>
        <p id="memory-error" class="modal-error" role="alert" hidden></p>
        <button class="button" data-action="save-memory">保存这一刻</button>`,
    };
  }
  function ticketVisual(id) {
    const t = appContext.data.tickets[id],
      v = appContext.data.visits[appContext.domain.key(t.venueId, t.visitedAt)];
    if (t.kind === 'image')
      return appContext.media.url(id)
        ? `<img class="saved-ticket-image" src="${appContext.media.url(id)}" alt="保存的参观票根原图" loading="lazy">`
        : '<div class="missing-ticket">原图暂不可用<br>可重新导入这张票根</div>';
    return /* HTML */ `<div class="sample-ticket">
      <div class="sample-ticket-top"><span>VISITOR’S PASS</span><span>示例票根</span></div>
      <strong>${safe(v?.name || t.name)}</strong>
      <p>${safe(v?.exhibit || t.exhibit)}</p>
      <div class="sample-ticket-date"><span>参观日期</span><b>${date(t.visitedAt)}</b></div>
      <div class="sample-ticket-bottom">
        <span class="ticket-barcode" aria-hidden="true"></span
        ><span>旅行中的一页<br />仅自己可见</span>
      </div>
    </div>`;
  }
  return {
    renderVisit,
    visitActions,
    memoryPrivacy,
    memoryDialog,
    ticketVisual,
  };
}
