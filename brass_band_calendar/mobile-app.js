/**
 * 吹奏楽専用カレンダー Smartphone App Main Logic (mobile-app.js)
 * View-Only Mode & Admin Mode + Cache-Buster & "先生" Aggressive Sanitizer
 */

import { INITIAL_PRACTICE_DATA, MASTER_REPERTOIRE } from './sample-data.js';

// Shared Storage Keys with PC version (Bumped to v7 for immediate cache invalidation)
const PERMANENT_STORAGE_KEY_PRACTICES = 'brass_band_calendar_practices_v7';
const PERMANENT_STORAGE_KEY_REPERTOIRE = 'brass_band_calendar_repertoire_v7';
const ADMIN_MODE_STORAGE_KEY = 'brass_band_calendar_is_admin';

// Global State
let practices = [];
let repertoire = [];
let currentDate = new Date();
let currentView = 'month';
let selectedCategory = 'all';
let selectedDateForMobileSheet = null;
let isAdminMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  checkAdminMode();
  setupMobileEventListeners();
  renderMobile();
});

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
  const badge = document.getElementById('mAdminModeBadge');
  if (badge) {
    if (isAdminMode) {
      badge.innerHTML = `🔑 <span style="color:#fef08a;">管理者モード (編集可)</span>`;
    } else {
      badge.innerHTML = `👁️ <span style="color:#cbd5e1;">閲覧専用モード</span>`;
    }
  }

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
      renderMobile();
    }
  } else {
    const code = prompt('管理者パスコードを入力してください:\n(初期パスコード: 1234)');
    if (code === '1234' || code === 'admin') {
      isAdminMode = true;
      localStorage.setItem(ADMIN_MODE_STORAGE_KEY, 'true');
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
    if (pData) loadedPractices = JSON.parse(pData);

    const rData = localStorage.getItem(PERMANENT_STORAGE_KEY_REPERTOIRE);
    if (rData) loadedRepertoire = JSON.parse(rData);
  } catch (e) {}

  practices = loadedPractices || JSON.parse(JSON.stringify(INITIAL_PRACTICE_DATA));
  repertoire = loadedRepertoire || JSON.parse(JSON.stringify(MASTER_REPERTOIRE));

  sanitizeAllConductorNames();
  saveToStorage();
}

function sanitizeAllConductorNames() {
  const cleanStr = (str) => {
    if (!str) return '';
    return str.replace(/\s*先生/g, '').trim();
  };

  repertoire.forEach(s => {
    if (s.conductor) s.conductor = cleanStr(s.conductor);
  });

  practices.forEach(p => {
    if (p.conductors) p.conductors = cleanStr(p.conductors);
    (p.pieces || []).forEach(pc => {
      if (pc.conductor) pc.conductor = cleanStr(pc.conductor);
    });
  });
}

