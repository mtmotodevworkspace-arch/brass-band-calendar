/**
 * 吹奏楽専用カレンダー Smartphone App Main Logic (mobile-app.js)
 * View-Only Mode (閲覧専用・デフォルト) & Admin Mode (管理者用) + Hard Reset for "先生" + Direct YouTube Launch
 */

import { INITIAL_PRACTICE_DATA, MASTER_REPERTOIRE } from './sample-data.js';

// Storage Keys
const PERMANENT_STORAGE_KEY_PRACTICES = 'brass_band_calendar_practices_v12';
const PERMANENT_STORAGE_KEY_REPERTOIRE = 'brass_band_calendar_repertoire_v12';

// Global State
let practices = [];
let repertoire = [];
let currentDate = new Date();
let currentView = 'month';
let selectedCategory = 'all';
let selectedDateForMobileSheet = null;

// Admin Mode defaults strictly to FALSE (閲覧専用) for all visitors
let isAdminMode = false;

document.addEventListener('DOMContentLoaded', () => {
  hardPurgeSenseiFromLocalStorage();
  initStorage();
  checkAdminMode();
  setupMobileEventListeners();
  renderMobile();
});

function hardPurgeSenseiFromLocalStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.includes('brass') || k.includes('repertoire') || k.includes('practice'))) {
        const val = localStorage.getItem(k);
        if (val && val.includes('先生')) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch (e) {}
}

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
  const badge = document.getElementById('mAdminModeBadge');
  if (badge) {
    if (isAdminMode) {
      badge.innerHTML = `🔑 <span style="color:#fef08a;">管理者モード (編集可)</span>`;
      badge.style.background = 'rgba(239, 68, 68, 0.25)';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    } else {
      badge.innerHTML = `👁️ <span style="color:#cbd5e1;">閲覧専用モード</span>`;
      badge.style.background = 'rgba(255, 255, 255, 0.08)';
      badge.style.borderColor = 'var(--glass-border-gold)';
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
      renderMobile();
    }
  } else {
    const code = prompt('管理者パスコードを入力してください:\n(初期パスコード: 1234)');
    if (code === '1234' || code === 'admin') {
      isAdminMode = true;
      sessionStorage.setItem('brass_band_is_admin', 'true');
      alert('管理者モードにログインしました。編集権限が有効です。');
      updateAdminModeUi();
      renderMobile();
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

  practices = loadedPractices || JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
  repertoire = loadedRepertoire || JSON.parse(JSON.stringify(MASTER_REPERTOIRE));

  sanitizeAllConductors(practices);
  sanitizeAllConductors(repertoire);
  saveToStorage();
}

function sanitizeAllConductors(target) {
  const clean = (str) => {
    if (!str) return '';
    return str.replace(/\s*先生/g, '').trim();
  };

  if (Array.isArray(target)) {
    target.forEach(item => {
      if (item.conductor) item.conductor = clean(item.conductor);
      if (item.conductors) item.conductors = clean(item.conductors);
      if (item.points) item.points = clean(item.points);
      if (item.pieces) {
        item.pieces.forEach(p => { if (p.conductor) p.conductor = clean(p.conductor); });
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

function setupMobileEventListeners() {
  document.getElementById('mBtnPrev').addEventListener('click', () => navigateDate(-1));
  document.getElementById('mBtnNext').addEventListener('click', () => navigateDate(1));
  document.getElementById('mBtnToday').addEventListener('click', () => {
    currentDate = new Date();
    selectedDateForMobileSheet = formatDate(currentDate);
    renderMobile();
  });

  document.getElementById('mAdminModeBadge').addEventListener('click', promptAdminLogin);

  document.querySelectorAll('.m-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.m-nav-item').forEach(i => i.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      currentView = target.dataset.view;
      renderMobile();
    });
  });

  document.querySelectorAll('.m-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.m-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedCategory = e.currentTarget.dataset.cat;
      renderMobile();
    });
  });

  document.getElementById('mBtnAddPractice').addEventListener('click', () => {
    if (!isAdminMode) return promptAdminLogin();
    openMobilePracticeModal();
  });

  document.getElementById('mBtnAddNewSong').addEventListener('click', () => {
    if (!isAdminMode) return promptAdminLogin();
    openMobileEditSongModal();
  });

  document.getElementById('mBtnBackup').addEventListener('click', () => openMobileSheet('mBackupModal'));
  document.getElementById('mBtnBulkExport').addEventListener('click', openMobileBulkModal);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeMobileSheet(e.currentTarget.dataset.close);
    });
  });

  document.getElementById('mBtnAddPieceRow').addEventListener('click', () => addMobilePieceRow());
  document.getElementById('mBtnAddTimetableRow').addEventListener('click', () => addMobileTimetableRow());
  document.getElementById('mBtnAddSongVideoRow').addEventListener('click', () => addMobileSongVideoRow());

  document.getElementById('mPracticeForm').addEventListener('submit', handleMobilePracticeSubmit);
  document.getElementById('mEditSongForm').addEventListener('submit', handleMobileEditSongSubmit);

  document.getElementById('mBtnExportJson').addEventListener('click', exportDataAsJson);
  document.getElementById('mBtnImportJson').addEventListener('click', () => document.getElementById('mImportJsonFile').click());
  document.getElementById('mImportJsonFile').addEventListener('change', importDataFromJson);
  document.getElementById('mBtnResetData').addEventListener('click', resetToSampleData);

  document.getElementById('mPresetThisMonth').addEventListener('click', () => setBulkPreset('thisMonth'));
  document.getElementById('mPresetNextMonth').addEventListener('click', () => setBulkPreset('nextMonth'));
  document.getElementById('mPresetAugSep').addEventListener('click', () => setBulkPreset('augSep'));
  document.getElementById('mPresetAll').addEventListener('click', () => setBulkPreset('all'));

  document.getElementById('mBtnBulkLineShare').addEventListener('click', shareBulkToLine);
  document.getElementById('mBtnBulkLineCopy').addEventListener('click', copyBulkLineTextToClipboard);
  document.getElementById('mBtnBulkDownloadIcs').addEventListener('click', downloadBulkIcsFile);
}

