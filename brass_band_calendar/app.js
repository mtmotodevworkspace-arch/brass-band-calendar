/**
 * 吹奏楽専用カレンダー Web App メインロジック (PC版)
 * View-Only Mode (閲覧専用・デフォルト) & Admin Mode (管理者用) + タイムスケジュール時間軸明示UI (v14 Purge)
 */

import { INITIAL_PRACTICE_DATA, MASTER_REPERTOIRE } from './sample-data.js';
import { 
  initFirebaseSync, 
  syncPracticeToCloud, 
  deletePracticeFromCloud, 
  syncRepertoireToCloud, 
  deleteRepertoireFromCloud 
} from './firebase-sync.js';

// Global State
let practices = [];
let repertoire = [];
let currentDate = new Date();
let currentView = 'month';
let selectedCategory = 'all';
let selectedDateForMobileSheet = null;
let activePracticeForExport = null;
let highestZIndex = 5000;

// Admin Mode defaults strictly to FALSE (閲覧専用) for all visitors
let isAdminMode = false;

// Storage Keys (v14 for Hard Cache Invalidation)
const PERMANENT_STORAGE_KEY_PRACTICES = 'brass_band_calendar_practices_v14';
const PERMANENT_STORAGE_KEY_REPERTOIRE = 'brass_band_calendar_repertoire_v14';

document.addEventListener('DOMContentLoaded', () => {
  hardPurgeSenseiFromLocalStorage();
  initStorage();
  checkAdminMode();
  checkUrlDeepLinkImport();
  setupFirebaseCloudSync();
  setupEventListeners();
  setupZIndexLayerManagement();
  render();
});

/* Hard Purge ALL legacy localStorage versions except v14 and any string containing "先生" */
function hardPurgeSenseiFromLocalStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.includes('brass') || k.includes('repertoire') || k.includes('practice'))) {
        if (!k.endsWith('_v14')) {
          localStorage.removeItem(k);
        } else {
          const val = localStorage.getItem(k);
          if (val && val.includes('先生')) {
            localStorage.removeItem(k);
          }
        }
      }
    }
  } catch (e) {}
}

function cleanSensei(str) {
  if (!str) return '';
  return String(str).replace(/\s*先生/g, '').trim();
}

/* Admin / View-Only Mode Engine */
function checkAdminMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === '1') {
    isAdminMode = true;
  } else {
    isAdminMode = sessionStorage.getItem('brass_band_is_admin') === 'true';
  }
  updateAdminModeUi();
}

function updateAdminModeUi() {
  const btnAdmin = document.getElementById('btnAdminToggle');
  if (btnAdmin) {
    if (isAdminMode) {
      btnAdmin.innerHTML = `🔑 <span>管理者モード (編集可)</span>`;
      btnAdmin.style.background = 'rgba(239, 68, 68, 0.25)';
      btnAdmin.style.borderColor = 'rgba(239, 68, 68, 0.6)';
      btnAdmin.style.color = '#fda4af';
    } else {
      btnAdmin.innerHTML = `👁️ <span>閲覧専用モード (団員向け)</span>`;
      btnAdmin.style.background = 'rgba(255, 255, 255, 0.08)';
      btnAdmin.style.borderColor = 'var(--glass-border-gold)';
      btnAdmin.style.color = 'var(--color-brass-light)';
    }
  }

  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdminMode) {
      el.style.display = '';
      el.classList.remove('is-hidden');
    } else {
      el.style.display = 'none';
      el.classList.add('is-hidden');
    }
  });
}

function promptAdminLogin() {
  if (isAdminMode) {
    if (confirm('管理者モードを終了し、閲覧専用モード（団員配布用）に戻しますか？')) {
      isAdminMode = false;
      sessionStorage.setItem('brass_band_is_admin', 'false');
      updateAdminModeUi();
      render();
    }
  } else {
    const code = prompt('管理者パスコードを入力してください:');
    if (code === '1234' || code === 'admin') {
      isAdminMode = true;
      sessionStorage.setItem('brass_band_is_admin', 'true');
      alert('管理者モードにログインしました。編集権限が有効です。');
      updateAdminModeUi();
      render();
    } else if (code !== null) {
      alert('パスコードが正しくありません。');
    }
  }
}

