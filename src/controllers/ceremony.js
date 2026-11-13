import { art } from '../lib/format.js';

/** Plays the stamping ceremony once after a claim. Timing lives here; the stylesheet only holds keyframes. */
export function createCeremony(appContext) {
  const DROP = 620,
    // The stamp touches the page a little past halfway through its drop.
    LAND = DROP * 0.55,
    // Once a stamp has landed in the passport its number rolls to a stop, and the page is left
    // to be looked at for a moment.
    READ = 1000,
    // The way from the passport up to the stamp's place on the page.
    LIFT = 520;
  let page = null,
    // The passport of the first act: its holder on the page, and the book that turns in it.
    holder = null,
    book = null,
    timers = [];
  const later = (ms, run) => timers.push(setTimeout(() => page?.isConnected && run(), ms));
  function cue(el, kind, at) {
    if (!el) return;
    el.dataset.ceremony = kind;
    el.style.setProperty('--at', `${Math.round(at)}ms`);
  }
  // The collector number spins like a numbering machine and settles one digit at a time.
  // A date rolls the same way, through its dots. What follows the number stays as it is.
  function roll(el, duration) {
    const final = el.dataset.issue,
      [, head, body, tail] = final.match(/^(\D*)([\d.]+)(.*)$/) || [],
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
          .join('') +
        tail;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Takes the passport away. Cut short by a tap it fades where it is, still turning, so that
  // the tap does not land on what lies under it.
  function shut(fade) {
    const gone = holder,
      turning = book,
      remove = () => {
        turning.destroy();
        gone.remove();
      };
    holder = book = null;
    if (!gone) return;
    if (!fade) return remove();
    gone.classList.add('leaving');
    setTimeout(remove, 240);
  }
  // The first act, for new stamps: the passport lies closed over the page, opens, and turns to
  // the place that waits for the stamp. The stamp comes down on it and leaves its print, the
  // number and the day fill in under it; then the stamp rises out of the passport to where the
  // page shows it, and the passport goes. Stamps that share a page land one after another; for
  // one whose place is on the next page, the page turns first. Answers with the time at which
  // the page has its stamps.
  function openBook(ids, heroOf) {
    holder = document.createElement('div');
    holder.className = 'claim-book';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = `<i class="claim-paper"></i>${appContext.views.renderBook(ids)}`;
    // Neither first nor last on the page: those two places centre it.
    page.firstElementChild.after(holder);
    const root = holder.querySelector('.passport-book'),
      stage = root.querySelector('.book-stage');
    root.inert = true;
    book = new appContext.PageBook(root, { cover: true, enabled: () => false });
    // Each stamp is held over its place by a mark of the same size, laid on the passport.
    const frame = holder.getBoundingClientRect(),
      marks = ids.map((id) => {
        const v = appContext.catalog.stamp(id),
          card = root.querySelector(`.badge-card[data-id="${id}"]`),
          print = card.querySelector('.badge-frame > .badge-art'),
          box = print.parentNode.getBoundingClientRect(),
          lean = getComputedStyle(print).rotate,
          el = document.createElement('span');
        el.className = `claim-mark medal-${v.art} ${v.edition ? 'medal-edition' : ''}`;
        // No two stamps sit quite straight on the page; this one comes down as it will lie.
        el.style.cssText = `left:${box.left - frame.left}px;top:${box.top - frame.top}px;width:${box.width}px;height:${box.height}px;--lean:${lean === 'none' ? '0deg' : lean}`;
        el.innerHTML = `<i class="claim-seat"></i><i class="claim-shadow"></i><i class="claim-ring"></i><span class="claim-die">${art(v)}</span>`;
        holder.append(el);
        return {
          el,
          card,
          print,
          hero: heroOf(v),
          leaf: Number(card.closest('.book-page').dataset.local),
        };
      });
    let last = null;
    for (const mark of marks) {
      let drop = book.settled + 60;
      if (last && last.leaf !== mark.leaf) {
        // The stamps on the open page have left their prints; the page turns to the next.
        const turn = last.land + READ,
          lying = marks.filter((m) => m.leaf === last.leaf);
        later(turn, () => {
          for (const m of lying) m.el.remove();
          book.goTo(mark.leaf);
        });
        drop = turn + appContext.PageBook.TURN + 100;
      } else if (last) drop = last.drop + 380;
      const land = drop + LAND,
        number = mark.card.querySelector('.badge-issue');
      Object.assign(mark, { drop, land });
      cue(mark.el.querySelector('.claim-seat'), 'pulse', drop - 200);
      cue(mark.el.querySelector('.claim-shadow'), 'shadow', drop);
      cue(mark.el.querySelector('.claim-die'), 'die', drop);
      cue(mark.card.querySelector('.slot-seat'), 'seat', land - 40);
      cue(mark.print, 'arrive', land);
      cue(mark.el.querySelector('.claim-ring'), 'ring', land);
      // The page gives a little under the stamp.
      later(land, () => {
        navigator.vibrate?.(18);
        stage.classList.add('pressed');
      });
      later(land + 280, () => stage.classList.remove('pressed'));
      cue(mark.card.querySelector('.badge-kind'), 'text', land + 160);
      cue(number, 'text', land + 200);
      number.dataset.issue = number.textContent.trim();
      later(land + 200, () => roll(number, 600));
      cue(mark.card.querySelector('.badge-date'), 'text', land + 330);
      last = mark;
    }
    const lift = last.land + READ,
      landed = lift + LIFT,
      // Where the passport is kept: its button in the navigation.
      home = appContext.dom.footer.querySelector('[data-action="passport"] svg');
    later(lift, () => {
      // Measured now: the page under the passport may have taken its final shape since.
      const kept = home?.getBoundingClientRect(),
        lying = stage.getBoundingClientRect();
      if (kept) {
        root.style.setProperty(
          '--away-x',
          `${kept.left + kept.width / 2 - lying.left - lying.width / 2}px`,
        );
        root.style.setProperty(
          '--away-y',
          `${kept.top + kept.height / 2 - lying.top - lying.height / 2}px`,
        );
        root.style.setProperty('--shrink', kept.width / lying.width);
      }
      for (const mark of marks.filter((m) => m.leaf === last.leaf)) {
        const die = mark.el.querySelector('.claim-die'),
          face = mark.hero?.querySelector('.medal') || mark.hero,
          from = mark.el.getBoundingClientRect(),
          to = face?.getBoundingClientRect();
        // A stamp the page has no place for stays in the passport and goes with it.
        die.dataset.lift = face ? 'rise' : 'stay';
        if (!face) continue;
        die.style.setProperty('--dx', `${to.left + to.width / 2 - from.left - from.width / 2}px`);
        die.style.setProperty('--dy', `${to.top + to.height / 2 - from.top - from.height / 2}px`);
        die.style.setProperty('--grow', face.offsetWidth / from.width);
      }
    });
    // The passport is put away: it shrinks into its button, which takes it with a nod. The
    // navigation is drawn anew with every page, so the nod needs no clearing up.
    cue(holder.firstChild, 'seat', lift);
    cue(root, 'leave', lift);
    later(lift + LIFT * 0.85, () => home?.closest('button').classList.add('received'));
    cue(page.querySelector('.collage-ticket'), 'ticket', lift);
    // On the page a stamp appears as the one from the passport reaches it.
    for (const mark of marks) cue(mark.hero, 'arrive', lift + LIFT * 0.55);
    later(landed + 60, () => shut(false));
    return landed;
  }
  function finish() {
    timers.forEach(clearTimeout);
    timers = [];
    shut(true);
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
      // A return visit or a ticket that adds no new stamp has nothing to press into the
      // passport: the stamps come down on the page itself.
      brief = onSite ? appContext.ui.duplicate : !appContext.ui.ticketResult?.newCount,
      stamps = onSite
        ? [$('.success-art .medal-stage')]
        : [...page.querySelectorAll('.collage-badges > .badge-art')],
      // Where the page shows a stamp. An edition shares its venue's illustration.
      heroOf = (v) =>
        onSite
          ? stamps[0]
          : stamps.find((el) =>
              el.matches(`.badge-${v.art}${v.edition ? '.badge-edition' : ':not(.badge-edition)'}`),
            );
    let landed;
    if (brief) {
      const first = onSite ? 200 : 600;
      cue($('.collage-ticket'), 'ticket', 150);
      stamps.forEach((el, i) => {
        const at = first + i * 380;
        cue(el, 'stamp', at);
        later(at + LAND, () => navigator.vibrate?.(18));
      });
      landed = stamps.length ? first + (stamps.length - 1) * 380 + LAND : 650;
      cue($('.stamp-seat'), 'seat', landed - 40);
      cue($('.stamp-ring'), 'ring', landed);
    } else {
      landed = openBook(
        onSite ? [appContext.ui.selected] : appContext.ui.ticketResult.newIds,
        heroOf,
      );
      // Stamps of the visit that were collected before are simply there.
      for (const el of stamps) if (!el.dataset.ceremony) cue(el, 'text', landed - 200);
    }
    // The mark the landing leaves on the page stays once the ring has gone.
    cue($('.stamp-ground'), 'ground', landed);
    cue($('.stamp-sheen'), 'sheen', landed + 250);
    let at = landed + 180;
    for (const el of page.querySelectorAll(
      '.success-place, .issue-plate, .success-shelf, .success-moment, .success-line, .success-place-sub, .issue-list li, .ticket-date-pair, .ticket-success-note',
    )) {
      cue(el, 'text', at);
      const number = el.matches('.success-moment') && el.querySelector('b');
      if (el.matches('.success-shelf')) {
        // The collector's row marks the place the stamp has among their own. A new stamp has
        // just been seen to take it, in the passport.
        const land = at + 260;
        el.querySelector('.shelf-current').style.setProperty('--land', `${Math.round(land)}ms`);
        later(at, () => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
        at = land + 60;
      }
      if (number) {
        // A new stamp's number has rolled in the passport. A return visit has no new number
        // to reveal, so the date of this visit rolls instead.
        const from = at;
        number.dataset.issue = number.textContent.trim();
        later(from, () => {
          // On a short screen the date sits below the fold; bring it up for its reveal.
          number.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          roll(number, 700);
        });
        at += 260;
      }
      at += 60;
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
