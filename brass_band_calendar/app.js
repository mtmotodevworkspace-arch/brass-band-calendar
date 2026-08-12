/**
 * 吹奏楽専用カレンダー Web App メインロジック (Brass Band Practice Calendar App - Permanent Storage)
 */

import { INITIAL_PRACTICE_DATA, MASTER_REPERTOIRE } from './sample-data.js';

// Global State
let practices = [];
let repertoire = [];
let currentDate = new Date();
let currentView = 'month'; // 'month' | 'week' | 'day' | 'timetable' | 'repertoire'
let selectedCategory = 'all';
let selectedDateForMobileSheet = null;
let activePracticeForExport = null;
let highestZIndex = 5000;

// Permanent Storage Keys
const PERMANENT_STORAGE_KEY_PRACTICES = 'brass_band_calendar_practices_permanent';
const PERMANENT_STORAGE_KEY_REPERTOIRE = 'brass_band_calendar_repertoire_permanent';

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  setupEventListeners();
  setupZIndexLayerManagement();
  render();
});

/* ==========================================================================
   Storage & Initialization (データ移行 & 永久保持ロジック)
   ========================================================================== */
function initStorage() {
  let loadedPractices = null;
  let loadedRepertoire = null;

  // Search across all key versions to retrieve user's past edits
  const practiceKeys = [
    PERMANENT_STORAGE_KEY_PRACTICES,
    'brass_band_calendar_practices_v5',
    'brass_band_calendar_practices_v4',
    'brass_band_calendar_practices_v3',
    'brass_band_calendar_practices_v2',
    'brass_band_calendar_practices_v1',
    'brass_band_calendar_practices'
  ];

  for (const key of practiceKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedPractices = parsed;
          break;
        }
      }
    } catch (e) {
      console.warn('Practice parse error on key:', key, e);
    }
  }

  const repertoireKeys = [
    PERMANENT_STORAGE_KEY_REPERTOIRE,
    'brass_band_calendar_repertoire_v5',
    'brass_band_calendar_repertoire_v4',
    'brass_band_calendar_repertoire_v3',
    'brass_band_calendar_repertoire_v2',
    'brass_band_calendar_repertoire_v1',
    'brass_band_calendar_repertoire'
  ];

  for (const key of repertoireKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedRepertoire = parsed;
          break;
        }
      }
    } catch (e) {
      console.warn('Repertoire parse error on key:', key, e);
    }
  }

  practices = loadedPractices || JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
  repertoire = loadedRepertoire || JSON.parse(JSON.stringify(MASTER_REPERTOIRE));

  // Merge sample repertoire if any new default songs exist without overwriting user edits
  if (Array.isArray(loadedRepertoire)) {
    MASTER_REPERTOIRE.forEach(defaultSong => {
      const exists = repertoire.some(s => s.id === defaultSong.id || s.title === defaultSong.title);
      if (!exists) {
        repertoire.push(JSON.parse(JSON.stringify(defaultSong)));
      }
    });
  }

  saveToStorage();
}

function saveToStorage() {
  try {
    localStorage.setItem(PERMANENT_STORAGE_KEY_PRACTICES, JSON.stringify(practices));
    localStorage.setItem(PERMANENT_STORAGE_KEY_REPERTOIRE, JSON.stringify(repertoire));

    // Also mirror to legacy keys for compatibility across all tabs/versions
    ['v5', 'v4', 'v3'].forEach(v => {
      localStorage.setItem(`brass_band_calendar_practices_${v}`, JSON.stringify(practices));
      localStorage.setItem(`brass_band_calendar_repertoire_${v}`, JSON.stringify(repertoire));
    });
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
}

/* ==========================================================================
   Z-Index Layer Management (最前面表示制御)
   ========================================================================== */
function bringToFront(el) {
  if (!el) return;
  highestZIndex += 20;
  el.style.zIndex = highestZIndex;
  
  const content = el.querySelector('.modal-content');
  if (content) {
    content.style.zIndex = highestZIndex + 1;
  }
}

function setupZIndexLayerManagement() {
  document.addEventListener('click', (e) => {
    const backdrop = e.target.closest('.modal-backdrop');
    if (backdrop && backdrop.classList.contains('active')) {
      bringToFront(backdrop);
    }

    const card = e.target.closest('.practice-card, .repertoire-card, .glass-panel');
    if (card && !e.target.closest('.modal-backdrop')) {
      bringToFront(card);
    }
  }, true);
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */
function setupEventListeners() {
  // Navigation buttons
  document.getElementById('btnPrev').addEventListener('click', () => navigateDate(-1));
  document.getElementById('btnNext').addEventListener('click', () => navigateDate(1));
  document.getElementById('btnToday').addEventListener('click', () => {
    currentDate = new Date();
    selectedDateForMobileSheet = formatDate(currentDate);
    render();
  });

  // View switch tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentView = e.currentTarget.dataset.view;
      render();
    });
  });

  // Category Filter Chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedCategory = e.currentTarget.dataset.cat;
      render();
    });
  });

  // Modal Triggers
  document.getElementById('btnAddPractice').addEventListener('click', () => openPracticeModal());
  document.getElementById('btnBackup').addEventListener('click', () => openModal('backupModal'));
  document.getElementById('btnRepertoireLibrary').addEventListener('click', openRepertoireModal);
  
  // Bulk Export Triggers
  document.getElementById('btnBulkExport').addEventListener('click', openBulkExportModal);
  document.getElementById('btnControlsBulkExport').addEventListener('click', openBulkExportModal);

  // New Song Triggers
  document.getElementById('btnAddNewSong').addEventListener('click', () => openEditSongModal());
  document.getElementById('btnModalAddNewSong').addEventListener('click', () => openEditSongModal());

  // Close buttons for modals
  document.querySelectorAll('.close-modal-btn, [data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.close || e.currentTarget.closest('.modal-backdrop').id;
      closeModal(modalId);
    });
  });

  // Dynamic Row adders
  document.getElementById('btnAddPieceRow').addEventListener('click', () => addPieceInputRow());
  document.getElementById('btnAddTimetableRow').addEventListener('click', () => addTimetableInputRow());
  document.getElementById('btnAddSongVideoRow').addEventListener('click', () => addSongVideoInputRow());

  // Form Submits
  document.getElementById('practiceForm').addEventListener('submit', handlePracticeSubmit);
  document.getElementById('editSongForm').addEventListener('submit', handleEditSongSubmit);

  // Backup / Data Management
  document.getElementById('btnExportJson').addEventListener('click', exportDataAsJson);
  document.getElementById('btnImportJson').addEventListener('click', () => document.getElementById('importJsonFile').click());
  document.getElementById('importJsonFile').addEventListener('change', importDataFromJson);
  document.getElementById('btnResetData').addEventListener('click', resetToSampleData);

  // Calendar Export & LINE Sharing handlers
  document.getElementById('btnLineShare').addEventListener('click', shareToLine);
  document.getElementById('btnCopyLineText').addEventListener('click', copyLineTextToClipboard);
  document.getElementById('btnDownloadIcs').addEventListener('click', downloadIcsFile);
  document.getElementById('btnTimeTreeShare').addEventListener('click', shareTimeTreeFormat);

  // Song delete button
  document.getElementById('btnDeleteSong').addEventListener('click', handleDeleteSong);

  // Bulk Export Modal Events
  document.getElementById('btnPresetThisMonth').addEventListener('click', () => setBulkPreset('thisMonth'));
  document.getElementById('btnPresetNextMonth').addEventListener('click', () => setBulkPreset('nextMonth'));
  document.getElementById('btnPresetAugSep').addEventListener('click', () => setBulkPreset('augSep'));
  document.getElementById('btnPresetAll').addEventListener('click', () => setBulkPreset('all'));

  document.getElementById('bulkStartDate').addEventListener('change', updateBulkExportCount);
  document.getElementById('bulkEndDate').addEventListener('change', updateBulkExportCount);

  document.getElementById('btnBulkDownloadIcs').addEventListener('click', downloadBulkIcsFile);
  document.getElementById('btnBulkLineShare').addEventListener('click', shareBulkToLine);
  document.getElementById('btnBulkLineCopy').addEventListener('click', copyBulkLineTextToClipboard);
  document.getElementById('btnBulkTimeTreeShare').addEventListener('click', copyBulkLineTextToClipboard);
}

