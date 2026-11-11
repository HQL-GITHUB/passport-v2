/** Application module. Dependencies are provided by createApp(). */
export function createShareCardService(appContext) {
  const numerals = '"Passport Numerals", Georgia, serif';
  // Canvas text only uses a web font that has finished loading.
  const loadNumerals = () => document.fonts.load(`40px ${numerals}`, '0').catch(() => {});
  // Matches the bronze finish that .badge-edition gets in the stylesheet.
  function badgeTile(atlas, s) {
    const tw = atlas.naturalWidth / 2,
      th = atlas.naturalHeight / 2,
      tile = document.createElement('canvas');
    tile.width = tw;
    tile.height = th;
    const ctx = tile.getContext('2d'),
      draw = () =>
        ctx.drawImage(atlas, (s.tile % 2) * tw, Math.floor(s.tile / 2) * th, tw, th, 0, 0, tw, th);
    draw();
    if (s.edition) {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#a8814d';
      ctx.fillRect(0, 0, tw, th);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-in';
      draw();
    }
    return tile;
  }
  function drawFooter(ctx, height) {
    const fy = height - 130;
    ctx.strokeStyle = '#e0e6f1';
    ctx.beginPath();
    ctx.moveTo(90, fy);
    ctx.lineTo(990, fy);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2455e8';
    ctx.font = '28px "Microsoft YaHei", sans-serif';
    ctx.fillText('旅行护照', 90, fy + 40);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8792a4';
    ctx.font = '22px "Microsoft YaHei", sans-serif';
    ctx.fillText('每一站，都值得被记住。', 990, fy + 44);
  }
  async function saveCard(canvas, filename) {
    const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export'))), 'image/png'),
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    appContext.feedback.toast('旅行卡已生成，请查看下载');
  }
  // The footprint or album overview, drawn to match the preview in views/sharing.js.
  async function downloadJournalCard() {
    if (appContext.runtime.cardBusy) return;
    appContext.runtime.cardBusy = true;
    const button = appContext.dom.footer.querySelector('[data-action="download-card"]');
    button.disabled = true;
    button.textContent = '正在生成旅行卡…';
    try {
      const c = appContext.selectors.journalShare(),
        atlas = await appContext.images.loadImage(appContext.assets.atlas),
        sans = '"Microsoft YaHei", sans-serif',
        columns = Math.min(3, c.stamps.length),
        size = [0, 520, 400, 260][columns],
        years = new Set(c.visits.map((v) => v.day.slice(0, 4))).size,
        body = c.album
          ? Math.ceil(c.stamps.length / columns) * (size + 130)
          : years * 96 + c.visits.length * 130;
      await loadNumerals();
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 590 + body + (c.more > 0 ? 70 : 0) + 190;
      const ctx = canvas.getContext('2d'),
        // Long venue names end in an ellipsis instead of running into the stamps.
        fit = (text, width) => {
          if (ctx.measureText(text).width <= width) return text;
          let cut = Array.from(text);
          while (cut.length && ctx.measureText(cut.join('') + '…').width > width) cut.pop();
          return cut.join('') + '…';
        };
      ctx.fillStyle = '#fafbfe';
      ctx.fillRect(0, 0, 1080, canvas.height);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7a88a1';
      ctx.font = `22px ${sans}`;
      ctx.fillText('CULTURAL TRAVEL JOURNAL', 90, 75);
      ctx.textAlign = 'right';
      ctx.fillText(c.span, 990, 75);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#20242c';
      ctx.font = `500 84px ${sans}`;
      ctx.fillText(c.album ? '每一枚，' : '一路走来，', 85, 160);
      ctx.fillText(c.album ? '都是一次到访。' : '有迹可循。', 85, 272);
      c.stats.forEach(([count, label], i) => {
        const x = 90 + i * 300,
          number = String(count).padStart(2, '0');
        ctx.fillStyle = '#20242c';
        ctx.font = `64px ${numerals}`;
        ctx.fillText(number, x, 420);
        const w = ctx.measureText(number).width;
        ctx.fillStyle = '#626c7b';
        ctx.font = `26px ${sans}`;
        ctx.fillText(label, x + w + 14, 452);
      });
      ctx.strokeStyle = '#e0e6f1';
      ctx.beginPath();
      ctx.moveTo(90, 530);
      ctx.lineTo(990, 530);
      ctx.stroke();
      let y = 590;
      if (c.album) {
        const gap = 40,
          left = (1080 - columns * size - (columns - 1) * gap) / 2;
        ctx.textAlign = 'center';
        c.stamps.forEach((s, i) => {
          const x = left + (i % columns) * (size + gap),
            top = y + Math.floor(i / columns) * (size + 130);
          ctx.drawImage(badgeTile(atlas, s), x, top, size, size);
          ctx.fillStyle = '#20242c';
          ctx.font = `500 26px ${sans}`;
          ctx.fillText(fit(s.stamp, size + gap - 8), x + size / 2, top + size + 12);
          ctx.fillStyle = '#5f6b80';
          ctx.font = `23px ${numerals}`;
          ctx.fillText(
            appContext.format.issue(appContext.data.records[s.id], s),
            x + size / 2,
            top + size + 52,
          );
        });
        y += body;
      } else {
        let year = '';
        for (const v of c.visits) {
          ctx.textAlign = 'left';
          if (year !== v.day.slice(0, 4)) {
            year = v.day.slice(0, 4);
            ctx.fillStyle = '#20242c';
            ctx.font = `52px ${numerals}`;
            ctx.fillText(year, 90, y + 8);
            y += 96;
          }
          ctx.fillStyle = '#20242c';
          ctx.font = `40px ${numerals}`;
          ctx.fillText(appContext.format.dateShort(v.day), 90, y + 22);
          ctx.font = `500 36px ${sans}`;
          ctx.fillText(fit(v.name, 500), 260, y + 8);
          ctx.fillStyle = '#7f899a';
          ctx.font = `25px ${sans}`;
          ctx.fillText(fit(v.city, 500), 260, y + 62);
          v.badges
            .slice(0, 2)
            .forEach((s, i) => ctx.drawImage(badgeTile(atlas, s), 990 - 104 - i * 92, y, 104, 104));
          y += 130;
        }
      }
      if (c.more > 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#7f899a';
        ctx.font = `25px ${sans}`;
        ctx.fillText(
          c.album ? `以及另外 ${c.more} 枚纪念章` : `以及更早的 ${c.more} 次到访`,
          540,
          y + 10,
        );
      }
      drawFooter(ctx, canvas.height);
      await saveCard(canvas, `旅行护照-${c.album ? '我的章册' : '我的足迹'}.png`);
    } catch {
      appContext.feedback.toast('旅行卡暂未生成，请重试一次');
    } finally {
      appContext.runtime.cardBusy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.innerHTML = `${appContext.format.icon('download')}保存旅行卡`;
      }
    }
  }
  async function downloadCard() {
    if (appContext.runtime.cardBusy) return;
    appContext.runtime.cardBusy = true;
    const button = appContext.dom.footer.querySelector('[data-action="download-card"]');
    button.disabled = true;
    button.textContent = '正在生成旅行卡…';
    try {
      const c = appContext.selectors.getShareContext(),
        v = c.visit,
        atlas = await appContext.images.loadImage(appContext.assets.atlas),
        ticket =
          appContext.ui.includeTicket && appContext.ui.shareTicket
            ? await appContext.images.loadImage(appContext.ui.shareTicket)
            : null,
        photo =
          appContext.ui.includePhoto && c.photo ? await appContext.images.loadImage(c.photo) : null,
        note = appContext.ui.includeNote ? c.note : '';
      await loadNumerals();
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      const ctx = canvas.getContext('2d');
      ctx.font = '30px "Microsoft YaHei", sans-serif';
      const lines = note ? appContext.images.wrapText(ctx, note, 850) : [];
      const ticketH = ticket ? Math.min(650, (880 * ticket.height) / ticket.width) : 0,
        // Each stamp carries its name and collector number underneath.
        badgeH = c.badges.length
          ? ticket
            ? 328
            : c.badges.length > 1
              ? 498
              : 658
          : ticket
            ? 0
            : 260;
      canvas.height = Math.round(
        660 + ticketH + badgeH + lines.length * 48 + (photo ? 460 : 0) + 180,
      );
      ctx.fillStyle = '#fafbfe';
      ctx.fillRect(0, 0, 1080, canvas.height);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7a88a1';
      ctx.font = '22px "Microsoft YaHei", sans-serif';
      ctx.fillText('CULTURAL TRAVEL JOURNAL', 90, 75);
      ctx.fillText(v.day.slice(0, 4), 925, 75);
      ctx.fillStyle = '#20242c';
      ctx.font = '500 84px "Microsoft YaHei", sans-serif';
      ctx.fillText('此行，', 85, 160);
      ctx.fillText('有迹可循。', 85, 272);
      let y = 405;
      if (ticket) {
        const ratio = Math.min(880 / ticket.width, ticketH / ticket.height),
          w = ticket.width * ratio,
          h = ticket.height * ratio;
        ctx.drawImage(ticket, (1080 - w) / 2, y, w, h);
        y += ticketH + 32;
      }
      if (c.badges.length) {
        const size = ticket ? 250 : c.badges.length > 1 ? 420 : 600,
          gap = 24,
          total = c.badges.length * size + (c.badges.length - 1) * gap;
        for (let i = 0; i < c.badges.length; i++) {
          const s = c.badges[i],
            x = (1080 - total) / 2 + i * (size + gap);
          ctx.drawImage(badgeTile(atlas, s), x, y, size, size);
          ctx.textAlign = 'center';
          ctx.font = '22px "Microsoft YaHei", sans-serif';
          ctx.fillStyle = '#728099';
          ctx.fillText(s.stamp, x + size / 2, y + size + 5);
          ctx.font = `23px ${numerals}`;
          ctx.fillStyle = '#5f6b80';
          ctx.fillText(
            appContext.format.issue(appContext.data.records[s.id], s),
            x + size / 2,
            y + size + 40,
          );
        }
        y += badgeH + 35;
      } else if (!ticket) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2455e8';
        ctx.font = `110px ${numerals}`;
        ctx.fillText(appContext.format.dateShort(v.day), 540, y + 35);
        y += 260;
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#20242c';
      ctx.font = '500 38px "Microsoft YaHei", sans-serif';
      const names = appContext.images.wrapText(ctx, v.name, 880, 2);
      for (const line of names) {
        ctx.fillText(line, 540, y);
        y += 48;
      }
      ctx.fillStyle = '#7f899a';
      ctx.font = '25px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${appContext.format.date(v.day)} / ${v.city}`, 540, y + 8);
      y += 72;
      ctx.font = '30px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#5f6b80';
      for (const line of lines) {
        ctx.fillText(line, 540, y);
        y += 48;
      }
      if (photo) {
        y += 20;
        const ratio = Math.max(900 / photo.width, 405 / photo.height),
          sw = 900 / ratio,
          sh = 405 / ratio;
        ctx.drawImage(
          photo,
          (photo.width - sw) / 2,
          (photo.height - sh) / 2,
          sw,
          sh,
          90,
          y,
          900,
          405,
        );
      }
      drawFooter(ctx, canvas.height);
      await saveCard(canvas, `旅行护照-${v.name}-${v.day}.png`);
    } catch {
      appContext.feedback.toast('旅行卡暂未生成，请重试一次');
    } finally {
      appContext.runtime.cardBusy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.innerHTML = `${appContext.format.icon('download')}保存旅行卡`;
      }
    }
  }
  async function sampleTicketImage(id) {
    const t = appContext.data.tickets[id],
      v = appContext.data.visits[appContext.domain.key(t.venueId, t.visitedAt)],
      canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');
    await loadNumerals();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 1000, 620);
    ctx.strokeStyle = '#dfe5ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 994, 614);
    ctx.fillStyle = '#8793a8';
    ctx.font = '21px "Microsoft YaHei", sans-serif';
    ctx.fillText('VISITOR’S PASS / 示例票根', 65, 75);
    ctx.fillStyle = '#20242c';
    ctx.font = '500 55px "Microsoft YaHei", sans-serif';
    ctx.fillText(v.name, 65, 170);
    ctx.font = '28px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#6f7d94';
    ctx.fillText(v.exhibit || '一次值得收藏的参观', 65, 232);
    ctx.font = '25px "Microsoft YaHei", sans-serif';
    ctx.fillText('参观日期', 65, 345);
    ctx.fillStyle = '#20242c';
    ctx.font = `40px ${numerals}`;
    ctx.fillText(appContext.format.date(v.day), 660, 345);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#d8e1f1';
    ctx.beginPath();
    ctx.moveTo(65, 405);
    ctx.lineTo(935, 405);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7c879a';
    for (let x = 65; x < 380; x += 7) ctx.fillRect(x, 448, (x % 3) + 2, 71);
    ctx.font = '21px "Microsoft YaHei", sans-serif';
    ctx.fillText('旅行中的一页', 720, 475);
    ctx.fillText('仅供原型演示', 720, 515);
    return appContext.images.loadImage(canvas.toDataURL('image/png'));
  }
  return {
    downloadCard,
    downloadJournalCard,
    sampleTicketImage,
  };
}
