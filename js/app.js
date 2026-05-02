import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyCUaccqKI5TwoNG5YQ0Dd0DYIjqH62lcOI",
  authDomain: "todo-454be.firebaseapp.com",
  projectId: "todo-454be",
  storageBucket: "todo-454be.firebasestorage.app",
  messagingSenderId: "210182337293",
  appId: "1:210182337293:web:5ce96ca03dc9c781237644"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const saveTimers = {};
async function saveToFirestore(dateStr, data) {
  try { await setDoc(doc(db, 'days', dateStr), data); }
  catch(e) { console.error('Firestore save error', e); }
}
function debouncedSave(dateStr, data) {
  clearTimeout(saveTimers[dateStr]);
  saveTimers[dateStr] = setTimeout(() => saveToFirestore(dateStr, data), 800);
}

// ── Storage ──
function loadData(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function saveData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  debouncedSave(key, val);
}

async function loadFromFirestore(dateStr) {
  try {
    const snap = await getDoc(doc(db, 'days', dateStr));
    if (snap.exists()) {
      const data = snap.data();
      localStorage.setItem(dateStr, JSON.stringify(data));
      refreshCard(dateStr, data);
    }
  } catch(e) { console.error('Firestore load error', e); }
}

function refreshCard(dateStr, data) {
  const goals = data.goals || ['','',''];
  const checks = data.checks || [false,false,false];
  [0,1,2].forEach(i => {
    const goalEl = document.getElementById(`goal-${dateStr}-${i}`);
    const checkEl = document.getElementById(`check-${dateStr}-${i}`);
    const iconEl = checkEl?.querySelector('.check-icon');
    if (goalEl) {
      goalEl.value = goals[i];
      goalEl.classList.toggle('has-value', !!goals[i]);
      goalEl.classList.toggle('done', checks[i]);
      autoResize(goalEl);
    }
    if (checkEl) {
      checkEl.classList.toggle('checked', checks[i]);
      if (iconEl) iconEl.style.display = checks[i] ? 'block' : 'none';
    }
  });
  const learnedEl = document.querySelector(`#card-${dateStr} .reflection-input:nth-of-type(1)`);
  const improveEl = document.querySelector(`#card-${dateStr} .reflection-input:nth-of-type(2)`);
  if (learnedEl) { learnedEl.value = data.learned||''; learnedEl.classList.toggle('has-value', !!(data.learned)); autoResize(learnedEl); }
  if (improveEl) { improveEl.value = data.improve||''; improveEl.classList.toggle('has-value', !!(data.improve)); autoResize(improveEl); }
  const cnt = checks.filter(Boolean).length;
  const countEl = document.getElementById(`count-${dateStr}`);
  if (countEl) { countEl.textContent = cnt===3?'Completed!':`${cnt}/3`; countEl.classList.toggle('completed', cnt===3); }
}

// ── Constants ──
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="5.25" stroke="#93BB89" stroke-width="1.5"/>
  <g transform="translate(0.5, 0.5)">
    <path d="M7.40894 5.72401C7.85539 3.42533 11.1446 3.42533 11.5911 5.72401C11.7567 6.57664 12.4234 7.24334 13.276 7.40894C15.5747 7.85539 15.5747 11.1446 13.276 11.5911C12.4234 11.7567 11.7567 12.4234 11.5911 13.276C11.1446 15.5747 7.85539 15.5747 7.40894 13.276C7.24334 12.4234 6.57664 11.7567 5.72401 11.5911C3.42533 11.1446 3.42533 7.85539 5.72401 7.40894C6.57664 7.24334 7.24334 6.57664 7.40894 5.72401Z" fill="#93BB89"/>
  </g>
