/** Turns the flat stamp illustration like a medal: it shows itself off until touched, then drag to tilt, release to settle on a face. */
export class MedalViewer {
  constructor(
    stage,
    { canFlip = true, animate = true, intro = true, tapFlips = true, locked = () => false } = {},
  ) {
    this.stage = stage;
    this.canFlip = canFlip;
    this.animate = animate;
    this.flipButton = (stage.closest('.modal, .page') || stage.parentElement).querySelector(
      '[data-medal-flip]',
    );
    // Current angles, their targets and velocities, in degrees.
    this.rx = this.ry = this.tx = this.ty = this.vx = this.vy = 0;
    this.drag = null;
    this.frame = 0;
    this.side = '';
    // Left alone, the medal turns slowly on its own; the first turn by hand ends that for good.
    this.auto = animate;
    // Milliseconds spent turning unattended, and the time of the previous frame.
    this.turned = this.last = 0;
    // How far the last press travelled, in pixels.
    this.moved = 0;
    this.tick = (now) => {
      if (this.auto && !locked()) {
        // A frame after a pause, such as a hidden tab, counts as one ordinary frame.
        this.turned += Math.min(now - this.last, 32);
        // One lap every twelve seconds; a stamp with no back to show sways instead.
        this.ty = this.canFlip ? this.turned * 0.03 : Math.sin(this.turned / 900) * 20;
      }
      this.last = now;
      this.vx = (this.vx + (this.tx - this.rx) * 0.09) * 0.8;
      this.vy = (this.vy + (this.ty - this.ry) * 0.09) * 0.8;
      this.rx += this.vx;
      this.ry += this.vy;
      const resting =
        !this.auto &&
        Math.abs(this.tx - this.rx) + Math.abs(this.ty - this.ry) < 0.05 &&
        Math.abs(this.vx) + Math.abs(this.vy) < 0.05;
      if (resting) {
        this.rx = this.tx;
        this.ry = this.ty;
      }
      this.paint();
      this.frame = resting ? 0 : requestAnimationFrame(this.tick);
    };
    this.down = (e) => {
      if (e.button !== 0 || locked()) return;
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.drag = { x: e.clientX, y: e.clientY, rx: this.rx, ry: this.ry };
      this.moved = 0;
      stage.classList.add('dragging');
    };
    this.move = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x,
        dy = e.clientY - this.drag.y,
        // The further the pull, the stronger the resistance.
        soft = (value, limit) => limit * Math.tanh(value / limit);
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      this.rx = soft(this.drag.rx - dy * 0.4, 26);
      this.ry = this.canFlip ? this.drag.ry + dx * 0.6 : soft(this.drag.ry + dx * 0.5, 24);
      this.paint();
    };
    this.up = () => {
      if (!this.drag) return;
      const tapped = this.moved < 6;
      this.drag = null;
      stage.classList.remove('dragging');
      if (tapped && this.canFlip && tapFlips) this.flip();
      else {
        // A tap that turns nothing leaves the medal turning.
        this.auto &&= tapped;
        this.settle();
      }
    };
    // The browser took the gesture over, for example to scroll the page: let go without flipping.
    this.cancel = () => {
      if (!this.drag) return;
      this.drag = null;
      stage.classList.remove('dragging');
      this.settle();
    };
    // Inside a button, a drag turns the medal without also pressing the button.
    this.click = (e) => {
      if (this.moved < 6) return;
      e.preventDefault();
      e.stopPropagation();
    };
    this.flip = () => {
      if (!this.canFlip) return;
      this.auto = false;
      this.tx = 0;
      this.ty = Math.round(this.ry / 180) * 180 + 180;
      this.start();
    };
    if (animate) {
      stage.addEventListener('pointerdown', this.down);
      stage.addEventListener('pointermove', this.move);
      stage.addEventListener('pointerup', this.up);
      stage.addEventListener('pointercancel', this.cancel);
      stage.addEventListener('click', this.click);
      // A small swing on arrival shows that the stamp can be turned.
      if (intro) {
        this.rx = 9;
        this.ry = -34;
      }
    }
    this.flipButton?.addEventListener('click', this.flip);
    this.start();
  }
  settle() {
    // Still unattended, the turn simply carries on from here.
    if (!this.auto) {
      this.tx = 0;
      this.ty = this.canFlip ? Math.round(this.ry / 180) * 180 : 0;
    }
    this.start();
  }
  start() {
    if (!this.animate) {
      this.rx = this.tx;
      this.ry = this.ty;
      this.paint();
    } else if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }
  paint() {
    const turn = (this.ry * Math.PI) / 180,
      facing = Math.cos(turn),
      style = this.stage.style,
      side = facing < 0 ? 'back' : 'front';
    style.setProperty('--rx', `${this.rx.toFixed(2)}deg`);
    style.setProperty('--ry', `${this.ry.toFixed(2)}deg`);
    style.setProperty('--sheen-x', `${(50 - Math.sin(turn) * 42).toFixed(1)}%`);
    style.setProperty('--sheen-y', `${(50 + this.rx * 1.5).toFixed(1)}%`);
    style.setProperty(
      '--glare',
      Math.min(1, Math.abs(Math.sin(turn)) * 2.4 + Math.abs(this.rx) / 22).toFixed(3),
    );
    style.setProperty('--shade', ((1 - Math.abs(facing)) * 0.36).toFixed(3));
    style.setProperty('--shadow', (0.3 + Math.abs(facing) * 0.7).toFixed(3));
    if (side === this.side) return;
    this.side = side;
    this.stage.dataset.side = side;
    if (this.flipButton) {
      // The button is an icon; its name says which way it turns the medal.
      const label = side === 'back' ? '翻回正面' : '翻到背面';
      this.flipButton.setAttribute('aria-label', label);
      this.flipButton.title = label;
      this.flipButton.setAttribute('aria-pressed', String(side === 'back'));
    }
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.drag = null;
    this.stage.removeEventListener('pointerdown', this.down);
    this.stage.removeEventListener('pointermove', this.move);
    this.stage.removeEventListener('pointerup', this.up);
    this.stage.removeEventListener('pointercancel', this.cancel);
    this.stage.removeEventListener('click', this.click);
    this.flipButton?.removeEventListener('click', this.flip);
  }
}