function initStorage() {
  let loadedPractices = null;
  let loadedRepertoire = null;

  try {
    const pData = localStorage.getItem(PERMANENT_STORAGE_KEY_PRACTICES);
    if (pData && !pData.includes('先生')) loadedPractices = JSON.parse(pData);

    const rData = localStorage.getItem(PERMANENT_STORAGE_KEY_REPERTOIRE);
    if (rData && !rData.includes('先生')) loadedRepertoire = JSON.parse(rData);
  } catch (e) {}

  // Check if loaded practices match new timetable schema (must have message/conductor/customPiece in timetable)
  let isSchemaValid = false;
  if (loadedPractices && Array.isArray(loadedPractices) && loadedPractices.length > 0) {
    const firstWithTimetable = loadedPractices.find(p => p.timetable && p.timetable.length > 0);
    if (firstWithTimetable && firstWithTimetable.timetable[0].startTime) {
      isSchemaValid = true;
    }
  }

  if (!isSchemaValid) {
    loadedPractices = null;
    loadedRepertoire = null;
  }

  practices = loadedPractices || JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
  repertoire = loadedRepertoire || JSON.parse(JSON.stringify(MASTER_REPERTOIRE));

  sanitizeAllConductors(practices);
  sanitizeAllConductors(repertoire);
  saveToStorage();
}

function setupFirebaseCloudSync() {
  initFirebaseSync(
    (cloudPractices) => {
      if (cloudPractices && cloudPractices.length > 0) {
        practices = cloudPractices;
        sanitizeAllConductors(practices);
        saveToStorage();
        render();
      }
    },
    (cloudRepertoire) => {
      if (cloudRepertoire && cloudRepertoire.length > 0) {
        repertoire = cloudRepertoire;
        sanitizeAllConductors(repertoire);
        saveToStorage();
        render();
      }
    },
    (isOnline, statusText) => {
      const btnAdmin = document.getElementById('btnAdminToggle');
      if (btnAdmin) {
        btnAdmin.title = statusText;
      }
    }
  );
}

function sanitizeAllConductors(target) {
  if (Array.isArray(target)) {
    target.forEach(item => {
      if (item.conductor) item.conductor = cleanSensei(item.conductor);
      if (item.conductors) item.conductors = cleanSensei(item.conductors);
      if (item.points) item.points = cleanSensei(item.points);
      if (item.pieces) {
        item.pieces.forEach(p => { if (p.conductor) p.conductor = cleanSensei(p.conductor); });
      }
      if (item.timetable) {
        item.timetable.forEach(t => { if (t.conductor) t.conductor = cleanSensei(t.conductor); });
      }
    });
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(PERMANENT_STORAGE_KEY_PRACTICES, JSON.stringify(practices));
    localStorage.setItem(PERMANENT_STORAGE_KEY_REPERTOIRE, JSON.stringify(repertoire));
  } catch (e) {}
}

function bringToFront(el) {
  if (!el) return;
  highestZIndex += 20;
  el.style.zIndex = highestZIndex;
  const content = el.querySelector('.modal-content');
  if (content) content.style.zIndex = highestZIndex + 1;
}

function setupZIndexLayerManagement() {
  document.addEventListener('click', (e) => {
    const backdrop = e.target.closest('.modal-backdrop');
    if (backdrop && backdrop.classList.contains('active')) bringToFront(backdrop);
    const card = e.target.closest('.practice-card, .repertoire-card, .glass-panel');
    if (card && !e.target.closest('.modal-backdrop')) bringToFront(card);
  }, true);
}

