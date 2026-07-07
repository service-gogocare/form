/**
 * GOGOCARE 集氣平台 - API 邏輯
 * 對應 spec.md 第 5 節 (API Design) / 第 7 節 (GAS 流程)
 * 課程投票 / 折扣門檻邏輯對應 docs/souce.md 「熱門課程降價集氣」
 */

/**
 * GET ?action=status
 * 回傳每一堂候選課程目前的集氣人次與已解鎖 / 下一階折扣
 */
function getStatus() {
  var sheet = getSheet_(CONFIG.SHEET_SUMMARY);
  var totals = readAllTotals_(sheet);

  var courses = CONFIG.COURSES.map(function (course) {
    var total = totals[course.id] || 0;
    var tierInfo = getDiscountTierInfo(total);
    return {
      id: course.id,
      name: course.name,
      category: course.category,
      url: course.url,
      imageUrl: course.imageUrl,
      total: total,
      currentDiscount: tierInfo.current ? tierInfo.current.label : null,
      nextTier: tierInfo.next
        ? { threshold: tierInfo.next.threshold, label: tierInfo.next.label }
        : null,
    };
  });

  return {
    success: true,
    eventName: CONFIG.EVENT_NAME,
    courses: courses,
    updateTime: formatDateTime_(new Date()),
  };
}

/**
 * POST ?action=cheer
 * payload: { name, email, courseId, ip?, userAgent? }
 */
function cheer(payload) {
  var validation = validateCheerInput(payload);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  var name = String(payload.name).trim();
  var email = normalizeEmail(payload.email);
  var courseId = validation.courseId;

  var logSheet = getSheet_(CONFIG.SHEET_POWER_LOG);
  var lastRecord = findLatestRecordByEmail_(logSheet, email);

  if (lastRecord) {
    var throttle = checkThrottle(lastRecord.datetime, new Date(), CONFIG.THROTTLE_HOURS);
    if (throttle.throttled) {
      return {
        success: false,
        message: '24小時內只能集氣一次',
        nextTime: formatDateTime_(throttle.nextTime),
      };
    }
  }

  var ip = payload.ip ? String(payload.ip) : 'N/A';
  var userAgent = payload.userAgent ? String(payload.userAgent) : 'N/A';
  appendLogRow_(logSheet, name, email, courseId, ip, userAgent);

  var total = incrementCourseTotal_(courseId);
  var tierInfo = getDiscountTierInfo(total);
  var course = findCourseById_(courseId);

  if (CONFIG.MAIL_ENABLED) {
    try {
      sendConfirmationMail(name, email, course, total, tierInfo);
    } catch (mailErr) {
      // 寄信失敗不影響集氣結果，僅記錄錯誤
      if (typeof console !== 'undefined' && console.error) {
        console.error('sendConfirmationMail failed: ' + mailErr);
      }
    }
  }

  return {
    success: true,
    message: '集氣成功',
    courseId: courseId,
    courseName: course ? course.name : courseId,
    total: total,
    currentDiscount: tierInfo.current ? tierInfo.current.label : null,
    nextTier: tierInfo.next ? { threshold: tierInfo.next.threshold, label: tierInfo.next.label } : null,
  };
}

// ---------------------------------------------------------------------------
// 驗證規則 (spec.md 第 6 節)
// ---------------------------------------------------------------------------

function validateCheerInput(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: '資料格式錯誤' };
  }

  var name = payload.name;
  if (!name || String(name).trim() === '') {
    return { valid: false, message: '姓名不可空白' };
  }
  if (String(name).trim().length > CONFIG.NAME_MAX_LENGTH) {
    return { valid: false, message: '姓名長度不可超過 ' + CONFIG.NAME_MAX_LENGTH + ' 字' };
  }

  var email = payload.email;
  if (!email || String(email).trim() === '') {
    return { valid: false, message: 'Email 不可空白' };
  }
  var trimmedEmail = String(email).trim();
  if (trimmedEmail.length > CONFIG.EMAIL_MAX_LENGTH) {
    return { valid: false, message: 'Email 長度不可超過 ' + CONFIG.EMAIL_MAX_LENGTH + ' 字' };
  }
  if (!isValidEmailFormat(trimmedEmail)) {
    return { valid: false, message: 'Email 格式錯誤' };
  }

  var course = findCourseById_(payload.courseId);
  if (!course) {
    return { valid: false, message: '請選擇要集氣的課程' };
  }

  return { valid: true, courseId: course.id };
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 9. 安全性：Email 全部轉小寫，避免重複
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * @param {Date} lastDatetime 上次集氣時間
 * @param {Date} now 目前時間
 * @param {number} throttleHours 限制時數
 * @returns {{throttled:boolean, nextTime?:Date}}
 */
