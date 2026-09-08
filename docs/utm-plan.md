# UTM 導流追蹤規劃

> 2026-09-09 調查與規劃。動手前先讀「現況」——順序錯了會白做。

## 現況（實測，不是推測）

| 項目 | 狀態 | 依據 |
|---|---|---|
| GTM 容器 `GTM-NW9Z5NWQ` | **有載入，但完全是空的** | `curl gtm.js` 回 `"tags":[]`、`"predicates":[]`、`"rules":[]` |
| GA4 評估 ID | **空白** | `site_settings.ga4_id = ''` |
| Meta 像素 | 空白 | `site_settings.meta_pixel_id = ''` |
| 追蹤程式碼 | 完整可用 | `components/Analytics.tsx`，後台「追蹤碼」分頁可填編號 |
| canonical | 乾淨、不含 query | 實測 `/about?utm_source=x` → canonical `https://heshengtan.tw/about` |

**結論：現在網站沒有在收任何一筆流量資料。** 每個訪客下載了 331KB（未壓縮）的 GTM 程式，
然後什麼都不做。此時發帶 UTM 的連結，等於在沒有收件匣的地址上貼郵票。

## 三個會吃掉 UTM 的地方（都要修，否則標了也留不住）

### A. GA4 收到的網址不含 query string
`components/Analytics.tsx:111`

```js
page_location: window.location.origin + p,   // p 是硬編路徑代稱，沒有 search
```

GA4 的來源歸因是解析 `page_location` 得來的。這樣送出，UTM 對 GA4 不存在。

### B. 站內換頁會把整串 query string 洗掉
所有 pushState 都用「純路徑字串」，沒有帶 `window.location.search`：

- `goToPage` — `App.tsx:1330-1332`
- `openScripture` / `closeScripture` — `App.tsx:645-646` / `652-654`
- `openFahui` / `closeFahui` — `App.tsx:662-663` / `669-671`
- `openVolunteer` / `closeVolunteer` — `App.tsx:622` / `627`

訪客從 `/?utm_source=line` 進站，**點任何一個導覽項目，UTM 就消失**。
順帶一提這也是既有 bug：`?share=`（揪團連結）與 `?preview=1`（工作人員預覽）
同樣會被洗掉，跟 UTM 無關但一起修比較划算。

**修法不是「把 query 全部保留」**——那會讓訪客把帶著別人 UTM 的網址轉分享出去，
汙染報表。正確作法是 **保留功能性參數（share / preview / admin），主動剝掉 `utm_*`**。

### C. 送出報名時已經來不及讀 UTM
因為 B，送出當下 `location.search` 通常已經是空的。
UTM 必須**在進站那一刻讀一次存進 `sessionStorage`**（不要用 localStorage——
那會讓三個月前的來源黏在同一個人身上，之後每一筆報名都算給那次活動）。

## 建議的做法：兩層，價值不同

### 第 1 層：GA4（看瀏覽）
後台填 GA4 評估 ID，**並把 GTM 欄清空**。三個理由：
1. 容器是空的，留著只是白載 331KB；
2. `Analytics.tsx` 已內建 GA4 的 SPA 換頁 page_view，走 GTM 反而要自己在容器裡
   建一個 `spa_page_view` 觸發器（現在沒有），等於多一層又多一個會忘記的設定；
3. 廟方不會進 GTM 後台，多一層就是多一個沒人維護的地方。

### 第 2 層：把來源存進報名紀錄（**這層才是宮廟真正會看的**）
GA4 只會告訴你「300 個人從 LINE 來」。
真正能拿來做決定的是「**這 12 筆點燈是抖音那支影片帶來的**」。
對只有社群通路的廟方，這一層還更重要：LINE 沒有 referrer，
GA4 會把它算進「直接流量」，光看 GA4 永遠不會知道 LINE 群發到底有沒有效。

站上已經有現成的模式可以照抄：`line_clicks.source`（`services/supabase.ts:1641`）。

