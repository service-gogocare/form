/**
 * GOGOCARE 集氣平台 - 全域設定
 * 部署前請將 SPREADSHEET_ID 換成你的 Google Sheet ID
 * (試算表網址 https://docs.google.com/spreadsheets/d/<這一段>/edit 中間的字串)
 *
 * 活動目的與課程 / 折扣門檻參考 docs/souce.md 「積分衝刺月集氣計畫」
 * 三、未綁定學員方案 -「熱門課程降價集氣」。
 */
var CONFIG = {
  SPREADSHEET_ID: '12Eiu7iS9KIOMYcaQQuwreK3H3LgjyQB5BcGC-dUnMWs',

  SHEET_POWER_LOG: 'PowerLog',
  SHEET_SUMMARY: 'Summary',

  EVENT_NAME: '積分衝刺月集氣計畫',
  EVENT_PURPOSE:
    '號召學員為最想上的特色積分課程投票集氣，集氣人次達標即可解鎖課程折扣，一起衝刺 7 月課程銷售轉換！',
  EVENT_PERIOD: '2026/07/06 - 2026/07/31',

  // 三、未綁定學員方案：熱門課程降價集氣（5 選 1，取自特殊積分 9 堂課，無教師分潤課程）
  // url / imageUrl 取自 GOGOCare 課程平台，供前端封面圖點擊導向課程頁面使用
  COURSES: [
    {
      id: 'course-1',
      name: '消防-火災意外事件處置與應變',
      category: '專業品質、消防安全',
      url: 'https://www.gogocare.com.tw/tw/course/detail/C20260605102559001',
      imageUrl: 'https://www.gogocare.com.tw/UserFiles/course/C20260605102559001_pic.jpg',
    },
    {
      id: 'course-2',
      name: '針扎預防及通報處理流程',
      category: '專業品質、感染管制',
      url: 'https://www.gogocare.com.tw/tw/course/detail/C20260401140918001',
      imageUrl: 'https://www.gogocare.com.tw/UserFiles/course/C20260401140918001_pic.jpg',
    },
    {
      id: 'course-3',
      name: '居家感染控制概論',
      category: '專業品質、感染管制',
      url: 'https://www.gogocare.com.tw/tw/course/detail/C20260701101830001',
      imageUrl: 'https://www.gogocare.com.tw/UserFiles/course/C20260701101830001_pic.jpg',
    },

    {
      id: 'course-5',
      name: '緊急應變-一氧化碳中毒及天然災害處置',
      category: '專業品質、緊急應變',
      url: 'https://www.gogocare.com.tw/tw/course/detail/C20260701095705001',
      imageUrl: 'https://www.gogocare.com.tw/UserFiles/course/C20260701095705001_pic.jpg',
    },
  ],

  // 折扣機制：滿 100 人次打 9 折，滿 200 人次打 8 折... 滿 500 人次打 5 折
  DISCOUNT_TIERS: [
    { threshold: 100, label: '9折' },
    { threshold: 200, label: '8折' },
    { threshold: 300, label: '7折' },
    { threshold: 400, label: '6折' },
    { threshold: 500, label: '5折' },
  ],

  // F03：24 小時內同一 Email 只能集氣一次（不分課程，全站共用一次額度）
  THROTTLE_HOURS: 24,

  // 6. 驗證規則
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 100,

  // 11. 未來擴充：目前先關閉自動寄信，確認 MailApp 額度與內容後再開啟
  MAIL_ENABLED: false,
  MAIL_SUBJECT: '感謝您為 GOGOCARE 集氣！',

  TIMEZONE: 'Asia/Taipei',
  DATETIME_FORMAT: 'yyyy/MM/dd HH:mm',
};
