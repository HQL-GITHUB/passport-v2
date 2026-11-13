export function createPresentation(appContext) {
  return {
    safe: (value) =>
      String(value ?? '').replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c],
      ),
    icon: (name, cls = '') =>
      `<svg aria-hidden="true" class="${cls}"><use href="#i-${name}"/></svg>`,
    // A stamp's illustration. Where there is no stamp to draw, nothing.
    art: (s, cls = '') =>
      s
        ? `<span class="badge-art badge-${s.art} ${s.edition ? 'badge-edition' : ''} ${cls}" ${s.edition ? `data-edition="特展 · ${s.edition}"` : ''} role="img" aria-label="${s.title}纪念章插画"></span>`
        : '',
    date: (value) => String(value).replaceAll('-', '.'),
    // A limited stamp shows its number against the edition size.
    issue: (record, stamp) =>
      stamp?.limit
        ? `No. ${String(record.issue).padStart(String(stamp.limit).length, '0')} / ${stamp.limit}`
        : `No. ${String(record.issue).padStart(6, '0')}`,
    dateShort: (value) => appContext.format.date(value).slice(5),
    methodName: (method) =>
      ({
        ticket: '票根领取',
        qr: '现场扫码',
        nfc: '碰一碰',
        legacy: '已有记录',
      })[method] || '已有记录',
    firstVisit: (r) => [...r.visits].sort()[0] || r.firstAt,
    selectedVisit: (r) =>
      r.visits.includes(appContext.ui.visitDate)
        ? appContext.ui.visitDate
        : appContext.format.firstVisit(r),
    displayVisit: (day) =>
      day.slice(0, 4) === appContext.clock.today().slice(0, 4)
        ? appContext.format.dateShort(day)
        : appContext.format.date(day),
    visitMethods: (r, day) =>
      [
        ...new Set(
          (r.events || [])
            .filter((e) => e.date === day)
            .map((e) => appContext.format.methodName(e.method)),
        ),
      ].join(' · ') || appContext.format.methodName(r.method || 'qr'),
  };
}
