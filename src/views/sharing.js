/** Page rendering. Dependencies are provided by createApp(). */
export function createSharingViews(appContext) {
  function sharePaper() {
    const c = appContext.selectors.getShareContext(),
      v = c.visit;
    return /* HTML */ `<div class="share-paper memory-share-paper">
      <div class="share-top">
        <span>CULTURAL TRAVEL JOURNAL</span><span>${v.day.slice(0, 4)}</span>
      </div>
      <h1 class="share-headline">此行，<br />有迹可循。</h1>
      ${appContext.ui.includeTicket && appContext.ui.shareTicket ? `<img class="share-ticket-preview" src="${appContext.ui.shareTicket}" alt="手动确认后加入分享的票根">` : ''}
      <div class="share-memory-badges ${c.badges.length > 1 ? 'multiple' : ''}">
        ${c.badges.map((s) => `<div>${appContext.format.art(s)}<small>${s.stamp}</small><small class="share-issue">${appContext.format.issue(appContext.data.records[s.id], s)}</small></div>`).join('')}${!c.badges.length && !appContext.ui.includeTicket ? `<div class="share-date-emblem"><span>${v.day.slice(0, 4)}</span><strong>${appContext.format.dateShort(v.day)}</strong></div>` : ''}
      </div>
      <p class="share-venue">${appContext.format.safe(v.name)}</p>
      <p class="share-date">${appContext.format.date(v.day)} / ${appContext.format.safe(v.city)}</p>
      ${appContext.ui.includeNote && c.note ? /* HTML */ `<p class="share-note">${appContext.format.safe(c.note)}</p>` : ''}${appContext.ui.includePhoto && c.photo ? `<img class="share-photo" src="${appContext.format.safe(c.photo)}" alt="主动加入分享的参观照片">` : ''}
      <div class="share-paper-footer">
        <strong>旅行护照</strong><span>每一站，都值得被记住。</span>
      </div>
    </div>`;
  }
  function renderShare() {
    const c = appContext.selectors.getShareContext();
    return /* HTML */ `<section class="page share-page screen-enter">
      <div id="share-card-preview">${appContext.views.sharePaper()}</div>
      <div class="share-options">
        ${c.tickets.length ? `<label><input type="checkbox" data-option="ticket" ${appContext.ui.includeTicket ? 'checked' : ''}>带上票根</label>` : ''}${c.note ? `<label><input type="checkbox" data-option="note" ${appContext.ui.includeNote ? 'checked' : ''}>带上我的感想</label>` : ''}${c.photo ? `<label><input type="checkbox" data-option="photo" ${appContext.ui.includePhoto ? 'checked' : ''}>带上我的照片</label>` : ''}
      </div>
      ${appContext.ui.includeTicket ? '<button class="share-ticket-edit" data-action="share-edit-ticket">调整票根裁剪与遮挡</button>' : ''}
      <p class="share-privacy">
        票根、照片与感想默认不加入分享。开启票根后，可先裁剪或遮挡票面信息。
      </p>
      <div id="page-actions"></div>
    </section>`;
  }
  // The whole footprint or album on one card.
  function renderJournalShare() {
    const c = appContext.selectors.journalShare();
    let year = '';
    return /* HTML */ `<section class="page share-page screen-enter">
      <div class="share-paper journal-share-paper">
        <div class="share-top"><span>CULTURAL TRAVEL JOURNAL</span><span>${c.span}</span></div>
        <h1 class="share-headline">
          ${c.album ? '每一枚，<br />都是一次到访。' : '一路走来，<br />有迹可循。'}
        </h1>
        <div class="share-stats">
          ${c.stats.map(([count, label]) => `<div><strong>${String(count).padStart(2, '0')}</strong><span>${label}</span></div>`).join('')}
        </div>
        ${
          c.album
            ? `<div class="share-album">${c.stamps.map((s) => `<div>${appContext.format.art(s)}<small>${s.stamp}</small><small class="share-issue">${appContext.format.issue(appContext.data.records[s.id], s)}</small></div>`).join('')}</div>`
            : `<div class="share-journal">${c.visits
                .map((v) => {
                  const heading =
                    year !== v.day.slice(0, 4)
                      ? `<p class="share-year">${v.day.slice(0, 4)}</p>`
                      : '';
                  year = v.day.slice(0, 4);
                  return `${heading}<div class="share-stop"><b>${appContext.format.dateShort(v.day)}</b><span><strong>${appContext.format.safe(v.name)}</strong><small>${appContext.format.safe(v.city)}</small></span><span class="share-stop-badges">${v.badges
                    .slice(0, 2)
                    .map((s) => appContext.format.art(s))
                    .join('')}</span></div>`;
                })
                .join('')}</div>`
        }
        ${c.more > 0 ? `<p class="share-more">${c.album ? `以及另外 ${c.more} 枚纪念章` : `以及更早的 ${c.more} 次到访`}</p>` : ''}
        <div class="share-paper-footer">
          <strong>旅行护照</strong><span>每一站，都值得被记住。</span>
        </div>
      </div>
      <p class="share-privacy">
        ${c.album ? '只包含纪念章与收藏编号。' : '只包含到访日期、场馆、城市与纪念章。'}票根、照片和感想不会加入分享。
      </p>
      <div id="page-actions"></div>
    </section>`;
  }
  return {
    sharePaper,
    renderShare,
    renderJournalShare,
  };
}
