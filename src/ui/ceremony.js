/** Plays the stamping ceremony once after a claim. Timing lives here; the stylesheet only holds keyframes. */
export function createCeremony(appContext) {
  const DROP = 620,
    // The stamp touches the page a little past halfway through its drop.
    LAND = DROP * 0.55;
  let page = null,
    timers = [];
  const later = (ms, run) => timers.push(setTimeout(() => page?.isConnected && run(), ms));
  function cue(el, kind, at) {
    if (!el) return;
    el.dataset.ceremony = kind;
    el.style.setProperty('--at', `${Math.round(at)}ms`);
  }
  // The collector number spins like a numbering machine and settles one digit at a time.
  // A date rolls the same way, through its dots.
  function roll(el, duration) {
    const final = el.dataset.issue,
      [, head, body] = final.match(/^(\D*)([\d.]+)/) || [],
      start = performance.now();
    if (!body) return;
    const digits = body.replace(/\D/g, '').length;
    el.style.minWidth = `${el.offsetWidth}px`;
    const step = (now) => {
      const settled = Math.floor(((now - start) / duration) * (digits + 1));
      // finish() clears the page, which also stops a roll in progress.
      if (settled > digits || !page || !el.isConnected) {
        el.textContent = final;
        return;
      }
      let seen = 0;
      el.textContent =
        head +
        [...body]
          .map((c) => (c === '.' ? c : seen++ < settled ? c : Math.floor(Math.random() * 10)))
          .join('');
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function finish() {
    timers.forEach(clearTimeout);
    timers = [];
    if (!page) return;
    page.removeEventListener('pointerdown', finish);
    page.classList.add('settled');
    for (const el of page.querySelectorAll('[data-issue]')) el.textContent = el.dataset.issue;
    page = null;
  }
  function play() {
    finish();
    const target = appContext.dom.main.querySelector('.success-page');
    if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    page = target;
    const $ = (selector) => page.querySelector(selector),
      onSite = appContext.ui.screen === 'success',
      // A return visit or a ticket that adds no new stamp gets the short version.
      brief = onSite ? appContext.ui.duplicate : !appContext.ui.ticketResult?.newCount,
      stamps = onSite
        ? [$('.success-art .medal-stage')]
        : [...page.querySelectorAll('.collage-badges > .badge-art')],
      first = onSite ? (brief ? 200 : 380) : 600;
    cue($('.collage-ticket'), 'ticket', 150);
    stamps.forEach((el, i) => {
      const at = first + i * 380;
      cue(el, 'stamp', at);
      later(at + LAND, () => navigator.vibrate?.(18));
    });
    const landed = stamps.length ? first + (stamps.length - 1) * 380 + LAND : 650;
    cue($('.stamp-seat'), 'seat', landed - 40);
    cue($('.stamp-ring'), 'ring', landed);
    // The mark the landing leaves on the page stays once the ring has gone.
    cue($('.stamp-ground'), 'ground', landed);
    cue($('.stamp-sheen'), 'sheen', landed + (brief ? 250 : 430));
    let at = landed + (brief ? 180 : 280);
    for (const el of page.querySelectorAll(
      '.success-place, .issue-plate, .success-shelf, .success-moment, .success-line, .success-place-sub, .issue-list li, .ticket-date-pair, .ticket-success-note',
    )) {
      cue(el, 'text', at);
      const number = el.querySelector('b');
      if (el.matches('.success-shelf')) {
        // The collector's row appears first, with an empty place waiting. A new stamp then drops
        // into it from above; one that was already in the row is only marked where it sits.
        const here = el.querySelector('.shelf-current'),
          drop = at + 450,
          land = brief ? at + 260 : drop + 420;
        el.dataset.entry = brief ? 'mark' : 'drop';
        here.style.setProperty('--land', `${Math.round(land)}ms`);
        if (!brief) {
          cue(here.querySelector('.badge-art'), 'shelf', drop);
          cue(here.querySelector('i'), 'text', land);
          later(land, () => navigator.vibrate?.(10));
        }
        later(at, () => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
        at = land + (brief ? 60 : 120);
      }
      if (number && (!brief || el.matches('.success-moment'))) {
        // A return visit has no new number to reveal, so the date of this visit rolls instead.
        const from = at;
        number.dataset.issue = number.textContent.trim();
        later(from, () => {
          // On a short screen the number sits below the fold; bring it up for its reveal.
          number.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          roll(number, 700);
        });
        at += 260;
      }
      at += brief ? 60 : 120;
    }
    cue($('.medal-flip'), 'text', at);
    // What to do next comes in once the page has said what happened.
    at += 120;
    cue($('#page-actions'), 'text', at);
    page.classList.add('ceremony');
    page.addEventListener('pointerdown', finish);
    later(at + 500, finish);
  }
  return { play, finish };
}