</svg>`;

const today = new Date();
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
const todayStr = toLocalDateStr(today);
let currentWeekStart = getWeekStart(today);
let calDate = new Date(today);
let pickerYear = today.getFullYear();
let pickerDecadeStart = Math.floor(today.getFullYear() / 12) * 12;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Utils ──
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0,0,0,0);
  return d;
}
function formatDate(date) { return toLocalDateStr(date); }
function formatDateDisplay(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}
function getCompletionCount(dateStr) {
  return (loadData(dateStr).checks || [false,false,false]).filter(Boolean).length;
}

// ── UI ──
function autoResize(el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }

function updateInputState(el) {
  el.classList.toggle('has-value', !!el.value.trim());
}

function renderCard(date) {
  const dateStr = formatDate(date);
  const isToday = dateStr === todayStr;
  const data = loadData(dateStr);
  const goals = data.goals || ['','',''];
  const checks = data.checks || [false,false,false];
  const learned = data.learned || '';
  const improve = data.improve || '';
  const completed = checks.filter(Boolean).length;
  const card = document.createElement('div');
  card.className = 'day-card' + (isToday ? ' is-today' : '');
  card.id = 'card-' + dateStr;
  card.innerHTML = `
    <div class="day-header">
      <span class="day-date">${formatDateDisplay(date)}</span>
      <div class="header-right-group">
        ${isToday ? '<span class="today-badge">Today</span>' : ''}
        <span class="completion-count${completed===3?' completed':''}" id="count-${dateStr}">${completed===3?'Completed!':completed+'/3'}</span>
      </div>
    </div>
    <div class="goals-section">
      ${[0,1,2].map(i => {
        const tagId = (data.goalTags || [null,null,null])[i];
        const tag = tagId ? getTagById(tagId) : null;
        const tagHtml = tag
          ? `<span class="tag-chip" style="background:${tag.color}20;color:${tag.color};border-color:${tag.color}40" onclick="openTagPicker('${dateStr}',${i})">${tag.name}</span>`
          : `<button class="tag-add-btn" onclick="openTagPicker('${dateStr}',${i})">#</button>`;
        return `
        <div class="goal-item">
          <div class="custom-check ${checks[i]?'checked':''}" id="check-${dateStr}-${i}" onclick="toggleCheck('${dateStr}',${i})">
            <span class="check-icon" style="${checks[i]?'display:block':'display:none'}">${CHECK_SVG}</span>
          </div>
          <textarea class="goal-input ${checks[i]?'done':''}${goals[i]?' has-value':''}" id="goal-${dateStr}-${i}" rows="1"
            placeholder="목표를 입력해주세요"
            oninput="autoResize(this);saveGoal('${dateStr}',${i},this.value);updateInputState(this)"
          >${goals[i]}</textarea>
          <div class="tag-btn-wrap" id="tag-wrap-${dateStr}-${i}">${tagHtml}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="reflection-section">
      <div class="reflection-label">배운 점</div>
      <textarea class="reflection-input${learned?' has-value':''}" rows="2" placeholder="오늘 배운 것을 기록해보세요"
        oninput="autoResize(this);saveReflection('${dateStr}','learned',this.value);updateInputState(this)">${learned}</textarea>
      <div class="reflection-divider"></div>
      <div class="reflection-label">개선된 점</div>
      <textarea class="reflection-input${improve?' has-value':''}" rows="2" placeholder="개선된 점이나 다음엔 어떻게 할지 기록해보세요"
        oninput="autoResize(this);saveReflection('${dateStr}','improve',this.value);updateInputState(this)">${improve}</textarea>
    </div>`;
  return card;
}

// ── Actions ──
function toggleCheck(dateStr, idx) {
  const data = loadData(dateStr);
  if (!data.checks) data.checks = [false,false,false];
  data.checks[idx] = !data.checks[idx];
  saveData(dateStr, data);
  const checkEl = document.getElementById(`check-${dateStr}-${idx}`);
  const iconEl = checkEl.querySelector('.check-icon');
  checkEl.classList.toggle('checked', data.checks[idx]);
  iconEl.style.display = data.checks[idx] ? 'block' : 'none';
  document.getElementById(`goal-${dateStr}-${idx}`).classList.toggle('done', data.checks[idx]);
  const cnt = data.checks.filter(Boolean).length;
  const countEl = document.getElementById(`count-${dateStr}`);
  countEl.textContent = cnt===3 ? 'Completed!' : `${cnt}/3`;
  countEl.classList.toggle('completed', cnt===3);
}

function saveGoal(dateStr, idx, val) {
  const data = loadData(dateStr);
  if (!data.goals) data.goals = ['','',''];
  data.goals[idx] = val;
  saveData(dateStr, data);
}

function saveReflection(dateStr, field, val) {
  const data = loadData(dateStr);
  data[field] = val;
  saveData(dateStr, data);
}

function scrollToToday() {
  const el = document.getElementById('card-' + todayStr);
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}

function goToToday() {
  currentWeekStart = getWeekStart(today);
  renderWeek(currentWeekStart);
  setTimeout(scrollToToday, 50);
}

function changeWeek(dir) {
  const d = new Date(currentWeekStart);
  d.setDate(d.getDate() + dir * 7);
  currentWeekStart = d;
  renderWeek(currentWeekStart);
}

function renderWeek(weekStart) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  document.getElementById('week-label').textContent =
    `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const card = renderCard(d);
    container.appendChild(card);
    card.querySelectorAll('textarea').forEach(el => autoResize(el));
    loadFromFirestore(formatDate(d));
  }
}

// ── Calendar ──
function openCalendar() {
  calDate = new Date(today);
  showView('cal-view');
  renderCalendar();
  document.getElementById('cal-modal').classList.add('open');
}
function closeCalendar() { document.getElementById('cal-modal').classList.remove('open'); }
function closeCalendarOutside(e) { if (e.target===document.getElementById('cal-modal')) closeCalendar(); }

function showView(id) {
  ['cal-view','month-picker','year-picker'].forEach(v => {
    document.getElementById(v).style.display = v===id ? '' : 'none';
  });
}

function changeCalMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }

function renderCalendar() {
  const titleEl = document.getElementById('cal-month-title');
  titleEl.childNodes[0].textContent = `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-label';
    el.textContent = d;
    grid.appendChild(el);
  });
  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div'); el.className = 'cal-cell empty'; grid.appendChild(el);
  }
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(calDate.getFullYear(), calDate.getMonth(), d);
    const cellStr = formatDate(cellDate);
    const el = document.createElement('div');
    el.className = 'cal-cell';
    if (cellStr === todayStr) el.classList.add('today-cell');
    if (getCompletionCount(cellStr) > 0) el.classList.add('has-data');
    el.textContent = d;
    el.onclick = () => {
      currentWeekStart = getWeekStart(cellDate);
      renderWeek(currentWeekStart);
      closeCalendar();
      setTimeout(() => {
        const t = document.getElementById('card-' + cellStr);
        if (t) t.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 100);
    };
    grid.appendChild(el);
  }
}

