/* ==========================================================
   HORIZON: a simple place to keep track of the things
   you're going to. All data lives in localStorage on-device.
   ========================================================== */

const STORAGE_KEY = 'going_events_v1';

const TYPES = ['Concert','Festival','Sport','Gaming','Trip','Theatre','Other'];

const TYPE_ICON = {
  Concert:'🎤', Festival:'🎪', Sport:'🏟️', Gaming:'🎮', Trip:'✈️', Theatre:'🎭', Other:'📌'
};

const TRAVEL_METHODS = ['Driving','Train','Bus','Other'];
const TRAVEL_ICON = {
  'Driving':'car','Train':'train','Bus':'bus','Other':'dot'
};

const PRESETS = {
  Concert:  { tasks:['Check travel','Check ticket'] },
  Festival: { tasks:['Check travel','Check ticket','Pack bag'] },
  Sport:    { tasks:['Check travel','Check ticket'] },
  Gaming:   { tasks:['Check travel','Check ticket'] },
  Trip:     { tasks:['Check travel','Pack bag'] },
  Theatre:  { tasks:['Check travel','Check ticket'] },
  Other:    { tasks:['Check travel'] },
};

/* ---------------- storage ---------------- */
function loadEvents(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    let migrated = false;
    events.forEach(ev=>{
      if(!ev.travel && (ev.travelTo || ev.travelHome)){
        const to = ev.travelTo || {method:'',details:''};
        const home = ev.travelHome || {method:'',details:''};
        const method = to.method || home.method || '';
        const details = [to.details, home.details].filter(Boolean).join(' · ');
        ev.travel = { method, details };
        delete ev.travelTo;
        delete ev.travelHome;
        migrated = true;
      } else if(!ev.travel){
        ev.travel = { method:'', details:'' };
      }
      if(Array.isArray(ev.goingWith) && ev.goingWith.length && typeof ev.goingWith[0] === 'string'){
        ev.goingWith = ev.goingWith.map(name => ({ id: uid(), name, coming: true }));
        migrated = true;
      }
    });
    if(migrated) saveEvents(events);
    return events;
  }catch(e){ return []; }
}
function saveEvents(events){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

let EVENTS = loadEvents();

/* ---------------- accent theme ---------------- */
const ACCENT_THEMES = [
  { id:'violet', name:'Violet', hex:'#7C5CFF' },
  { id:'sky',    name:'Sky',    hex:'#4FA8FF' },
  { id:'teal',   name:'Teal',   hex:'#2DD4BF' },
  { id:'pink',   name:'Pink',   hex:'#FF5FA8' },
  { id:'amber',  name:'Amber',  hex:'#FBBF24' },
];
const ACCENT_KEY = 'horizon_accent_v1';

function hexToRgb(hex){
  const h = hex.replace('#','');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function applyAccentTheme(hex){
  const { r, g, b } = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-soft', `rgba(${r},${g},${b},0.16)`);
  root.setProperty('--accent-border', `rgba(${r},${g},${b},0.3)`);
  root.setProperty('--accent-glow', `rgba(${r},${g},${b},0.45)`);
}
function loadAccentTheme(){ return localStorage.getItem(ACCENT_KEY) || ACCENT_THEMES[0].hex; }
function saveAccentTheme(hex){ localStorage.setItem(ACCENT_KEY, hex); applyAccentTheme(hex); }
applyAccentTheme(loadAccentTheme()); // apply immediately on load, before first render, to avoid a flash of the default color

/* ---------------- light / dark mode ---------------- */
const THEME_MODE_KEY = 'horizon_theme_mode_v1'; // 'system' | 'light' | 'dark'
function loadThemeMode(){ return localStorage.getItem(THEME_MODE_KEY) || 'system'; }
function resolvedTheme(mode){
  if(mode === 'system'){
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  return mode;
}
function applyThemeMode(mode){
  const resolved = resolvedTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector && document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', resolved === 'light' ? '#FAFAF8' : '#0B0C10');
}
function saveThemeMode(mode){ localStorage.setItem(THEME_MODE_KEY, mode); applyThemeMode(mode); }
applyThemeMode(loadThemeMode());
if(window.matchMedia){
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', ()=>{
    if(loadThemeMode() === 'system') applyThemeMode('system');
  });
}

/* ---------------- 12h / 24h time display ---------------- */
const TIME_FORMAT_KEY = 'horizon_time_format_v1'; // '24h' | '12h'
function loadTimeFormat(){ return localStorage.getItem(TIME_FORMAT_KEY) || '24h'; }
function saveTimeFormat(v){ localStorage.setItem(TIME_FORMAT_KEY, v); }
function formatTimeDisplay(t){
  if(!t) return '';
  if(loadTimeFormat() === '24h') return t;
  let [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if(h === 0) h = 12;
  return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}

/* ---------------- new-event defaults ---------------- */
const DEFAULT_AUTOARCHIVE_KEY = 'horizon_default_autoarchive_v1';
function loadDefaultAutoArchive(){ return localStorage.getItem(DEFAULT_AUTOARCHIVE_KEY) !== '0'; } // default true
function saveDefaultAutoArchive(v){ localStorage.setItem(DEFAULT_AUTOARCHIVE_KEY, v ? '1' : '0'); }

const DEFAULT_TYPE_KEY = 'horizon_default_type_v1';
function loadDefaultType(){ return localStorage.getItem(DEFAULT_TYPE_KEY) || 'Concert'; }
function saveDefaultType(v){ localStorage.setItem(DEFAULT_TYPE_KEY, v); }

/* ---------------- haptics ---------------- */
const HAPTICS_KEY = 'horizon_haptics_v1';
function loadHapticsEnabled(){ return localStorage.getItem(HAPTICS_KEY) !== '0'; } // default on
function saveHapticsEnabled(v){ localStorage.setItem(HAPTICS_KEY, v ? '1' : '0'); }

/* ---------------- archive filter memory ---------------- */
const ARCHIVE_FILTER_KEY = 'horizon_archive_filter_v1';
function loadArchiveFilter(){ return localStorage.getItem(ARCHIVE_FILTER_KEY) || 'All'; }
function saveArchiveFilter(v){ localStorage.setItem(ARCHIVE_FILTER_KEY, v); }

const COMPACT_KEY = 'horizon_compact_v1';
function loadCompact(){ return localStorage.getItem(COMPACT_KEY) === '1'; }
function saveCompact(v){ localStorage.setItem(COMPACT_KEY, v ? '1' : '0'); }
let compactMode = loadCompact();

// Suggestions only draw on people from events within roughly the last six
// months (or upcoming). Someone you haven't gone anywhere with in a while
// quietly fades out on its own, no manual management needed.
function knownNames(){
  const cutoff = toDateStr(new Date(Date.now() - 182*86400000));
  const tally = {};
  EVENTS.forEach(ev=>{
    if(ev.startDate < cutoff) return;
    (ev.goingWith||[]).forEach(p=>{
      const key = (p.name||'').trim();
      if(!key) return;
      tally[key] = (tally[key]||0) + 1;
    });
  });
  return Object.keys(tally).sort((a,b)=> tally[b]-tally[a] || a.localeCompare(b));
}

// Same six-month-decay suggestion logic, for "Before you go" task text.
function knownTasks(){
  const cutoff = toDateStr(new Date(Date.now() - 182*86400000));
  const tally = {};
  EVENTS.forEach(ev=>{
    if(ev.startDate < cutoff) return;
    (ev.prepTasks||[]).forEach(t=>{
      const key = (t.text||'').trim();
      if(!key) return;
      tally[key] = (tally[key]||0) + 1;
    });
  });
  return Object.keys(tally).sort((a,b)=> tally[b]-tally[a] || a.localeCompare(b));
}

// Locations from your own past events, scoped to the currently selected
// event type where possible, so typing "Manchester" while adding a
// Concert only surfaces places you've previously used for concerts (not
// e.g. a five-a-side pitch tagged as Sport). Same six-month decay as the
// other suggestion lists. This is deliberately not a real-world venue
// lookup: the original brief explicitly ruled out an external maps/places
// API, and a real "type a city, get real venues" autocomplete can't work
// without calling one.
function knownLocations(type){
  const cutoff = toDateStr(new Date(Date.now() - 182*86400000));
  const tally = {};
  EVENTS.forEach(ev=>{
    if(ev.startDate < cutoff) return;
    if(type && ev.type !== type) return;
    const key = (ev.location||'').trim();
    if(!key) return;
    tally[key] = (tally[key]||0) + 1;
  });
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
function showToast(msg, opts){
  const el = document.getElementById('toast');
  el.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = msg;
  el.appendChild(text);
  if(opts && opts.actionLabel){
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = opts.actionLabel;
    btn.onclick = ()=>{ opts.onAction && opts.onAction(); el.classList.remove('is-show'); };
    el.appendChild(btn);
  }
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('is-show'), (opts && opts.duration) || 4000);
}

// Short tactile tick for checklist toggles etc. iOS Safari has never
// implemented the Vibration API (even for home-screen PWAs), so this is a
// silent no-op there today, kept as progressive enhancement for Android,
// and ready to swap for real haptics (@capacitor/haptics) if this ever
// gets wrapped natively.
function haptic(ms){
  if(!loadHapticsEnabled()) return;
  if(navigator.vibrate){ try{ navigator.vibrate(ms || 10); }catch(e){} }
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
  render();
  requestPersistentStorage();
  document.getElementById('nav').addEventListener('click', (e)=>{
    const btn = e.target.closest('.nav-btn');
    if(!btn) return;
    navigate('/' + btn.dataset.route);
  });
});

// Ask the browser not to evict this site's storage under disk pressure.
// Doesn't guarantee anything, but meaningfully lowers the odds Safari
// clears localStorage on its own.
function requestPersistentStorage(){
  if(navigator.storage && navigator.storage.persist){
    navigator.storage.persist().catch(()=>{});
  }
}


function renderSettings(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const sectionTitle = (t)=>{
    const el = document.createElement('div'); el.className='section-title'; el.textContent=t;
    return el;
  };

  // Builds a row of mutually-exclusive chips that update their own
  // selected state in place on click, rather than forcing the whole
  // Settings page to rebuild (which would replay its entrance animation
  // on every tap).
  const chipToggleRow = (options, getValue, onPick)=>{
    const row = document.createElement('div'); row.className='chip-group'; row.setAttribute('role', 'radiogroup');
    const chips = options.map(opt=>{
      const c = document.createElement('button'); c.type='button';
      c.className = 'chip' + (getValue()===opt.v ? ' is-selected' : '');
      c.textContent = opt.label;
      c.setAttribute('role', 'radio');
      c.setAttribute('aria-checked', getValue()===opt.v ? 'true' : 'false');
      row.appendChild(c);
      return c;
    });
    options.forEach((opt, i)=>{
      chips[i].onclick = ()=>{
        onPick(opt.v);
        chips.forEach((c,j)=>{
          const isNowSelected = options[j].v===getValue();
          c.classList.toggle('is-selected', isNowSelected);
          c.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
        });
      };
    });
    return row;
  };

  const backRow = document.createElement('div');
  backRow.className = 'back-row';
  backRow.innerHTML = `<button class="back-btn">${icon('chevronLeft')}</button><div class="back-title">Settings</div>`;
  backRow.querySelector('.back-btn').onclick = ()=> navigate('/home');
  wrap.appendChild(backRow);

  // -- Home view --
  wrap.appendChild(sectionTitle('Home view'));
  const viewCard = document.createElement('div'); viewCard.className='detail-card';
  viewCard.appendChild(chipToggleRow(
    [{ v:false, label:'Full' }, { v:true, label:'Compact' }],
    ()=> compactMode,
    (v)=>{ compactMode = v; saveCompact(v); }
  ));
  const viewHint = document.createElement('p');
  viewHint.style.cssText = 'font-size:12.5px;color:var(--text-faint);margin:12px 0 0;';
  viewHint.textContent = 'Compact drops date and location from Home cards so titles read bigger.';
  viewCard.appendChild(viewHint);
  wrap.appendChild(viewCard);

  // -- Theme --
  wrap.appendChild(sectionTitle('Theme'));
  const themeCard = document.createElement('div'); themeCard.className='detail-card';
  themeCard.appendChild(chipToggleRow(
    [{ v:'system', label:'Dark' }, { v:'light', label:'Light' }],
    ()=> loadThemeMode(),
    (v)=> saveThemeMode(v)
  ));
  wrap.appendChild(themeCard);

  // -- Accent color --
  wrap.appendChild(sectionTitle('Accent color'));
  const colorCard = document.createElement('div'); colorCard.className='detail-card';
  const swatchRow = document.createElement('div');
  swatchRow.style.cssText = 'display:flex;gap:12px;';
  const swatchEls = [];
  const refreshSwatches = ()=>{
    const current = loadAccentTheme().toLowerCase();
    ACCENT_THEMES.forEach((theme, i)=>{
      const isSelected = theme.hex.toLowerCase() === current;
      const sw = swatchEls[i];
      sw.style.border = `2.5px solid ${isSelected ? 'var(--surface)' : 'transparent'}`;
      sw.style.boxShadow = `0 0 0 2px ${isSelected ? theme.hex : 'transparent'}`;
      sw.innerHTML = isSelected ? `<span class="swatch-check">${icon('check')}</span>` : '';
    });
  };
  ACCENT_THEMES.forEach(theme=>{
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.setAttribute('aria-label', theme.name);
    sw.style.cssText = `
      width:40px; height:40px; border-radius:50%; background:${theme.hex}; cursor:pointer;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    `;
    sw.onclick = ()=>{ saveAccentTheme(theme.hex); refreshSwatches(); };
    swatchEls.push(sw);
    swatchRow.appendChild(sw);
  });
  refreshSwatches();
  colorCard.appendChild(swatchRow);
  wrap.appendChild(colorCard);

  // -- Time format --
  wrap.appendChild(sectionTitle('Time format'));
  const timeCard = document.createElement('div'); timeCard.className='detail-card';
  timeCard.appendChild(chipToggleRow(
    [{ v:'24h', label:'24-hour' }, { v:'12h', label:'12-hour' }],
    ()=> loadTimeFormat(),
    (v)=> saveTimeFormat(v)
  ));
  wrap.appendChild(timeCard);

  // -- New event defaults --
  wrap.appendChild(sectionTitle('New event defaults'));
  const defaultsCard = document.createElement('div'); defaultsCard.className='detail-card';

  const typeLabel = document.createElement('div');
  typeLabel.style.cssText = 'font-size:12.5px;font-weight:700;color:var(--text-muted);letter-spacing:.02em;margin-bottom:8px;';
  typeLabel.textContent = 'Default event type';
  defaultsCard.appendChild(typeLabel);
  const typeRow = chipToggleRow(
    TYPES.map(t=>({ v:t, label:`${TYPE_ICON[t]||''} ${t}` })),
    ()=> loadDefaultType(),
    (v)=> saveDefaultType(v)
  );
  typeRow.style.cssText = 'margin-bottom:16px;';
  defaultsCard.appendChild(typeRow);

  const archiveRow = document.createElement('div');
  archiveRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--border);';
  const archiveText = document.createElement('div');
  archiveText.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
  archiveText.innerHTML = `
    <div style="font-size:14px;font-weight:600;">Auto-archive by default</div>
    <div style="font-size:12px;color:var(--text-faint);">Applies to new events, editable per event</div>
  `;
  archiveRow.appendChild(archiveText);
  const archiveSwitch = document.createElement('div');
  archiveSwitch.className = 'switch' + (loadDefaultAutoArchive() ? ' is-on' : '');
  archiveSwitch.setAttribute('role', 'switch');
  archiveSwitch.setAttribute('aria-checked', loadDefaultAutoArchive() ? 'true' : 'false');
  archiveSwitch.setAttribute('aria-label', 'Auto-archive by default');
  archiveSwitch.tabIndex = 0;
  const toggleArchiveSwitch = ()=>{
    const v = !loadDefaultAutoArchive();
    saveDefaultAutoArchive(v);
    archiveSwitch.classList.toggle('is-on', v);
    archiveSwitch.setAttribute('aria-checked', v ? 'true' : 'false');
  };
  archiveSwitch.onclick = toggleArchiveSwitch;
  archiveSwitch.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); toggleArchiveSwitch(); } };
  archiveRow.appendChild(archiveSwitch);
  defaultsCard.appendChild(archiveRow);
  wrap.appendChild(defaultsCard);

  // -- Haptics --
  wrap.appendChild(sectionTitle('Haptics'));
  const hapticsCard = document.createElement('div'); hapticsCard.className='detail-card';
  const hapticsRow = document.createElement('div');
  hapticsRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  const hapticsText = document.createElement('div');
  hapticsText.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
  hapticsText.innerHTML = `
    <div style="font-size:14px;font-weight:600;">Tap feedback</div>
    <div style="font-size:12px;color:var(--text-faint);">Not yet supported by iOS Safari, ready for when this is a native app</div>
  `;
  hapticsRow.appendChild(hapticsText);
  const hapticsSwitch = document.createElement('div');
  hapticsSwitch.className = 'switch' + (loadHapticsEnabled() ? ' is-on' : '');
  hapticsSwitch.setAttribute('role', 'switch');
  hapticsSwitch.setAttribute('aria-checked', loadHapticsEnabled() ? 'true' : 'false');
  hapticsSwitch.setAttribute('aria-label', 'Tap feedback');
  hapticsSwitch.tabIndex = 0;
  const toggleHapticsSwitch = ()=>{
    const v = !loadHapticsEnabled();
    saveHapticsEnabled(v);
    hapticsSwitch.classList.toggle('is-on', v);
    hapticsSwitch.setAttribute('aria-checked', v ? 'true' : 'false');
  };
  hapticsSwitch.onclick = toggleHapticsSwitch;
  hapticsSwitch.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); toggleHapticsSwitch(); } };
  hapticsRow.appendChild(hapticsSwitch);
  hapticsCard.appendChild(hapticsRow);
  wrap.appendChild(hapticsCard);

  // -- About --
  wrap.appendChild(sectionTitle('About'));
  const aboutCard = document.createElement('div'); aboutCard.className='detail-card';
  aboutCard.innerHTML = `
    <p style="font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;">
      Horizon is a simple place to keep track of the things you're going
      to: concerts, festivals, trips, and more. No accounts, no social
      features, just what you're going to, when, and what you need to
      bring. Everything stays on this device.
    </p>
  `;
  wrap.appendChild(aboutCard);

  // -- Changelog --
  wrap.appendChild(sectionTitle('Changelog'));
  const changelogCard = document.createElement('div'); changelogCard.className='detail-card';
  const CHANGELOG = [
    { label: 'Latest', bullets: [
      'Accessibility pass: keyboard support, screen reader labels, focus handling',
      'Duplicate an event from its detail page instead of re-entering it',
      'Light/dark and accent color changes now cross-fade smoothly',
    ]},
    { label: 'Calendar & locations', bullets: [
      'Custom calendar picker and location suggestions from your own history',
      'Default event type, haptics toggle, and App Store icon variants ready',
      'Settings reorganized: Time format and About/Changelog split out',
    ]},
    { label: 'Settings & theming', bullets: [
      'Dedicated Settings page, light/dark theme, five accent colors',
      'Time format, auto-archive, and compact view moved into real settings',
      'Removed manual backup/export in favor of a future iCloud plan',
    ]},
    { label: 'Refinements', bullets: [
      'Going with and Before you go rebuilt as add/remove suggestion lists',
      'Fixed the service worker so updates land automatically',
      'Removed swipe gestures in favor of simpler taps',
    ]},
    { label: 'V1 launch', bullets: [
      'Home, Archive, Add/Edit, countdown states, multi-day events',
      'Ticket status, travel notes, and preparation checklists',
      'Share event, and installable as a home screen app',
    ]},
  ];
  CHANGELOG.forEach((entry, idx)=>{
    const block = document.createElement('div'); block.className='changelog-entry';
    const label = document.createElement('div'); label.className='changelog-label'; label.textContent = entry.label;
    block.appendChild(label);
    const list = document.createElement('ul'); list.className='changelog-list';
    entry.bullets.forEach(b=>{
      const li = document.createElement('li'); li.textContent = b;
      list.appendChild(li);
    });
    block.appendChild(list);
    changelogCard.appendChild(block);
  });
  wrap.appendChild(changelogCard);

  // -- Danger zone --
  const activeCount = EVENTS.filter(e=>!e._trashed).length;
  if(activeCount > 0){
    wrap.appendChild(sectionTitle('Data'));
    const dz = document.createElement('div'); dz.className='danger-zone'; dz.style.marginTop = '0';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-danger btn-block';
    clearBtn.textContent = 'Clear all events';
    clearBtn.onclick = ()=> confirmSheet(
      'Clear all events?',
      `This permanently deletes all ${activeCount} event${activeCount===1?'':'s'}, both upcoming and archived. This can\u2019t be undone.`,
      'Delete everything',
      ()=>{
        EVENTS = [];
        saveEvents(EVENTS);
        showToast('All events cleared');
        navigate('/home');
      }
    );
    dz.appendChild(clearBtn);
    wrap.appendChild(dz);
  }

  return wrap;
}

