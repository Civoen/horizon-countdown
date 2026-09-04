/* ==========================================================
   HORIZON — a simple place to keep track of the things
   you're going to. All data lives in localStorage on-device.
   ========================================================== */

const STORAGE_KEY = 'going_events_v1';

const TYPES = ['Concert','Festival','Sport','Gaming','Trip','Theatre','Other'];

const TYPE_ICON = {
  Concert:'🎤', Festival:'🎪', Sport:'🏟️', Gaming:'🎮', Trip:'✈️', Theatre:'🎭', Other:'📌'
};

const TRAVEL_METHODS = ['Driving','Train','Bus','Taxi / Uber','Walking','Flying','Other'];
const TRAVEL_ICON = {
  'Driving':'car','Train':'train','Bus':'bus','Taxi / Uber':'car','Walking':'walk','Flying':'plane','Other':'dot'
};

const PRESETS = {
  Concert:  { bring:['Ticket','ID','Phone','Power bank','Earplugs'], tasks:['Check travel','Check ticket'] },
  Festival: { bring:['Ticket','ID','Phone','Power bank','Tent','Sleeping bag','Waterproofs'], tasks:['Check travel','Check ticket','Pack bag'] },
  Sport:    { bring:['Ticket','ID','Phone','Team colours'], tasks:['Check travel','Check ticket'] },
  Gaming:   { bring:['Ticket','ID','Phone','Charger'], tasks:['Check travel','Check ticket'] },
  Trip:     { bring:['ID / passport','Phone','Charger','Wallet'], tasks:['Check travel','Pack bag'] },
  Theatre:  { bring:['Ticket','ID','Phone'], tasks:['Check travel','Check ticket'] },
  Other:    { bring:['Ticket','Phone'], tasks:['Check travel'] },
};

