import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = path.join(root, 'src/assets/museum-courtyard.png');
const key = 'cultural-passport-prototype-v3';

test('saved originals restore after reload and can be removed without deleting the visit or stamps', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/ticket/museum');
  await page.locator('#ticket-album-input').setInputFiles(fixture);
  await page.getByRole('button', { name: '模拟识别票根', exact: false }).click();
  await expect(page.locator('#save-ticket-memory')).toBeChecked();
  await page.getByRole('button', { name: '确认收藏 2 枚纪念章', exact: false }).click();
  await page.getByRole('button', { name: '查看这次到访', exact: false }).click();
  await page.reload();
  await expect(page.locator('.saved-ticket-image')).toBeVisible();
  await page.waitForFunction(() => document.querySelector('.saved-ticket-image')?.naturalWidth > 0);
  await expect(page.locator('.visit-stamp-grid > button')).toHaveCount(2);
  await page
    .locator('.memory-block')
    .getByRole('button', { name: '留下一笔', exact: true })
    .click();
  await page.locator('#memory-input').fill('留住当时的心情');
  await page.getByRole('button', { name: '保存这一刻', exact: true }).click();
  await page.getByRole('button', { name: '移除票根', exact: true }).click();
  await page.getByRole('button', { name: '移除票根，保留到访', exact: true }).click();
  await expect(page.locator('.saved-ticket-card')).toHaveCount(0);
  await expect(page.locator('.visit-stamp-grid > button')).toHaveCount(2);
  await expect(page.locator('.memory-note')).toHaveText('留住当时的心情');
  await page.reload();
  await expect(page.locator('.saved-ticket-card')).toHaveCount(0);
  await expect(page.locator('.visit-stamp-grid > button')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('a custom venue can save a ticket memory without receiving a stamp', async ({ page }) => {
  await page.goto('/#/ticket/museum');
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await page.locator('#ticket-venue').selectOption('other');
  await page.locator('#ticket-custom-name').fill('云间艺术空间');
  await page.locator('#ticket-custom-city').fill('苏州');
  await page.locator('#ticket-custom-exhibit').fill('光影回廊');
  await page.getByRole('button', { name: '保存这次到访', exact: false }).click();
  await page.getByRole('button', { name: '查看这次到访', exact: false }).click();
  await expect(page.locator('.visit-name')).toHaveText('云间艺术空间');
  await expect(page.locator('.saved-ticket-card')).toHaveCount(1);
  await expect(page.locator('.visit-stamp-grid > button')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.visit-name')).toHaveText('云间艺术空间');
});

test('sharing keeps tickets private by default and exports the explicitly redacted copy', async ({
  page,
}) => {
  await page.goto('/#/visit/artmuseum/2026-10-24');
  await page.getByRole('button', { name: '分享这次到访', exact: true }).last().click();
  await expect(page.locator('.share-ticket-preview')).toHaveCount(0);
  await page.getByLabel('带上票根', { exact: true }).click();
  const apply = page.getByRole('button', { name: '使用当前票根', exact: true });
  await expect(apply).toBeEnabled();
  const box = await page.locator('#ticket-edit-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.9);
  await page.mouse.up();
  await apply.click();
  const preview = page.locator('.share-ticket-preview');
  await expect(preview).toBeVisible();
  const pixel = await preview.evaluate(async (image) => {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return [...context.getImageData(canvas.width * 0.28, canvas.height * 0.81, 1, 1).data];
  });
  expect(pixel.slice(0, 3).every((value) => value < 65)).toBe(true);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存旅行卡', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('2026-10-24');
  expect(await download.failure()).toBeNull();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.locator('.saved-ticket-open').click();
  await expect(page.locator('.full-ticket-preview .sample-ticket')).toBeVisible();
});

test('replacing demo state uses the new state in every module and restores original records', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  // The passport opens on the album; the footprints are a tab away.
  const footprints = () => page.getByRole('button', { name: /^足迹 \d+$/ }).click();
  await page.goto('/');
  await footprints();
  await expect(page.locator('.footprint-card')).toHaveCount(4);
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await footprints();
  await expect(page.locator('.footprint-card')).toHaveCount(0);
  await page.getByRole('button', { name: '添加第一张票根', exact: false }).click();
  await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
  await page.getByRole('button', { name: '确认收藏 2 枚纪念章', exact: false }).click();
  await page.getByRole('button', { name: '查看这次到访', exact: false }).click();
  await expect(page.locator('.visit-stamp-grid > button')).toHaveCount(2);
  await page.getByRole('button', { name: '返回已有收藏', exact: false }).click();
  await footprints();
  await expect(page.locator('.footprint-card')).toHaveCount(4);
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
});

test('the single-file export works offline without loading remote resources', async ({ page }) => {
  const remoteRequests = [];
  const errors = [];
  page.on('request', (request) => {
    if (!/^(file:|data:|blob:)/.test(request.url())) remoteRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, 'dist/standalone/旅行护照.html')).href);
  await page.getByRole('button', { name: '足迹 4', exact: true }).click();
  await expect(page.locator('.footprint-card')).toHaveCount(4);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  // The inlined stamp artwork must actually reach the stylesheet and decode.
  const artwork = await page
    .locator('.footprint-card .badge-art')
    .first()
    .evaluate(async (el) => {
      const image = new Image();
      image.src = getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, '');
      await image.decode();
      return image.naturalWidth;
    });
  expect(artwork).toBeGreaterThan(0);
  await page
    .locator('.footprint-card')
    .filter({ hasText: '白屿美术馆' })
    .getByRole('button')
    .click();
  await expect(page.locator('.visit-name')).toHaveText('白屿美术馆');
  expect(remoteRequests).toEqual([]);
  expect(errors).toEqual([]);
});
