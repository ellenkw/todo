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

// ── Constants ──
function makeCheckSVG(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="5.25" stroke="${color}" stroke-width="1.5"/>
    <g transform="translate(0.5, 0.5)">
      <path d="M7.40894 5.72401C7.85539 3.42533 11.1446 3.42533 11.5911 5.72401C11.7567 6.57664 12.4234 7.24334 13.276 7.40894C15.5747 7.85539 15.5747 11.1446 13.276 11.5911C12.4234 11.7567 11.7567 12.4234 11.5911 13.276C11.1446 15.5747 7.85539 15.5747 7.40894 13.276C7.24334 12.4234 6.57664 11.7567 5.72401 11.5911C3.42533 11.1446 3.42533 7.85539 5.72401 7.40894C6.57664 7.24334 7.24334 6.57664 7.40894 5.72401Z" fill="${color}"/>
    </g>
  </svg>`;
}

const CAT_PALETTE = ['#E57373','#FF8A65','#FFB300','#81C784','#4FC3F7','#7986CB','#BA68C8','#F06292','#4DB6AC','#90A4AE'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Date Utils ──
const today = new Date();
function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const todayStr = toStr(today);
let calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = todayStr;
let _addTodoCatId = null;

// ── Storage ──
function loadLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function saveLocal(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

// ── Categories ──
function loadCats() { return loadLocal('__todo_cats__') || []; }
async function saveCats(cats) {
  saveLocal('__todo_cats__', cats);
  try { await setDoc(doc(db, 'todo_settings', 'categories'), { list: cats }); } catch(e) { console.error(e); }
}
async function syncCats() {
  try {
    const snap = await getDoc(doc(db, 'todo_settings', 'categories'));
    if (snap.exists()) saveLocal('__todo_cats__', snap.data().list || []);
  } catch(e) { console.error(e); }
}

// ── Todos (month-based) ──
function monthKey(ds) { return ds.slice(0, 7); }
function dayKey(ds) { return ds.slice(8, 10); }
function loadMonthLocal(ym) { return loadLocal(`__todos_month__${ym}`) || {}; }
function saveMonthLocal(ym, data) { saveLocal(`__todos_month__${ym}`, data); }

function loadTodos(ds) {
  return loadMonthLocal(monthKey(ds))[dayKey(ds)] || {};
}
async function saveTodos(ds, data) {
  const ym = monthKey(ds), dk = dayKey(ds);
  const month = loadMonthLocal(ym);
  month[dk] = data;
  saveMonthLocal(ym, month);
  try {
    const clean = JSON.parse(JSON.stringify(month, (k,v) => v === undefined ? null : v));
    await setDoc(doc(db, 'todos', ym), clean);
  } catch(e) { console.error(e); }
}
async function syncTodosForMonth(y, m) {
  const ym = `${y}-${String(m+1).padStart(2,'0')}`;
  try {
    const snap = await getDoc(doc(db, 'todos', ym));
    if (snap.exists()) saveMonthLocal(ym, snap.data());
  } catch(e) { console.error(e); }
}

// ── Helpers ──
function getIncomplete(ds) {
  const cats = loadCats(), todos = loadTodos(ds); let n = 0;
  cats.forEach(c => (todos[c.id]||[]).forEach(i => { if (!i.done) n++; }));
  return n;
}
function getTotal(ds) {
  const cats = loadCats(), todos = loadTodos(ds); let n = 0;
  cats.forEach(c => { n += (todos[c.id]||[]).length; });
  return n;
}
function getIncompletePerCat(ds) {
  const cats = loadCats(), todos = loadTodos(ds), result = [];
  cats.forEach(c => (todos[c.id]||[]).forEach(i => { if (!i.done) result.push(c.color); }));
  return result;
}

// ── Calendar ──
function renderCal() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  document.getElementById('todo-cal-title').innerHTML = `<strong>${MONTHS[m]}</strong> ${y}`;
  const grid = document.getElementById('todo-cal-grid');
  grid.innerHTML = '';
  DAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'todo-cal-dow'; el.textContent = d; grid.appendChild(el);
  });
  const firstDow = new Date(y, m, 1).getDay();
  for (let i = 0; i < firstDow; i++) {
    const el = document.createElement('div'); el.className = 'todo-cal-cell empty'; grid.appendChild(el);
  }
  const days = new Date(y, m+1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const incomplete = getIncomplete(ds), total = getTotal(ds);
    const allDone = total > 0 && incomplete === 0;
    const cell = document.createElement('div');
    cell.className = 'todo-cal-cell';
    if (ds === todayStr) cell.classList.add('is-today');
    if (ds === selectedDate) cell.classList.add('is-selected');
    if (allDone) cell.classList.add('all-done');
    let dotsHtml = '';
    if (total > 0) {
      const colors = getIncompletePerCat(ds);
      const dots = colors.slice(0,3).map(c => `<div class="todo-dot" style="background:${c}"></div>`).join('');
      const plus = colors.length > 3 ? `<div class="todo-dot plus" style="color:${colors[3]}">+</div>` : '';
      dotsHtml = `<div class="todo-dot-wrap">${dots}${plus}</div>`;
    }
    cell.innerHTML = `<div class="todo-cal-num">${d}</div>${dotsHtml}`;
    cell.onclick = () => selectDate(ds);
    grid.appendChild(cell);
  }
}

function selectDate(ds) { selectedDate = ds; renderCal(); renderList(); }

// ── List ──
let dragSrcCatId = null;
let dragSrcIdx = null;

function makeTodoItemEl(item, idx, cat) {
  const el = document.createElement('div');
  el.className = 'todo-item';
  el.dataset.idx = idx;
  el.dataset.cat = cat.id;
  el.draggable = true;

  // drag handle
  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="3" r="1.2" fill="#D1D5DB"/><circle cx="10" cy="3" r="1.2" fill="#D1D5DB"/><circle cx="4" cy="7" r="1.2" fill="#D1D5DB"/><circle cx="10" cy="7" r="1.2" fill="#D1D5DB"/><circle cx="4" cy="11" r="1.2" fill="#D1D5DB"/><circle cx="10" cy="11" r="1.2" fill="#D1D5DB"/></svg>`;

  // checkbox
  const check = document.createElement('div');
  check.className = 'todo-item-check' + (item.done ? ' checked' : '');
  check.style.cssText = item.done ? 'border:none' : 'border:1.5px solid #D1D5DB';
  check.innerHTML = `<span class="check-icon" style="${item.done?'display:block':'display:none'}">${makeCheckSVG(cat.color)}</span>`;
  check.addEventListener('mouseenter', () => { if (!check.classList.contains('checked')) check.style.borderColor = cat.color; });
  check.addEventListener('mouseleave', () => { if (!check.classList.contains('checked')) check.style.borderColor = '#D1D5DB'; });
  check.addEventListener('click', () => toggleTodo(cat.id, idx));

  // text
  const textWrap = document.createElement('div');
  textWrap.className = 'todo-item-text-wrap';
  const textEl = document.createElement('div');
  textEl.className = 'todo-item-text' + (item.done ? ' done' : '');
  textEl.textContent = item.text;
  textEl.addEventListener('click', () => editTodoText(textEl, cat.id, idx));
  textWrap.appendChild(textEl);

  // delete
  const del = document.createElement('button');
  del.className = 'todo-item-delete';
  del.textContent = '✕';
  del.addEventListener('click', () => deleteTodo(cat.id, idx));

  el.appendChild(handle);
  el.appendChild(check);
  el.appendChild(textWrap);
  el.appendChild(del);

  // Desktop drag events
  el.addEventListener('dragstart', (e) => {
    dragSrcCatId = cat.id;
    dragSrcIdx = idx;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => el.style.opacity = '0.4', 0);
  });
  el.addEventListener('dragend', () => { el.style.opacity = ''; });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.style.background = '#f5f5f5'; });
  el.addEventListener('dragleave', () => { el.style.background = ''; });
  el.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.style.background = '';
    if (dragSrcCatId !== cat.id || dragSrcIdx === null || dragSrcIdx === idx) return;
    const todos = loadTodos(selectedDate);
    const items = todos[cat.id] || [];
    const [moved] = items.splice(dragSrcIdx, 1);
    items.splice(idx, 0, moved);
    todos[cat.id] = items;
    await saveTodos(selectedDate, todos);
    renderList();
  });

  // Touch drag
  let touchStartY = 0, touchClone = null;
  handle.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    dragSrcCatId = cat.id;
    dragSrcIdx = idx;
    touchStartY = e.touches[0].clientY;
    const rect = el.getBoundingClientRect();
    touchClone = el.cloneNode(true);
    touchClone.style.cssText = `position:fixed;z-index:9999;opacity:0.85;pointer-events:none;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);`;
    document.body.appendChild(touchClone);
    el.style.opacity = '0.3';
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchClone) return;
    const dy = e.touches[0].clientY - touchStartY;
    touchClone.style.top = (parseFloat(touchClone.style.top) + dy) + 'px';
    touchStartY = e.touches[0].clientY;
  }, { passive: false });

  handle.addEventListener('touchend', async (e) => {
    if (!touchClone) return;
    const cloneCenterY = parseFloat(touchClone.style.top) + touchClone.offsetHeight / 2;
    touchClone.remove(); touchClone = null;
    el.style.opacity = '';

    let targetIdx = null;
    document.querySelectorAll(`.todo-item[data-cat="${cat.id}"]`).forEach(itemEl => {
      const r = itemEl.getBoundingClientRect();
      if (cloneCenterY >= r.top && cloneCenterY <= r.bottom) targetIdx = parseInt(itemEl.dataset.idx);
    });

    if (targetIdx === null || targetIdx === dragSrcIdx) return;
    const todos = loadTodos(selectedDate);
    const items = todos[cat.id] || [];
    const [moved] = items.splice(dragSrcIdx, 1);
    items.splice(targetIdx, 0, moved);
    todos[cat.id] = items;
    await saveTodos(selectedDate, todos);
    renderList();
  });

  return el;
}

