/**
 * A row of slides that scrolls sideways by itself. The browser does the scrolling and the
 * snapping, so a finger or a trackpad moves it natively; this only moves it on when it is left
 * alone, and keeps the dots in step.
 */
export class Carousel {
  constructor(
    root,
    { animate = true, start = 0, interval = 4500, enabled = () => true, onChange = () => {} } = {},
  ) {
    this.root = root;
    this.track = root.querySelector('[data-carousel-track]');
    this.slides = [...this.track.children];
    this.dots = [...root.querySelectorAll('[data-carousel-dot]')];
    this.animate = animate && this.slides.length > 1;
    this.interval = interval;
    this.timer = 0;
    this.index = -1;
    // Held by a finger or under the pointer, it stays where it is.
    this.held = false;
    this.offset = (n) => this.slides[n].offsetLeft - this.slides[0].offsetLeft;
    this.mark = (n) => {
      if (n === this.index) return;
      this.index = n;
      this.dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === n)));
      onChange(n);
    };
    this.wait = () => {
      clearTimeout(this.timer);
      if (this.animate && !this.held) this.timer = setTimeout(this.advance, this.interval);
    };
    this.advance = () => {
      // Out of sight, or behind a dialog, it waits for its next turn. After the last slide
      // comes the first again.
      if (enabled() && !document.hidden && this.root.offsetParent)
        this.go((this.index + 1) % this.slides.length);
      this.wait();
    };
    // The slide nearest to where the row has been scrolled to. Any scroll, by hand or not,
    // starts the wait again.
    this.scrolled = () => {
      const at = this.track.scrollLeft;
      let nearest = 0;
      this.slides.forEach((_, n) => {
        if (Math.abs(this.offset(n) - at) < Math.abs(this.offset(nearest) - at)) nearest = n;
      });
      this.mark(nearest);
      this.wait();
    };
    this.hold = () => {
      this.held = true;
      clearTimeout(this.timer);
    };
    this.release = () => {
      this.held = false;
      this.wait();
    };
    this.pick = (e) => {
      const dot = e.target.closest('[data-carousel-dot]');
      if (dot) this.go(this.dots.indexOf(dot));
    };
    this.track.addEventListener('scroll', this.scrolled, { passive: true });
    for (const type of ['touchstart', 'mouseenter', 'focusin'])
      root.addEventListener(type, this.hold, { passive: true });
    for (const type of ['touchend', 'touchcancel', 'mouseleave', 'focusout'])
      root.addEventListener(type, this.release, { passive: true });
    root.addEventListener('click', this.pick);
    // Hidden, it has nowhere to scroll to, and starts from the first slide once it shows.
    const first = root.offsetParent ? Math.min(start, this.slides.length - 1) : 0;
    this.go(first, false);
    this.mark(first);
    this.wait();
  }
  // Reads the place of the row again, after it has been hidden and shown.
  sync() {
    this.scrolled();
  }
  go(n, smooth = this.animate) {
    this.track.scrollTo({ left: this.offset(n), behavior: smooth ? 'smooth' : 'instant' });
  }
  destroy() {
    clearTimeout(this.timer);
    this.track.removeEventListener('scroll', this.scrolled);
    for (const type of ['touchstart', 'mouseenter', 'focusin'])
      this.root.removeEventListener(type, this.hold);
    for (const type of ['touchend', 'touchcancel', 'mouseleave', 'focusout'])
      this.root.removeEventListener(type, this.release);
    this.root.removeEventListener('click', this.pick);
  }
}
