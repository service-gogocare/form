# power-cheer 詳細參考資料

補充 `SKILL.md` 的細節，當摘要不夠精確時再讀這份。

## 目錄結構

```
power-cheer/
├── frontend/              GitHub Pages 靜態網站（實際部署的網址指向這裡）
│   ├── 0703.html          頁面結構（注意：不是 index.html，網址要帶檔名）
│   ├── style.css          樣式，顏色變數在 :root
│   ├── app.js             前端邏輯：表單驗證、輪詢、課程卡片渲染、折扣進度條計算
│   └── api.js             呼叫後端 API 的 fetch 封裝，API_BASE_URL 是已部署的 Apps Script 網址
├── backend/               Google Apps Script（clasp 專案根目錄）
│   ├── Code.gs            doGet / doPost 入口，路由 ?action=status / ?action=cheer
│   ├── Api.gs             驗證規則、24 小時限制、折扣門檻計算、讀寫 Sheet
│   ├── Mail.gs            集氣成功通知信（CONFIG.MAIL_ENABLED 控制開關，預設關閉）
│   ├── Config.gs          全域設定：SPREADSHEET_ID、COURSES、DISCOUNT_TIERS、驗證上限等
│   ├── Setup.gs           一次性初始化：建立 PowerLog / Summary 工作表與課程列
│   ├── appsscript.json    Apps Script 專案設定（時區、Web App 權限）
│   └── .clasp.json        真實 scriptId（不進 git，本機才有）
├── docs/
│   ├── SDD.md             原始技術規格（Sheet 欄位、API 格式、驗證規則、GAS 流程）
│   ├── design.md          GOGOCare 品牌配色
│   └── souce.md           行銷企劃：積分衝刺月集氣計畫、活動目的、折扣機制、KPI
├── tests/                 Jest 自動化測試（用 gas-local 模擬 GAS 環境跑真正的 .gs 程式碼）
├── package.json / package-lock.json   npm 測試依賴（gas-local + jest）
└── README.md              開發者說明（clasp 部署步驟等）
```

## `CONFIG.COURSES` 資料格式（`backend/Config.gs`）

```js
{
  id: 'course-1',        // 唯一代碼，前端/PowerLog 都靠這個對應課程，改了舊資料會對不起來，不要改既有課程的 id
  name: '課程名稱',       // 顯示在課程卡片標題
  category: '專業品質、消防安全', // 課程標籤（積分主題 + 特殊積分）
  url: '課程頁面連結',     // 點封面圖後跳轉的目標，開新分頁
  imageUrl: '封面圖網址',  // 建議 16:9 圖片，載入失敗會自動隱藏不會壞圖
}
```

## `DISCOUNT_TIERS` 資料格式（兩處都要一樣）

```js
[
  { threshold: 100, label: '9折' },
  { threshold: 200, label: '8折' },
  { threshold: 300, label: '7折' },
  { threshold: 400, label: '6折' },
  { threshold: 500, label: '5折' },
]
```

- `backend/Config.gs`：`CONFIG.DISCOUNT_TIERS`，後端用來決定 API 回傳的「目前已解鎖折扣」。
- `frontend/app.js` 檔案開頭：獨立一份同名陣列，前端用來畫進度條與文字說明（`calcProgressPercent` / `getDiscountTierInfo`）。
- 兩邊都有對應的 Jest 測試（`tests/backend/api.test.js`、`tests/frontend/validation.test.js`）會各自驗證邊界值，改完記得跑 `npm test`。

## Google Sheet 結構

- **PowerLog**：`id, datetime, name, email, courseId, ip, userAgent`。`ip` 固定寫 `N/A`（Apps Script 拿不到訪客真實 IP）。
- **Summary**：`courseId, courseName, total`，每堂候選課程各一列。`Setup.gs` 的 `initializeSheets` 會自動補上 `CONFIG.COURSES` 裡有、但 Summary 裡還沒有的課程列，不會覆寫既有數字。

## API 回應格式

`GET ?action=status` 回傳：

```json
{
  "success": true,
  "eventName": "積分衝刺月集氣計畫",
  "eventPurpose": "...",
  "eventPeriod": "2026/07/06 - 2026/07/31",
  "courses": [
    { "id": "course-1", "name": "...", "category": "...", "url": "...", "imageUrl": "...",
      "total": 150, "currentDiscount": "9折", "nextTier": { "threshold": 200, "label": "8折" } }
  ],
  "updateTime": "2026/07/04 10:00"
}
```

`POST ?action=cheer`（body 是 JSON 字串，Content-Type 用 `text/plain` 避免 CORS 預檢）：

```json
{ "name": "王小明", "email": "abc@gmail.com", "courseId": "course-1" }
```

成功回應含 `courseId`、`courseName`、`total`、`currentDiscount`、`nextTier`；24 小時內重複集氣會回傳 `{ success:false, message:"24小時內只能集氣一次", nextTime:"..." }`。

## 驗證規則（`backend/Config.gs` + `Api.gs`，兩邊各自也在 `frontend/app.js` 做前端提示用的複製）

- 姓名：不可空白，≤ 50 字。
- Email：不可空白，≤ 100 字，需符合基本 email 格式，會自動轉小寫去重。
- 必須選一個存在於 `CONFIG.COURSES` 的 `courseId`，否則回傳「請選擇要集氣的課程」。
- 同一 Email 24 小時內只能成功集氣一次，不分課程共用同一次額度。

## 配色（GOGOCare 品牌色）

主色：#248dc5
輔助色：
  #a8acd6
  #eee800
  #dcdddd
  #9fa0a0
  #2a2a2a
強調色（箭頭、連結、hover）：#ff5757

## 配色（Gediter 色系）

實體課程標籤：背景 #fdecea  文字 #a52020
線上同步標籤：背景 #e1f5ee  文字 #0a5e48
直播課程標籤：背景 #fff4e0  文字 #6b4100
屬性標籤背景：#fffbee  文字 #6b4900
卡片標頭背景：#2d2d2d
積分顯示色：#e6c96a
申請中 badge：背景 #fdecea  文字 #a52020

## 部署相關的坑

1. **前端網址不是 `/form/0703`，而是 `/form/power-cheer/frontend/0703.html`**（含完整路徑與副檔名）。如果之後要換成短網址，需要調整 GitHub Pages 的檔案位置/檔名，屬於結構調整，動手前先跟使用者確認要不要一起處理。
2. **`clasp push` 之後網址不會馬上生效**，一定要到 Apps Script 的「管理部署作業」把現有部署更新成「新版本」。這是最常見的「怎麼改了都沒用」原因。
3. `backend/.clasp.json` 含真實 scriptId，已加入根目錄 `.gitignore`（`power-cheer/backend/.clasp.json`），千万不要手動 `git add -f` 加回去。