所有轉換都收斂在 `services/supabase.ts` 的 9 個函式，不必動任何 UI：

| 資料表 | 函式 | 行號 |
|---|---|---|
| `bookings` | `submitBooking` | 13 |
| `donations` | `submitDonation` | 153 |
| `lamp_registrations` | `submitLampRegistration` | 814 |
| `blessing_registrations` | `createBlessingRegistration` | 1256 |
| `shared_sessions` | `createSharedSession` | 1395 |
| `shared_session_entries` | `addSharedEntry` | 1430 |
| `fahui_registrations` | `submitFahuiRegistration` | 1676 |
| `volunteer_registrations` | `submitVolunteerRegistration` | 1808 |

（`submitRegistration` / `bulletin_registrations` 是死程式碼，全專案無呼叫端，不用管。）

**欄位設計**：每張表加一個 `source text`，存 `來源/形式/檔期` 的扁平字串，例如
`line/broadcast/pudu2026`。不用 jsonb——宮廟規模不需要，一個欄位在後台列表、
Excel 匯出、SQL 篩選（`LIKE 'qr/%'`）都最省事。
沒有 UTM 的訪客也要存：退回 referrer 的網域（`google`／`facebook`），
兩者都沒有就存 `direct`。這樣**每一筆都有來源**，統計不會有黑洞。

注意事項：
- anon 角色只有 INSERT 沒有 SELECT（`fahui_registration.sql:31-32`、
  `volunteer_registration.sql:27-28`），**加欄位不需要改 RLS 政策**。
- `bookings` / `donations` / `lamp_registrations` / `blessing_registrations`
  沒有 CREATE TABLE migration（當初在 Dashboard 手建），這次要補 ALTER 的 migration。
- **不要把 source 寫進 localStorage 草稿**（`fahui_registration_draft_v1`）——
  草稿會存好幾天，還原時會帶著過期的來源。

## UTM 命名規範（廟方照這張表填，不要自由發揮）

通路確認為 **IG、臉書、抖音、LINE** 四個社群，沒有印刷品。
這改變了 UTM 的價值來源，先講清楚：

- **分辨「哪個平台」其實不太需要 UTM**——GA4 從 referrer 就看得到
  `facebook.com`、`instagram.com`、`tiktok.com`。
- **唯一的例外是 LINE**：LINE 的內建瀏覽器多半不送 referrer，
  所以 LINE 帶來的人會全部被算成「直接流量」。**這是 UTM 在這四個通路裡最不可取代的一格。**
- **真正的價值在「同一個平台上的哪一個位置、哪一檔活動」**：
  referrer 只會說「來自 instagram.com」，不會說是簡介連結還是限時動態、
  是普渡那一波還是點燈那一波。那是 `utm_medium` 與 `utm_campaign` 的工作。

只用三個參數。`utm_content` / `utm_term` 是廣告投放用的，宮廟用不到。

**`utm_source`｜哪個平台**（就這四個，不要再增）

| 值 | 用在 |
|---|---|
| `line` | LINE 官方帳號 |
| `facebook` | 臉書粉專 |
| `instagram` | IG |
| `tiktok` | 抖音 |

**`utm_medium`｜平台上的哪個位置**（價值最高的一欄）

| 值 | 用在 |
|---|---|
| `broadcast` | LINE 群發訊息 |
| `richmenu` | LINE 圖文選單 |
| `chat` | LINE 一對一回覆時貼的連結 |
| `bio` | 個人檔案／簡介欄的連結（IG、抖音、臉書都有） |
| `post` | 貼文 |
| `story` | 限時動態 |

**`utm_campaign`｜哪一檔**

| 值 | 用在 |
|---|---|
| `pudu2026` | 普渡法會 |
| `lamps2027` | 光明燈、安太歲 |
| `relocation` | 遷址募款 |
| `scripture` | 天上聖母經 |
| `always` | 沒有特定檔期的長期連結（簡介欄、圖文選單多半屬這類） |

