/**
 * GOGOCARE 集氣平台 - 一次性初始化工具
 * 在 Apps Script 編輯器選擇 initializeSheets 函式並執行一次，
 * 會自動在 CONFIG.SPREADSHEET_ID 指定的試算表中建立 PowerLog / Summary 兩個工作表、
 * 標題列，以及 CONFIG.COURSES 中每一堂候選課程的初始集氣列（total = 0）。
 * 已存在的工作表 / 課程列不會被覆寫或清空，之後若在 Config.gs 新增課程，
 * 重新執行一次即可自動補上新課程的列。
 */
function initializeSheets() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  var powerLog = ss.getSheetByName(CONFIG.SHEET_POWER_LOG);
  if (!powerLog) {
    powerLog = ss.insertSheet(CONFIG.SHEET_POWER_LOG);
    powerLog.appendRow(['id', 'datetime', 'name', 'email', 'courseId', 'ip', 'userAgent']);
  }

  var summary = ss.getSheetByName(CONFIG.SHEET_SUMMARY);
  if (!summary) {
    summary = ss.insertSheet(CONFIG.SHEET_SUMMARY);
    summary.appendRow(['courseId', 'courseName', 'total']);
  }

  var existingIds = {};
  var lastRow = summary.getLastRow();
  if (lastRow >= 2) {
    var ids = summary.getRange(2, 1, lastRow - 1, 1).getValues();
    ids.forEach(function (row) {
      existingIds[row[0]] = true;
    });
  }

  CONFIG.COURSES.forEach(function (course) {
    if (!existingIds[course.id]) {
      summary.appendRow([course.id, course.name, 0]);
    }
  });

  Logger.log('初始化完成：PowerLog / Summary（含 ' + CONFIG.COURSES.length + ' 堂候選課程）已就緒');
}
