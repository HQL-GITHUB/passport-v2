import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();

test('a claim plays the stamping ceremony once, a tap settles it, and the stamp turns over in place', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#/scan/museum');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  const success = page.locator('.success-page');
  const stage = page.locator('.success-art .medal-stage');
  await expect(success).toHaveClass(/ceremony/);
  // A new stamp is first pressed into the passport, which lies over the page. The four earlier
  // stamps fill the first page of the album, so it opens on the second, where the first place
  // is this one's and still holds the dimmed stamp it was waiting for.
  const book = page.locator('.claim-book .passport-book'),
    place = book.locator('.book-page[data-local="1"] .badge-card').first();
  await expect(book).toHaveAttribute('data-page', '1');
  await expect(place.locator('h3')).toHaveText('青铜回响');
  await expect(place.locator('.slot-seat')).toHaveCSS('opacity', '1');
  await expect(place.locator('.badge-frame > .badge-art')).toHaveCSS('opacity', '0');
  // While the ceremony plays, a tap settles it: the passport goes, and nothing under it is pressed.
  await page.locator('.claim-book').click();
  await expect(success).toHaveClass(/settled/);
  await expect(page.locator('.claim-book')).toHaveCount(0);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
  await expect(stage).toHaveAttribute('data-side', 'front');
  await expect(page.locator('.issue-plate')).toHaveText(/^No\. \d{6}$/);
  // The stamp took the fifth place in the collector's own row; four more are still to collect.
  await expect(page.locator('.success-shelf .shelf-item i')).toHaveText([
    '01',
    '02',
    '03',
    '04',
    '05',
  ]);
  await expect(page.locator('.success-shelf .shelf-current i')).toHaveText('05');
  await expect(page.locator('.success-shelf .shelf-current .badge-art')).toHaveClass(
    /badge-museum/,
  );
  await expect(page.locator('.success-shelf .shelf-current .badge-art')).toHaveCSS('opacity', '1');
  await expect(page.locator('.success-moment')).toHaveText('我的第 5 枚 · 已收入护照');
  await expect(page.locator('.success-line')).toHaveText('这一站，值得被记住');
  await expect(page.locator('.success-line')).toHaveCSS('opacity', '1');
  // The ground the stamp landed on stays under it.
  await expect(page.locator('.stamp-ground')).toHaveCSS('opacity', '1');
  await expect(stage).toHaveCSS('opacity', '1');
  await expect(stage).toHaveAttribute('data-side', 'front');
  await page.getByRole('button', { name: '翻到背面', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'back');
  await expect(page.locator('.medal-back em')).toHaveText(
    await page.locator('.issue-plate').textContent(),
  );
  await stage.click();
  await expect(stage).toHaveAttribute('data-side', 'front');
  await expect(page.locator('#modal-root > *')).toHaveCount(0);
  await page.reload();
  await expect(success).not.toHaveClass(/ceremony/);
});

test('left to play, the ceremony turns to the place of the stamp, presses it in and gives it to the page', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#/scan/museum');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  const success = page.locator('.success-page'),
    place = page.locator('.claim-book .badge-card[data-id="museum"]'),
    print = place.locator('.badge-frame > .badge-art');
  // The stamp comes down on its place and leaves its print; the number and the day fill in.
  await expect(print).toHaveCSS('opacity', '0');
  await expect(print).toHaveCSS('opacity', '1');
  await expect(place.locator('.slot-seat')).toHaveCSS('opacity', '0');
  await expect(place.locator('.badge-issue')).toHaveCSS('opacity', '1');
  await expect(place.locator('.badge-date')).toHaveText('2026.11.10');
  // Then the stamp rises to the page, the passport goes, and the page says the rest. The
  // number has rolled in the passport: on the page it is simply there.
  await expect(page.locator('.claim-book')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.success-art .medal-stage')).toHaveCSS('opacity', '1');
  await expect(page.locator('.issue-plate b:not([data-issue])')).toHaveText(/^\d{6}$/);
  await expect(success).toHaveClass(/settled/, { timeout: 8000 });
  await expect(page.locator('.success-line')).toHaveCSS('opacity', '1');
  // The album itself opens on that page, with the stamp in the same place.
  await page.locator('.success-shelf').click();
  await expect(page.locator('.book-status')).toHaveText('章册 第 2 页，共 3 页');
  await expect(
    page.locator('.book-page[data-section="collected"][data-local="1"]:not(.book-copy) h3').first(),
  ).toHaveText('青铜回响');
});

