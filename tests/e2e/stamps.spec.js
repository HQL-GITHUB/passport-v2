import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();

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
  await page.getByRole('button', { name: '章册 4/9', exact: true }).click();
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
