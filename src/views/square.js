/** Page rendering. Dependencies are provided by createApp(). */
export function createSquareViews(appContext) {
  // The shapes a cover is cut to, as CSS writes them and as how tall each is for its width.
  const shapes = [
    ['3 / 4', 1.33],
    ['1 / 1', 1],
    ['4 / 5', 1.25],
  ];
  // What stands at the head of each post, by post. The holder's own photograph, where one was
  // published. Otherwise the venue's photograph for the first post of a venue down the page and
  // for every second one after it, cut and placed a little differently each time; and between
  // them the stamp on a card of its own colour, so the same picture does not come round again.
  function covers(posts) {
    const seen = {},
      result = new Map();
    for (const p of posts) {
      const n = parseInt(appContext.domain.hash(p.id), 16),
        nth = (seen[p.venueId] = (seen[p.venueId] ?? -1) + 1),
        own = !!p.photo,
        venue = appContext.catalog.venue(p.venueId),
        photo = own || (nth % 2 === 0 && !!venue?.thumb),
        [shape, tall] = photo ? shapes[n % 3] : shapes[1 + (n % 2)];
      result.set(p.id, {
        photo,
        own,
        shape,
        tall,
        // The part of a wide photograph that the cover looks at.
        at: [28, 50, 72][(n >> 2) % 3],
        small: own ? p.photo : venue?.thumb,
        large: own ? p.photo : venue?.photo,
      });
    }
    return result;
  }
  // A post says something even when its writer did not: what was collected, or where.
  function titleOf(p) {
    return p.note || (p.stamps[0] ? `收藏了「${p.stamps[0].stamp.title}」` : `到访${p.name}`);
  }
  // The stamp on a card of its own colour, with its name and its number: a travel card in small.
  function stampCard(p) {
    const first = p.stamps[0];
    return first
      ? `${appContext.format.art(first.stamp)}<b>${first.stamp.title}</b><i>${appContext.format.issue(first, first.stamp)}</i>`
      : `${appContext.format.icon('book')}<b>${appContext.format.safe(p.name)}</b>`;
  }
  const tint = (p) =>
    p.stamps[0]
      ? `medal-${p.stamps[0].stamp.art} ${p.stamps[0].stamp.edition ? 'medal-edition' : ''}`
      : '';
  // The square: visits that collectors chose to publish, newest first, as picture cards in two
  // columns of uneven height. A card is the cover, where it was, a line, and who; it opens the
  // post. Each post goes to the column that is shorter so far, so the order reads across.
  function renderSquare() {
    const posts = appContext.selectors.posts(),
      heads = covers(posts),
      columns = [[], []],
      heights = [0, 0];
    for (const p of posts) {
      const cover = heads.get(p.id),
        n = heights[1] < heights[0] ? 1 : 0;
      columns[n].push(noteCard(p, cover));
      heights[n] += cover.tall + (titleOf(p).length > 11 ? 0.72 : 0.6);
    }
    return /* HTML */ `<section class="page square-page screen-enter">
      <h1 class="sr-only">广场</h1>
      <div class="note-columns">
        ${columns.map((cards) => `<div class="note-column">${cards.join('')}</div>`).join('')}
      </div>
      <p class="foot-hint">广场上的收藏家与动态均为原型演示内容</p>
    </section>`;
  }
  function noteCard(p, cover) {
    const first = p.stamps[0];
    return /* HTML */ `<article class="note ${p.mine ? 'mine' : ''}" data-post="${p.id}">
      <button class="note-open" data-action="open-post" data-id="${p.id}">
        ${
          cover.photo
            ? `<span class="note-cover" style="aspect-ratio:${cover.shape}"><img src="${appContext.format.safe(cover.small)}" alt="" loading="lazy" decoding="async" style="object-position:${cover.at}% 50%">${first ? `<span class="note-seal">${appContext.format.art(first.stamp)}</span>` : ''}</span>`
            : `<span class="note-cover card ${tint(p)}" style="aspect-ratio:${cover.shape}">${stampCard(p)}</span>`
        }<span class="note-place"
          >${appContext.format.icon('pin')}${appContext.format.safe(p.name)}</span
        ><span class="note-title">${appContext.format.safe(titleOf(p))}</span>
      </button>
      <div class="note-foot">
        <button class="note-by" data-action="collector" data-person="${p.person.id}">
          ${appContext.views.avatar(p.person)}<span>${appContext.format.safe(p.person.name)}</span>
        </button>
        ${p.mine ? '' : likeButton(p)}
      </div>
    </article>`;
  }
  function likeButton(p) {
    return `<button class="post-like ${p.liked ? 'on' : ''}" data-action="like-post" data-id="${p.id}" aria-pressed="${p.liked}" aria-label="喜欢">${appContext.format.icon('like')}<b>${p.likes}</b></button>`;
  }
  // One post, opened: its cover across the page, who and when, the line, and the visit as a small
  // travel card that opens the venue. The venue is what a post leads to, so it can be saved for
  // later from here. Tickets never come to the square.
  function renderPost() {
    const posts = appContext.selectors.posts(),
      p = posts.find((item) => item.id === appContext.ui.post),
      cover = covers(posts).get(p.id),
      first = p.stamps[0],
      owned = appContext.selectors.owned(appContext.catalog.venue(p.venueId)),
      wanted = appContext.data.wanted.includes(p.venueId),
      card = /* HTML */ `<span class="post-stamps"
          >${
            first
              ? p.stamps
                  .slice(0, 2)
                  .map((s) => appContext.format.art(s.stamp))
                  .join('')
              : appContext.format.icon('book')
          }</span
        ><span class="post-copy"
          ><strong>${appContext.format.safe(p.name)}</strong
          ><small
            >${appContext.format.safe(p.city)}${p.exhibit ? ` · ${appContext.format.safe(p.exhibit)}` : ''}</small
          >${
            first
              ? `<small class="post-stamp">${first.stamp.title}${p.stamps.length > 1 ? ` 等 ${p.stamps.length} 枚` : ''}<b>${appContext.format.issue(first, first.stamp)}</b></small>`
              : ''
          }</span
        >`;
    return /* HTML */ `<section class="page post-page screen-enter">
      ${
        cover.photo
          ? `<img class="post-hero" src="${appContext.format.safe(cover.large)}" alt="${cover.own ? '这次参观的照片' : `${appContext.format.safe(p.name)}概念建筑`}" style="object-position:${cover.at}% 50%">`
          : `<div class="post-hero card ${tint(p)}">${stampCard(p)}</div>`
      }
      <article class="post ${p.mine ? 'mine' : ''}" data-post="${p.id}">
        <button class="post-by" data-action="collector" data-person="${p.person.id}">
          ${appContext.views.avatar(p.person)}<span
            ><strong>${appContext.format.safe(p.person.name)}</strong
            ><small>${appContext.format.date(p.day)} 到访</small></span
          >
        </button>
        ${p.note ? `<p class="post-note">${appContext.format.safe(p.note)}</p>` : ''}
        ${
          p.known
            ? `<button class="post-card" data-action="venue" data-id="${p.venueId}">${card}${appContext.format.icon('chevron')}</button>`
            : `<div class="post-card">${card}</div>`
        }
        <div class="post-actions">
          ${
            !p.known
              ? ''
              : owned
                ? `<span class="post-owned">${appContext.format.icon('check')}馆章已收藏</span>`
                : `<button class="heart-button ${wanted ? 'saved' : ''}" data-action="post-want" data-id="${p.venueId}" aria-pressed="${wanted}">${appContext.format.icon('heart')}想去</button>`
          }
          ${
            p.mine
              ? `<button class="post-withdraw" data-action="withdraw-post" data-key="${p.key}">撤回</button>`
              : likeButton(p)
          }
        </div>
      </article>
    </section>`;
  }
  // On a venue's page: the lines that visitors left on the square about it, as a guest book.
  function renderGuestbook(v) {
    const lines = appContext.selectors
      .posts()
      .filter((p) => p.venueId === v.id && p.note)
      .slice(0, 3);
    if (!lines.length) return '';
    return /* HTML */ `<section class="guestbook">
      <div class="memory-header">
        <h3>留言簿</h3>
        <button data-action="square">去广场看看${appContext.format.icon('chevron')}</button>
      </div>
      <ul>
        ${lines
          .map(
            (p) =>
              /* HTML */ `<li>
                <button data-action="collector" data-person="${p.person.id}">
                  ${appContext.views.avatar(p.person)}<strong
                    >${appContext.format.safe(p.person.name)}</strong
                  ><small>${appContext.format.date(p.day)}</small>
                </button>
                <p>${appContext.format.safe(p.note)}</p>
              </li>`,
          )
          .join('')}
      </ul>
    </section>`;
  }
  return {
    renderSquare,
    renderPost,
    renderGuestbook,
  };
}