function showPicker(type) {
  if (type === 'month') { pickerYear = calDate.getFullYear(); renderMonthPicker(); showView('month-picker'); }
  else { pickerDecadeStart = Math.floor(calDate.getFullYear() / 12) * 12; renderYearPicker(); showView('year-picker'); }
}

function changePickerYear(dir) { pickerYear += dir; renderMonthPicker(); }

function renderMonthPicker() {
  document.getElementById('picker-year-label').textContent = pickerYear;
  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';
  MONTHS_SHORT.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'picker-cell';
    if (i === calDate.getMonth() && pickerYear === calDate.getFullYear()) el.classList.add('active');
    el.textContent = m;
    el.onclick = () => { calDate.setFullYear(pickerYear); calDate.setMonth(i); renderCalendar(); showView('cal-view'); };
    grid.appendChild(el);
  });
}

function changePickerDecade(dir) { pickerDecadeStart += dir * 12; renderYearPicker(); }

function renderYearPicker() {
  document.getElementById('picker-decade-label').textContent = `${pickerDecadeStart} – ${pickerDecadeStart + 11}`;
  const grid = document.getElementById('year-grid');
  grid.innerHTML = '';
  for (let y = pickerDecadeStart; y < pickerDecadeStart + 12; y++) {
    const el = document.createElement('div');
    el.className = 'picker-cell';
    if (y === calDate.getFullYear()) el.classList.add('active');
    el.textContent = y;
    el.onclick = () => { pickerYear = y; renderMonthPicker(); showView('month-picker'); };
    grid.appendChild(el);
  }
}

// ── Init ──
window.toggleCheck = toggleCheck;
window.saveGoal = saveGoal;
window.saveReflection = saveReflection;
window.autoResize = autoResize;
window.updateInputState = updateInputState;
window.goToToday = goToToday;
window.changeWeek = changeWeek;
window.openCalendar = openCalendar;
window.closeCalendar = closeCalendar;
window.closeCalendarOutside = closeCalendarOutside;
window.changeCalMonth = changeCalMonth;
window.showPicker = showPicker;
window.changePickerYear = changePickerYear;
window.changePickerDecade = changePickerDecade;



// ── Tag System ──
const TAG_PALETTE = ['#E57373','#FF8A65','#FFB300','#81C784','#4FC3F7','#7986CB','#BA68C8','#F06292','#4DB6AC','#90A4AE'];

function loadTags() { try { return JSON.parse(localStorage.getItem('__tags__')) || []; } catch { return []; } }
async function saveTags(tags) {
  localStorage.setItem('__tags__', JSON.stringify(tags));
  try { await setDoc(doc(db, 'settings', 'tags'), { list: tags }); }
  catch(e) { console.error('Tag save error', e); }
}
async function syncTagsFromFirestore() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'tags'));
    if (snap.exists()) {
      const tags = snap.data().list || [];
      localStorage.setItem('__tags__', JSON.stringify(tags));
    }
  } catch(e) { console.error('Tag sync error', e); }
}
function getTagById(id) { return loadTags().find(t => t.id === id) || null; }