function saveToStorage() {
  try {
    localStorage.setItem(PERMANENT_STORAGE_KEY_PRACTICES, JSON.stringify(practices));
    localStorage.setItem(PERMANENT_STORAGE_KEY_REPERTOIRE, JSON.stringify(repertoire));
    localStorage.setItem('brass_band_calendar_practices_permanent', JSON.stringify(practices));
    localStorage.setItem('brass_band_calendar_repertoire_permanent', JSON.stringify(repertoire));
  } catch (e) {
    console.error('Mobile save error:', e);
  }
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
    const videoBtnsHtml = (song.videos || []).map((v, idx) => `
      <button class="m-btn-yt-highlight btn-play-rep-video" data-songid="${song.id}" data-vididx="${idx}">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)}
      </button>
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
          👨‍🏫 指揮: <strong>${escapeHtml(song.conductor || '未定')}</strong>
        </div>

        ${song.points ? `
          <div style="font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; margin-top: 6px; white-space: pre-wrap; color: var(--text-secondary);">
            ${escapeHtml(song.points)}
          </div>
        ` : ''}

        ${videoBtnsHtml ? `<div style="margin-top: 8px;">${videoBtnsHtml}</div>` : ''}
      </div>
    `;
  }).join('');

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
      <button class="m-btn-yt-highlight btn-play-card-video" data-songtitle="${escapeHtml(piece.title)}" data-videos='${JSON.stringify(videos).replace(/'/g, "&apos;")}' data-idx="${idx}">
        🎬 ${escapeHtml(v.title || `演奏動画 ${idx+1}`)}
      </button>
    `).join('');

    return `
      <div class="m-piece-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.95rem; color:var(--color-brass-light);">🎼 ${escapeHtml(piece.title)}</span>
          ${piece.conductor ? `<span style="font-size:0.75rem; background:rgba(229,193,88,0.15); color:var(--color-brass-light); padding:2px 6px; border-radius:4px;">👨‍🏫 ${escapeHtml(piece.conductor)}</span>` : ''}
        </div>
        ${piece.points ? `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px;">${escapeHtml(piece.points)}</div>` : ''}
        ${videoBtnsHtml}
      </div>
    `;
  }).join('');

  const timetableHtml = (practice.timetable || []).map(slot => {
    const assignedSongs = (slot.pieceIds || []).map(songId => repertoire.find(s => s.id === songId)).filter(Boolean);

    const slotSongsHtml = assignedSongs.map(song => {
      const vList = song.videos || [];
      return `
        <div style="margin-top: 6px; background: rgba(229,193,88,0.1); border: 1px solid var(--glass-border-gold); padding: 6px 8px; border-radius: 6px;">
          <div style="font-size:0.82rem; font-weight:800; color:var(--color-brass-light);">🎼 ${escapeHtml(song.title)}</div>
          <button class="m-btn-yt-highlight btn-play-slot-video" data-songtitle="${escapeHtml(song.title)}" data-videos='${JSON.stringify(vList).replace(/'/g, "&apos;")}' style="margin-top:4px;">
            🎬 YouTube再生
          </button>
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
        ${practice.conductors ? `<div>👨‍🏫 指揮: <strong>${escapeHtml(practice.conductors)}</strong></div>` : ''}
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
  container.querySelectorAll('.btn-play-card-video, .btn-play-slot-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const songTitle = e.currentTarget.dataset.songtitle;
      const videos = JSON.parse(e.currentTarget.dataset.videos);
      const idx = parseInt(e.currentTarget.dataset.idx || 0, 10);
      openYoutubeMultiVideoModal(songTitle, videos, idx);
    });
  });

  container.querySelectorAll('.btn-share-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const p = practices.find(item => item.id === e.currentTarget.dataset.id);
      if (p) {
        let text = `🎵【吹奏楽 練習連絡】\n📌 ${p.title}\n📅 日時: ${p.date}\n📍 場所: ${p.locationName || '未定'}\n👨‍🏫 指揮: ${p.conductors || '未定'}\n📱 Webアプリ:\n${window.location.href}`;
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
      document.getElementById('mInputConductors').value = p.conductors || '';
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
  const conductors = document.getElementById('mInputConductors').value;
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
      document.getElementById('mEditSongConductor').value = song.conductor || '';
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
  const conductor = document.getElementById('mEditSongConductor').value;
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

function openYoutubeMultiVideoModal(songTitle, videos = [], activeIdx = 0) {
  const body = document.getElementById('mDetailModalBody');
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
    <div style="margin-bottom: 10px;">
      <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-brass-light);">🎼 ${escapeHtml(songTitle)}</h4>
    </div>

    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 10px;">
      <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top:0; left:0; width:100%; height:100%;"></iframe>
    </div>

    <div style="margin-top: 12px;">
      <a href="${directLinkUrl}" target="_blank" class="m-btn-yt-highlight" style="text-decoration:none;">
        🎬 YouTubeアプリで開く
      </a>
    </div>
  `;

  openMobileSheet('mDetailModal');
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

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
