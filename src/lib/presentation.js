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
    art: (v, cls = '') =>
      `<span class="badge-art badge-${v.art} ${v.edition ? 'badge-edition' : ''} ${cls}" ${v.edition ? `data-edition="特展 · ${v.edition}"` : ''} role="img" aria-label="${v.stamp}纪念章插画"></span>`,
    date: (value) => String(value).replaceAll('-', '.'),
    // A limited stamp shows its number against the edition size.
    issue: (record, stamp) =>
      stamp?.limit
        ? `No. ${String(record.issue).padStart(String(stamp.limit).length, '0')} / ${stamp.limit}`
        : `No. ${String(record.issue).padStart(6, '0')}`,
    dateShort: (value) => appContext.format.date(value).slice(5),
    clone: (value) => JSON.parse(JSON.stringify(value)),
    validDay: (value) => {
      if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        value < '1900-01-01' ||
        value > appContext.config.demoDate
      )
        return false;
      const [y, m, d] = value.split('-').map(Number),
        day = new Date(Date.UTC(y, m - 1, d));
      return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
    },
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
      day.slice(0, 4) === appContext.config.demoDate.slice(0, 4)
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
