// The other collectors of the demonstration: invented people and the stamps they hold. Each stamp
// is written as the stamp, the day it was collected, how it was collected and, for some, a line
// about the visit. All of them show their album, or they would not be on the boards; `footprints`
// and `memories` say what else each has chosen to show.
export const collectors = [
  {
    id: 'ali',
    name: '阿栗',
    city: '临江',
    footprints: true,
    memories: true,
    stamps: [
      ['museum-exhibition', '2025-09-06', 'qr', '开展的第一个周末就来了，人不多，正好慢慢看。'],
      ['museum', '2025-09-06', 'qr'],
      ['artmuseum', '2025-11-22', 'qr', '下午四点的光，是这座馆最好的展品。'],
      ['modern', '2026-03-14', 'qr'],
      ['maritime', '2026-05-02', 'nfc', '临江的五枚，到这里集齐了。'],
      ['landscape', '2026-07-19', 'qr'],
      ['porcelain', '2026-07-20', 'qr', '第一次摸到还没上釉的坯。'],
    ],
  },
  {
    id: 'weekend',
    name: '周末看展人',
    city: '临江',
    footprints: true,
    stamps: [
      ['museum-exhibition', '2025-12-20', 'ticket'],
      ['museum', '2026-01-10', 'qr'],
      ['artmuseum', '2026-02-07', 'qr'],
      ['modern', '2026-04-18', 'nfc'],
      ['maritime', '2026-06-13', 'qr'],
      ['astronomy', '2026-08-15', 'qr'],
    ],
  },
  {
    id: 'mori',
    name: 'Mori',
    city: '临江',
    stamps: [
      ['artmuseum', '2025-06-28', 'qr'],
      ['modern', '2025-08-09', 'qr'],
      ['museum-exhibition', '2025-11-01', 'qr'],
      ['landscape', '2026-04-05', 'qr'],
    ],
  },
  {
    id: 'zhou',
    name: '老周',
    city: '临江',
    footprints: true,
    stamps: [
      ['museum-exhibition', '2025-09-01', 'qr'],
      ['museum', '2025-09-01', 'qr'],
    ],
  },
  {
    id: 'chen',
    name: '陈一苇',
    city: '临江',
    stamps: [
      ['museum', '2025-10-02', 'ticket'],
      ['museum-exhibition', '2025-10-02', 'ticket'],
      ['maritime', '2026-09-06', 'qr'],
      ['artmuseum', '2026-10-11', 'qr'],
    ],
  },
  {
    id: 'shen',
    name: '沈青',
    city: '云川',
    footprints: true,
    memories: true,
    stamps: [
      ['landscape', '2025-05-17', 'qr', '看完展出来，山就在馆的后面。'],
      ['porcelain', '2025-12-06', 'qr'],
      ['textile', '2026-02-21', 'qr', '织机一响，整间厂房都跟着动。'],
      ['astronomy', '2026-03-28', 'nfc', '云川的四枚，在星空大厅里集齐。'],
      ['museum', '2026-06-06', 'qr'],
      ['maritime', '2026-06-07', 'qr'],
    ],
  },
  {
    id: 'deer',
    name: '林间小鹿',
    city: '云川',
    footprints: true,
    stamps: [
      ['porcelain', '2026-01-24', 'qr'],
      ['textile', '2026-05-16', 'qr'],
      ['astronomy', '2026-09-20', 'qr'],
      ['modern', '2026-10-03', 'qr'],
    ],
  },
  {
    id: 'fish',
    name: '南方有鱼',
    city: '云川',
    stamps: [
      ['landscape', '2026-03-08', 'qr'],
      ['astronomy', '2026-03-08', 'qr'],
      ['artmuseum', '2026-08-01', 'qr'],
      ['maritime', '2026-08-02', 'nfc'],
    ],
  },
  {
    id: 'mumu',
    name: '木木',
    city: '云川',
    stamps: [
      ['textile', '2025-10-25', 'qr'],
      ['landscape', '2026-10-18', 'ticket'],
    ],
  },
  {
    id: 'xiaoman',
    name: '小满',
    city: '临江',
    footprints: true,
    memories: true,
    stamps: [['maritime', '2026-11-02', 'qr', '我的第一枚。船比想象的大。']],
  },
];

// What they have put on the square: the collector, the venue, the day of the visit, how many
// liked it and the line written with it. Each is one of the visits above.
export const posts = [
  ['xiaoman', 'maritime', '2026-11-02', 12, '我的第一枚。船比想象的大。'],
  ['mumu', 'landscape', '2026-10-18', 5, '当年的票根还夹在书里，这次把章补上了。'],
  ['chen', 'artmuseum', '2026-10-11', 18, '排了二十分钟的队，值得。'],
  ['deer', 'modern', '2026-10-03', 9, '形状原来可以这么软。'],
  ['deer', 'astronomy', '2026-09-20', 31, '闭馆前的最后一场星空，全场都很安静。'],
  ['weekend', 'astronomy', '2026-08-15', 14, '第一次为了一枚章，坐了两个小时的车。'],
  ['fish', 'maritime', '2026-08-02', 7, ''],
  ['ali', 'porcelain', '2026-07-20', 26, '第一次摸到还没上釉的坯。'],
  ['shen', 'maritime', '2026-06-07', 11, '从山里来看海。'],
  ['ali', 'maritime', '2026-05-02', 42, '临江的五枚，到这里集齐了。'],
  ['shen', 'astronomy', '2026-03-28', 38, '云川的四枚，在星空大厅里集齐。'],
  ['shen', 'textile', '2026-02-21', 16, '织机一响，整间厂房都跟着动。'],
];
