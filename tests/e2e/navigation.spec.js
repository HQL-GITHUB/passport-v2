import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const fixture = fileURLToPath(new URL('../../assets-src/museum-courtyard.png', import.meta.url));
const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const scrollPosition = (page) => page.locator('#app-main').evaluate((el) => el.scrollTop);

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
  await expect(nav.locator('button')).toHaveText(['发现', '广场', '盖章', '收藏家', '护照']);
  await expect(actions).toHaveCount(0);
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await expect(actions).toHaveText('分享这枚纪念');
  await page.locator('.stamp-visit-link').click();
  await expect(actions).toHaveText('分享这次到访');
  await actions.click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'visit-share');
  await expect(actions).toHaveText(['保存旅行卡', '发布到广场']);
  // Three levels down, the passport is still one tap away, on the tab it was left on.
  await expect(page.locator('#app-footer button')).toHaveCount(5);
  await nav.getByRole('button', { name: '护照', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'passport');
  await expect(page.getByRole('button', { name: '章册 4/9', exact: true })).toHaveAttribute(
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
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await page.locator('.stamp-visit-link').click();
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.getByRole('button', { name: '章册 4/9', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
