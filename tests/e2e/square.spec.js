import { test, expect } from '@playwright/test';

const back = (page) => page.getByRole('button', { name: '返回', exact: true }).click();
const nav = (page, name) =>
  page.locator('#app-footer .bottom-nav').getByRole('button', { name, exact: true });
const note = (page, id) => page.locator(`.note[data-post="${id}"]`);
const tickets = (page) => page.locator('#app-main .sample-ticket, #app-main .saved-ticket-image');

test('the square shows the visits collectors published as picture cards in two columns, newest first', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, '广场').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
  await expect(nav(page, '广场')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.note')).toHaveCount(12);
  await expect(page.locator('.note-column')).toHaveCount(2);
  // The newest post heads the first column and the next one the second.
  const heads = page.locator('.note-column > .note:first-child .note-by > span:last-child');
  await expect(heads).toHaveText(['小满', '木木']);
  // A card is a cover, the venue, a line and its writer. The cover is the venue's photograph
  // with the stamp on its corner, or the stamp on a card with its name and number; the same
  // venue does not show the same picture twice running, and no cover is a ticket.
  const first = note(page, 'xiaoman/maritime/2026-11-02');
  await expect(first.locator('.note-cover img')).toHaveCount(1);
  await expect(first.locator('.note-seal .badge-art')).toHaveCount(1);
  await expect(first.locator('.note-place')).toHaveText('临江航海博物馆');
  await expect(first.locator('.note-title')).toHaveText('我的第一枚。船比想象的大。');
  const second = note(page, 'fish/maritime/2026-08-02');
  await expect(second.locator('.note-cover.card b')).toHaveText('向海而行');
  await expect(second.locator('.note-cover.card i')).toHaveText(/^No\. \d{6}$/);
  // Published without a line, a post says what was collected.
  await expect(second.locator('.note-title')).toHaveText('收藏了「向海而行」');
  await expect(page.locator('.note-cover')).toHaveCount(12);
  await expect(page.locator('.note-cover:not(.card) img')).toHaveCount(6);
  await expect(page.locator('.note-cover.card')).toHaveCount(6);
  await expect(tickets(page)).toHaveCount(0);
  expect(await page.locator('#app-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  // The two columns end at about the same height.
  const [left, right] = await page
    .locator('.note-column')
    .evaluateAll((list) => list.map((el) => el.getBoundingClientRect().height));
  expect(Math.abs(left - right)).toBeLessThan(Math.max(left, right) * 0.25);
  // A like is counted where it stands, and kept.
  const like = first.locator('.post-like');
  await expect(like).toHaveText('12');
  await like.click();
  await expect(like).toHaveText('13');
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(like).toHaveText('13');
  // The writer opens as a passport, and the square is there to come back to.
  await first.locator('.note-by').click();
  await expect(page.locator('.collector-head h1')).toHaveText('小满');
  await back(page);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
});

test('a card opens its post: the cover, the writer, the line and the visit, which leads to the venue', async ({
  page,
}) => {
  await page.goto('/#/square/museum');
  await note(page, 'xiaoman/maritime/2026-11-02').locator('.note-open').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'post');
  await expect(page.locator('img.post-hero')).toBeVisible();
  await expect(page.locator('.post-by strong')).toHaveText('小满');
  await expect(page.locator('.post-by small')).toHaveText('2026.11.02 到访');
  await expect(page.locator('.post-note')).toHaveText('我的第一枚。船比想象的大。');
  await expect(page.locator('.post-copy strong')).toHaveText('临江航海博物馆');
  await expect(page.locator('.post-stamp')).toContainText('向海而行');
  await expect(tickets(page)).toHaveCount(0);
  // The venue can be saved for later from the post, and liked.
  const want = page.locator('.post [data-action="post-want"]');
  await want.click();
  await expect(want).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.post .post-like')).toHaveText('12');
  await page.locator('.post .post-like').click();
  await expect(page.locator('.post .post-like')).toHaveText('13');
  // The post has an address of its own; one that does not exist falls back to the square.
  await page.reload();
  await expect(page.locator('.post-by strong')).toHaveText('小满');
  await expect(want).toHaveAttribute('aria-pressed', 'true');
  // Its visit opens the venue, which keeps the lines left about it as a guest book.
  await page.locator('.post-card').click();
  await expect(page.locator('.venue-title')).toHaveText('临江航海博物馆');
  await expect(page.locator('.venue-heading .heart-button')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.guestbook li strong')).toHaveText(['小满', '沈青', '阿栗']);
  await expect(page.locator('.guestbook li p').nth(1)).toHaveText('从山里来看海。');
  await page.locator('.guestbook li button').nth(1).click();
  await expect(page.locator('.collector-head h1')).toHaveText('沈青');
  await back(page);
  await back(page);
  await expect(page.locator('.post-by strong')).toHaveText('小满');
  await back(page);
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
  await expect(note(page, 'xiaoman/maritime/2026-11-02').locator('.post-like')).toHaveText('13');
  // A post whose venue has no photograph, or whose turn it is, opens on the stamp's card; a
  // venue whose stamp is already collected says so in place of saving it for later.
  await note(page, 'mumu/landscape/2026-10-18').locator('.note-open').click();
  await expect(page.locator('.post-hero.card b')).toHaveText('山川来信');
  await expect(page.locator('.post-owned')).toHaveText('馆章已收藏');
  await page.goto('/#/post/nobody/nowhere/2026-01-01');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
});

test('a visit is published from its travel card with what was ticked, never the ticket, and can be taken back', async ({
  page,
}) => {
  const dialog = page.getByRole('dialog'),
    mine = page.locator('.note.mine');
  await page.goto('/#/square/museum');
  await page.getByRole('button', { name: '分享到访', exact: true }).click();
  await expect(dialog.locator('.publish-list button')).toHaveCount(4);
  await dialog.locator('.publish-list button').filter({ hasText: '白屿美术馆' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'visit-share');
  await expect(page.locator('.publish-note')).toContainText('不包含票根');
  // Published as the card stands: without the note until it is ticked.
  await page.getByRole('button', { name: '发布到广场', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
  await expect(mine).toHaveCount(1);
  await expect(page.locator('.note-column:first-child > .note:first-child')).toHaveClass(/mine/);
  await expect(mine.locator('.note-by > span:last-child')).toHaveText('我');
  await expect(mine.locator('.note-place')).toHaveText('白屿美术馆');
  await expect(mine.locator('.note-title')).toHaveText('收藏了「光的形状」');
  await expect(mine.locator('.post-like')).toHaveCount(0);
  // Published again with the note, it replaces the first; the ticket of the visit stays behind.
  await page.getByRole('button', { name: '分享到访', exact: true }).click();
  const row = dialog.locator('.publish-list button').filter({ hasText: '白屿美术馆' });
  await expect(row.locator('i')).toHaveText('已发布');
  await row.click();
  await page.locator('[data-option="note"]').check();
  await page.getByRole('button', { name: '重新发布到广场', exact: true }).click();
  await expect(mine).toHaveCount(1);
  await expect(mine.locator('.note-title')).toHaveText('光从弧形墙面落下来，这一刻很安静。');
  await expect(page.locator('.note')).toHaveCount(13);
  await expect(tickets(page)).toHaveCount(0);
  // The post is a copy: it stays after a reload, opens like any other, and shows in the venue's
  // guest book.
  await page.reload();
  await mine.locator('.note-open').click();
  await expect(page.locator('.post.mine .post-note')).toHaveText(
    '光从弧形墙面落下来，这一刻很安静。',
  );
  await expect(page.locator('.post.mine .post-like')).toHaveCount(0);
  await expect(tickets(page)).toHaveCount(0);
  await page.locator('.post-card').click();
  await expect(page.locator('.guestbook li strong')).toHaveText(['我', '陈一苇']);
  // The card of a single stamp publishes that stamp alone, and the later post leads.
  await page.goto('/#/stamp/museum-exhibition');
  await page.getByRole('button', { name: '分享这枚纪念', exact: true }).click();
  await page.getByRole('button', { name: '发布到广场', exact: true }).click();
  await expect(mine).toHaveCount(2);
  await expect(mine.first().locator('.note-title')).toHaveText('收藏了「器物与时间·2025」');
  // Taken back from its own page, the post is gone and the visit is still in the passport.
  await mine.first().locator('.note-open').click();
  await page.locator('.post-withdraw').click();
  await expect(dialog).toContainText('从广场撤回这一条？');
  await dialog.getByRole('button', { name: '保留', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'post');
  await page.locator('.post-withdraw').click();
  await dialog.getByRole('button', { name: '撤回', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'square');
  await expect(mine).toHaveCount(1);
  await page.reload();
  await expect(mine).toHaveCount(1);
  await nav(page, '护照').click();
  await expect(page.getByRole('button', { name: '足迹 4', exact: true })).toBeVisible();
});

test('a first passport has nothing to publish yet, and the square fits a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/square/museum');
  await page.getByRole('button', { name: '体验首次使用', exact: false }).click();
  await nav(page, '广场').click();
  await expect(page.locator('.note')).toHaveCount(12);
  await page.getByRole('button', { name: '分享到访', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('护照里还没有到访');
  await page.getByRole('dialog').getByRole('button', { name: '去发现目的地' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'discover');
  await page.setViewportSize({ width: 320, height: 568 });
  await nav(page, '广场').click();
  expect(await page.locator('#app-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(page.locator('#app-footer .bottom-nav button')).toHaveCount(5);
  await expect(nav(page, '护照')).toBeInViewport({ ratio: 1 });
  await page.locator('.note-open').first().click();
  expect(await page.locator('#app-main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});
