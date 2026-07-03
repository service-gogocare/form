
SDD v1.0－GOGOCARE 集氣網站
(Software Design Document)

1. 專案概述（Project Overview）
   專案名稱

GOGOCARE 集氣平台（Power Support Platform）

專案目的

建立一個公開的集氣網站，讓每位訪客每天可以為指定活動集氣一次。

每次集氣需留下：

姓名
Email

系統將：

累積所有集氣次數
即時計算目前集氣數
記錄每位參與者
每人 24 小時只能集氣一次
未來可寄送通知信件
2. 技術架構（Architecture）
GitHub Pages
        │
        │ fetch()
        ▼
Google Apps Script WebApp
        │
        ▼
Google Sheets
        │
        ▼
Gmail Service
前端

Github Pages

用途：

UI
集氣動畫
呼叫 API
後端

Google Apps Script

用途：

API
驗證
寫入資料
查詢資料
發送 Email
Database

Google Sheets

用途：

所有資料皆存於 Sheet

不另外使用 Firebase。

3. 系統功能
   F01

首頁

顯示

活動名稱

目前集氣

12586

人

並有：

立即集氣

按鈕。

F02

集氣表單

輸入：

姓名

Email

送出。

F03

24 小時限制

若：

Email

於24小時內

已集氣

則回傳：

您已完成今日集氣 ❤️

請於

2026/07/04 14:36

後再次集氣
F04

成功集氣

成功後：

🎉

集氣成功

目前共有

12587

位支持者
F05

即時更新

首頁：

每

10 秒

重新取得最新資料。

4. Google Sheet 設計
   Sheet1

PowerLog

id	datetime	name	email	ip	userAgent

例如：

|1|2026/7/1 08:33|王小明|abc@gmail.com|xxx|Chrome|

Sheet2

Summary

| total |

例如：

|12587|

避免每次重新計算。

Sheet3

MailQueue（未來）

| email | subject | status |

方便批次寄信。

5. API Design
   GET
   ?action=status

Response

{
    success:true,

    total:12587,

    updateTime:"2026-07-03 15:30"
}
POST
?action=cheer

Body

{
    name,

    email
}

成功

{

success:true,

message:"集氣成功",

total:12588

}

失敗

{

success:false,

message:"24小時內只能集氣一次",

nextTime:"2026-07-04 10:22"

}
6. 驗證規則

姓名

不可空白

Email

不可空白

Email格式

不能超過100字
7. Google Apps Script 流程
收到POST

↓

驗證資料

↓

搜尋Sheet

↓

Email是否存在？

↓

YES

↓

24小時內？

↓

YES

↓

拒絕

↓

NO

↓

新增資料

↓

更新Summary

↓

寄信

↓

回傳成功
8. 前端流程
首頁

↓

GET Status

↓

顯示集氣數

↓

使用者按集氣

↓

跳出Dialog

↓

輸入

姓名

Email

↓

POST

↓

成功

↓

動畫

↓

重新GET

↓

更新集氣數
9. 安全性

Email：

全部轉小寫

ABC@gmail.com

↓

abc@gmail.com

避免重複。

限制：

姓名

50字

Email

100字

避免垃圾資料。

10. UI需求

首頁：

Logo

標題

目前集氣

██████████

12587

立即集氣

成功：

❤️❤️❤️

集氣成功

感謝您的支持
11. 未來擴充

Version 2

LINE Login
Google Login
分享FB
分享LINE
排行榜
留言牆
12. 專案目錄
power-cheer/

│

├── frontend/
│     index.html
│     style.css
│     app.js
│     api.js
│
├── backend/
│     Code.gs
│     Api.gs
│     Mail.gs
│     Config.gs
│
├── sheets/
│     PowerLog
│     Summary
│
└── docs/
      SDD.md
