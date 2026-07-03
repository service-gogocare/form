GOGOCare CKEditor 技術摘要
環境限制

CKEditor 4
無 JS 執行權限（onclick、 皆被過濾）
無 CKEditor 設定權限（無法新增外掛、範本、allowedContent）
<button></button> 標籤會被過濾

<details> / <summary> 標籤可保留但收合功能無效（CKEditor 不渲染原生行為）
<style> 標籤可使用
純 HTML + CSS 可正常運作

已確認可用的技術

<details> + <summary> 結構可保留，但在編輯器內無收合預覽
CSS class 樣式正常套用
rowspan 在 CKEditor 表格編輯中容易出錯，建議避免
RWD 使用 @media (max-width: 680px) 切換桌機表格／手機卡片
手機卡片與桌機表格為兩份獨立 HTML，需手動同步（無 JS 故無法自動產生）

FAQ 元件需求

收合展開功能
預設可指定開啟或收合
同事能在不切換原始碼模式的情況下新增問答（目前未解決）
理想解法：獨立 FAQ 產生器工具（填表 → 產生 HTML → 貼入原始碼）

課程表格元件

最終採用純卡片版型（捨棄表格），桌機手機共用一份 HTML
卡片結構：深色標頭（日期＋形式標籤＋時數積分）＋內容列（屬性標籤＋課程名稱）
屬性標籤用 <span></span> 垂直堆疊，每個詞段獨立一行，／ 後換行
字級符合台灣無障礙規範：內文 15px、表頭 14px、輔助說明 13px

<th> 加 scope="col" 符合 WCAG 1.3.1
