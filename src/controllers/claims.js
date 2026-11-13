/** Application module. Dependencies are provided by createApp(). */
export function createClaimController(appContext) {
  // What is under way and can be called off by leaving the page: the reading of a picked image,
  // and a request to the backend.
  let picking = 0,
    request = null;
  function cancel() {
    picking++;
    request?.abort();
    request = null;
  }
  function begin() {
    cancel();
    request = new AbortController();
    return request.signal;
  }
  function clearTicketDraft() {
    if (appContext.ui.ticketDraft?.image) URL.revokeObjectURL(appContext.ui.ticketDraft.image);
    appContext.ui.ticketDraft = null;
    appContext.ui.ticketError = '';
  }
  // Whether leaving the ticket pages now would drop something of the visitor's: an imported image,
  // or a visit on the confirmation page that has not been saved yet.
  function hasUnsavedTicket() {
    const d = appContext.ui.ticketDraft,
      saved = d && appContext.data.tickets[d.id];
    if (!d) return false;
    if (appContext.ui.screen === 'ticket') return !!d.image;
    return appContext.ui.screen === 'ticket-confirm' && (!saved || (!!d.file && !saved.saved));
  }
  function resetTicketSelection() {
    const d = appContext.ui.ticketDraft;
    if (!d) return;
    d.selected = appContext.selectors
      .ticketRewards(d)
      .filter((v) => !appContext.data.tickets[d.id]?.redeemed.includes(v.id))
      .map((v) => v.id);
  }
  function updateTicketConfirmation() {
    const d = appContext.ui.ticketDraft;
    if (!d || appContext.ui.screen !== 'ticket-confirm') return;
    appContext.ui.ticketError = !appContext.domain.validDay(d.visitedAt)
      ? d.visitedAt > appContext.clock.today()
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
  // A picked image becomes the draft once it has been seen to open. What the ticket says is
  // read in the next step.
  async function prepareTicketImage(file) {
    if (!file || appContext.ui.screen !== 'ticket') return;
    // A new image takes the place of whatever was being read.
    cancel();
    const token = picking;
    if (!appContext.images.importable(file)) {
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
      await appContext.images.loadImage(image);
      if (token !== picking || appContext.ui.screen !== 'ticket') {
        URL.revokeObjectURL(image);
        return;
      }
      clearTicketDraft();
      appContext.ui.ticketDraft = { image, filename: file.name, file };
      appContext.ui.ticketBusy = false;
      appContext.render(true);
    } catch {
      if (image) URL.revokeObjectURL(image);
      if (token === picking) {
        appContext.ui.ticketBusy = false;
        appContext.ui.ticketError = '图片暂时未能读取，请换一张试试。';
        appContext.render(true);
      }
    }
  }
  // Has the ticket read, the picked image or else the sample one, and opens the confirmation on
  // what it says. A ticket read before, on the way back from the confirmation, keeps what was
  // corrected there.
  async function recognizeTicket() {
    if (appContext.ui.ticketBusy) return;
    const draft = appContext.ui.ticketDraft,
      context = appContext.ui.ticketContext;
    if (!draft?.id) {
      const signal = begin();
      appContext.ui.ticketBusy = 'recognize';
      appContext.views.renderFooter();
      let ticket;
      try {
        ({ ticket } = await appContext.store.send(
          'recognizeTicket',
          {
            file: draft?.file || null,
            hint: context
              ? {
                  venueId: context.venueId,
                  day: context.day,
                  name: context.name,
                  city: context.city,
                  exhibit: context.exhibit,
                }
              : { venueId: appContext.ui.selected },
          },
          { signal },
        ));
      } catch {
        if (signal.aborted) return;
        appContext.ui.ticketBusy = false;
        appContext.ui.ticketError = '票根暂时未能识别，请再试一次。';
        appContext.render(true);
        return;
      }
      appContext.ui.ticketDraft = {
        image: '',
        filename: '',
        file: null,
        ...draft,
        id: ticket.id,
        venueId: ticket.venueId,
        customName: ticket.name,
        customCity: ticket.city,
        customExhibit: ticket.exhibit,
        visitedAt: ticket.visitedAt,
        selected: [],
        saveTicket: true,
      };
      appContext.ui.ticketError = '';
    }
    resetTicketSelection();
    appContext.navigation.navigate('ticket-confirm', appContext.ui.ticketDraft.venueId);
  }
  async function redeemTicket() {
    const d = appContext.ui.ticketDraft;
    if (!d || appContext.ui.claimBusy) return;
    updateTicketConfirmation();
    if (appContext.ui.ticketError) return;
    const signal = begin();
    appContext.ui.claimBusy = true;
    appContext.render(true);
    let claim;
    try {
      ({ claim } = await appContext.store.send(
        'redeemTicket',
        {
          id: d.id,
          venueId: d.venueId,
          name: d.customName,
          city: d.customCity,
          exhibit: d.customExhibit,
          visitedAt: d.visitedAt,
          stampIds: appContext.selectors.selectedTicketRewards().map((s) => s.id),
          file: d.file,
          saveTicket: d.saveTicket,
        },
        { signal },
      ));
    } catch (error) {
      if (signal.aborted) return;
      appContext.ui.claimBusy = false;
      if (error.code === 'ticket-mismatch')
        appContext.feedback.toast('请使用这张票根原有的参观信息');
      else
        appContext.ui.ticketError =
          error.code === 'media-unavailable'
            ? '当前浏览器暂时无法保存原图。可以重试，或取消保存票根后继续。'
            : '这次到访暂时没有保存成功，请再试一次。';
      appContext.render(true);
      return;
    }
    appContext.ui.ticketResult = claim;
    appContext.ui.visitKey = claim.visitKey;
    appContext.ui.visitDate = claim.visitedAt;
    clearTicketDraft();
    appContext.navigation.navigate('ticket-success', claim.venueId);
    appContext.ceremony.play();
  }
  async function collectStamp() {
    if (appContext.ui.claimBusy) return;
    // On site a visitor collects the stamp of the venue they stand in.
    const signal = begin(),
      id = appContext.selectors.stamp().id;
    appContext.ui.claimBusy = true;
    appContext.views.renderFooter();
    document.querySelector('.scan-area')?.classList.add('claim-progress');
    let claim;
    try {
      claim = await appContext.store.send(
        'claimStamp',
        { stampId: id, method: appContext.ui.scanMode === 'nfc' ? 'nfc' : 'qr' },
        { signal },
      );
    } catch {
      if (signal.aborted) return;
      appContext.ui.claimBusy = false;
      appContext.render(true);
      appContext.feedback.toast('暂时没有领取成功，请再试一次');
      return;
    }
    appContext.ui.duplicate = claim.duplicate;
    appContext.ui.visitDate = claim.day;
    appContext.navigation.navigate('success', id);
    appContext.ceremony.play();
  }
  // Takes a ticket's image out of the passport; its visit and its stamps stay.
  async function removeTicket(id) {
    try {
      await appContext.store.send('removeTicket', id);
      return true;
    } catch {
      return false;
    }
  }
  return {
    cancel,
    clearTicketDraft,
    hasUnsavedTicket,
    resetTicketSelection,
    updateTicketConfirmation,
    prepareTicketImage,
    recognizeTicket,
    redeemTicket,
    collectStamp,
    removeTicket,
  };
}
