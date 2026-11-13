import { safe, icon, art, date, issue } from '../lib/format.js';

/** Page rendering. Dependencies are provided by createApp(). */
export function createTicketViews(appContext) {
  function renderTicket() {
    const d = appContext.ui.ticketDraft;
    return /* HTML */ `<section class="page ticket-page screen-enter">
      ${appContext.views.renderClaimModes()}
      <h1 class="scan-title">去过的地方，慢慢补齐</h1>
      <p class="scan-subtitle">拍下纸质票根，或导入电子票截图。</p>
      <div class="ticket-preview ${d?.image ? 'has-image' : ''}">
        ${d?.image ? `<img src="${d.image}" alt="待保存的票根原图"><div class="ticket-image-label">${icon('photo')}票根已导入 · 下一步确认保存</div>` : appContext.views.renderSampleTicket()}
      </div>
      <div class="ticket-import-actions">
        <button data-action="ticket-camera">${icon('camera')}拍摄票根</button
        ><button data-action="ticket-album">${icon('photo')}从相册导入</button>
      </div>
      <input
        id="ticket-camera-input"
        data-change="ticket-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
      /><input
        id="ticket-album-input"
        data-change="ticket-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
      />
      <p class="ticket-error" role="alert" ${appContext.ui.ticketError ? '' : 'hidden'}>
        ${safe(appContext.ui.ticketError)}
      </p>
      <div id="page-actions"></div>
      <p class="ticket-reassurance">${icon('lock')}可将原图保存在护照中，仅自己可见。</p>
      <p class="ticket-demo-copy">
        票根图片不会上传。本原型使用示例信息演示识别，可在下一步修改场馆和日期。
      </p>
    </section>`;
  }
  function ticketActions() {
    return /* HTML */ `<div class="page-actions">
      <button
        class="button ${appContext.ui.ticketBusy ? 'loading-dots' : ''}"
        data-action="recognize-ticket"
        ${appContext.ui.ticketBusy ? 'disabled' : ''}
      >
        ${appContext.ui.ticketBusy ? (appContext.ui.ticketBusy === 'image' ? '正在准备票根…' : '正在演示识别…') : appContext.ui.ticketDraft?.image ? '模拟识别票根' : '用示例票根体验'}${appContext.ui.ticketBusy ? '' : icon('arrow')}
      </button>
    </div>`;
  }
  function renderTicketConfirm() {
    const d = appContext.ui.ticketDraft,
      r = appContext.data.tickets[d.id],
      other = d.venueId === 'other';
    return /* HTML */ `<section class="page ticket-confirm-page screen-enter">
      <h1 class="page-title">确认这次到访</h1>
      <p class="subtitle">把票根、日期和纪念，放进同一页。</p>
      <div class="ticket-result-label">${icon('ticket')}示例识别结果 · 可核对调整</div>
      ${r ? '<div class="ticket-duplicate-note">这张票根已有记录，可查看到访或补存原图。</div>' : ''}
      <div class="ticket-fields">
        <label for="ticket-venue"
          >参观场馆<select
            id="ticket-venue"
            data-change="ticket-venue"
            ${r || appContext.ui.claimBusy ? 'disabled' : ''}
          >
            ${appContext.catalog.venues.map((v) => `<option value="${v.id}" ${d.venueId === v.id ? 'selected' : ''}>${safe(v.name)} · ${safe(v.city)}</option>`).join('')}
            <option value="other" ${other ? 'selected' : ''}>其他场馆 · 仅记录到访</option>
          </select></label
        >${other ? `<label for="ticket-custom-name">场馆名称<input id="ticket-custom-name" data-input="ticket-custom" data-value="customName" value="${safe(d.customName)}" maxlength="80" placeholder="填写这次去过的场馆" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label><label for="ticket-custom-city">所在城市<input id="ticket-custom-city" data-input="ticket-custom" data-value="customCity" value="${safe(d.customCity)}" maxlength="40" placeholder="例如：苏州" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label><label for="ticket-custom-exhibit">展览或参观主题（选填）<input id="ticket-custom-exhibit" data-input="ticket-custom" data-value="customExhibit" value="${safe(d.customExhibit)}" maxlength="100" placeholder="留住那次参观的名字" ${r || appContext.ui.claimBusy ? 'disabled' : ''}></label>` : ''}<label
          for="ticket-date"
          >参观日期<input
            id="ticket-date"
            data-change="ticket-date"
            type="date"
            min="1900-01-01"
            max="${appContext.clock.today()}"
            required
            value="${safe(d.visitedAt)}"
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
          data-change="ticket-save"
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
        ${safe(appContext.ui.ticketError)}
      </p>
      <div id="page-actions"></div>
      <p class="ticket-demo-copy">
        识别与章面匹配均为交互演示。没有可领取的章，也能保存票根和到访记忆。
      </p>
    </section>`;
  }
  // A ticket whose stamps are all collected, and whose image is kept if it was to be, has nothing
  // left to save: its button leads to the visit.
  function ticketConfirmActions() {
    const d = appContext.ui.ticketDraft,
      r = appContext.data.tickets[d.id],
      rewards = appContext.selectors.selectedTicketRewards(),
      complete =
        !!r && appContext.selectors.ticketRewards(d).every((s) => r.redeemed.includes(s.id)),
      viewOnly = complete && (!d.saveTicket || r.saved),
      label = viewOnly
        ? '查看这次到访'
        : rewards.length
          ? `确认收藏 ${rewards.length} 枚纪念章`
          : '保存这次到访';
    return /* HTML */ `<div class="page-actions">
      <p class="demo-notice">
        ${viewOnly ? '到访与已领取的纪念章均已保留' : d.saveTicket ? '票根同时入册 · 默认仅自己可见' : '只保存到访信息与所选纪念章'}
      </p>
      <button
        class="button ${appContext.ui.claimBusy ? 'loading-dots' : ''}"
        data-action="${viewOnly ? 'view-ticket-record' : 'redeem-ticket'}"
        ${appContext.ui.claimBusy ? 'disabled' : ''}
      >
        ${appContext.ui.claimBusy ? '正在收藏这一页…' : label}${appContext.ui.claimBusy ? '' : icon('arrow')}
      </button>
    </div>`;
  }
  function renderTicketRewards() {
    const d = appContext.ui.ticketDraft,
      r = appContext.data.tickets[d.id],
      list = appContext.selectors.ticketRewards(d);
    if (!list.length)
      return /* HTML */ `<p class="ticket-no-rewards">
        ${appContext.domain.validDay(d.visitedAt) ? '暂时没有匹配的纪念章。<br>票根与这次到访，依然可以好好收藏。' : '填写有效的参观日期后，即可查看纪念章。'}
      </p>`;
    return list
      .map((v) => {
        const done = r?.redeemed.includes(v.id),
          owned = !!appContext.data.records[v.id];
        return `<label class="ticket-reward ${done ? 'redeemed' : ''}"><input type="checkbox" data-change="ticket-reward" data-ticket-reward="${v.id}" ${done || d.selected.includes(v.id) ? 'checked' : ''} ${done || appContext.ui.claimBusy ? 'disabled' : ''}>${art(v)}<span class="ticket-reward-copy"><strong>${safe(v.title)}</strong><small>${safe(v.kind)}${v.limit ? ` · 限量 ${v.limit} 枚` : ''}</small><span>${done ? '这张票根已领取' : owned ? '已有此章 · 补充这次到访' : '加入我的章册'}</span></span></label>`;
      })
      .join('');
  }
  function renderSampleTicket() {
    const v = appContext.ui.ticketContext || appContext.selectors.venue(),
      day = appContext.ui.ticketContext?.day || appContext.config.sampleTicketDay;
    return /* HTML */ `<div class="sample-ticket">
      <div class="sample-ticket-top"><span>VISITOR’S PASS</span><span>示例票根</span></div>
      <strong>${safe(v.name)}</strong>
      <p>${safe(v.exhibit || '参观纪念')}</p>
      <div class="sample-ticket-date"><span>参观日期</span><b>${date(day)}</b></div>
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
      badges = appContext.catalog.stampsFor(v.stampIds);
    return /* HTML */ `<section
      class="page success-page ticket-success-page memory-success screen-enter"
    >
      <div class="success-check">${icon('check')}</div>
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
            .map((s) => art(s))
            .join('')}${!badges.length && !tickets.length ? icon('book') : ''}
        </div>
      </div>
      <h2 class="success-place">${safe(v.name)}</h2>
      <p class="success-place-sub">${safe(v.exhibit)}</p>
      ${
        result.stampIds.length
          ? `<ul class="issue-list">${appContext.catalog
              .stampsFor(result.stampIds)
              .map(
                (s) =>
                  `<li><button data-action="zoom" data-id="${s.id}"><span>${safe(s.title)}</span><b>${issue(appContext.data.records[s.id], s)}</b>${icon('chevron')}</button></li>`,
              )
              .join('')}</ul>`
          : ''
      }
      <div class="ticket-date-pair">
        <div><small>参观日期</small><strong>${date(v.day)}</strong></div>
        <span>${icon('arrow')}</span>
        <div><small>收藏日期</small><strong>${date(result.receivedAt)}</strong></div>
      </div>
      <p class="ticket-success-note">票根、纪念章与当天的记忆，<br />都可以在这次到访里找到。</p>
      <div id="page-actions"></div>
    </section>`;
  }
  // A saved ticket at full size. Opened from the passport's ticket wallet, it names its visit and
  // leads to it.
  function ticketDialog() {
    const id = appContext.ui.viewingTicket,
      t = appContext.data.tickets[id],
      wallet = appContext.ui.screen === 'passport';
    return {
      title: '那天的票根',
      body: /* HTML */ `<div class="full-ticket-preview">${appContext.views.ticketVisual(id)}</div>
        <p class="modal-sub">
          ${
            wallet
              ? `${safe(appContext.data.visits[appContext.domain.key(t.venueId, t.visitedAt)]?.name || t.name)} · ${date(t.visitedAt)}<br />`
              : ''
          }${t.kind === 'sample' ? '示例票根' : '保存的原图'}
          · 仅自己可见${wallet ? '' : '<br />移除票根不会影响到访记录与徽章。'}
        </p>
        ${
          wallet
            ? `<button class="button" data-action="ticket-open-visit">查看这次到访${icon('arrow')}</button>`
            : ''
        }`,
    };
  }
  function ticketRemoveDialog() {
    return {
      title: '移除这张票根？',
      body: '<p class="modal-sub">票根图片将从本机护照移除。这次到访、纪念章、照片与感想会继续保留。</p><button class="button secondary" data-action="close-modal">保留票根</button><button class="button" data-action="confirm-remove-ticket">移除票根，保留到访</button>',
    };
  }
  function ticketLeaveDialog() {
    return {
      title: '离开票根入册？',
      body: '<p class="modal-sub">这张票根还没有保存。离开后，导入的票根和填写的信息不会保留。</p><button class="button secondary" data-action="close-modal">继续入册</button><button class="button" data-action="confirm-leave">离开，不保存</button>',
    };
  }
  function ticketSuccessActions() {
    return `<div class="page-actions success-footer"><button class="button" data-action="ticket-visit">查看这次到访${icon('arrow')}</button><button class="button secondary" data-action="passport">回到我的护照</button></div>`;
  }
  return {
    renderTicket,
    ticketActions,
    renderTicketConfirm,
    ticketConfirmActions,
    renderTicketRewards,
    renderSampleTicket,
    renderTicketSuccess,
    ticketSuccessActions,
    ticketDialog,
    ticketRemoveDialog,
    ticketLeaveDialog,
  };
}
