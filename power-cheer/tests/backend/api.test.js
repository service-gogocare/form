const path = require('path');
const gas = require('gas-local');
const { createMocks } = require('./mocks');

function loadBackend(mockObj) {
  return gas.require(path.join(__dirname, '..', '..', 'backend'), mockObj, {
    filter: function (f) {
      return /\.(gs|js)$/.test(f);
    },
  });
}

const VALID_COURSE_ID = 'course-1';

describe('doGet / doPost dispatch (Code.gs)', () => {
  test('doGet ?action=status 回傳 JSON 內容與課程列表', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const output = lib.doGet({ parameter: { action: 'status' } });
    const body = JSON.parse(output.getContent());
    expect(body.success).toBe(true);
    expect(Array.isArray(body.courses)).toBe(true);
    expect(body.courses).toHaveLength(5);
  });

  test('doPost ?action=cheer 會解析 text/plain 內容並執行集氣', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const output = lib.doPost({
      parameter: { action: 'cheer' },
      postData: {
        contents: JSON.stringify({ name: '王小明', email: 'abc@gmail.com', courseId: VALID_COURSE_ID }),
      },
    });
    const body = JSON.parse(output.getContent());
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.courseId).toBe(VALID_COURSE_ID);
  });

  test('未知 action 回傳 success:false', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const output = lib.doGet({ parameter: { action: 'unknown' } });
    const body = JSON.parse(output.getContent());
    expect(body.success).toBe(false);
  });
});

describe('getStatus (Api.gs) - 活動目的與各課程集氣進度', () => {
  test('回傳活動說明與每堂課的目前總數 / 折扣資訊', () => {
    const { mock } = createMocks({
      summaryRows: [
        ['courseId', 'courseName', 'total'],
        ['course-1', '消防-火災意外事件處置與應變', 150],
        ['course-2', '針扎預防及通報處理流程', 0],
        ['course-3', '居家感染控制概論', 0],
        ['course-5', '緊急應變-一氧化碳中毒及天然災害處置', 0],
      ],
    });
    const lib = loadBackend(mock);
    const result = lib.getStatus();

    expect(result.success).toBe(true);
    expect(typeof result.eventPurpose).toBe('string');
    expect(result.eventPurpose.length).toBeGreaterThan(0);

    const course1 = result.courses.find((c) => c.id === 'course-1');
    expect(course1.total).toBe(150);
    expect(course1.currentDiscount).toBe('9折'); // 滿 100 人次
    expect(course1.nextTier).toEqual({ threshold: 200, label: '8折' });
    expect(course1.url).toMatch(/^https:\/\/www\.gogocare\.com\.tw\/tw\/course\/detail\//);
    expect(course1.imageUrl).toMatch(/_pic\.jpg$/);

    const course2 = result.courses.find((c) => c.id === 'course-2');
    expect(course2.total).toBe(0);
    expect(course2.currentDiscount).toBeNull();
    expect(course2.nextTier).toEqual({ threshold: 100, label: '9折' });
  });

  test('每一堂候選課程都要有唯一且格式正確的課程連結與封面圖', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const result = lib.getStatus();

    expect(result.courses).toHaveLength(5);

    const urls = result.courses.map((c) => c.url);
    const imageUrls = result.courses.map((c) => c.imageUrl);

    expect(new Set(urls).size).toBe(5); // 不重複
    expect(new Set(imageUrls).size).toBe(5);

    result.courses.forEach((course) => {
      expect(course.url).toMatch(/^https:\/\/www\.gogocare\.com\.tw\/tw\/course\/detail\/C\d+$/);
      expect(course.imageUrl).toMatch(/^https:\/\/www\.gogocare\.com\.tw\/UserFiles\/course\/C\d+_pic\.jpg$/);
    });
  });
});