### 範例

```
LINE 群發普渡報名
https://heshengtan.tw/fahui?utm_source=line&utm_medium=broadcast&utm_campaign=pudu2026

LINE 圖文選單的「點燈」按鈕
https://heshengtan.tw/lamps?utm_source=line&utm_medium=richmenu&utm_campaign=always

IG 簡介欄
https://heshengtan.tw/?utm_source=instagram&utm_medium=bio&utm_campaign=always

抖音影片講遷址募款，簡介欄放連結
https://heshengtan.tw/relocation?utm_source=tiktok&utm_medium=bio&utm_campaign=relocation
```

### 三條鐵律

1. **站內連結絕對不要加 UTM。** 會被 GA4 判成一次新的來訪，把原本的來源歸因整個蓋掉。
   UTM 只用在「從站外進來」的連結。
2. **值一律小寫英數＋底線，不要中文。** 中文會被百分比編碼，報表變成亂碼難讀。
3. **一個檔期固定一組值，不要每次手打。** 手打必然會有 `Line`／`LINE`／`line`，
   報表就碎成三個看起來一樣的來源。

### 簡介欄與圖文選單建議改用短網址

IG 與抖音的簡介欄只有一個連結位，貼一長串 `?utm_source=…&utm_medium=…&utm_campaign=…`
既佔版面又難看；LINE 圖文選單則是設定一次之後不好改。這兩種情境在
`vercel.json` 用 **302（`permanent: false`）** 轉址比較好：

```json
{ "source": "/g/ig",
  "destination": "/?utm_source=instagram&utm_medium=bio&utm_campaign=always",
  "permanent": false }
```

廟方對外貼 `heshengtan.tw/g/ig`，之後要換目的地（例如簡介欄改導到遷址募款）
只要改這一行、不必去動 IG 與圖文選單的設定。
`redirects` 在 Vercel 的處理順序早於 `rewrites`，不會被萬用規則吃掉。
**一定要用 302 不要 301**——301 會被瀏覽器永久快取，之後改不動。

## 執行順序

| # | 事情 | 誰做 | 何時 |
|---|---|---|---|
| 0 | 後台填 GA4 評估 ID、清空 GTM 欄 | 使用者 | 隨時（沒有這步，以下全部白做） |
| 1 | 修 A（`page_location` 帶 query） | 工程 | 隨時，不碰送出路徑 |
| 2 | 修 B、C（進站捕捉 UTM；pushState 保留功能參數、剝掉 utm） | 工程 | 隨時，不碰送出路徑 |
| 3 | 加 `source` 欄 + 9 個函式注入 + 後台顯示／匯出 | 工程＋使用者跑 migration | **普渡（9/13）之後** |
| 4 | 把 UTM 對照表交給廟方；IG／抖音簡介欄與 LINE 圖文選單改用 `/g/*` 短網址 | 使用者 | 第 0 步完成後 |

**第 3 步為什麼要等**：它會改到 `submitFahuiRegistration`，那是收件中的高風險路徑
（部署紀律第 4 條）。普渡只剩幾天，不值得為了統計去動報名送出。

## 先解決這個，不然導流沒有意義

`heshengtan.tw` 被 HiNet「上網守衛」誤判封鎖的問題 **2026-09-09 實測仍在**：
DNS 回 `202.39.161.53`（正確應該是 Vercel 的 `216.198.79.1`），
用 `--resolve` 繞過 DNS 直連才拿得到 HTTP 200。

影響的是有訂閱上網守衛的 HiNet 用戶（不是全部 HiNet 用戶），但這台開發機就中了，
代表廟方自己的網路很可能也中。**信眾點了 LINE 群發的連結，看到的是憑證警告。**
在這件事解決前投入導流追蹤，量到的會是「LINE 帶來很多人但都沒報名」——
而原因根本不是文案或版面。

申訴：中華電信客服 0800-080-123。
