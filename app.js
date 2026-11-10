(() => {
  'use strict';
  const STORAGE_KEY = 'cultural-passport-prototype-v2';
  const TODAY = '2026-11-10';
  const ATLAS_URL = 'assets/collectible-atlas.png';
  const HERO_URL = 'assets/museum-courtyard.png';
  const venues = [
    { id:'museum', name:'临江博物馆', city:'临江', type:'博物馆', category:'museum', art:'museum', tile:0, stamp:'青铜回响', english:'ECHOES IN BRONZE', exhibit:'器物与时间', description:'以一件青铜器为线索，走进城市与文明的漫长对话。让器物上的纹样，成为这段旅程的注脚。', intro:'一座收藏城市记忆的博物馆。沿着器物、工艺与日常生活的线索，慢慢认识临江。', location:'一层参观出口 · 纪念章台', serial:'LJ-M-0001', kind:'常设馆章', word:'器物' },
    { id:'artmuseum', name:'白屿美术馆', city:'临江', type:'美术馆', category:'artmuseum', art:'artmuseum', tile:1, stamp:'光的形状', english:'THE SHAPE OF LIGHT', exhibit:'光与空间', description:'弧线、光影与一座安静的美术馆。把那次为一件作品停下脚步的瞬间，留在护照里。', intro:'让艺术走进日常的开放空间。在建筑的曲线和作品的留白之间，发现属于自己的观看方式。', location:'一层艺术商店旁 · 盖章处', serial:'LJ-A-0002', kind:'常设馆章', word:'光影' },
    { id:'landscape', name:'山川影像馆', city:'云川', type:'艺术空间', category:'space', art:'landscape', tile:2, stamp:'山川来信', english:'LETTERS FROM THE LAND', exhibit:'在山野之间', description:'山有轮廓，水有来处。沿着影像里的山川，收藏一次与远方相遇的记忆。', intro:'以摄影和影像记录人与自然的关系。透过不同创作者的镜头，重新发现熟悉的山川。', location:'一层公共大厅 · 服务台右侧', serial:'YC-S-0003', kind:'常设馆章', word:'山川' },
    { id:'modern', name:'几何艺术中心', city:'临江', type:'艺术空间', category:'space', art:'modern', tile:3, stamp:'柔软的秩序', english:'A SOFTER ORDER', exhibit:'形状之间', description:'球体、拱门和柔软的几何关系。从一场关于形状的探索，带走一点新的想象。', intro:'一处面向当代艺术与设计的实验空间。在色彩、材质与尺度之间，让好奇心自由漫游。', location:'展厅出口 · 观众服务区', serial:'LJ-S-0004', kind:'展览纪念章', word:'形状' }
  ];
  const stamps = [...venues, {...venues[0],id:'museum-exhibition',venueId:'museum',stamp:'器物与时间·2025',kind:'展览纪念章',edition:'2025',serial:'LJ-E-2025',period:['2025-09-01','2025-12-31'],description:'为那次与器物相遇的参观，留住一枚特展纪念。票根上的日期，让过去的旅程也能慢慢补齐。'}];
  const byId = id => stamps.find(v => v.id === id) || venues[0];
  const venueOf = v => venues.find(item => item.id === (v.venueId||v.id)) || venues[0];
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, cls='') => `<svg aria-hidden="true" class="${cls}"><use href="#i-${name}"/></svg>`;
  const art = (v, cls='') => `<span class="badge-art badge-${v.art} ${v.edition?'badge-edition':''} ${cls}" ${v.edition?`data-edition="特展 · ${v.edition}"`:''} role="img" aria-label="${v.stamp}纪念章插画"></span>`;
  const date = value => String(value).replaceAll('-','.');
  const dateShort = value => date(value).slice(5);
  const clone = value => JSON.parse(JSON.stringify(value));
  const validDay = value => {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>TODAY)return false;
    const [y,m,d]=value.split('-').map(Number),day=new Date(Date.UTC(y,m-1,d));
    return day.getUTCFullYear()===y&&day.getUTCMonth()===m-1&&day.getUTCDate()===d;
  };
  const methodName = method => ({ticket:'票根领取',qr:'现场扫码',nfc:'碰一碰',legacy:'已有记录'})[method]||'已有记录';
  const firstVisit = r => [...r.visits].sort()[0]||r.firstAt;
  const selectedVisit = r => r.visits.includes(ui.visitDate)?ui.visitDate:firstVisit(r);
  const displayVisit = day => day.slice(0,4)===TODAY.slice(0,4)?dateShort(day):date(day);
  const visitMethods = (r,day) => [...new Set((r.events||[]).filter(e=>e.date===day).map(e=>methodName(e.method)))].join(' · ')||methodName(r.method||'qr');
  const initialData = () => ({ version:2, records:{
    artmuseum:{firstAt:'2026-10-24',visits:['2026-10-24'],note:'光从弧形墙面落下来，这一刻很安静。',photo:''},
    landscape:{firstAt:'2026-10-03',visits:['2026-10-03'],note:'',photo:''},
    modern:{firstAt:'2026-09-17',visits:['2026-09-17'],note:'',photo:''}
  }, wanted:[],tickets:{} });
  function readData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(parsed?.version !== 2 || !parsed.records || !Array.isArray(parsed.wanted)) return initialData();
      const records = {};
      for(const v of stamps) {
        const r = parsed.records[v.id];
        if(r && validDay(r.firstAt) && Array.isArray(r.visits)) {
          const visits=[...new Set(r.visits.filter(validDay))];if(!visits.length)visits.push(r.firstAt);
          const method=['ticket','qr','nfc','legacy'].includes(r.method)?r.method:'qr';
          const events=Array.isArray(r.events)?r.events.filter(e=>e&&validDay(e.date)&&visits.includes(e.date)).map(e=>({date:e.date,method:['ticket','qr','nfc','legacy'].includes(e.method)?e.method:method,claimedAt:validDay(e.claimedAt)?e.claimedAt:r.firstAt})):visits.map(day=>({date:day,method,claimedAt:r.firstAt}));
          records[v.id]={firstAt:r.firstAt,visits,method,events,note:typeof r.note==='string'?r.note.slice(0,120):'',photo:typeof r.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(r.photo)?r.photo:''};
        }
      }
      const tickets={};
      for(const [id,t] of Object.entries(parsed.tickets||{}))if(/^(demo|ticket)-[a-z0-9-]{1,100}$/.test(id)&&t&&venues.some(v=>v.id===t.venueId)&&validDay(t.visitedAt)&&Array.isArray(t.redeemed))tickets[id]={venueId:t.venueId,visitedAt:t.visitedAt,receivedAt:validDay(t.receivedAt)?t.receivedAt:TODAY,redeemed:[...new Set(t.redeemed.filter(s=>records[s]&&venueOf(byId(s)).id===t.venueId))]};
      return {version:2,records,wanted:parsed.wanted.filter(id => venues.some(v => v.id === id)),tickets};
    } catch { return initialData(); }
  }
  let data = readData();
  let savedExperience = null;
  const ui = {screen:'passport',selected:'museum',collection:'collected',timeline:false,city:'全部城市',category:'all',query:'',scanMode:'qr',claimBusy:false,duplicate:false,firstMode:false,includeNote:false,includePhoto:false,visitDate:null,ticketDraft:null,ticketBusy:false,ticketError:'',ticketResult:null,highlightVisit:null};
  const app = document.getElementById('app');
  const header = document.getElementById('app-header');
  const main = document.getElementById('app-main');
  const footer = document.getElementById('app-footer');
  const modalRoot = document.getElementById('modal-root');
  const screens = ['passport','discover','venue','stamp','scan','success','share','ticket','ticket-confirm','ticket-success'];
  const scrollPositions = {};
  let modalState = null;
  let lastFocused = null;
  let toastTimer;
  let claimToken = 0;
  let ticketToken = 0;
  let cardBusy = false;
  function persist() {
    if(ui.firstMode) return true;
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); return true; }
    catch { toast('本次记录已保留，浏览器暂未允许长期保存'); return false; }
  }
  const collected = () => stamps.filter(v => data.records[v.id]).sort((a,b) => data.records[b.id].firstAt.localeCompare(data.records[a.id].firstAt));
  function visitRows() {
    const rows=new Map();
    for(const stamp of collected())for(const day of data.records[stamp.id].visits){
      const venue=venueOf(stamp),key=`${venue.id}/${day}`;
      if(!rows.has(key))rows.set(key,{key,venue,day,ids:[],ticket:false});
      const row=rows.get(key);row.ids.push(stamp.id);row.ticket ||= (data.records[stamp.id].events||[]).some(e=>e.date===day&&e.method==='ticket');
    }
    return [...rows.values()].sort((a,b)=>b.day.localeCompare(a.day)||a.venue.id.localeCompare(b.venue.id));
  }
  function toast(message) {
    const node = document.getElementById('toast');
    clearTimeout(toastTimer); node.textContent = message; node.hidden = false;
    toastTimer = setTimeout(() => { node.hidden = true; },2700);
  }
  function routeFromLocation() {
    let parts = [];
    try { parts = decodeURIComponent(location.hash.replace(/^#\/?/,'')).split('/'); } catch {}
    ui.screen = screens.includes(parts[0]) ? parts[0] : 'passport';
    ui.selected = stamps.some(v => v.id === parts[1]) ? parts[1] : 'museum';
    if(ui.screen === 'share' && !data.records[ui.selected]) ui.screen = 'stamp';
    if(ui.screen === 'success' && !data.records[ui.selected]) ui.screen = 'scan';
    if(ui.screen==='ticket-confirm'&&!ui.ticketDraft)ui.screen='ticket';
    if(ui.screen==='ticket-success'&&!ui.ticketResult)ui.screen=data.records[ui.selected]?'stamp':'ticket';
  }
  function navigate(screen,id=ui.selected,replace=false) {
    if(!screens.includes(screen)) return;
    scrollPositions[`${ui.screen}/${ui.selected}`] = main.scrollTop;
    claimToken++;ticketToken++;ui.ticketBusy=false;ui.claimBusy=false;closeModal(false);
    if(!['ticket','ticket-confirm','ticket-success','scan'].includes(screen))clearTicketDraft();
    ui.screen = screen; ui.selected = ['venue','scan','ticket'].includes(screen)?venueOf(byId(id)).id:byId(id).id;
    const hash = `#/${screen}/${ui.selected}`;
    history[replace ? 'replaceState' : 'pushState']({screen,id:ui.selected},'',hash);
    render();
    main.scrollTop = scrollPositions[`${screen}/${ui.selected}`] || 0;
    main.focus({preventScroll:true});
  }
  function goBack() {
    if(ui.screen === 'share') navigate('stamp');
    else if(ui.screen==='ticket-confirm')navigate('ticket',ui.ticketDraft?.venueId||ui.selected);
    else if(ui.screen==='ticket'||ui.screen==='ticket-success')navigate('passport');
    else if(ui.screen === 'scan') navigate('venue');
    else if(ui.screen === 'success') navigate('passport');
    else navigate('passport');
  }
  function renderHeader() {
    const v = byId(ui.selected), owned = !!data.records[v.id];
    if(['passport','discover'].includes(ui.screen)) {
      header.innerHTML = `<div class="app-brand">${icon('passport','brand-icon')}旅行护照</div>${ui.screen==='discover' ? `<button class="city-button" data-action="choose-city">${icon('pin')}${safe(ui.city)}${icon('chevron')}</button>` : `<button class="ticket-home-entry" data-action="ticket-entry" data-id="museum">${icon('ticket')}票根补领</button>`}`;
    } else {
      const titles = {venue:'文化目的地',stamp:'我的纪念章',scan:'为旅程盖章',success:'这一站，已收藏',share:'旅行卡预览',ticket:'为旅程盖章','ticket-confirm':'确认参观信息','ticket-success':'这一站，补齐了'};
      header.innerHTML = `<button class="header-back" data-action="back" aria-label="返回">${icon('back')}</button><span class="header-caption">${titles[ui.screen]}</span>${ui.screen==='stamp' && owned ? `<button class="icon-button" data-action="share" aria-label="分享这枚纪念章">${icon('share')}</button>` : `<span style="width:28px" aria-hidden="true"></span>`}`;
    }
  }
  function renderFooter() {
    const v = byId(ui.selected), owned = !!data.records[v.id];
    if(['passport','discover'].includes(ui.screen)) {
      footer.innerHTML = `<nav class="bottom-nav" aria-label="主要导航"><button data-action="discover" ${ui.screen==='discover' ? 'aria-current="page" class="active"' : ''}>${icon('compass')}发现</button><button class="nav-claim" data-action="scan" data-id="museum" aria-label="现场盖章">${icon('scan')}<span>盖章</span></button><button data-action="passport" ${ui.screen==='passport' ? 'aria-current="page" class="active"' : ''}>${icon('passport')}护照</button></nav>`;
    } else if(ui.screen==='venue') {
      const wanted = data.wanted.includes(v.id);
      footer.innerHTML = `<div class="page-actions two-column"><button class="heart-button ${wanted?'saved':''}" data-action="want" aria-label="${wanted?'取消想去收藏':'收藏为想去'}" aria-pressed="${wanted}">${icon('heart')}</button><button class="button" data-action="scan">${icon('scan')}${owned?'再次到馆盖章':'到馆领取纪念章'}</button></div>`;
    } else if(ui.screen==='stamp') {
      const historic=v.period&&v.period[1]<TODAY;
      footer.innerHTML = `<div class="page-actions"><button class="button" data-action="${owned?'share':historic?'ticket-entry':'scan'}">${icon(owned?'share':historic?'ticket':'scan')}${owned?'分享这枚纪念':historic?'用票根补领这枚章':'到馆领取这枚章'}</button></div>`;
    } else if(ui.screen==='scan') {
      footer.innerHTML = `<div class="page-actions"><p class="demo-notice">交互演示 · 无需开启相机或 NFC</p><button class="button ${ui.claimBusy?'loading-dots':''}" data-action="collect" ${ui.claimBusy?'disabled':''}>${ui.claimBusy?'正在收入护照…':owned?'模拟再次到访':'模拟现场领取'}</button></div>`;
    } else if(ui.screen==='success') {
      footer.innerHTML = `<div class="page-actions success-footer"><button class="button" data-action="passport">翻开我的护照${icon('arrow')}</button><button class="button secondary" data-action="edit-memory">${icon('edit')}给这一站留一句话</button></div>`;
    } else if(ui.screen==='share') {
      footer.innerHTML = `<div class="page-actions"><button class="button" data-action="download-card">${icon('download')}保存旅行卡</button></div>`;
    } else if(ui.screen==='ticket') {
      footer.innerHTML=`<div class="page-actions"><p class="demo-notice">识别为交互演示 · 照片仅在本机预览</p><button class="button ${ui.ticketBusy?'loading-dots':''}" data-action="recognize-ticket" ${ui.ticketBusy?'disabled':''}>${ui.ticketBusy?(ui.ticketBusy==='image'?'正在准备票根…':'正在演示识别…'):ui.ticketDraft?.image?'模拟识别票根':'用示例票根体验'}${ui.ticketBusy?'':icon('arrow')}</button></div>`;
    } else if(ui.screen==='ticket-confirm') {
      const draft=ui.ticketDraft,all=ticketRewards(draft),receipt=data.tickets[draft.id],done=!!all.length&&all.every(v=>receipt?.redeemed.includes(v.id)),count=selectedTicketRewards().length;
      footer.innerHTML=`<div class="page-actions"><p class="demo-notice">${done?'同一张票根不会重复增加印章或到访次数':count?`已选 ${count} 枚纪念章 · 按参观日期归入护照`:'选择你想收藏的纪念章'}</p><button class="button ${ui.claimBusy?'loading-dots':''}" data-action="${done?'view-ticket-record':'redeem-ticket'}" ${ui.claimBusy||(!done&&!count)?'disabled':''}>${ui.claimBusy?'正在补入护照…':done?'查看已有记录':`确认领取 ${count} 枚纪念章`}${ui.claimBusy?'':icon(done?'book':'arrow')}</button></div>`;
    } else if(ui.screen==='ticket-success') {
      footer.innerHTML=`<div class="page-actions success-footer"><button class="button" data-action="ticket-passport">在时间轴里看看${icon('arrow')}</button><button class="button secondary" data-action="new-ticket">再补一张票根</button></div>`;
    }
  }
  function renderPassport() {
    const list = collected(), cities = new Set(list.map(v=>v.city)).size;
    const visits = visitRows().length;
    const hero = list[0] || venues[0];
    return `<section class="page passport-page screen-enter"><p class="eyebrow">YOUR CULTURAL JOURNEY</p><h1 class="page-title">我的旅行护照</h1><p class="subtitle">收藏每一次，与文化的相遇。</p><div class="passport-ticket"><div class="ticket-copy"><span class="ticket-kicker">TRAVEL / PASSPORT</span><p class="ticket-heading">山海之间，<br>每一站成册。</p><span class="ticket-year">EST. 2026</span></div><div class="ticket-art">${art(hero)}</div></div><div class="passport-stats" aria-label="旅行足迹"><div><strong>${String(list.length).padStart(2,'0')}</strong><span>枚纪念章</span></div><div><strong>${String(cities).padStart(2,'0')}</strong><span>座城市</span></div><div><strong>${String(visits).padStart(2,'0')}</strong><span>次到访</span></div></div><div class="collection-switch" role="group" aria-label="护照收藏分类"><button data-action="collection" data-value="collected" class="${ui.collection==='collected'?'active':''}" aria-pressed="${ui.collection==='collected'}">我的收藏<span class="count">${list.length}</span></button><button data-action="collection" data-value="wanted" class="${ui.collection==='wanted'?'active':''}" aria-pressed="${ui.collection==='wanted'}">想去<span class="count">${data.wanted.length}</span></button><button data-action="toggle-layout" class="view-switch" aria-label="${ui.timeline?'切换为章册':'切换为时间轴'}">${icon(ui.timeline?'grid':'list')}</button></div><div id="collection-content">${renderCollection()}</div><p class="foot-hint">你的足迹，正在慢慢成册。</p></section>`;
  }
  function renderCollection() {
    const wanted = ui.collection==='wanted';
    const list = wanted ? venues.filter(v=>data.wanted.includes(v.id)) : collected();
    if(!list.length) return `<div class="empty-state"><div class="empty-art">${art(venues[0])}</div><h3>${wanted?'下一站，留给你的好奇心':'你的第一枚章，会来自哪里？'}</h3><p>${wanted?'在发现页收藏想去的场馆，给下一次出发留一点期待。':'到一座喜欢的馆，带回一枚独属于这段旅程的纪念章。'}</p><button class="button" data-action="discover">${wanted?'去发现目的地':'发现我的第一站'}${icon('arrow')}</button></div>`;
    let content;
    if(ui.timeline&&!wanted){
      let year='';
      content=`<p class="timeline-explainer">按参观日期排列 · 同次到访合并展示</p><div class="timeline">${visitRows().map(row=>{
        const heading=year!==row.day.slice(0,4)?`<h3 class="timeline-year">${row.day.slice(0,4)}<span>年的文化足迹</span></h3>`:'';year=row.day.slice(0,4);
        return `${heading}<button class="timeline-item ${ui.highlightVisit===row.key?'visit-highlight':''}" data-action="stamp" data-id="${row.ids[0]}" data-visit-date="${row.day}" data-visit-key="${row.key}">${art(byId(row.ids[0]))}<span class="timeline-copy"><h3>${row.venue.name}</h3><p>${date(row.day)} · ${row.ids.length} 枚纪念章</p><span class="visit-source">${row.ticket?'票根补录':'现场到访'} · ${row.venue.city}</span></span>${icon('chevron')}</button>`;
      }).join('')}</div>`;
    }else content=ui.timeline?`<div class="timeline">${list.map(v=>`<button class="timeline-item" data-action="venue" data-id="${v.id}">${art(v)}<span class="timeline-copy"><h3>${v.name}</h3><p>${v.city} · 下一站灵感</p></span>${icon('chevron')}</button>`).join('')}</div>`:`<div class="badge-grid ${wanted?'collection-wanted':''}">${list.map(v=>`<button class="badge-card" data-action="${wanted?'venue':'stamp'}" data-id="${v.id}"><div class="badge-frame">${art(v)}</div><h3>${v.stamp}</h3><p class="badge-meta">${v.name} · ${wanted?'想去':displayVisit(firstVisit(data.records[v.id]))}</p></button>`).join('')}</div>`;
    const next = venues.find(v=>!data.records[v.id]);
    return content + (!wanted && next ? `<button class="next-stop" data-action="venue" data-id="${next.id}">${art(next)}<span class="next-copy"><small>给下一次出发一点灵感</small><strong>${next.name} · 新的纪念等你收藏</strong></span>${icon('up-right')}</button>` : '');
  }
  function renderStamp() {
    const v=byId(ui.selected), r=data.records[v.id];
    const memory=r?`${renderVisitTicket(v,r)}<section class="memory-block"><div class="memory-header"><h3>这一站的记忆</h3><button data-action="edit-memory">${icon('edit')}${r.note||r.photo?'编辑记忆':'留下一笔'}</button></div>${r.note?`<p class="memory-note">${safe(r.note)}</p>`:!r.photo?'<p class="memory-empty">一张照片，一句话。<br>把当时的心情，也一起收藏。</p>':''}${r.photo?`<img class="memory-photo" src="${safe(r.photo)}" alt="这次参观的个人照片">`:''}<p class="privacy">${icon('lock')}仅自己可见，分享时可自行选择</p></section>`:`<div class="stamp-unowned">${v.period?'这场展览已经结束，可以用当时的票根补领纪念。':`这枚纪念章，正在等你。<br>前往${v.name}，在现场收入护照。`}</div>`;
    return `<section class="page stamp-page screen-enter"><div class="stamp-intro"><span class="stamp-category">${icon('book')}${v.kind}</span><h1 class="stamp-title">${v.stamp}</h1><p class="stamp-subtitle">${v.name} · ${v.city}</p></div><div class="stamp-showcase"><button class="stamp-zoom" data-action="zoom" aria-label="放大欣赏${v.stamp}纪念章">${art(v)}</button><span class="zoom-hint">${icon('search')}点击欣赏细节</span></div><p class="stamp-description">${v.description}</p>${memory}</section>`;
  }
  function renderVisitTicket(v,r){
    const day=selectedVisit(r);
    return `<div class="visit-ticket"><div class="visit-ticket-top"><span>我的到访印记</span><span class="subtle-label">${icon('check')}已收藏</span></div><div class="visit-ticket-body"><div><p class="visit-date">${date(day)}</p><p class="visit-city">${icon('pin')}${v.city} · 参观日期</p></div><div class="visit-ticket-number"><div class="visit-number-bars" aria-hidden="true"></div>${v.serial}</div></div><dl class="visit-provenance"><div><dt>领取方式</dt><dd>${visitMethods(r,day)}</dd></div><div><dt>首次领取</dt><dd>${date(r.firstAt)}</dd></div></dl></div>${r.visits.length>1?`<div class="visit-history"><p>到访记录 · ${r.visits.length} 次</p><div>${[...r.visits].sort().reverse().map(value=>`<button data-action="select-visit" data-value="${value}" class="${value===day?'active':''}" aria-pressed="${value===day}">${date(value)}</button>`).join('')}</div></div>`:''}`;
  }
  function renderClaimModes(){
    const active=ui.screen==='ticket'?'ticket':ui.scanMode;
    return `<div class="scan-switch claim-methods" role="group" aria-label="领取方式">${[['qr','scan','现场扫码'],['nfc','nfc','碰一碰'],['ticket','ticket','票根领取']].map(([value,mark,label])=>`<button class="${active===value?'active':''}" data-action="scan-mode" data-value="${value}" aria-pressed="${active===value}">${icon(mark)}${label}</button>`).join('')}</div>`;
  }
  function renderScan() {
    const v=byId(ui.selected), nfc=ui.scanMode==='nfc';
    return `<section class="page scan-page screen-enter"><p class="eyebrow">YOU WERE HERE</p><h1 class="scan-title">把这一刻，<br>盖进护照。</h1>${renderClaimModes()}<div class="scan-area ${nfc?'nfc':''} ${ui.claimBusy?'claim-progress':''}"><div class="scan-brackets"></div>${art(v)}<span class="scan-line" aria-hidden="true"></span></div><p class="scan-help">${nfc?'将手机靠近场馆的纪念章感应点':'对准场馆内的纪念章领取码'}<small>${nfc?'实际设备兼容性将在后续验证':'请在参观结束后，到领取点操作'}</small></p><div class="scan-place">${icon('pin')}<div><strong>${v.name}</strong><p>${v.location}</p></div><button data-action="guide">位置</button></div></section>`;
  }
  function renderSuccess() {
    const v=byId(ui.selected),r=data.records[v.id];
    return `<section class="page success-page screen-enter"><div class="success-check">${icon('check')}</div><h1 class="page-title">${ui.duplicate?'熟悉的地方，<br>又添新的记忆。':'这一站，<br>值得被记住。'}</h1><p class="success-sub">${ui.duplicate?'馆章已收藏，首次领取日期依然保留。':`你的第 ${collected().length} 枚纪念章，已收入护照。`}</p><div class="success-art">${art(v)}</div><h2 class="success-place">${v.stamp}</h2><p class="success-place-sub">${v.name} · ${date(r?.firstAt||TODAY)}</p><div class="success-divider">A MEMORY TO KEEP</div><p class="success-caption">走过的地方，会成为你的故事。<br>愿下一次出发，也有所遇见。</p></section>`;
  }
  function filteredVenues() {
    const q=ui.query.trim().toLocaleLowerCase();
    return venues.filter(v=>(ui.city==='全部城市'||v.city===ui.city)&&(ui.category==='all'||v.category===ui.category)&&(!q||`${v.name}${v.stamp}${v.exhibit}${v.city}${v.type}`.toLocaleLowerCase().includes(q)));
  }
  function clearTicketDraft(){
    if(ui.ticketDraft?.image)URL.revokeObjectURL(ui.ticketDraft.image);
    ui.ticketDraft=null;ui.ticketError='';
  }
  function ticketRewards(draft){
    if(!draft||!validDay(draft.visitedAt))return [];
    return stamps.filter(v=>venueOf(v).id===draft.venueId&&(!v.period||(draft.visitedAt>=v.period[0]&&draft.visitedAt<=v.period[1])));
  }
  function selectedTicketRewards(){
    const d=ui.ticketDraft,redeemed=d?data.tickets[d.id]?.redeemed||[]:[];
    return ticketRewards(d).filter(v=>d.selected.includes(v.id)&&!redeemed.includes(v.id));
  }
  function resetTicketSelection(){
    const d=ui.ticketDraft;if(!d)return;
    d.selected=ticketRewards(d).filter(v=>!data.tickets[d.id]?.redeemed.includes(v.id)).map(v=>v.id);
  }
  function makeTicketDraft(id,image='',filename=''){
    const receipt=data.tickets[id],venueId=receipt?.venueId||venueOf(byId(ui.selected)).id;
    ui.ticketDraft={id,image,filename,venueId,visitedAt:receipt?.visitedAt||'2025-10-18',selected:[]};
    resetTicketSelection();ui.ticketError='';
  }
  function renderSampleTicket(){
    const v=venueOf(byId(ui.selected));
    return `<div class="sample-ticket" role="img" aria-label="${v.name}示例票根，参观日期2025年10月18日"><div class="sample-ticket-top"><span>VISITOR’S PASS</span><span>参观纪念</span></div><strong>${v.name}</strong><p>${v.exhibit}</p><div class="sample-ticket-date"><span>参观日期</span><b>2025.10.18</b></div><div class="sample-ticket-bottom"><span class="ticket-barcode" aria-hidden="true"></span><span>示例票根<br>仅供流程演示</span></div></div>`;
  }
  function renderTicket(){
    const d=ui.ticketDraft;
    return `<section class="page ticket-page screen-enter"><p class="eyebrow">KEEP THE PLACES YOU’VE BEEN</p><h1 class="scan-title">去过的地方，<br>慢慢补齐。</h1>${renderClaimModes()}<p class="ticket-intro">拍下纸质票根，或导入电子票截图。</p><div class="ticket-preview ${d?.image?'has-image':''}">${d?.image?`<img src="${d.image}" alt="导入的票根，仅在本机预览"><div class="ticket-image-label">${icon('photo')}已导入票根 · 等待确认</div>`:renderSampleTicket()}</div><div class="ticket-import-actions"><button data-action="ticket-camera">${icon('camera')}拍摄票根</button><button data-action="ticket-album">${icon('photo')}从相册导入</button></div><input id="ticket-camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><input id="ticket-album-input" type="file" accept="image/jpeg,image/png,image/webp" hidden><p class="ticket-reassurance">${icon('lock')}票根图片仅在本机预览，不会上传。</p><p class="ticket-demo-copy">本原型使用示例信息演示识别，你可以在下一步修改场馆和参观日期。</p><p class="ticket-error" role="alert" ${ui.ticketError?'':'hidden'}>${safe(ui.ticketError)}</p></section>`;
  }
  function renderTicketConfirm(){
    const d=ui.ticketDraft,receipt=data.tickets[d.id];
    return `<section class="page ticket-confirm-page screen-enter"><p class="eyebrow">A JOURNEY, REMEMBERED</p><h1 class="page-title">确认这一站</h1><p class="subtitle">核对场馆与日期，再把纪念收入护照。</p><div class="ticket-result-label">${icon('ticket')}示例识别结果 · 可核对调整</div>${receipt?`<div class="ticket-duplicate-note">${icon('check')}这张票根已有领取记录，参观信息已保留。</div>`:''}<div class="ticket-fields"><label for="ticket-venue">参观场馆<select id="ticket-venue" ${receipt||ui.claimBusy?'disabled':''}>${venues.map(v=>`<option value="${v.id}" ${d.venueId===v.id?'selected':''}>${v.name} · ${v.city}</option>`).join('')}</select></label><label for="ticket-date">参观日期<input id="ticket-date" type="date" min="1900-01-01" max="${TODAY}" required value="${safe(d.visitedAt)}" ${receipt||ui.claimBusy?'disabled':''}></label><p>护照时间轴将归入这一天，领取日期单独保存。</p></div><div class="ticket-reward-heading"><h2>这一站，可以收藏</h2><span id="ticket-reward-count">${ticketRewards(d).length} 枚纪念章</span></div><div id="ticket-rewards" class="ticket-rewards">${renderTicketRewards()}</div><p class="ticket-error" id="ticket-confirm-error" role="alert" ${ui.ticketError?'':'hidden'}>${safe(ui.ticketError)}</p><p class="ticket-demo-copy">票根识别和纪念章匹配均为交互演示。领取方式将记为“票根领取”。</p></section>`;
  }
  function renderTicketRewards(){
    const d=ui.ticketDraft,receipt=data.tickets[d.id],list=ticketRewards(d);
    if(!list.length)return '<p class="ticket-no-rewards">填写有效的参观日期后，即可查看可领取的纪念章。</p>';
    return list.map(v=>{const done=receipt?.redeemed.includes(v.id),owned=!!data.records[v.id];return `<label class="ticket-reward ${done?'redeemed':''}"><input type="checkbox" data-ticket-reward="${v.id}" ${done||d.selected.includes(v.id)?'checked':''} ${done||ui.claimBusy?'disabled':''}>${art(v)}<span class="ticket-reward-copy"><strong>${v.stamp}</strong><small>${v.kind}</small><span>${done?'这张票根已领取':owned?'已有此章 · 补充这次到访':'可领取，加入我的收藏'}</span></span></label>`;}).join('');
  }
  function updateTicketConfirmation(){
    const d=ui.ticketDraft;
    if(!d||ui.screen!=='ticket-confirm')return;
    ui.ticketError=validDay(d.visitedAt)?'':d.visitedAt>TODAY?'参观日期不能晚于今天。':'请填写有效的参观日期。';
    document.getElementById('ticket-rewards').innerHTML=renderTicketRewards();
    document.getElementById('ticket-reward-count').textContent=`${ticketRewards(d).length} 枚纪念章`;
    const error=document.getElementById('ticket-confirm-error');error.hidden=!ui.ticketError;error.textContent=ui.ticketError;renderFooter();
  }
  function renderTicketSuccess(){
    const result=ui.ticketResult,v=byId(result.stampIds[0]),items=result.stampIds.map(byId);
    return `<section class="page success-page ticket-success-page screen-enter"><div class="success-check">${icon('check')}</div><h1 class="page-title">补上这一站，<br>旅程更完整。</h1><p class="success-sub">${result.newCount?`${result.newCount} 枚新纪念章已收藏`:'已有纪念章保留，新的到访已补入'}${result.existingCount&&result.newCount?`，${result.existingCount} 枚已有章已补录。`:'。'}</p><div class="ticket-success-art ${items.length>1?'multiple':''}">${items.map(item=>`<button data-action="stamp" data-id="${item.id}" data-visit-date="${result.visitedAt}" aria-label="查看${item.stamp}">${art(item)}<strong>${item.stamp}</strong></button>`).join('')}</div><h2 class="success-place">${venueOf(v).name}</h2><span class="ticket-source-chip">${icon('ticket')}票根领取</span><div class="ticket-date-pair"><div><small>参观日期</small><strong>${date(result.visitedAt)}</strong></div><span>${icon('arrow')}</span><div><small>领取日期</small><strong>${date(result.receivedAt)}</strong></div></div><p class="ticket-success-note">已按参观日期补入时间轴。<br>同次到访领取多枚章，仍记为一次旅程。</p></section>`;
  }
  async function prepareTicketImage(file){
    if(!file||ui.screen!=='ticket')return;
    const token=++ticketToken;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){ui.ticketBusy=false;ui.ticketError='请选择 10 MB 以内的 JPG、PNG 或 WebP 票根图片。';render(true);return;}
    ui.ticketBusy='image';ui.ticketError='';renderFooter();let image;
    try{
      image=URL.createObjectURL(file);
      const [bytes]=await Promise.all([file.arrayBuffer(),loadImage(image)]);
      let hash=2166136261;for(const byte of new Uint8Array(bytes))hash=Math.imul(hash^byte,16777619)>>>0;
      if(token!==ticketToken||ui.screen!=='ticket'){URL.revokeObjectURL(image);return;}
      clearTicketDraft();makeTicketDraft(`ticket-${hash.toString(16)}-${file.size.toString(16)}`,image,file.name);ui.ticketBusy=false;render(true);
    }catch{if(image)URL.revokeObjectURL(image);if(token===ticketToken){ui.ticketBusy=false;ui.ticketError='这张票根图片未能读取，请换一张试试。';render(true);}}
  }
  async function recognizeTicket(){
    if(ui.ticketBusy)return;
    if(!ui.ticketDraft)makeTicketDraft(`demo-${venueOf(byId(ui.selected)).id}-2025-10-18`);
    const token=++ticketToken;ui.ticketBusy='recognize';renderFooter();
    await new Promise(resolve=>setTimeout(resolve,650));
    if(token!==ticketToken||ui.screen!=='ticket')return;
    resetTicketSelection();navigate('ticket-confirm',ui.ticketDraft.venueId);
  }
  async function redeemTicket(){
    const d=ui.ticketDraft;if(!d||ui.claimBusy)return;
    if(!validDay(d.visitedAt)){updateTicketConfirmation();return;}
    const previous=data.tickets[d.id];
    if(previous&&(previous.venueId!==d.venueId||previous.visitedAt!==d.visitedAt)){d.venueId=previous.venueId;d.visitedAt=previous.visitedAt;resetTicketSelection();render(true);return;}
    const rewards=selectedTicketRewards();if(!rewards.length)return;
    const token=++claimToken;ui.claimBusy=true;render(true);
    await new Promise(resolve=>setTimeout(resolve,650));
    if(token!==claimToken||ui.screen!=='ticket-confirm')return;
    let newCount=0;
    for(const v of rewards){
      let r=data.records[v.id];
      if(!r){newCount++;r=data.records[v.id]={firstAt:TODAY,visits:[],method:'ticket',events:[],note:'',photo:''};}
      r.events ||= r.visits.map(day=>({date:day,method:r.method||'qr',claimedAt:r.firstAt}));
      if(!r.visits.includes(d.visitedAt))r.visits.push(d.visitedAt);
      if(!r.events.some(e=>e.date===d.visitedAt&&e.method==='ticket'))r.events.push({date:d.visitedAt,method:'ticket',claimedAt:TODAY});
    }
    data.tickets[d.id]={venueId:d.venueId,visitedAt:d.visitedAt,receivedAt:previous?.receivedAt||TODAY,redeemed:[...new Set([...(previous?.redeemed||[]),...rewards.map(v=>v.id)])]};
    if(data.records[d.venueId])data.wanted=data.wanted.filter(id=>id!==d.venueId);
    ui.ticketResult={stampIds:rewards.map(v=>v.id),newCount,existingCount:rewards.length-newCount,visitedAt:d.visitedAt,receivedAt:TODAY,venueId:d.venueId};
    persist();ui.visitDate=d.visitedAt;clearTicketDraft();navigate('ticket-success',rewards[0].id);
  }
  function venueRows() {
    const list=filteredVenues();
    if(!list.length) return `<div class="empty-state"><h3>暂时没有找到这一站</h3><p>试试其他关键词，或换一个城市看看。</p><button class="button secondary" data-action="clear-filters">查看全部目的地</button></div>`;
    return list.map(v=>`<button class="venue-card" data-action="venue" data-id="${v.id}"><span class="venue-thumb">${art(v)}</span><span class="venue-copy"><h3>${v.name}</h3><p>${v.city} · ${v.exhibit}</p><span class="venue-status ${data.records[v.id]?'owned':''}">${icon(data.records[v.id]?'check':'pin')}${data.records[v.id]?'馆章已收藏':'到馆可领取纪念章'}</span></span>${icon('chevron')}</button>`).join('');
  }
  function renderDiscover() {
    return `<section class="page discover-page screen-enter"><p class="eyebrow">THE NEXT CHAPTER</p><h1 class="page-title">下一站，去看什么？</h1><div class="search-box">${icon('search')}<label class="sr-only" for="venue-search">搜索场馆或展览</label><input id="venue-search" type="search" placeholder="搜索场馆、展览或城市" value="${safe(ui.query)}" autocomplete="off"><button class="icon-button" data-action="clear-search" aria-label="清空搜索" ${ui.query?'':'hidden'}>${icon('close')}</button></div><div class="discover-hero" ${ui.query||ui.category!=='all'||ui.city==='云川'?'hidden':''}><img src="${HERO_URL}" alt="虚构博物馆的弧形建筑与雕塑庭院"><div class="hero-copy"><small>THIS MONTH / 本月灵感</small><h2>从一件器物，<br>读一座城。</h2><p>临江博物馆 · 器物与时间</p><button class="hero-open" data-action="venue" data-id="museum" aria-label="查看临江博物馆">${icon('up-right')}</button></div></div><div class="category-tabs" role="group" aria-label="场馆类别">${[['all','全部'],['museum','博物馆'],['artmuseum','美术馆'],['space','艺术空间']].map(([key,label])=>`<button class="${ui.category===key?'active':''}" data-action="category" data-value="${key}" aria-pressed="${ui.category===key}">${label}</button>`).join('')}</div><div class="row"><h2 class="section-title">值得出发的地方</h2><span id="venue-count" class="section-count">${filteredVenues().length} 个目的地</span></div><div id="venue-list" class="venue-list" aria-live="polite">${venueRows()}</div><p class="foot-hint">所有场馆及开放信息均为原型演示内容</p></section>`;
  }
  function renderVenue() {
    const v=byId(ui.selected), owned=!!data.records[v.id];
    return `<section class="page venue-page screen-enter">${v.id==='museum'?`<img class="venue-photo" src="${HERO_URL}" alt="概念博物馆建筑庭院">`:`<div class="venue-poster" data-word="${v.word}">${art(v)}</div>`}<div class="venue-inner"><p class="venue-category">${v.city} / ${v.type}</p><h1 class="venue-title">${v.name}</h1><p class="venue-intro">${v.intro}</p><button class="venue-chapter" data-action="stamp">${art(v)}<span style="flex:1"><small>这次到访，可以收藏</small><h3>${v.stamp}</h3><p>${v.kind} · ${owned?'已在你的护照里':'现场领取'}</p></span>${icon('chevron')}</button><div class="info-row">${icon('book')}<div>正在展出：${v.exhibit}<small>留一点时间，慢慢看一场展。</small></div></div><div class="info-row">${icon('clock')}<div>周二至周日 09:00–17:00<small>16:30 停止入馆 · 示例开放信息</small></div></div><div class="info-row">${icon('pin')}<div>${v.location}<small>纪念章领取点位于场馆内部</small></div><button data-action="guide">查看位置</button></div><p class="subtitle" style="font-size:10px;margin-top:14px">纪念章用于保存参观经历；入馆预约需通过场馆渠道另行完成。</p></div></section>`;
  }
  function sharePaper() {
    const v=byId(ui.selected),r=data.records[v.id];
    const visit=selectedVisit(r);
    return `<div class="share-paper"><div class="share-top"><span>CULTURAL TRAVEL PASSPORT</span><span>${visit.slice(0,4)}</span></div><h1 class="share-headline">此行，<br>有迹可循。</h1><div class="share-art">${art(v)}</div><p class="share-stamp-title">${v.stamp}</p><p class="share-venue">${v.name}</p><p class="share-date">${date(visit)} / ${v.city}</p>${ui.includeNote&&r.note?`<p class="share-note">${safe(r.note)}</p>`:''}${ui.includePhoto&&r.photo?`<img class="share-photo" src="${safe(r.photo)}" alt="主动加入旅行卡的参观照片">`:''}<div class="share-paper-footer"><strong>旅行护照</strong><span>每一站，都值得被记住。</span></div></div>`;
  }
  function renderShare() {
    const r=data.records[ui.selected];
    return `<section class="page share-page screen-enter"><div id="share-card-preview">${sharePaper()}</div><div class="share-options">${r.note?`<label><input type="checkbox" data-option="note" ${ui.includeNote?'checked':''}>带上我的感想</label>`:''}${r.photo?`<label><input type="checkbox" data-option="photo" ${ui.includePhoto?'checked':''}>带上我的照片</label>`:''}</div><p class="share-privacy">先预览，再保存。感想和照片默认不加入旅行卡。</p></section>`;
  }
  function render(keepScroll=false) {
    const pos=main.scrollTop;
    const views={passport:renderPassport,discover:renderDiscover,venue:renderVenue,stamp:renderStamp,scan:renderScan,success:renderSuccess,share:renderShare,ticket:renderTicket,'ticket-confirm':renderTicketConfirm,'ticket-success':renderTicketSuccess};
    renderHeader(); main.innerHTML=views[ui.screen](); renderFooter();
    app.dataset.screen=ui.screen;
    document.title=`${({passport:'我的护照',discover:'发现下一站',stamp:byId(ui.selected).stamp,venue:byId(ui.selected).name,scan:'现场盖章',success:'这一站，已收藏',share:'旅行卡预览',ticket:'票根领取','ticket-confirm':'确认参观信息','ticket-success':'这一站，补齐了'})[ui.screen]} · 旅行护照`;
    if(keepScroll) main.scrollTop=pos;
  }
  function updateSearch() {
    const list=document.getElementById('venue-list');
    if(!list) return;
    list.innerHTML=venueRows(); document.getElementById('venue-count').textContent=`${filteredVenues().length} 个目的地`;
    document.querySelector('[data-action="clear-search"]').hidden=!ui.query;
    const hero=document.querySelector('.discover-hero');
    if(hero) hero.hidden=!!ui.query||ui.category!=='all'||ui.city==='云川';
  }
  function openModal(kind) {
    closeModal(false); lastFocused=document.activeElement;
    const v=byId(ui.selected),r=data.records[v.id];
    let body='',label='',extra='';
    if(kind==='zoom') { label=v.stamp; extra='zoom-modal'; body=`${art(v)}<p class="modal-sub">${v.name} · ${v.kind}<br>概念章面插画</p>`; }
    if(kind==='city') { label='选择下一站的城市'; body=`<p class="modal-sub">也可以通过搜索寻找目的地。</p><div class="choice-list">${['全部城市',...new Set(venues.map(v=>v.city))].map(city=>`<button data-action="set-city" data-value="${city}" class="${ui.city===city?'active':''}">${city}${ui.city===city?icon('check'):''}</button>`).join('')}</div>`; }
    if(kind==='guide') { label='找到这枚纪念章'; body=`<p class="modal-sub">${v.name} · 示例楼层指引</p><svg class="guide-map" viewBox="0 0 340 180" role="img" aria-label="从入口经过大厅，到参观出口的纪念章台"><rect x="20" y="23" width="300" height="134" rx="8" fill="#fff" stroke="#dfe5ef"/><path d="M127 23v57h70v-57M127 157V99h70v58" stroke="#e4e9f1" fill="none"/><path d="M55 116h72V90h92v27h47" stroke="#2455e8" stroke-width="2" stroke-dasharray="5 5" fill="none"/><circle cx="55" cy="116" r="5" fill="#b9c9ed" stroke="none"/><circle cx="269" cy="117" r="11" fill="#2455e8" stroke="none"/><path d="m264 117 3 3 6-6" stroke="white" fill="none" stroke-width="2"/><text x="43" y="138">入口</text><text x="145" y="58">公共大厅</text><text x="220" y="138" class="guide-label">纪念章台</text><text x="227" y="64">参观出口</text></svg><p class="guide-description">${v.location}。<br>参观结束后，寻找“旅行护照”领取标识。</p><button class="button" data-action="close-modal">知道了</button>`; }
    if(kind==='memory') {
      if(!r) return;
      label='给这一站留一笔'; modalState={kind,draftPhoto:r.photo||'',photoBusy:false};
      body=`<p class="modal-sub">${v.name} · ${date(selectedVisit(r))}</p><label class="field-label" for="memory-input">这次参观，什么让你停下脚步？</label><textarea id="memory-input" class="memory-textarea" maxlength="120" placeholder="一句话，留住当时的心情。">${safe(r.note)}</textarea><p class="character-count"><span id="note-count">${r.note.length}</span> / 120</p><label class="photo-upload">${icon('photo')}添加一张参观照片<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="photo-draft">${r.photo?`<img class="photo-edit-preview" src="${safe(r.photo)}" alt="待保存的参观照片"><button class="remove-photo" data-action="remove-photo">移除这张照片</button>`:''}</div><p id="photo-status" class="photo-loading" hidden>正在准备照片…</p><p class="privacy">${icon('lock')}仅保存在当前浏览器，分享时由你选择</p><p id="memory-error" class="modal-error" role="alert" hidden></p><button class="button" data-action="save-memory">保存这一刻</button>`;
    }
    if(!modalState) modalState={kind};
    modalRoot.innerHTML=`<div class="modal-overlay" data-modal-backdrop><section class="modal ${extra}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><h2 id="modal-title">${label}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon('close')}</button></header>${body}</section></div>`;
    app.inert=true; document.querySelector('.design-rail').inert=true; document.body.style.overflow='hidden';
    const focus=modalRoot.querySelector(kind==='memory'?'textarea':'button');
    focus?.focus({preventScroll:true});
  }
  function closeModal(restoreFocus=true) {
    const hadModal=!!modalState; modalRoot.innerHTML=''; modalState=null; app.inert=false; document.querySelector('.design-rail').inert=false; document.body.style.overflow='';
    if(hadModal&&restoreFocus&&lastFocused?.isConnected) lastFocused.focus({preventScroll:true});
  }
  async function collectStamp() {
    if(ui.claimBusy) return;
    ui.claimBusy=true; const token=++claimToken;
    renderFooter(); document.querySelector('.scan-area')?.classList.add('claim-progress');
    await new Promise(resolve=>setTimeout(resolve,850));
    if(token!==claimToken||ui.screen!=='scan') return;
    const id=ui.selected,existing=data.records[id];
    ui.duplicate=!!existing;
    const method=ui.scanMode==='nfc'?'nfc':'qr';
    if(existing) {
      existing.events ||= existing.visits.map(day=>({date:day,method:existing.method||'qr',claimedAt:existing.firstAt}));
      if(!existing.visits.includes(TODAY))existing.visits.push(TODAY);
      if(!existing.events.some(e=>e.date===TODAY&&e.method===method))existing.events.push({date:TODAY,method,claimedAt:TODAY});
    }else data.records[id]={firstAt:TODAY,visits:[TODAY],method,events:[{date:TODAY,method,claimedAt:TODAY}],note:'',photo:''};
    ui.visitDate=TODAY;
    data.wanted=data.wanted.filter(v=>v!==id); persist();
    navigate('success',id);
  }
  async function preparePhoto(file) {
    if(!file||!modalState||modalState.kind!=='memory') return;
    const state=modalState, error=document.getElementById('memory-error');
    error.hidden=true;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024) {error.textContent='请选择 10 MB 以内的 JPG、PNG 或 WebP 照片。';error.hidden=false;return;}
    state.photoBusy=true; document.getElementById('photo-status').hidden=false;
    modalRoot.querySelector('[data-action="save-memory"]').disabled=true;
    let url;
    try {
      url=URL.createObjectURL(file); const img=await loadImage(url);
      const ratio=Math.min(1,1200/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);
      const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const photo=canvas.toDataURL('image/jpeg',.8);
      if(modalState!==state) return;
      state.draftPhoto=photo;
      document.getElementById('photo-draft').innerHTML=`<img class="photo-edit-preview" src="${photo}" alt="待保存的参观照片"><button class="remove-photo" data-action="remove-photo">移除这张照片</button>`;
    } catch { if(modalState===state){error.textContent='这张照片未能读取，请换一张试试。';error.hidden=false;} }
    finally { if(url) URL.revokeObjectURL(url); if(modalState===state){state.photoBusy=false;document.getElementById('photo-status').hidden=true;modalRoot.querySelector('[data-action="save-memory"]').disabled=false;} }
  }
  function loadImage(url) { return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('image-load'));img.src=url;}); }
  function wrapText(ctx,text,width,maxLines=4) {
    const lines=[];let line='';
    for(const ch of Array.from(text)) {
      if(ch==='\n'||ctx.measureText(line+ch).width>width){lines.push(line);line=ch==='\n'?'':ch;if(lines.length===maxLines)break;}
      else line+=ch;
    }
    if(line&&lines.length<maxLines)lines.push(line);
    if(lines.length===maxLines && lines.join('').length<text.replaceAll('\n','').length)lines[maxLines-1]=lines[maxLines-1].replace(/.$/u,'')+'…';
    return lines;
  }
  async function downloadCard() {
    if(cardBusy)return; cardBusy=true;
    const button=footer.querySelector('[data-action="download-card"]');button.disabled=true;button.innerHTML='正在生成旅行卡…';
    try {
      const v=byId(ui.selected),r=data.records[v.id],atlas=await loadImage(ATLAS_URL);
      const note=ui.includeNote?r.note:'',photo=ui.includePhoto&&r.photo?await loadImage(r.photo):null;
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1460+(note?190:0)+(photo?470:0);
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fafbfe';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.textBaseline='top';ctx.fillStyle='#7a88a1';ctx.font='22px "Segoe UI", "Microsoft YaHei", sans-serif';ctx.fillText('CULTURAL TRAVEL PASSPORT',90,76);ctx.fillText(selectedVisit(r).slice(0,4),925,76);
      ctx.fillStyle='#20242c';ctx.font='500 84px "Microsoft YaHei", sans-serif';ctx.fillText('此行，',85,166);ctx.fillText('有迹可循。',85,280);
      const tileW=atlas.naturalWidth/2,tileH=atlas.naturalHeight/2;ctx.drawImage(atlas,(v.tile%2)*tileW,Math.floor(v.tile/2)*tileH,tileW,tileH,224,430,632,632);
      ctx.textAlign='center';ctx.font='25px "Microsoft YaHei", sans-serif';ctx.fillStyle='#7f899a';ctx.fillText(v.stamp,540,1068);
      ctx.font='500 38px "Microsoft YaHei", sans-serif';ctx.fillStyle='#20242c';ctx.fillText(v.name,540,1110);
      ctx.font='25px "Microsoft YaHei", sans-serif';ctx.fillStyle='#7f899a';ctx.fillText(`${date(selectedVisit(r))} / ${v.city}`,540,1170);
      let y=1230;
      if(note){ctx.font='30px "Microsoft YaHei", sans-serif';ctx.fillStyle='#5f6b80';const lines=wrapText(ctx,note,850);for(const line of lines){ctx.fillText(line,540,y);y+=48;}y+=38;}
      if(photo){const dx=90,dy=y,dw=900,dh=405;const ratio=Math.max(dw/photo.width,dh/photo.height),sw=dw/ratio,sh=dh/ratio;ctx.drawImage(photo,(photo.width-sw)/2,(photo.height-sh)/2,sw,sh,dx,dy,dw,dh);y+=460;}
      const footerY=canvas.height-145;ctx.strokeStyle='#e0e6f1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(90,footerY);ctx.lineTo(990,footerY);ctx.stroke();
      ctx.textAlign='left';ctx.fillStyle='#2455e8';ctx.font='500 28px "Microsoft YaHei", sans-serif';ctx.fillText('旅行护照',90,footerY+43);ctx.textAlign='right';ctx.fillStyle='#8792a4';ctx.font='22px "Microsoft YaHei", sans-serif';ctx.fillText('每一站，都值得被记住。',990,footerY+47);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('export')),'image/png'));
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`旅行护照-${v.name}-${v.stamp}-${selectedVisit(r)}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('旅行卡已生成，请查看下载');
    } catch { toast('旅行卡暂未生成，请重试一次'); }
    finally {cardBusy=false;if(button.isConnected){button.disabled=false;button.innerHTML=`${icon('download')}保存旅行卡`;}}
  }
  document.addEventListener('click',event=>{
    const backdrop=event.target.closest('[data-modal-backdrop]');
    if(backdrop&&event.target===backdrop){closeModal();return;}
    const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action,id=button.dataset.id||ui.selected;
    if(['passport','discover','venue','stamp','scan'].includes(action)){if(action==='stamp')ui.visitDate=button.dataset.visitDate||null;navigate(action,id);return;}
    if(action==='back'){goBack();return;}
    if(action==='preview-home'){navigate('passport');return;}
    if(action==='preview-stamp'){navigate('stamp',collected()[0]?.id||'museum');return;}
    if(action==='preview-scan'){navigate('scan','museum');return;}
    if(action==='ticket-entry'||action==='new-ticket'||action==='preview-ticket'){clearTicketDraft();ui.ticketResult=null;navigate('ticket',action==='ticket-entry'?id:'museum');return;}
    if(action==='ticket-camera'){document.getElementById('ticket-camera-input').click();return;}
    if(action==='ticket-album'){document.getElementById('ticket-album-input').click();return;}
    if(action==='recognize-ticket'){recognizeTicket();return;}
    if(action==='redeem-ticket'){redeemTicket();return;}
    if(action==='view-ticket-record'){const d=ui.ticketDraft,t=data.tickets[d.id];ui.visitDate=t.visitedAt;navigate('stamp',t.redeemed[0]);return;}
    if(action==='ticket-passport'){
      const result=ui.ticketResult;ui.timeline=true;ui.collection='collected';ui.highlightVisit=`${result.venueId}/${result.visitedAt}`;navigate('passport',result.venueId);
      requestAnimationFrame(()=>main.querySelector(`[data-visit-key="${ui.highlightVisit}"]`)?.scrollIntoView({block:'center'}));return;
    }
    if(action==='select-visit'){if(data.records[ui.selected]?.visits.includes(button.dataset.value)){ui.visitDate=button.dataset.value;render(true);}return;}
    if(action==='toggle-first-use'){
      if(!ui.firstMode){savedExperience=clone(data);data={version:2,records:{},wanted:[],tickets:{}};ui.firstMode=true;button.childNodes[0].textContent='返回已有收藏';}
      else{data=savedExperience||readData();savedExperience=null;ui.firstMode=false;button.childNodes[0].textContent='体验首次使用';}
      ui.collection='collected';navigate('passport');return;
    }
    if(action==='collection'){ui.collection=button.dataset.value;render(true);return;}
    if(action==='toggle-layout'){ui.timeline=!ui.timeline;render(true);return;}
    if(action==='zoom'){openModal('zoom');return;}
    if(action==='guide'){openModal('guide');return;}
    if(action==='choose-city'){openModal('city');return;}
    if(action==='set-city'){ui.city=button.dataset.value;closeModal(false);render();main.scrollTop=0;return;}
    if(action==='scan-mode'){
      if(button.dataset.value==='ticket'){navigate('ticket',ui.selected);return;}
      ui.scanMode=button.dataset.value==='nfc'?'nfc':'qr';
      if(ui.screen!=='scan')navigate('scan');else render(true);return;
    }
    if(action==='collect'){collectStamp();return;}
    if(action==='share'){ui.includeNote=false;ui.includePhoto=false;navigate('share');return;}
    if(action==='edit-memory'){openModal('memory');return;}
    if(action==='close-modal'){closeModal();return;}
    if(action==='remove-photo'&&modalState?.kind==='memory'){modalState.draftPhoto='';document.getElementById('photo-draft').innerHTML='';return;}
    if(action==='save-memory'&&modalState?.kind==='memory'){
      if(modalState.photoBusy)return;
      const r=data.records[ui.selected];r.note=document.getElementById('memory-input').value.slice(0,120);r.photo=modalState.draftPhoto;const stored=persist();closeModal(false);render(true);if(stored)toast('这一刻，已好好收藏');return;
    }
    if(action==='want'){
      const wanted=data.wanted.includes(ui.selected);data.wanted=wanted?data.wanted.filter(v=>v!==ui.selected):[...data.wanted,ui.selected];persist();renderFooter();toast(wanted?'已从想去中移除':'已加入想去，留给下一次出发');return;
    }
    if(action==='category'){ui.category=button.dataset.value;render(true);return;}
    if(action==='clear-search'){ui.query='';const input=document.getElementById('venue-search');input.value='';updateSearch();input.focus();return;}
    if(action==='clear-filters'){ui.query='';ui.category='all';ui.city='全部城市';render();return;}
    if(action==='download-card'){downloadCard();return;}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='venue-search'){ui.query=event.target.value;updateSearch();}
    if(event.target.id==='memory-input')document.getElementById('note-count').textContent=event.target.value.length;
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='photo-input')preparePhoto(event.target.files[0]);
    if(['ticket-camera-input','ticket-album-input'].includes(event.target.id))prepareTicketImage(event.target.files[0]);
    if(['ticket-venue','ticket-date'].includes(event.target.id)&&ui.ticketDraft&&!ui.claimBusy){
      if(data.tickets[ui.ticketDraft.id])return;
      if(event.target.id==='ticket-venue')ui.ticketDraft.venueId=event.target.value;else ui.ticketDraft.visitedAt=event.target.value;
      resetTicketSelection();updateTicketConfirmation();
    }
    if(event.target.dataset.ticketReward&&ui.ticketDraft&&!ui.claimBusy){
      const id=event.target.dataset.ticketReward;
      if(!ticketRewards(ui.ticketDraft).some(v=>v.id===id)||data.tickets[ui.ticketDraft.id]?.redeemed.includes(id))return;
      ui.ticketDraft.selected=event.target.checked?[...new Set([...ui.ticketDraft.selected,id])]:ui.ticketDraft.selected.filter(value=>value!==id);renderFooter();
    }
    if(event.target.dataset.option){ui[event.target.dataset.option==='note'?'includeNote':'includePhoto']=event.target.checked;document.getElementById('share-card-preview').innerHTML=sharePaper();}
  });
  document.addEventListener('keydown',event=>{
    if(!modalState)return;
    if(event.key==='Escape'){event.preventDefault();closeModal();return;}
    if(event.key!=='Tab')return;
    const elements=[...modalRoot.querySelectorAll('button:not([disabled]),textarea,input:not([type="file"])')].filter(el=>el.getClientRects().length);
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  window.addEventListener('popstate',()=>{claimToken++;ticketToken++;ui.claimBusy=false;ui.ticketBusy=false;closeModal(false);routeFromLocation();if(!['ticket','ticket-confirm','ticket-success','scan'].includes(ui.screen))clearTicketDraft();render();main.scrollTop=scrollPositions[`${ui.screen}/${ui.selected}`]||0;});
  routeFromLocation();render();
})();
