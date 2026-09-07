/* ==========================================================
   HORIZON — a simple place to keep track of the things
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

/* ---------------- archive filter memory ---------------- */
const ARCHIVE_FILTER_KEY = 'horizon_archive_filter_v1';
function loadArchiveFilter(){ return localStorage.getItem(ARCHIVE_FILTER_KEY) || 'All'; }
function saveArchiveFilter(v){ localStorage.setItem(ARCHIVE_FILTER_KEY, v); }

const COMPACT_KEY = 'horizon_compact_v1';
function loadCompact(){ return localStorage.getItem(COMPACT_KEY) === '1'; }
function saveCompact(v){ localStorage.setItem(COMPACT_KEY, v ? '1' : '0'); }
let compactMode = loadCompact();

// Suggestions only draw on people from events within roughly the last six
// months (or upcoming) — someone you haven't gone anywhere with in a while
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
// silent no-op there today — kept as progressive enhancement for Android,
// and ready to swap for real haptics (@capacitor/haptics) if this ever
// gets wrapped natively.
function haptic(ms){
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
// clears localStorage on its own — belt-and-braces alongside backups.
function requestPersistentStorage(){
  if(navigator.storage && navigator.storage.persist){
    navigator.storage.persist().catch(()=>{});
  }
}

/* ---------------- backup / restore ---------------- */
const LAST_BACKUP_KEY = 'horizon_last_backup_v1';
function markBackedUp(){ localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); }
function daysSinceBackup(){
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if(!raw) return null;
  return daysBetween(new Date(raw), new Date());
}

