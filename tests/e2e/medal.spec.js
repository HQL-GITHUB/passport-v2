import { test, expect } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });

const entries = {
  source: '/',
  website: '/dist/site/index.html',
  standalone: new URL('../../dist/standalone/旅行护照.html', import.meta.url).href,
};

for (const [build, entry] of Object.entries(entries)) {
  test(`${build}: a tilted medal keeps its artwork and engraving above the rim on mobile`, async ({
    page,
  }, testInfo) => {
    async function checkTilt(stage, side, dy) {
      const box = await stage.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + dy, {
        steps: 4,
      });
      await expect(stage).toHaveClass(/dragging/);
      await expect(stage).toHaveAttribute('data-side', side);
      expect(
        await stage.evaluate((el) => Math.abs(parseFloat(el.style.getPropertyValue('--rx')))),
      ).toBeGreaterThan(2);

      // A zero-height rim puts its sorting centre at the top edge instead of the medal's centre.
      const edge = stage.locator('.medal-edge');
      expect(
        await edge.evaluate((el) => ({
          width: el.offsetWidth,
          height: el.offsetHeight,
          left: el.offsetLeft,
          top: el.offsetTop,
        })),
      ).toEqual(
        await stage.locator('.medal').evaluate((el) => ({
          width: el.offsetWidth,
          height: el.offsetHeight,
          left: 0,
          top: 0,
        })),
      );

      // Hiding the rim must not change any pixels at the centre of the visible face.
      const face = await stage.locator(`.medal-${side}`).boundingBox();
      const clip = {
        x: Math.round(face.x + face.width / 2 - 24),
        y: Math.round(face.y + face.height / 2 - 24),
        width: 48,
        height: 48,
      };
      const shown = await page.screenshot({ clip, animations: 'disabled' });
      await edge.evaluate((el) => (el.style.visibility = 'hidden'));
      const withoutRim = await page.screenshot({ clip, animations: 'disabled' });
      await edge.evaluate((el) => el.style.removeProperty('visibility'));
      const unchanged = await page.evaluate(
        async (urls) => {
          const pixels = await Promise.all(
            urls.map(async (url) => {
              const image = new Image();
              image.src = url;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = image.width;
              canvas.height = image.height;
              const context = canvas.getContext('2d');
              context.drawImage(image, 0, 0);
              return context.getImageData(0, 0, canvas.width, canvas.height).data;
            }),
          );
          // Compositing text can change antialiasing by one colour level.
          return pixels[0].every((value, i) => Math.abs(value - pixels[1][i]) <= 2);
        },
        [shown, withoutRim].map((buffer) => `data:image/png;base64,${buffer.toString('base64')}`),
      );
      if (!unchanged) {
        await testInfo.attach('rim-visible', { body: shown, contentType: 'image/png' });
        await testInfo.attach('rim-hidden', { body: withoutRim, contentType: 'image/png' });
      }
      expect(unchanged).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${side}-${dy}.png`) });
      await page.mouse.up();
      await expect
        .poll(() => stage.evaluate((el) => parseFloat(el.style.getPropertyValue('--rx'))))
        .toBe(0);
    }

    await page.goto(`${entry}#/stamp/artmuseum`);
    // Ensure the atlas has decoded before inspecting the composited face.
    await page.locator('.medal-front .badge-art').evaluate(async (el) => {
      const image = new Image();
      image.src = getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, '');
      await image.decode();
    });
    await checkTilt(page.locator('.stamp-zoom .medal-stage'), 'front', 65);
    await checkTilt(page.locator('.stamp-zoom .medal-stage'), 'front', -65);
    await page.locator('.stamp-zoom').click();
    const viewer = page.locator('.zoom-modal .medal-stage');
    await checkTilt(viewer, 'front', 65);
    await page.getByRole('button', { name: '翻到背面', exact: true }).click();
    await expect(viewer).toHaveCSS('--ry', '180.00deg');
    await checkTilt(viewer, 'back', -65);
    await expect(viewer.locator('.medal-back b')).toHaveText('2026.10.24');
    await page.getByRole('button', { name: '关闭', exact: true }).click();

    await page.goto(`${entry}#/scan/museum`);
    await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
    await page.locator('.claim-book').click();
    await expect(page.locator('.success-page')).toHaveClass(/settled/);
    // The passport of the ceremony fades from over the page before the stamp can be taken.
    await expect(page.locator('.claim-book')).toHaveCount(0);
    const claimed = page.locator('.success-art .medal-stage');
    await checkTilt(claimed, 'front', -65);
    await page.getByRole('button', { name: '翻到背面', exact: true }).click();
    await expect(claimed).toHaveCSS('--ry', '180.00deg');
    await checkTilt(claimed, 'back', 65);
  });
}
