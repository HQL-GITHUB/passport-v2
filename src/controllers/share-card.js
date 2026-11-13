import { icon, date, dateShort, issue } from '../lib/format.js';

/** Application module. Dependencies are provided by createApp(). */
export function createShareCardService(appContext) {
  const numerals = '"Passport Numerals", Georgia, serif',
    sans = '"Microsoft YaHei", sans-serif';
  // The colours a card uses more than once, which its preview has in styles/sharing.css: the
  // paper and the ink, the rule between its parts, and the greys of what is said beside a name,
  // of a number, and of a label on the dark page.
  const paper = '#fafbfe',
    ink = '#20242c',
    rule = '#e0e6f1',
    soft = '#7f899a',
    muted = '#5f6b80',
    faint = '#9aa3b5';
  // Canvas text only uses a web font that has finished loading.
  const loadNumerals = () => document.fonts.load(`40px ${numerals}`, '0').catch(() => {});
  // A stamp's illustration is its tile of the atlas, or the whole of an image of its own.
  const badgeSource = (s) => appContext.assets.badges[s.art] || appContext.assets.atlas;
  // Loads what the given stamps are drawn from, and answers with the function that draws one.
  async function loadBadges(stamps) {
    const images = new Map();
    await Promise.all(
      [...new Set(stamps.map(badgeSource))].map(async (src) =>
        images.set(src, await appContext.images.loadImage(src)),
      ),
    );
    return (s) => badgeTile(images.get(badgeSource(s)), s);
  }
  // Matches the bronze finish that .badge-edition gets in the stylesheet.
  function badgeTile(image, s) {
    const own = !!appContext.assets.badges[s.art],
      at = own ? 0 : s.tile,
      tw = image.naturalWidth / (own ? 1 : 2),
      th = image.naturalHeight / (own ? 1 : 2),
      tile = document.createElement('canvas');
    tile.width = tw;
    tile.height = th;
    const ctx = tile.getContext('2d'),
      draw = () =>
        ctx.drawImage(image, (at % 2) * tw, Math.floor(at / 2) * th, tw, th, 0, 0, tw, th);
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
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(90, fy);
    ctx.lineTo(990, fy);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c212c';
    ctx.font = `28px ${sans}`;
    ctx.fillText('旅行护照', 90, fy + 40);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8792a4';
    ctx.font = `22px ${sans}`;
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
  // Draws a card and saves it. Meanwhile the button that asked for it says so, and a second
  // card is not begun. `draw` answers the canvas and the name of its file.
  async function download(draw) {
    if (appContext.runtime.cardBusy) return;
    appContext.runtime.cardBusy = true;
    const button = appContext.dom.main.querySelector('[data-action="download-card"]');
    button.disabled = true;
    button.textContent = '正在生成旅行卡…';
    try {
      const { canvas, filename } = await draw();
      await saveCard(canvas, filename);
    } catch {
      appContext.feedback.toast('旅行卡暂未生成，请重试一次');
    } finally {
      appContext.runtime.cardBusy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.innerHTML = `${icon('download')}保存旅行卡`;
      }
    }
  }
  // The footprint or album overview, drawn to match the preview in views/sharing.js.
  async function drawJournalCard() {
    const c = appContext.selectors.journalShare(),
      badge = await loadBadges(
        [c.id.stamp, ...c.stamps, ...c.visits.flatMap((v) => v.badges)].filter(Boolean),
      ),
      columns = Math.min(3, c.stamps.length),
      size = [0, 520, 400, 260][columns],
      years = new Set(c.visits.map((v) => v.day.slice(0, 4))).size,
      body = c.album
        ? Math.ceil(c.stamps.length / columns) * (size + 130)
        : years * 96 + c.visits.length * 130;
    await loadNumerals();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 740 + body + (c.more > 0 ? 70 : 0) + 190;
    const ctx = canvas.getContext('2d'),
      // Long venue names end in an ellipsis instead of running into the stamps.
      fit = (text, width) => {
        if (ctx.measureText(text).width <= width) return text;
        let cut = Array.from(text);
        while (cut.length && ctx.measureText(cut.join('') + '…').width > width) cut.pop();
        return cut.join('') + '…';
      };
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 1080, canvas.height);
    ctx.textBaseline = 'top';
    // The passport's data page: the newest stamp sits where the photo would be.
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.roundRect(90, 80, 900, 470, 24);
    ctx.fill();
    ctx.fillStyle = faint;
    ctx.font = `22px ${sans}`;
    ctx.fillText('PASSPORT', 140, 120);
    ctx.textAlign = 'right';
    ctx.fillText('文化旅行护照', 940, 120);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff0d';
    ctx.strokeStyle = '#ffffff26';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, 178, 236, 280, 16);
    ctx.fill();
    ctx.stroke();
    if (c.id.stamp) ctx.drawImage(badge(c.id.stamp), 158, 218, 200, 200);
    [
      ['启用日期', date(c.id.since), `38px ${numerals}`],
      ['最近一站', c.id.latest, `500 32px ${sans}`],
    ].forEach(([label, value, font], i) => {
      const top = 178 + i * 96;
      ctx.fillStyle = faint;
      ctx.font = `21px ${sans}`;
      ctx.fillText(label, 424, top);
      ctx.fillStyle = '#fff';
      ctx.font = font;
      ctx.fillText(fit(value, 516), 424, top + 32);
    });
    c.stats.forEach(([count, label], i) => {
      const x = 424 + i * 172;
      ctx.fillStyle = '#fff';
      ctx.font = `46px ${numerals}`;
      ctx.fillText(String(count).padStart(2, '0'), x, 372);
      ctx.fillStyle = faint;
      ctx.font = `21px ${sans}`;
      ctx.fillText(label, x, 430);
    });
    ctx.strokeStyle = '#ffffff1f';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(140, 484);
    ctx.lineTo(940, 484);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7f8aa0';
    ctx.font = '21px Consolas, "Courier New", monospace';
    ctx.fillText(c.id.mrz.padEnd(Math.floor(800 / ctx.measureText('<').width), '<'), 140, 504);
    ctx.fillStyle = ink;
    ctx.font = `500 48px ${sans}`;
    ctx.fillText(c.album ? '每一枚，都是一次到访。' : '一路走来，有迹可循。', 88, 612);
    ctx.strokeStyle = rule;
    ctx.beginPath();
    ctx.moveTo(90, 704);
    ctx.lineTo(990, 704);
    ctx.stroke();
    let y = 740;
    if (c.album) {
      const gap = 40,
        left = (1080 - columns * size - (columns - 1) * gap) / 2;
      ctx.textAlign = 'center';
      c.stamps.forEach((s, i) => {
        const x = left + (i % columns) * (size + gap),
          top = y + Math.floor(i / columns) * (size + 130);
        ctx.drawImage(badge(s), x, top, size, size);
        ctx.fillStyle = ink;
        ctx.font = `500 26px ${sans}`;
        ctx.fillText(fit(s.title, size + gap - 8), x + size / 2, top + size + 12);
        ctx.fillStyle = muted;
        ctx.font = `23px ${numerals}`;
        ctx.fillText(issue(appContext.data.records[s.id], s), x + size / 2, top + size + 52);
      });
      y += body;
    } else {
      let year = '';
      for (const v of c.visits) {
        ctx.textAlign = 'left';
        if (year !== v.day.slice(0, 4)) {
          year = v.day.slice(0, 4);
          ctx.fillStyle = ink;
          ctx.font = `52px ${numerals}`;
          ctx.fillText(year, 90, y + 8);
          y += 96;
        }
        ctx.fillStyle = ink;
        ctx.font = `40px ${numerals}`;
        ctx.fillText(dateShort(v.day), 90, y + 22);
        ctx.font = `500 36px ${sans}`;
        ctx.fillText(fit(v.name, 500), 260, y + 8);
        ctx.fillStyle = soft;
        ctx.font = `25px ${sans}`;
        ctx.fillText(fit(v.city, 500), 260, y + 62);
        v.badges
          .slice(0, 2)
          .forEach((s, i) => ctx.drawImage(badge(s), 990 - 104 - i * 92, y, 104, 104));
        y += 130;
      }
    }
    if (c.more > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = soft;
      ctx.font = `25px ${sans}`;
      ctx.fillText(
        c.album ? `以及另外 ${c.more} 枚纪念章` : `以及更早的 ${c.more} 次到访`,
        540,
        y + 10,
      );
    }
    drawFooter(ctx, canvas.height);
    return { canvas, filename: `旅行护照-${c.album ? '我的章册' : '我的足迹'}.png` };
  }
  // The card of one stamp or of one visit, with what was ticked to go on it.
  async function drawCard() {
    const c = appContext.selectors.getShareContext(),
      v = c.visit,
      badge = await loadBadges(c.badges),
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
    ctx.font = `30px ${sans}`;
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
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 1080, canvas.height);
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#7a88a1';
    ctx.font = `22px ${sans}`;
    ctx.fillText('CULTURAL TRAVEL JOURNAL', 90, 75);
    ctx.fillText(v.day.slice(0, 4), 925, 75);
    ctx.fillStyle = ink;
    ctx.font = `500 84px ${sans}`;
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
        ctx.drawImage(badge(s), x, y, size, size);
        ctx.textAlign = 'center';
        ctx.font = `22px ${sans}`;
        ctx.fillStyle = '#728099';
        ctx.fillText(s.title, x + size / 2, y + size + 5);
        ctx.font = `23px ${numerals}`;
        ctx.fillStyle = muted;
        ctx.fillText(issue(appContext.data.records[s.id], s), x + size / 2, y + size + 40);
      }
      y += badgeH + 35;
    } else if (!ticket) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1c212c';
      ctx.font = `110px ${numerals}`;
      ctx.fillText(dateShort(v.day), 540, y + 35);
      y += 260;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.font = `500 38px ${sans}`;
    const names = appContext.images.wrapText(ctx, v.name, 880, 2);
    for (const line of names) {
      ctx.fillText(line, 540, y);
      y += 48;
    }
    ctx.fillStyle = soft;
    ctx.font = `25px ${sans}`;
    ctx.fillText(`${date(v.day)} / ${v.city}`, 540, y + 8);
    y += 72;
    ctx.font = `30px ${sans}`;
    ctx.fillStyle = muted;
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
    return { canvas, filename: `旅行护照-${v.name}-${v.day}.png` };
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
    ctx.font = `21px ${sans}`;
    ctx.fillText('VISITOR’S PASS / 示例票根', 65, 75);
    ctx.fillStyle = ink;
    ctx.font = `500 55px ${sans}`;
    ctx.fillText(v.name, 65, 170);
    ctx.font = `28px ${sans}`;
    ctx.fillStyle = '#6f7d94';
    ctx.fillText(v.exhibit || '一次值得收藏的参观', 65, 232);
    ctx.font = `25px ${sans}`;
    ctx.fillText('参观日期', 65, 345);
    ctx.fillStyle = ink;
    ctx.font = `40px ${numerals}`;
    ctx.fillText(date(v.day), 660, 345);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#d8e1f1';
    ctx.beginPath();
    ctx.moveTo(65, 405);
    ctx.lineTo(935, 405);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7c879a';
    for (let x = 65; x < 380; x += 7) ctx.fillRect(x, 448, (x % 3) + 2, 71);
    ctx.font = `21px ${sans}`;
    ctx.fillText('旅行中的一页', 720, 475);
    ctx.fillText('仅供原型演示', 720, 515);
    return appContext.images.loadImage(canvas.toDataURL('image/png'));
  }
  return {
    downloadCard: () => download(drawCard),
    downloadJournalCard: () => download(drawJournalCard),
    sampleTicketImage,
  };
}
