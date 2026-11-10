/** Application module. Dependencies are provided by createApp(). */
export function createClaimController(appContext) {
  function clearTicketDraft() {
    if (appContext.ui.ticketDraft?.image) URL.revokeObjectURL(appContext.ui.ticketDraft.image);
    appContext.ui.ticketDraft = null;
    appContext.ui.ticketError = '';
  }
  function resetTicketSelection() {
    const d = appContext.ui.ticketDraft;
    if (!d) return;
    d.selected = appContext.selectors
      .ticketRewards(d)
      .filter((v) => !appContext.data.tickets[d.id]?.redeemed.includes(v.id))
      .map((v) => v.id);
  }
  function makeTicketDraft(id, image = '', filename = '', file = null) {
    const receipt = appContext.data.tickets[id],
      context = appContext.ui.ticketContext,
      known = receipt
        ? appContext.catalog.venues.find((v) => v.id === receipt.venueId)
        : context
          ? appContext.catalog.venues.find((v) => v.id === context.venueId)
          : appContext.catalog.venueOf(appContext.catalog.byId(appContext.ui.selected));
    appContext.ui.ticketDraft = {
      id,
      image,
      filename,
      file,
      venueId: known?.id || 'other',
      customName: receipt?.name || context?.name || '',
      customCity: receipt?.city || context?.city || '',
      customExhibit: receipt?.exhibit || context?.exhibit || '',
      visitedAt: receipt?.visitedAt || context?.day || '2025-10-18',
      selected: [],
      saveTicket: true,
    };
    appContext.claims.resetTicketSelection();
    appContext.ui.ticketError = '';
  }
  function updateTicketConfirmation() {
    const d = appContext.ui.ticketDraft;
    if (!d || appContext.ui.screen !== 'ticket-confirm') return;
    appContext.ui.ticketError = !appContext.format.validDay(d.visitedAt)
      ? d.visitedAt > appContext.config.demoDate
        ? '参观日期不能晚于今天。'
        : '请填写有效的参观日期。'
      : d.venueId === 'other' && (!d.customName.trim() || !d.customCity.trim())
        ? '请填写场馆名称和所在城市。'
        : '';
    document.getElementById('ticket-rewards').innerHTML = appContext.views.renderTicketRewards();
    document.getElementById('ticket-reward-count').textContent =
      `${appContext.selectors.ticketRewards(d).length} 枚纪念章`;
    const e = document.getElementById('ticket-confirm-error');
    e.textContent = appContext.ui.ticketError;
    e.hidden = !appContext.ui.ticketError;
    appContext.views.renderFooter();
  }
  async function prepareTicketImage(file) {
    if (!file || appContext.ui.screen !== 'ticket') return;
    const token = ++appContext.runtime.ticketToken;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      appContext.ui.ticketBusy = false;
      appContext.ui.ticketError = '请选择 10 MB 以内的 JPG、PNG 或 WebP 票根图片。';
      appContext.render(true);
      return;
    }
    appContext.ui.ticketBusy = 'image';
    appContext.ui.ticketError = '';
    appContext.views.renderFooter();
    let image;
    try {
      image = URL.createObjectURL(file);
      const [bytes] = await Promise.all([file.arrayBuffer(), appContext.images.loadImage(image)]);
      let hash = 2166136261;
      for (const b of new Uint8Array(bytes)) hash = Math.imul(hash ^ b, 16777619) >>> 0;
      if (token !== appContext.runtime.ticketToken || appContext.ui.screen !== 'ticket') {
        URL.revokeObjectURL(image);
        return;
      }
      appContext.claims.clearTicketDraft();
      appContext.claims.makeTicketDraft(
        `ticket-${hash.toString(16)}-${file.size.toString(16)}`,
        image,
        file.name,
        file,
      );
      appContext.ui.ticketBusy = false;
      appContext.render(true);
    } catch {
      if (image) URL.revokeObjectURL(image);
      if (token === appContext.runtime.ticketToken) {
        appContext.ui.ticketBusy = false;
        appContext.ui.ticketError = '图片暂时未能读取，请换一张试试。';
        appContext.render(true);
      }
    }
  }
  async function recognizeTicket() {
    if (appContext.ui.ticketBusy) return;
    if (!appContext.ui.ticketDraft)
      appContext.claims.makeTicketDraft(
        `demo-${appContext.ui.ticketContext?.venueId || appContext.catalog.venueOf(appContext.catalog.byId(appContext.ui.selected)).id}-${appContext.ui.ticketContext?.day || '2025-10-18'}`,
      );
    const token = ++appContext.runtime.ticketToken;
    appContext.ui.ticketBusy = 'recognize';
    appContext.views.renderFooter();
    await new Promise((r) => setTimeout(r, 450));
    if (token !== appContext.runtime.ticketToken || appContext.ui.screen !== 'ticket') return;
    appContext.claims.resetTicketSelection();
    appContext.navigation.navigate('ticket-confirm', appContext.ui.ticketDraft.venueId);
  }
  async function redeemTicket() {
    const d = appContext.ui.ticketDraft;
    if (!d || appContext.ui.claimBusy) return;
    appContext.claims.updateTicketConfirmation();
    if (appContext.ui.ticketError) return;
    const venue = appContext.selectors.ticketVenue(d),
      previous = appContext.data.tickets[d.id],
      rewards = appContext.selectors.selectedTicketRewards(),
      token = ++appContext.runtime.claimToken;
    if (previous && (previous.venueId !== venue.id || previous.visitedAt !== d.visitedAt)) {
      appContext.feedback.toast('请使用这张票根原有的参观信息');
      return;
    }
    appContext.ui.claimBusy = true;
    appContext.render(true);
    const savingImage = d.saveTicket && d.file && !previous?.saved;
    try {
      if (savingImage) await appContext.media.put(d.id, d.file, appContext.ui.firstMode);
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch {
      appContext.ui.claimBusy = false;
      appContext.ui.ticketError = '当前浏览器暂时无法保存原图。可以重试，或取消保存票根后继续。';
      appContext.render(true);
      return;
    }
    if (token !== appContext.runtime.claimToken || appContext.ui.screen !== 'ticket-confirm') {
      if (savingImage) await appContext.media.remove(d.id);
      return;
    }
    let newCount = 0;
    for (const s of rewards) {
      let r = appContext.data.records[s.id];
      if (!r) {
        newCount++;
        r = appContext.data.records[s.id] = {
          firstAt: appContext.config.demoDate,
          visits: [],
          method: 'ticket',
          events: [],
          note: '',
          photo: '',
        };
      }
      r.events ||= r.visits.map((day) => ({
        date: day,
        method: r.method || 'qr',
        claimedAt: r.firstAt,
      }));
      if (!r.visits.includes(d.visitedAt)) r.visits.push(d.visitedAt);
      if (!r.events.some((e) => e.date === d.visitedAt && e.method === 'ticket'))
        r.events.push({
          date: d.visitedAt,
          method: 'ticket',
          claimedAt: appContext.config.demoDate,
        });
    }
    appContext.data.tickets[d.id] = {
      venueId: venue.id,
      visitedAt: d.visitedAt,
      receivedAt: previous?.receivedAt || appContext.config.demoDate,
      redeemed: [...new Set([...(previous?.redeemed || []), ...rewards.map((s) => s.id)])],
      saved: !!(previous?.saved || d.saveTicket),
      kind: previous?.saved ? previous.kind : d.file ? 'image' : 'sample',
      name: venue.name,
      city: venue.city,
      exhibit: venue.exhibit || '',
    };
    const visit = appContext.domain.ensure(
      appContext.data,
      venue,
      d.visitedAt,
      rewards.map((s) => s.id),
      d.id,
    );
    if (appContext.data.records[venue.id])
      appContext.data.wanted = appContext.data.wanted.filter((id) => id !== venue.id);
    appContext.ui.ticketResult = {
      stampIds: rewards.map((s) => s.id),
      newCount,
      existingCount: rewards.length - newCount,
      visitedAt: d.visitedAt,
      receivedAt: appContext.config.demoDate,
      venueId: venue.id,
      visitKey: visit.key,
    };
    appContext.ui.visitKey = visit.key;
    appContext.ui.visitDate = d.visitedAt;
    appContext.storage.persist();
    appContext.claims.clearTicketDraft();
    appContext.navigation.navigate('ticket-success', venue.id);
  }
  async function collectStamp() {
    if (appContext.ui.claimBusy) return;
    appContext.ui.claimBusy = true;
    const token = ++appContext.runtime.claimToken;
    appContext.views.renderFooter();
    document.querySelector('.scan-area')?.classList.add('claim-progress');
    await new Promise((resolve) => setTimeout(resolve, 850));
    if (token !== appContext.runtime.claimToken || appContext.ui.screen !== 'scan') return;
    const id = appContext.ui.selected,
      existing = appContext.data.records[id];
    appContext.ui.duplicate = !!existing;
    const method = appContext.ui.scanMode === 'nfc' ? 'nfc' : 'qr';
    if (existing) {
      existing.events ||= existing.visits.map((day) => ({
        date: day,
        method: existing.method || 'qr',
        claimedAt: existing.firstAt,
      }));
      if (!existing.visits.includes(appContext.config.demoDate))
        existing.visits.push(appContext.config.demoDate);
      if (
        !existing.events.some((e) => e.date === appContext.config.demoDate && e.method === method)
      )
        existing.events.push({
          date: appContext.config.demoDate,
          method,
          claimedAt: appContext.config.demoDate,
        });
    } else
      appContext.data.records[id] = {
        firstAt: appContext.config.demoDate,
        visits: [appContext.config.demoDate],
        method,
        events: [
          {
            date: appContext.config.demoDate,
            method,
            claimedAt: appContext.config.demoDate,
          },
        ],
        note: '',
        photo: '',
      };
    appContext.ui.visitDate = appContext.config.demoDate;
    appContext.domain.ensure(
      appContext.data,
      appContext.catalog.venueOf(appContext.catalog.byId(id)),
      appContext.config.demoDate,
      [id],
    );
    appContext.data.wanted = appContext.data.wanted.filter((v) => v !== id);
    appContext.storage.persist();
    appContext.navigation.navigate('success', id);
  }
  return {
    clearTicketDraft,
    resetTicketSelection,
    makeTicketDraft,
    updateTicketConfirmation,
    prepareTicketImage,
    recognizeTicket,
    redeemTicket,
    collectStamp,
  };
}