describe('cheer 驗證規則 (spec.md 第 6 節)', () => {
  test.each([
    ['姓名空白', { name: '   ', email: 'abc@gmail.com', courseId: VALID_COURSE_ID }, /姓名/],
    ['姓名超過 50 字', { name: '王'.repeat(51), email: 'abc@gmail.com', courseId: VALID_COURSE_ID }, /50/],
    ['Email 空白', { name: '王小明', email: '  ', courseId: VALID_COURSE_ID }, /Email/],
    ['Email 格式錯誤', { name: '王小明', email: 'not-an-email', courseId: VALID_COURSE_ID }, /格式/],
    ['Email 超過 100 字', { name: '王小明', email: 'a'.repeat(95) + '@a.com', courseId: VALID_COURSE_ID }, /100/],
    ['未選擇課程', { name: '王小明', email: 'abc@gmail.com' }, /課程/],
    ['課程代碼不存在', { name: '王小明', email: 'abc@gmail.com', courseId: 'no-such-course' }, /課程/],
  ])('%s -> 回傳驗證錯誤', (_label, payload, messagePattern) => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const result = lib.cheer(payload);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(messagePattern);
  });

  test('缺少 payload 時不會拋出例外', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const result = lib.cheer(undefined);
    expect(result.success).toBe(false);
  });
});

describe('cheer 集氣流程 (spec.md 第 7 節 + docs/souce.md 課程投票)', () => {
  test('首次集氣成功：寫入 PowerLog（含 courseId）、Email 轉小寫、該課程 total +1', () => {
    const { mock, powerLogSheet, summarySheet } = createMocks();
    const lib = loadBackend(mock);

    const result = lib.cheer({
      name: '王小明',
      email: 'ABC@Gmail.com',
      courseId: VALID_COURSE_ID,
      ip: '1.2.3.4',
      userAgent: 'TestAgent',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('集氣成功');
    expect(result.total).toBe(1);
    expect(result.courseId).toBe(VALID_COURSE_ID);

    expect(powerLogSheet.getLastRow()).toBe(2);
    const row = powerLogSheet.getRange(2, 1, 1, 7).getValues()[0];
    expect(row[0]).toBe(1); // id
    expect(row[2]).toBe('王小明');
    expect(row[3]).toBe('abc@gmail.com'); // 已轉小寫
    expect(row[4]).toBe(VALID_COURSE_ID);
    expect(row[5]).toBe('1.2.3.4');
    expect(row[6]).toBe('TestAgent');

    // Summary: course-1 那一列 (第 2 列) total 應為 1
    expect(summarySheet.getRange(2, 3).getValue()).toBe(1);
  });

  test('只有被投票的課程 total 增加，其他課程不受影響', () => {
    const { mock, summarySheet } = createMocks();
    const lib = loadBackend(mock);

    lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: 'course-2' });

    expect(summarySheet.getRange(2, 3).getValue()).toBe(0); // course-1
    expect(summarySheet.getRange(3, 3).getValue()).toBe(1); // course-2
    expect(summarySheet.getRange(4, 3).getValue()).toBe(0); // course-3
  });

  test('同一 Email 24 小時內重複集氣會被拒絕 (F03)，不論選哪堂課', () => {
    const now = new Date();
    const { mock, summarySheet } = createMocks({
      powerLogRows: [
        ['id', 'datetime', 'name', 'email', 'courseId', 'ip', 'userAgent'],
        [1, now, '王小明', 'abc@gmail.com', 'course-1', '1.2.3.4', 'Chrome'],
      ],
    });
    const lib = loadBackend(mock);

    const result = lib.cheer({ name: '王小明', email: 'ABC@gmail.com', courseId: 'course-2' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('24小時內只能集氣一次');
    expect(typeof result.nextTime).toBe('string');
    expect(summarySheet.getRange(3, 3).getValue()).toBe(0); // course-2 總數不應變動
  });

  test('超過 24 小時後可再次集氣', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const { mock } = createMocks({
      powerLogRows: [
        ['id', 'datetime', 'name', 'email', 'courseId', 'ip', 'userAgent'],
        [1, twentyFiveHoursAgo, '王小明', 'abc@gmail.com', 'course-1', '1.2.3.4', 'Chrome'],
      ],
    });
    const lib = loadBackend(mock);

    const result = lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: 'course-1' });

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
  });

  test('不同 Email 不受彼此 24 小時限制影響', () => {
    const now = new Date();
    const { mock } = createMocks({
      powerLogRows: [
        ['id', 'datetime', 'name', 'email', 'courseId', 'ip', 'userAgent'],
        [1, now, '王小明', 'abc@gmail.com', 'course-1', '1.2.3.4', 'Chrome'],
      ],
    });
    const lib = loadBackend(mock);

    const result = lib.cheer({ name: '陳大文', email: 'other@gmail.com', courseId: 'course-1' });

    expect(result.success).toBe(true);
  });

  test('集氣後回傳目前已解鎖與下一階折扣資訊', () => {
    const { mock } = createMocks({
      summaryRows: [
        ['courseId', 'courseName', 'total'],
        ['course-1', '消防-火災意外事件處置與應變', 99],
        ['course-2', '針扎預防及通報處理流程', 0],
        ['course-3', '居家感染控制概論', 0],
        ['course-5', '緊急應變-一氧化碳中毒及天然災害處置', 0],
      ],
    });
    const lib = loadBackend(mock);

    const result = lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: 'course-1' });

    expect(result.total).toBe(100);
    expect(result.currentDiscount).toBe('9折');
    expect(result.nextTier).toEqual({ threshold: 200, label: '8折' });
  });

  test('MAIL_ENABLED 開啟時，集氣成功會呼叫 MailApp.sendEmail', () => {
    const { mock, mails } = createMocks();
    const lib = loadBackend(mock);
    lib.CONFIG.MAIL_ENABLED = true;

    lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: VALID_COURSE_ID });

    expect(mails).toHaveLength(1);
    expect(mails[0].email).toBe('abc@gmail.com');
  });

  test('MAIL_ENABLED 關閉時（預設），不會呼叫 MailApp.sendEmail', () => {
    const { mock, mails } = createMocks();
    const lib = loadBackend(mock);

    lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: VALID_COURSE_ID });

    expect(mails).toHaveLength(0);
  });

  test('對尚未在 Summary 建立的課程集氣會拋出提示錯誤', () => {
    const { mock } = createMocks({
      summaryRows: [['courseId', 'courseName', 'total']], // 空的 Summary
    });
    const lib = loadBackend(mock);

    expect(() => lib.cheer({ name: '王小明', email: 'abc@gmail.com', courseId: VALID_COURSE_ID })).toThrow();
  });
});