function setupEventListeners() {
  document.getElementById('btnPrev').addEventListener('click', () => navigateDate(-1));
  document.getElementById('btnNext').addEventListener('click', () => navigateDate(1));
  document.getElementById('btnToday').addEventListener('click', () => {
    currentDate = new Date();
    selectedDateForMobileSheet = formatDate(currentDate);
    render();
  });

  const btnAdmin = document.getElementById('btnAdminToggle');
  if (btnAdmin) btnAdmin.addEventListener('click', promptAdminLogin);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentView = e.currentTarget.dataset.view;
      render();
    });
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedCategory = e.currentTarget.dataset.cat;
      render();
    });
  });

  document.getElementById('btnAddPractice').addEventListener('click', () => {
    if (!isAdminMode) return promptAdminLogin();
    openPracticeModal();
  });

  document.getElementById('btnBackup').addEventListener('click', () => openModal('backupModal'));
  document.getElementById('btnRepertoireLibrary').addEventListener('click', openRepertoireModal);
  document.getElementById('btnBulkExport').addEventListener('click', openBulkExportModal);
  document.getElementById('btnControlsBulkExport').addEventListener('click', openBulkExportModal);

  document.getElementById('btnAddNewSong').addEventListener('click', () => {
    if (!isAdminMode) return promptAdminLogin();
    openEditSongModal();
  });

  document.getElementById('btnModalAddNewSong').addEventListener('click', () => {
    if (!isAdminMode) return promptAdminLogin();
    openEditSongModal();
  });

  document.querySelectorAll('.close-modal-btn, [data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.close || e.currentTarget.closest('.modal-backdrop').id;
      closeModal(modalId);
    });
  });

  document.getElementById('btnAddPieceRow').addEventListener('click', () => addPieceInputRow());
  document.getElementById('btnAddTimetableRow').addEventListener('click', () => addTimetableInputRow());
  document.getElementById('btnAddSongVideoRow').addEventListener('click', () => addSongVideoInputRow());

  document.getElementById('practiceForm').addEventListener('submit', handlePracticeSubmit);
  document.getElementById('editSongForm').addEventListener('submit', handleEditSongSubmit);

  document.getElementById('btnExportJson').addEventListener('click', exportDataAsJson);
  document.getElementById('btnImportJson').addEventListener('click', () => document.getElementById('importJsonFile').click());
  document.getElementById('importJsonFile').addEventListener('change', importDataFromJson);
  document.getElementById('btnResetData').addEventListener('click', resetToSampleData);

  document.getElementById('btnLineShare').addEventListener('click', shareToLine);
  document.getElementById('btnCopyLineText').addEventListener('click', copyLineTextToClipboard);
  document.getElementById('btnDownloadIcs').addEventListener('click', downloadIcsFile);
  document.getElementById('btnTimeTreeShare').addEventListener('click', shareTimeTreeFormat);

  document.getElementById('btnDeleteSong').addEventListener('click', handleDeleteSong);

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

