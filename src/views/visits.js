/** Page rendering. Dependencies are provided by createApp(). */
export function createVisitViews(appContext) {
  function renderVisit() {
    const v = appContext.data.visits[appContext.ui.visitKey],
      tickets = appContext.selectors.savedTickets(v),
      // A note of only spaces still counts as an unwritten page.
      hasNote = !!v.note?.trim();
    return /* HTML */ `<section class="page visit-page screen-enter">
      <p class="visit-day-heading">${appContext.format.date(v.day)}</p>
      <p class="visit-place-caption">
        ${appContext.format.icon('pin')}${appContext.format.safe(v.city)} · 参观日期
      </p>
      <h1 class="visit-name">${appContext.format.safe(v.name)}</h1>
      <p class="visit-exhibit-name">${appContext.format.safe(v.exhibit || '这一天，与文化相遇')}</p>
      <div class="visit-section-heading">
        <h2>那天的票根 <small>${tickets.length}</small></h2>
        <button data-action="add-visit-ticket">${appContext.format.icon('photo')}添加</button>
      </div>
      ${tickets.length ? `<div class="visit-ticket-gallery">${tickets.map((id) => `<article class="saved-ticket-card"><button class="saved-ticket-open" data-action="view-ticket" data-ticket-id="${id}">${appContext.views.ticketVisual(id)}<span class="ticket-full-hint">${appContext.format.icon('search')}查看完整票根</span></button><div class="saved-ticket-caption"><span>${appContext.data.tickets[id].kind === 'sample' ? '示例票根' : '原图'} · 仅自己可见</span><button data-action="remove-ticket-dialog" data-ticket-id="${id}">移除票根</button></div></article>`).join('')}</div>` : `<button class="visit-add" data-action="add-visit-ticket">${appContext.format.icon('ticket')}把这一天的票根，也一起收藏。</button>`}
      <div class="visit-section-heading">
        <h2>这一站的纪念 <small>${v.stampIds.length}</small></h2>
      </div>
      ${
        v.stampIds.length
          ? `<div class="visit-stamp-grid">${v.stampIds
              .map((id) => {
                const s = appContext.catalog.byId(id);
                return `<button data-action="stamp" data-id="${id}" data-visit-date="${v.day}" data-from-visit="${v.key}">${appContext.format.art(s)}<strong>${s.stamp}</strong><small>${s.kind}</small><small class="badge-issue">${appContext.format.issue(appContext.data.records[id], s)}</small></button>`;
              })
              .join('')}</div>`
          : '<p class="visit-no-stamps">这一站暂时没有纪念章。<br>票根与到访记忆，已经好好保存。</p>'
      }
      <section class="memory-block">
        <div class="memory-header">
          <h3>留住当时的心情</h3>
          <button data-action="edit-memory">
            ${appContext.format.icon('edit')}${hasNote || v.photo ? '编辑记忆' : '留下一笔'}
          </button>
        </div>
        ${hasNote ? /* HTML */ `<p class="memory-note">${appContext.format.safe(v.note)}</p>` : !v.photo ? `<button class="visit-add" data-action="edit-memory">${appContext.format.icon('edit')}一张照片，一句话，留住那一天。</button>` : ''}${v.photo ? `<img class="memory-photo" src="${appContext.format.safe(v.photo)}" alt="这次到访的个人照片">` : ''}
        <p class="privacy">
          ${appContext.format.icon('lock')}${
            appContext.selectors.visibility().memories
              ? '票根仅自己可见；感想与照片已随足迹公开'
              : '票根、照片和感想默认仅自己可见'
          }
        </p>
      </section>
      <div id="page-actions"></div>
    </section>`;
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
      <strong>${appContext.format.safe(v?.name || t.name)}</strong>
      <p>${appContext.format.safe(v?.exhibit || t.exhibit)}</p>
      <div class="sample-ticket-date">
        <span>参观日期</span><b>${appContext.format.date(t.visitedAt)}</b>
      </div>
      <div class="sample-ticket-bottom">
        <span class="ticket-barcode" aria-hidden="true"></span
        ><span>旅行中的一页<br />仅自己可见</span>
      </div>
    </div>`;
  }
  return {
    renderVisit,
    ticketVisual,
  };
}
