/**
 * 吹奏楽専用カレンダー Web App メインロジック (Brass Band Practice Calendar App - PC Version)
 * View-Only Mode (閲覧専用) & Admin Mode (管理者用) Separation + Conductor Name Sanitizer
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
let isAdminMode = false;

// Permanent Storage Keys
const PERMANENT_STORAGE_KEY_PRACTICES = 'brass_band_calendar_practices_permanent';
const PERMANENT_STORAGE_KEY_REPERTOIRE = 'brass_band_calendar_repertoire_permanent';
const ADMIN_MODE_STORAGE_KEY = 'brass_band_calendar_is_admin';

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkAdminMode();
  setupEventListeners();
  setupZIndexLayerManagement();
  render();
});

/* ==========================================================================
   Admin / View-Only Mode Engine
   ========================================================================== */
function checkAdminMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === '1') {
    isAdminMode = true;
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, 'true');
  } else {
    isAdminMode = localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true';
  }
  updateAdminModeUi();
}

function updateAdminModeUi() {
  const btnAdmin = document.getElementById('btnAdminToggle');
  if (btnAdmin) {
    if (isAdminMode) {
      btnAdmin.innerHTML = `🔑 <span>管理者モード (全編集権限)</span>`;
      btnAdmin.style.background = 'rgba(239, 68, 68, 0.2)';
      btnAdmin.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      btnAdmin.style.color = '#fda4af';
    } else {
      btnAdmin.innerHTML = `👁️ <span>閲覧専用モード (団員向け)</span>`;
      btnAdmin.style.background = 'rgba(255, 255, 255, 0.06)';
      btnAdmin.style.borderColor = 'var(--glass-border)';
      btnAdmin.style.color = 'var(--text-secondary)';
    }
  }

  // Toggle visibility of admin-only edit controls
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdminMode ? '' : 'none';
  });
}

function promptAdminLogin() {
  if (isAdminMode) {
    if (confirm('管理者モードを終了し、閲覧専用モード（団員配布用）に戻しますか？')) {
      isAdminMode = false;
      localStorage.setItem(ADMIN_MODE_STORAGE_KEY, 'false');
      updateAdminModeUi();
      render();
    }
  } else {
    const code = prompt('管理者パスコードを入力してください:\n(初期パスコード: 1234)');
    if (code === '1234' || code === 'admin') {
      isAdminMode = true;
      localStorage.setItem(ADMIN_MODE_STORAGE_KEY, 'true');
      alert('管理者モードにログインしました。編集権限が有効です。');
      updateAdminModeUi();
      render();
    } else if (code !== null) {
      alert('パスコードが正しくありません。');
    }
  }
}

/* ==========================================================================
   Storage & Initialization (「先生」の排除 & 全データ同期)
   ========================================================================== */
function initStorage() {
  let loadedPractices = null;
  let loadedRepertoire = null;

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
    } catch (e) {}
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
    } catch (e) {}
  }

  practices = loadedPractices || JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
  repertoire = loadedRepertoire || JSON.parse(JSON.stringify(MASTER_REPERTOIRE));

  sanitizeConductorNames();
  saveToStorage();
}

function sanitizeConductorNames() {
  const cleanConductor = (str) => {
    if (!str) return '';
    return str.replace(/\s*先生/g, '').trim();
  };

  repertoire.forEach(s => {
    if (s.conductor) s.conductor = cleanConductor(s.conductor);
  });

  practices.forEach(p => {
    if (p.conductors) p.conductors = cleanConductor(p.conductors);
    (p.pieces || []).forEach(pc => {
      if (pc.conductor) pc.conductor = cleanConductor(pc.conductor);
    });
  });
}

