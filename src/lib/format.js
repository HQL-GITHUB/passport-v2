/**
 * How things are written on a page: text made safe for HTML, icons, a stamp's illustration,
 * dates, and a collector's number. None of it depends on what the application holds.
 */
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => entities[c]);

export const icon = (name, cls = '') =>
  `<svg aria-hidden="true" class="${cls}"><use href="#i-${name}"/></svg>`;

// A stamp's illustration. Where there is no stamp to draw, nothing.
export const art = (s, cls = '') =>
  s
    ? `<span class="badge-art badge-${s.art} ${s.edition ? 'badge-edition' : ''} ${cls}" ${s.edition ? `data-edition="特展 · ${safe(s.edition)}"` : ''} role="img" aria-label="${safe(s.title)}纪念章插画"></span>`
    : '';

export const date = (value) => String(value).replaceAll('-', '.');

export const dateShort = (value) => date(value).slice(5);

// A limited stamp shows its number against the edition size.
export const issue = (record, stamp) =>
  stamp?.limit
    ? `No. ${String(record.issue).padStart(String(stamp.limit).length, '0')} / ${stamp.limit}`
    : `No. ${String(record.issue).padStart(6, '0')}`;

export const methodName = (method) =>
  ({ ticket: '票根领取', qr: '现场扫码', nfc: '碰一碰', legacy: '已有记录' })[method] || '已有记录';

// The ways a stamp was collected on one day of its record.
export const visitMethods = (r, day) =>
  [
    ...new Set((r.events || []).filter((e) => e.date === day).map((e) => methodName(e.method))),
  ].join(' · ') || methodName(r.method || 'qr');
