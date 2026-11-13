import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const nav = (page, name) =>
  page.locator('#app-footer .bottom-nav').getByRole('button', { name, exact: true });
const names = (page) => page.locator('.board-who strong');

test('the boards rank by stamps collected on site, one board to a city and one for the year', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, '收藏家').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'collectors');
  await expect(nav(page, '收藏家')).toHaveAttribute('aria-current', 'page');
  // The demonstration passport shows its album, so its holder is on the board.
  await expect(page.locator('.standing-card strong')).toHaveText('临江第 3 位');
  await expect(page.locator('.standing-card small')).toContainText(
    '现场收藏 3 枚 · 再收 1 枚，追上周末看展人',
  );
  await expect(names(page)).toHaveText([
    '阿栗',
    '周末看展人',
    'Mori',
    '我',
    '老周',
    '沈青',
    '南方有鱼',
    '陈一苇',
    '林间小鹿',
    '小满',
  ]);
  // A stamp redeemed with a ticket does not count: two of 陈一苇's four were.
  await expect(page.locator('.board-row').nth(7).locator('.board-count')).toHaveText('2枚');
  await expect(page.locator('.board-row').first().locator('.board-who small')).toHaveText(
    '已集齐临江',
  );
  await expect(page.locator('.board-row.me')).toHaveCount(1);
  // Collectors level on stamps share a place, and the place after it is the next one: no number
  // is skipped, so the first three places always wear their medals.
  await expect(page.locator('.board-rank')).toHaveText([
    '1',
    '2',
    '3',
    '3',
    '4',
    '4',
    '4',
    '4',
    '5',
    '5',
  ]);
  await expect(page.locator('.board-rank.medal')).toHaveCount(4);
  // What counts is said once, under the last row.
  await expect(page.locator('.collectors-page > :last-child')).toHaveText(
    '只计现场领取的纪念章，票根补领的不计入。',
  );
  await page.getByRole('button', { name: '云川', exact: true }).click();
  await expect(names(page).first()).toHaveText('沈青');
  await expect(page.locator('.standing-card strong')).toHaveText('云川第 4 位');
  await page.getByRole('button', { name: '2026 年度', exact: true }).click();
  await expect(names(page).first()).toHaveText('周末看展人');
  await expect(page.locator('.standing-card strong')).toHaveText('2026 年度第 3 位');
  await expect(page.locator('.standing-card small')).toContainText('再收 1 枚，追上林间小鹿');
  // A stamp collected on site draws its holder level with the next collector.
  await page.goto('/#/scan/maritime');
  await page.getByRole('button', { name: '模拟现场领取', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'success');
  await nav(page, '收藏家').click();
  await expect(page.locator('.standing-card strong')).toHaveText('2026 年度第 2 位');
  await page.getByRole('button', { name: '临江', exact: true }).click();
  await expect(page.locator('.standing-card strong')).toHaveText('临江第 2 位');
});

test('a collector opens as a passport to leaf through, as far as its holder shows it', async ({
  page,
}) => {
  await page.goto('/#/collectors/museum');
  await page.locator('.board-row button').first().click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'collector');
  await expect(page.locator('.collector-head h1')).toHaveText('阿栗');
  await expect(page.locator('.collector-standing')).toHaveText('临江第 1 位');
  // The album is the same book, in the order collected, with days given to the month.
  const open = page.locator('.book-page:not(.is-off)');
  await expect(open.locator('.badge-card h3')).toHaveText([
    '器物与时间·2025',
    '青铜回响',
    '光的形状',
    '柔软的秩序',
  ]);
  await expect(open.locator('.badge-date').first()).toHaveText('2025.09');
  await expect(open.locator('.leaf-foot span')).toHaveText('其中 4 枚，你也收藏了');
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(open.locator('.badge-card h3')).toHaveText(['向海而行', '山川来信', '一色入窑']);
  // A stamp there opens the stamp's own page, and coming back the book is on the same page.
  await open.locator('.badge-card').first().click();
  await expect(page.locator('.stamp-title')).toHaveText('向海而行');
  await back(page);
  await expect(open.locator('.badge-card h3').first()).toHaveText('向海而行');
  // Footprints carry the month, and a note only where its writer shows notes.
  await page.getByRole('button', { name: /^足迹/ }).click();
  await expect(page.locator('.footprint-stop')).toHaveCount(6);
  await expect(page.locator('.footprint-when').first()).toHaveText('7月 · 云川');
  await expect(page.locator('.footprint-note').first()).toContainText('第一次摸到还没上釉的坯');
  await expect(page.locator('#app-main .sample-ticket, #app-main .saved-ticket-image')).toHaveCount(
    0,
  );
  // One who shows only the album keeps the rest closed.
  await back(page);
  await page.locator('.board-row button').nth(2).click();
  await expect(page.locator('.collector-head h1')).toHaveText('Mori');
  await page.getByRole('button', { name: /^足迹/ }).click();
  await expect(page.locator('.empty-state h3')).toHaveText('足迹没有公开');
  // The address of a collector survives a reload; an unknown one falls back to the boards.
  await page.reload();
  await expect(page.locator('.collector-head h1')).toHaveText('Mori');
  await page.goto('/#/collector/nobody');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'collectors');
});

