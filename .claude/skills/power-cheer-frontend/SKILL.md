---
name: power-cheer-frontend
description: 協助修改 GOGOCARE 集氣網站（power-cheer，積分衝刺月集氣計畫）的前端頁面 —— 文案、課程清單與封面圖、顏色樣式、折扣門檻等常見異動。當使用者提到「集氣網頁」「集氣活動頁」「積分衝刺月」「0703 那個頁面」，或要求調整 power-cheer 底下的 0703.html / style.css / app.js / api.js、power-cheer/backend/Config.gs 內容時使用。使用者通常不會寫程式，請用他聽得懂的方式確認需求，實際修改都由你（Claude）動手完成。
---

# power-cheer 集氣網站前端協作指南

服務對象：**不會寫程式的同仁**。他們會用一般白話描述想要的改動（例如「把封面圖換成新的」「文案改一下」「折扣改成滿150人打9折」），你要負責：理解需求 → 找到對應檔案 → 修改 → 檢查沒改壞 → 告訴他們怎麼讓改動上線。不要假設對方懂 HTML/JS/Git，說明時用「頁面上的哪個地方」而非程式術語。

## 這個專案是什麼

GOGOCARE「積分衝刺月集氣計畫」的執行頁面：學員從 5 堂候選課程投票集氣，累積人次達門檻可為**該堂課**解鎖折扣（滿100人9折、200人8折、300人7折、400人6折、500人5折）。背景脈絡看 `power-cheer/docs/souce.md`；技術規格看 `power-cheer/docs/SDD.md`；配色看 `power-cheer/docs/design.md`。

## 架構（一定要先懂，才不會改錯地方）

```
使用者瀏覽器
  → power-cheer/0703.html + style.css + app.js + api.js   ← 部署在 GitHub Pages
  → 呼叫 Google Apps Script Web App（power-cheer/backend/*.gs）    ← 用 clasp 推送
  → 讀寫 Google Sheet（PowerLog / Summary）
```

> 這 4 個前端檔案原本放在 `power-cheer/frontend/` 子資料夾，後來搬到 `power-cheer/` 根目錄下，
> 部署後的網址也從 `.../power-cheer/frontend/0703.html` 變成 `.../power-cheer/0703.html`。
> 動手前先確認 `ls power-cheer` 看檔案目前實際在哪一層，不要憑記憶假設路徑。

**兩條完全不同的部署管道**：
- 改 `power-cheer/0703.html`、`style.css`、`app.js`、`api.js` → 用 **git push** 上傳到 GitHub，GitHub Pages 會自動更新網頁。
- 改 `backend/` 底下的 `.gs` 檔案 → 用 **clasp push** 上傳到 Google Apps Script，而且還要多一步「更新部署版本」才會真的生效（見下方「部署方式」，這步驟很常被漏掉）。

## 檔案地圖：想改什麼 → 改哪個檔案

| 使用者想改的東西 | 要改的檔案 |
| --- | --- |
| 頁面文字、標題、活動說明、期間 | `power-cheer/0703.html`（畫面結構/預設文字）＋ `backend/Config.gs` 的 `EVENT_PURPOSE` / `EVENT_PERIOD`（頁面載入後會被這個蓋過去） |
| 課程名稱、分類標籤、課程連結、封面圖 | **同時**改 `backend/Config.gs` 的 `CONFIG.COURSES` 和 `power-cheer/0703.html` 對應的課程卡片區塊（2026/07 起兩份都有，見下方「重要」第 2 點） |
| 新增 / 移除候選課程 | `backend/Config.gs` 的 `CONFIG.COURSES` ＋ `power-cheer/0703.html` 的課程卡片區塊（兩邊都要改），改完還要重新執行一次 `backend/Setup.gs` 的 `initializeSheets`（見下方注意事項） |
| 折扣門檻（滿多少人打幾折） | **同時**改 `backend/Config.gs` 的 `CONFIG.DISCOUNT_TIERS` 和 `power-cheer/app.js` 開頭的 `DISCOUNT_TIERS`（兩份要一模一樣，見下方「重要」） |
| 顏色、字體大小、卡片樣式、版面 | `power-cheer/style.css`（顏色變數集中在檔案最上面的 `:root`，對照 `docs/design.md`） |
| 表單欄位限制（姓名/Email 長度、24 小時限制） | `backend/Config.gs`（`NAME_MAX_LENGTH`、`EMAIL_MAX_LENGTH`、`THROTTLE_HOURS`）—— 改這裡風險較高，動手前務必跟使用者確認為什麼要改 |
| 集氣成功後的訊息、寄信內容 | `backend/Mail.gs`（是否寄信由 `CONFIG.MAIL_ENABLED` 控制，預設關閉） |

## 重要：兩份必須保持一致的資料

1. **折扣門檻 `DISCOUNT_TIERS`**：`backend/Config.gs` 和 `power-cheer/app.js` 各存了一份一模一樣的陣列（前端用來畫進度條，屬於暫時性的重複設計）。改一邊沒改另一邊，會出現「頁面顯示的折扣」跟「後端實際判定的折扣」對不上的 bug。**只要改門檻，兩個檔案都要改。**
2. **課程資料現在有兩份**（2026/07 起）：`power-cheer/0703.html` 已靜態寫入 5 張課程卡片（讓頁面一打開就能顯示，不依賴 API），同時 `backend/Config.gs` 的 `CONFIG.COURSES` 仍然保留（後端驗證集氣、計算折扣用）。**只要新增/修改/移除課程，兩個檔案都要改**，少改一個就會出現「頁面顯示舊課程」或「集氣按下去報錯」的 bug。改 `0703.html` 用 `git push`；改 `Config.gs` 用 `clasp push` + 更新部署版本。詳細步驟見 `docs/課程修改操作說明.md`。