function checkThrottle(lastDatetime, now, throttleHours) {
  var last = lastDatetime instanceof Date ? lastDatetime : new Date(lastDatetime);
  var throttleMs = throttleHours * 60 * 60 * 1000;
  var nextTime = new Date(last.getTime() + throttleMs);
  if (now.getTime() < nextTime.getTime()) {
    return { throttled: true, nextTime: nextTime };
  }
  return { throttled: false };
}

// ---------------------------------------------------------------------------
// 課程 / 折扣門檻 (docs/souce.md 三、未綁定學員方案)
// ---------------------------------------------------------------------------

function findCourseById_(courseId) {
  if (!courseId) return null;
  for (var i = 0; i < CONFIG.COURSES.length; i++) {
    if (CONFIG.COURSES[i].id === courseId) return CONFIG.COURSES[i];
  }
  return null;
}

/**
 * 依集氣人次找出「目前已解鎖」與「下一階」折扣門檻
 * @param {number} total
 * @returns {{current: object|null, next: object|null}}
 */
function getDiscountTierInfo(total) {
  var current = null;
  var next = null;
  for (var i = 0; i < CONFIG.DISCOUNT_TIERS.length; i++) {
    var tier = CONFIG.DISCOUNT_TIERS[i];
    if (total >= tier.threshold) {
      current = tier;
    } else {
      next = tier;
      break;
    }
  }
  return { current: current, next: next };
}

// ---------------------------------------------------------------------------
// Sheet 存取
// ---------------------------------------------------------------------------

function getSheet_(name) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('找不到工作表: ' + name);
  }
  return sheet;
}

// PowerLog 欄位順序: id, datetime, name, email, courseId, ip, userAgent
function findLatestRecordByEmail_(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var numRows = lastRow - 1;
  var data = sheet.getRange(2, 1, numRows, 7).getValues();

  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (String(row[3]).toLowerCase() === email) {
      return { id: row[0], datetime: row[1], name: row[2], email: row[3], courseId: row[4] };
    }
  }
  return null;
}

function appendLogRow_(sheet, name, email, courseId, ip, userAgent) {
  var id = sheet.getLastRow(); // header 佔第 1 列，第一筆資料 id = 1
  sheet.appendRow([id, new Date(), name, email, courseId, ip, userAgent]);
  return id;
}

// Summary 欄位順序: courseId, courseName, total（每堂候選課程各一列）
function incrementCourseTotal_(courseId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_(CONFIG.SHEET_SUMMARY);
    var rowIndex = findCourseRowIndex_(sheet, courseId);
    if (!rowIndex) {
      throw new Error('Summary 尚未初始化課程: ' + courseId + '，請先執行 Setup.gs 的 initializeSheets');
    }
    var current = Number(sheet.getRange(rowIndex, 3).getValue()) || 0;
    var next = current + 1;
    sheet.getRange(rowIndex, 3).setValue(next);
    return next;
  } finally {
    lock.releaseLock();
  }
}

function findCourseRowIndex_(sheet, courseId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === courseId) return i + 2; // +2: 標題列為第 1 列，資料從第 2 列開始
  }
  return null;
}

function readAllTotals_(sheet) {
  var lastRow = sheet.getLastRow();
  var totals = {};
  if (lastRow < 2) return totals;
  var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  data.forEach(function (row) {
    totals[row[0]] = Number(row[2]) || 0;
  });
  return totals;
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, CONFIG.DATETIME_FORMAT);
}