describe('輔助函式', () => {
  test('normalizeEmail 會去除空白並轉小寫', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    expect(lib.normalizeEmail('  ABC@Gmail.com  ')).toBe('abc@gmail.com');
  });

  test('isValidEmailFormat 驗證常見格式', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    expect(lib.isValidEmailFormat('abc@gmail.com')).toBe(true);
    expect(lib.isValidEmailFormat('abc@gmail')).toBe(false);
    expect(lib.isValidEmailFormat('abc.com')).toBe(false);
  });

  test('checkThrottle 在剛好超過門檻時應允許', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const last = new Date('2026-07-01T00:00:00');
    const now = new Date('2026-07-02T00:00:01'); // 24 小時又 1 秒
    const result = lib.checkThrottle(last, now, 24);
    expect(result.throttled).toBe(false);
  });

  test('checkThrottle 在門檻內應拒絕並附帶 nextTime', () => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    const last = new Date('2026-07-01T00:00:00');
    const now = new Date('2026-07-01T23:59:59');
    const result = lib.checkThrottle(last, now, 24);
    expect(result.throttled).toBe(true);
    expect(result.nextTime.getTime()).toBe(new Date('2026-07-02T00:00:00').getTime());
  });

  test.each([
    [0, null, { threshold: 100, label: '9折' }],
    [99, null, { threshold: 100, label: '9折' }],
    [100, { threshold: 100, label: '9折' }, { threshold: 200, label: '8折' }],
    [499, { threshold: 400, label: '6折' }, { threshold: 500, label: '5折' }],
    [500, { threshold: 500, label: '5折' }, null],
    [999, { threshold: 500, label: '5折' }, null],
  ])('getDiscountTierInfo(%i) 應回傳正確的目前 / 下一階折扣', (total, current, next) => {
    const { mock } = createMocks();
    const lib = loadBackend(mock);
    expect(lib.getDiscountTierInfo(total)).toEqual({ current, next });
  });
});