## 常見任務 SOP

**換課程封面圖 / 連結**
1. 打開 `backend/Config.gs`，在 `CONFIG.COURSES` 找到對應的課程物件。
2. 更新 `url`（點圖後要跳轉的課程頁面）與 `imageUrl`（封面圖網址，通常是 `https://www.gogocare.com.tw/UserFiles/course/xxx_pic.jpg` 格式）。
3. 存檔、`clasp push`、到 Apps Script 更新部署版本（見下方）。

**改文案 / 活動說明**
1. `backend/Config.gs` 的 `EVENT_PURPOSE`、`EVENT_PERIOD` 是頁面實際顯示的內容（頁面載入後會蓋掉 `0703.html` 裡寫死的預設文字）。
2. 若要連預設文字（API 打不到時的備援畫面）一起改，同步修改 `power-cheer/0703.html` 裡 `id="eventPurpose"` / `id="eventPeriod"` 的段落。

**改顏色 / 風格**
1. 打開 `power-cheer/style.css`，顏色都定義成 CSS 變數在檔案最上面（`--color-primary` 等），對照 `docs/design.md` 的色票表。
2. 只改變數值即可套用到整頁，不用一個個找每個元素改顏色。

**新增 / 移除候選課程**
1. 在 `backend/Config.gs` 的 `CONFIG.COURSES` 陣列新增或刪除一個物件（`id` 要唯一，例如 `course-6`）。
2. `clasp push` 之後，到 Apps Script 編輯器手動執行一次 `Setup.gs` 的 `initializeSheets` 函式 —— 這會自動幫新課程在 Summary 工作表補上一列（total=0），不會動到既有課程的資料。
3. 更新部署版本。

## 每次改完都要做的檢查

1. 有 Node.js 環境的話：`cd power-cheer && npm test`，確認自動化測試都還過（涵蓋驗證規則、24 小時限制、折扣門檻計算等邏輯）。
2. 沒有 Node.js 也至少對改過的 `.js` 檔跑語法檢查：`node --check power-cheer/app.js`。
3. 用瀏覽器實際打開檔案或部署後的網址看一下畫面，特別是有改樣式或課程資料時。
4. 如果改了 `DISCOUNT_TIERS`，明確跟使用者複述一次「後端和前端都已同步改成一樣的門檻」。

## 部署方式（改完一定要講這段，不然使用者會以為改壞了）

**只改了 `power-cheer/0703.html`、`style.css`、`app.js`、`api.js`**：
```bash
git add power-cheer/0703.html power-cheer/style.css power-cheer/app.js power-cheer/api.js
git commit -m "說明改了什麼"
git push
```
GitHub Pages 通常 1 分鐘內會更新，使用者若還看到舊畫面，請他按 Ctrl+F5（強制重新整理）。若這次推送後 GitHub Actions 的 Pages 部署步驟顯示 `Deployment failed, try again later.` 這種訊息，通常是 GitHub 服務端暫時性問題（不是你改壞了東西），到 repo 的 Actions 分頁重跑該次失敗的 job，或再推一次小改動即可；期間網站會繼續顯示上一個成功版本，不會整個掛掉。實際能打開的網址是
`https://service-gogocare.github.io/form/power-cheer/0703.html`（注意檔名是 `0703.html`，不是 `index.html`；若還沒重新部署成功，舊網址 `.../power-cheer/frontend/0703.html` 可能暫時還能打開）。

**改了 `backend/*.gs`**：
```bash
cd power-cheer/backend
clasp push
```
**push 完還沒結束** —— Apps Script 的網頁應用程式網址是綁定在「部署版本」上的，`clasp push` 只是更新程式碼草稿，不會自動讓正式網址生效。還要到 [script.google.com](https://script.google.com) 打開這個專案 →「部署」→「管理部署作業」→ 找到現有的部署 → 按編輯（鉛筆圖示）→ 版本選「新版本」→ 部署，這樣正式網址才會套用新程式碼。這一步最常被漏掉，如果使用者說「怎麼改了都沒生效」，先檢查這個。

## 不要做的事

- 不要改 `backend/Config.gs` 的 `SPREADSHEET_ID`，除非使用者明確要求換一份全新的 Google Sheet。
- 不要把 `backend/.clasp.json` 加進 git（裡面有真實的 Apps Script ID，已經被 `.gitignore` 排除，維持現狀就好）。
- 不要為了「順手優化」去動姓名/Email 驗證規則或 24 小時集氣限制，這些是產品規則（`docs/SDD.md` 第 6、7 節），要改一定要先跟使用者確認是有意要改規則，而不是單純美化文字。
- 不要只改 `DISCOUNT_TIERS` 其中一邊。
- 不要把 GitHub Pages 部署失敗的錯誤誤判成「檔案內容改壞了」——先看 log 是卡在 build/artifact 階段還是「部署狀態確認」階段，後者通常是 GitHub 端暫時性問題，重跑即可。

## 拿不準的時候

先用一兩句話跟使用者確認你理解的需求（例如「所以是想把封面圖換成新的活動照片，其他不動，對嗎？」），再動手改，改完用上面的檢查清單驗證一次，最後用白話（不要用程式術語）跟他說改了什麼、要怎麼讓它上線。更細的檔案結構與資料格式說明在同目錄的 `reference.md`，需要更精確的細節時再讀取。