/* ---------------- render dispatch ---------------- */
function render(){
  runAutoArchive();
  const { name, id } = currentRoute();
  const app = document.getElementById('app');
  app.innerHTML = '';
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const isActive = b.dataset.route === name || (b.dataset.route==='add' && name==='add');
    b.classList.toggle('is-active', isActive);
    if(isActive) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });

  if(name === 'home') app.appendChild(renderHome());
  else if(name === 'archive') app.appendChild(renderArchive());
  else if(name === 'add') app.appendChild(renderForm(null));
  else if(name === 'edit') app.appendChild(renderForm(EVENTS.find(e=>e.id===id) || null));
  else if(name === 'duplicate'){
    const original = EVENTS.find(e=>e.id===id);
    if(original){
      const dup = buildDuplicateDraft(original);
      app.appendChild(renderForm(null, dup, !!dup.endDate, true, false));
    } else {
      app.appendChild(renderHome());
    }
  }
  else if(name === 'event') app.appendChild(renderDetail(id));
  else if(name === 'settings') app.appendChild(renderSettings());
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
  chevronRight: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.7l7.6-4.4M8.2 13.3l7.6 4.4"/></svg>',
  ticket: '<svg viewBox="0 0 24 24"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.7 1.7 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a1.7 1.7 0 0 0 0-3Z"/><path d="M9 7v10" stroke-dasharray="2 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 15.5A1.5 1.5 0 0 1 3.5 14V5.5A1.5 1.5 0 0 1 5 4h8.5A1.5 1.5 0 0 1 15 5.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  rows: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="4.5" rx="1.3"/><rect x="4" y="14.5" width="16" height="4.5" rx="1.3"/></svg>',
  squares: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.3"/><rect x="13" y="4" width="7" height="7" rx="1.3"/><rect x="4" y="13" width="7" height="7" rx="1.3"/><rect x="13" y="13" width="7" height="7" rx="1.3"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" stroke-linecap="round"/><circle cx="9" cy="6" r="2.2"/><line x1="4" y1="12" x2="20" y2="12" stroke-linecap="round"/><circle cx="15" cy="12" r="2.2"/><line x1="4" y1="18" x2="20" y2="18" stroke-linecap="round"/><circle cx="11" cy="18" r="2.2"/></svg>',
};
function icon(name){ return ICONS[name] || ''; }

