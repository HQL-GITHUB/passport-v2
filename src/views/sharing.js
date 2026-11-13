import { safe, icon, art, date, dateShort, issue } from '../lib/format.js';

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
        ${c.badges.map((s) => `<div>${art(s)}<small>${safe(s.title)}</small><small class="share-issue">${issue(appContext.data.records[s.id], s)}</small></div>`).join('')}${!c.badges.length && !appContext.ui.includeTicket ? `<div class="share-date-emblem"><span>${v.day.slice(0, 4)}</span><strong>${dateShort(v.day)}</strong></div>` : ''}
      </div>
      <p class="share-venue">${safe(v.name)}</p>
      <p class="share-date">${date(v.day)} / ${safe(v.city)}</p>
      ${appContext.ui.includeNote && c.note ? /* HTML */ `<p class="share-note">${safe(c.note)}</p>` : ''}${appContext.ui.includePhoto && c.photo ? `<img class="share-photo" src="${safe(c.photo)}" alt="主动加入分享的参观照片">` : ''}
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
        ${c.tickets.length ? `<label><input type="checkbox" data-change="share-option" data-option="ticket" ${appContext.ui.includeTicket ? 'checked' : ''}>带上票根</label>` : ''}${c.note ? `<label><input type="checkbox" data-change="share-option" data-option="note" ${appContext.ui.includeNote ? 'checked' : ''}>带上我的感想</label>` : ''}${c.photo ? `<label><input type="checkbox" data-change="share-option" data-option="photo" ${appContext.ui.includePhoto ? 'checked' : ''}>带上我的照片</label>` : ''}
      </div>
      ${appContext.ui.includeTicket ? '<button class="share-ticket-edit" data-action="share-edit-ticket">调整票根裁剪与遮挡</button>' : ''}
      <p class="share-privacy">
        票根、照片与感想默认不加入分享。开启票根后，可先裁剪或遮挡票面信息。
      </p>
      <div id="page-actions"></div>
    </section>`;
  }
  // The dialog in which the ticket of a card is masked or cropped before it is shared. It opens
  // on the first ticket of the visit, in the mode that masks.
  function ticketEditorDialog() {
    const c = appContext.selectors.getShareContext();
    return {
      title: '确认分享的票根',
      state: { editor: null, mode: 'mask' },
      body: /* HTML */ `<p class="modal-sub">
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
        <button class="button" data-action="editor-apply" disabled>使用当前票根</button>`,
    };
  }
  const save = () =>
    `<button class="button" data-action="download-card">${icon('download')}保存旅行卡</button>`;
  // The card of a single visit is saved, and can also go to the square.
  function shareActions() {
    const posted = appContext.selectors.myPost(appContext.selectors.currentVisit().key);
    return `<div class="page-actions">${save()}<button class="button secondary" data-action="publish-post">${icon('plaza')}${posted ? '重新发布到广场' : '发布到广场'}</button><p class="publish-note">发布的是纪念章、到访日期和勾选的感想、照片，不包含票根</p></div>`;
  }
  // An overview is only saved.
  function journalShareActions() {
    return `<div class="page-actions">${save()}</div>`;
  }
  // The whole footprint or album on one card, under the passport's data page.
  function renderJournalShare() {
    const c = appContext.selectors.journalShare();
    let year = '';
    return /* HTML */ `<section class="page share-page screen-enter">
      <div class="share-paper journal-share-paper">
        <div class="passport-id">
          <div class="passport-id-top"><span>PASSPORT</span><span>文化旅行护照</span></div>
          <div class="passport-id-body">
            <div class="passport-id-photo">${c.id.stamp ? art(c.id.stamp) : ''}</div>
            <div class="passport-id-fields">
              <dl>
                <div>
                  <dt>启用日期</dt>
                  <dd class="numeral">${date(c.id.since)}</dd>
                </div>
                <div>
                  <dt>最近一站</dt>
                  <dd>${safe(c.id.latest)}</dd>
                </div>
              </dl>
              <div class="passport-id-stats">
                ${c.stats.map(([count, label]) => `<div><b>${String(count).padStart(2, '0')}</b><span>${label}</span></div>`).join('')}
              </div>
            </div>
          </div>
          <p class="passport-id-mrz" aria-hidden="true">${safe(c.id.mrz.padEnd(64, '<'))}</p>
        </div>
        <h1 class="share-headline">
          ${c.album ? '每一枚，都是一次到访。' : '一路走来，有迹可循。'}
        </h1>
        ${
          c.album
            ? `<div class="share-album">${c.stamps.map((s) => `<div>${art(s)}<small>${safe(s.title)}</small><small class="share-issue">${issue(appContext.data.records[s.id], s)}</small></div>`).join('')}</div>`
            : `<div class="share-journal">${c.visits
                .map((v) => {
                  const heading =
                    year !== v.day.slice(0, 4)
                      ? `<p class="share-year">${v.day.slice(0, 4)}</p>`
                      : '';
                  year = v.day.slice(0, 4);
                  return `${heading}<div class="share-stop"><b>${dateShort(v.day)}</b><span><strong>${safe(v.name)}</strong><small>${safe(v.city)}</small></span><span class="share-stop-badges">${v.badges
                    .slice(0, 2)
                    .map((s) => art(s))
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
    shareActions,
    ticketEditorDialog,
    renderJournalShare,
    journalShareActions,
  };
}