test('the holder decides what the passport shows, and sees it as others do', async ({ page }) => {
  const dialog = page.getByRole('dialog'),
    toggle = (name) => dialog.locator(`[data-visibility="${name}"]`);
  await page.goto('/#/collectors/museum');
  await page.locator('.standing-card').click();
  await expect(page.locator('.header-caption')).toHaveText('我的公开护照');
  await expect(page.locator('.book-page:not(.is-off) .badge-card')).toHaveCount(4);
  // The footprints are closed until switched on; notes only go along with them.
  await page.getByRole('button', { name: /^足迹/ }).click();
  await expect(page.locator('.empty-state h3')).toHaveText('你的足迹没有公开');
  await page.locator('.empty-state').getByRole('button', { name: '公开设置', exact: true }).click();
  await expect(toggle('album')).toBeChecked();
  await expect(toggle('footprints')).not.toBeChecked();
  await expect(toggle('memories')).toBeDisabled();
  await toggle('footprints').check();
  await expect(toggle('memories')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.footprint-stop')).toHaveCount(4);
  await expect(page.locator('.footprint-note')).toHaveCount(0);
  await page.locator('#app-header .header-setting').click();
  await toggle('memories').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.footprint-note')).toHaveText('“光从弧形墙面落下来，这一刻很安静。”');
  // Closing the footprints closes the notes with them, and the choice is kept.
  await page.locator('#app-header .header-setting').click();
  await toggle('footprints').uncheck();
  await expect(toggle('memories')).not.toBeChecked();
  await expect(toggle('memories')).toBeDisabled();
  // With the album closed the holder is on no board and in no list of a stamp's collectors.
  await toggle('album').uncheck();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('.empty-state h3')).toHaveText('你的足迹没有公开');
  await nav(page, '收藏家').click();
  await expect(page.locator('.standing-card.off strong')).toHaveText('你的护照还没有公开');
  await expect(page.locator('.board-row.me')).toHaveCount(0);
  await expect(names(page)).toHaveCount(9);
  await page.goto('/#/stamp/museum-exhibition');
  await expect(page.locator('.holder-list .me')).toHaveCount(0);
  await page.goto('/#/collectors/museum');
  await page.locator('.standing-card').getByRole('button', { name: '公开设置' }).click();
  await toggle('album').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.board-row.me')).toHaveCount(1);
});

test('a stamp lists its collectors by number, and a first passport shows nothing until asked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/stamp/museum-exhibition');
  const rows = page.locator('.holder-list li');
  await expect(page.locator('.holders .memory-header span')).toHaveText('6 位公开');
  await expect(rows.locator('strong')).toHaveText(['老周', '阿栗', '陈一苇', '我', 'Mori']);
  await expect(rows.nth(2).locator('small')).toHaveText('2025.10 · 补领');
  const numbers = (await rows.locator('b').allTextContents()).map((t) => Number(t.slice(4)));
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  await rows.first().getByRole('button').click();
  await expect(page.locator('.collector-head h1')).toHaveText('老周');
  await back(page);
  await expect(page.locator('.stamp-title')).toHaveText('器物与时间·2025');
  // A passport started from nothing is not shown to anyone.
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await nav(page, '收藏家').click();
  await expect(page.locator('.standing-card.off strong')).toHaveText('你的护照还没有公开');
  await expect(page.locator('.board-row.me')).toHaveCount(0);
});