function saveToStorage() {
  try {
    localStorage.setItem(PERMANENT_STORAGE_KEY_PRACTICES, JSON.stringify(practices));
    localStorage.setItem(PERMANENT_STORAGE_KEY_REPERTOIRE, JSON.stringify(repertoire));

    ['v5', 'v4', 'v3'].forEach(v => {
      localStorage.setItem(`brass_band_calendar_practices_${v}`, JSON.stringify(practices));
      localStorage.setItem(`brass_band_calendar_repertoire_${v}`, JSON.stringify(repertoire));
    });
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
}

/* ==========================================================================
   Z-Index Layer Management
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

  // Admin Mode Toggle Button
  const btnAdmin = document.getElementById('btnAdminToggle');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', promptAdminLogin);
  }

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
  document.getElementById('btnAddPractice').addEventListener('click', () => {
    if (!isAdminMode) {
      if (confirm('練習スケジュールの登録は管理者専用機能です。\n管理者モードにログインしますか？')) {
        promptAdminLogin();
      }
      return;
    }
    openPracticeModal();
  });

  document.getElementById('btnBackup').addEventListener('click', () => openModal('backupModal'));
  document.getElementById('btnRepertoireLibrary').addEventListener('click', openRepertoireModal);
  
  // Bulk Export Triggers
  document.getElementById('btnBulkExport').addEventListener('click', openBulkExportModal);
  document.getElementById('btnControlsBulkExport').addEventListener('click', openBulkExportModal);

  // New Song Triggers
  document.getElementById('btnAddNewSong').addEventListener('click', () => {
    if (!isAdminMode) {
      promptAdminLogin();
      return;
    }
    openEditSongModal();
  });

  document.getElementById('btnModalAddNewSong').addEventListener('click', () => {
    if (!isAdminMode) {
      promptAdminLogin();
      return;
    }
    openEditSongModal();
  });

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
  updateAdminModeUi();

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
   View 1 & 2: Month & Week Views
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
   View 5: Repertoire Library Views
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
            ${isAdminMode ? `
              <button class="btn-glass btn-sm btn-edit-song" data-songid="${song.id}" style="padding: 4px 10px; font-weight: 700;">
                ✏️ 編集
              </button>
            ` : ''}
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

  if (isAdminMode) {
    container.querySelectorAll('.btn-edit-song').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const songId = e.currentTarget.dataset.songid;
        openEditSongModal(songId);
      });
    });
  }
}

/* ==========================================================================
   Repertoire Song Modal Logic
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
    deleteBtn.style.display = 'none';
    addSongVideoInputRow();
  }

  openModal('editSongModal');
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

  const updatedSong = { id, section, no, title, composer, conductor, points, videos };
  const existingIdx = repertoire.findIndex(s => s.id === id);
  if (existingIdx >= 0) repertoire[existingIdx] = updatedSong;
  else repertoire.push(updatedSong);

  saveToStorage();
  closeModal('editSongModal');
  render();
}

function handleDeleteSong() {
  const id = document.getElementById('editSongId').value;
  if (!id) return;

  const song = repertoire.find(s => s.id === id);
  if (song && confirm(`曲目「${song.title}」を削除しますか？`)) {
    repertoire = repertoire.filter(s => s.id !== id);
    saveToStorage();
    closeModal('editSongModal');
    render();
  }
}

/* ==========================================================================
   Practice Cards Renderer
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
      return `
        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(229,193,88,0.14); border: 1px solid var(--glass-border-gold); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-top: 4px; flex-wrap: wrap;">
          <span>🎼 <strong>${escapeHtml(song.title)}</strong></span>
          <button class="btn-glass btn-sm btn-yt-highlight btn-play-slot-video" data-songtitle="${escapeHtml(song.title)}" data-videos='${JSON.stringify(vList).replace(/'/g, "&apos;")}' style="padding: 4px 10px; font-size: 0.78rem;">
            🎬 YouTube再生
          </button>
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
        ${isAdminMode ? `
          <button class="btn-glass btn-sm btn-edit-practice" data-id="${practice.id}" style="margin-left: auto; font-weight: 700;">
            ✏️ 編集
          </button>
          <button class="btn-glass btn-sm btn-delete-practice" data-id="${practice.id}" style="color: #f43f5e; border-color: rgba(244,63,94,0.3);">
            🗑️ 削除
          </button>
        ` : ''}
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

  if (isAdminMode) {
    container.querySelectorAll('.btn-edit-practice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openPracticeModal(e.currentTarget.dataset.id);
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
}

/* Modal Engine */
function openModal(modalId) {
  const modalEl = document.getElementById(modalId);
  modalEl.classList.add('active');
  bringToFront(modalEl);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
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
        <option value="">-- ライブラリから曲を選択 --</option>
        ${optionsHtml}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>曲名</label>
        <input type="text" class="form-control piece-title-input" value="${escapeHtml(piece.title || '')}">
      </div>
      <div class="form-group">
        <label>指揮・指導者</label>
        <input type="text" class="form-control piece-conductor-input" value="${escapeHtml(piece.conductor || '')}">
      </div>
    </div>
  `;

  row.querySelector('.piece-select-rep').addEventListener('change', (e) => {
    const song = repertoire.find(s => s.id === e.target.value);
    if (song) {
      row.querySelector('.piece-title-input').value = song.title;
      row.querySelector('.piece-conductor-input').value = song.conductor || '';
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
    <div class="form-group">
      <label>時間枠タイトル</label>
      <input type="text" class="form-control slot-title-input" value="${escapeHtml(slot.title || '')}">
    </div>
    <div class="form-group" style="margin-top: 6px;">
      <label>🎼 この時間枠で合わせる曲目 (複数可)</label>
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
  const conductors = document.getElementById('inputConductors').value;
  const generalNotes = document.getElementById('inputGeneralNotes').value;

  const pieces = [];
  document.querySelectorAll('#piecesInputsContainer .piece-input-row').forEach(row => {
    const pTitle = row.querySelector('.piece-title-input').value.trim();
    if (pTitle) {
      pieces.push({
        title: pTitle,
        conductor: row.querySelector('.piece-conductor-input').value.trim()
      });
    }
  });

  const timetable = [];
  document.querySelectorAll('#timetableInputsContainer .piece-input-row').forEach(row => {
    const sTitle = row.querySelector('.slot-title-input').value.trim();
    if (sTitle) {
      const checkedIds = Array.from(row.querySelectorAll('.slot-piece-checkbox:checked')).map(cb => cb.value);
      timetable.push({
        startTime: row.querySelector('.slot-start-input').value,
        endTime: row.querySelector('.slot-end-input').value,
        category: '合奏',
        title: sTitle,
        pieceIds: checkedIds
      });
    }
  });

  const newPractice = { id, date, category, title, locationName, conductors, generalNotes, pieces, timetable };
  const idx = practices.findIndex(p => p.id === id);
  if (idx >= 0) practices[idx] = newPractice;
  else practices.push(newPractice);

  saveToStorage();
  closeModal('practiceModal');
  render();
}

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
    videos = [{ title: `${songTitle} 吹奏楽名演`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' 吹奏楽')}` }];
  }

  const activeVideo = videos[activeIdx] || videos[0];
  const rawYtId = extractYoutubeId(activeVideo.url);

  const embedUrl = rawYtId 
    ? `https://www.youtube.com/embed/${rawYtId}?autoplay=1`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(songTitle + ' 吹奏楽')}`;

  const directLinkUrl = rawYtId
    ? `https://www.youtube.com/watch?v=${rawYtId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' 吹奏楽')}`;

  body.innerHTML = `
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 1.1rem; color: var(--color-brass-light); font-weight: 700;">🎼 ${escapeHtml(songTitle)}</h3>
    </div>

    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-md);">
      <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top:0; left:0; width:100%; height:100%;"></iframe>
    </div>

    <div style="margin-top: 16px; text-align: center;">
      <a href="${directLinkUrl}" target="_blank" class="btn-glass btn-sm btn-yt-highlight" style="width: 100%; font-size: 0.9rem; padding: 12px;">
        🎬 YouTubeアプリで「${escapeHtml(songTitle)}」を開く
      </a>
    </div>
  `;

  openModal('detailModal');
}

