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
  await page.getByRole('button', { name: '分享这枚纪念章', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'share');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.getByRole('button', { name: '足迹3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => scrollPosition(page)).toBe(scroll);
});

test('the album returns from a visit to the originating stamp and album tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '章册3', exact: true }).click();
  await page.locator('.badge-card').filter({ hasText: '山川来信' }).click();
  await page.locator('.stamp-visit-link').click();
  await expect(page.locator('.visit-name')).toHaveText('山川影像馆');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('山川来信');
  await back(page);
  await expect(page.getByRole('button', { name: '章册3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the visit prioritizes writing until a note or photo is saved', async ({ page }, testInfo) => {
  await page.goto('/#/visit/landscape/2026-10-03');
  const primary = page.locator('#app-footer .button');
  await expect(primary).toHaveText('留下一笔');
  await page.screenshot({ path: testInfo.outputPath('visit-preview.png') });
  await page.getByRole('button', { name: '分享这次到访', exact: true }).first().click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'visit-share');
  await back(page);
  await expect(primary).toHaveText('留下一笔');
  await primary.click();
  await page.locator('#memory-input').fill('   ');
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(primary).toHaveText('留下一笔');
  await primary.click();
  await page.locator('#memory-input').fill('山里的光，值得记住。');
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(primary).toHaveText('分享这次到访');
  await page.reload();
  await expect(primary).toHaveText('分享这次到访');
  await page.getByRole('button', { name: '补充这次到访的记忆', exact: true }).click();
  await page.locator('#memory-input').fill('');
  await page.locator('#photo-input').setInputFiles(fixture);
  await expect(page.locator('.photo-edit-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存这一刻', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await expect(page.locator('.memory-note')).toHaveCount(0);
  await expect(primary).toHaveText('分享这次到访');
});