/* ==========================================================================
   Navigation Logic
   ========================================================================== */
function navigateDate(direction) {
  if (currentView === 'month') {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else if (currentView === 'week') {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
  } else {
    currentDate.setDate(currentDate.getDate() + direction);
  }
  render();
}

/* ==========================================================================
   Render Orchestrator
   ========================================================================== */
function render() {
  updatePeriodTitleText();

  document.getElementById('monthView').style.display = 'none';
  document.getElementById('weekView').style.display = 'none';
  document.getElementById('dayView').style.display = 'none';
  document.getElementById('timetableContainer').style.display = 'none';
  document.getElementById('repertoireViewPanel').style.display = 'none';

  if (currentView === 'month') {
    document.getElementById('monthView').style.display = 'block';
    renderMonthView();
  } else if (currentView === 'week') {
    document.getElementById('weekView').style.display = 'block';
    renderWeekView();
  } else if (currentView === 'day') {
    document.getElementById('dayView').style.display = 'block';
    renderDayView();
  } else if (currentView === 'timetable') {
    document.getElementById('timetableContainer').style.display = 'block';
    renderTimetableContainer();
  } else if (currentView === 'repertoire') {
    document.getElementById('repertoireViewPanel').style.display = 'block';
    renderRepertoireMainPanel();
  }
}

function updatePeriodTitleText() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth() + 1;
  const d = currentDate.getDate();

  const periodTextEl = document.getElementById('currentPeriodText');
  if (currentView === 'month') {
    periodTextEl.textContent = `${y}年 ${m}月`;
  } else if (currentView === 'week') {
    const weekStart = getWeekStartDate(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    periodTextEl.textContent = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  } else if (currentView === 'repertoire') {
    periodTextEl.textContent = `全${repertoire.length}曲 演奏プログラム`;
  } else {
    periodTextEl.textContent = `${y}年 ${m}月 ${d}日`;
  }
}

/* ==========================================================================
   View 1 & 2: Month & Week Views (Mobile Day Preview Sheet Included)
   ========================================================================== */
function renderMonthView() {
  const monthPanel = document.getElementById('monthView');
  monthPanel.innerHTML = `
    <div class="calendar-month-grid">
      <div class="weekday-header sun">日</div>
      <div class="weekday-header">月</div>
      <div class="weekday-header">火</div>
      <div class="weekday-header">水</div>
      <div class="weekday-header">木</div>
      <div class="weekday-header">金</div>
      <div class="weekday-header sat">土</div>
    </div>
    <div id="mobileDaySheetContainer"></div>
  `;

  const monthGrid = monthPanel.querySelector('.calendar-month-grid');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const todayStr = formatDate(new Date());
  if (!selectedDateForMobileSheet) {
    selectedDateForMobileSheet = todayStr;
  }

  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevLastDate - i + 1;
    const cell = createDayCell(dayNum, true);
    monthGrid.appendChild(cell);
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDateForMobileSheet;
    
    let dayEvents = practices.filter(p => p.date === dateStr);
    if (selectedCategory !== 'all') {
      dayEvents = dayEvents.filter(p => p.category === selectedCategory);
    }

    const cell = createDayCell(day, false, isToday, dateStr, dayEvents, isSelected);
    monthGrid.appendChild(cell);
  }

  const totalCellsSoFar = firstDayIndex + lastDate;
  const nextDaysNeeded = (totalCellsSoFar > 35 ? 42 : 35) - totalCellsSoFar;
  for (let j = 1; j <= nextDaysNeeded; j++) {
    const cell = createDayCell(j, true);
    monthGrid.appendChild(cell);
  }

  renderMobileDaySheet();
}