/* ============================================================
   HOME
   ============================================================ */
function renderHome(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const upcoming = EVENTS.filter(e=>!e.completed && !e._trashed).sort((a,b)=>{
    if(a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    const at = a.time||'99:99', bt = b.time||'99:99';
    return at < bt ? -1 : at>bt ? 1 : 0;
  });

  const head = document.createElement('div');
  head.className = 'page-head';
  head.style.alignItems = 'center';
  head.innerHTML = `
    <div class="page-sub" style="font-size:15px;font-weight:600;color:var(--text);">${upcoming.length ? `${upcoming.length} event${upcoming.length===1?'':'s'} coming up` : 'Nothing on the horizon'}</div>
  `;
  const headBtns = document.createElement('div');
  headBtns.style.cssText = 'display:flex;gap:8px;';
  if(upcoming.length){
    const toggle = document.createElement('button');
    toggle.className = 'icon-btn';
    toggle.setAttribute('aria-label', compactMode ? 'Switch to card view' : 'Switch to compact view');
    toggle.innerHTML = compactMode ? icon('squares') : icon('rows');
    toggle.onclick = ()=>{ compactMode = !compactMode; saveCompact(compactMode); render(); };
    headBtns.appendChild(toggle);
  }
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'icon-btn';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.innerHTML = icon('sliders');
  settingsBtn.onclick = ()=> navigate('/settings');
  headBtns.appendChild(settingsBtn);
  head.appendChild(headBtns);
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

function softDeleteEvent(ev, afterNavigate){
  ev._trashed = true;
  render();
  if(afterNavigate) navigate(afterNavigate);
  const timeoutId = setTimeout(()=>{
    if(ev._trashed){ EVENTS = EVENTS.filter(e=>e.id!==ev.id); saveEvents(EVENTS); }
  }, 5000);
  showToast('Event deleted', { actionLabel:'Undo', duration:5000, onAction:()=>{
    clearTimeout(timeoutId);
    delete ev._trashed;
    saveEvents(EVENTS);
    render();
  }});
}

function ticketCompactRow(ev){
  const row = document.createElement('div');
  row.className = 'ticket-compact';
  row.onclick = ()=> navigate('/event/' + ev.id);
  const cd = getCountdown(ev);

  const main = document.createElement('div');
  main.className = 'tc-main';
  main.innerHTML = `
    <div class="tc-info">
      <div class="tc-type-row">${TYPE_ICON[ev.type]||''} ${ev.type}</div>
      <div class="tc-title">${escapeHtml(ev.title)}</div>
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
      <div class="ticket-meta-row">${icon('calendar')} ${formatEventDate(ev)}${ev.time?` · ${formatTimeDisplay(ev.time)}`:''}</div>
      ${ev.location ? `<div class="ticket-meta-row">${icon('pin')} ${escapeHtml(ev.location)}</div>` : ''}
      ${ev.goingWith && ev.goingWith.filter(p=>p.coming!==false).length ? `<div class="ticket-meta-row ticket-people">${icon('people')} ${ev.goingWith.filter(p=>p.coming!==false).map(p=>escapeHtml(p.name)).join(' · ')}</div>` : ''}
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
let archiveFilter = loadArchiveFilter();
function renderArchive(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = `<div><div class="wordmark">ARCHIVE</div><div class="page-sub">What you've been to</div></div>`;
  wrap.appendChild(head);

  const all = EVENTS.filter(e=>e.completed && !e._trashed).sort((a,b)=>{
    const at=a.completedAt||a.endDate||a.startDate, bt=b.completedAt||b.endDate||b.startDate;
    return at>bt?-1:1;
  });

  if(!all.length){
    wrap.appendChild(emptyState('No memories here yet.', "Events you've completed will appear here.", '+ Add event', ()=>navigate('/add')));
    return wrap;
  }

  const filters = ['All', ...TYPES.filter(t=>all.some(e=>e.type===t))];
  if(!filters.includes(archiveFilter)){ archiveFilter = 'All'; saveArchiveFilter('All'); }
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filters.forEach(f=>{
    const chip = document.createElement('button');
    chip.className = 'chip' + (archiveFilter===f ? ' is-selected':'');
    chip.textContent = f;
    chip.onclick = ()=>{ archiveFilter = f; saveArchiveFilter(f); render(); };
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
    id: uid(), title:'', type: loadDefaultType(), startDate: todayStr(), endDate: null, time:'',
    location:'', goingWith:[], ticketPurchased:false,
    travel:{method:'', details:''},
    prepTasks:[],
    autoArchive: loadDefaultAutoArchive(), completed:false, completedAt:null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

// Clones an existing event as the starting point for a brand-new one:
// same title, type, location, people, ticket status, travel, and
// preparation checklist, but a new id and reset completion state.
// Doesn't touch the original, and doesn't save until the person confirms
// on the Add screen (so the date can be adjusted first).
function buildDuplicateDraft(ev){
  const clone = JSON.parse(JSON.stringify(ev));
  clone.id = uid();
  clone.goingWith = clone.goingWith.map(p => ({ ...p, id: uid() }));
  clone.prepTasks = clone.prepTasks.map(t => ({ ...t, id: uid() }));
  clone.completed = false;
  clone.completedAt = null;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  delete clone._trashed;
  return clone;
}

function renderForm(existing, liveDraft, liveMultiDay, livePresetsTouched, liveIsEdit){
  const isEdit = liveDraft ? liveIsEdit : !!existing;
  const draft = liveDraft || (existing ? JSON.parse(JSON.stringify(existing)) : blankEvent());
  let multiDay = liveDraft ? liveMultiDay : !!(draft.endDate && draft.endDate !== draft.startDate);
  let presetsTouched = liveDraft ? livePresetsTouched : isEdit; // don't auto-apply presets when editing

  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const routeInfo = currentRoute();
  const isDuplicate = routeInfo.name === 'duplicate';

  const backRow = document.createElement('div');
  backRow.className = 'back-row';
  backRow.innerHTML = `<button class="back-btn">${icon('chevronLeft')}</button><div class="back-title">${isDuplicate ? 'Duplicate event' : (isEdit?'Edit event':'Add event')}</div>`;
  backRow.querySelector('.back-btn').onclick = ()=>{
    if(isEdit) navigate('/event/'+draft.id);
    else if(isDuplicate) navigate('/event/'+routeInfo.id);
    else navigate('/home');
  };
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
    const g = document.createElement('div'); g.className='chip-group'; g.setAttribute('role', 'radiogroup');
    TYPES.forEach(t=>{
      const c = document.createElement('button');
      c.type='button';
      c.className = 'chip' + (draft.type===t ? ' is-selected':'');
      c.textContent = `${TYPE_ICON[t]} ${t}`;
      c.setAttribute('role', 'radio');
      c.setAttribute('aria-checked', draft.type===t ? 'true' : 'false');
      c.onclick = ()=>{
        draft.type = t;
        if(!presetsTouched){
          const p = PRESETS[t];
          draft.prepTasks = p.tasks.map(text=>({id:uid(), text}));
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

    const row = document.createElement('div'); row.className='date-row';
    const start = document.createElement('button');
    start.type = 'button'; start.className = 'input date-display';
    start.textContent = formatDateLong(draft.startDate);
    start.onclick = ()=> openDatePicker(draft.startDate, (val)=>{
      draft.startDate = val;
      if(!multiDay) draft.endDate = null;
      renderInto();
    });
    row.appendChild(start);

    const md = document.createElement('button');
    md.type = 'button';
    md.className = 'multiday-toggle' + (multiDay ? ' is-on' : '');
    md.innerHTML = `<span class="md-box">${icon('check')}</span> Multi-day`;
    md.setAttribute('role', 'checkbox');
    md.setAttribute('aria-checked', multiDay ? 'true' : 'false');
    md.onclick = ()=>{ haptic(10); multiDay = !multiDay; if(!multiDay) draft.endDate=null; else draft.endDate = draft.endDate || draft.startDate; renderInto(); };
    row.appendChild(md);
    box.appendChild(row);

    if(multiDay){
      const end = document.createElement('button');
      end.type = 'button'; end.className = 'input date-display date-row-end';
      end.textContent = formatDateLong(draft.endDate || draft.startDate);
      end.onclick = ()=> openDatePicker(draft.endDate || draft.startDate, (val)=>{
        draft.endDate = val;
        renderInto();
      });
      box.appendChild(end);
    }
    return box;
  }));

  // -- Time
  form.appendChild(field('Time', ()=>{
    const i = document.createElement('input');
    i.type='text'; i.inputMode='numeric'; i.className='input'; i.placeholder='19:30'; i.maxLength=5;
    i.value = draft.time || '';
    i.oninput = ()=>{
      let v = i.value.replace(/[^\d]/g,'').slice(0,4);
      if(v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2);
      i.value = v;
      draft.time = v.length===5 ? v : '';
    };
    i.onblur = ()=>{
      const m = i.value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if(i.value && !m){ i.value=''; draft.time=''; showToast('Enter time as HH:MM'); return; }
      if(m){ i.value = m[1].padStart(2,'0') + ':' + m[2]; draft.time = i.value; }
    };
    return i;
  }));

  // -- Location
  form.appendChild(field('Location', ()=>{
    const box = document.createElement('div');
    const i = document.createElement('input');
    i.className='input'; i.placeholder='Utilita Arena, Newcastle'; i.value = draft.location;

    const sugRow = document.createElement('div');
    sugRow.className = 'suggest-row';
    sugRow.style.cssText = 'margin-top:8px; display:none;';

    const refreshSuggestions = ()=>{
      const typed = i.value.trim().toLowerCase();
      sugRow.innerHTML = '';
      if(!typed){ sugRow.style.display = 'none'; return; }
      const matches = knownLocations(draft.type)
        .filter(loc => loc.toLowerCase().includes(typed) && loc.toLowerCase() !== typed)
        .slice(0, 3);
      if(!matches.length){ sugRow.style.display = 'none'; return; }
      sugRow.style.display = 'flex';
      matches.forEach(loc=>{
        const c = document.createElement('button'); c.type='button'; c.className='suggest-chip';
        c.innerHTML = `${icon('pin')} ${escapeHtml(loc)}`;
        c.onclick = ()=>{ i.value = loc; draft.location = loc; sugRow.style.display = 'none'; };
        sugRow.appendChild(c);
      });
    };
    i.oninput = ()=>{ draft.location = i.value; refreshSuggestions(); };

    box.appendChild(i);
    box.appendChild(sugRow);
    return box;
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
      draft.goingWith.push({ id: uid(), name: v, coming: true }); i.value='';
      renderInto();
    };
    i.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addName(); } };
    addBtn.onclick = ()=> addName();
    row.appendChild(i); row.appendChild(addBtn);
    box.appendChild(row);

    if(draft.goingWith.length){
      const tags = document.createElement('div'); tags.className='name-tags';
      draft.goingWith.forEach((person, idx)=>{
        const t = document.createElement('span'); t.className='name-tag';
        t.innerHTML = `${escapeHtml(person.name)}<span class="name-tag-x">×</span>`;
        t.setAttribute('role', 'button');
        t.setAttribute('tabindex', '0');
        t.setAttribute('aria-label', `Remove ${escapeHtml(person.name)} from Going with`);
        const removeName = ()=>{ draft.goingWith.splice(idx,1); renderInto(); };
        t.onclick = removeName;
        t.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); removeName(); } };
        tags.appendChild(t);
      });
      box.appendChild(tags);
    }

    const already = draft.goingWith.map(p=>p.name.toLowerCase());
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

    return box;
  }));

  // -- Ticket toggle
  form.appendChild(toggleRow('Ticket purchased', 'Mark whether you already have it', draft.ticketPurchased, (v)=> draft.ticketPurchased = v));

  // -- Preparation: travel
  const prepTitle = document.createElement('div'); prepTitle.className='section-title'; prepTitle.textContent='Preparation';
  form.appendChild(prepTitle);
  const prepHint = document.createElement('div'); prepHint.className='section-hint'; prepHint.textContent="What do you need to sort out before you go?";
  form.appendChild(prepHint);

  form.appendChild(travelField('Travel', draft.travel, (m,d)=>{ draft.travel.method=m; draft.travel.details=d; }));

  // -- Before you go
  form.appendChild(tagListField('Before you go', draft.prepTasks, '+ Add a task', knownTasks, ()=>{ presetsTouched = true; renderInto(); }));

  // -- Auto archive
  form.appendChild(toggleRow('Automatically archive after event', 'Moves to Archive the day after it ends', draft.autoArchive, (v)=> draft.autoArchive = v));

  // -- Save
  const saveBtn = document.createElement('button');
  saveBtn.className='btn btn-primary btn-block';
  saveBtn.style.marginTop='10px';
  saveBtn.textContent = isEdit ? 'Save changes' : (isDuplicate ? 'Save duplicate' : 'Add event');
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
    <div class="switch ${value?'is-on':''}" role="switch" aria-checked="${value?'true':'false'}" aria-label="${escapeHtml(title)}" tabindex="0"></div>
  `;
  const sw = row.querySelector('.switch');
  let v = value;
  const toggle = ()=>{ v = !v; sw.classList.toggle('is-on', v); sw.setAttribute('aria-checked', v?'true':'false'); onChange(v); };
  sw.onclick = toggle;
  sw.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); toggle(); } };
  return row;
}

function travelField(label, obj, onChange){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label'); l.className='field-label'; l.textContent = label;
  wrap.appendChild(l);

  const g = document.createElement('div'); g.className='chip-group'; g.style.marginBottom='10px'; g.setAttribute('role', 'radiogroup');
  TRAVEL_METHODS.forEach(m=>{
    const c = document.createElement('button'); c.type='button';
    c.className = 'chip' + (obj.method===m ? ' is-selected':'');
    c.textContent = m;
    c.setAttribute('role', 'radio');
    c.setAttribute('aria-checked', obj.method===m ? 'true' : 'false');
    c.onclick = ()=>{
      obj.method = m;
      g.querySelectorAll('.chip').forEach(x=>{ x.classList.remove('is-selected'); x.setAttribute('aria-checked','false'); });
      c.classList.add('is-selected');
      c.setAttribute('aria-checked', 'true');
      onChange(obj.method, obj.details);
    };
    g.appendChild(c);
  });
  wrap.appendChild(g);

  const i = document.createElement('input');
  i.className='input'; i.placeholder='Add details: train time, parking, notes…';
  i.value = obj.details || '';
  i.oninput = ()=>{ obj.details = i.value; onChange(obj.method, obj.details); };
  wrap.appendChild(i);
  return wrap;
}

// Same add/remove/suggest pattern as "Going with": type or press enter to
// add, tap a tag to remove it, and previously-used values from the last
// six months show up as tap-to-add suggestions.
function tagListField(label, items, placeholder, knownValuesFn, onChange){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label'); l.className='field-label'; l.textContent = label;
  wrap.appendChild(l);

  const row = document.createElement('div'); row.className='add-item-row';
  const i = document.createElement('input'); i.className='input'; i.placeholder = placeholder;
  const addBtn = document.createElement('button'); addBtn.className='btn btn-ghost btn-sm'; addBtn.textContent='Add';
  const addValue = (val)=>{
    const v = (val!==undefined ? val : i.value).trim();
    if(!v) return;
    items.push({ id: uid(), text: v });
    i.value = '';
    onChange();
  };
  i.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addValue(); } };
  addBtn.onclick = ()=> addValue();
  row.appendChild(i); row.appendChild(addBtn);
  wrap.appendChild(row);

  if(items.length){
    const tags = document.createElement('div'); tags.className='name-tags';
    items.forEach((item, idx)=>{
      const t = document.createElement('span'); t.className='name-tag';
      t.innerHTML = `${escapeHtml(item.text)}<span class="name-tag-x">×</span>`;
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-label', `Remove "${escapeHtml(item.text)}"`);
      const removeItem = ()=>{ items.splice(idx,1); onChange(); };
      t.onclick = removeItem;
      t.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); removeItem(); } };
      tags.appendChild(t);
    });
    wrap.appendChild(tags);
  }

  const already = items.map(it=>it.text.toLowerCase());
  const suggestions = knownValuesFn().filter(v => !already.includes(v.toLowerCase())).slice(0, 8);
  if(suggestions.length){
    const sLabel = document.createElement('div'); sLabel.className='suggest-label'; sLabel.textContent = 'Suggestions';
    wrap.appendChild(sLabel);
    const sRow = document.createElement('div'); sRow.className='suggest-row';
    suggestions.forEach(v=>{
      const c = document.createElement('button'); c.type='button'; c.className='suggest-chip';
      c.innerHTML = `${icon('plus')} ${escapeHtml(v)}`;
      c.onclick = ()=> addValue(v);
      sRow.appendChild(c);
    });
    wrap.appendChild(sRow);
  }

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
    <button class="icon-btn" id="backBtn" aria-label="Back">${icon('chevronLeft')}</button>
    <div class="detail-actions-right">
      <button class="icon-btn icon-btn-sm" id="duplicateBtn" aria-label="Duplicate event">${icon('duplicate')}</button>
      <button class="icon-btn icon-btn-sm" id="editBtn" aria-label="Edit">${icon('edit')}</button>
      <button class="icon-btn icon-btn-sm ${ev.completed?'':'icon-btn-accent'}" id="completeBtn" aria-label="${ev.completed?'Move back to upcoming':'Mark as completed'}">${icon('check')}</button>
      <button class="icon-btn icon-btn-sm icon-btn-danger" id="deleteBtn" aria-label="Delete">${icon('trash')}</button>
    </div>
  `;
  actions.querySelector('#backBtn').onclick = ()=> navigate(ev.completed ? '/archive' : '/home');
  actions.querySelector('#duplicateBtn').onclick = ()=> navigate('/duplicate/'+ev.id);
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
    'Delete', ()=> softDeleteEvent(ev, ev.completed ? '/archive' : '/home')
  );
  wrap.appendChild(actions);

  // -- Hero: title/meta on the left, countdown pill on the right --
  const hero = document.createElement('div'); hero.className='detail-hero';
  const heroLeft = document.createElement('div');
  heroLeft.innerHTML = `
    <div class="detail-type">${TYPE_ICON[ev.type]||''} ${ev.type}</div>
    <div class="detail-title">${escapeHtml(ev.title)}</div>
    <div class="detail-meta">
      <div class="detail-meta-row">${icon('calendar')} ${formatEventDate(ev)}${ev.time?` · ${formatTimeDisplay(ev.time)}`:''}</div>
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
    ev.goingWith.forEach(person=>{
      const t=document.createElement('span');
      t.className='tag tag-toggle' + (person.coming===false ? ' is-not-coming' : '');
      t.textContent=person.name;
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-pressed', person.coming===false ? 'false' : 'true');
      t.setAttribute('aria-label', `${person.name}, tap to toggle whether they're coming`);
      const toggleComing = ()=>{
        person.coming = person.coming===false ? true : false;
        haptic(10);
        t.classList.toggle('is-not-coming', person.coming===false);
        t.setAttribute('aria-pressed', person.coming===false ? 'false' : 'true');
        saveEvents(EVENTS);
      };
      t.onclick = toggleComing;
      t.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); toggleComing(); } };
      tl.appendChild(t);
    });
    wrap.appendChild(tl);
  }

  // -- Ticket + Preparation combined into one compact card --
  const infoCard = document.createElement('div'); infoCard.className='detail-card'; infoCard.style.marginTop='12px';

  const ticketLine = document.createElement('div');
  ticketLine.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 0;';
  ticketLine.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;">${icon('ticket')} <span>${ev.ticketPurchased?'Ticket purchased':'Not purchased yet'}</span></div>`;
  const tSwitch = document.createElement('div'); tSwitch.className = 'switch' + (ev.ticketPurchased?' is-on':'');
  tSwitch.setAttribute('role', 'switch');
  tSwitch.setAttribute('aria-checked', ev.ticketPurchased ? 'true' : 'false');
  tSwitch.setAttribute('aria-label', 'Ticket purchased');
  tSwitch.tabIndex = 0;
  const toggleTicket = (e)=>{
    e.stopPropagation();
    haptic(10);
    ev.ticketPurchased = !ev.ticketPurchased;
    tSwitch.classList.toggle('is-on', ev.ticketPurchased);
    tSwitch.setAttribute('aria-checked', ev.ticketPurchased ? 'true' : 'false');
    ticketLine.querySelector('span').textContent = ev.ticketPurchased ? 'Ticket purchased' : 'Not purchased yet';
    saveEvents(EVENTS);
  };
  tSwitch.onclick = toggleTicket;
  tSwitch.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); toggleTicket(e); } };
  ticketLine.appendChild(tSwitch);
  infoCard.appendChild(ticketLine);

  if(ev.travel && ev.travel.method){
    infoCard.appendChild(prepLine(ev.travel));
  }
  wrap.appendChild(infoCard);

  // -- Before you go: removable tags, same pattern as Going with --
  if(ev.prepTasks && ev.prepTasks.length){
    const sec = document.createElement('div'); sec.className='detail-section';
    sec.innerHTML = `<div class="section-label">Before you go</div>`;
    sec.appendChild(taskTagList(ev.prepTasks, ev));
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

function prepLine(obj){
  const line = document.createElement('div');
  line.className = 'prep-line';
  line.innerHTML = `${icon(TRAVEL_ICON[obj.method]||'dot')} <span>${escapeHtml(obj.method)}${obj.details ? ' · '+escapeHtml(obj.details) : ''}</span>`;
  return line;
}

function taskTagList(items, ev){
  const tl = document.createElement('div'); tl.className='tag-list';
  items.forEach((item, idx)=>{
    const t = document.createElement('span'); t.className='tag tag-removable';
    t.innerHTML = `${escapeHtml(item.text)}<span class="name-tag-x">×</span>`;
    t.setAttribute('role', 'button');
    t.setAttribute('tabindex', '0');
    t.setAttribute('aria-label', `Remove "${escapeHtml(item.text)}" from Before you go`);
    const removeTask = ()=>{
      haptic(10);
      ev.prepTasks.splice(idx,1);
      saveEvents(EVENTS);
      render();
    };
    t.onclick = removeTask;
    t.onkeydown = (e)=>{ if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); removeTask(); } };
    tl.appendChild(t);
  });
  return tl;
}

