import { test, expect } from '@playwright/test';

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

test('the discover page greets from its search box, features the venues with photographs in a row that moves on by itself, and lists each destination by its photograph or its stamp', async ({
  page,
}) => {
  await page.goto('/#/discover/museum');
  const hero = page.locator('.discover-hero'),
    slides = page.locator('.hero-slide'),
    current = page.locator('[data-carousel-dot][aria-current="true"]');
  await expect(page.getByRole('searchbox')).toHaveAttribute(
    'placeholder',
    '每一次探索，都值得留下印记',
  );
  await expect(page.locator('.page-title')).toHaveCount(0);
  await expect(slides.locator('.hero-copy > span')).toHaveText([
    '临江博物馆 · 器物与时间',
    '青窑陶瓷博物馆 · 泥土与火的诗',
    '临江航海博物馆 · 风起时，船出发',
    '经纬织造馆 · 织出一段时光',
    '云川天文馆 · 抬头以后',
  ]);
  await expect(current).toHaveAccessibleName('第 1 张，共 5 张：临江博物馆');
  // A dot brings its slide into view; the slide opens its venue, and coming back the row is
  // where it was left.
  await page.locator('[data-carousel-dot]').nth(2).click();
  await expect(current).toHaveAccessibleName('第 3 张，共 5 张：临江航海博物馆');
  await expect(slides.nth(2)).toBeInViewport({ ratio: 1 });
  await slides.nth(2).click();
  await expect(page.locator('.venue-title')).toHaveText('临江航海博物馆');
  await back(page);
  await expect(current).toHaveAccessibleName('第 3 张，共 5 张：临江航海博物馆');
  await expect(slides.nth(2)).toBeInViewport({ ratio: 1 });
  // The list shows the photograph of a venue that has one, with its stamp on the corner, and
  // the stamp alone of one that has none.
  const thumb = (id) => page.locator(`.venue-card[data-id="${id}"] .venue-thumb`);
  for (const id of ['museum', 'porcelain', 'maritime', 'textile', 'astronomy']) {
    await expect(thumb(id)).toHaveClass(/has-photo/);
    await thumb(id).scrollIntoViewIfNeeded();
    await thumb(id)
      .locator('img')
      .evaluate((image) => image.decode());
    await expect(thumb(id).locator('.badge-art')).toHaveCount(1);
  }
  for (const id of ['artmuseum', 'landscape', 'modern']) {
    await expect(thumb(id).locator('img')).toHaveCount(0);
    await expect(thumb(id).locator('.badge-art')).toHaveCount(1);
  }
  expect(await page.locator('#app-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  // The destinations still to collect lead the list; only the collected ones are remarked on.
  await expect(page.locator('.venue-card h3')).toHaveText([
    '临江博物馆',
    '青窑陶瓷博物馆',
    '临江航海博物馆',
    '经纬织造馆',
    '云川天文馆',
    '白屿美术馆',
    '山川影像馆',
    '几何艺术中心',
  ]);
  await expect(page.locator('.venue-card:has(.venue-status) h3')).toHaveText([
    '白屿美术馆',
    '山川影像馆',
    '几何艺术中心',
  ]);
  await expect(page.locator('.venue-seal > .venue-status').first()).toHaveAttribute(
    'aria-label',
    '馆章已收藏',
  );
  // The featured photographs carry no stamp, and the categories sit under the title of the list
  // they narrow.
  await expect(slides.locator('.badge-art')).toHaveCount(0);
  await expect(page.locator('.row:has(.section-title) + .category-tabs')).toHaveCount(1);
  // The row gives way to the results of a search, stays through a change of category on the
  // slide it was showing, and follows the chosen city.
  await page.getByRole('searchbox').fill('天文');
  await expect(hero).toBeHidden();
  await expect(page.locator('.venue-card')).toHaveCount(1);
  await page.getByRole('button', { name: '清空搜索', exact: true }).click();
  await expect(hero).toBeVisible();
  await expect(current).toHaveAccessibleName('第 3 张，共 5 张：临江航海博物馆');
  await page.locator('[data-carousel-dot]').nth(3).click();
  await page.getByRole('button', { name: '艺术空间', exact: true }).click();
  await expect(hero).toBeVisible();
  await expect(slides).toHaveCount(5);
  await expect(current).toHaveAccessibleName('第 4 张，共 5 张：经纬织造馆');
  await expect(page.locator('.venue-card h3')).toHaveText([
    '经纬织造馆',
    '山川影像馆',
    '几何艺术中心',
  ]);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '全部城市', exact: true }).click();
  await page.getByRole('button', { name: '云川', exact: true }).click();
  await expect(slides.locator('.hero-copy > span')).toHaveText([
    '青窑陶瓷博物馆 · 泥土与火的诗',
    '经纬织造馆 · 织出一段时光',
    '云川天文馆 · 抬头以后',
  ]);
  // Left alone, with motion allowed, it moves on to the next slide.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(current).toHaveAccessibleName('第 1 张，共 5 张：临江博物馆');
  await expect(current).toHaveAccessibleName('第 2 张，共 5 张：青窑陶瓷博物馆', {
    timeout: 8000,
  });
});

test('a venue saved for later is kept in the passport as the card it is on the discover page', async ({
  page,
}) => {
  await page.goto('/#/venue/porcelain');
  await page.locator('.venue-heading .heart-button').click();
  await page.locator('#app-footer .bottom-nav').getByRole('button', { name: '护照' }).click();
  await page.getByRole('button', { name: '想去 1', exact: true }).click();
  const card = page.locator('#collection-content .venue-card');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.venue-thumb.has-photo img')).toHaveCount(1);
  await expect(card.locator('.venue-seal .badge-art')).toHaveCount(1);
  await expect(card.locator('h3')).toHaveText('青窑陶瓷博物馆');
  await expect(card.locator('p')).toHaveText('云川 · 泥土与火的诗');
  await card.click();
  await expect(page.locator('.venue-title')).toHaveText('青窑陶瓷博物馆');
});