function navigateDate(dir) {
  if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + dir);
  else currentDate.setDate(currentDate.getDate() + dir);
  renderMobile();
}

function renderMobile() {
  updateMobilePeriodTitle();
  updateAdminModeUi();

  document.getElementById('mMonthView').style.display = 'none';
  document.getElementById('mDayView').style.display = 'none';
  document.getElementById('mTimetableView').style.display = 'none';
  document.getElementById('mRepertoireView').style.display = 'none';

  if (currentView === 'month') {
    document.getElementById('mMonthView').style.display = 'block';
    renderMobileMonthView();
  } else if (currentView === 'day') {
    document.getElementById('mDayView').style.display = 'block';
    renderMobileDayView();
  } else if (currentView === 'timetable') {
    document.getElementById('mTimetableView').style.display = 'block';
    renderMobileTimetableView();
  } else if (currentView === 'repertoire') {
    document.getElementById('mRepertoireView').style.display = 'block';
    renderMobileRepertoireView();
  }
}

function updateMobilePeriodTitle() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth() + 1;
  const d = currentDate.getDate();
  const titleEl = document.getElementById('mCurrentPeriodText');
  if (currentView === 'month') titleEl.textContent = `${y}年 ${m}月`;
  else if (currentView === 'repertoire') titleEl.textContent = `全${repertoire.length}曲 ライブラリ`;
  else titleEl.textContent = `${y}年 ${m}月 ${d}日`;
}

function renderMobileMonthView() {
  const grid = document.querySelector('.m-month-grid');
  grid.innerHTML = `
    <div class="m-weekday sun">日</div>
    <div class="m-weekday">月</div>
    <div class="m-weekday">火</div>
    <div class="m-weekday">水</div>
    <div class="m-weekday">木</div>
    <div class="m-weekday">金</div>
    <div class="m-weekday sat">土</div>
  `;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const todayStr = formatDate(new Date());
  if (!selectedDateForMobileSheet) selectedDateForMobileSheet = todayStr;

  for (let i = firstDayIndex; i > 0; i--) {
    grid.appendChild(createMobileDayCell(prevLastDate - i + 1, true));
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDateForMobileSheet;
    
    let dayEvents = practices.filter(p => p.date === dateStr);
    if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

    grid.appendChild(createMobileDayCell(day, false, isToday, dateStr, dayEvents, isSelected));
  }

  renderMobileDaySheet();
}