function renderList() {
  const cats = loadCats(), todos = loadTodos(selectedDate);
  const [sy, sm, sd] = selectedDate.split('-').map(Number);
  const d = new Date(sy, sm - 1, sd);
  document.getElementById('todo-selected-date').textContent =
    `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  const container = document.getElementById('todo-cat-list');
  container.innerHTML = '';

  if (cats.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:#B0B8C1;text-align:center;padding:32px 0;">⚙️ 버튼으로 카테고리를 추가해보세요</p>';
    return;
  }

  cats.forEach(cat => {
    const items = todos[cat.id] || [];
    const catEl = document.createElement('div');
    catEl.className = 'todo-category';

    // header
    const header = document.createElement('div');
    header.className = 'todo-cat-header';
    header.innerHTML = `<span class="todo-cat-name" style="color:${cat.color}">${cat.name}</span>`;
    const addBtn = document.createElement('button');
    addBtn.className = 'todo-cat-add';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => addInlineItem(cat.id));
    header.appendChild(addBtn);
    catEl.appendChild(header);

    // items
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'todo-empty';
      empty.textContent = '아직 할 일이 없어요';
      catEl.appendChild(empty);
    } else {
      items.forEach((item, idx) => {
        catEl.appendChild(makeTodoItemEl(item, idx, cat));
      });
    }

    // inline input
    const inlineWrap = document.createElement('div');
    inlineWrap.className = 'todo-inline-input-wrap';
    inlineWrap.id = `inline-${cat.id}`;
    inlineWrap.style.display = 'none';
    inlineWrap.innerHTML = `<div class="todo-item" style="border-top:1px solid var(--border-default);"><div style="width:20px;min-width:20px;"></div><input class="todo-item-input" id="inline-input-${cat.id}" type="text" placeholder="할 일 입력 후 Enter"></div>`;
    catEl.appendChild(inlineWrap);

    container.appendChild(catEl);
  });
}

// ── Actions ──
window.editTodoText = (el, catId, idx) => {
  if (el.querySelector('input')) return;
  const original = el.textContent;
  const input = document.createElement('input');
  input.type = 'text'; input.value = original; input.className = 'todo-item-input';
  el.textContent = ''; el.appendChild(input); input.focus();
  const save = async () => {
    const newText = input.value.trim();
    if (newText && newText !== original) {
      const todos = loadTodos(selectedDate);
      if (todos[catId]?.[idx]) { todos[catId][idx].text = newText; await saveTodos(selectedDate, todos); }
    }
    renderList();
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = original; input.blur(); }
  });
};

window.toggleTodo = async (catId, idx) => {
  const todos = loadTodos(selectedDate);
  if (!todos[catId]) return;
  todos[catId][idx].done = !todos[catId][idx].done;
  await saveTodos(selectedDate, todos);
  renderList(); renderCal();
};

window.deleteTodo = async (catId, idx) => {
  const todos = loadTodos(selectedDate);
  if (!todos[catId]) return;
  todos[catId].splice(idx, 1);
  await saveTodos(selectedDate, todos);
  renderList(); renderCal();
};

window.addInlineItem = (catId) => {
  const wrap = document.getElementById(`inline-${catId}`);
  const input = document.getElementById(`inline-input-${catId}`);
  if (!wrap || !input) return;
  wrap.style.display = '';
  input.value = '';
  input.focus();
  input.onkeydown = async (e) => {
    if (e.key === 'Enter') {
      input.onkeydown = null;
      const text = input.value.trim();
      if (text) {
        const todos = loadTodos(selectedDate);
        if (!todos[catId]) todos[catId] = [];
        todos[catId].push({ text, done: false });
        await saveTodos(selectedDate, todos);
      }
      renderList(); renderCal();
    }
    if (e.key === 'Escape') {
      input.onkeydown = null;
      wrap.style.display = 'none';
    }
  };
};

window.changeTodoMonth = (dir) => {
  calMonth.setMonth(calMonth.getMonth() + dir);
  syncTodosForMonth(calMonth.getFullYear(), calMonth.getMonth()).then(renderCal);
};

window.goToTodayTodo = () => {
  selectedDate = todayStr;
  calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCal(); renderList();
};

// ── Category Settings ──
window.openCatSettings = () => { renderCatSettings(); document.getElementById('cat-settings-modal').classList.add('open'); };
window.closeCatSettings = () => document.getElementById('cat-settings-modal').classList.remove('open');

function renderCatSettings() {
  const cats = loadCats();
  document.getElementById('cat-list-settings').innerHTML = cats.length === 0
    ? '<p style="font-size:13px;color:#aaa;text-align:center;padding:12px 0;">카테고리가 없어요</p>'
    : cats.map(c => `<div class="tag-list-item">
        <span class="tag-chip" style="background:${c.color}20;color:${c.color};border-color:${c.color}40">${c.name}</span>
        <div style="display:flex;gap:6px;">
          <button class="tag-action-btn" onclick="editCat('${c.id}')">수정</button>
          <button class="tag-action-btn danger" onclick="deleteCat('${c.id}')">삭제</button>
        </div>
      </div>`).join('');
}

window.openAddCat = () => {
  document.getElementById('cat-form-title').textContent = '카테고리 추가';
  document.getElementById('cat-name-input').value = '';
  document.getElementById('cat-edit-id').value = '';
  document.getElementById('cat-selected-color').value = '';
  renderCatPalette(null);
  document.getElementById('cat-form').style.display = '';
};

window.editCat = (id) => {
  const cat = loadCats().find(c => c.id === id);
  if (!cat) return;
  document.getElementById('cat-form-title').textContent = '카테고리 수정';
  document.getElementById('cat-name-input').value = cat.name;
  document.getElementById('cat-edit-id').value = id;
  document.getElementById('cat-selected-color').value = cat.color;
  renderCatPalette(cat.color);
  document.getElementById('cat-form').style.display = '';
};

window.deleteCat = async (id) => {
  await saveCats(loadCats().filter(c => c.id !== id));
  renderCatSettings(); renderList();
};

function renderCatPalette(selected) {
  document.getElementById('cat-color-palette').innerHTML = CAT_PALETTE.map(c =>
    `<div class="color-swatch ${selected===c?'selected':''}" style="background:${c}" onclick="selectCatColor('${c}')"></div>`
  ).join('');
}

window.selectCatColor = (color) => {
  document.getElementById('cat-selected-color').value = color;
  renderCatPalette(color);
};

window.saveCat = async () => {
  const name = document.getElementById('cat-name-input').value.trim();
  const color = document.getElementById('cat-selected-color').value;
  const editId = document.getElementById('cat-edit-id').value;
  if (!name || !color) { alert('이름과 색상을 모두 선택해주세요.'); return; }
  const cats = loadCats();
  if (editId) { const i = cats.findIndex(c => c.id === editId); if (i > -1) cats[i] = { id: editId, name, color }; }
  else cats.push({ id: Date.now().toString(), name, color });
  await saveCats(cats);
  document.getElementById('cat-form').style.display = 'none';
  renderCatSettings(); renderList();
};

// ── Init ──
async function init() {
  await syncCats();
  await syncTodosForMonth(calMonth.getFullYear(), calMonth.getMonth());
  renderCal(); renderList();
}
init();
