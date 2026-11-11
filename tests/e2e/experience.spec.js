import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const fixture = fileURLToPath(new URL('../../src/assets/museum-courtyard.png', import.meta.url));
const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const scrollPosition = (page) => page.locator('#app-main').evaluate((el) => el.scrollTop);

test('discovery keeps city, category, search and scroll through app and browser navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto('/');
  await page.getByRole('button', { name: '发现', exact: true }).click();
  await page.getByRole('button', { name: '全部城市', exact: true }).click();
  await page.getByRole('button', { name: '临江', exact: true }).click();
  await page.getByRole('button', { name: '美术馆', exact: true }).click();
  await page.getByRole('searchbox').fill('白屿');
  await page.locator('#app-main').evaluate((el) => (el.scrollTop = el.scrollHeight));
  const scroll = await scrollPosition(page);
  expect(scroll).toBeGreaterThan(0);
  await page.locator('.venue-card').click();
  await expect(page.locator('.venue-title')).toHaveText('白屿美术馆');
  await page.locator('.venue-chapter').click();
  await expect(page.locator('.stamp-title')).toHaveText('光的形状');
  await back(page);
  await expect(page.locator('.venue-title')).toHaveText('白屿美术馆');
  await back(page);
  await expect(page.getByRole('searchbox')).toHaveValue('白屿');
  await expect(page.getByRole('button', { name: '美术馆', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.city-button')).toHaveText('临江');
  await expect.poll(() => scrollPosition(page)).toBe(scroll);
  await page.goForward();
  await expect(page.locator('.venue-title')).toHaveText('白屿美术馆');
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('白屿');
  await expect.poll(() => scrollPosition(page)).toBe(scroll);
});

test('a visit and its stamp return to the same footprint and reading position', async ({
  page,
}) => {
  await page.goto('/');
  const card = page.locator('.footprint-card').nth(1).getByRole('button');
  await card.scrollIntoViewIfNeeded();
  const scroll = await scrollPosition(page);
  await card.click();
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await page.locator('.visit-stamp-grid > button').click();
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await page.getByRole('button', { name: '分享这枚纪念', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.getByRole('button', { name: '足迹4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => scrollPosition(page)).toBe(scroll);
});

test('the album returns from a visit to the originating stamp and album tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '章册4', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await page.locator('.stamp-visit-link').click();
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.getByRole('button', { name: '章册4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('a collected stamp turns over to its visit record, an uncollected one stays face up', async ({
  page,
}) => {
  await page.goto('/#/stamp/artmuseum');
  await page.getByRole('button', { name: '放大欣赏光的形状纪念章', exact: true }).click();
  // The page shows the stamp as a medal of its own; the viewer opens a second, larger one.
  const viewer = page.locator('#modal-root'),
    stage = viewer.locator('.medal-stage');
  await expect(stage).toHaveAttribute('data-side', 'front');
  await page.getByRole('button', { name: '翻到背面', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'back');
  await expect(viewer.locator('.medal-back b')).toHaveText('2026.10.24');
  const issue = (await viewer.locator('.medal-back em').textContent()).trim();
  expect(issue).toMatch(/^No\. \d{6}$/);
  await expect(viewer.locator('.medal-rim')).toContainText('LJ-A-0002');
  await page.getByRole('button', { name: '翻回正面', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'front');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.locator('.visit-ticket-number b')).toHaveText(issue);
  await page.reload();
  await expect(page.locator('.visit-ticket-number b')).toHaveText(issue);
  await page.goto('/');
  await page.getByRole('button', { name: '章册4', exact: true }).click();
  await expect(page.locator('.badge-issue')).toHaveCount(4);
  await expect(
    page.locator('.badge-card').filter({ hasText: '光的形状' }).locator('.badge-issue'),
  ).toHaveText(issue);
  await page.goto('/#/stamp/museum');
  await page.getByRole('button', { name: '放大欣赏青铜回响纪念章', exact: true }).click();
  await expect(stage).toHaveAttribute('data-side', 'front');
  await expect(page.locator('.medal-back')).toHaveCount(0);
  await expect(page.locator('[data-medal-flip]')).toHaveCount(0);
});

test('a stamp turns slowly by itself until a drag takes over, on the stamp page and after a claim', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const angle = (stage) =>
      stage.evaluate((el) => parseFloat(el.style.getPropertyValue('--ry')) || 0),
    offFace = async (stage) => Math.abs((await angle(stage)) % 180);
  // Drags the stamp sideways, then checks that it came to rest on a face and stays there.
  async function takeOver(stage) {
    const box = await stage.boundingBox(),
      y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(() => offFace(stage)).toBe(0);
    // Still turning by itself, it would have left the face again by now.
    await page.waitForTimeout(600);
    await expect.poll(() => offFace(stage)).toBe(0);
  }
  await page.goto('/#/stamp/artmuseum');
  const shown = page.locator('.stamp-zoom .medal-stage');
  await expect.poll(() => angle(shown)).toBeGreaterThan(8);
  await takeOver(shown);
  // The drag turned the stamp; it did not open the viewer.
  await expect(page.locator('#modal-root > *')).toHaveCount(0);
  // An uncollected stamp has no back to show, so it only sways.
  await page.goto('/#/stamp/museum');
  await expect.poll(() => angle(shown)).toBeGreaterThan(8);
  await expect(shown).toHaveAttribute('data-side', 'front');
  await page.goto('/#/scan/museum');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  const claimed = page.locator('.success-art .medal-stage');
  // The ceremony holds the stamp still; once it is over the stamp starts to turn.
  await expect(page.locator('.success-page')).toHaveClass(/ceremony/);
  expect(await angle(claimed)).toBe(0);
  await page.locator('.success-page .page-title').click();
  await expect(page.locator('.success-page')).toHaveClass(/settled/);
  await expect.poll(() => angle(claimed)).toBeGreaterThan(8);
  await takeOver(claimed);
});

test('a limited stamp shows its edition and carries its number onto the share card', async ({
  page,
}) => {
  await page.goto('/#/stamp/modern');
  await expect(page.locator('.edition-meter-head b')).toHaveText('6,105 / 8,000');
  await expect(page.locator('.edition-meter p')).toContainText('还剩 1,895 枚');
  await expect(page.locator('.visit-ticket-number b')).toHaveText('No. 5620 / 8000');
  await page.getByRole('button', { name: '分享这枚纪念', exact: true }).click();
  await expect(page.locator('.share-issue')).toHaveText('No. 5620 / 8000');
  await page.goto('/#/stamp/artmuseum');
  await expect(page.locator('.edition-meter')).toHaveCount(0);
});

test('the demo passport holds a 2025 exhibition visit with its ticket, and the sample ticket adds a second one', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.footprint-year')).toHaveText([
    '2026年的文化足迹',
    '2025年的文化足迹',
  ]);
  const visit = page.locator('.footprint-stop').filter({ hasText: '临江博物馆' });
  await expect(visit.locator('.footprint-when b')).toHaveText('10.10');
  await expect(visit.locator('.collage-ticket .sample-ticket')).toBeVisible();
  await expect(visit.locator('.collage-badges .badge-edition')).toHaveCount(1);
  await page.getByRole('button', { name: '章册4', exact: true }).click();
  const card = page.locator('.badge-card').filter({ hasText: '器物与时间·2025' });
  await expect(card.locator('.badge-issue')).toHaveText('No. 03391 / 10000');
  await card.click();
  await expect(page.locator('.edition-meter-head')).toContainText('限时 · 限量发行');
  await expect(page.locator('.edition-meter-head b')).toHaveText('8,139 / 10,000');
  await expect(page.locator('.edition-meter p')).toContainText('仅限 2025.09.01 – 2025.12.31');
  await expect(page.locator('.stamp-visit-link')).toContainText('1 张票根');
  // The sample ticket is for a later day in the same exhibition: a new visit, a new venue stamp, the same number.
  await page.goto('/#/ticket/museum');
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await expect(page.locator('.ticket-duplicate-note')).toHaveCount(0);
  await expect(page.locator('.ticket-reward').nth(1)).toContainText('已有此章 · 补充这次到访');
  await page.getByRole('button', { name: '确认收藏 2 枚纪念章', exact: false }).click();
  await expect(page.locator('.success-sub')).toHaveText('票根已入册 · 1 枚新纪念章已收藏');
  await expect(page.locator('.issue-list b').nth(1)).toHaveText('No. 03391 / 10000');
  await page.getByRole('button', { name: '回到我的护照', exact: true }).click();
  await expect(page.getByRole('button', { name: '章册5', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '足迹5', exact: true }).click();
  await expect(page.locator('.footprint-card')).toHaveCount(5);
});

test('footprints list each stamp with its edition mark and number', async ({ page }) => {
  await page.goto('/');
  const limited = page.locator('.footprint-stop').filter({ hasText: '临江博物馆' });
  await expect(limited.locator('.footprint-stamp')).toHaveText(
    '器物与时间·2025特展No. 03391 / 10000',
  );
  const compact = page.locator('.footprint-stop').filter({ hasText: '几何艺术中心' });
  await expect(compact.locator('.footprint-stamp')).toHaveText('柔软的秩序限量No. 5620 / 8000');
  const plain = page.locator('.footprint-stop').filter({ hasText: '山川影像馆' });
  await expect(plain.locator('.footprint-stamp i')).toHaveCount(0);
  await expect(plain.locator('.footprint-stamp b')).toHaveText(/^No\. \d{6}$/);
});

test('the footprints and the album each share as one card without private memories', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '分享我的足迹', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share-footprints');
  await expect(page.locator('.share-year')).toHaveText(['2026', '2025']);
  await expect(page.locator('.share-stop')).toHaveCount(4);
  await expect(page.locator('.share-paper')).not.toContainText('这一刻很安静');
  await expect(page.locator('.share-paper .sample-ticket')).toHaveCount(0);
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('旅行护照-我的足迹.png');
  await back(page);
  await expect(page.getByRole('button', { name: '足迹4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '章册4', exact: true }).click();
  await page.getByRole('button', { name: '分享我的章册', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share-album');
  await expect(page.locator('.share-album .share-issue')).toHaveCount(4);
  await expect(page.locator('.share-album')).toContainText('No. 03391 / 10000');
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('旅行护照-我的章册.png');
  // Opened directly, the card still returns to the tab it shares.
  await page.goto('/#/share-album/museum');
  await back(page);
  await expect(page.getByRole('button', { name: '章册4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '想去0', exact: true }).click();
  await expect(page.locator('.collection-share')).toHaveCount(0);
});

test('a claim plays the stamping ceremony once, a tap settles it, and the stamp turns over in place', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#/scan/museum');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  const success = page.locator('.success-page');
  const stage = page.locator('.success-art .medal-stage');
  await expect(success).toHaveClass(/ceremony/);
  // While the ceremony plays, a tap on the stamp settles it without turning the stamp over.
  await stage.click();
  await expect(success).toHaveClass(/settled/);
  await expect(page.locator('.issue-plate')).toHaveText(/^No\. \d{6}$/);
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

test('the visit keeps sharing in the footer and writing inside the memory section', async ({
  page,
}, testInfo) => {
  await page.goto('/#/visit/landscape/2026-10-03');
  const footer = page.locator('#app-footer button');
  const invite = page.locator('.memory-block .visit-add');
  const write = page
    .locator('.memory-block')
    .getByRole('button', { name: '留下一笔', exact: true });
  const edit = page.getByRole('button', { name: '编辑记忆', exact: true });
  await expect(footer).toHaveCount(1);
  await expect(footer).toHaveText('分享这次到访');
  await expect(page.locator('#app-header button')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('visit-preview.png') });
  await footer.click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'visit-share');
  await back(page);
  await write.click();
  await page.locator('#memory-input').fill('   ');
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(invite).toBeVisible();
  await invite.click();
  await page.locator('#memory-input').fill('山里的光，值得记住。');
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveText('山里的光，值得记住。');
  await expect(invite).toHaveCount(0);
  await expect(footer).toHaveText('分享这次到访');
  await page.reload();
  await expect(page.locator('.memory-note')).toHaveText('山里的光，值得记住。');
  await edit.click();
  await page.locator('#memory-input').fill('');
  await page.locator('#photo-input').setInputFiles(fixture);
  await expect(page.locator('.photo-edit-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存这一刻', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveCount(0);
  await expect(edit).toBeVisible();
  await expect(footer).toHaveText('分享这次到访');
});
