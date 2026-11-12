import { test, expect } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

test('mobile forms have readable focus sizes and the confirmation stays within the viewport', async ({
  page,
}, testInfo) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/discover/museum');
    await expect(page.getByRole('searchbox')).toHaveCSS('font-size', '16px');
    await page.goto('/#/visit/landscape/2026-10-03');
    await page.locator('.memory-block .visit-add').click();
    await expect(page.locator('#memory-input')).toHaveCSS('font-size', '16px');
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.goto('/#/ticket/museum');
    await page.getByRole('button', { name: '用示例票根体验', exact: false }).click();
    await page.locator('#ticket-venue').selectOption('other');
    await page.locator('#ticket-custom-name').fill('VeryLongVenueNameWithoutSpaces'.repeat(2));
    await page.locator('#ticket-custom-city').fill('很长的城市名称'.repeat(4));
    await page.locator('#ticket-custom-exhibit').fill('很长的参观主题'.repeat(10));
    for (const field of await page.locator('.ticket-fields input,.ticket-fields select').all()) {
      await expect(field).toHaveCSS('font-size', '16px');
      const bounds = await field.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
    expect(await page.locator('#app-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#app-main').evaluate((el) => (el.scrollLeft = 100));
    expect(await page.locator('#app-main').evaluate((el) => el.scrollLeft)).toBe(0);
    await expect(page.locator('#app-main')).toHaveCSS('touch-action', 'pan-y pinch-zoom');
    await page.screenshot({ path: testInfo.outputPath(`confirmation-${width}.png`) });
  }
});

test('the scan page and the claim page fit the screen without scrolling, down to a small phone', async ({
  page,
}, testInfo) => {
  const overflow = () =>
    page.locator('#app-main').evaluate((el) => el.scrollHeight - el.clientHeight);
  for (const [width, height] of [
    [390, 844],
    [375, 667],
    [375, 603],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/#/scan/artmuseum');
    await expect(page.locator('.scan-place')).toBeVisible();
    expect(await overflow()).toBe(0);
    await page.getByRole('button', { name: '模拟再次到访', exact: true }).click();
    // The stamp, its number, its place in the collector's row and the way on are always there.
    for (const part of ['.success-art', '.issue-plate', '.success-shelf', '.success-moment'])
      await expect(page.locator(part)).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: '查看这次到访', exact: false })).toBeInViewport({
      ratio: 1,
    });
    expect(await overflow()).toBe(0);
    // The closing line is the first thing to go when the screen is short.
    await expect(page.locator('.success-line')).toBeVisible({ visible: height >= 844 });
    await page.screenshot({ path: testInfo.outputPath(`claim-${width}x${height}.png`) });
  }
});

test('a phone safe area adds space above the navigation controls', async ({ page }, testInfo) => {
  await page.goto('/#/ticket/museum');
  await page.addStyleTag({ content: ':root { --safe-top: 47px; }' });
  const header = await page.locator('#app-header').boundingBox();
  const back = await page.getByRole('button', { name: '返回', exact: true }).boundingBox();
  const main = await page.locator('#app-main').boundingBox();
  expect(header.height).toBe(106);
  expect(back.y).toBeGreaterThanOrEqual(47);
  expect(main.y).toBeGreaterThanOrEqual(106);
  await expect(page.locator('#app-header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: testInfo.outputPath('safe-area.png') });
});