/* ---------------- share ---------------- */
function shareEvent(ev, includePrep){
  let text = `${ev.title.toUpperCase()}\n${formatEventDate(ev)}${ev.time?` · ${formatTimeDisplay(ev.time)}`:''}\n`;
  if(ev.location) text += `📍 ${ev.location}\n`;
  const coming = (ev.goingWith||[]).filter(p=>p.coming!==false).map(p=>p.name);
  if(coming.length) text += `👥 ${coming.join(' · ')}\n`;
  text += ev.ticketPurchased ? `🎟 Ticket purchased\n` : '';

  if(includePrep){
    if(ev.travel && ev.travel.method){
      text += `\nTravel: ${ev.travel.method}${ev.travel.details ? ' · '+ev.travel.details : ''}`;
    }
    if(ev.prepTasks && ev.prepTasks.length){
      text += `\n\nBefore you go:\n` + ev.prepTasks.map(i=>`• ${i.text}`).join('\n');
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
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'confirmSheetTitle');
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-title" id="confirmSheetTitle">${title}</div>
      <div class="sheet-body">${body}</div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
        <button class="btn btn-danger" id="okBtn">${actionLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=> overlay.classList.add('is-open'));
  let restoreFocus = ()=>{};
  const close = ()=>{
    overlay.classList.remove('is-open');
    setTimeout(()=>overlay.remove(), 200);
    restoreFocus();
  };
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ e.preventDefault(); close(); } });
  overlay.querySelector('#cancelBtn').onclick = close;
  overlay.querySelector('#okBtn').onclick = ()=>{ close(); onConfirm(); };
  restoreFocus = trapFocus(overlay, overlay.querySelector('.sheet'));
}

