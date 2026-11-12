// A turning page is cut into this many strips along the fold, hinged one to the next, so it can bend.
const STRIPS = 14;
// A page is turned by a corner: the fold leans, in degrees, towards the corner that leads. Left to
// itself a page lifts by its lower corner, each leaf a little differently; under a finger the lean
// follows where the page was taken and how the finger rises, up to the limit.
const LEANS = [11, 8, 13];
const GRIP_LEAN = 12;
const MAX_LEAN = 19;
// A page is seldom taken straight across: a drag turns it while it rises or falls no more than
// this many times as far as it goes sideways, which is about sixty degrees.
const STEEP = 1.75;
// The light falls from the reader's left, this far off the page; the rest is ambient.
const LIGHT = (30 * Math.PI) / 180;
const AMBIENT = 0.55;
// The distance, in pixels, the page is seen from: the perspective set in the stylesheet.
const EYE = 2800;
const radians = (degrees) => (degrees * Math.PI) / 180;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
// How a surface turned by this many degrees is lit, as a wash to lay over it: a dark one where
// it faces away from the light, a faint white one where it catches more than the flat page does.
// The back of the page stays in view all the way down onto the other side, so it is only dimmed
// while it stands, and comes to rest as plain as the paper it lands on.
function wash(degrees, back) {
  if (back) return `rgb(14 22 40 / ${(Math.sin(radians(degrees)) * 0.14).toFixed(3)})`;
  const facing = Math.cos(radians(degrees) - LIGHT),
    lit = AMBIENT + ((1 - AMBIENT) * Math.max(0, facing)) / Math.cos(LIGHT);
  return lit < 1
    ? `rgb(14 22 40 / ${((1 - lit) * 0.55).toFixed(3)})`
    : `rgb(255 255 255 / ${((lit - 1) * 1.5).toFixed(3)})`;
}
// How far the strip at the spine trails the one at the free edge: the page peels from its edge.
const LAG = 0.3;
// The angle of one strip, in degrees, when the page as a whole has turned by p (0 flat, 1 over).
function stripAngle(p, k) {
  const t = Math.min(1, Math.max(0, p * (1 + LAG) - LAG * (1 - k / (STRIPS - 1))));
  return 90 * (1 - Math.cos(t * Math.PI));
}
// Where the free edge of a bending page stands, from 1 (flat) to -1 (over), for each step of p.
const EDGE = Array.from({ length: 201 }, (_, n) => {
  let across = 0;
  for (let k = 0; k < STRIPS; k++) across += Math.cos((stripAngle(n / 200, k) * Math.PI) / 180);
  return across / STRIPS;
});
// The turn that puts the free edge there, so the edge can stay under the finger.
function turnForEdge(edge) {
  const n = EDGE.findIndex((value) => value <= edge);
  return n < 0 ? 1 : n / 200;
}