/* ---------------- storage ---------------- */
function loadEvents(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveEvents(events){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

let EVENTS = loadEvents();

const COMPACT_KEY = 'horizon_compact_v1';
function loadCompact(){ return localStorage.getItem(COMPACT_KEY) === '1'; }
function saveCompact(v){ localStorage.setItem(COMPACT_KEY, v ? '1' : '0'); }
let compactMode = loadCompact();

function knownNames(){
  const tally = {};
  EVENTS.forEach(ev => (ev.goingWith||[]).forEach(n=>{
    const key = n.trim();
    if(!key) return;
    tally[key] = (tally[key]||0) + 1;
  }));
  return Object.keys(tally).sort((a,b)=> tally[b]-tally[a] || a.localeCompare(b));
}

/* ---------------- date helpers ---------------- */
function toDateStr(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function todayStr(){ return toDateStr(new Date()); }
function parseDate(str){ // 'YYYY-MM-DD' -> local midnight Date
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function combineDateTime(dateStr, timeStr){
  const d = parseDate(dateStr);
  if(timeStr){
    const [h,mi] = timeStr.split(':').map(Number);
    d.setHours(h, mi, 0, 0);
  }
  return d;
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function formatDateLong(dateStr){
  const d = parseDate(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatDateShort(dateStr){
  const d = parseDate(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3).toUpperCase()}`;
}
function formatEventDate(ev){
  if(ev.endDate && ev.endDate !== ev.startDate){
    const s = parseDate(ev.startDate), e = parseDate(ev.endDate);
    if(s.getMonth()===e.getMonth() && s.getFullYear()===e.getFullYear()){
      return `${s.getDate()}–${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${formatDateLong(ev.startDate)} – ${formatDateLong(ev.endDate)}`;
  }
  return formatDateLong(ev.startDate);
}
function daysBetween(a,b){ // a,b Date, whole days b-a
  const MS=86400000;
  const aa=new Date(a.getFullYear(),a.getMonth(),a.getDate());
  const bb=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  return Math.round((bb-aa)/MS);
}
function daysAgoLabel(dateStr){
  const n = daysBetween(parseDate(dateStr), new Date());
  if(n<=0) return 'Today';
  if(n===1) return '1 day ago';
  if(n<30) return `${n} days ago`;
  if(n<60) return '1 month ago';
  if(n<365){ const mo=Math.floor(n/30); return `${mo} months ago`; }
  const yr=Math.floor(n/365);
  return yr===1 ? '1 year ago' : `${yr} years ago`;
}

/* Countdown: returns {kind:'days'|'word', value, word, urgent} */
function getCountdown(ev){
  const now = new Date();
  const today = todayStr();
  const end = ev.endDate || ev.startDate;

  if(today >= ev.startDate && today <= end){
    // ongoing (covers single-day "today" too)
    if(ev.startDate === end){
      const hasTime = !!ev.time;
      if(hasTime){
        const startDT = combineDateTime(ev.startDate, ev.time);
        if(now < startDT){
          const hour = startDT.getHours();
          return { kind:'word', word: hour>=17 ? 'TONIGHT' : 'TODAY', urgent:true };
        }
        return { kind:'word', word:'HAPPENING NOW', urgent:true };
      }
      return { kind:'word', word:'TODAY', urgent:true };
    }
    return { kind:'word', word:'HAPPENING NOW', urgent:true };
  }

  const days = daysBetween(new Date(now.getFullYear(),now.getMonth(),now.getDate()), parseDate(ev.startDate));
  if(days < 0) return { kind:'word', word:'PAST', urgent:false };
  if(days === 1) return { kind:'word', word:'TOMORROW', urgent:true };
  return { kind:'days', value: days, urgent: days<=7 };
}

/* ---------------- auto-archive ---------------- */
function runAutoArchive(){
  const today = todayStr();
  let changed = false;
  EVENTS.forEach(ev=>{
    if(ev.completed) return;
    if(ev.autoArchive === false) return;
    const end = ev.endDate || ev.startDate;
    const dayAfter = toDateStr(new Date(parseDate(end).getTime() + 86400000));
    if(today >= dayAfter){
      ev.completed = true;
      ev.completedAt = ev.completedAt || end;
      changed = true;
    }
  });
  if(changed) saveEvents(EVENTS);
}

/* ---------------- toast ---------------- */
let toastTimer;
function showToast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('is-show'), 2200);
}

/* ---------------- router ---------------- */
function navigate(hash){ location.hash = hash; }

function currentRoute(){
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const parts = h.split('/');
  return { name: parts[0], id: parts[1] };
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', ()=>{
  runAutoArchive();
  render();
  document.getElementById('nav').addEventListener('click', (e)=>{
    const btn = e.target.closest('.nav-btn');
    if(!btn) return;
    navigate('/' + btn.dataset.route);
  });
});

/* ---------------- render dispatch ---------------- */
function render(){
  const { name, id } = currentRoute();
  const app = document.getElementById('app');
  app.innerHTML = '';
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.classList.toggle('is-active', b.dataset.route === name || (b.dataset.route==='add' && name==='add'));
  });

  if(name === 'home') app.appendChild(renderHome());
  else if(name === 'archive') app.appendChild(renderArchive());
  else if(name === 'add') app.appendChild(renderForm(null));
  else if(name === 'edit') app.appendChild(renderForm(EVENTS.find(e=>e.id===id) || null));
  else if(name === 'event') app.appendChild(renderDetail(id));
  else app.appendChild(renderHome());

  window.scrollTo(0,0);
}

/* ============================================================
   ICONS (inline svg strings)
   ============================================================ */
const ICONS = {
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15 20a4.2 4.2 0 0 1 6.8-3.3"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  train: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="12" rx="3"/><path d="M5 12h14M9 20l-2 2M15 20l2 2M8 16v0M16 16v0"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M4 16V11l2-5h12l2 5v5"/><path d="M4 16h16M7 16v2M17 16v2"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/></svg>',
  bus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 17v2M16 17v2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg>',
  walk: '<svg viewBox="0 0 24 24"><circle cx="13" cy="4.5" r="1.6"/><path d="M9 21l2-6 2 2 3 1M9.5 12l1-4 3.5-1.5 2.5 2.5"/></svg>',
  plane: '<svg viewBox="0 0 24 24"><path d="M3 13l7-2 4-8 2 1-2 7 6 1 1.5 2-8 1-2 5-2-1 .5-4-6-2Z"/></svg>',
  dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.7l7.6-4.4M8.2 13.3l7.6 4.4"/></svg>',
  ticket: '<svg viewBox="0 0 24 24"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.7 1.7 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a1.7 1.7 0 0 0 0-3Z"/><path d="M9 7v10" stroke-dasharray="2 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  rows: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="4.5" rx="1.3"/><rect x="4" y="14.5" width="16" height="4.5" rx="1.3"/></svg>',
  squares: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.3"/><rect x="13" y="4" width="7" height="7" rx="1.3"/><rect x="4" y="13" width="7" height="7" rx="1.3"/><rect x="13" y="13" width="7" height="7" rx="1.3"/></svg>',
};
function icon(name){ return ICONS[name] || ''; }

/* ============================================================
   HOME
   ============================================================ */
function renderHome(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const upcoming = EVENTS.filter(e=>!e.completed).sort((a,b)=>{
    if(a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    const at = a.time||'99:99', bt = b.time||'99:99';
    return at < bt ? -1 : at>bt ? 1 : 0;
  });

  const head = document.createElement('div');
  head.className = 'page-head';
  head.style.alignItems = 'center';
  head.innerHTML = `
    <div class="page-sub" style="font-size:15px;font-weight:600;color:var(--text);">${upcoming.length ? `${upcoming.length} thing${upcoming.length===1?'':'s'} coming up` : 'Nothing on the horizon'}</div>
  `;
  if(upcoming.length){
    const toggle = document.createElement('button');
    toggle.className = 'icon-btn';
    toggle.setAttribute('aria-label', compactMode ? 'Switch to card view' : 'Switch to compact view');
    toggle.innerHTML = compactMode ? icon('squares') : icon('rows');
    toggle.onclick = ()=>{ compactMode = !compactMode; saveCompact(compactMode); render(); };
    head.appendChild(toggle);
  }
  wrap.appendChild(head);

  if(!upcoming.length){
    wrap.appendChild(emptyState(
      'Nothing planned yet.',
      "Add something you're looking forward to.",
      '+ Add event', ()=>navigate('/add')
    ));
    return wrap;
  }

  const list = document.createElement('div');
  list.className = 'ticket-list';
  upcoming.forEach(ev => list.appendChild(compactMode ? ticketCompactRow(ev) : ticketCard(ev)));
  wrap.appendChild(list);
  return wrap;
}

function ticketCompactRow(ev){
  const row = document.createElement('div');
  row.className = 'ticket-compact';
  row.onclick = ()=> navigate('/event/' + ev.id);
  const cd = getCountdown(ev);
  const metaParts = [formatDateShort(ev.startDate) + (ev.time?` · ${ev.time}`:'')];
  if(ev.location) metaParts.push(ev.location);

  const main = document.createElement('div');
  main.className = 'tc-main';
  main.innerHTML = `
    <div class="tc-info">
      <div class="tc-type-row">${TYPE_ICON[ev.type]||''} ${ev.type}</div>
      <div class="tc-title">${escapeHtml(ev.title)}</div>
      <div class="tc-meta">${metaParts.map(escapeHtml).join(' · ')}</div>
    </div>
  `;
  row.appendChild(main);

  const perf = document.createElement('div');
  perf.className = 'tc-perf';
  row.appendChild(perf);

  const foot = document.createElement('div');
  foot.className = 'tc-foot';
  foot.innerHTML = `
    <div class="tc-cd ${cd.urgent?'is-urgent':''}">
      ${cd.kind==='days'
        ? `<span class="tc-cd-num">${cd.value}</span><span class="tc-cd-unit">DAY${cd.value===1?'':'S'}</span>`
        : `<span class="tc-cd-word">${cd.word}</span>`}
    </div>
    ${ev.ticketPurchased ? `<span class="pill pill-success pill-sm">${icon('ticket')}</span>` : ''}
  `;
  row.appendChild(foot);
  return row;
}

function emptyState(title, sub, cta, onClick){
  const el = document.createElement('div');
  el.className = 'empty';
  el.innerHTML = `<div class="empty-title">${title}</div><p>${sub}</p>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = cta;
  btn.onclick = onClick;
  el.appendChild(btn);
  return el;
}

function ticketCard(ev){
  const card = document.createElement('div');
  card.className = 'ticket';
  card.onclick = ()=> navigate('/event/' + ev.id);

  const cd = getCountdown(ev);

  const main = document.createElement('div');
  main.className = 'ticket-main';
  main.innerHTML = `
    <div class="ticket-type">${TYPE_ICON[ev.type]||''} ${ev.type}</div>
    <div class="ticket-title">${escapeHtml(ev.title)}</div>
    <div class="ticket-meta">
      <div class="ticket-meta-row">${icon('calendar')} ${formatEventDate(ev)}${ev.time?` · ${ev.time}`:''}</div>
      ${ev.location ? `<div class="ticket-meta-row">${icon('pin')} ${escapeHtml(ev.location)}</div>` : ''}
      ${ev.goingWith && ev.goingWith.length ? `<div class="ticket-meta-row ticket-people">${icon('people')} ${ev.goingWith.map(escapeHtml).join(' · ')}</div>` : ''}
    </div>`;
  card.appendChild(main);

  const perf = document.createElement('div');
  perf.className = 'perf';
  card.appendChild(perf);

  const foot = document.createElement('div');
  foot.className = 'ticket-foot';
  foot.innerHTML = `
    <div class="countdown ${cd.urgent?'is-urgent':''}">
      ${cd.kind==='days'
        ? `<span class="countdown-num">${cd.value}</span><span class="countdown-unit">DAY${cd.value===1?'':'S'}</span>`
        : `<span class="countdown-word">${cd.word}</span>`}
    </div>
    ${ev.ticketPurchased ? `<span class="pill pill-success">${icon('ticket')} Purchased</span>` : ''}
  `;
  card.appendChild(foot);
  return card;
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   ARCHIVE
   ============================================================ */
let archiveFilter = 'All';
function renderArchive(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = `<div><div class="wordmark">ARCHIVE</div><div class="page-sub">What you've been to</div></div>`;
  wrap.appendChild(head);

  const all = EVENTS.filter(e=>e.completed).sort((a,b)=>{
    const at=a.completedAt||a.endDate||a.startDate, bt=b.completedAt||b.endDate||b.startDate;
    return at>bt?-1:1;
  });

  if(!all.length){
    wrap.appendChild(emptyState('No memories here yet.', "Events you've completed will appear here.", '+ Add event', ()=>navigate('/add')));
    return wrap;
  }

  const filters = ['All', ...TYPES.filter(t=>all.some(e=>e.type===t))];
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filters.forEach(f=>{
    const chip = document.createElement('button');
    chip.className = 'chip' + (archiveFilter===f ? ' is-selected':'');
    chip.textContent = f;
    chip.onclick = ()=>{ archiveFilter = f; render(); };
    filterRow.appendChild(chip);
  });
  wrap.appendChild(filterRow);

  const shown = archiveFilter==='All' ? all : all.filter(e=>e.type===archiveFilter);
  const list = document.createElement('div');
  shown.forEach(ev=>{
    const row = document.createElement('div');
    row.className = 'archive-row';
    row.onclick = ()=>navigate('/event/'+ev.id);
    row.innerHTML = `
      <div>
        <div class="archive-title">${escapeHtml(ev.title)}</div>
        <div class="archive-sub">${formatEventDate(ev)}${ev.location? ' · '+escapeHtml(ev.location):''}</div>
      </div>
      <div class="archive-ago">${daysAgoLabel(ev.completedAt || ev.endDate || ev.startDate)}</div>
    `;
    list.appendChild(row);
  });
  wrap.appendChild(list);
  return wrap;
}

/* ============================================================
   ADD / EDIT FORM
   ============================================================ */
function blankEvent(){
  return {
    id: uid(), title:'', type:'Concert', startDate: todayStr(), endDate: null, time:'',
    location:'', goingWith:[], ticketPurchased:false,
    travelTo:{method:'', details:''}, travelHome:{method:'', details:''},
    bringItems:[], prepTasks:[],
    autoArchive:true, completed:false, completedAt:null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function renderForm(existing, liveDraft, liveMultiDay, livePresetsTouched, liveIsEdit){
  const isEdit = liveDraft ? liveIsEdit : !!existing;
  const draft = liveDraft || (existing ? JSON.parse(JSON.stringify(existing)) : blankEvent());
  let multiDay = liveDraft ? liveMultiDay : !!(draft.endDate && draft.endDate !== draft.startDate);
  let presetsTouched = liveDraft ? livePresetsTouched : isEdit; // don't auto-apply presets when editing

  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const backRow = document.createElement('div');
  backRow.className = 'back-row';
  backRow.innerHTML = `<button class="back-btn">${icon('chevronLeft')}</button><div class="back-title">${isEdit?'Edit event':'Add event'}</div>`;
  backRow.querySelector('.back-btn').onclick = ()=> isEdit ? navigate('/event/'+draft.id) : navigate('/home');
  wrap.appendChild(backRow);

  const form = document.createElement('div');
  wrap.appendChild(form);

  // -- Event name
  form.appendChild(field('Event name', ()=>{
    const i = document.createElement('input');
    i.className='input'; i.placeholder='Bring Me The Horizon'; i.value=draft.title;
    i.oninput = ()=> draft.title = i.value;
    return i;
  }));

  // -- Type
  form.appendChild(field('Event type', ()=>{
    const g = document.createElement('div'); g.className='chip-group';
    TYPES.forEach(t=>{
      const c = document.createElement('button');
      c.type='button';
      c.className = 'chip' + (draft.type===t ? ' is-selected':'');
      c.textContent = `${TYPE_ICON[t]} ${t}`;
      c.onclick = ()=>{
        draft.type = t;
        if(!presetsTouched){
          const p = PRESETS[t];
          draft.bringItems = p.bring.map(text=>({id:uid(), text, completed:false}));
          draft.prepTasks = p.tasks.map(text=>({id:uid(), text, completed:false}));
        }
        renderInto();
      };
      g.appendChild(c);
    });
    return g;
  }));

  // -- Date(s)
  form.appendChild(field('Date', ()=>{
    const box = document.createElement('div');
    const row = document.createElement('div'); row.className='row-2';
    const start = document.createElement('input');
    start.type='date'; start.className='input'; start.value=draft.startDate;
    start.onchange = ()=>{ draft.startDate = start.value; if(!multiDay) draft.endDate=null; };
    row.appendChild(start);
    if(multiDay){
      const end = document.createElement('input');
      end.type='date'; end.className='input'; end.value = draft.endDate || draft.startDate;
      end.onchange = ()=> draft.endDate = end.value;
      row.appendChild(end);
    }
    box.appendChild(row);

    const md = document.createElement('button');
    md.type = 'button';
    md.className = 'multiday-toggle' + (multiDay ? ' is-on' : '');
    md.innerHTML = `<span class="md-box">${icon('check')}</span> Multi-day event`;
    md.onclick = ()=>{ multiDay = !multiDay; if(!multiDay) draft.endDate=null; else draft.endDate = draft.endDate || draft.startDate; renderInto(); };
    box.appendChild(md);
    return box;
  }));

  // -- Time
  form.appendChild(field('Time (optional)', ()=>{
    const i = document.createElement('input');
    i.type='time'; i.className='input'; i.value = draft.time || '';
    i.oninput = ()=> draft.time = i.value;
    return i;
  }));

  // -- Location
  form.appendChild(field('Location', ()=>{
    const i = document.createElement('input');
    i.className='input'; i.placeholder='Utilita Arena, Newcastle'; i.value = draft.location;
    i.oninput = ()=> draft.location = i.value;
    return i;
  }));

  // -- Going with
  form.appendChild(field('Going with', ()=>{
    const box = document.createElement('div');
    const row = document.createElement('div'); row.className='add-item-row';
    const i = document.createElement('input'); i.className='input'; i.placeholder='Add a name and press enter';
    const addBtn = document.createElement('button'); addBtn.className='btn btn-ghost btn-sm'; addBtn.textContent='Add';
    const addName = (val)=>{
      const v = (val!==undefined ? val : i.value).trim();
      if(!v) return;
      draft.goingWith.push(v); i.value='';
      renderInto();
    };
    i.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addName(); } };
    addBtn.onclick = ()=> addName();
    row.appendChild(i); row.appendChild(addBtn);
    box.appendChild(row);

    const already = draft.goingWith.map(n=>n.toLowerCase());
    const suggestions = knownNames().filter(n => !already.includes(n.toLowerCase())).slice(0, 8);
    if(suggestions.length){
      const label = document.createElement('div'); label.className='suggest-label'; label.textContent = 'Suggestions';
      box.appendChild(label);
      const sRow = document.createElement('div'); sRow.className='suggest-row';
      suggestions.forEach(name=>{
        const c = document.createElement('button'); c.type='button'; c.className='suggest-chip';
        c.innerHTML = `${icon('plus')} ${escapeHtml(name)}`;
        c.onclick = ()=> addName(name);
        sRow.appendChild(c);
      });
      box.appendChild(sRow);
    }

    if(draft.goingWith.length){
      const tags = document.createElement('div'); tags.className='name-tags';
      draft.goingWith.forEach((name, idx)=>{
        const t = document.createElement('span'); t.className='name-tag';
        t.innerHTML = `${escapeHtml(name)} <button type="button">${icon('x')}</button>`;
        t.querySelector('button').onclick = ()=>{ draft.goingWith.splice(idx,1); renderInto(); };
        tags.appendChild(t);
      });
      box.appendChild(tags);
    }
    return box;
  }));

  // -- Ticket toggle
  form.appendChild(toggleRow('Ticket purchased', 'Mark whether you already have it', draft.ticketPurchased, (v)=> draft.ticketPurchased = v));

  // -- Preparation: travel
  const prepTitle = document.createElement('div'); prepTitle.className='section-title'; prepTitle.textContent='Preparation';
  form.appendChild(prepTitle);
  const prepHint = document.createElement('div'); prepHint.className='section-hint'; prepHint.textContent="What do you need to sort out before you go?";
  form.appendChild(prepHint);

  form.appendChild(travelField('Getting there', draft.travelTo, (m,d)=>{ draft.travelTo.method=m; draft.travelTo.details=d; }));
  form.appendChild(travelField('Getting home', draft.travelHome, (m,d)=>{ draft.travelHome.method=m; draft.travelHome.details=d; }));

  // -- Things to bring
  form.appendChild(checklistField('Things to bring', draft.bringItems, ()=>{ presetsTouched = true; }));
  // -- Before you go
  form.appendChild(checklistField('Before you go', draft.prepTasks, ()=>{ presetsTouched = true; }));

  // -- Auto archive
  form.appendChild(toggleRow('Automatically archive after event', 'Moves to Archive the day after it ends', draft.autoArchive, (v)=> draft.autoArchive = v));

  // -- Save
  const saveBtn = document.createElement('button');
  saveBtn.className='btn btn-primary btn-block';
  saveBtn.style.marginTop='10px';
  saveBtn.textContent = isEdit ? 'Save changes' : 'Add event';
  saveBtn.onclick = ()=>{
    if(!draft.title.trim()){ showToast('Give it a name first'); return; }
    if(multiDay && !draft.endDate) draft.endDate = draft.startDate;
    if(!multiDay) draft.endDate = null;
    draft.updatedAt = new Date().toISOString();
    if(isEdit){
      const idx = EVENTS.findIndex(e=>e.id===draft.id);
      EVENTS[idx] = draft;
    } else {
      EVENTS.push(draft);
    }
    saveEvents(EVENTS);
    showToast(isEdit ? 'Changes saved' : 'Added to your list');
    navigate('/event/' + draft.id);
  };
  form.appendChild(saveBtn);

  function renderInto(){
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(renderForm(null, draft, multiDay, presetsTouched, isEdit));
  }

  return wrap;
}

function field(label, buildInput){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label');
  l.className = 'field-label'; l.textContent = label;
  wrap.appendChild(l);
  wrap.appendChild(buildInput());
  return wrap;
}

function toggleRow(title, sub, value, onChange){
  const row = document.createElement('div');
  row.className = 'toggle-row';
  row.innerHTML = `
    <div class="toggle-row-text"><div class="toggle-row-title">${title}</div><div class="toggle-row-sub">${sub}</div></div>
    <div class="switch ${value?'is-on':''}"></div>
  `;
  const sw = row.querySelector('.switch');
  let v = value;
  sw.onclick = ()=>{ v = !v; sw.classList.toggle('is-on', v); onChange(v); };
  return row;
}

function travelField(label, obj, onChange){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label'); l.className='field-label'; l.textContent = label;
  wrap.appendChild(l);

  const g = document.createElement('div'); g.className='chip-group'; g.style.marginBottom='10px';
  TRAVEL_METHODS.forEach(m=>{
    const c = document.createElement('button'); c.type='button';
    c.className = 'chip' + (obj.method===m ? ' is-selected':'');
    c.textContent = m;
    c.onclick = ()=>{
      obj.method = m;
      g.querySelectorAll('.chip').forEach(x=>x.classList.remove('is-selected'));
      c.classList.add('is-selected');
      onChange(obj.method, obj.details);
    };
    g.appendChild(c);
  });
  wrap.appendChild(g);

  const i = document.createElement('input');
  i.className='input'; i.placeholder='Add details — train time, parking, notes…';
  i.value = obj.details || '';
  i.oninput = ()=>{ obj.details = i.value; onChange(obj.method, obj.details); };
  wrap.appendChild(i);
  return wrap;
}

function checklistField(label, items, onTouched){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label'); l.className='field-label'; l.textContent = label;
  wrap.appendChild(l);

  const list = document.createElement('div'); list.className='checklist';
  function renderList(){
    list.innerHTML = '';
    items.forEach((it, idx)=>{
      const row = document.createElement('div');
      row.className = 'check-item';
      row.innerHTML = `<div class="checkbox">${icon('check')}</div><div class="check-label">${escapeHtml(it.text)}</div><button type="button" class="check-remove">${icon('x')}</button>`;
      row.querySelector('.check-remove').onclick = (e)=>{ e.stopPropagation(); items.splice(idx,1); onTouched(); renderList(); };
      list.appendChild(row);
    });
  }
  renderList();
  wrap.appendChild(list);

  const addRow = document.createElement('div'); addRow.className='add-item-row';
  const i = document.createElement('input'); i.className='input'; i.placeholder='+ Add item';
  const add = ()=>{
    const v = i.value.trim(); if(!v) return;
    items.push({id:uid(), text:v, completed:false});
    onTouched(); i.value=''; renderList();
  };
  i.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); add(); } };
  const btn = document.createElement('button'); btn.className='btn btn-ghost btn-sm'; btn.textContent='Add'; btn.onclick = add;
  addRow.appendChild(i); addRow.appendChild(btn);
  wrap.appendChild(addRow);

  return wrap;
}

/* ============================================================
   DETAIL
   ============================================================ */
function renderDetail(id){
  const ev = EVENTS.find(e=>e.id===id);
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  if(!ev){
    wrap.innerHTML = `<div class="empty"><div class="empty-title">Not found</div><p>This event may have been deleted.</p></div>`;
    return wrap;
  }

  // -- Icon action row (back / edit / complete / delete) --
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  actions.innerHTML = `
    <button class="icon-btn" id="backBtn">${icon('chevronLeft')}</button>
    <div class="detail-actions-right">
      <button class="icon-btn icon-btn-sm" id="editBtn" aria-label="Edit">${icon('edit')}</button>
      <button class="icon-btn icon-btn-sm ${ev.completed?'':'icon-btn-accent'}" id="completeBtn" aria-label="${ev.completed?'Move back to upcoming':'Mark as completed'}">${icon('check')}</button>
      <button class="icon-btn icon-btn-sm icon-btn-danger" id="deleteBtn" aria-label="Delete">${icon('trash')}</button>
    </div>
  `;
  actions.querySelector('#backBtn').onclick = ()=> navigate(ev.completed ? '/archive' : '/home');
  actions.querySelector('#editBtn').onclick = ()=> navigate('/edit/'+ev.id);
  actions.querySelector('#completeBtn').onclick = ()=>{
    if(ev.completed){
      ev.completed = false; ev.completedAt = null;
      saveEvents(EVENTS); showToast('Moved to Upcoming'); navigate('/home');
    } else {
      ev.completed = true; ev.completedAt = todayStr();
      saveEvents(EVENTS); showToast('Moved to Archive'); navigate('/archive');
    }
  };
  actions.querySelector('#deleteBtn').onclick = ()=> confirmSheet(
    'Delete this event?',
    'This can\u2019t be undone. All preparation details will be lost.',
    'Delete', ()=>{
      EVENTS = EVENTS.filter(e=>e.id!==ev.id);
      saveEvents(EVENTS);
      showToast('Event deleted');
      navigate('/home');
    }
  );
  wrap.appendChild(actions);

  // -- Hero: title/meta on the left, countdown pill on the right --
  const hero = document.createElement('div'); hero.className='detail-hero';
  const heroLeft = document.createElement('div');
  heroLeft.innerHTML = `
    <div class="detail-type">${TYPE_ICON[ev.type]||''} ${ev.type}</div>
    <div class="detail-title">${escapeHtml(ev.title)}</div>
    <div class="detail-meta">
      <div class="detail-meta-row">${icon('calendar')} ${formatEventDate(ev)}${ev.time?` · ${ev.time}`:''}</div>
      ${ev.location?`<div class="detail-meta-row">${icon('pin')} ${escapeHtml(ev.location)}</div>`:''}
    </div>
  `;
  hero.appendChild(heroLeft);

  const cdPill = document.createElement('div');
  if(!ev.completed){
    const cd = getCountdown(ev);
    cdPill.className = 'countdown-pill' + (cd.urgent ? ' is-urgent':'');
    cdPill.innerHTML = cd.kind==='days'
      ? `<span class="cp-num">${cd.value}</span><span class="cp-unit">DAY${cd.value===1?'':'S'}</span>`
      : `<span class="cp-word">${cd.word}</span>`;
  } else {
    cdPill.className = 'countdown-pill';
    cdPill.innerHTML = `<span class="cp-word" style="font-size:13px;color:var(--text-muted);">${daysAgoLabel(ev.completedAt||ev.endDate||ev.startDate)}</span>`;
  }
  hero.appendChild(cdPill);
  wrap.appendChild(hero);

  if(ev.goingWith && ev.goingWith.length){
    const tl = document.createElement('div'); tl.className='tag-list'; tl.style.marginBottom='4px';
    ev.goingWith.forEach(n=>{ const t=document.createElement('span'); t.className='tag'; t.textContent=n; tl.appendChild(t); });
    wrap.appendChild(tl);
  }

  // -- Ticket + Preparation combined into one compact card --
  const infoCard = document.createElement('div'); infoCard.className='detail-card'; infoCard.style.marginTop='12px';

  const ticketLine = document.createElement('div');
  ticketLine.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 0;';
  ticketLine.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;">${icon('ticket')} <span>${ev.ticketPurchased?'Ticket purchased':'Not purchased yet'}</span></div>`;
  const tSwitch = document.createElement('div'); tSwitch.className = 'switch' + (ev.ticketPurchased?' is-on':'');
  tSwitch.onclick = (e)=>{
    e.stopPropagation();
    ev.ticketPurchased = !ev.ticketPurchased;
    tSwitch.classList.toggle('is-on', ev.ticketPurchased);
    ticketLine.querySelector('span').textContent = ev.ticketPurchased ? 'Ticket purchased' : 'Not purchased yet';
    saveEvents(EVENTS);
  };
  ticketLine.appendChild(tSwitch);
  infoCard.appendChild(ticketLine);

  if(ev.travelTo && ev.travelTo.method){
    infoCard.appendChild(prepLine('There', ev.travelTo));
  }
  if(ev.travelHome && ev.travelHome.method){
    infoCard.appendChild(prepLine('Home', ev.travelHome));
  }
  wrap.appendChild(infoCard);

  // -- Bring / Tasks as compact wrapping chip checklists --
  if(ev.bringItems && ev.bringItems.length){
    const sec = document.createElement('div'); sec.className='detail-section';
    sec.innerHTML = `<div class="section-label">Things to bring</div>`;
    sec.appendChild(chipChecklist(ev.bringItems));
    wrap.appendChild(sec);
  }

  if(ev.prepTasks && ev.prepTasks.length){
    const sec = document.createElement('div'); sec.className='detail-section';
    sec.innerHTML = `<div class="section-label">Before you go</div>`;
    sec.appendChild(chipChecklist(ev.prepTasks));
    wrap.appendChild(sec);
  }

  // -- Share (icon-only, one row) --
  const shareRow = document.createElement('div'); shareRow.className='share-row'; shareRow.style.marginTop='14px';
  const shareEventBtn = document.createElement('button'); shareEventBtn.className='share-icon-btn';
  shareEventBtn.innerHTML = `${icon('share')} Share event`;
  shareEventBtn.onclick = ()=> shareEvent(ev, false);
  const sharePrepBtn = document.createElement('button'); sharePrepBtn.className='share-icon-btn';
  sharePrepBtn.innerHTML = `${icon('share')} Share prep`;
  sharePrepBtn.onclick = ()=> shareEvent(ev, true);
  shareRow.appendChild(shareEventBtn); shareRow.appendChild(sharePrepBtn);
  wrap.appendChild(shareRow);

  return wrap;
}

function prepLine(label, obj){
  const line = document.createElement('div');
  line.className = 'prep-line';
  line.innerHTML = `${icon(TRAVEL_ICON[obj.method]||'dot')} <b>${label}:</b> ${escapeHtml(obj.method)}${obj.details ? ' — '+escapeHtml(obj.details) : ''}`;
  return line;
}

function chipChecklist(items){
  const row = document.createElement('div'); row.className='chip-check-row';
  items.forEach(it=>{
    const chip = document.createElement('div');
    chip.className = 'chip-check' + (it.completed?' is-done':'');
    chip.innerHTML = `<span class="cc-box">${icon('check')}</span><span>${escapeHtml(it.text)}</span>`;
    chip.onclick = ()=>{
      it.completed = !it.completed;
      chip.classList.toggle('is-done', it.completed);
      saveEvents(EVENTS);
    };
    row.appendChild(chip);
  });
  return row;
}

/* ---------------- share ---------------- */
function shareEvent(ev, includePrep){
  let text = `${ev.title.toUpperCase()}\n${formatEventDate(ev)}${ev.time?` · ${ev.time}`:''}\n`;
  if(ev.location) text += `📍 ${ev.location}\n`;
  if(ev.goingWith && ev.goingWith.length) text += `👥 ${ev.goingWith.join(' · ')}\n`;
  text += ev.ticketPurchased ? `🎟 Ticket purchased\n` : '';

  if(includePrep){
    if(ev.travelTo && ev.travelTo.method){
      text += `\nGetting there: ${ev.travelTo.method}${ev.travelTo.details ? ' — '+ev.travelTo.details : ''}`;
    }
    if(ev.travelHome && ev.travelHome.method){
      text += `\nGetting home: ${ev.travelHome.method}${ev.travelHome.details ? ' — '+ev.travelHome.details : ''}`;
    }
    if(ev.bringItems && ev.bringItems.length){
      text += `\n\nThings to bring:\n` + ev.bringItems.map(i=>`${i.completed?'✓':'○'} ${i.text}`).join('\n');
    }
    if(ev.prepTasks && ev.prepTasks.length){
      text += `\n\nBefore you go:\n` + ev.prepTasks.map(i=>`${i.completed?'✓':'○'} ${i.text}`).join('\n');
    }
  }

  if(navigator.share){
    navigator.share({ title: ev.title, text }).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(()=> showToast('Copied to clipboard'));
  } else {
    showToast('Sharing isn\u2019t supported on this browser');
  }
}

/* ---------------- confirm sheet ---------------- */
function confirmSheet(title, body, actionLabel, onConfirm){
  const overlay = document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">${title}</div>
      <div class="sheet-body">${body}</div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
        <button class="btn btn-danger" id="okBtn">${actionLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=> overlay.classList.add('is-open'));
  const close = ()=>{ overlay.classList.remove('is-open'); setTimeout(()=>overlay.remove(), 200); };
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay.querySelector('#cancelBtn').onclick = close;
  overlay.querySelector('#okBtn').onclick = ()=>{ close(); onConfirm(); };
}
