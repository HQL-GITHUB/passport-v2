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