function createMobileDayCell(dayNum, isOtherMonth, isToday = false, dateStr = null, dayEvents = [], isSelected = false) {
  const cell = document.createElement('div');
  cell.className = `m-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;

  if (dateStr) {
    cell.addEventListener('click', () => {
      selectedDateForMobileSheet = dateStr;
      currentDate = new Date(dateStr);
      renderMobileMonthView();
    });
  }

  const numEl = document.createElement('div');
  numEl.className = 'm-day-num';
  numEl.textContent = dayNum;
  cell.appendChild(numEl);

  const dotsEl = document.createElement('div');
  dotsEl.className = 'm-day-events';

  dayEvents.forEach(evt => {
    const dot = document.createElement('div');
    dot.className = `m-event-dot m-dot-${evt.category}`;
    dot.textContent = evt.title;
    dotsEl.appendChild(dot);
  });

  cell.appendChild(dotsEl);
  return cell;
}

function renderMobileDaySheet() {
  const container = document.getElementById('mDaySheetContainer');
  if (!container) return;

  const dateStr = selectedDateForMobileSheet || formatDate(currentDate);
  let dayEvents = practices.filter(p => p.date === dateStr);
  if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

  if (dayEvents.length === 0) {
    container.innerHTML = `
      <div class="m-day-sheet-card" style="text-align: center; color: var(--text-muted);">
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--color-brass-light);">📅 ${dateStr} の予定</div>
        <p style="font-size: 0.8rem; margin-top: 6px;">この日の練習予定はありません。</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="m-day-sheet-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 1rem; font-weight: 800; color: var(--color-brass-light);">📅 ${dateStr} の練習詳細</span>
        <button class="m-btn-sm" onclick="document.querySelectorAll('.m-nav-item[data-view=\\'day\\']')[0].click()">日表示で開く ➔</button>
      </div>
      ${dayEvents.map(evt => renderMobilePracticeCardHtml(evt)).join('')}
    </div>
  `;

  attachMobilePracticeCardEvents(container);
}

function renderMobileDayView() {
  const container = document.getElementById('mDayViewContent');
  const dateStr = formatDate(currentDate);

  let dayEvents = practices.filter(p => p.date === dateStr);
  if (selectedCategory !== 'all') dayEvents = dayEvents.filter(p => p.category === selectedCategory);

  if (dayEvents.length === 0) {
    container.innerHTML = `<div class="m-practice-card" style="text-align: center; color: var(--text-muted); padding: 30px;">この日の練習予定はありません</div>`;
    return;
  }

  container.innerHTML = dayEvents.map(evt => renderMobilePracticeCardHtml(evt)).join('');
  attachMobilePracticeCardEvents(container);
}

function renderMobileTimetableView() {
  const container = document.getElementById('mTimetableContent');
  let filtered = [...practices];
  if (selectedCategory !== 'all') filtered = filtered.filter(p => p.category === selectedCategory);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="m-practice-card" style="text-align: center; color: var(--text-muted); padding: 30px;">表示できる時間割がありません。</div>`;
    return;
  }

  container.innerHTML = filtered.map(evt => renderMobilePracticeCardHtml(evt, true)).join('');
  attachMobilePracticeCardEvents(container);
}

