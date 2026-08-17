const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = '/Users/kumonmotohiro/.gemini/antigravity/brain/f378e43c-aa9a-430b-8f5d-e10731ae9be7';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Mobile Capture (iPhone 14 Pro Portrait Viewport: 393 x 852)
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await mobilePage.goto('http://localhost:8081/mobile.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // Click August 29th cell to reveal timeline sheet
  const cell29 = await mobilePage.$('.m-day-cell:not(.other-month):nth-child(35)'); // 29th
  if (cell29) await cell29.click();
  await new Promise(r => setTimeout(r, 500));

  await mobilePage.screenshot({ path: path.join(artifactDir, 'latest_mobile_month.png'), fullPage: false });

  // Switch to Timetable tab
  const timetableTab = await mobilePage.$('.m-nav-item[data-view="timetable"]');
  if (timetableTab) await timetableTab.click();
  await new Promise(r => setTimeout(r, 600));

  await mobilePage.screenshot({ path: path.join(artifactDir, 'latest_mobile_timetable.png'), fullPage: false });

  // Switch to Repertoire tab
  const repertoireTab = await mobilePage.$('.m-nav-item[data-view="repertoire"]');
  if (repertoireTab) await repertoireTab.click();
  await new Promise(r => setTimeout(r, 600));

  await mobilePage.screenshot({ path: path.join(artifactDir, 'latest_mobile_repertoire.png'), fullPage: false });

  // 2. PC Desktop Capture (1280 x 850)
  const pcPage = await browser.newPage();
  await pcPage.setViewport({ width: 1280, height: 850, deviceScaleFactor: 1.5 });

  await pcPage.goto('http://localhost:8081/index.html?desktop=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // Click 29th day cell to show timeline sheet in Month view
  const pcCells = await pcPage.$$('.calendar-day-cell');
  for (const c of pcCells) {
    const text = await pcPage.evaluate(el => el.textContent, c);
    if (text.includes('29')) {
      await c.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await pcPage.screenshot({ path: path.join(artifactDir, 'latest_pc_month.png') });

  // Click Timetable Tab
  const pcTimetableTab = await pcPage.$('.tab-btn[data-view="timetable"]');
  if (pcTimetableTab) await pcTimetableTab.click();
  await new Promise(r => setTimeout(r, 600));
  await pcPage.screenshot({ path: path.join(artifactDir, 'latest_pc_timetable.png') });

  // Click on an event badge to open detail modal
  const badge = await pcPage.$('.event-badge');
  if (badge) await badge.click();
  await new Promise(r => setTimeout(r, 600));
  await pcPage.screenshot({ path: path.join(artifactDir, 'latest_pc_modal.png') });

  await browser.close();
  console.log('All latest screenshots captured cleanly!');
})();