test('stamps from one ticket that lie on two pages are pressed in turn, the page turning between them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto('/');
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  // Three stamps on site leave one place on the first page of a new passport. The first-use
  // passport lives in memory, so the pages are reached without loading the app again.
  for (const id of ['artmuseum', 'landscape', 'modern']) {
    await page.evaluate((id) => (location.hash = `#/scan/${id}`), id);
    await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
  }
  await page.evaluate(() => (location.hash = '#/ticket/museum'));
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '确认收藏 2 枚纪念章', exact: false }).click();
  const book = page.locator('.claim-book .passport-book'),
    print = (id) => book.locator(`.badge-card[data-id="${id}"] .badge-frame > .badge-art`);
  // The venue's stamp takes the fourth place; the exhibition's is the first on the next page.
  await expect(book).toHaveAttribute('data-page', '0');
  await expect(print('museum')).toHaveCSS('opacity', '1');
  await expect(print('museum-exhibition')).toHaveCSS('opacity', '0');
  await expect(book).toHaveAttribute('data-page', '1');
  await expect(print('museum-exhibition')).toHaveCSS('opacity', '1');
  await expect(page.locator('.success-page')).toHaveClass(/settled/, { timeout: 10000 });
  await expect(page.locator('.claim-book')).toHaveCount(0);
  for (const stamp of await page.locator('.collage-badges > .badge-art').all())
    await expect(stamp).toHaveCSS('opacity', '1');
  await expect(page.locator('.issue-list b')).toHaveText([/^No\. \d{6}$/, /^No\. \d{5} \/ 10000$/]);
});

test('the claim page leads with the stamp and tells a return visit from a new stamp', async ({
  page,
}) => {
  await page.goto('/#/scan/artmuseum');
  await page.getByRole('button', { name: '模拟再次到访', exact: true }).click();
  const top = (selector) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);
  await expect(page.locator('.success-place')).toHaveText('光的形状');
  await expect(page.locator('.success-moment')).toHaveText('2026.11.10 · 第 2 次到访');
  await expect(page.locator('.success-line')).toHaveText('熟悉的地方，又添新的记忆');
  // The stamp was already in the passport: the collector's row marks the place it has, and adds none.
  await expect(page.locator('.success-shelf .shelf-item i')).toHaveText(['01', '02', '03', '04']);
  await expect(page.locator('.success-shelf .shelf-current i')).toHaveText('03');
  await expect(page.locator('.success-shelf .shelf-current .badge-art')).toHaveClass(
    /badge-artmuseum/,
  );
  expect(await top('.success-art')).toBeLessThan(await top('.success-place'));
  expect(await top('.success-moment')).toBeLessThan(await top('.success-line'));
  // The flip control is an icon on the medal; its name follows the side shown.
  const stage = page.locator('.success-art .medal-stage');
  await page.locator('.success-art').getByRole('button', { name: '翻到背面', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'back');
  await page.locator('.success-art').getByRole('button', { name: '翻回正面', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'front');
  // The way on from a claim is to share the stamp: the card carries this visit, not the first one.
  await expect(page.locator('#page-actions button')).toHaveText(['分享这一刻', '记录此刻的心情']);
  await page.getByRole('button', { name: '分享这一刻', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share');
  await expect(page.locator('.share-venue')).toHaveText('白屿美术馆');
  await expect(page.locator('.share-date')).toHaveText('2026.11.10 / 临江');
  await back(page);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
  await expect(page.locator('.success-place')).toHaveText('光的形状');
  // A limited stamp's number is read against its edition.
  await page.goto('/#/scan/modern');
  await page.getByRole('button', { name: '模拟再次到访', exact: true }).click();
  await expect(page.locator('.issue-plate')).toHaveText('No. 5620 / 8000');
  // A first stamp in a new passport stands alone in the row; from there the album marks it as new.
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto('/');
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await page.getByRole('button', { name: '现场盖章', exact: true }).click();
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  await expect(page.locator('.success-shelf .shelf-item i')).toHaveText(['01']);
  await expect(page.locator('.success-moment')).toHaveText('我的第 1 枚 · 已收入护照');
  await expect(page.locator('.success-line')).toHaveText('这一站，值得被记住');
  await page.locator('.success-shelf').click();
  await expect(page.getByRole('button', { name: '章册 1/9', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.badge-card').first()).toContainText('新');
  await expect(page.locator('.badge-kind.new')).toHaveCount(1);
});

test('each stamp from a ticket opens its own viewer, and reduced motion skips the ceremony', async ({
  page,
}) => {
  await page.goto('/#/ticket/museum');
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await page.getByRole('button', { name: '确认收藏 2 枚纪念章', exact: false }).click();
  await expect(page.locator('.success-page')).not.toHaveClass(/ceremony/);
  await expect(page.locator('.issue-list button')).toHaveCount(2);
  await page.locator('.issue-list button').nth(1).click();
  await expect(page.locator('#modal-title')).toHaveText('器物与时间·2025');
  await page.getByRole('button', { name: '翻到背面', exact: true }).click();
  await expect(page.locator('.medal-back b')).toHaveText('2025.10.18');
});