/** Turns the leaves of the passport book: drag a page across by its edge, or step with the pager and the arrow keys. */
export class PageBook {
  // How long a page turned by itself takes to come down on the other side, in milliseconds.
  static TURN = 760;
  constructor(
    root,
    { animate = true, intro = false, cover = false, enabled = () => true, onTurn = () => {} } = {},
  ) {
    this.root = root;
    this.stage = root.querySelector('.book-stage');
    this.front = root.querySelector('.book-front');
    this.leaves = [...root.querySelectorAll('.book-page')];
    this.dots = [...root.querySelectorAll('.book-dots i:not(.cover)')];
    this.coverDot = root.querySelector('.book-dots .cover');
    this.status = root.querySelector('.book-status');
    this.steps = [...root.querySelectorAll('[data-book-step]')];
    this.animate = animate;
    this.onTurn = onTurn;
    this.index = this.clamp(Number(root.dataset.page) || 0);
    // How far each leaf has turned: 0 lies flat, 1 has gone over the spine.
    this.turn = this.leaves.map((_, i) => (i < this.index ? 1 : 0));
    // The bending stand-in of each leaf that is in mid-turn.
    this.bends = new Map();
    // How the fold of each leaf leans while it turns.
    this.leans = this.leaves.map((_, i) => LEANS[i % LEANS.length]);
    // How far the cover has opened; a book that is already open has it out of the way.
    this.opened = 1;
    // Closed again by hand from its first page, the book stays shut until it is opened.
    this.shut = false;
    // Leaves on their way to a side, by leaf number; the cover under its own name.
    this.tweens = new Map();
    this.press = null;
    this.frame = 0;
    // A drag ends in a click on whatever was under the finger; that click is not a tap.
    this.swallow = false;
    this.tick = (now) => {
      this.frame = 0;
      for (const [key, tween] of this.tweens) {
        tween.start ??= now + tween.delay;
        const t = Math.min(1, Math.max(0, (now - tween.start) / tween.duration)),
          // A lift rises and falls back; a turn by itself starts and ends gently; a released
          // page keeps the speed it had and eases out onto its side.
          eased = tween.soft ? (1 - Math.cos(t * Math.PI)) / 2 : 1 - (1 - t) ** 3,
          value =
            t < 1
              ? tween.lift
                ? tween.lift * Math.sin(t * Math.PI)
                : tween.from + (tween.to - tween.from) * eased
              : // Exactly on its side, so the leaf counts as flat or gone.
                tween.lift
                ? 0
                : tween.to;
        if (key === 'cover') this.opened = value;
        else this.turn[key] = value;
        if (t === 1) this.tweens.delete(key);
      }
      this.paint();
      if (this.tweens.size) this.frame = requestAnimationFrame(this.tick);
      else if (!this.press?.dir) this.rest();
    };
    this.down = (e) => {
      this.swallow = false;
      if (e.button !== 0 || !e.isPrimary) return;
      // A touch while the book opens by itself has it open at once, on its page.
      if (this.opened < 1 && !this.shut) {
        this.tweens.clear();
        this.opened = 1;
        this.turn = this.turn.map((_, i) => (i < this.index ? 1 : 0));
        this.paint();
      }
      this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, dir: 0, leaf: -1, pull: 0 };
    };
    this.move = (e) => {
      const press = this.press;
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x,
        dy = e.clientY - press.y;
      if (!press.dir) {
        // A page turns sideways, or by a corner carried up or down; anything steeper is a tap
        // or a drag that was not meant for the page.
        if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx) * STEEP) {
          if (Math.abs(dy) > 24) this.press = null;
          return;
        }
        const box = this.stage.getBoundingClientRect();
        press.dir = dx < 0 ? 1 : -1;
        press.from = dx;
        press.rise = dy;
        press.trail = [];
        // Taken low, the lower corner leads; taken high, the upper one; in the middle, neither.
        press.lean = GRIP_LEAN * clamp(((press.y - box.top) / box.height - 0.5) * 2.4, -1, 1);
        // Forwards the open page lifts; backwards the one before it comes back over.
        press.leaf = this.shut ? -1 : press.dir > 0 ? this.index : this.index - 1;
        // The last page has nothing under it: it gives a little and falls back.
        press.held = press.leaf === this.leaves.length - 1;
        // On a shut book it is the cover that is pulled open; pulled back on the first page,
        // the cover comes over to close it.
        press.cover = !!this.front && (this.shut ? press.dir > 0 : !this.index && press.dir < 0);
        if (press.cover) this.tweens.delete('cover');
        if (press.leaf >= 0) {
          this.tweens.delete(press.leaf);
          this.leans[press.leaf] = press.lean;
        }
        this.stage.setPointerCapture(press.id);
        this.root.classList.add('turning');
      }
      if (press.leaf < 0 && !press.cover) return;
      press.pull = Math.max(0, ((press.from - dx) * press.dir) / this.stage.clientWidth);
      press.trail.push([e.clientX, e.timeStamp]);
      if (press.trail.length > 4) press.trail.shift();
      // The cover is a board: it turns on the spine with its edge under the finger, at twice
      // the finger's pace when it has to come all the way from the other side.
      if (press.cover) {
        const edge = clamp(press.dir > 0 ? 1 - press.pull * 1.1 : press.pull * 2.2 - 1, -1, 1);
        this.opened = Math.acos(edge) / Math.PI;
        this.paint();
        return;
      }
      // Forwards the free edge stays under the finger. A page coming back starts beyond the
      // spine, so it travels twice as fast to arrive with the finger.
      this.turn[press.leaf] = press.held
        ? 0.1 * Math.tanh(press.pull * 3)
        : turnForEdge(press.dir > 0 ? 1 - press.pull * 1.1 : press.pull * 2.2 - 1);
      // The fold lies across the way the finger has gone: carried upwards, the corner leads more.
      // It follows a little behind the finger, so a tremble does not shake the page.
      const across = Math.abs(dx - press.from) + 48,
        want = clamp(
          press.lean + (Math.atan2(press.rise - dy, across) * 126) / Math.PI,
          -MAX_LEAN,
          MAX_LEAN,
        );
      this.leans[press.leaf] += (want - this.leans[press.leaf]) * 0.4;
      this.paint();
    };
    this.up = (e) => {
      const press = this.press;
      if (!press || e.pointerId !== press.id) return;
      this.press = null;
      if (!press.dir) return;
      this.swallow = e.type === 'pointerup';
      if (press.leaf < 0 && !press.cover) return this.rest();
      const [x0, t0] = press.trail[0] || [0, 0],
        [x1, t1] = press.trail.at(-1) || [0, 0],
        // Pixels per millisecond in the direction of the turn; a page held still has none.
        speed = t1 > t0 && e.timeStamp - t1 < 80 ? ((x0 - x1) * press.dir) / (t1 - t0) : 0,
        over = e.type === 'pointerup' && !press.held && (press.pull > 0.33 || speed > 0.4);
      // Pulled far enough, the cover goes where it was headed; otherwise back where it was.
      if (press.cover) {
        this.shut = press.dir > 0 ? !over : over;
        this.swing(this.shut ? 0 : 1, {
          duration: 260 + 420 * Math.abs(+!this.shut - this.opened),
        });
        this.announce();
        return;
      }
      if (over) {
        this.index += press.dir;
        this.announce();
      }
      const to = over === press.dir > 0 ? 1 : 0;
      this.send(press.leaf, to, { duration: 260 + 380 * Math.abs(to - this.turn[press.leaf]) });
    };
    this.click = (e) => {
      // A tap on the closed passport opens it.
      if (!this.swallow && !this.shut) return;
      if (!this.swallow) this.open();
      this.swallow = false;
      e.preventDefault();
      e.stopPropagation();
    };
    this.key = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !enabled()) return;
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') this.step(1);
      else if (e.key === 'ArrowLeft') this.step(-1);
      else return;
      e.preventDefault();
    };
    this.pager = (e) => this.step(Number(e.currentTarget.dataset.bookStep));
    this.stage.addEventListener('pointerdown', this.down);
    this.stage.addEventListener('pointermove', this.move);
    this.stage.addEventListener('pointerup', this.up);
    this.stage.addEventListener('pointercancel', this.up);
    this.stage.addEventListener('click', this.click, true);
    document.addEventListener('keydown', this.key);
    this.steps.forEach((button) => button.addEventListener('click', this.pager));
    this.announce(false);
    this.rest();
    // When the book has settled on its page, in milliseconds from now.
    this.settled = 0;
    // Arriving from elsewhere, the passport is closed: its cover swings open on the first page,
    // and the pages turn on to the one the book is opened at.
    if (cover && animate && this.front) {
      const index = this.index;
      this.opened = 0;
      this.index = 0;
      this.turn.fill(0);
      this.settled = this.open(index, 220);
    }
    // The edge of the page lifts once on arrival, to show that it turns.
    if (intro && animate && this.index < this.leaves.length - 1)
      this.tweens.set(this.index, { lift: 0.16, delay: this.settled + 450, duration: 1100 });
    this.paint();
    if (this.tweens.size) this.frame = requestAnimationFrame(this.tick);
  }
  clamp(index) {
    return Math.min(this.leaves.length - 1, Math.max(0, index));
  }
  // Before the first page comes the cover: a step back from there closes the book, and a step
  // forward from the closed book opens it.
  step(by) {
    if (this.shut) {
      if (by > 0) this.open();
    } else if (by < 0 && !this.index && this.front) this.close();
    else this.goTo(this.index + by);
  }
  // The cover swings open on the first page, and the pages turn on to the one asked for. The
  // first of them comes over once the cover is down, so it lands on the cover's inside. Answers
  // with the time, in milliseconds, until everything has settled.
  open(index = 0, delay = 0) {
    const gap = Math.min(150, 450 / index);
    this.shut = false;
    this.swing(1, { delay, duration: 950 });
    for (let i = 0; i < index; i++) this.send(i, 1, { delay: delay + 680 + i * gap, soft: true });
    this.index = index;
    this.announce();
    return delay + (index ? 1440 + (index - 1) * gap : 950);
  }
  close() {
    this.shut = true;
    this.swing(0);
    this.announce();
    // Nothing under the cover can be reached, from the moment it starts to come over.
    for (const leaf of this.leaves) leaf.inert = true;
  }
  swing(to, { delay = 0, duration = 850 } = {}) {
    if (!this.animate) duration = 1;
    this.tweens.set('cover', { from: this.opened, to, delay, duration, soft: true });
    this.root.classList.add('turning');
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }
  // Every leaf between here and there turns, one shortly after the other.
  goTo(index) {
    index = this.clamp(index);
    if (this.shut) return void this.open(index);
    if (index === this.index) return;
    const forward = index > this.index,
      count = Math.abs(index - this.index),
      gap = Math.min(150, 450 / count);
    for (let n = 0; n < count; n++)
      this.send(forward ? this.index + n : this.index - 1 - n, forward ? 1 : 0, {
        delay: n * gap,
        soft: true,
      });
    this.index = index;
    this.announce();
  }
  send(leaf, to, { delay = 0, duration = PageBook.TURN, soft = false } = {}) {
    if (!this.animate) duration = 180;
    // A page at rest is taken by its lower corner; one let go keeps the lean it had.
    if (Number.isInteger(this.turn[leaf])) this.leans[leaf] = LEANS[leaf % LEANS.length];
    this.tweens.set(leaf, { from: this.turn[leaf], to, delay, duration, soft });
    this.root.classList.add('turning');
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }
  // Says which page is open: the dots, the pager's ends, the line for screen readers, the owner.
  announce(notify = true) {
    const leaf = this.leaves[this.index];
    this.root.dataset.page = this.index;
    this.root.classList.toggle('shut', this.shut);
    this.coverDot?.classList.toggle('active', this.shut);
    this.dots.forEach((dot, i) => dot.classList.toggle('active', !this.shut && i === this.index));
    // Back from the first page is the cover; forward from the cover is the first page.
    for (const button of this.steps)
      button.disabled =
        Number(button.dataset.bookStep) < 0
          ? this.shut || (!this.index && !this.front)
          : !this.shut && this.index === this.leaves.length - 1;
    if (this.status) this.status.textContent = this.shut ? '封面' : leaf.getAttribute('aria-label');
    if (notify && !this.shut) this.onTurn(leaf, this.index);
  }
  // Once nothing moves, only the open page can be reached.
  rest() {
    this.root.classList.remove('turning');
    this.leaves.forEach((leaf, i) => (leaf.inert = this.shut || i !== this.index));
  }
  paint() {
    const flat = this.turn.indexOf(0);
    this.leaves.forEach((leaf, i) => {
      const p = this.turn[i],
        above = this.turn[i - 1] ?? 0,
        style = leaf.style,
        // A leaf in mid-turn is shown by its bending stand-in.
        bent = this.animate && p > 0 && p < 1,
        // Leaves that have gone over, and those still covered by a flat one, are not drawn.
        off = p === 1 || (flat >= 0 && i > flat);
      leaf.classList.toggle('is-off', off || bent);
      if (bent) this.shape(this.bends.get(i) || this.fold(leaf, i), p, this.leans[i]);
      else if (this.bends.has(i)) {
        this.bends.get(i).root.remove();
        this.bends.delete(i);
      }
      if (off) return;
      // With motion reduced a page fades out where it lies instead of turning over.
      if (!this.animate) style.opacity = (1 - p).toFixed(3);
      // Whatever is above casts its shadow on this page until it has left. A bending page
      // throws a band along its lifted edge; a page fading out where it lies, and the cover
      // while it opens, dim the whole page.
      const lifted = this.bends.get(i - 1);
      style.setProperty('--cast', lifted ? lifted.cast : 'none');
      style.setProperty(
        '--under',
        Math.max(
          !lifted && above > 0 && above < 1 ? 1 - above : 0,
          i === flat ? 1 - this.opened : 0,
        ).toFixed(3),
      );
    });
    // What lies to the left of the gutter: with no page over there yet, the inside of the
    // cover; after that, the back of the last page that landed. A page still in the air is
    // its own stand-in, which covers the place while it comes down or lifts off.
    this.root.dataset.turned = this.turn.filter((p) => p === 1).length;
    if (!this.front || this.opened === this.shown) return;
    this.shown = this.opened;
    this.root.classList.toggle('covered', this.opened < 1);
    this.front.style.setProperty('--turn', `${(-180 * this.opened).toFixed(2)}deg`);
  }
  // Builds the stand-in for a turning leaf: copies of the page behind strip-wide windows, each
  // strip hinged on the one before it. Seen from behind, a strip shows the same paper, unprinted.
  // The strips run along the fold and reach past the page at both ends, so the fold can lean.
  // Everything that changes from frame to frame is written on the element it belongs to: a value
  // handed down from the root would restyle every copy of the page on every frame.
  fold(leaf, i) {
    const width = leaf.offsetWidth,
      height = leaf.offsetHeight,
      pad = Math.ceil(width * Math.sin(radians(MAX_LEAN)) * 1.1),
      root = document.createElement('div'),
      strips = [];
    root.className = 'book-bend';
    root.inert = true;
    root.style.zIndex = leaf.style.getPropertyValue('--n');
    for (let k = 0, parent = root; k < STRIPS; k++) {
      const make = (name) => Object.assign(document.createElement('div'), { className: name }),
        hinge = make('bend-strip'),
        front = make('bend-front'),
        back = make('bend-back'),
        // The back faces the other way; mirrored again, it is laid out like the front.
        mirror = make('bend-mirror'),
        paper = make('bend-paper'),
        copy = leaf.cloneNode(true),
        // The light on each side, laid over the page it belongs to and cut to its shape.
        light = make('bend-wash'),
        dull = make('bend-wash');
      if (!k) hinge.style.cssText = `top:${-pad}px;height:${height + pad * 2}px`;
      copy.classList.remove('is-off');
      copy.classList.add('book-copy');
      copy.style.cssText = paper.style.cssText = `top:${pad}px;width:${width}px;height:${height}px`;
      for (const image of copy.querySelectorAll('img')) image.loading = 'eager';
      copy.append(light);
      paper.append(dull);
      front.append(copy);
      mirror.append(paper);
      back.append(mirror);
      hinge.append(front, back);
      parent.append(hinge);
      strips.push({ hinge, front, back, copy, paper, light, dull });
      parent = hinge;
    }
    leaf.parentNode.append(root);
    const bend = { root, strips, width, height, cast: 'none' };
    this.bends.set(i, bend);
    return bend;
  }
  shape(bend, p, lean) {
    // The lean is the corner's; by the time the spine's side of the page rises, the fold has
    // straightened, so the page stays bound along its whole height.
    const eased = clamp((p - 0.15) / 0.55, 0, 1),
      tilt = lean * (1 - eased * eased * (3 - 2 * eased)),
      // Across its fold lines the page measures this much; the strips share it.
      span = bend.width * Math.cos(radians(tilt)) + bend.height * Math.sin(radians(Math.abs(tilt))),
      strip = span / STRIPS,
      angles = bend.strips.map((_, k) => stripAngle(p, k)),
      // Coming down on the other side, the page takes its shadow with it.
      landing = Math.min(1, (1 - p) / 0.3),
      front = [],
      back = [];
    // Out from the spine: how far the sheet reaches over the page beneath, and how high it
    // stands there.
    let x = 0,
      z = 0,
      reach = 0,
      lift = 0;
    for (let k = 0; k <= STRIPS; k++) {
      // Each strip is lit from one neighbour's shade to the other's, so the bend reads as one
      // curve and not as steps.
      const angle = ((angles[k - 1] ?? angles[0]) + (angles[k] ?? angles[STRIPS - 1])) / 2,
        at = `${((k / STRIPS) * 100).toFixed(2)}%`;
      front.push(`${wash(angle, false)} ${at}`);
      back.push(`${wash(angle, true)} ${at}`);
      if (x > reach) {
        reach = x;
        lift = z;
      }
      if (k < STRIPS) {
        x += strip * Math.cos(radians(angles[k]));
        z += strip * Math.sin(radians(angles[k]));
        bend.strips[k].hinge.style.transform =
          `rotateY(${((angles[k - 1] ?? 0) - angles[k]).toFixed(2)}deg)`;
      }
    }
    // The washes and the shadow run across the fold lines, which in the page's own frame is
    // this direction.
    const across = `${(90 + tilt).toFixed(2)}deg`,
      // Seen in perspective, the lifted edge stands a little further out than it lies.
      edge = ((reach * EYE) / (EYE - lift) / span) * 100,
      // The higher the sheet stands, the wider and the fainter the shadow it casts.
      width = ((18 + lift * 0.6) / span) * 100,
      dark = 0.34 * (1 - 0.5 * Math.min(1, lift / (span * 0.45))) * Math.min(1, p / 0.05) * landing,
      light = `linear-gradient(${across}, ${front.join(', ')})`,
      dull = `linear-gradient(${across}, ${back.join(', ')})`,
      // The whole set of strips is turned by the lean about the spine's end, and each page in
      // it is turned back, so the page itself stays where it lies.
      pivot = `0 ${tilt < 0 ? '100%' : '0%'}`,
      turned = `rotate(${(-tilt).toFixed(2)}deg)`,
      // Laying the strips out again is only needed while the lean changes.
      laid = strip.toFixed(2) !== bend.strip;
    bend.strip = strip.toFixed(2);
    bend.root.style.transformOrigin = pivot;
    bend.root.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
    bend.strips.forEach((part, k) => {
      if (laid) {
        part.hinge.style.left = `${k ? bend.strip : 0}px`;
        part.hinge.style.width = `${bend.strip}px`;
        part.copy.style.left = part.paper.style.left = `${(-k * strip).toFixed(2)}px`;
      }
      part.copy.style.transformOrigin = part.paper.style.transformOrigin = pivot;
      part.copy.style.transform = part.paper.style.transform = turned;
      part.light.style.background = light;
      part.dull.style.background = dull;
    });
    bend.cast =
      dark < 0.004
        ? 'none'
        : `linear-gradient(${across}, rgb(14 22 40 / ${dark.toFixed(3)}) ${edge.toFixed(2)}%, rgb(14 22 40 / ${(dark * 0.3).toFixed(3)}) ${(edge + width * 0.45).toFixed(2)}%, #0000 ${(edge + width).toFixed(2)}%)`;
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.tweens.clear();
    this.press = null;
    for (const bend of this.bends.values()) bend.root.remove();
    this.bends.clear();
    this.stage.removeEventListener('pointerdown', this.down);
    this.stage.removeEventListener('pointermove', this.move);
    this.stage.removeEventListener('pointerup', this.up);
    this.stage.removeEventListener('pointercancel', this.up);
    this.stage.removeEventListener('click', this.click, true);
    document.removeEventListener('keydown', this.key);
    this.steps.forEach((button) => button.removeEventListener('click', this.pager));
  }
}
