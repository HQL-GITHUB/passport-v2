/**
 * The single-file build inlines images as data URLs of several megabytes, more than a CSS custom
 * property may hold and too much to write into a page again with every render. A blob URL keeps
 * the reference short; other URLs pass through.
 */
export function imageUrl(src) {
  if (!src.startsWith('data:')) return src;
  const [head, body] = src.split(',');
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: head.slice(5).split(';')[0] }));
}

/** Makes the short URLs of inlined images, and keeps them to let go of together. */
export function createImageUrls() {
  const made = [];
  return {
    short(src) {
      if (!src) return '';
      const url = imageUrl(src);
      if (url !== src) made.push(url);
      return url;
    },
    dispose() {
      made.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}

// A picture a visitor can bring in: a photograph or a screenshot, of a size a phone takes.
export function importable(file) {
  return (
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024
  );
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load'));
    img.src = url;
  });
}

export function wrapText(ctx, text, width, maxLines = 4) {
  const lines = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (ch === '\n' || ctx.measureText(line + ch).width > width) {
      lines.push(line);
      line = ch === '\n' ? '' : ch;
      if (lines.length === maxLines) break;
    } else line += ch;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && lines.join('').length < text.replaceAll('\n', '').length)
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/u, '') + '…';
  return lines;
}