/* ---------------- custom calendar (replaces the native date picker) ---------------- */
// Shared modal accessibility: traps Tab within the sheet, Escape closes it,
// focus moves into the sheet on open, and returns to whatever triggered it
// on close. Returns a function to call from within your own close().
function trapFocus(overlay, sheetEl){
  const previouslyFocused = document.activeElement;
  const getFocusable = ()=> Array.from(
    sheetEl.querySelectorAll('button, [tabindex]:not([tabindex="-1"]), input, a[href]')
  ).filter(el => !el.disabled && el.offsetParent !== null);

  overlay.addEventListener('keydown', (e)=>{
    if(e.key === 'Tab'){
      const focusables = getFocusable();
      if(!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  setTimeout(()=>{
    const focusables = getFocusable();
    if(focusables.length) focusables[0].focus();
  }, 50);

  return ()=>{ if(previouslyFocused && previouslyFocused.focus) previouslyFocused.focus(); };
}

const WEEKDAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function openDatePicker(initialDateStr, onSelect){
  const overlay = document.createElement('div'); overlay.className='overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Choose a date');
  const sheet = document.createElement('div'); sheet.className='sheet date-picker-sheet';
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  requestAnimationFrame(()=> overlay.classList.add('is-open'));

  let restoreFocus = ()=>{};
  const close = ()=>{
    overlay.classList.remove('is-open');
    setTimeout(()=>overlay.remove(), 200);
    restoreFocus();
  };
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ e.preventDefault(); close(); } });

  const base = parseDate(initialDateStr || todayStr());
  let viewYear = base.getFullYear();
  let viewMonth = base.getMonth();
  const selected = initialDateStr;

  function paint(){
    sheet.innerHTML = '';

    const header = document.createElement('div'); header.className='cal-header';
    const prevBtn = document.createElement('button'); prevBtn.type='button'; prevBtn.className='cal-nav';
    prevBtn.innerHTML = icon('chevronLeft');
    prevBtn.setAttribute('aria-label', 'Previous month');
    const title = document.createElement('div'); title.className='cal-title';
    title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='cal-nav';
    nextBtn.innerHTML = icon('chevronRight');
    nextBtn.setAttribute('aria-label', 'Next month');
    prevBtn.onclick = ()=>{ viewMonth--; if(viewMonth<0){ viewMonth=11; viewYear--; } paint(); };
    nextBtn.onclick = ()=>{ viewMonth++; if(viewMonth>11){ viewMonth=0; viewYear++; } paint(); };
    header.appendChild(prevBtn); header.appendChild(title); header.appendChild(nextBtn);
    sheet.appendChild(header);

    const weekRow = document.createElement('div'); weekRow.className='cal-weekdays';
    weekRow.setAttribute('aria-hidden', 'true'); // decorative; days themselves state their weekday
    ['M','T','W','T','F','S','S'].forEach(d=>{
      const el = document.createElement('div'); el.className='cal-weekday'; el.textContent = d;
      weekRow.appendChild(el);
    });
    sheet.appendChild(weekRow);

    const grid = document.createElement('div'); grid.className='cal-grid'; grid.setAttribute('role', 'grid');
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
    const todayVal = todayStr();

    for(let i=0; i<startOffset; i++){
      const empty = document.createElement('div'); empty.className='cal-day cal-day-empty'; empty.setAttribute('aria-hidden', 'true');
      grid.appendChild(empty);
    }
    for(let d=1; d<=daysInMonth; d++){
      const dateObj = new Date(viewYear, viewMonth, d);
      const dStr = toDateStr(dateObj);
      const isSelected = dStr===selected, isToday = dStr===todayVal;
      const cell = document.createElement('button'); cell.type='button';
      cell.className = 'cal-day' + (isSelected ? ' is-selected' : '') + (isToday ? ' is-today' : '');
      cell.textContent = d;
      const weekdayName = WEEKDAY_NAMES[(dateObj.getDay()+6)%7];
      cell.setAttribute('aria-label', `${weekdayName} ${d} ${MONTHS[viewMonth]} ${viewYear}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`);
      cell.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      if(isToday) cell.setAttribute('aria-current', 'date');
      cell.onclick = ()=>{ haptic(10); onSelect(dStr); close(); };
      grid.appendChild(cell);
    }
    sheet.appendChild(grid);

    const todayBtn = document.createElement('button'); todayBtn.type='button';
    todayBtn.className = 'btn btn-text'; todayBtn.style.cssText = 'width:100%;justify-content:center;margin-top:8px;';
    todayBtn.textContent = 'Today';
    todayBtn.onclick = ()=>{ haptic(10); onSelect(todayStr()); close(); };
    sheet.appendChild(todayBtn);
  }
  paint();
  restoreFocus = trapFocus(overlay, sheet);
}