function exportPayload(){
  return JSON.stringify({ app:'Horizon', version:1, exportedAt: new Date().toISOString(), events: EVENTS }, null, 2);
}
async function shareBackupFile(){
  const text = exportPayload();
  const filename = `horizon-backup-${todayStr()}.json`;

  // Web Share API with a file attachment — opens the native iOS share
  // sheet (Save to Files, AirDrop, Messages, Mail, etc.) instead of
  // forcing a browser download, which is awkward to locate afterward on
  // a phone. Falls back to a plain download if the browser can't share
  // files (e.g. most desktop browsers).
  if(navigator.canShare && navigator.share){
    try{
      const file = new File([text], filename, { type:'application/json' });
      if(navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:'Horizon backup' });
        markBackedUp();
        return;
      }
    }catch(e){
      if(e.name === 'AbortError') return; // person cancelled the share sheet — not an error
    }
  }
  downloadBackup();
}
function downloadBackup(){
  const blob = new Blob([exportPayload()], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `horizon-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
  markBackedUp();
}
function copyBackup(){
  if(navigator.clipboard){
    navigator.clipboard.writeText(exportPayload()).then(()=> { showToast('Backup copied to clipboard'); markBackedUp(); });
  } else {
    showToast('Clipboard isn\u2019t available here');
  }
}
function importFromText(text){
  let parsed;
  try{ parsed = JSON.parse(text); }
  catch(e){ showToast('That doesn\u2019t look like a valid backup file'); return; }
  const incoming = Array.isArray(parsed) ? parsed : parsed.events;
  if(!Array.isArray(incoming)){ showToast('No events found in that file'); return; }
  confirmSheet(
    'Restore this backup?',
    `This will add ${incoming.length} event${incoming.length===1?'':'s'} from the backup. Events already on this device won\u2019t be duplicated or removed.`,
    'Restore',
    ()=>{
      const existingIds = new Set(EVENTS.map(e=>e.id));
      let added = 0;
      incoming.forEach(ev=>{
        if(ev && ev.id && !existingIds.has(ev.id)){
          EVENTS.push(ev); existingIds.add(ev.id); added++;
        }
      });
      saveEvents(EVENTS);
      markBackedUp();
      showToast(`Restored ${added} event${added===1?'':'s'}`);
      render();
    }
  );
}


function renderSettings(){
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const sectionTitle = (t)=>{
    const el = document.createElement('div'); el.className='section-title'; el.textContent=t;
    return el;
  };

  const backRow = document.createElement('div');
  backRow.className = 'back-row';
  backRow.innerHTML = `<button class="back-btn">${icon('chevronLeft')}</button><div class="back-title">Settings</div>`;
  backRow.querySelector('.back-btn').onclick = ()=> navigate('/home');
  wrap.appendChild(backRow);

  // -- Home view --
  wrap.appendChild(sectionTitle('Home view'));
  const viewCard = document.createElement('div'); viewCard.className='detail-card';
  const viewRow = document.createElement('div'); viewRow.className='chip-group';
  [{ v:false, label:'Full' }, { v:true, label:'Compact' }].forEach(opt=>{
    const c = document.createElement('button'); c.type='button';
    c.className = 'chip' + (compactMode===opt.v ? ' is-selected' : '');
    c.textContent = opt.label;
    c.onclick = ()=>{ compactMode = opt.v; saveCompact(compactMode); wrap.replaceWith(renderSettings()); };
    viewRow.appendChild(c);
  });
  viewCard.appendChild(viewRow);
  const viewHint = document.createElement('p');
  viewHint.style.cssText = 'font-size:12.5px;color:var(--text-faint);margin:12px 0 0;';
  viewHint.textContent = 'Compact drops date and location from Home cards so titles read bigger.';
  viewCard.appendChild(viewHint);
  wrap.appendChild(viewCard);

  // -- Theme --
  wrap.appendChild(sectionTitle('Theme'));
  const themeCard = document.createElement('div'); themeCard.className='detail-card';
  const themeRow = document.createElement('div'); themeRow.className='chip-group';
  const currentThemeMode = loadThemeMode();
  [{ v:'system', label:'System' }, { v:'light', label:'Light' }, { v:'dark', label:'Dark' }].forEach(opt=>{
    const c = document.createElement('button'); c.type='button';
    c.className = 'chip' + (currentThemeMode===opt.v ? ' is-selected' : '');
    c.textContent = opt.label;
    c.onclick = ()=>{ saveThemeMode(opt.v); wrap.replaceWith(renderSettings()); };
    themeRow.appendChild(c);
  });
  themeCard.appendChild(themeRow);
  wrap.appendChild(themeCard);

  // -- Accent color --
  wrap.appendChild(sectionTitle('Accent color'));
  const colorCard = document.createElement('div'); colorCard.className='detail-card';
  const swatchRow = document.createElement('div');
  swatchRow.style.cssText = 'display:flex;gap:12px;';
  const currentAccent = loadAccentTheme();
  ACCENT_THEMES.forEach(theme=>{
    const isSelected = theme.hex.toLowerCase() === currentAccent.toLowerCase();
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.setAttribute('aria-label', theme.name);
    sw.style.cssText = `
      width:40px; height:40px; border-radius:50%; background:${theme.hex}; cursor:pointer;
      border:2.5px solid ${isSelected ? 'var(--surface)' : 'transparent'};
      box-shadow: 0 0 0 2px ${isSelected ? theme.hex : 'transparent'};
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    `;
    if(isSelected) sw.innerHTML = `<span class="swatch-check">${icon('check')}</span>`;
    sw.onclick = ()=>{ saveAccentTheme(theme.hex); wrap.replaceWith(renderSettings()); };
    swatchRow.appendChild(sw);
  });
  colorCard.appendChild(swatchRow);
  wrap.appendChild(colorCard);

  // -- New event defaults --
  wrap.appendChild(sectionTitle('New event defaults'));
  const defaultsCard = document.createElement('div'); defaultsCard.className='detail-card';

  const timeLabel = document.createElement('div');
  timeLabel.style.cssText = 'font-size:12.5px;font-weight:700;color:var(--text-muted);letter-spacing:.02em;margin-bottom:8px;';
  timeLabel.textContent = 'Time format';
  defaultsCard.appendChild(timeLabel);
  const timeRow = document.createElement('div'); timeRow.className='chip-group';
  timeRow.style.marginBottom = '16px';
  const currentTimeFormat = loadTimeFormat();
  [{ v:'24h', label:'24-hour' }, { v:'12h', label:'12-hour' }].forEach(opt=>{
    const c = document.createElement('button'); c.type='button';
    c.className = 'chip' + (currentTimeFormat===opt.v ? ' is-selected' : '');
    c.textContent = opt.label;
    c.onclick = ()=>{ saveTimeFormat(opt.v); wrap.replaceWith(renderSettings()); };
    timeRow.appendChild(c);
  });
  defaultsCard.appendChild(timeRow);

  const archiveRow = document.createElement('div');
  archiveRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--border);';
  archiveRow.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <div style="font-size:14px;font-weight:600;">Auto-archive by default</div>
      <div style="font-size:12px;color:var(--text-faint);">Applies to new events \u2014 editable per event</div>
    </div>
  `;
  const archiveSwitch = document.createElement('div');
  archiveSwitch.className = 'switch' + (loadDefaultAutoArchive() ? ' is-on' : '');
  archiveSwitch.onclick = ()=>{
    const v = !loadDefaultAutoArchive();
    saveDefaultAutoArchive(v);
    archiveSwitch.classList.toggle('is-on', v);
  };
  archiveRow.appendChild(archiveSwitch);
  defaultsCard.appendChild(archiveRow);
  wrap.appendChild(defaultsCard);

  // -- Backup & restore --
  wrap.appendChild(sectionTitle('Backup & restore'));
  const card = document.createElement('div'); card.className='detail-card';
  card.innerHTML = `
    <p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin:0 0 14px;">
      Your events live only on this device. Worth doing before switching
      phones or reinstalling.
    </p>
  `;
  const btnCol = document.createElement('div');
  btnCol.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  btnCol.innerHTML = `
    <button class="btn btn-ghost btn-block" id="shareBtn">${icon('share')} Share backup</button>
    <label class="btn btn-ghost btn-block" style="cursor:pointer;">
      ${icon('upload')} Restore from file
      <input type="file" accept="application/json" id="fileInput" style="display:none;">
    </label>
    <button class="btn btn-text" id="cpBtn" style="justify-content:center;">${icon('copy')} Or copy backup as text</button>
  `;
  card.appendChild(btnCol);
  const dsb = daysSinceBackup();
  const lastLine = document.createElement('p');
  lastLine.style.cssText = 'font-size:11.5px;color:var(--text-faint);margin:14px 0 0;text-align:center;';
  lastLine.textContent = dsb === null ? 'Never backed up' : dsb === 0 ? 'Last backed up today' : `Last backed up ${dsb} day${dsb===1?'':'s'} ago`;
  card.appendChild(lastLine);
  wrap.appendChild(card);

  card.querySelector('#shareBtn').onclick = ()=> shareBackupFile().then(()=>{ wrap.replaceWith(renderSettings()); });
  card.querySelector('#cpBtn').onclick = ()=> { copyBackup(); };
  card.querySelector('#fileInput').onchange = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=> importFromText(reader.result);
    reader.readAsText(file);
  };

  // -- About / roadmap --
  wrap.appendChild(sectionTitle('About your data'));
  const aboutCard = document.createElement('div'); aboutCard.className='detail-card';
  aboutCard.innerHTML = `
    <p style="font-size:13px;color:var(--text-muted);line-height:1.6;margin:0;">
      Right now this runs as a web app, so events are stored locally in
      the browser on this device only. If this becomes a native App Store
      app, its data will automatically be included whenever your iPhone
      backs up to iCloud — standard for any installed app, no extra setup.
      That's separate from live syncing the same events across multiple
      devices at once, which would be a later addition if it's ever needed.
    </p>
  `;
  wrap.appendChild(aboutCard);

  // -- Danger zone --
  const activeCount = EVENTS.filter(e=>!e._trashed).length;
  if(activeCount > 0){
    const dz = document.createElement('div'); dz.className='danger-zone';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-danger btn-block';
    clearBtn.textContent = 'Clear all events';
    clearBtn.onclick = ()=> confirmSheet(
      'Clear all events?',
      `This permanently deletes all ${activeCount} event${activeCount===1?'':'s'} — upcoming and archived. This can\u2019t be undone. Consider a backup first.`,
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

  const more = document.createElement('p');
  more.style.cssText = 'font-size:12px;color:var(--text-faint);text-align:center;margin-top:22px;';
  more.textContent = 'More settings will show up here as they\u2019re added.';
  wrap.appendChild(more);

  return wrap;
}

/* ---------------- render dispatch ---------------- */
function render(){
  runAutoArchive();
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
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.7l7.6-4.4M8.2 13.3l7.6 4.4"/></svg>',
  ticket: '<svg viewBox="0 0 24 24"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.7 1.7 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a1.7 1.7 0 0 0 0-3Z"/><path d="M9 7v10" stroke-dasharray="2 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  rows: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="4.5" rx="1.3"/><rect x="4" y="14.5" width="16" height="4.5" rx="1.3"/></svg>',
  squares: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.3"/><rect x="13" y="4" width="7" height="7" rx="1.3"/><rect x="4" y="13" width="7" height="7" rx="1.3"/><rect x="13" y="13" width="7" height="7" rx="1.3"/></svg>',
  ticketShield: '<svg viewBox="0 0 24 24"><path d="M12 3.5 19 6.3v5.4c0 4.7-3 8.6-7 9.8-4-1.2-7-5.1-7-9.8V6.3l7-2.8Z"/><path d="M9 12.2l2.1 2.1L15.5 10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" stroke-linecap="round"/><circle cx="9" cy="6" r="2.2"/><line x1="4" y1="12" x2="20" y2="12" stroke-linecap="round"/><circle cx="15" cy="12" r="2.2"/><line x1="4" y1="18" x2="20" y2="18" stroke-linecap="round"/><circle cx="11" cy="18" r="2.2"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 20V9m0 0-4 4m4-4 4 4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 15.5A1.5 1.5 0 0 1 3.5 14V5.5A1.5 1.5 0 0 1 5 4h8.5A1.5 1.5 0 0 1 15 5.5"/></svg>',
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
    id: uid(), title:'', type:'Concert', startDate: todayStr(), endDate: null, time:'',
    location:'', goingWith:[], ticketPurchased:false,
    travel:{method:'', details:''},
    prepTasks:[],
    autoArchive: loadDefaultAutoArchive(), completed:false, completedAt:null,
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
    md.onclick = ()=>{ haptic(10); multiDay = !multiDay; if(!multiDay) draft.endDate=null; else draft.endDate = draft.endDate || draft.startDate; renderInto(); };
    box.appendChild(md);
    return box;
  }));

  // -- Time
  form.appendChild(field('Time (optional)', ()=>{
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
      draft.goingWith.push({ id: uid(), name: v, coming: true }); i.value='';
      renderInto();
    };
    i.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addName(); } };
    addBtn.onclick = ()=> addName();
    row.appendChild(i); row.appendChild(addBtn);
    box.appendChild(row);

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

    if(draft.goingWith.length){
      const tags = document.createElement('div'); tags.className='name-tags';
      draft.goingWith.forEach((person, idx)=>{
        const t = document.createElement('span'); t.className='name-tag';
        t.innerHTML = `${escapeHtml(person.name)}<span class="name-tag-x">×</span>`;
        t.onclick = ()=>{ draft.goingWith.splice(idx,1); renderInto(); };
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

  form.appendChild(travelField('Travel', draft.travel, (m,d)=>{ draft.travel.method=m; draft.travel.details=d; }));

  // -- Things to bring
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
      t.onclick = ()=>{
        person.coming = person.coming===false ? true : false;
        haptic(10);
        t.classList.toggle('is-not-coming', person.coming===false);
        saveEvents(EVENTS);
      };
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
  tSwitch.onclick = (e)=>{
    e.stopPropagation();
    haptic(10);
    ev.ticketPurchased = !ev.ticketPurchased;
    tSwitch.classList.toggle('is-on', ev.ticketPurchased);
    ticketLine.querySelector('span').textContent = ev.ticketPurchased ? 'Ticket purchased' : 'Not purchased yet';
    saveEvents(EVENTS);
  };
  ticketLine.appendChild(tSwitch);
  infoCard.appendChild(ticketLine);

  if(ev.travel && ev.travel.method){
    infoCard.appendChild(prepLine(ev.travel));
  }
  wrap.appendChild(infoCard);

  // -- Bring / Tasks as compact wrapping chip checklists --
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

function prepLine(obj){
  const line = document.createElement('div');
  line.className = 'prep-line';
  line.innerHTML = `${icon(TRAVEL_ICON[obj.method]||'dot')} <span>${escapeHtml(obj.method)}${obj.details ? ' — '+escapeHtml(obj.details) : ''}</span>`;
  return line;
}

function chipChecklist(items){
  const row = document.createElement('div'); row.className='chip-check-row';
  items.forEach(it=>{
    const chip = document.createElement('div');
    chip.className = 'chip-check' + (it.completed?' is-done':'');
    chip.innerHTML = `<span class="cc-box">${icon('check')}</span><span>${escapeHtml(it.text)}</span>`;
    chip.onclick = ()=>{
      haptic(10);
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
  let text = `${ev.title.toUpperCase()}\n${formatEventDate(ev)}${ev.time?` · ${formatTimeDisplay(ev.time)}`:''}\n`;
  if(ev.location) text += `📍 ${ev.location}\n`;
  const coming = (ev.goingWith||[]).filter(p=>p.coming!==false).map(p=>p.name);
  if(coming.length) text += `👥 ${coming.join(' · ')}\n`;
  text += ev.ticketPurchased ? `🎟 Ticket purchased\n` : '';

  if(includePrep){
    if(ev.travel && ev.travel.method){
      text += `\nTravel: ${ev.travel.method}${ev.travel.details ? ' — '+ev.travel.details : ''}`;
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