function openSettings() {
  renderSettingsModal();
  document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() { document.getElementById('settings-modal').classList.remove('open'); }

function renderSettingsModal() {
  const tags = loadTags();
  const list = document.getElementById('tag-list');
  list.innerHTML = tags.length === 0
    ? '<p style="font-size:13px;color:#aaa;text-align:center;padding:12px 0;">태그가 없어요</p>'
    : tags.map(t => `
      <div class="tag-list-item">
        <span class="tag-chip" style="background:${t.color}20;color:${t.color};border-color:${t.color}40">${t.name}</span>
        <div style="display:flex;gap:6px;">
          <button class="tag-action-btn" onclick="editTag('${t.id}')">수정</button>
          <button class="tag-action-btn danger" onclick="deleteTag('${t.id}')">삭제</button>
        </div>
      </div>`).join('');
}

function openAddTag() {
  document.getElementById('tag-form-title').textContent = '태그 추가';
  document.getElementById('tag-name-input').value = '';
  document.getElementById('tag-edit-id').value = '';
  renderPalette(null);
  document.getElementById('tag-form').style.display = '';
}

function editTag(id) {
  const tag = getTagById(id);
  if (!tag) return;
  document.getElementById('tag-form-title').textContent = '태그 수정';
  document.getElementById('tag-name-input').value = tag.name;
  document.getElementById('tag-edit-id').value = id;
  renderPalette(tag.color);
  document.getElementById('tag-form').style.display = '';
}

async function deleteTag(id) {
  const tags = loadTags().filter(t => t.id !== id);
  await saveTags(tags);
  renderSettingsModal();
}

function renderPalette(selected) {
  const palette = document.getElementById('color-palette');
  palette.innerHTML = TAG_PALETTE.map(c => `
    <div class="color-swatch ${selected===c?'selected':''}" style="background:${c}" onclick="selectColor('${c}')"></div>
  `).join('');
}

function selectColor(color) {
  document.getElementById('selected-color').value = color;
  renderPalette(color);
}

async function saveTag() {
  const name = document.getElementById('tag-name-input').value.trim();
  const color = document.getElementById('selected-color').value;
  const editId = document.getElementById('tag-edit-id').value;
  if (!name || !color) { alert('이름과 색상을 모두 선택해주세요.'); return; }
  const tags = loadTags();
  if (editId) {
    const idx = tags.findIndex(t => t.id === editId);
    if (idx > -1) tags[idx] = { id: editId, name, color };
  } else {
    tags.push({ id: Date.now().toString(), name, color });
  }
  await saveTags(tags);
  document.getElementById('tag-form').style.display = 'none';
  renderSettingsModal();
}

let _tagPickerTarget = null;
function openTagPicker(dateStr, idx) {
  _tagPickerTarget = { dateStr, idx };
  const tags = loadTags();
  const data = loadData(dateStr);
  const currentTagId = (data.goalTags || [])[idx] || null;
  const list = document.getElementById('tag-picker-list');
  list.innerHTML = `
    <div class="tag-picker-item ${!currentTagId?'selected':''}" onclick="applyTag(null)">
      <span style="font-size:13px;color:#aaa;">없음</span>
    </div>
    ${tags.map(t => `
      <div class="tag-picker-item ${currentTagId===t.id?'selected':''}" onclick="applyTag('${t.id}')">
        <span class="tag-chip" style="background:${t.color}20;color:${t.color};border-color:${t.color}40">${t.name}</span>
      </div>`).join('')}`;
  document.getElementById('tag-picker-modal').classList.add('open');
}

function closeTagPicker() { document.getElementById('tag-picker-modal').classList.remove('open'); }

function applyTag(tagId) {
  if (!_tagPickerTarget) return;
  const { dateStr, idx } = _tagPickerTarget;
  const data = loadData(dateStr);
  if (!data.goalTags) data.goalTags = [null, null, null];
  data.goalTags[idx] = tagId;
  saveData(dateStr, data);
  const wrap = document.getElementById(`tag-wrap-${dateStr}-${idx}`);
  if (wrap) {
    const tag = tagId ? getTagById(tagId) : null;
    wrap.innerHTML = tag
      ? `<span class="tag-chip" style="background:${tag.color}20;color:${tag.color};border-color:${tag.color}40" onclick="openTagPicker('${dateStr}',${idx})">${tag.name}</span>`
      : `<button class="tag-add-btn" onclick="openTagPicker('${dateStr}',${idx})">#</button>`;
  }
  closeTagPicker();
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.openAddTag = openAddTag;
window.editTag = editTag;
window.deleteTag = deleteTag;
window.selectColor = selectColor;
window.saveTag = saveTag;
window.openTagPicker = openTagPicker;
window.closeTagPicker = closeTagPicker;
window.applyTag = applyTag;

// ── Init ──
syncTagsFromFirestore().then(() => {
  renderWeek(currentWeekStart);
  setTimeout(scrollToToday, 100);
});
