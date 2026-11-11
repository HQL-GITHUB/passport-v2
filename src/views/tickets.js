/** Page rendering. Dependencies are provided by createApp(). */
export function createTicketViews(appContext) {
  function renderTicket() {
    const d = appContext.ui.ticketDraft;
    return /* HTML */ `<section class="page ticket-page screen-enter">
      <h1 class="scan-title">去过的地方，<br />慢慢补齐。</h1>
      ${appContext.views.renderClaimModes()}
      <p class="ticket-intro">拍下纸质票根，或导入电子票截图。</p>
      <div class="ticket-preview ${d?.image ? 'has-image' : ''}">
        ${d?.image ? `<img src="${d.image}" alt="待保存的票根原图"><div class="ticket-image-label">${appContext.format.icon('photo')}票根已导入 · 下一步确认保存</div>` : appContext.views.renderSampleTicket()}
      </div>
      <div class="ticket-import-actions">
        <button data-action="ticket-camera">${appContext.format.icon('camera')}拍摄票根</button
        ><button data-action="ticket-album">${appContext.format.icon('photo')}从相册导入</button>
      </div>
      <input
        id="ticket-camera-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
      /><input
        id="ticket-album-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
      />
      <p class="ticket-reassurance">
        ${appContext.format.icon('lock')}可将原图保存在护照中，仅自己可见。
      </p>
      <p class="ticket-demo-copy">
        票根图片不会上传。本原型使用示例信息演示识别，可在下一步修改场馆和日期。
      </p>
      <p class="ticket-error" role="alert" ${appContext.ui.ticketError ? '' : 'hidden'}>
        ${appContext.format.safe(appContext.ui.ticketError)}
      </p>
    </section>`;
  }
  function renderTicketConfirm() {
    const d = appContext.ui.ticketDraft,
      r = appContext.data.tickets[d.id],
      other = d.venueId === 'other';
    return /* HTML */ `<section class="page ticket-confirm-page screen-enter">
      <h1 class="page-title">确认这次到访</h1>
      <p class="subtitle">把票根、日期和纪念，放进同一页。</p>
      <div class="ticket-result-label">
        ${appContext.format.icon('ticket')}示例识别结果 · 可核对调整
      </div>
      ${r ? '<div class="ticket-duplicate-note">这张票根已有记录，可查看到访或补存原图。</div>' : ''}
      <div class="ticket-fields">
        <label for="ticket-venue"
          >参观场馆<select id="ticket-venue" ${r || appContext.ui.claimBusy ? 'disabled' : ''}>
            ${appContext.catalog.venues.map((v) => `<option value="${v.id}" ${d.venueId === v.id ? 'selected' : ''}>${v.name} · ${v.city}</option>`).join('')}
            <option value="other" ${other ? 'selected' : ''}>其他场馆 · 仅记录到访</option>
          </select></label
        >${other ? `<label for="ticket-custom-name">场馆名称<input id="ticket-custom-name" value="${appContext.format.safe(d.customName)}" maxlength="80" placeholder="填写这次去过的场馆" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label><label for="ticket-custom-city">所在城市<input id="ticket-custom-city" value="${appContext.format.safe(d.customCity)}" maxlength="40" placeholder="例如：苏州" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label><label for="ticket-custom-exhibit">展览或参观主题（选填）<input id="ticket-custom-exhibit" value="${appContext.format.safe(d.customExhibit)}" maxlength="100" placeholder="留住那次参观的名字" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label>` : ''}<label
          for="ticket-date"
          >参观日期<input
            id="ticket-date"
            type="date"
            min="1900-01-01"
            max="${appContext.config.demoDate}"
            required
            value="${appContext.format.safe(d.visitedAt)}"
            ${r || appContext.ui.claimBusy ? 'disabled' : ''}
        /></label>
        <p>按参观日期归入足迹，领取日期单独保存。</p>
      </div>
      <div class="ticket-reward-heading">
        <h2>这一站的纪念</h2>
        <span id="ticket-reward-count"
          >${appContext.selectors.ticketRewards(d).length} 枚纪念章</span
        >
      </div>
      <div id="ticket-rewards" class="ticket-rewards">
        ${appContext.views.renderTicketRewards()}
      </div>
      <label class="save-ticket-choice"
        ><input
          id="save-ticket-memory"
          type="checkbox"
          ${d.saveTicket ? 'checked' : ''}
          ${r?.saved || appContext.ui.claimBusy ? 'disabled' : ''}
        /><span
          ><strong>${r?.saved ? '这张票根已保存在到访中' : '同时将这张票根保存到本次到访'}</strong
          ><small>仅自己可见，可随时单独移除。</small></span
        ></label
      >
      <p
        class="ticket-error"
        id="ticket-confirm-error"
        role="alert"
        ${appContext.ui.ticketError ? '' : 'hidden'}
      >
        ${appContext.format.safe(appContext.ui.ticketError)}
      </p>
      <p class="ticket-demo-copy">
        识别与章面匹配均为交互演示。没有可领取的章，也能保存票根和到访记忆。
      </p>
    </section>`;
  }
  function renderTicketRewards() {
    const d = appContext.ui.ticketDraft,
      r = appContext.data.tickets[d.id],
      list = appContext.selectors.ticketRewards(d);
    if (!list.length)
      return /* HTML */ `<p class="ticket-no-rewards">
        ${appContext.format.validDay(d.visitedAt) ? '暂时没有匹配的纪念章。<br>票根与这次到访，依然可以好好收藏。' : '填写有效的参观日期后，即可查看纪念章。'}
      </p>`;
    return list
      .map((v) => {
        const done = r?.redeemed.includes(v.id),
          owned = !!appContext.data.records[v.id];
        return `<label class="ticket-reward ${done ? 'redeemed' : ''}"><input type="checkbox" data-ticket-reward="${v.id}" ${done || d.selected.includes(v.id) ? 'checked' : ''} ${done || appContext.ui.claimBusy ? 'disabled' : ''}>${appContext.format.art(v)}<span class="ticket-reward-copy"><strong>${v.stamp}</strong><small>${v.kind}${v.limit ? ` · 限量 ${v.limit} 枚` : ''}</small><span>${done ? '这张票根已领取' : owned ? '已有此章 · 补充这次到访' : '加入我的章册'}</span></span></label>`;
      })
      .join('');
  }
  function renderSampleTicket() {
    const v =
        appContext.ui.ticketContext ||
        appContext.catalog.venueOf(appContext.catalog.byId(appContext.ui.selected)),
      day = appContext.ui.ticketContext?.day || '2025-10-18';
    return /* HTML */ `<div class="sample-ticket">
      <div class="sample-ticket-top"><span>VISITOR’S PASS</span><span>示例票根</span></div>
      <strong>${appContext.format.safe(v.name)}</strong>
      <p>${appContext.format.safe(v.exhibit || '参观纪念')}</p>
      <div class="sample-ticket-date">
        <span>参观日期</span><b>${appContext.format.date(day)}</b>
      </div>
      <div class="sample-ticket-bottom">
        <span class="ticket-barcode" aria-hidden="true"></span
        ><span>示例票根<br />可保存到护照</span>
      </div>
    </div>`;
  }
  function renderTicketSuccess() {
    const result = appContext.ui.ticketResult,
      v = appContext.data.visits[result.visitKey],
      tickets = appContext.selectors.savedTickets(v),
      badges = v.stampIds.map(appContext.catalog.byId);
    return /* HTML */ `<section
      class="page success-page ticket-success-page memory-success screen-enter"
    >
      <div class="success-check">${appContext.format.icon('check')}</div>
      <h1 class="page-title">这一页，<br />已经替你留好。</h1>
      <p class="success-sub">
        ${tickets.length ? '票根已入册' : '到访已记录'}${result.newCount ? ` · ${result.newCount} 枚新纪念章已收藏` : ''}
      </p>
      <div class="visit-collage ${tickets.length ? 'with-ticket' : 'badges-only'}">
        <div class="collage-ticket">
          ${tickets.length ? appContext.views.ticketVisual(tickets[0]) : ''}
        </div>
        <div class="collage-badges">
          ${badges
            .slice(0, 2)
            .map((s) => appContext.format.art(s))
            .join('')}${!badges.length && !tickets.length ? appContext.format.icon('book') : ''}
        </div>
      </div>
      <h2 class="success-place">${appContext.format.safe(v.name)}</h2>
      <p class="success-place-sub">${appContext.format.safe(v.exhibit)}</p>
      ${
        result.stampIds.length
          ? `<ul class="issue-list">${result.stampIds
              .map(
                (id) =>
                  `<li><button data-action="zoom" data-id="${id}"><span>${appContext.catalog.byId(id).stamp}</span><b>${appContext.format.issue(appContext.data.records[id], appContext.catalog.byId(id))}</b>${appContext.format.icon('chevron')}</button></li>`,
              )
              .join('')}</ul>`
          : ''
      }
      <div class="ticket-date-pair">
        <div><small>参观日期</small><strong>${appContext.format.date(v.day)}</strong></div>
        <span>${appContext.format.icon('arrow')}</span>
        <div>
          <small>收藏日期</small><strong>${appContext.format.date(result.receivedAt)}</strong>
        </div>
      </div>
      <p class="ticket-success-note">票根、纪念章与当天的记忆，<br />都可以在这次到访里找到。</p>
    </section>`;
  }
  return {
    renderTicket,
    renderTicketConfirm,
    renderTicketRewards,
    renderSampleTicket,
    renderTicketSuccess,
  };
}
