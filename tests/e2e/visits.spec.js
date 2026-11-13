import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const fixture = fileURLToPath(new URL('../../assets-src/museum-courtyard.png', import.meta.url));
const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();

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
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
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
  await expect(page.getByRole('button', { name: '章册 5/9', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
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
  await expect(page.getByRole('button', { name: '章册 4/9', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '想去 0', exact: true }).click();
  await expect(page.locator('.collection-share')).toHaveCount(0);
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