function createDayCell(dayNumber, isOtherMonth, isToday = false, dateStr = null, dayEvents = [], isSelected = false) {
  const cell = document.createElement('div');
  cell.className = `calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
  
  if (dateStr) {
    cell.dataset.date = dateStr;
    cell.addEventListener('click', () => {
      selectedDateForMobileSheet = dateStr;
      currentDate = new Date(dateStr);
      renderMonthView();
    });
  }

  const numberRow = document.createElement('div');
  numberRow.className = 'day-number-row';
  numberRow.innerHTML = `<span class="day-number">${dayNumber}</span>`;
  cell.appendChild(numberRow);

  const eventsList = document.createElement('div');
  eventsList.className = 'events-list';

  dayEvents.forEach(evt => {
    const badge = document.createElement('div');
    badge.className = `event-badge badge-${evt.category}`;
    badge.innerHTML = `🎵 <span>${escapeHtml(evt.title)}</span>`;
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(evt.id);
    });
    eventsList.appendChild(badge);
  });

  cell.appendChild(eventsList);
  return cell;
}

function renderMobileDaySheet() {
  const sheetContainer = document.getElementById('mobileDaySheetContainer');
  if (!sheetContainer) return;

  const targetDateStr = selectedDateForMobileSheet || formatDate(currentDate);
  let dayEvents = practices.filter(p => p.date === targetDateStr);

  if (selectedCategory !== 'all') {
    dayEvents = dayEvents.filter(p => p.category === selectedCategory);
  }

  if (dayEvents.length === 0) {
    sheetContainer.innerHTML = `
      <div class="mobile-day-sheet" style="text-align: center; color: var(--text-muted);">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--color-brass-light);">📅 ${targetDateStr} の予定</div>
        <p style="font-size: 0.8rem; margin-top: 6px;">この日の練習予定はありません。</p>
      </div>
    `;
    return;
  }

  sheetContainer.innerHTML = `
    <div class="mobile-day-sheet">
      <div style="font-size: 1rem; font-weight: 700; color: var(--color-brass-light); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span>📅 ${targetDateStr} の練習詳細</span>
        <button class="btn-glass btn-sm" onclick="document.querySelectorAll('.tab-btn[data-view=\\'day\\']')[0].click()">日表示で開く ➔</button>
      </div>
      ${dayEvents.map(evt => renderPracticeCardHtml(evt)).join('')}
    </div>
  `;

  attachPracticeCardEvents(sheetContainer);
}

function renderWeekView() {
  const weekGrid = document.querySelector('.week-view-grid');
  weekGrid.innerHTML = '';

  const weekStart = getWeekStartDate(currentDate);

  for (let i = 0; i < 7; i++) {
    const colDate = new Date(weekStart);
    colDate.setDate(colDate.getDate() + i);
    const dateStr = formatDate(colDate);
    const dayName = ['日', '月', '火', '水', '木', '金', '土'][colDate.getDay()];
    const isToday = dateStr === formatDate(new Date());

    let dayEvents = practices.filter(p => p.date === dateStr);
    if (selectedCategory !== 'all') {
      dayEvents = dayEvents.filter(p => p.category === selectedCategory);
    }

    const col = document.createElement('div');
    col.className = `week-day-column ${isToday ? 'today' : ''}`;
    col.innerHTML = `
      <div class="week-column-header">
        <div class="day-name">${dayName}</div>
        <div class="day-num">${colDate.getDate()}</div>
      </div>
    `;

    dayEvents.forEach(evt => {
      const card = document.createElement('div');
      card.className = `practice-card glass-panel`;
      card.dataset.cat = evt.category;
      card.style.padding = '12px';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="event-badge badge-${evt.category}" style="margin-bottom: 6px;">${evt.category}</div>
        <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">${escapeHtml(evt.title)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">📍 ${escapeHtml(evt.locationName || '場所未定')}</div>
      `;
      card.addEventListener('click', () => openDetailModal(evt.id));
      col.appendChild(card);
    });

    weekGrid.appendChild(col);
  }
}

/* ==========================================================================
   View 3 & 4: Day & Timetable Views
   ========================================================================== */