function navigateDate(direction) {
  if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + direction);
  else if (currentView === 'week') currentDate.setDate(currentDate.getDate() + (direction * 7));
  else currentDate.setDate(currentDate.getDate() + direction);
  render();
}

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
  if (currentView === 'month') periodTextEl.textContent = `${y}年 ${m}月`;
  else if (currentView === 'week') {
    const weekStart = getWeekStartDate(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    periodTextEl.textContent = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  } else if (currentView === 'repertoire') periodTextEl.textContent = `全${repertoire.length}曲 演奏プログラム`;
  else periodTextEl.textContent = `${y}年 ${m}月 ${d}日`;
}

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
  if (!selectedDateForMobileSheet) selectedDateForMobileSheet = todayStr;

  for (let i = firstDayIndex; i > 0; i--) {
    monthGrid.appendChild(createDayCell(prevLastDate - i + 1, true));
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDateForMobileSheet;
    
    let dayEvents = practices.filter(p => p.date === dateStr);
    if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

    monthGrid.appendChild(createDayCell(day, false, isToday, dateStr, dayEvents, isSelected));
  }

  const totalCellsSoFar = firstDayIndex + lastDate;
  const nextDaysNeeded = (totalCellsSoFar > 35 ? 42 : 35) - totalCellsSoFar;
  for (let j = 1; j <= nextDaysNeeded; j++) {
    monthGrid.appendChild(createDayCell(j, true));
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
  if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

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
        <span>📅 ${targetDateStr} の練習詳細 (タイムスケジュール)</span>
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
    if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

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

function renderDayView() {
  const container = document.getElementById('dayViewContent');
  const dateStr = formatDate(currentDate);

  let dayEvents = practices.filter(p => p.date === dateStr);
  if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

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
  if (selectedCategory !== 'all') filtered = filtered.filter(p => p.category === selectedCategory);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">表示できる練習時間割がありません</div>`;
    return;
  }

  container.innerHTML = filtered.map(evt => renderPracticeCardHtml(evt, true)).join('');
  attachPracticeCardEvents(container);
}

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
  if (!songList || songList.length === 0) return `<div style="padding: 20px; text-align: center; color: var(--text-muted);">曲目が登録されていません。</div>`;

  return songList.map(song => {
    const cleanConductor = cleanSensei(song.conductor || '未定');

    const videoBtnsHtml = (song.videos || []).map((v, idx) => `
      <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm btn-yt-highlight" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; margin-right: 6px; margin-top: 6px;">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)} <span style="font-size: 0.72rem; opacity: 0.8;">YouTubeアプリ起動 ↗</span>
      </a>
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
              👨‍🏫 指揮: <strong>${escapeHtml(cleanConductor)}</strong>
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
            ${escapeHtml(cleanSensei(song.points))}
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
  if (isAdminMode) {
    container.querySelectorAll('.btn-edit-song').forEach(btn => {
      btn.addEventListener('click', (e) => openEditSongModal(e.currentTarget.dataset.songid));
    });
  }
}

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
      document.getElementById('editSongConductor').value = cleanSensei(song.conductor);
      document.getElementById('editSongPoints').value = cleanSensei(song.points);

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
        <label>動画タイトル</label>
        <input type="text" class="form-control video-title-input" value="${escapeHtml(video.title || '')}" placeholder="動画タイトル">
      </div>
      <div class="form-group" style="margin-bottom: 6px;">
        <label>YouTube URL</label>
        <input type="text" class="form-control video-url-input" value="${escapeHtml(video.url || '')}" placeholder="https://www.youtube.com/...">
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
  const conductor = cleanSensei(document.getElementById('editSongConductor').value);
  const points = cleanSensei(document.getElementById('editSongPoints').value);

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
  syncRepertoireToCloud(updatedSong);
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
    deleteRepertoireFromCloud(id);
    closeModal('editSongModal');
    render();
  }
}

/**
 * タイムスケジュール時間軸明示型 UI レンダラー
 */
function renderTimelineHtml(timetable = [], defaultConductors = '') {
  if (!timetable || timetable.length === 0) return '';

  const slotsHtml = timetable.map((slot) => {
    const assignedSongs = (slot.pieceIds || []).map(songId => repertoire.find(s => s.id === songId)).filter(Boolean);
    const customPieceText = cleanSensei(slot.customPiece);
    const slotConductor = cleanSensei(slot.conductor || defaultConductors);

    const songChipsHtml = [];
    assignedSongs.forEach(song => {
      const vList = song.videos || [];
      const ytUrl = slot.youtubeUrl || (vList.length > 0 ? vList[0].url : `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' 吹奏楽')}`);
      songChipsHtml.push(`
        <div class="timeline-song-chip">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: var(--color-brass-light);">🎼 ${escapeHtml(song.title)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(${escapeHtml(song.section)})</span>
          </div>
          <a href="${escapeHtml(ytUrl)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm btn-yt-highlight" style="padding: 3px 8px; font-size: 0.75rem; text-decoration: none;">
            🎬 YouTube再生 ↗
          </a>
        </div>
      `);
    });

    if (customPieceText) {
      const ytUrl = slot.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(customPieceText + ' 吹奏楽')}`;
      songChipsHtml.push(`
        <div class="timeline-song-chip">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: #6ee7b7;">🎼 ${escapeHtml(customPieceText)}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted); background: rgba(16,185,129,0.2); padding: 1px 5px; border-radius: 3px;">自由入力</span>
          </div>
          <a href="${escapeHtml(ytUrl)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm btn-yt-highlight" style="padding: 3px 8px; font-size: 0.75rem; text-decoration: none;">
            🎬 YouTube再生 ↗
          </a>
        </div>
      `);
    }

    // メッセージ: 記入がある場合のみ表示
    const rawMsg = (slot.message || (slot.details && !slot.details.includes('返し合奏') ? slot.details : '')).trim();
    const messageHtml = rawMsg ? `
      <div class="timeline-message-box">
        <span>💬 <strong>メッセージ:</strong> ${escapeHtml(cleanSensei(rawMsg))}</span>
      </div>
    ` : '';

    const slotCategory = slot.category || '合奏';
    const startTimeStr = slot.startTime || '18:00';
    const endTimeStr = slot.endTime || '21:00';

    return `
      <div class="timeline-slot-card">
        <div class="timeline-slot-node node-${escapeHtml(slotCategory)}"></div>
        <div class="timeline-slot-header">
          <div class="timeline-time-badge">⏰ ${escapeHtml(startTimeStr)} 〜 ${escapeHtml(endTimeStr)}</div>
          <span class="event-badge badge-${escapeHtml(slotCategory)}">${escapeHtml(slotCategory)}</span>
          ${slotConductor ? `<span class="timeline-conductor-tag">👨‍🏫 指揮: <strong>${escapeHtml(slotConductor)}</strong></span>` : ''}
        </div>

        <div class="timeline-slot-title">${escapeHtml(cleanSensei(slot.title || '練習セクション'))}</div>

        ${songChipsHtml.length > 0 ? `
          <div class="timeline-songs-group">
            ${songChipsHtml.join('')}
          </div>
        ` : ''}

        ${messageHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="timeline-schedule-wrapper">
      <div class="timeline-schedule-header">
        <span>⏱️ 練習タイムスケジュール (時間軸明示)</span>
        <span style="font-size: 0.78rem; font-weight: 500; color: var(--text-muted);">全 ${timetable.length} 枠</span>
      </div>
      <div class="timeline-track">
        ${slotsHtml}
      </div>
    </div>
  `;
}

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
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        ${videos.map((v, idx) => `
          <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm btn-yt-highlight" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
            🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)} <span style="font-size: 0.72rem; opacity: 0.8;">YouTubeアプリ起動 ↗</span>
          </a>
        `).join('')}
      </div>
    `;

    const cleanCond = cleanSensei(piece.conductor);

    return `
      <div class="piece-card">
        <div class="piece-header">
          <span class="piece-title">🎼 ${escapeHtml(piece.title || '無題の曲')}</span>
          ${cleanCond ? `<span class="piece-conductor">👨‍🏫 指導: ${escapeHtml(cleanCond)}</span>` : ''}
        </div>
        ${piece.points ? `<div class="piece-points">${escapeHtml(cleanSensei(piece.points))}</div>` : ''}
        ${videoTabsHtml}
      </div>
    `;
  }).join('');

  const timetableTimelineHtml = renderTimelineHtml(practice.timetable, practice.conductors);
  const cleanPracticeCond = cleanSensei(practice.conductors);

  return `
    <div class="practice-card glass-panel" data-cat="${practice.category}" id="card-${practice.id}">
      <div class="card-header-main">
        <div class="card-title-group">
          <h2 style="font-size: 1.15rem;">${escapeHtml(cleanSensei(practice.title))}</h2>
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
        ${cleanPracticeCond ? `<div class="meta-item">👨‍🏫 指揮: <strong>${escapeHtml(cleanPracticeCond)}</strong></div>` : ''}
      </div>

      ${timetableTimelineHtml}

      ${piecesHtml ? `
        <div class="pieces-section" style="margin-top: 14px;">
          <div class="section-title" style="font-size: 0.88rem; color: var(--color-brass-light); font-weight: 700;">🎼 練習予定曲目ライブラリ情報</div>
          ${piecesHtml}
        </div>
      ` : ''}

      ${practice.generalNotes && !practice.generalNotes.includes('18:00〜21:00 日章') ? `
        <div style="margin-top: 12px; padding: 10px; background: rgba(229,193,88,0.08); border-radius: var(--radius-sm); border: 1px dashed var(--glass-border-gold); font-size: 0.82rem; color: var(--text-secondary);">
          💬 <strong>全体連絡事項:</strong> ${escapeHtml(cleanSensei(practice.generalNotes))}
        </div>
      ` : ''}

      <div class="card-actions-bar" style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
        <button class="btn-glass btn-sm btn-share-practice" data-id="${practice.id}">
          📲 LINE共有
        </button>
        <button class="btn-glass btn-sm btn-edit-practice" data-id="${practice.id}" style="margin-left: auto; font-weight: 700;">
          ✏️ 編集
        </button>
        <button class="btn-glass btn-sm btn-delete-practice" data-id="${practice.id}" style="color: #f43f5e; border-color: rgba(244,63,94,0.4);">
          🗑️ 削除
        </button>
      </div>
    </div>
  `;
}

function attachPracticeCardEvents(container) {
  container.querySelectorAll('.btn-share-practice').forEach(btn => {
    btn.addEventListener('click', (e) => openExportModal(e.currentTarget.dataset.id));
  });

  container.querySelectorAll('.btn-edit-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (!isAdminMode) {
        const code = prompt('編集権限が必要です。\n管理者パスコードを入力してください:');
        if (code === '1234' || code === 'admin') {
          isAdminMode = true;
          sessionStorage.setItem('brass_band_is_admin', 'true');
          updateAdminModeUi();
        } else {
          if (code !== null) alert('パスコードが正しくありません。');
          return;
        }
      }
      closeModal('detailModal');
      openPracticeModal(id);
    });
  });

  container.querySelectorAll('.btn-delete-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const p = practices.find(item => item.id === id);
      if (!isAdminMode) {
        const code = prompt('削除権限が必要です。\n管理者パスコードを入力してください:');
        if (code === '1234' || code === 'admin') {
          isAdminMode = true;
          sessionStorage.setItem('brass_band_is_admin', 'true');
          updateAdminModeUi();
        } else {
          if (code !== null) alert('パスコードが正しくありません。');
          return;
        }
      }
      if (confirm(`練習予定「${p ? p.title : ''}」を削除してもよろしいですか？`)) {
        practices = practices.filter(item => item.id !== id);
        saveToStorage();
        deletePracticeFromCloud(id);
        closeModal('detailModal');
        render();
      }
    });
  });
}

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
      document.getElementById('inputConductors').value = cleanSensei(p.conductors);
      document.getElementById('inputGeneralNotes').value = p.generalNotes || '';

      (p.pieces || []).forEach(piece => addPieceInputRow(piece));
      (p.timetable || []).forEach(slot => addTimetableInputRow(slot));
    }
  } else {
    document.getElementById('modalTitle').innerHTML = '📅 練習スケジュールの登録';
    document.getElementById('practiceId').value = '';
    document.getElementById('inputDate').value = formatDate(currentDate);
    addPieceInputRow();
    addTimetableInputRow({ startTime: '18:00', endTime: '21:00', category: '合奏', title: '夜間全体合奏', conductor: '公文' });
  }

  openModal('practiceModal');
}

function addPieceInputRow(piece = {}) {
  const container = document.getElementById('piecesInputsContainer');
  const row = document.createElement('div');
  row.className = 'piece-input-row';

  const optionsHtml = repertoire.map(song => `
    <option value="${song.id}" ${piece.title === song.title ? 'selected' : ''}>[${song.section} ${song.no}] ${song.title} (${cleanSensei(song.conductor)})</option>
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
        <label>指揮者 (公文 / 下川)</label>
        <input type="text" class="form-control piece-conductor-input" value="${escapeHtml(cleanSensei(piece.conductor))}">
      </div>
    </div>
  `;

  row.querySelector('.piece-select-rep').addEventListener('change', (e) => {
    const song = repertoire.find(s => s.id === e.target.value);
    if (song) {
      row.querySelector('.piece-title-input').value = song.title;
      row.querySelector('.piece-conductor-input').value = cleanSensei(song.conductor);
    }
  });

  row.querySelector('.btn-remove-piece').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addTimetableInputRow(slot = {}) {
  const container = document.getElementById('timetableInputsContainer');
  const row = document.createElement('div');
  row.className = 'timetable-input-row';

  const assignedPieceIds = slot.pieceIds || [];
  const songCheckboxesHtml = repertoire.map(song => `
    <label class="song-checkbox-item">
      <input type="checkbox" class="slot-piece-checkbox" value="${song.id}" ${assignedPieceIds.includes(song.id) ? 'checked' : ''}>
      <span>[${song.section}] ${escapeHtml(song.title)} (${cleanSensei(song.conductor)})</span>
    </label>
  `).join('');

  row.innerHTML = `
    <button type="button" class="btn-remove-piece" title="削除">&times;</button>
    
    <div class="form-row" style="margin-bottom: 8px;">
      <div class="form-group">
        <label>⏰ 開始時間 *</label>
        <input type="time" class="form-control slot-start-input" value="${slot.startTime || '18:00'}" required>
      </div>
      <div class="form-group">
        <label>⏰ 終了時間 *</label>
        <input type="time" class="form-control slot-end-input" value="${slot.endTime || '21:00'}" required>
      </div>
    </div>

    <div class="form-row" style="margin-bottom: 8px;">
      <div class="form-group">
        <label>🏷️ 練習区分 *</label>
        <select class="form-control slot-category-select">
          <option value="合奏" ${(slot.category || '合奏') === '合奏' ? 'selected' : ''}>合奏 (全体合奏)</option>
          <option value="パート練習" ${slot.category === 'パート練習' ? 'selected' : ''}>パート/セクション練習</option>
          <option value="個人練習" ${slot.category === '個人練習' ? 'selected' : ''}>個人練習</option>
          <option value="本番" ${slot.category === '本番' ? 'selected' : ''}>本番・演奏会</option>
          <option value="その他" ${slot.category === 'その他' ? 'selected' : ''}>その他・休憩</option>
        </select>
      </div>
      <div class="form-group">
        <label>👨‍🏫 指揮者 (公文 / 下川 / 自由入力)</label>
        <input type="text" class="form-control slot-conductor-input" value="${escapeHtml(cleanSensei(slot.conductor))}" placeholder="例: 公文 / 下川">
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label>✏️ 時間枠タイトル *</label>
      <input type="text" class="form-control slot-title-input" value="${escapeHtml(cleanSensei(slot.title))}" placeholder="例: 全体合奏 (第1部通し) / セクション練習" required>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label>🎼 練習曲目 (ライブラリから選択)</label>
      <div class="song-checkboxes-grid">
        ${songCheckboxesHtml}
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label>✏️ 練習曲目 (自由入力・補足曲名)</label>
      <input type="text" class="form-control slot-custom-piece-input" value="${escapeHtml(cleanSensei(slot.customPiece))}" placeholder="例: 冒頭ファンファーレ、アンコール案、基礎合奏トレモロ">
    </div>

    <div class="form-row" style="margin-bottom: 8px;">
      <div class="form-group">
        <label>🎬 YouTube動画URL (任意)</label>
        <input type="text" class="form-control slot-yt-input" value="${escapeHtml(slot.youtubeUrl || '')}" placeholder="https://www.youtube.com/...">
      </div>
      <div class="form-group">
        <label>💬 メッセージ (記入がある場合のみ表示)</label>
        <input type="text" class="form-control slot-message-input" value="${escapeHtml(cleanSensei(slot.message || slot.details))}" placeholder="例: 16:00開始にご注意ください、譜面台持参">
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
  const title = cleanSensei(document.getElementById('inputTitle').value);
  const locationName = document.getElementById('inputLocationName').value;
  const conductors = cleanSensei(document.getElementById('inputConductors').value);
  const generalNotes = cleanSensei(document.getElementById('inputGeneralNotes').value);

  const pieces = [];
  document.querySelectorAll('#piecesInputsContainer .piece-input-row').forEach(row => {
    const pTitle = row.querySelector('.piece-title-input').value.trim();
    if (pTitle) {
      pieces.push({
        title: pTitle,
        conductor: cleanSensei(row.querySelector('.piece-conductor-input').value.trim())
      });
    }
  });

  const timetable = [];
  document.querySelectorAll('#timetableInputsContainer .timetable-input-row').forEach(row => {
    const sTitle = cleanSensei(row.querySelector('.slot-title-input').value.trim());
    const startTime = row.querySelector('.slot-start-input').value;
    const endTime = row.querySelector('.slot-end-input').value;
    const slotCategory = row.querySelector('.slot-category-select').value;
    const conductor = cleanSensei(row.querySelector('.slot-conductor-input').value.trim());
    const customPiece = cleanSensei(row.querySelector('.slot-custom-piece-input').value.trim());
    const youtubeUrl = row.querySelector('.slot-yt-input').value.trim();
    const message = cleanSensei(row.querySelector('.slot-message-input').value.trim());

    const checkedIds = Array.from(row.querySelectorAll('.slot-piece-checkbox:checked')).map(cb => cb.value);

    if (sTitle || startTime || checkedIds.length > 0 || customPiece) {
      timetable.push({
        startTime: startTime || '18:00',
        endTime: endTime || '21:00',
        category: slotCategory || '合奏',
        title: sTitle || '練習セクション',
        conductor: conductor,
        pieceIds: checkedIds,
        customPiece: customPiece,
        youtubeUrl: youtubeUrl,
        message: message
      });
    }
  });

  const newPractice = { id, date, category, title, locationName, conductors, generalNotes, pieces, timetable };
  const idx = practices.findIndex(p => p.id === id);
  if (idx >= 0) practices[idx] = newPractice;
  else practices.push(newPractice);

  saveToStorage();
  syncPracticeToCloud(newPractice);
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
    text += `\n【${i+1}】${p.date} (${p.category})\n📌 ${cleanSensei(p.title)}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${cleanSensei(p.conductors) || '未定'}\n`;
  });
  text += `\n📱 Webアプリ:\n${window.location.href}`;
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
}

