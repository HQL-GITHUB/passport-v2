import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const pin = (page, id) => page.locator(`.map-pin[data-id="${id}"]`);

test('the discover page turns into a map with a mark for each destination, lit once its stamp is collected', async ({
  page,
}) => {
  await page.goto('/#/discover/museum');
  const toggle = page.locator('#app-header .view-toggle');
  await expect(toggle).toHaveText('地图');
  await toggle.click();
  await expect(toggle).toHaveText('列表');
  // The map takes the place of the featured row and the list; search and categories stay.
  await expect(page.locator('.discover-hero, #venue-list')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.locator('.category-tabs button')).toHaveCount(4);
  await expect(page.locator('.map-pin')).toHaveCount(8);
  await expect(page.locator('.map-pin.owned .pin-name')).toHaveText([
    '白屿美术馆',
    '山川影像馆',
    '几何艺术中心',
  ]);
  await expect(page.locator('.map-summary strong')).toHaveText('已点亮 3 / 8');
  await expect(page.locator('.map-legend')).toHaveText('已收藏待出发想去');
  // Every mark lies within the sheet, and no two seals overlap.
  const seals = await page.locator('.pin-seal').evaluateAll((list) =>
    list.map((el) => {
      const box = el.getBoundingClientRect(),
        map = el.closest('.venue-map').getBoundingClientRect();
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        inside:
          box.left >= map.left &&
          box.right <= map.right &&
          box.top >= map.top &&
          box.bottom <= map.bottom,
      };
    }),
  );
  expect(seals.every((seal) => seal.inside)).toBe(true);
  for (const [n, a] of seals.entries())
    for (const b of seals.slice(n + 1))
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(46);
  // A mark chosen shows its venue as a card; chosen again, it lets go.
  await pin(page, 'maritime').click();
  await expect(pin(page, 'maritime')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-card strong')).toHaveText('临江航海博物馆');
  await expect(page.locator('.map-card .map-state')).toHaveText('到馆可领取「向海而行」');
  await pin(page, 'artmuseum').click();
  await expect(pin(page, 'maritime')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.map-card .map-state')).toHaveText('馆章已收藏');
  await pin(page, 'artmuseum').click();
  await expect(page.locator('.map-card')).toHaveCount(0);
  await expect(page.locator('.map-summary')).toBeVisible();
  // The card opens the venue, and coming back the map has the same mark chosen.
  await pin(page, 'maritime').click();
  await page.locator('.map-card').click();
  await expect(page.locator('.venue-title')).toHaveText('临江航海博物馆');
  await page.locator('.venue-heading .heart-button').click();
  await back(page);
  await expect(toggle).toHaveText('列表');
  await expect(pin(page, 'maritime')).toHaveAttribute('aria-pressed', 'true');
  // Saved for later, the mark carries a heart; collected, a tick, and the count goes up.
  await expect(pin(page, 'maritime').locator('.pin-mark.want')).toHaveCount(1);
  await expect(page.locator('.map-card .map-state')).toHaveText('想去 · 到馆可领取「向海而行」');
  await page.goto('/#/scan/maritime');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
  await page.locator('#app-footer').getByRole('button', { name: '发现', exact: true }).click();
  await expect(pin(page, 'maritime')).toHaveClass(/owned/);
  await expect(pin(page, 'maritime').locator('.pin-mark:not(.want)')).toHaveCount(1);
  // The map is as it was left, with the same mark chosen.
  await expect(page.locator('.map-card .map-state')).toHaveText('馆章已收藏');
  await pin(page, 'maritime').click();
  await expect(page.locator('.map-summary strong')).toHaveText('已点亮 4 / 8');
  // Back to the list.
  await toggle.click();
  await expect(page.locator('#venue-list .venue-card')).toHaveCount(8);
  await expect(page.locator('.venue-map')).toHaveCount(0);
});

test('search, category and city leave every mark in place and fade back the ones they leave out', async ({
  page,
}) => {
  await page.goto('/#/discover/museum');
  await page.locator('#app-header .view-toggle').click();
  const dim = page.locator('.map-pin.dim');
  await page.getByRole('button', { name: '艺术空间', exact: true }).click();
  await expect(page.locator('.map-pin')).toHaveCount(8);
  await expect(page.locator('.map-pin:not(.dim) .pin-name')).toHaveText([
    '山川影像馆',
    '几何艺术中心',
    '经纬织造馆',
  ]);
  await expect(dim).toHaveCount(5);
  await expect(page.locator('.map-summary strong')).toHaveText('已点亮 2 / 3');
  // A mark that is left out cannot be chosen, and one that was chosen is let go.
  await pin(page, 'textile').click();
  await expect(page.locator('.map-card strong')).toHaveText('经纬织造馆');
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('searchbox').fill('天文');
  await expect(dim).toHaveCount(7);
  await expect(page.locator('.map-card')).toHaveCount(0);
  await expect(page.locator('.map-summary strong')).toHaveText('已点亮 0 / 1');
  await expect(pin(page, 'textile')).toHaveJSProperty('inert', true);
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.getByRole('searchbox').fill('没有这个地方');
  await expect(page.locator('.map-summary strong')).toHaveText('暂时没有找到这一站');
  await page.getByRole('button', { name: '查看全部目的地', exact: true }).click();
  await expect(dim).toHaveCount(0);
  await page.locator('.city-button').click();
  await page.getByRole('button', { name: '云川', exact: true }).click();
  await expect(page.locator('.map-pin:not(.dim)')).toHaveCount(4);
  await expect(page.locator('.map-summary strong')).toHaveText('已点亮 1 / 4');
});

test('the map page fills the screen at every size without scrolling, and its marks keep clear of each other', async ({
  page,
}) => {
  // What the page measures to: whether it scrolls, how far the sheet stops above the navigation,
  // the marks that leave the sheet or run under the panel, and the pairs of marks that touch. A
  // mark is its seal and its name; the empty corners of its box do not count.
  const measure = () =>
    page.evaluate(() => {
      const main = document.getElementById('app-main'),
        map = document.getElementById('venue-map').getBoundingClientRect(),
        panel = document.querySelector('.map-panel').getBoundingClientRect(),
        pins = [...document.querySelectorAll('.map-pin')].map((el) => ({
          id: el.dataset.id,
          parts: [el.querySelector('.pin-seal'), el.querySelector('.pin-name')].map((part) =>
            part.getBoundingClientRect(),
          ),
        })),
        hit = (a, b) =>
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
        touching = [];
      for (const [n, a] of pins.entries())
        for (const b of pins.slice(n + 1))
          if (a.parts.some((x) => b.parts.some((y) => hit(x, y)))) touching.push([a.id, b.id]);
      return {
        scrolls: main.scrollHeight - main.clientHeight,
        wide: main.scrollWidth - main.clientWidth,
        below: Math.round(main.getBoundingClientRect().bottom - map.bottom),
        astray: pins
          .filter((p) =>
            p.parts.some(
              (box) =>
                box.top < panel.bottom ||
                box.bottom > map.bottom ||
                box.left < map.left ||
                box.right > map.right,
            ),
          )
          .map((p) => p.id),
        touching,
      };
    });
  await page.goto('/#/discover/museum');
  await page.locator('#app-header .view-toggle').click();
  // The line of small print under the list does not follow onto the map.
  await expect(page.locator('.discover-page .foot-hint')).toHaveCount(0);
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [414, 896],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('#app-header .city-button')).toBeInViewport({ ratio: 1 });
    expect(await measure(), `${width}×${height}`).toEqual({
      scrolls: 0,
      wide: 0,
      below: 12,
      astray: [],
      touching: [],
    });
    // The card of a chosen mark lies in the band kept for it, over no mark.
    await pin(page, 'maritime').click();
    await expect(page.locator('.map-card')).toBeInViewport({ ratio: 1 });
    await expect(pin(page, 'maritime')).toBeInViewport({ ratio: 1 });
    expect((await measure()).astray, `${width}×${height}`).toEqual([]);
    await pin(page, 'maritime').click();
  }
  // On a screen too short for the marks to keep clear, the sheet keeps its least height and the
  // page scrolls instead; the panel stays in view.
  await page.setViewportSize({ width: 320, height: 480 });
  const short = await measure();
  expect(short.scrolls).toBeGreaterThan(0);
  expect(short.touching).toEqual([]);
  await pin(page, 'maritime').scrollIntoViewIfNeeded();
  await pin(page, 'maritime').click();
  await expect(page.locator('.map-card')).toBeInViewport({ ratio: 1 });
});
