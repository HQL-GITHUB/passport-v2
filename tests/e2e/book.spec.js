import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const scrollPosition = (page) => page.locator('#app-main').evaluate((el) => el.scrollTop);

test('the album lists the stamps still to collect as slots that lead to how to get them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto('/');
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
  const slots = page.locator('.badge-card.unowned'),
    next = page.getByRole('button', { name: '下一页', exact: true });
  // The four collected stamps fill the first page, in the order they were collected, as in a
  // passport; the empty slots follow on the next two.
  await expect(page.locator('.book-page[data-local="0"].stamp-leaf h3')).toHaveText([
    '器物与时间·2025',
    '柔软的秩序',
    '光的形状',
    '山川来信',
  ]);
  await expect(page.locator('.album-pending')).toHaveText('还有 5 枚，等你出发');
  await expect(slots.locator('h3')).toHaveText([
    '青铜回响',
    '一色入窑',
    '向海而行',
    '经纬之间',
    '星河有约',
  ]);
  await expect(slots.locator('.badge-pending')).toHaveText(Array(5).fill('到馆领取'));
  await next.click();
  await slots.first().click();
  await expect(page.locator('.stamp-title')).toHaveText('青铜回响');
  await expect(page.locator('.stamp-page')).toHaveClass(/unowned/);
  await expect(page.getByRole('button', { name: '到馆领取这枚章', exact: true })).toBeVisible();
  await back(page);
  await expect(page.getByRole('button', { name: '章册 4/9', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.book-status')).toHaveText('章册 第 2 页，共 3 页');
  // A new passport shows the whole album as slots; an ended exhibition points to the ticket.
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await page.getByRole('button', { name: '章册 0/9', exact: true }).click();
  await expect(page.locator('.album-pending')).toHaveText('第一枚纪念章，等你出发');
  await expect(slots).toHaveCount(9);
  await expect(slots.filter({ hasText: '柔软的秩序' }).locator('.badge-pending')).toHaveText(
    '限量 · 还剩 1,895 枚',
  );
  const ended = slots.filter({ hasText: '器物与时间·2025' });
  await expect(ended.locator('.badge-pending')).toHaveText('可用票根补领');
  await next.click();
  await next.click();
  await ended.click();
  await expect(page.getByRole('button', { name: '用票根补领这枚章', exact: true })).toBeVisible();
});

test('the four newer venues start uncollected, each with a photo and a stamp image of its own, and collecting them completes the album', async ({
  page,
}) => {
  const added = [
      ['porcelain', '青窑陶瓷博物馆', '一色入窑'],
      ['maritime', '临江航海博物馆', '向海而行'],
      ['textile', '经纬织造馆', '经纬之间'],
      ['astronomy', '云川天文馆', '星河有约'],
    ],
    claim = async (id) => {
      await page.goto(`/#/scan/${id}`);
      await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
      await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
    };
  await page.goto('/#/discover/museum');
  await expect(page.locator('#venue-count')).toHaveText('8 个目的地');
  for (const [id, name, stamp] of added) {
    await expect(page.locator(`.venue-card[data-id="${id}"] h3`)).toHaveText(name);
    // Not collected yet: the stamp on the card's corner says so, without a remark.
    await expect(page.locator(`.venue-card[data-id="${id}"] .venue-status`)).toHaveCount(0);
    await page.goto(`/#/venue/${id}`);
    await expect(page.locator('.venue-title')).toHaveText(name);
    await expect(page.locator('.venue-photo')).toHaveAttribute('alt', `${name}概念建筑`);
    await page.locator('.venue-photo').evaluate((image) => image.decode());
    await expect(page.locator('.venue-chapter h3')).toHaveText(stamp);
    await expect(page.locator('.venue-chapter p')).toContainText('现场领取');
    // The stamp is drawn from its own image, not from a tile of the atlas.
    const art = page.locator(`.venue-chapter .badge-${id}`),
      source = await art.evaluate((el) =>
        getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, ''),
      );
    expect(source).toContain(`badge-${id}`);
    await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
    }, source);
    await art.click();
    await expect(page.locator('.stamp-page')).toHaveClass(/unowned/);
    await expect(page.locator('.stamp-subtitle')).toContainText(name);
    await page.goto('/#/discover/museum');
  }
  // Collected on site, the first of them takes the fifth place in the passport, and its card
  // carries its own image.
  await claim('porcelain');
  await expect(page.locator('.success-place')).toHaveText('一色入窑');
  await expect(page.locator('.success-moment')).toHaveText('我的第 5 枚 · 已收入护照');
  await expect(page.locator('.success-shelf .shelf-current .badge-art')).toHaveClass(
    /badge-porcelain/,
  );
  await page.getByRole('button', { name: '分享这一刻', exact: true }).click();
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('旅行护照-青窑陶瓷博物馆-2026-11-10.png');
  // With the others and the venue stamp of the museum, the album is complete; its card draws
  // stamps from the atlas and from their own images side by side.
  for (const id of ['maritime', 'textile', 'astronomy', 'museum']) await claim(id);
  await expect(page.locator('.success-moment')).toHaveText('我的第 9 枚 · 已收入护照');
  await expect(page.locator('.success-line')).toHaveText('这一册纪念章，集齐了');
  await page.locator('.success-shelf').click();
  await expect(page.getByRole('button', { name: '章册 9/9', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.badge-card.unowned')).toHaveCount(0);
  await page.getByRole('button', { name: '分享我的章册', exact: true }).click();
  await expect(page.locator('.share-album .share-issue')).toHaveCount(9);
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('旅行护照-我的章册.png');
});

test('the passport opens on its tabs, which stay in reach, and tickets have a tab of their own', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const tabs = page.locator('.collection-switch'),
    tab = (name) => page.getByRole('button', { name, exact: true });
  // The two bookmarks of the book lead, and the passport opens on the album.
  await expect(tabs.locator('button')).toHaveText(['章册4/9', '票根2', '足迹4', '想去0']);
  await expect(tab('章册 4/9')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.book-status')).toHaveText('章册 第 1 页，共 3 页');
  // Sharing the open tab sits in the header, beside adding a ticket.
  await expect(page.locator('#app-header .collection-share')).toHaveAttribute(
    'aria-label',
    '分享我的章册',
  );
  await tab('足迹 4').click();
  await expect(page.locator('#app-header .collection-share')).toHaveAttribute(
    'aria-label',
    '分享我的足迹',
  );
  // The newest visit is a one-line stamp visit, the next a full card led by its printed ticket,
  // which already names the venue: the card has no heading of its own.
  await expect(page.locator('.footprint-when b')).toHaveText(['10.31', '10.24', '09.17', '10.10']);
  await expect(page.locator('.footprint-card').first()).toHaveClass(/compact/);
  const led = page.locator('.footprint-card').nth(1);
  await expect(led.locator('.sample-ticket > strong')).toHaveText('白屿美术馆');
  await expect(led.locator('h2')).toHaveCount(0);
  // Scrolled into the footprints, the tabs are still directly under the header.
  await page.locator('#app-main').evaluate((el) => (el.scrollTop = 600));
  const main = await page.locator('#app-main').boundingBox();
  expect((await tabs.boundingBox()).y).toBeCloseTo(main.y, 0);
  await tab('票根 2').click();
  await expect.poll(() => scrollPosition(page)).toBe(0);
  // The tickets are a page of the book: two to a page, and the page fits the screen.
  await expect(page.locator('.book-status')).toHaveText('票根 第 1 页，共 2 页');
  await expect(page.locator('.ticket-leaf .privacy').first()).toContainText('仅自己可见');
  await expect(page.locator('.ticket-card > b')).toHaveText(['2026.10.24', '2025.10.10']);
  await expect(page.locator('.ticket-thumb-badges .badge-art')).toHaveCount(2);
  await expect(page.locator('.collection-share')).toHaveCount(0);
  expect(
    await page
      .locator('#app-main')
      .evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  // A ticket opens at full size and leads to the visit it belongs to.
  await page.locator('.ticket-card').nth(1).click();
  await expect(page.locator('.full-ticket-preview .sample-ticket')).toBeVisible();
  await page.getByRole('button', { name: '查看这次到访', exact: false }).click();
  await expect(page.locator('.visit-name')).toHaveText('临江博物馆');
  await back(page);
  await expect(tab('票根 2')).toHaveAttribute('aria-pressed', 'true');
  // Each tab opens where it was left.
  await tab('足迹 4').click();
  await expect.poll(() => scrollPosition(page)).toBe(600);
  // A ticket removed from its visit leaves the wallet; a new passport has none yet.
  await page.goto('/#/visit/museum/2025-10-10');
  await page.getByRole('button', { name: '移除票根', exact: true }).click();
  await page.getByRole('button', { name: '移除票根，保留到访', exact: true }).click();
  await page.locator('#app-footer').getByRole('button', { name: '护照', exact: true }).click();
  await expect(tab('票根 1')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await tab('票根 0').click();
  await expect(page.locator('.empty-state h3')).toHaveText('去过的票根，都夹在这里。');
  await page.getByRole('button', { name: '添加第一张票根', exact: false }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'ticket');
});

test('the album and the tickets are pages of one book, turned by drag, pager, keys and tabs', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const tab = (name) => page.getByRole('button', { name, exact: true }),
    book = page.locator('.passport-book'),
    status = page.locator('.book-status'),
    next = page.getByRole('button', { name: '下一页', exact: true });
  // The page that is open once the turn has come to rest.
  const settled = (section, local) =>
    page.locator(
      `.book-page[data-section="${section}"][data-local="${local}"]:not([inert], .is-off)`,
    );
  // Pulls the page sideways, starting on the stamp in its upper right; held still before it
  // is let go, so that only the distance decides.
  async function drag(from, to) {
    const box = await page.locator('.book-stage').boundingBox(),
      y = box.y + box.height * 0.3;
    await page.mouse.move(box.x + box.width * from, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * to, y, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.up();
  }
  // Coming from the footprints the passport is closed: its cover opens on the album.
  await tab('足迹 4').click();
  await tab('章册 4/9').click();
  await expect(book).toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await expect(book).not.toHaveClass(/covered/);
  // A short pull lets the page fall back; a pull across turns it without opening the stamp.
  await drag(0.9, 0.78);
  await expect(settled('collected', 0)).toHaveCount(1);
  await expect(book).toHaveAttribute('data-page', '0');
  // The page is turned by a corner: taken low, its fold leans one way; taken high, the other;
  // and the page beneath is in the shadow of the lifted edge.
  for (const [height, lean] of [
    [0.9, 1],
    [0.1, -1],
  ]) {
    const box = await page.locator('.book-stage').boundingBox(),
      y = box.y + box.height * height;
    await page.mouse.move(box.x + box.width * 0.9, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 6 });
    const tilt = await page
      .locator('.book-bend')
      .evaluate((el) => parseFloat(el.style.transform.replace('rotate(', '')));
    expect(Math.sign(tilt)).toBe(lean);
    expect(Math.abs(tilt)).toBeGreaterThan(3);
    await expect(page.locator('.book-page[data-local="1"]').first()).toHaveCSS(
      '--cast',
      /linear-gradient/,
    );
    await page.mouse.move(box.x + box.width * 0.9, y, { steps: 3 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(page.locator('.book-bend')).toHaveCount(0);
  }
  await expect(book).toHaveAttribute('data-page', '0');
  await drag(0.8, 0.2);
  await expect(status).toHaveText('章册 第 2 页，共 3 页');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(settled('collected', 1).locator('.badge-card h3')).toHaveText([
    '青铜回响',
    '一色入窑',
    '向海而行',
    '经纬之间',
  ]);
  // The page that was turned now lies to the left of the gutter: its back, the same paper,
  // reaches the edge of the screen. On the first page the inside of the cover lies there.
  const left = page.locator('.book-left'),
    paper = () => left.evaluate((el) => getComputedStyle(el).backgroundImage.includes('radial')),
    gutter = (await page.locator('.book-stage').boundingBox()).x;
  await expect(book).toHaveAttribute('data-turned', '1');
  expect(await paper()).toBe(true);
  expect(await left.evaluate((el) => el.getBoundingClientRect().right)).toBeCloseTo(gutter, 0);
  expect(await left.evaluate((el) => el.getBoundingClientRect().left)).toBeLessThan(0);
  await drag(0.2, 0.8);
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await expect(book).toHaveAttribute('data-turned', '0');
  expect(await paper()).toBe(false);
  await expect(settled('collected', 0).locator('.badge-card')).toHaveCount(4);
  // After the album's last page the tickets begin: the tab and the header's share follow.
  await next.click();
  await next.click();
  await next.click();
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await expect(tab('票根 2')).toHaveAttribute('aria-pressed', 'true');
  await expect(tab('章册 4/9')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.collection-share')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(status).toHaveText('票根 第 2 页，共 2 页');
  await expect(next).toBeDisabled();
  await expect(book).toHaveAttribute('data-turned', '4');
  await expect(
    settled('tickets', 1).getByRole('button', { name: '再添一张票根', exact: true }),
  ).toBeVisible();
  // A tab is a bookmark: it turns to the page its section was left on, without closing the
  // book, and a stamp opened from a page comes back to that page.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(status).toHaveText('章册 第 3 页，共 3 页');
  await tab('票根 2').click();
  await expect(book).not.toHaveClass(/covered/);
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await tab('章册 4/9').click();
  await expect(book).not.toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 3 页，共 3 页');
  await expect(page.locator('#app-header .collection-share')).toHaveAttribute(
    'aria-label',
    '分享我的章册',
  );
  await settled('collected', 2).locator('.badge-card').click();
  await expect(page.locator('.stamp-title')).toHaveText('星河有约');
  // Back from the stamp the passport is closed again: the cover opens and the pages turn on
  // to the one that was left.
  await back(page);
  await expect(book).toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 3 页，共 3 页');
  await expect(settled('collected', 2)).toHaveCount(1);
  // The bookmark of the open section goes back to its first page.
  await tab('章册 4/9').click();
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await expect(settled('collected', 0)).toHaveCount(1);
  // Straight into the tickets from another tab, the book opens and turns through the album.
  await tab('足迹 4').click();
  await tab('票根 2').click();
  await expect(book).toHaveClass(/covered/);
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await expect(settled('tickets', 0).locator('.ticket-card')).toHaveCount(2);
});

test('the book closes back to its cover from the first page, and opens again by tap, pull or bookmark', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const book = page.locator('.passport-book'),
    stage = page.locator('.book-stage'),
    status = page.locator('.book-status'),
    prev = page.getByRole('button', { name: '上一页', exact: true });
  async function drag(from, to) {
    const box = await stage.boundingBox(),
      y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * from, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * to, y, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.up();
  }
  // The passport opens on the album by itself. Before its first page comes the cover.
  await expect(book).not.toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await prev.click();
  await expect(status).toHaveText('封面');
  await expect(book).toHaveClass(/shut/);
  await expect(prev).toBeDisabled();
  await expect(page.locator('.book-dots .cover')).toHaveClass(/active/);
  // The cover carries the title and the emblem; nothing under it can be reached, and the left
  // side of the open book is gone.
  await expect(page.locator('.front-out b')).toHaveText('旅行护照');
  await expect(page.locator('.cover-emblem')).toBeVisible();
  await expect(page.locator('.book-page:not([inert])')).toHaveCount(0);
  await expect(page.locator('.book-left')).toBeHidden();
  // A tap opens it on the first page, without pressing the stamp that lies under the finger.
  await stage.click();
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await expect(book).not.toHaveClass(/covered/);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(page.locator('.book-page:not([inert])')).toHaveCount(1);
  // Pulled back from the first page the cover comes over; pulled the other way it opens.
  await drag(0.3, 0.8);
  await expect(status).toHaveText('封面');
  await drag(0.8, 0.3);
  await expect(status).toHaveText('章册 第 1 页，共 3 页');
  await expect(book).not.toHaveClass(/shut/);
  // A bookmark opens the closed book and turns on to its section.
  await page.keyboard.press('ArrowLeft');
  await expect(status).toHaveText('封面');
  await page.getByRole('button', { name: '票根 2', exact: true }).click();
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await expect(page.getByRole('button', { name: '票根 2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(book).not.toHaveClass(/covered/);
  await expect(book).toHaveAttribute('data-turned', '3');
});