function copyBulkLineTextToClipboard() {
  const selected = getPracticesInSelectedRange();
  let text = `🎵【吹奏楽 一括練習案内】\n--------------------\n`;
  selected.forEach((p, i) => {
    text += `\n【${i+1}】${p.date} (${p.category})\n📌 ${cleanSensei(p.title)}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${cleanSensei(p.conductors) || '未定'}\n`;
  });
  navigator.clipboard.writeText(text).then(() => alert('一括練習案内をコピーしました'));
}

function openExportModal(id) {
  activePracticeForExport = practices.find(p => p.id === id);
  if (!activePracticeForExport) return;
  openModal('exportModal');
}

function buildPracticeShareUrl(practice) {
  try {
    const jsonStr = JSON.stringify(practice);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const origin = window.location.origin;
    let path = window.location.pathname;
    if (path.endsWith('index.html')) path = path.substring(0, path.length - 'index.html'.length);
    if (!path.endsWith('/')) path += '/';
    return `${origin}${path}mobile.html?pdata=${encodeURIComponent(encoded)}`;
  } catch (e) {
    return window.location.href;
  }
}

function checkUrlDeepLinkImport() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const pdata = urlParams.get('pdata');
    if (pdata) {
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(pdata))));
      const sharedPractice = JSON.parse(jsonStr);
      if (sharedPractice && sharedPractice.id && sharedPractice.date) {
        const idx = practices.findIndex(p => p.id === sharedPractice.id || p.date === sharedPractice.date);
        if (idx >= 0) {
          practices[idx] = sharedPractice;
        } else {
          practices.push(sharedPractice);
        }
        sanitizeAllConductors(practices);
        saveToStorage();
        
        currentDate = new Date(sharedPractice.date);
        selectedDateForMobileSheet = sharedPractice.date;
      }
    }
  } catch (e) {
    console.error('Deep link import error:', e);
  }
}

function shareToLine() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;
  const shareUrl = buildPracticeShareUrl(p);
  let text = `🎵【吹奏楽 練習連絡】\n📌 ${cleanSensei(p.title)}\n📅 日時: ${p.date} (${p.category})\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${cleanSensei(p.conductors) || '未定'}\n\n📱 タップして最新の練習スケジュール・詳細を確認:\n${shareUrl}`;
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
}

function copyLineTextToClipboard() {
  if (!activePracticeForExport) return;
  const p = activePracticeForExport;
  const shareUrl = buildPracticeShareUrl(p);
  let text = `🎵【吹奏楽 練習連絡】\n📌 ${cleanSensei(p.title)}\n📅 日時: ${p.date} (${p.category})\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${cleanSensei(p.conductors) || '未定'}\n\n📱 タップして最新の練習スケジュール・詳細を確認:\n${shareUrl}`;
  navigator.clipboard.writeText(text).then(() => alert('一括共有テキスト（最新データURL付き）をコピーしました'));
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

function getGoogleMapsUrl(name, address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name || '') + ' ' + (address || ''))}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