function renderMobileRepertoireView() {
  const container = document.getElementById('mRepertoireContent');
  if (!repertoire || repertoire.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">曲目がありません</div>`;
    return;
  }

  container.innerHTML = repertoire.map(song => {
    const cleanCond = (song.conductor || '未定').replace(/\s*先生/g, '').trim();
    const videoBtnsHtml = (song.videos || []).map((v, idx) => `
      <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="m-btn-yt-highlight" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; margin-right: 6px; margin-top: 6px;">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)} <span style="font-size: 0.72rem; opacity: 0.8;">YouTubeアプリ起動 ↗</span>
      </a>
    `).join('');

    return `
      <div class="m-practice-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <span class="m-badge" style="background: rgba(229,193,88,0.2); color: var(--color-brass-light);">${song.section} ${song.no}</span>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin-top: 4px;">🎼 ${escapeHtml(song.title)}</h3>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(song.composer || '')}</div>
          </div>
          ${isAdminMode ? `<button class="m-btn-sm btn-edit-song" data-songid="${song.id}">✏️ 編集</button>` : ''}
        </div>

        <div style="font-size: 0.82rem; margin-top: 6px; color: var(--text-gold);">
          👨‍🏫 指揮: <strong>${escapeHtml(cleanCond)}</strong>
        </div>

        ${song.points ? `
          <div style="font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; margin-top: 6px; white-space: pre-wrap; color: var(--text-secondary);">
            ${escapeHtml(song.points.replace(/\s*先生/g, ''))}
          </div>
        ` : ''}

        ${videoBtnsHtml ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap;">${videoBtnsHtml}</div>` : ''}
      </div>
    `;
  }).join('');

  if (isAdminMode) {
    container.querySelectorAll('.btn-edit-song').forEach(btn => {
      btn.addEventListener('click', (e) => openMobileEditSongModal(e.currentTarget.dataset.songid));
    });
  }
}

function renderMobilePracticeCardHtml(practice, showDate = false) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((practice.locationName || '') + ' ' + (practice.locationAddress || ''))}`;

  const piecesHtml = (practice.pieces || []).map(piece => {
    const matchedRepSong = repertoire.find(s => s.title === piece.title);
    let videos = piece.videos && piece.videos.length > 0 ? [...piece.videos] : [];
    if (videos.length === 0 && matchedRepSong && matchedRepSong.videos) videos = [...matchedRepSong.videos];
    if (videos.length === 0) videos = [{ title: `${piece.title} 吹奏楽参考音源`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(piece.title + ' 吹奏楽')}` }];

    const videoBtnsHtml = videos.map((v, idx) => `
      <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="m-btn-yt-highlight" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; margin-right: 6px; margin-top: 6px;">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)} <span style="font-size: 0.72rem; opacity: 0.8;">YouTubeアプリ起動 ↗</span>
      </a>
    `).join('');

    const cleanCond = (piece.conductor || '').replace(/\s*先生/g, '');

    return `
      <div class="m-piece-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.95rem; color:var(--color-brass-light);">🎼 ${escapeHtml(piece.title)}</span>
          ${cleanCond ? `<span style="font-size:0.75rem; background:rgba(229,193,88,0.15); color:var(--color-brass-light); padding:2px 6px; border-radius:4px;">👨‍🏫 ${escapeHtml(cleanCond)}</span>` : ''}
        </div>
        ${piece.points ? `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px;">${escapeHtml(piece.points)}</div>` : ''}
        <div style="display: flex; flex-wrap: wrap; margin-top: 6px;">${videoBtnsHtml}</div>
      </div>
    `;
  }).join('');

  const timetableHtml = (practice.timetable || []).map(slot => {
    const assignedSongs = (slot.pieceIds || []).map(songId => repertoire.find(s => s.id === songId)).filter(Boolean);

    const slotSongsHtml = assignedSongs.map(song => {
      const vList = song.videos || [];
      const ytUrl = vList.length > 0 ? vList[0].url : `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' 吹奏楽')}`;
      return `
        <div style="margin-top: 6px; background: rgba(229,193,88,0.1); border: 1px solid var(--glass-border-gold); padding: 6px 8px; border-radius: 6px;">
          <div style="font-size:0.82rem; font-weight:800; color:var(--color-brass-light);">🎼 ${escapeHtml(song.title)}</div>
          <a href="${escapeHtml(ytUrl)}" target="_blank" rel="noopener noreferrer" class="m-btn-yt-highlight" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; margin-top:4px; font-size: 0.78rem; padding: 6px 12px;">
            🎬 YouTubeアプリ起動 ↗
          </a>
        </div>
      `;
    }).join('');

    return `
      <div class="m-slot-item">
        <div style="font-size:0.82rem; font-weight:800; color:var(--color-brass-light);">⏰ ${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)} <span class="m-badge m-dot-${slot.category || '合奏'}">${escapeHtml(slot.category || '合奏')}</span></div>
        <div style="font-size:0.88rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${escapeHtml(slot.title || '')} ${slot.details ? `<span style="font-size:0.78rem; color:var(--text-muted);">(${escapeHtml(slot.details)})</span>` : ''}</div>
        ${slotSongsHtml}
      </div>
    `;
  }).join('');

  const cleanPracticeCond = (practice.conductors || '').replace(/\s*先生/g, '');

  return `
    <div class="m-practice-card" id="m-card-${practice.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h3 class="m-card-title">${escapeHtml(practice.title)}</h3>
          ${showDate ? `<div style="font-size:0.82rem; color:var(--color-brass-light); font-weight:700; margin-top:2px;">📅 ${practice.date}</div>` : ''}
        </div>
        <span class="m-badge m-dot-${practice.category}">${practice.category}</span>
      </div>

      <div style="margin-top:6px; font-size:0.8rem; color:var(--text-secondary); display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        ${practice.locationName ? `<div>📍 ${escapeHtml(practice.locationName)} <a href="${mapUrl}" target="_blank" class="m-btn-sm" style="text-decoration:none;">🗺️ Map</a></div>` : ''}
        ${cleanPracticeCond ? `<div>👨‍🏫 指揮: <strong>${escapeHtml(cleanPracticeCond)}</strong></div>` : ''}
      </div>

      ${piecesHtml ? `<div style="margin-top:10px;"><div style="font-size:0.82rem; font-weight:800; color:var(--color-brass-light);">🎼 練習曲 & 参考音源 (YouTube)</div>${piecesHtml}</div>` : ''}
      ${timetableHtml ? `<div style="margin-top:10px;"><div style="font-size:0.82rem; font-weight:800; color:var(--color-brass-light);">⏱️ 練習時間割</div>${timetableHtml}</div>` : ''}

      ${practice.generalNotes ? `
        <div style="margin-top:8px; padding:6px 10px; background:rgba(229,193,88,0.08); border-radius:6px; border:1px dashed var(--glass-border-gold); font-size:0.78rem; color:var(--text-secondary);">
          ℹ️ ${escapeHtml(practice.generalNotes)}
        </div>
      ` : ''}

      <div style="display:flex; gap:6px; margin-top:12px;">
        <button class="m-btn-line btn-share-practice" data-id="${practice.id}" style="flex:1;">📲 LINE共有</button>
        ${isAdminMode ? `<button class="m-btn-glass btn-edit-practice" data-id="${practice.id}">✏️ 編集</button>` : ''}
      </div>
    </div>
  `;
}

function attachMobilePracticeCardEvents(container) {
  container.querySelectorAll('.btn-share-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const p = practices.find(item => item.id === e.currentTarget.dataset.id);
      if (p) {
        let text = `🎵【吹奏楽 練習連絡】\n📌 ${p.title}\n📅 日時: ${p.date}\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n📱 アプリ:\n${window.location.href}`;
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
      }
    });
  });

  if (isAdminMode) {
    container.querySelectorAll('.btn-edit-practice').forEach(btn => {
      btn.addEventListener('click', (e) => openMobilePracticeModal(e.currentTarget.dataset.id));
    });
  }
}

function openMobileSheet(id) { document.getElementById(id).classList.add('active'); }
function closeMobileSheet(id) { document.getElementById(id).classList.remove('active'); }

function openMobilePracticeModal(id = null) {
  const form = document.getElementById('mPracticeForm');
  form.reset();
  document.getElementById('mPiecesContainer').innerHTML = '';
  document.getElementById('mTimetableContainer').innerHTML = '';

  if (id) {
    const p = practices.find(item => item.id === id);
    if (p) {
      document.getElementById('mModalTitle').textContent = '✏️ 練習の編集';
      document.getElementById('mPracticeId').value = p.id;
      document.getElementById('mInputDate').value = p.date;
      document.getElementById('mInputCategory').value = p.category;
      document.getElementById('mInputTitle').value = p.title;
      document.getElementById('mInputLocationName').value = p.locationName || '';
      document.getElementById('mInputConductors').value = (p.conductors || '').replace(/\s*先生/g, '');
      document.getElementById('mInputNotes').value = p.generalNotes || '';

      (p.pieces || []).forEach(pc => addMobilePieceRow(pc));
      (p.timetable || []).forEach(st => addMobileTimetableRow(st));
    }
  } else {
    document.getElementById('mModalTitle').textContent = '📅 練習の登録';
    document.getElementById('mPracticeId').value = '';
    document.getElementById('mInputDate').value = formatDate(currentDate);
    addMobilePieceRow();
    addMobileTimetableRow({ startTime: '18:00', endTime: '21:00', category: '合奏', title: '夜間通常練習' });
  }

  openMobileSheet('mPracticeModal');
}

function addMobilePieceRow(piece = {}) {
  const container = document.getElementById('mPiecesContainer');
  const row = document.createElement('div');
  row.className = 'm-piece-item';

  const optionsHtml = repertoire.map(song => `
    <option value="${song.id}" ${piece.title === song.title ? 'selected' : ''}>${song.title}</option>
  `).join('');

  row.innerHTML = `
    <select class="m-input m-piece-select" style="margin-bottom:4px;">
      <option value="">-- ライブラリから曲を選択 --</option>
      ${optionsHtml}
    </select>
    <input type="text" class="m-input m-piece-title" value="${escapeHtml(piece.title || '')}" placeholder="曲名">
  `;

  row.querySelector('.m-piece-select').addEventListener('change', (e) => {
    const song = repertoire.find(s => s.id === e.target.value);
    if (song) row.querySelector('.m-piece-title').value = song.title;
  });

  container.appendChild(row);
}

function addMobileTimetableRow(slot = {}) {
  const container = document.getElementById('mTimetableContainer');
  const row = document.createElement('div');
  row.className = 'm-slot-item';

  const assignedPieceIds = slot.pieceIds || [];
  const songCheckboxesHtml = repertoire.map(song => `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; margin-top:2px; color:var(--text-primary);">
      <input type="checkbox" class="m-slot-piece-cb" value="${song.id}" ${assignedPieceIds.includes(song.id) ? 'checked' : ''}>
      <span>${escapeHtml(song.title)}</span>
    </label>
  `).join('');

  row.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:4px;">
      <input type="time" class="m-input m-slot-start" value="${slot.startTime || '18:00'}">
      <input type="time" class="m-input m-slot-end" value="${slot.endTime || '21:00'}">
    </div>
    <input type="text" class="m-input m-slot-title" value="${escapeHtml(slot.title || '')}" placeholder="時間枠タイトル">
    <div style="margin-top:6px; background:rgba(0,0,0,0.2); padding:6px; border-radius:6px;">
      <div style="font-size:0.75rem; font-weight:700; color:var(--color-brass-light);">🎼 合わせる曲目 (複数可)</div>
      ${songCheckboxesHtml}
    </div>
  `;

  container.appendChild(row);
}

function handleMobilePracticeSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('mPracticeId').value || 'p-' + Date.now();
  const date = document.getElementById('mInputDate').value;
  const category = document.getElementById('mInputCategory').value;
  const title = document.getElementById('mInputTitle').value;
  const locationName = document.getElementById('mInputLocationName').value;
  const conductors = document.getElementById('mInputConductors').value.replace(/\s*先生/g, '');
  const generalNotes = document.getElementById('mInputNotes').value;

  const pieces = [];
  document.querySelectorAll('#mPiecesContainer .m-piece-item').forEach(row => {
    const pTitle = row.querySelector('.m-piece-title').value.trim();
    if (pTitle) pieces.push({ title: pTitle, conductor: conductors });
  });

  const timetable = [];
  document.querySelectorAll('#mTimetableContainer .m-slot-item').forEach(row => {
    const sTitle = row.querySelector('.m-slot-title').value.trim();
    if (sTitle) {
      const checkedIds = Array.from(row.querySelectorAll('.m-slot-piece-cb:checked')).map(cb => cb.value);
      timetable.push({
        startTime: row.querySelector('.m-slot-start').value,
        endTime: row.querySelector('.m-slot-end').value,
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
  closeMobileSheet('mPracticeModal');
  renderMobile();
}

function openMobileEditSongModal(songId = null) {
  const form = document.getElementById('mEditSongForm');
  form.reset();
  document.getElementById('mSongVideosContainer').innerHTML = '';
  const delBtn = document.getElementById('mBtnDeleteSong');

  if (songId) {
    const song = repertoire.find(s => s.id === songId);
    if (song) {
      document.getElementById('mEditSongTitleText').textContent = '✏️ 曲目の編集';
      document.getElementById('mEditSongId').value = song.id;
      document.getElementById('mEditSongSection').value = song.section || '第1部';
      document.getElementById('mEditSongNo').value = song.no || '';
      document.getElementById('mEditSongTitle').value = song.title || '';
      document.getElementById('mEditSongComposer').value = song.composer || '';
      document.getElementById('mEditSongConductor').value = (song.conductor || '').replace(/\s*先生/g, '');
      document.getElementById('mEditSongPoints').value = song.points || '';
      delBtn.style.display = 'block';
      (song.videos || []).forEach(v => addMobileSongVideoRow(v));
    }
  } else {
    document.getElementById('mEditSongTitleText').textContent = '➕ 新しい曲目の追加';
    document.getElementById('mEditSongId').value = '';
    delBtn.style.display = 'none';
    addMobileSongVideoRow();
  }

  openMobileSheet('mEditSongModal');
}

function addMobileSongVideoRow(video = {}) {
  const container = document.getElementById('mSongVideosContainer');
  const row = document.createElement('div');
  row.className = 'm-slot-item';

  row.innerHTML = `
    <input type="text" class="m-input m-vtitle" value="${escapeHtml(video.title || '')}" placeholder="動画タイトル" style="margin-bottom:4px;">
    <input type="text" class="m-input m-vurl" value="${escapeHtml(video.url || '')}" placeholder="YouTube URL">
  `;

  container.appendChild(row);
}

function handleMobileEditSongSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('mEditSongId').value || 'rep-' + Date.now();
  const section = document.getElementById('mEditSongSection').value;
  const no = document.getElementById('mEditSongNo').value;
  const title = document.getElementById('mEditSongTitle').value;
  const composer = document.getElementById('mEditSongComposer').value;
  const conductor = document.getElementById('mEditSongConductor').value.replace(/\s*先生/g, '');
  const points = document.getElementById('mEditSongPoints').value;

  const videos = [];
  document.querySelectorAll('#mSongVideosContainer .m-slot-item').forEach(row => {
    const vt = row.querySelector('.m-vtitle').value.trim();
    const vu = row.querySelector('.m-vurl').value.trim();
    if (vt || vu) {
      videos.push({
        title: vt || `${title} 演奏動画`,
        url: vu || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 吹奏楽')}`
      });
    }
  });

  const songObj = { id, section, no, title, composer, conductor, points, videos };
  const idx = repertoire.findIndex(s => s.id === id);
  if (idx >= 0) repertoire[idx] = songObj;
  else repertoire.push(songObj);

  saveToStorage();
  closeMobileSheet('mEditSongModal');
  renderMobile();
}

function openMobileBulkModal() {
  setBulkPreset('augSep');
  openMobileSheet('mBulkModal');
}

function setBulkPreset(presetKey) {
  const startInput = document.getElementById('mBulkStartDate');
  const endInput = document.getElementById('mBulkEndDate');
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
}

function shareBulkToLine() {
  const startStr = document.getElementById('mBulkStartDate').value;
  const endStr = document.getElementById('mBulkEndDate').value;
  const selectedPractices = practices.filter(p => p.date >= startStr && p.date <= endStr).sort((a, b) => a.date.localeCompare(b.date));

  if (selectedPractices.length === 0) return alert('指定期間の練習予定がありません');

  let text = `🎵【吹奏楽 一括練習連絡】\n🗓️ 期間: ${startStr} ～ ${endStr}\n------------------\n`;
  selectedPractices.forEach((p, idx) => {
    text += `\n【${idx + 1}】${p.date} (${p.category})\n📌 ${p.title}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n`;
  });
  text += `\n📱 アプリ:\n${window.location.href}`;

  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
}

function copyBulkLineTextToClipboard() {
  const startStr = document.getElementById('mBulkStartDate').value;
  const endStr = document.getElementById('mBulkEndDate').value;
  const selectedPractices = practices.filter(p => p.date >= startStr && p.date <= endStr).sort((a, b) => a.date.localeCompare(b.date));

  let text = `🎵【吹奏楽 一括練習連絡】\n🗓️ 期間: ${startStr} ～ ${endStr}\n------------------\n`;
  selectedPractices.forEach((p, idx) => {
    text += `\n【${idx + 1}】${p.date} (${p.category})\n📌 ${p.title}\n📍 ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n`;
  });

  navigator.clipboard.writeText(text).then(() => alert('一括テキストをコピーしました！'));
}

function downloadBulkIcsFile() {
  const startStr = document.getElementById('mBulkStartDate').value;
  const endStr = document.getElementById('mBulkEndDate').value;
  const selectedPractices = practices.filter(p => p.date >= startStr && p.date <= endStr);

  if (selectedPractices.length === 0) return alert('指定期間の練習予定がありません');

  const vevents = selectedPractices.map(p => {
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
  a.download = `brass_band_${startStr}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportDataAsJson() {
  const payload = { practices, repertoire };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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
      const data = JSON.parse(evt.target.result);
      if (data.practices && data.repertoire) {
        practices = data.practices;
        repertoire = data.repertoire;
        saveToStorage();
        closeMobileSheet('mBackupModal');
        renderMobile();
        alert('データを読み込みました');
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
    closeMobileSheet('mBackupModal');
    renderMobile();
  }
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
