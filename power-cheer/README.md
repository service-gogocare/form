# GOGOCARE 集氣平台（Power Support Platform）

依 [`docs/SDD.md`](docs/SDD.md)（= 根目錄 `spec.md`）實作，配色參考根目錄 `design.md` 的 GOGOCare 品牌色。

## 活動目的

本站是「**積分衝刺月集氣計畫**」（見 [`docs/souce.md`](docs/souce.md)）三、未綁定學員方案中的
「熱門課程降價集氣」執行頁面：號召學員從 5 堂特色積分課程中投票選出最想上的一堂，
每次集氣即累加該課程的人次，累積人次達標即可為該課程解鎖折扣（滿 100 人次 9 折、
200 人次 8 折、300 人次 7 折、400 人次 6 折、500 人次 5 折），藉此衝刺 7 月課程銷售轉換。
`docs/souce.md` 中其餘的機構方案、廣告投放、KPI 等屬於行銷企劃內容，不在本網站的實作範圍內。

```
power-cheer/
├── frontend/        GitHub Pages 靜態網站
│   ├── index.html
│   ├── style.css
│   ├── app.js       表單驗證 + 集氣動畫 + 輪詢
│   └── api.js       呼叫 Apps Script API
├── backend/         Google Apps Script（clasp 專案根目錄）
│   ├── Code.gs      doGet / doPost 入口
│   ├── Api.gs       驗證、24 小時限制、寫入 Sheet
│   ├── Mail.gs      集氣成功通知信
│   ├── Config.gs    全域設定（SPREADSHEET_ID 等）
│   ├── Setup.gs     一次性建立 PowerLog / Summary 工作表
│   └── appsscript.json
├── sheets/          Google Sheet 欄位說明
├── docs/            SDD 文件
└── tests/           Jest 自動化測試（gas-local 模擬 GAS 環境）
```

## 1. 建立 Google Sheet

見 [`sheets/README.md`](sheets/README.md)。建立試算表後把 ID 貼到 `backend/Config.gs` 的
`CONFIG.SPREADSHEET_ID`。

## 2. 用 clasp 建立 / 部署 Apps Script 專案

```bash
cd power-cheer/backend
clasp login                # 第一次使用需要登入 Google 帳號
clasp create --type webapp --title "GOGOCARE 集氣 API" --rootDir .
clasp push
```

> 若之後要接手既有的 Apps Script 專案，改用 `clasp clone <scriptId> --rootDir .`，
> 不要同時保留兩份 `.clasp.json`。`.clasp.json.example` 只是格式範例，實際的
> `.clasp.json`（含真實 scriptId）已加入 `.gitignore`，不會進版控。

推上去之後，到 [script.google.com](https://script.google.com) 打開專案：

1. 執行一次 `Setup.gs` 的 `initializeSheets` 函式（第一次執行會要求授權）。
2. 「部署」→「新增部署作業」→ 類型選「網頁應用程式」：
   - 執行身分：我（USER_DEPLOYING，已寫在 `appsscript.json`）
   - 誰可以存取：所有人
3. 複製部署後的網頁應用程式網址（`https://script.google.com/macros/s/xxx/exec`）。

之後修改程式碼，重新 `clasp push` 即可更新（同一個部署網址不會變動，除非重新建立部署）。

## 3. 設定前端

把上一步的網址貼到 `frontend/api.js` 的 `API_BASE_URL`，再把 `frontend/` 目錄整個部署到
GitHub Pages（或任何靜態網站託管）即可。

## 4. 執行自動化測試

Google Apps Script 沒有原生的單元測試框架，因此使用
[gas-local](https://www.npmjs.com/package/gas-local) 在 Node.js 中模擬
`SpreadsheetApp` / `MailApp` / `LockService` / `Utilities` / `ContentService`，
直接載入並執行 `backend/*.gs` 的真實程式碼進行測試；前端的表單驗證邏輯則直接以
Jest 測試 `frontend/app.js` 匯出的 pure function。

```bash
cd power-cheer
npm install
npm test
```

測試涵蓋範圍（`tests/backend/api.test.js`、`tests/frontend/validation.test.js`）：

- `doGet` / `doPost` 路由與 JSON 回應格式
- 姓名 / Email 必填、長度上限（50 / 100 字）、Email 格式驗證、必須選擇有效的 `courseId`
- Email 自動轉小寫、避免大小寫造成的重複帳號
- 24 小時集氣限制：期限內拒絕並回傳 `nextTime`、期限後允許再次集氣、不分課程共用同一次額度
- 不同 Email 互不影響彼此的 24 小時限制
- 集氣成功會寫入 `PowerLog`（含 `courseId`），且只有被投票的課程 `total` +1，其餘課程不受影響
- 折扣門檻計算 `getDiscountTierInfo` / 前端進度條 `calcProgressPercent` 的邊界值（0、99、100、500...）
- `MAIL_ENABLED` 開關對是否寄信的影響

## 已知限制

- Apps Script 無法在伺服器端取得訪客真實 IP，`PowerLog.ip` 目前固定寫入 `N/A`。
- 寄信（`Mail.gs`）預設關閉（`CONFIG.MAIL_ENABLED = false`），待確認 Gmail 額度與信件內容後再開啟。
- `MailQueue`（批次寄信）為 spec 中列的未來擴充項目，尚未實作。
