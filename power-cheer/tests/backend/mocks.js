/**
 * 模擬 Google Apps Script 全域服務 (SpreadsheetApp / MailApp / LockService / Utilities / ContentService)
 * 讓 backend/*.gs 可以透過 gas-local 在 Node 環境中被真正執行與測試，
 * 而不需要連線到真實的 Google Sheet。
 */

function createFakeSheet(initialRows) {
  var rows = initialRows.map(function (r) {
    return r.slice();
  });

  return {
    getLastRow: function () {
      return rows.length;
    },
    appendRow: function (row) {
      rows.push(row.slice());
    },
    getRange: function (row, col, numRows, numCols) {
      numRows = numRows || 1;
      numCols = numCols || 1;
      return {
        getValues: function () {
          var result = [];
          for (var r = 0; r < numRows; r++) {
            var rowData = rows[row - 1 + r] || [];
            var cols = [];
            for (var c = 0; c < numCols; c++) {
              cols.push(rowData[col - 1 + c]);
            }
            result.push(cols);
          }
          return result;
        },
        getValue: function () {
          var rowData = rows[row - 1] || [];
          return rowData[col - 1];
        },
        setValue: function (value) {
          if (!rows[row - 1]) rows[row - 1] = [];
          rows[row - 1][col - 1] = value;
        },
      };
    },
    _rows: rows,
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// 對應 Config.gs 使用的 'yyyy/MM/dd HH:mm' 格式，足以支援測試斷言
function formatDate(date, tz, format) {
  return format
    .replace('yyyy', date.getFullYear())
    .replace('MM', pad2(date.getMonth() + 1))
    .replace('dd', pad2(date.getDate()))
    .replace('HH', pad2(date.getHours()))
    .replace('mm', pad2(date.getMinutes()));
}

/**
 * @param {object} options
 * @param {Array<Array>} [options.powerLogRows] 含標題列的 PowerLog 初始資料
 * @param {Array<Array>} [options.summaryRows] 含標題列的 Summary 初始資料
 */
function createMocks(options) {
  options = options || {};

  var powerLogSheet = createFakeSheet(
    options.powerLogRows || [['id', 'datetime', 'name', 'email', 'courseId', 'ip', 'userAgent']]
  );
  // 預設 5 堂課程列需與 backend/Config.gs 的 CONFIG.COURSES 保持一致
  var summarySheet = createFakeSheet(
    options.summaryRows || [
      ['courseId', 'courseName', 'total'],
      ['course-1', '消防-火災意外事件處置與應變', 0],
      ['course-2', '針扎預防及通報處理流程', 0],
      ['course-3', '居家感染控制概論', 0],
      ['course-5', '緊急應變-一氧化碳中毒及天然災害處置', 0],
    ]
  );
  var sheets = {
    PowerLog: powerLogSheet,
    Summary: summarySheet,
  };
  var mails = [];

  var mock = {
    console: console,
    Logger: {
      log: function () {},
    },
    Utilities: {
      formatDate: formatDate,
    },
    LockService: {
      getScriptLock: function () {
        return {
          waitLock: function () {},
          releaseLock: function () {},
        };
      },
    },
    SpreadsheetApp: {
      openById: function () {
        return {
          getSheetByName: function (name) {
            return sheets[name];
          },
          insertSheet: function (name) {
            var sheet = createFakeSheet([[]]);
            sheets[name] = sheet;
            return sheet;
          },
        };
      },
    },
    MailApp: {
      sendEmail: function (email, subject, body) {
        mails.push({ email: email, subject: subject, body: body });
      },
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: function (content) {
        return {
          _content: content,
          _mimeType: null,
          setMimeType: function (mt) {
            this._mimeType = mt;
            return this;
          },
          getContent: function () {
            return this._content;
          },
          getMimeType: function () {
            return this._mimeType;
          },
        };
      },
    },
  };

  return {
    mock: mock,
    powerLogSheet: powerLogSheet,
    summarySheet: summarySheet,
    mails: mails,
  };
}

module.exports = { createFakeSheet: createFakeSheet, createMocks: createMocks };