function renderDayView() {
  const container = document.getElementById('dayViewContent');
  const dateStr = formatDate(currentDate);

  let dayEvents = practices.filter(p => p.date === dateStr);
  if (selectedCategory !== 'all') {
    dayEvents = dayEvents.filter(p => p.category === selectedCategory);
  }

  if (dayEvents.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 16px;">📅</div>
        <h3>この日の練習予定はありません</h3>
        <p style="margin-top: 8px;">「+ 練習登録」ボタンから新しい練習を追加できます。</p>
      </div>
    `;
    return;
  }

  container.innerHTML = dayEvents.map(evt => renderPracticeCardHtml(evt)).join('');
  attachPracticeCardEvents(container);
}

function renderTimetableContainer() {
  const container = document.getElementById('timetableContent');

  let filtered = [...practices];
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }

  filtered.sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 16px;">📋</div>
        <h3>表示できる練習時間割がありません</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(evt => renderPracticeCardHtml(evt, true)).join('');
  attachPracticeCardEvents(container);
}

/* ==========================================================================
   View 5: Repertoire Library Views & Song Edit CRUD
   ========================================================================== */
function renderRepertoireMainPanel() {
  const container = document.getElementById('repertoireMainContent');
  container.innerHTML = renderRepertoireCardsHtml(repertoire);
  attachRepertoireEvents(container);
}

function openRepertoireModal() {
  const listContainer = document.getElementById('repertoireLibraryList');
  if (!repertoire || repertoire.length === 0) {
    repertoire = JSON.parse(JSON.stringify(MASTER_REPERTOIRE));
    saveToStorage();
  }

  listContainer.innerHTML = renderRepertoireCardsHtml(repertoire);
  attachRepertoireEvents(listContainer);

  openModal('repertoireModal');
}

function renderRepertoireCardsHtml(songList) {
  if (!songList || songList.length === 0) {
    return `<div style="padding: 20px; text-align: center; color: var(--text-muted);">曲目が登録されていません。</div>`;
  }

  return songList.map(song => {
    const videoBtnsHtml = (song.videos || []).map((v, idx) => `
      <button class="btn-glass btn-sm btn-yt-highlight btn-play-rep-video" data-songid="${song.id}" data-vididx="${idx}">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)}
      </button>
    `).join('');

    return `
      <div class="repertoire-card" id="rep-card-${song.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
          <div>
            <span class="section-tag section-${song.section}">${song.section} ${song.no !== 'OP' ? 'No.' + song.no : 'OP'}</span>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">🎼 ${escapeHtml(song.title)}</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(song.composer || '')}</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border);">
              👨‍🏫 指揮: <strong>${escapeHtml(song.conductor || '未定')}</strong>
            </div>
            <button class="btn-glass btn-sm btn-edit-song" data-songid="${song.id}" style="padding: 4px 10px; font-weight: 700;">
              ✏️ 編集
            </button>
          </div>
        </div>

        ${song.points ? `
          <div class="piece-points" style="font-size: 0.85rem; padding: 10px; margin-top: 8px;">
            ${escapeHtml(song.points)}
          </div>
        ` : ''}

        ${videoBtnsHtml ? `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
            ${videoBtnsHtml}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function attachRepertoireEvents(container) {
  container.querySelectorAll('.btn-play-rep-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const songId = e.currentTarget.dataset.songid;
      const vidIdx = parseInt(e.currentTarget.dataset.vididx, 10);
      const song = repertoire.find(s => s.id === songId);
      if (song && song.videos && song.videos[vidIdx]) {
        openYoutubeMultiVideoModal(song.title, song.videos, vidIdx);
      }
    });
  });

  container.querySelectorAll('.btn-edit-song').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const songId = e.currentTarget.dataset.songid;
      openEditSongModal(songId);
    });
  });
}

/* ==========================================================================
   Repertoire Song & YouTube Video CRUD Modal Logic
   ========================================================================== */
function openEditSongModal(songId = null) {
  const form = document.getElementById('editSongForm');
  form.reset();

  const container = document.getElementById('songVideosInputsContainer');
  container.innerHTML = '';

  const deleteBtn = document.getElementById('btnDeleteSong');

  if (songId) {
    const song = repertoire.find(s => s.id === songId);
    if (song) {
      document.getElementById('editSongModalTitle').innerHTML = '✏️ 演奏曲目 & 指揮者・動画の編集';
      document.getElementById('editSongId').value = song.id;
      document.getElementById('editSongSection').value = song.section || '第1部';
      document.getElementById('editSongNo').value = song.no || '';
      document.getElementById('editSongTitle').value = song.title || '';
      document.getElementById('editSongComposer').value = song.composer || '';
      document.getElementById('editSongConductor').value = song.conductor || '';
      document.getElementById('editSongPoints').value = song.points || '';

      deleteBtn.style.display = 'inline-flex';

      (song.videos || []).forEach(v => addSongVideoInputRow(v));
    }
  } else {
    document.getElementById('editSongModalTitle').innerHTML = '➕ 新しい演奏曲目の追加';
    document.getElementById('editSongId').value = '';
    document.getElementById('editSongSection').value = '第1部';
    document.getElementById('editSongNo').value = String(repertoire.length + 1);
    deleteBtn.style.display = 'none';

    addSongVideoInputRow();
  }

  openModal('editSongModal');
  const editModal = document.getElementById('editSongModal');
  bringToFront(editModal);
}

function addSongVideoInputRow(video = {}) {
  const container = document.getElementById('songVideosInputsContainer');
  const row = document.createElement('div');
  row.className = 'video-input-row';
  row.innerHTML = `
    <button type="button" class="btn-remove-piece" title="削除">&times;</button>
    <div class="form-row">
      <div class="form-group" style="margin-bottom: 6px;">
        <label>動画タイトル / 演奏者ラベル</label>
        <input type="text" class="form-control video-title-input" value="${escapeHtml(video.title || '')}" placeholder="例: 一流吹奏楽団 名演音源">
      </div>
      <div class="form-group" style="margin-bottom: 6px;">
        <label>YouTube URL または検索タグ</label>
        <input type="text" class="form-control video-url-input" value="${escapeHtml(video.url || '')}" placeholder="https://www.youtube.com/watch?v=...">
      </div>
    </div>
  `;

  row.querySelector('.btn-remove-piece').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function handleEditSongSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('editSongId').value || 'rep-' + Date.now();
  const section = document.getElementById('editSongSection').value;
  const no = document.getElementById('editSongNo').value;
  const title = document.getElementById('editSongTitle').value;
  const composer = document.getElementById('editSongComposer').value;
  const conductor = document.getElementById('editSongConductor').value;
  const points = document.getElementById('editSongPoints').value;

  const videos = [];
  document.querySelectorAll('#songVideosInputsContainer .video-input-row').forEach(row => {
    const vTitle = row.querySelector('.video-title-input').value.trim();
    const vUrl = row.querySelector('.video-url-input').value.trim();
    if (vTitle || vUrl) {
      videos.push({
        title: vTitle || `${title} 演奏動画`,
        url: vUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 吹奏楽')}`
      });
    }
  });

  const updatedSong = {
    id,
    section,
    no,
    title,
    composer,
    conductor,
    points,
    videos
  };

  const existingIdx = repertoire.findIndex(s => s.id === id);
  if (existingIdx >= 0) {
    repertoire[existingIdx] = updatedSong;
  } else {
    repertoire.push(updatedSong);
  }

  saveToStorage();
  closeModal('editSongModal');
  render();

  const repModal = document.getElementById('repertoireModal');
  if (repModal && repModal.classList.contains('active')) {
    openRepertoireModal();
  }
}

function handleDeleteSong() {
  const id = document.getElementById('editSongId').value;
  if (!id) return;

  const song = repertoire.find(s => s.id === id);
  if (song && confirm(`曲目「${song.title}」をライブラリから削除しますか？`)) {
    repertoire = repertoire.filter(s => s.id !== id);
    saveToStorage();
    closeModal('editSongModal');
    render();

    const repModal = document.getElementById('repertoireModal');
    if (repModal && repModal.classList.contains('active')) {
      openRepertoireModal();
    }
  }
}

/* ==========================================================================
   Practice Cards Renderer & Timetable Multi-Song Direct YouTube Feature
   ========================================================================== */
