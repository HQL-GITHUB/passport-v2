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
  await page.getByRole('button', { name: '足迹 4', exact: true }).click();
  // The third visit sits below the first screen, so returning to it means returning to a scroll position.
  const card = page.locator('.footprint-card').nth(2).getByRole('button');
  await card.scrollIntoViewIfNeeded();
  const scroll = await scrollPosition(page);
  expect(scroll).toBeGreaterThan(0);
  await card.click();
  await expect(page.locator('.visit-name')).toHaveText('几何艺术中心');
  await page.locator('.visit-stamp-grid > button').click();
  await expect(page.locator('.stamp-title')).toHaveText('柔软的秩序');
  await page.getByRole('button', { name: '分享这枚纪念', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('柔软的秩序');
  await back(page);
  await expect(page.locator('.visit-name')).toHaveText('几何艺术中心');
  await back(page);
  await expect(page.getByRole('button', { name: '足迹 4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => scrollPosition(page)).toBe(scroll);
});

test('the navigation stays under every page and each page keeps its actions in its content', async ({
  page,
}) => {
  const nav = page.locator('#app-footer .bottom-nav'),
    actions = page.locator('#app-main #page-actions button');
  await page.goto('/');
  await expect(nav.locator('button')).toHaveText(['发现', '盖章', '护照']);
  await expect(actions).toHaveCount(0);
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await expect(actions).toHaveText('分享这枚纪念');
  await page.locator('.stamp-visit-link').click();
  await expect(actions).toHaveText('分享这次到访');
  await actions.click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'visit-share');
  await expect(actions).toHaveText('保存旅行卡');
  // Three levels down, the passport is still one tap away, on the tab it was left on.
  await expect(page.locator('#app-footer button')).toHaveCount(3);
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(page.getByRole('button', { name: '章册 4/5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // From a venue the middle button claims at that venue; while claiming it only marks the place.
  await page.goto('/#/venue/artmuseum');
  // The claim button belongs to the stamp's panel; saving the venue for later sits by its name.
  await expect(page.locator('.venue-stamp #page-actions button')).toHaveText('再次到馆盖章');
  const want = page.locator('.venue-heading .heart-button');
  await expect(want).toHaveAccessibleName('收藏为想去');
  await want.click();
  await expect(want).toHaveAccessibleName('取消想去收藏');
  await expect(want).toHaveAttribute('aria-pressed', 'true');
  await want.click();
  await expect(want).toHaveAttribute('aria-pressed', 'false');
  await nav.getByRole('button', { name: '现场盖章', exact: true }).click();
  await expect(page.locator('.scan-title')).toHaveText('光的形状');
  await expect(nav.getByRole('button', { name: '现场盖章', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await nav.getByRole('button', { name: '现场盖章', exact: true }).click();
  await expect(page.locator('.scan-title')).toHaveText('光的形状');
  await page.goto('/#/ticket/museum');
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'ticket-confirm');
  await expect(nav).toBeVisible();
  await expect(actions).toHaveText('确认收藏 2 枚纪念章');
});

test('leaving an unsaved ticket through the navigation asks first', async ({ page }) => {
  const nav = page.locator('#app-footer .bottom-nav'),
    dialog = page.getByRole('dialog');
  // With nothing imported there is nothing to lose.
  await page.goto('/#/ticket/museum');
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await page.goto('/#/ticket/museum');
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await page.locator('#ticket-date').fill('2025-10-20');
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(dialog).toContainText('离开票根入册？');
  await dialog.getByRole('button', { name: '继续入册', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'ticket-confirm');
  await expect(page.locator('#ticket-date')).toHaveValue('2025-10-20');
  await nav.getByRole('button', { name: '发现', exact: true }).click();
  await dialog.getByRole('button', { name: '离开，不保存', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'discover');
  // An imported image on the first page is asked about too.
  await page.goto('/#/ticket/museum');
  await page.locator('#ticket-album-input').setInputFiles(fixture);
  await expect(page.locator('.ticket-preview.has-image')).toBeVisible();
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(dialog).toContainText('离开票根入册？');
  // Once the visit is saved, the same ticket leaves freely.
  await dialog.getByRole('button', { name: '继续入册', exact: true }).click();
  await page.getByRole('button', { name: '模拟识别票根', exact: false }).click();
  await page.locator('#page-actions .button').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'ticket-success');
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
});

test('the album returns from a visit to the originating stamp and album tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await page.locator('.stamp-visit-link').click();
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.getByRole('button', { name: '章册 4/5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the album lists the stamps still to collect as slots that lead to how to get them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto('/');
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
  const slots = page.locator('.badge-card.unowned'),
    next = page.getByRole('button', { name: '下一页', exact: true });
  // The four collected stamps fill the first page, in the order they were collected, as in a
  // passport; the empty slot is on the next one.
  await expect(page.locator('.book-page[data-local="0"].stamp-leaf h3')).toHaveText([
    '器物与时间·2025',
    '柔软的秩序',
    '光的形状',
    '山川来信',
  ]);
  await expect(page.locator('.album-pending')).toHaveText('还有 1 枚，等你出发');
  await expect(slots).toHaveCount(1);
  await expect(slots.locator('h3')).toHaveText('青铜回响');
  await expect(slots.locator('.badge-pending')).toHaveText('到馆领取');
  await next.click();
  await slots.click();
  await expect(page.locator('.stamp-page')).toHaveClass(/unowned/);
  await expect(page.getByRole('button', { name: '到馆领取这枚章', exact: true })).toBeVisible();
  await back(page);
  await expect(page.getByRole('button', { name: '章册 4/5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.book-status')).toHaveText('章册 第 2 页，共 2 页');
  // A new passport shows the whole album as slots; an ended exhibition points to the ticket.
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await page.getByRole('button', { name: '章册 0/5', exact: true }).click();
  await expect(page.locator('.album-pending')).toHaveText('第一枚纪念章，等你出发');
  await expect(slots).toHaveCount(5);
  await expect(slots.filter({ hasText: '柔软的秩序' }).locator('.badge-pending')).toHaveText(
    '限量 · 还剩 1,895 枚',
  );
  const ended = slots.filter({ hasText: '器物与时间·2025' });
  await expect(ended.locator('.badge-pending')).toHaveText('可用票根补领');
  await next.click();
  await ended.click();
  await expect(page.getByRole('button', { name: '用票根补领这枚章', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
  await expect(page.locator('.badge-issue')).toHaveCount(4);
  // Under its number each collected stamp carries the day it was collected.
  const dated = page.locator('.badge-card').filter({ hasText: '光的形状' });
  await expect(dated.locator('.badge-date')).toHaveText('2026.10.24');
  await expect(dated.locator('p')).toHaveClass(['badge-issue', 'badge-date']);
  await expect(page.locator('.badge-card.unowned .badge-date')).toHaveCount(0);
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
  // The ceremony holds the stamp still; once it is over the stamp starts to turn. The tap that
  // ends it lands on the passport lying over the page.
  await expect(page.locator('.success-page')).toHaveClass(/ceremony/);
  expect(await angle(claimed)).toBe(0);
  await page.locator('.claim-book').click();
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
  await page.getByRole('button', { name: '足迹 4', exact: true }).click();
  await expect(page.locator('.footprint-year')).toHaveText([
    '2026年的文化足迹',
    '2025年的文化足迹',
  ]);
  const visit = page.locator('.footprint-stop').filter({ hasText: '临江博物馆' });
  await expect(visit.locator('.footprint-when b')).toHaveText('10.10');
  await expect(visit.locator('.collage-ticket .sample-ticket')).toBeVisible();
  await expect(visit.locator('.collage-badges .badge-edition')).toHaveCount(1);
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
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
  await expect(page.getByRole('button', { name: '章册 5/5', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '足迹 5', exact: true }).click();
  await expect(page.locator('.footprint-card')).toHaveCount(5);
});

test('footprints list each stamp with its edition mark and number', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '足迹 4', exact: true }).click();
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
  await page.getByRole('button', { name: '足迹 4', exact: true }).click();
  await page.getByRole('button', { name: '分享我的足迹', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share-footprints');
  // The card opens with the passport's data page: since when, the latest stop, the newest stamp.
  await expect(page.locator('.passport-id dd')).toHaveText(['2025.10.10', '山川影像馆 · 云川']);
  await expect(page.locator('.passport-id-stats b')).toHaveText(['04', '04', '02']);
  await expect(page.locator('.passport-id-photo .badge-art')).toHaveAttribute(
    'aria-label',
    '山川来信纪念章插画',
  );
  await expect(page.locator('.share-year')).toHaveText(['2026', '2025']);
  await expect(page.locator('.share-stop')).toHaveCount(4);
  await expect(page.locator('.share-paper')).not.toContainText('这一刻很安静');
  await expect(page.locator('.share-paper .sample-ticket')).toHaveCount(0);
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('旅行护照-我的足迹.png');
  await back(page);
  await expect(page.getByRole('button', { name: '足迹 4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '章册 4/5', exact: true }).click();
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
  await expect(page.getByRole('button', { name: '章册 4/5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '想去 0', exact: true }).click();
  await expect(page.locator('.collection-share')).toHaveCount(0);
});

test('the passport opens on its tabs, which stay in reach, and tickets have a tab of their own', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const tabs = page.locator('.collection-switch'),
    tab = (name) => page.getByRole('button', { name, exact: true });
  // The two bookmarks of the book lead, and the passport opens on the album.
  await expect(tabs.locator('button')).toHaveText(['章册4/5', '票根2', '足迹4', '想去0']);
  await expect(tab('章册 4/5')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.book-status')).toHaveText('章册 第 1 页，共 2 页');
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
  await tab('章册 4/5').click();
  await expect(book).toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
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
  await expect(status).toHaveText('章册 第 2 页，共 2 页');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(settled('collected', 1).locator('.badge-card h3')).toHaveText('青铜回响');
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
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
  await expect(book).toHaveAttribute('data-turned', '0');
  expect(await paper()).toBe(false);
  await expect(settled('collected', 0).locator('.badge-card')).toHaveCount(4);
  // After the album's last page the tickets begin: the tab and the header's share follow.
  await next.click();
  await next.click();
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await expect(tab('票根 2')).toHaveAttribute('aria-pressed', 'true');
  await expect(tab('章册 4/5')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.collection-share')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(status).toHaveText('票根 第 2 页，共 2 页');
  await expect(next).toBeDisabled();
  await expect(book).toHaveAttribute('data-turned', '3');
  await expect(
    settled('tickets', 1).getByRole('button', { name: '再添一张票根', exact: true }),
  ).toBeVisible();
  // A tab is a bookmark: it turns to the page its section was left on, without closing the
  // book, and a stamp opened from a page comes back to that page.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(status).toHaveText('章册 第 2 页，共 2 页');
  await tab('票根 2').click();
  await expect(book).not.toHaveClass(/covered/);
  await expect(status).toHaveText('票根 第 1 页，共 2 页');
  await tab('章册 4/5').click();
  await expect(book).not.toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 2 页，共 2 页');
  await expect(page.locator('#app-header .collection-share')).toHaveAttribute(
    'aria-label',
    '分享我的章册',
  );
  await settled('collected', 1).locator('.badge-card').click();
  await expect(page.locator('.stamp-title')).toHaveText('青铜回响');
  // Back from the stamp the passport is closed again: the cover opens and the pages turn on
  // to the one that was left.
  await back(page);
  await expect(book).toHaveClass(/covered/);
  await expect(status).toHaveText('章册 第 2 页，共 2 页');
  await expect(settled('collected', 1)).toHaveCount(1);
  // The bookmark of the open section goes back to its first page.
  await tab('章册 4/5').click();
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
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
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
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
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
  await expect(book).not.toHaveClass(/covered/);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(page.locator('.book-page:not([inert])')).toHaveCount(1);
  // Pulled back from the first page the cover comes over; pulled the other way it opens.
  await drag(0.3, 0.8);
  await expect(status).toHaveText('封面');
  await drag(0.8, 0.3);
  await expect(status).toHaveText('章册 第 1 页，共 2 页');
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
  await expect(book).toHaveAttribute('data-turned', '2');
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
  // A new stamp is first pressed into the passport, which lies over the page. The four earlier
  // stamps fill the first page of the album, so it opens on the second, where the place of
  // this one still holds the dimmed stamp it was waiting for.
  const book = page.locator('.claim-book .passport-book'),
    place = book.locator('.book-page[data-local="1"] .badge-card');
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
  // The stamp took the fifth place in the collector's own row, which completes the album.
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
  await expect(page.locator('.success-line')).toHaveText('这一册纪念章，集齐了');
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
  await expect(page.locator('.book-status')).toHaveText('章册 第 2 页，共 2 页');
  await expect(
    page.locator('.book-page[data-section="collected"][data-local="1"]:not(.book-copy) h3'),
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
  await expect(page.getByRole('button', { name: '章册 1/5', exact: true })).toHaveAttribute(
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

test('the visit keeps sharing in the footer and writing inside the memory section', async ({
  page,
}, testInfo) => {
  await page.goto('/#/visit/landscape/2026-10-31');
  const footer = page.locator('#page-actions button');
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