/* Bulk Export & Backup Functions */
function openBulkExportModal() {
  setBulkPreset('augSep');
  openModal('bulkExportModal');
}

function setBulkPreset(presetKey) {
  const startInput = document.getElementById('bulkStartDate');
  const endInput = document.getElementById('bulkEndDate');
  const now = new Date();

  if (presetKey === 'thisMonth') {
    startInput.value = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    endInput.value = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  } else if (presetKey === 'nextMonth') {
    startInput.value = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    endInput.value = formatDate(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  } else if (presetKey === 'augSep') {
    startInput.value = '2026-08-01';
    endInput.value = '2026-09-30';
  } else {
    startInput.value = '2026-01-01';
    endInput.value = '2027-12-31';
  }
  updateBulkExportCount();
}

function getPracticesInSelectedRange() {
  const s = document.getElementById('bulkStartDate').value;
  const e = document.getElementById('bulkEndDate').value;
  return practices.filter(p => p.date >= s && p.date <= e).sort((a, b) => a.date.localeCompare(b.date));
}

function updateBulkExportCount() {
  const selected = getPracticesInSelectedRange();
  const badge = document.getElementById('bulkEventCountBadge');
  if (badge) badge.textContent = `${selected.length} 件`;
}

function downloadBulkIcsFile() {
  const selected = getPracticesInSelectedRange();
  if (selected.length === 0) return alert('期間内の練習がありません');

  const vevents = selected.map(p => {
    const dClean = p.date.replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:practice-${p.id}@brassband`,
      `DTSTART:${dClean}T090000Z`,
      `DTEND:${dClean}T170000Z`,
      `SUMMARY:[吹奏楽] ${p.title}`,
      `LOCATION:${p.locationName || ''}`,
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', vevents, 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brass_band_practices.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function shareBulkToLine() {
  const selected = getPracticesInSelectedRange();
  if (selected.length === 0) return alert('期間内の練習がありません');
  let text = `🎵【吹奏楽 一括練習案内】\n--------------------\n`;
  selected.forEach((p, i) => {
    text += `\n【${i+1}】${p.date} (${p.category})\n📌 ${p.title}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n`;
  });
  text += `\n📱 Webアプリ:\n${window.location.href}`;
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
}

function copyBulkLineTextToClipboard() {
  const selected = getPracticesInSelectedRange();
  let text = `🎵【吹奏楽 一括練習案内】\n--------------------\n`;
  selected.forEach((p, i) => {
    text += `\n【${i+1}】${p.date} (${p.category})\n📌 ${p.title}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n`;
  });
  navigator.clipboard.writeText(text).then(() => alert('一括練習案内をコピーしました'));
}

function openExportModal(id) {
  activePracticeForExport = practices.find(p => p.id === id);
  if (!activePracticeForExport) return;
  openModal('exportModal');
}

function shareToLine() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;
  let text = `🎵【吹奏楽 練習連絡】\n📌 ${p.title}\n📅 ${p.date}\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n📱 Webアプリ:\n${window.location.href}`;
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
}

function copyLineTextToClipboard() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;
  let text = `🎵【吹奏楽 練習連絡】\n📌 ${p.title}\n📅 ${p.date}\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n📱 Webアプリ:\n${window.location.href}`;
  navigator.clipboard.writeText(text).then(() => alert('テキストをコピーしました'));
}

function downloadIcsFile() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;
  const dClean = p.date.replace(/-/g, '');
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `SUMMARY:[吹奏楽] ${p.title}`, `DTSTART:${dClean}T090000Z`, `DTEND:${dClean}T170000Z`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `practice_${p.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function shareTimeTreeFormat() { copyLineTextToClipboard(); }

function exportDataAsJson() {
  const blob = new Blob([JSON.stringify({ practices, repertoire }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brass_band_backup_${formatDate(new Date())}.json`;
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
      if (imported.practices && imported.repertoire) {
        practices = imported.practices;
        repertoire = imported.repertoire;
        saveToStorage();
        closeModal('backupModal');
        render();
        alert('インポートを完了しました');
      }
    } catch (err) {}
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (confirm('初期データにリセットしますか？')) {
    practices = JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
    repertoire = JSON.parse(JSON.stringify(MASTER_REPERTOIRE));
    saveToStorage();
    closeModal('backupModal');
    render();
  }
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekStartDate(d) {
  const date = new Date(d);
  return new Date(date.setDate(date.getDate() - date.getDay()));
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

function getGoogleMapsUrl(name, address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name || '') + ' ' + (address || ''))}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