function renderPracticeCardHtml(practice, showDateBadge = false) {
  const mapUrl = getGoogleMapsUrl(practice.locationName, practice.locationAddress);

  const piecesHtml = (practice.pieces || []).map(piece => {
    const matchedRepSong = repertoire.find(s => s.title === piece.title);
    let videos = piece.videos && piece.videos.length > 0 ? [...piece.videos] : [];
    if (videos.length === 0 && matchedRepSong && matchedRepSong.videos) {
      videos = [...matchedRepSong.videos];
    }
    if (videos.length === 0) {
      videos = [{ title: `${piece.title} 吹奏楽参考音源`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(piece.title + ' 吹奏楽')}` }];
    }
    
    const videoTabsHtml = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
        ${videos.map((v, idx) => `
          <button class="btn-glass btn-sm btn-yt-highlight btn-play-card-video" data-songtitle="${escapeHtml(piece.title)}" data-piece-json='${JSON.stringify(videos).replace(/'/g, "&apos;")}' data-idx="${idx}">
            🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)}
          </button>
        `).join('')}
      </div>
    `;

    return `
      <div class="piece-card">
        <div class="piece-header">
          <span class="piece-title">🎼 ${escapeHtml(piece.title || '無題の曲')}</span>
          ${piece.conductor ? `<span class="piece-conductor">👨‍🏫 指導: ${escapeHtml(piece.conductor)}</span>` : ''}
        </div>
        ${piece.points ? `<div class="piece-points">${escapeHtml(piece.points)}</div>` : ''}
        ${videoTabsHtml}
      </div>
    `;
  }).join('');

  const timetableHtml = (practice.timetable || []).map(slot => {
    const assignedSongs = (slot.pieceIds || []).map(songId => repertoire.find(s => s.id === songId)).filter(Boolean);

    const slotSongsHtml = assignedSongs.map(song => {
      const vList = song.videos || [];
      const ytBtn = `
        <button class="btn-glass btn-sm btn-yt-highlight btn-play-slot-video" data-songtitle="${escapeHtml(song.title)}" data-videos='${JSON.stringify(vList).replace(/'/g, "&apos;")}' style="padding: 4px 10px; font-size: 0.78rem;">
          🎬 YouTube再生
        </button>
      `;

      return `
        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(229,193,88,0.14); border: 1px solid var(--glass-border-gold); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-top: 4px; flex-wrap: wrap;">
          <span>🎼 <strong>${escapeHtml(song.title)}</strong></span>
          ${ytBtn}
        </div>
      `;
    }).join(' ');

    return `
      <div class="time-slot-item">
        <div class="time-slot-time">⏰ ${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)}</div>
        <div class="event-badge badge-${slot.category || 'その他'}">${escapeHtml(slot.category || '区分')}</div>
        <div class="time-slot-desc">
          <strong>${escapeHtml(slot.title || '')}</strong> ${slot.details ? `<span style="color: var(--text-muted);">(${escapeHtml(slot.details)})</span>` : ''}
          ${slotSongsHtml ? `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px;">${slotSongsHtml}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="practice-card glass-panel" data-cat="${practice.category}" id="card-${practice.id}">
      <div class="card-header-main">
        <div class="card-title-group">
          <h2 style="font-size: 1.15rem;">${escapeHtml(practice.title)}</h2>
          ${showDateBadge ? `<div style="font-size: 0.88rem; color: var(--color-brass-light); font-weight: 700; margin-top: 2px;">📅 ${practice.date}</div>` : ''}
        </div>
        <div class="card-meta-badges">
          <span class="event-badge badge-${practice.category}">${practice.category}</span>
        </div>
      </div>

      <div class="card-meta-row" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.85rem;">
        ${practice.locationName ? `
          <div class="meta-item">
            📍 <span>${escapeHtml(practice.locationName)}</span>
            <a href="${mapUrl}" target="_blank" class="btn-glass btn-sm" style="margin-left: 6px; padding: 2px 8px; font-size: 0.75rem;">
              🗺️ Map
            </a>
          </div>
        ` : ''}
        ${practice.conductors ? `<div class="meta-item">👨‍🏫 指揮: ${escapeHtml(practice.conductors)}</div>` : ''}
      </div>

      ${piecesHtml ? `
        <div class="pieces-section" style="margin-top: 12px;">
          <div class="section-title" style="font-size: 0.88rem; color: var(--color-brass-light); font-weight: 700;">🎼 練習曲 & 参考音源 (YouTube)</div>
          ${piecesHtml}
        </div>
      ` : ''}

      ${timetableHtml ? `
        <div class="timetable-slots">
          <div class="section-title" style="margin-top: 14px; font-size: 0.88rem; color: var(--color-brass-light); font-weight: 700;">⏱️ 練習時間割</div>
          ${timetableHtml}
        </div>
      ` : ''}

      ${practice.generalNotes ? `
        <div style="margin-top: 12px; padding: 10px; background: rgba(229,193,88,0.08); border-radius: var(--radius-sm); border: 1px dashed var(--glass-border-gold); font-size: 0.82rem; color: var(--text-secondary);">
          ℹ️ ${escapeHtml(practice.generalNotes)}
        </div>
      ` : ''}

      <div class="card-actions-bar" style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
        <button class="btn-glass btn-sm btn-share-practice" data-id="${practice.id}">
          📲 LINE共有
        </button>
        <button class="btn-glass btn-sm btn-edit-practice" data-id="${practice.id}" style="margin-left: auto; font-weight: 700;">
          ✏️ 編集
        </button>
        <button class="btn-glass btn-sm btn-delete-practice" data-id="${practice.id}" style="color: #f43f5e; border-color: rgba(244,63,94,0.3);">
          🗑️ 削除
        </button>
      </div>
    </div>
  `;
}

function attachPracticeCardEvents(container) {
  container.querySelectorAll('.btn-play-card-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const songTitle = e.currentTarget.dataset.songtitle;
      const videos = JSON.parse(e.currentTarget.dataset.pieceJson);
      const activeIdx = parseInt(e.currentTarget.dataset.idx, 10);
      openYoutubeMultiVideoModal(songTitle, videos, activeIdx);
    });
  });

  container.querySelectorAll('.btn-play-slot-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const songTitle = e.currentTarget.dataset.songtitle;
      const videos = JSON.parse(e.currentTarget.dataset.videos);
      openYoutubeMultiVideoModal(songTitle, videos, 0);
    });
  });

  container.querySelectorAll('.btn-share-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openExportModal(id);
    });
  });

  container.querySelectorAll('.btn-edit-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openPracticeModal(id);
    });
  });

  container.querySelectorAll('.btn-delete-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('この練習予定を削除しますか？')) {
        practices = practices.filter(p => p.id !== id);
        saveToStorage();
        render();
      }
    });
  });
}

/* ==========================================================================
   Practice Form CRUD & Timetable Multi-Song Checkbox Selector
   ========================================================================== */
function openModal(modalId) {
  const modalEl = document.getElementById(modalId);
  modalEl.classList.add('active');
  bringToFront(modalEl);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (modalId === 'detailModal') {
    document.getElementById('detailModalBody').innerHTML = '';
  }
}

function openPracticeModal(id = null) {
  const form = document.getElementById('practiceForm');
  form.reset();

  document.getElementById('piecesInputsContainer').innerHTML = '';
  document.getElementById('timetableInputsContainer').innerHTML = '';

  if (id) {
    const p = practices.find(item => item.id === id);
    if (p) {
      document.getElementById('modalTitle').innerHTML = '✏️ 練習スケジュールの編集';
      document.getElementById('practiceId').value = p.id;
      document.getElementById('inputDate').value = p.date;
      document.getElementById('inputCategory').value = p.category;
      document.getElementById('inputTitle').value = p.title;
      document.getElementById('inputLocationName').value = p.locationName || '';
      document.getElementById('inputLocationAddress').value = p.locationAddress || '';
      document.getElementById('inputConductors').value = p.conductors || '';
      document.getElementById('inputGeneralNotes').value = p.generalNotes || '';

      (p.pieces || []).forEach(piece => addPieceInputRow(piece));
      (p.timetable || []).forEach(slot => addTimetableInputRow(slot));
    }
  } else {
    document.getElementById('modalTitle').innerHTML = '📅 練習スケジュールの登録';
    document.getElementById('practiceId').value = '';
    document.getElementById('inputDate').value = formatDate(currentDate);

    addPieceInputRow();
    addTimetableInputRow({ startTime: '18:00', endTime: '21:00', category: '合奏', title: '夜間通常練習', details: '' });
  }

  openModal('practiceModal');
  const pracModal = document.getElementById('practiceModal');
  bringToFront(pracModal);
}

function addPieceInputRow(piece = {}) {
  const container = document.getElementById('piecesInputsContainer');
  const row = document.createElement('div');
  row.className = 'piece-input-row';

  const optionsHtml = repertoire.map(song => `
    <option value="${song.id}" ${piece.title === song.title ? 'selected' : ''}>[${song.section} ${song.no}] ${song.title} (${song.conductor})</option>
  `).join('');

  row.innerHTML = `
    <button type="button" class="btn-remove-piece" title="削除">&times;</button>

    <div class="form-group" style="margin-bottom: 8px;">
      <label>🎼 曲目ライブラリから選択</label>
      <select class="form-control piece-select-rep">
        <option value="">-- ライブラリから曲を選択する --</option>
        ${optionsHtml}
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>曲名</label>
        <input type="text" class="form-control piece-title-input" value="${escapeHtml(piece.title || '')}" placeholder="例: 青少年のための管弦楽入門">
      </div>
      <div class="form-group">
        <label>指揮・指導者</label>
        <input type="text" class="form-control piece-conductor-input" value="${escapeHtml(piece.conductor || '')}" placeholder="例: 公文 先生">
      </div>
    </div>
    <div class="form-group">
      <label>参考音源 (YouTube URL)</label>
      <input type="text" class="form-control piece-yt-input" value="${escapeHtml(piece.youtubeUrl || '')}" placeholder="https://www.youtube.com/...">
    </div>
    <div class="form-group">
      <label>練習のポイント（長文・改行対応）</label>
      <textarea class="form-control piece-points-input" placeholder="アタックを揃える、音量バランスなど...">${escapeHtml(piece.points || '')}</textarea>
    </div>
  `;

  row.querySelector('.piece-select-rep').addEventListener('change', (e) => {
    const selectedId = e.target.value;
    const song = repertoire.find(s => s.id === selectedId);
    if (song) {
      row.querySelector('.piece-title-input').value = song.title;
      row.querySelector('.piece-conductor-input').value = song.conductor || '';
      row.querySelector('.piece-points-input').value = song.points || '';
      if (song.videos && song.videos.length > 0) {
        row.querySelector('.piece-yt-input').value = song.videos[0].url;
      }
    }
  });

  row.querySelector('.btn-remove-piece').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addTimetableInputRow(slot = {}) {
  const container = document.getElementById('timetableInputsContainer');
  const row = document.createElement('div');
  row.className = 'piece-input-row';

  const assignedPieceIds = slot.pieceIds || [];

  const songCheckboxesHtml = repertoire.map(song => `
    <label class="song-checkbox-item">
      <input type="checkbox" class="slot-piece-checkbox" value="${song.id}" ${assignedPieceIds.includes(song.id) ? 'checked' : ''}>
      <span>${escapeHtml(song.title)}</span>
    </label>
  `).join('');

  row.innerHTML = `
    <button type="button" class="btn-remove-piece" title="削除">&times;</button>
    <div class="form-row">
      <div class="form-group">
        <label>開始時間</label>
        <input type="time" class="form-control slot-start-input" value="${slot.startTime || '18:00'}">
      </div>
      <div class="form-group">
        <label>終了時間</label>
        <input type="time" class="form-control slot-end-input" value="${slot.endTime || '21:00'}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>区分</label>
        <select class="form-control slot-cat-input">
          <option value="合奏" ${slot.category === '合奏' ? 'selected' : ''}>合奏</option>
          <option value="パート練習" ${slot.category === 'パート練習' ? 'selected' : ''}>パート練習</option>
          <option value="個人練習" ${slot.category === '個人練習' ? 'selected' : ''}>個人練習</option>
          <option value="本番" ${slot.category === '本番' ? 'selected' : ''}>本番</option>
          <option value="休憩" ${slot.category === '休憩' ? 'selected' : ''}>休憩</option>
          <option value="その他" ${slot.category === 'その他' ? 'selected' : ''}>その他</option>
        </select>
      </div>
      <div class="form-group">
        <label>時間枠タイトル</label>
        <input type="text" class="form-control slot-title-input" value="${escapeHtml(slot.title || '')}" placeholder="例: 全体合奏">
      </div>
    </div>

    <div class="form-group" style="margin-top: 8px;">
      <label>🎼 この時間枠で合わせる曲目 (複数選択可・YouTube動画自動紐付け)</label>
      <div class="song-checkboxes-grid">
        ${songCheckboxesHtml}
      </div>
    </div>
  `;

  row.querySelector('.btn-remove-piece').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function handlePracticeSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('practiceId').value || 'p-' + Date.now();
  const date = document.getElementById('inputDate').value;
  const category = document.getElementById('inputCategory').value;
  const title = document.getElementById('inputTitle').value;
  const locationName = document.getElementById('inputLocationName').value;
  const locationAddress = document.getElementById('inputLocationAddress').value;
  const conductors = document.getElementById('inputConductors').value;
  const generalNotes = document.getElementById('inputGeneralNotes').value;

  const pieces = [];
  document.querySelectorAll('#piecesInputsContainer .piece-input-row').forEach(row => {
    const pTitle = row.querySelector('.piece-title-input').value.trim();
    if (pTitle) {
      const matchedSong = repertoire.find(s => s.title === pTitle);
      const ytUrl = row.querySelector('.piece-yt-input').value.trim();
      
      let videos = matchedSong ? [...matchedSong.videos] : [];
      if (ytUrl && !videos.some(v => v.url === ytUrl)) {
        videos.unshift({ title: '参考音源 (YouTube)', url: ytUrl });
      }

      pieces.push({
        title: pTitle,
        conductor: row.querySelector('.piece-conductor-input').value.trim(),
        youtubeUrl: ytUrl,
        points: row.querySelector('.piece-points-input').value.trim(),
        videos
      });
    }
  });

  const timetable = [];
  document.querySelectorAll('#timetableInputsContainer .piece-input-row').forEach(row => {
    const sTitle = row.querySelector('.slot-title-input').value.trim();
    if (sTitle) {
      const checkedSongIds = Array.from(row.querySelectorAll('.slot-piece-checkbox:checked')).map(cb => cb.value);
      timetable.push({
        startTime: row.querySelector('.slot-start-input').value,
        endTime: row.querySelector('.slot-end-input').value,
        category: row.querySelector('.slot-cat-input').value,
        title: sTitle,
        pieceIds: checkedSongIds
      });
    }
  });

  const newPractice = {
    id,
    date,
    category,
    title,
    locationName,
    locationAddress,
    conductors,
    generalNotes,
    pieces,
    timetable
  };

  const existingIdx = practices.findIndex(p => p.id === id);
  if (existingIdx >= 0) {
    practices[existingIdx] = newPractice;
  } else {
    practices.push(newPractice);
  }

  saveToStorage();
  closeModal('practiceModal');
  render();
}

/* ==========================================================================
   Modals: Multi-Video YouTube Player Engine
   ========================================================================== */
function openDetailModal(id) {
  const p = practices.find(item => item.id === id);
  if (!p) return;

  const body = document.getElementById('detailModalBody');
  body.innerHTML = renderPracticeCardHtml(p);
  attachPracticeCardEvents(body);
  openModal('detailModal');
}

function openYoutubeMultiVideoModal(songTitle, videos = [], activeIdx = 0) {
  const body = document.getElementById('detailModalBody');

  if (!videos || videos.length === 0) {
    videos = [{ title: `${songTitle} 吹奏楽名演`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' 吹奏楽 名演')}` }];
  }

  const activeVideo = videos[activeIdx] || videos[0];
  const rawYtId = extractYoutubeId(activeVideo.url);

  const embedUrl = rawYtId 
    ? `https://www.youtube.com/embed/${rawYtId}?autoplay=1`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(songTitle + ' 吹奏楽')}`;

  const directLinkUrl = rawYtId
    ? `https://www.youtube.com/watch?v=${rawYtId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' 吹奏楽 名演')}`;

  const tabsHtml = videos.map((v, idx) => `
    <button class="video-tab-btn ${idx === activeIdx ? 'active' : ''}" data-idx="${idx}">
      🎬 ${escapeHtml(v.title || `演奏 ${idx+1}`)}
    </button>
  `).join('');

  body.innerHTML = `
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 1.1rem; color: var(--color-brass-light); font-weight: 700;">🎼 ${escapeHtml(songTitle)}</h3>
      ${activeVideo.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(activeVideo.description)}</p>` : ''}
    </div>

    ${videos.length > 1 ? `
      <div class="video-tabs-container">
        ${tabsHtml}
      </div>
    ` : ''}

    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <iframe src="${embedUrl}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen 
              style="position: absolute; top:0; left:0; width:100%; height:100%;"></iframe>
    </div>

    <div style="margin-top: 16px; text-align: center; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
      <a href="${directLinkUrl}" target="_blank" class="btn-glass btn-sm btn-yt-highlight" style="width: 100%; font-size: 0.9rem; padding: 12px;">
        🎬 YouTubeアプリ/ブラウザで「${escapeHtml(songTitle)}」を開く
      </a>
    </div>
  `;

  body.querySelectorAll('.video-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      openYoutubeMultiVideoModal(songTitle, videos, idx);
    });
  });

  openModal('detailModal');
}

/* ==========================================================================
   Bulk Date Range Export & LINE Sharing Logic
   ========================================================================== */
function openBulkExportModal() {
  setBulkPreset('augSep');
  openModal('bulkExportModal');
}

function setBulkPreset(presetKey) {
  const startInput = document.getElementById('bulkStartDate');
  const endInput = document.getElementById('bulkEndDate');

  const now = new Date();

  if (presetKey === 'thisMonth') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    startInput.value = formatDate(firstDay);
    endInput.value = formatDate(lastDay);
  } else if (presetKey === 'nextMonth') {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    startInput.value = formatDate(firstDay);
    endInput.value = formatDate(lastDay);
  } else if (presetKey === 'augSep') {
    startInput.value = '2026-08-01';
    endInput.value = '2026-09-30';
  } else if (presetKey === 'all') {
    startInput.value = '2026-01-01';
    endInput.value = '2027-12-31';
  }

  updateBulkExportCount();
}

function getPracticesInSelectedRange() {
  const startDateStr = document.getElementById('bulkStartDate').value;
  const endDateStr = document.getElementById('bulkEndDate').value;

  if (!startDateStr || !endDateStr) return practices;

  return practices.filter(p => p.date >= startDateStr && p.date <= endDateStr)
                  .sort((a, b) => a.date.localeCompare(b.date));
}

function updateBulkExportCount() {
  const selectedPractices = getPracticesInSelectedRange();
  const badge = document.getElementById('bulkEventCountBadge');
  if (badge) {
    badge.textContent = `${selectedPractices.length} 件`;
  }
}

function downloadBulkIcsFile() {
  const selectedPractices = getPracticesInSelectedRange();
  if (selectedPractices.length === 0) {
    alert('指定された期間内に練習予定がありません。');
    return;
  }

  const vevents = selectedPractices.map(p => {
    const dateClean = p.date.replace(/-/g, '');
    const startDt = `${dateClean}T090000Z`;
    const endDt = `${dateClean}T170000Z`;

    const summary = `[吹奏楽] ${p.title}`;
    const location = p.locationName ? `${p.locationName}` : '';
    const description = `区分: ${p.category} \\n 指揮: ${p.conductors || '未定'}`;

    return [
      'BEGIN:VEVENT',
      `UID:practice-${p.id}@brassband`,
      `DTSTAMP:${startDt}`,
      `DTSTART:${startDt}`,
      `DTEND:${endDt}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const fullIcsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brass Band Calendar Bulk Export//JA',
    'X-WR-CALNAME:吹奏楽 練習日程',
    vevents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([fullIcsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const startStr = document.getElementById('bulkStartDate').value || 'start';
  const endStr = document.getElementById('bulkEndDate').value || 'end';
  a.download = `brass_band_practices_${startStr}_to_${endStr}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  alert(`期間内の全 ${selectedPractices.length} 件の練習日程をまとめた .ics ファイルを出力しました！\niPhoneやMac、Outlook等でタップして一括カレンダー追加が可能です。`);
}

function buildBulkLineTextFormatted() {
  const selectedPractices = getPracticesInSelectedRange();
  const startStr = document.getElementById('bulkStartDate').value;
  const endStr = document.getElementById('bulkEndDate').value;

  if (selectedPractices.length === 0) {
    return '指定期間内の練習予定はありません。';
  }

  let text = `🎵【吹奏楽 期間一括練習案内】\n`;
  text += `🗓️ 期間: ${startStr} ～ ${endStr} (全 ${selectedPractices.length} 回)\n`;
  text += `--------------------------\n`;

  selectedPractices.forEach((p, idx) => {
    text += `\n【${idx + 1}】${p.date} (${p.category})\n`;
    text += `📌 ${p.title}\n`;
    if (p.locationName) text += `📍 ${p.locationName}\n`;
    if (p.conductors) text += `👨‍🏫 指揮: ${p.conductors}\n`;
    if (p.pieces && p.pieces.length > 0) {
      text += `🎼 練習曲: ${p.pieces.map(pc => pc.title).join(', ')}\n`;
    }
  });

  text += `\n--------------------------\n`;
  text += `📱 アプリで確認・詳細時間割:\n${window.location.href}`;
  return text;
}

function shareBulkToLine() {
  const text = buildBulkLineTextFormatted();
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank');
}

function copyBulkLineTextToClipboard() {
  const text = buildBulkLineTextFormatted();
  navigator.clipboard.writeText(text).then(() => {
    alert('指定期間の全練習日程テキストをコピーしました！\nLINEやTimeTreeのトーク画面に貼り付けてご活用ください。');
  });
}

/* ==========================================================================
   Single Practice Calendar Export & LINE Sharing
   ========================================================================== */
function openExportModal(id) {
  activePracticeForExport = practices.find(p => p.id === id);
  if (!activePracticeForExport) return;

  const p = activePracticeForExport;

  const gTitle = encodeURIComponent(`[吹奏楽] ${p.title}`);
  const gLoc = encodeURIComponent(p.locationName + (p.locationAddress ? ` (${p.locationAddress})` : ''));
  const gDetails = encodeURIComponent(buildFormattedShareText(p));
  const dates = formatGoogleCalendarDates(p.date);
  const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gTitle}&dates=${dates}&details=${gDetails}&location=${gLoc}`;
  document.getElementById('linkGoogleCalendar').href = gUrl;

  const oUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${gTitle}&body=${gDetails}&location=${gLoc}`;
  document.getElementById('linkOutlookCalendar').href = oUrl;

  openModal('exportModal');
}

function buildFormattedShareText(p) {
  let text = `🎵【吹奏楽 練習連絡】\n`;
  text += `📌 ${p.title} (${p.category})\n`;
  text += `📅 日時: ${p.date}\n`;
  if (p.locationName) text += `📍 場所: ${p.locationName}\n`;
  if (p.conductors) text += `👨‍🏫 指揮: ${p.conductors}\n`;

  if (p.pieces && p.pieces.length > 0) {
    text += `\n🎼 【練習曲】\n`;
    p.pieces.forEach((piece, i) => {
      text += `${i+1}. ${piece.title}\n`;
      if (piece.points) text += `   ・${piece.points.split('\n').join('\n   ・')}\n`;
    });
  }

  if (p.timetable && p.timetable.length > 0) {
    text += `\n⏰ 【当日の時間割】\n`;
    p.timetable.forEach(t => {
      text += `・${t.startTime}-${t.endTime} [${t.category}] ${t.title}\n`;
    });
  }

  if (p.generalNotes) {
    text += `\n📝 備考: ${p.generalNotes}\n`;
  }

  text += `\n📱 練習カレンダーWebアプリで確認:\n${window.location.href}`;
  return text;
}

function shareToLine() {
  if (!activePracticeForExport) return;
  const text = buildFormattedShareText(activePracticeForExport);
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank');
}

function copyLineTextToClipboard() {
  if (!activePracticeForExport) return;
  const text = buildFormattedShareText(activePracticeForExport);
  navigator.clipboard.writeText(text).then(() => {
    alert('LINE用練習案内テキストをクリップボードにコピーしました！\nLINEのトーク画面に貼り付けて共有できます。');
  });
}

function downloadIcsFile() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;

  const dateClean = p.date.replace(/-/g, '');
  const startDt = `${dateClean}T090000Z`;
  const endDt = `${dateClean}T170000Z`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brass Band Calendar//JA',
    'BEGIN:VEVENT',
    `UID:practice-${p.id}@brassband`,
    `DTSTAMP:${startDt}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:[吹奏楽] ${p.title}`,
    `LOCATION:${p.locationName || ''}`,
    `DESCRIPTION:${p.category} \\n ${p.conductors || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `practice_${p.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function shareTimeTreeFormat() {
  copyLineTextToClipboard();
  alert('TimeTree共有用にテキストをコピーしました！\nTimeTreeアプリの予定作成画面またはグループチャットに貼り付けてご活用ください。');
}

/* ==========================================================================
   Data Export / Import / Reset
   ========================================================================== */
function exportDataAsJson() {
  const exportPayload = {
    practices,
    repertoire
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brass_band_calendar_backup_${formatDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function importDataFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        practices = imported;
      } else if (imported.practices && imported.repertoire) {
        practices = imported.practices;
        repertoire = imported.repertoire;
      }
      saveToStorage();
      closeModal('backupModal');
      render();
      alert('練習データを正常にインポートしました！');
    } catch (err) {
      alert('JSONファイルの解析に失敗しました。');
    }
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (confirm('すべての登録データをリセットし、初期データ（全12曲の演奏プログラムおよび8月・9月の練習日程）に戻しますか？')) {
    practices = JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
    repertoire = JSON.parse(JSON.stringify(MASTER_REPERTOIRE));
    saveToStorage();
    closeModal('backupModal');
    render();
  }
}

/* ==========================================================================
   Helper Functions
   ========================================================================== */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function formatGoogleCalendarDates(dateStr) {
  const clean = dateStr.replace(/-/g, '');
  return `${clean}T090000Z/${clean}T170000Z`;
}

function extractYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

function getGoogleMapsUrl(name, address) {
  const query = encodeURIComponent(`${name || ''} ${address || ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
