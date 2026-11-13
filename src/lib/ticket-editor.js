/** Crop and opaque redaction are applied only to the share copy. */
export class TicketEditor {
  constructor(canvas, image) {
    this.canvas = canvas;
    this.image = image;
    this.mode = 'mask';
    this.masks = [];
    this.crop = null;
    this.history = [];
    this.drag = null;
    const parent = canvas.parentElement,
      style = getComputedStyle(parent),
      available =
        (parent.clientWidth || 350) -
        parseFloat(style.paddingLeft || 0) -
        parseFloat(style.paddingRight || 0);
    const scale = Math.min(available / image.width, 340 / image.height, 1);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    this.down = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.drag = {
        start: this.point(e),
        end: this.point(e),
      };
    };
    this.move = (e) => {
      if (!this.drag) return;
      this.drag.end = this.point(e);
      this.draw();
    };
    this.up = (e) => {
      if (!this.drag) return;
      this.drag.end = this.point(e);
      const r = this.rect(this.drag);
      this.drag = null;
      if (r.w > image.width * 0.008 && r.h > image.height * 0.008) {
        this.history.push({
          crop: this.crop
            ? {
                ...this.crop,
              }
            : null,
          masks: this.masks.map((m) => ({
            ...m,
          })),
        });
        if (this.mode === 'mask') this.masks.push(r);
        else this.crop = r;
      }
      this.draw();
    };
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', () => {
      this.drag = null;
      this.draw();
    });
    this.draw();
  }
  point(e) {
    const b = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(this.image.width, ((e.clientX - b.left) / b.width) * this.image.width),
      ),
      y: Math.max(
        0,
        Math.min(this.image.height, ((e.clientY - b.top) / b.height) * this.image.height),
      ),
    };
  }
  rect(d) {
    return {
      x: Math.min(d.start.x, d.end.x),
      y: Math.min(d.start.y, d.end.y),
      w: Math.abs(d.end.x - d.start.x),
      h: Math.abs(d.end.y - d.start.y),
    };
  }
  draw() {
    const c = this.canvas,
      ctx = c.getContext('2d'),
      sx = c.width / this.image.width,
      sy = c.height / this.image.height;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(this.image, 0, 0, c.width, c.height);
    ctx.fillStyle = '#20242c';
    for (const r of this.masks) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    const crop = this.drag && this.mode === 'crop' ? this.rect(this.drag) : this.crop;
    if (crop) {
      ctx.fillStyle = '#10204066';
      ctx.fillRect(0, 0, c.width, crop.y * sy);
      ctx.fillRect(0, (crop.y + crop.h) * sy, c.width, c.height - (crop.y + crop.h) * sy);
      ctx.fillRect(0, crop.y * sy, crop.x * sx, crop.h * sy);
      ctx.fillRect(
        (crop.x + crop.w) * sx,
        crop.y * sy,
        c.width - (crop.x + crop.w) * sx,
        crop.h * sy,
      );
      ctx.strokeStyle = '#20242c';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy);
    }
    if (this.drag && this.mode === 'mask') {
      const r = this.rect(this.drag);
      ctx.fillStyle = '#20242ccc';
      ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    }
  }
  undo() {
    const h = this.history.pop();
    if (h) {
      this.crop = h.crop;
      this.masks = h.masks;
      this.draw();
    }
  }
  reset() {
    this.history.push({
      crop: this.crop,
      masks: this.masks.map((m) => ({
        ...m,
      })),
    });
    this.crop = null;
    this.masks = [];
    this.draw();
  }
  export() {
    const r = this.crop || {
        x: 0,
        y: 0,
        w: this.image.width,
        h: this.image.height,
      },
      scale = Math.min(1, 1600 / Math.max(r.w, r.h)),
      c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(r.w * scale));
    c.height = Math.max(1, Math.round(r.h * scale));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(this.image, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    ctx.fillStyle = '#20242c';
    for (const m of this.masks)
      ctx.fillRect((m.x - r.x) * scale, (m.y - r.y) * scale, m.w * scale, m.h * scale);
    return c.toDataURL('image/jpeg', 0.92);
  }
}
