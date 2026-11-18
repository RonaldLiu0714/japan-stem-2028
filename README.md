# 2028 年 4 月入學｜日本國公立理工升學研究

以日語授課學部新生為對象的離線研究手帖。下載 [dist/index.html](dist/index.html) 並用瀏覽器開啟，即可查閱院校、比較途徑、篩選日程及勾選 EJU 考綱。收藏與進度存在目前瀏覽器，可在「我的備考」匯出及合併 JSON 備份。

## 資料庫

[SQLite 資料庫](data/admissions.sqlite) 收錄 routes（途徑）、sources（官方文件）、events（校別日程）、shared_calendar（全國考試）及 syllabus（考綱）。以 routes.id 連接 sources.route_id 與 events.route_id。相同日期與招生規定可能適用多個招生單位。

結構化原始資料在 data/admissions.json、data/calendar.json、data/eju.json。查詢示例：

```sql
SELECT school, unit, route, year, status FROM routes
WHERE year = 2028 ORDER BY school, unit;
```

## 更新

1. 核對官方要項與適用範圍，在 JSON 更新對應欄位、來源章節與查證日。新年度新增紀錄，保留舊年度。
2. 在專案根目錄執行 `python3 build.py` 產出 HTML 與 SQLite。建置僅需 Python 3 標準函式庫。
3. 一併提交 JSON、SQLite 和 HTML。查證日位於頁面範本和來源紀錄中。

招生變更公告可能僅適用個別學科或選拔方式。「科目吻合」指當年度的備考科目組合，個人出願資格、考試分數及文件期限仍需逐項核對。尚待確認欄位依各校正式要項補錄。
