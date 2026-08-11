# 和聖壇網站（媽祖官網）操作手冊

宮廟網站：React 19 + Vite + Tailwind(CDN) + Supabase。正式站 **https://heshengtan.tw**（2026-08-10 上線，GoDaddy 註冊、DNS 也在 GoDaddy）。
`https://machu-five.vercel.app` 是 Vercel 預設網域，仍然指到同一個部署、沒有停用——舊的分享連結不會壞。
Apex 用 A 記錄指 `216.198.79.1`（Vercel 新 IP 段，不是網路上常見的 76.76.21.21）；www 走 308 轉到 apex。
先讀全域制度 ~/.claude/CLAUDE.md；本檔只放這個 repo 的操作事實與陷阱。

## 目前狀態（2026-07-06）

- **法會報名表上線收件中**（佛道兩儀慈悲普渡禮懺法會，9/13 舉行、9/06 截止）。`App.tsx` 模組層級的 `FAHUI_LANDING=true` 讓報名表蓋住**根路徑**——**這是刻意的**。主官網上線時改成 `false` 再部署，其他都不用動。
  判斷集中在 `shouldShowFahui()`（根路徑＋非後台＋非志工頁才顯示），初始值與 popstate 共用同一個函式；分開寫過會導致按上一頁被報名表吃掉。
- **志工報名表也上線了**（VolunteerRegistration.tsx，migration：`supabase/migrations/volunteer_registration.sql`）。入口只在**法會報名成功頁**（刻意不放主表單，避免拉低法會報名轉換率）。點入口會把法會表已填的聯絡資料自動帶入（precedence：連結帶入 > 志工草稿 > 法會草稿）。後台「志工報名」分頁可看名單、標記已聯絡、匯出 Excel。只收 5 項基本資料（姓名/電話/地址/生日/LINE），無排班。
- **四項服務已各自獨立成分頁**（2026-08-05）：`/booking` 預約問事、`/lamps` 祈福點燈、`/blessing` 祈福活動、`/repair` 神尊修復。首頁只剩 Hero／最新活動／關於我們／祀奉神尊／宮廟服務／隨喜捐獻。
  路由是 `page` state ＋ `history.pushState`，設定在 `PAGE_PATHS`；`NAV_PRIMARY`／`NAV_MORE` 的 `kind` 區分「分頁」與「首頁區塊」，統一走 `navTo()`。
  從分頁點首頁區塊時，區塊還沒掛上 DOM，先把目標存進 `pendingScrollRef`，等 `page` 變 home 的 effect 再捲。
  新增分頁時：加進 `PAGE_PATHS`、`SitePage`、對應的 `{page === '…' && (…)}` 區塊，`vercel.json` 的 SPA rewrite 已涵蓋任意路徑不必改。
- 導覽列：主要七項＋「更多」下拉（祈福活動／隨喜捐獻／常見問題；神尊修復由 `ENABLE_REPAIR=false` 隱藏中）。手機選單不做下拉，用分隔線區隔；展開上限是 `max-h-[80vh]`＋內層 `overflow-y-auto`（固定 px 會裁掉最後幾項）。
- 後台入口：`https://heshengtan.tw/?admin=1`（會自動跳管理員登入；`?admin=1` 會讓 `FAHUI_LANDING` 失效，所以這也是收件期間預覽官網首頁的方法）。管理員只有 armand7951@gmail.com 與 lqtech2026@gmail.com（admin_profiles 表控管）。
- 全部資料表已啟用 RLS（migration：`supabase/migrations/mainsite_rls.sql`）。訪客只能 INSERT 報名、讀公開內容；統計數字走 SECURITY DEFINER RPC。

- **`vercel env rm` 只影響「之後」的部署**：移除環境變數不會改變線上那份函式，它仍帶著舊值。
  要真正生效必須再部署一次。（拆彈時誤以為移除即生效，結果按鈕又被按了兩次、正式站又被蓋掉。）
- **Deploy Hook 與 `/api/republish`**：後台「重新發布」按鈕會打 `api/republish.ts`，那支再去打 Vercel 的 Deploy Hook。**Hook 網址存在 Vercel 的 `VERCEL_DEPLOY_HOOK_URL`（Production，加密），刻意不加 `VITE_` 前綴**——加了會被 Vite 內嵌進前端 JS，等於把「觸發正式站部署」的權限公開給所有人。授權是把登入者的 Supabase token 丟去讀 `admin_profiles`，該表 RLS 只讓人讀自己那一列，非管理員必然拿到空陣列 → 403。實測：沒帶 token 401、假 token 401、GET 405、前端 bundle 與 git 都找不到那串網址。

## 常用指令（nvm 環境，直接跑 npm/vercel 會 command not found）

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"   # 每個 shell 都要先跑這行
npm run build        # 建置（vite 不做型別檢查！）
npx tsc --noEmit     # 型別檢查（build 過了不代表型別對）
vercel --prod --yes  # 部署正式站（已連結專案 machu）
```

開發伺服器：用 preview_start（名稱 `dev`，port 3000），不要用 Bash 起 server。設定在 `.claude/launch.json`；若遺失，重建時 runtimeExecutable 要用 bash 包 nvm 載入（參考 git 歷史或本檔常用指令段）。

## 部署紀律（每次必做）

0. **一律先 commit＋push，讓 git 成為部署來源**，不要只用 `vercel --prod` 上傳本機檔案。
   為什麼寫成第 0 條：2026-08-11 之前半年都只用 `vercel --prod` 部署，git 停在幾個月前的
   commit，本機與線上落差 84 個檔案。後台的「重新發布」按鈕走 Deploy Hook 從 **git** 重建，
   一按就把正式站換成幾個月前的版本，連續發生兩次。只要 repo 落後，任何 git 觸發的部署
   （Deploy Hook、GitHub 自動部署、別台機器 clone）都是一顆未爆彈。
   趕時間可以先 `vercel --prod` 讓改動上線，但**當天要補 commit＋push**，不要讓落差過夜。
1. `npx tsc --noEmit` 通過 → `npm run build` 通過 → 部署。
2. 部署後三驗：`curl -s https://heshengtan.tw/ | grep -o '/assets/index-[^"]*\.js'` 確認 bundle 更新；本機 preview 跑關鍵流程 DOM 斷言；preview_console_logs 零新錯誤。
   誤判防呆：若「頁面載入正常但資料全部抓不到（console 大量 fetch 失敗／對 supabase.co 的請求 521）」＝Supabase 專案暫停，**不是部署失敗**——先去 Dashboard Restore，不要回滾部署。
3. 報名表正在收件：任何影響 `FahuiRegistration.tsx`、`services/supabase.ts` 送出路徑的改動都算高風險，改完要實測一筆送出（然後用 SQL 刪測試資料，姓名用「測試」開頭以便清理）。

## Supabase 陷阱（每一條都真實踩過）

| 症狀 | 原因與處置 |
|---|---|
| 所有請求 HTTP 521 | 免費方案閒置自動暫停。到 Dashboard（專案 ref `keosbjepuvqqqhzyuplb`）按 Restore，等 1-2 分鐘。 |
| 單一表 404 | 表不存在（migration 沒跑）。migration 一律由使用者在 Dashboard SQL Editor 手動執行。 |
| anon 寫入後報 RLS 42501 | anon 只有 INSERT 權限：**insert 後不可 `.select()` 讀回**。要 id 就客戶端 `crypto.randomUUID()` 先產。 |
| 登入狀態下送出報名表失敗、未登入卻正常 | INSERT 政策只給 `TO anon` 沒給 `authenticated`。管理員登入後（存在 Supabase session）送出走 authenticated 角色 → 被 RLS 擋。**報名表的 insert 政策要 `TO anon, authenticated` 兩者都給**。症狀：只有你自己（登入測試）連續失敗、curl 與無痕視窗正常。曾耗數輪才定位。|
| 本機 supabase CLI 連到別的專案 | CLI 連結的是 PikTag，不是本專案。DDL 無法用 CLI/anon key 跑，只能 Dashboard。 |
| 前台要顯示統計（名額/累計） | 不要開放整表 SELECT。用既有 RPC：`get_booking_session_counts`、`get_repair_totals`、`get_blessing_event_stats`、`get_shared_session`。新需求照這模式加 SECURITY DEFINER RPC。 |

## 程式陷阱

- **localStorage 草稿**（`fahui_registration_draft_v1`）：改報名表欄位結構時，還原邏輯已有正規化（依 SERVICE_CONFIGS 重建），維持這個模式；新欄位要能吃舊草稿。這裡曾造成正式站白屏。
- **TSX 泛型**：泛型箭頭函式在本專案推導失敗（參數變 unknown）。泛型 helper 放模組層級 `function` 宣告＋呼叫端明確標參數型別。
- **狀態欄位可能為 null**：渲染前 `String(x ?? '')`。
- **日期**：一律本地時區組字串（`getFullYear/getMonth/getDate`），不用 `toISOString().slice(0,10)`（台灣早上 8 點前會差一天）。
- **datetime-local**：DB 的 UTC ISO 要先轉本地字串再塞 input（參考 AdminDashboard 的 `toLocalDatetimeInput`），否則每存一次漂 8 小時。
- 生日元件 `BirthDatePicker`：`solarOnly` 只收國曆、自動換算農曆＋生肖；年份顯示民國年。共用元件，改動會影響官網其他表單。`solarOnly` 模式輸出「民國72年6月20日（農曆五月初十）」合併字串（含國曆與農曆），後台匯出用 `splitBirthday()` 拆成兩欄；非 solarOnly 維持舊農曆字串。舊資料無國曆月日，匯出國曆欄會空白（無法回補）。
- **會員資料自動帶入**（App.tsx 的 `selfDefaults`／`selfWithBirth` ＋ 那支 effect）：已登入且填過會員中心資料時，**標記為「本人」的那張卡片**自動帶入姓名／生日／生肖／性別／地址；其他人的卡片只帶地址。四個表單（問事／點燈／祈福／捐獻）共用同一套，送出後重置也會重新帶入。兩個必須遵守的細節：(1) **只補空欄位**，使用者改過的一律不動，沒有變動時 `fillEmptyFields` 回傳原參考避免多餘重繪；(2) **帶入生日一定要遞增 `_bKey`**——`BirthDatePicker` 的年月日是內部 state，只在掛載時從 value 初始化一次，光改字串畫面不會動（三個下拉會停在「吉年／吉月／吉日」）。新增表單時照這個模式接上。
- **生肖一律由生日推算，不開放手選**（2026-08-11）：填了生日之後生肖欄位變唯讀，只有「沒有生日」的項目（嬰靈、冤親債主常不知生辰）才保留下拉。舊版是「自動帶入但仍可改」，結果出現過生日與生肖矛盾的資料（民國112年11月5日是兔年卻存成蛇）。三個地方都改了：`FahuiRegistration` 的報名項目、`MemberPortal` 的會員資料與通訊錄。法會聯絡人與志工本來就只由 `BirthDatePicker` 寫入，沒有手選入口。
- **舊資料的三個生日格式問題**（2026-08-11 清查 55 筆，修好 4 筆）：(1) 農曆十二月存成簡體「腊」——程式月份字表用繁體「臘」，`parseBirthDate` 的 `indexOf` 會找不到、回頭解析失敗；(2) 閏月存成「閏闰六月」繁簡重複；(3) 春節前出生的農曆年沒標出來（`民國107年2月1日（農曆臘月十六）` 實際是農曆 106 年）。三者現行程式都已修正。**寫比對用的 SQL 時注意繁簡**：用 `LIKE '%臘月%'` 找不到存成「腊」的舊資料，會靜默失效。另有 4 筆是會員中心帶入的純農曆格式（無國曆），無法回推，屬已知限制。
- 會員生日的儲存格式是**農曆字串**（`民國72年農曆五月初十`，MemberPortal 產生），不是 solarOnly 的合併字串；`parseBirthDate` 只吃得下前者，測試時別用錯格式。
- 後台匯出/篩選：`inDateRange()` 依報名日期（本地時區）篩選、`DateRangeFilter` 共用元件；匯出走 `filtered` 會跟著日期範圍。法會/志工兩分頁都有。
- **Hero 香煙（`components/IncenseSmoke.tsx`）**：**畫一條會捲的曲線，不要用粒子**。第一版做粒子模擬，粒子一散開單顆濃度就掉到看不見，整體只剩一片霧——廟方要的是「細細長長的一縷白煙」，粒子做不出來。三個關鍵：(1) **螺旋要 x、y 同時繞**（`COIL`）——只讓 x 擺動、y 單調往上，畫出來是鋸齒像閃電；真實的煙是繞著上升軸的螺旋，側看會投影成一串壓扁的橢圓、甚至自我交疊，那才是麻花感。(2) **擾動隨高度才加進來**（`LAMINAR`/`TRANSITION`），下段直、上段捲，這是線香層流轉紊流的真實行為。(3) **柔邊靠疊四道**（`PASSES`）由寬而淡到窄而濃，只畫一道不是銳利得像鐵絲就是糊得像霧。形狀的相位隨時間往上跑、速度等於煙速（`RISE_SECONDS` 換算），煙的形狀是被氣流整段帶著走的。線很細所以要照實際像素畫，用一半解析度會糊掉。(4) **整條一次 `fill()`，不要分段 `stroke()`**——舊版把曲線切成 40 段各自描邊，`lineCap:'round'` 讓每段的圓頭與下一段重疊、螺旋自我交疊處又再疊一次，alpha 相加就是一串「反光顆粒」（離線量到沿線 35 個亮點，接近 240/6=40 個接縫）。改成沿中心線推出半個線寬、繞一圈成封閉多邊形整條填滿：沒有接縫，而且 nonzero 填充規則對自我交疊只填一次。濃度改用垂直線性漸層（`alphaAt` 只跟高度有關，剛好對得上）。改完亮點數降到 4、相鄰起伏降到 1/10；因為不再疊加，平均亮度掉 17%，`PASSES` 的 a 要乘 1.3 補回來。捲離 Hero 或切分頁會停掉 rAF；可見與否一律以 `getBoundingClientRect` 為準，不採信 IntersectionObserver 的 isIntersecting（誤報一次 false 就會永遠停住）。
- **神尊去背（`scripts/build-hero-assets.js`＋`scripts/cutout-lib.js`）**：廟方給新照片時跑這支就好，用法寫在檔頭（sharp 裝在暫存資料夾，別寫進 package.json）。作法是「顏色判定＋從四邊長進來的連通元件＋斷細頸」，不是單純的色鍵。兩個踩過的坑：(1) **sharp 對單通道 raw 做 `blur()` 會自動升成 3 通道**，沒接 `.toColourspace('b-w')` 拿回來的 buffer 長度是 3 倍，alpha 會整片錯位；(2) 不要用 sharp 的 `trim()` 裁透明邊界——它比的是 RGB，而透明處的 RGB 還留著原始背景，會裁到莫名其妙的範圍，自己算 bbox 再 `extract()`。原則：**寧可留一點背景也不要咬掉神尊**（Hero 底是金色，殘留的黃牆幾乎看不出來，缺一塊袍子很明顯）。實際咬過頭的兩個原因：(1) **形態學開運算（fgOpen）會刪掉細長突出物**——濟公手上的法器、帽尖、冠帽流蘇都是這樣消失的，已經拿掉不再使用；(2) **顏色門檻抓太鬆**：白背板實測 s 只有 0.03–0.04，用 s<0.18 會把神尊身上的銀線繡、珍珠、淺色布一起判成背景。灰背板改用色相切（背板偏藍 h≈205，神尊是暖色 h≈42）比用亮度安全得多。驗收要用 `-tmp-mask.png` 這種**未裁切的全幅遮罩**疊回原圖看，拿裁切後的 PNG 去對位會因為 bbox 不對稱產生假的「被咬掉」。
- **Hero 神尊在平板直立會被切（`HERO_DEITIES`）**：桌機那組尺寸原本是純 vh，平板直立（iPad 第十代 820×1180）螢幕又高又窄，整組寬到 949px 卻只有 820px 可放，最左邊的濟公被切掉快一半。解法是每個 vh 都包 `min(A vh, A×0.9 vw)`，**0.9 這個比例七個值要一起改**；長寬比 1.163 是分界，比這寬走 vh（桌機完全不受影響），比這窄走 vw。同時要把 `sm:max-w-[…vw]` 改成 `sm:max-w-none`——那三個上限加起來是 156vw，窄螢幕上同時觸頂反而是撐寬的元凶。負邊距要寫 `mb-[calc(min(…)*-1)]`，寫 `-mb-[min(…)]` 會產出無效的 `-calc(...)`。改完在 820×1180／1024×1366／1280×800 量過，臉的連線都還是 10.0°。
- **遷址方案手機卡片**（`components/RelocationPage.tsx`）：只列「這一級有的」項目，沒有的不要畫灰色「—」。桌機是矩陣表格、橫向能比較各級差異，畫「—」才有意義；手機一級一張卡沒有比較對象，列一堆「—」是干擾（廟方明確反映過）。金額的「元」由 `withCurrency()` 在渲染層補，後台只存數字，「隨喜」這種非數字不會被加上單位。
- **滾動視差／進場（`hooks/useScrollMotion.ts`）**：全站一個引擎，App 掛一次掃全 document。元素只要掛 class：`.sr`＋`.sr-up/left/right`（進場）、`.sr-figure`（正向位移 96px）、`.sr-counter`（反向 56px），`data-par` 可覆寫幅度。**三件事必須分在三層元素上**：進場的 transform 由 CSS 給、視差的 transform 由 JS 寫成 inline、卡片自己的 `hover:-translate-y-*` 又是第三個 transform——疊在同一個元素上只會剩一個生效。另外 Tailwind CDN 排在自訂 `<style>` 之後，元素若帶 `transition-all` 會把 `.sr` 的 0.85s 曲線壓成 150ms，這種卡片要把 `.sr` 放外層包一層。
- **Tailwind preflight 的預設邊框色是 gray-200**（`rgb(229,231,235)`，看起來就是白線）。所以**不要靠加減 `border-*` class 來決定「有沒有線」**：class 一移除顏色立刻跳回那個灰白色，而 `transition-all` 讓寬度花 300ms 從 1px 縮到 0——那 300ms 就是一條很明顯的白線（導覽列踩過，廟方回報「往下滑 menu 下緣會出現白線」）。正確作法是**邊框常駐、只換顏色**：`border-b` 一直掛著，在 `border-transparent` 與目標色之間過渡。
- **導覽高亮（`handleScroll` 的捲動高亮）**：判定線用 `innerHeight*0.35`（夾在 120–300），不要改回固定 120px——`section[id]` 的 `scroll-margin-top` 是 80px，捲到定位時區塊頂端就在 80，跟 120 只差 40px，平滑捲動少捲 41px 高亮就退回上一個區塊（症狀：點「祀奉神尊」卻亮「關於我們」）。另有 `navLockRef`：點導覽後的平滑捲動期間停掉捲動高亮，否則途中每經過一個區塊就改一次。換頁的 `window.scrollTo` 要指定 `behavior:'instant'`，CSS 有全域 `scroll-behavior: smooth`。

## SEO 與 AI 檢索（2026-08-10 建置）

本站是純前端渲染的 SPA，**原始 HTML 的可見文字是 0 個字**。Google 會執行 JS 所以看得到，但 GPTBot／ClaudeBot／PerplexityBot 這類 AI 檢索器**不執行 JS**——沒有下面這些東西，AI 對本站一無所知。

- **預渲染（`scripts/prerender.js`）**：由 `npm run build` 自動接著跑。拿剛建好的 `dist/index.html` 當模板，為 /about /booking /lamps /blessing /relocation 各產一份靜態 HTML，換掉 title／description／canonical／og，再補該頁的 JSON-LD 與 `<noscript>` 內容。**必須跑在 vite build 之後**（資產 hash 要對得上）。它不會真的執行 React，所以後台資料（公告、神尊、關於我們內文）不會進靜態 HTML；要連那些一起靜態化得換 puppeteer 版，屆時注意 `/` 在非官網網域會顯示報名表，快照時要讓瀏覽器以 heshengtan.tw 的身分解析。
- **`vercel.json` 的陷阱**：**不要開 `cleanUrls`**。開了之後 `/about` 仍然會被最後那條 SPA 萬用 rewrite 吃掉、回傳 index.html（實測過兩次都失敗，拿掉才正常）。正確作法是在萬用規則**之前**逐條寫 `/about → /about.html`。新增預渲染頁時，`vercel.json` 與 `scripts/prerender.js` 的 ROUTES 要一起加。
- **分頁標題**：`App.tsx` 有一份 `titles` 對照表，內容要與 `scripts/prerender.js` 的 ROUTES 一致，否則爬蟲看到的和使用者看到的不一樣。
- **開放時間 06:00–22:30 寫在五個地方**：`index.html` 的 JSON-LD `closes` 與 noscript、`public/llms.txt`、`scripts/prerender.js` 的 noscript、`content/faq.json`、App.tsx 的頁尾與隱私政策。改一個就要五個一起改（2026-08-10 曾經頁尾 21:00、其餘 23:00 各說各話）。
- **捐款類別**：內容在**資料庫 `donation_types`**（後台「捐獻管理」分頁上方的可收合區塊，migration：`supabase/migrations/donation_types.sql`）。`types.ts` 的 `DonationType` 列舉降為保底。**最重要的一件事：`donations.type` 存的是類別的「文字」不是 id**，所以後台改名只影響之後的捐款，歷史紀錄維持原樣——那是財務資料，不擅自重寫；改名時 UI 會顯示受影響筆數並詢問要不要一併更新。有紀錄的類別**禁止刪除**（會讓報表指向不存在的類別），只能隱藏。「神尊修復」刻意不進這張表：那一項走神尊修復專頁、金額綁定專案，前台下拉一律排除。
- **常見問題**：內容在**資料庫 `faq_items`**（後台「常見問題」分頁可增刪改、拖拉排序，migration：`supabase/migrations/faq_items.sql`）。三份輸出的時效性不同，改動前先搞清楚：首頁畫面執行期讀資料庫（存檔就變）；`FAQPage` 結構化資料由 App.tsx 在**執行期覆蓋**預渲染那份（Google 執行 JS，所以標記與畫面永遠一致，這是 FAQPage 最容易踩的雷）；`<noscript>` 純文字是 `scripts/prerender.js` 建置時抓資料庫的快照，**下次部署才更新**。`content/faq.json` 降級為保底，資料表沒建或 Supabase 暫停時前台與建置都靠它，不會開天窗。後台有「重新發布」按鈕可自行觸發重新建置，讓那份 noscript 快照跟上（`api/republish.ts`）。執行期注入的那份 `<script id="faq-jsonld">` **只掛在首頁**，換頁要清掉——分頁上看不到問答，掛了就是「標記的內容使用者看不到」。
- （舊寫法備查）`content/faq.json` 曾經是**三個地方共用同一份**——首頁 `#faq` 區塊（App.tsx 讀 JSON 渲染）、`FAQPage` 結構化資料、`<noscript>` 純文字（後兩者由 `scripts/prerender.js` 注入 `dist/index.html`）。Google 的 FAQPage 規則要求標記的內容必須在頁面上看得到，所以**只改 JSON、不要在任何一邊另寫一份**。答案是廟方確認過的事實，不要為了 SEO 自己補。 首頁那份是**折疊的**（原生 `<details>`，樣式在 index.css 的 `.faq-item`）：Google 的 FAQPage 規則要求標記的內容使用者要看得到，「點一下就展開」算數，但**不能為了縮短頁面把答案整段拿掉**——那會讓結構化資料與畫面不一致。
- **靜態檔**：`public/robots.txt`（明確開放 GPTBot／ClaudeBot／PerplexityBot 等）、`public/sitemap.xml`、`public/llms.txt`。這三個都要靠 rewrite 之外的靜態檔案供應，之前它們回傳的是整頁 HTML。
- **結構化資料**：`index.html` 的 JSON-LD 有 PlaceOfWorship／WebSite／Event 三個節點。地址、電話、開放時間（每日 06:00–22:30）、法會日期改了要同步。

## 文案與 UI 慣例（使用者明確要求過）

- **全站不用 emoji**。裝飾用線條與色塊。
- LINE 官方帳號連結用短網址 `https://lin.ee/lj0gLqR`（@725utjch）。
- 匯款資訊：中國信託 822 大安分行 6025-4035-6010 王順文。
- 欄位用語：「陽上姓名」「陽上地址」（不用報恩人/懺悔人）；牌位欄位叫「牌位地址」，提示「請填完整地址與位置」。
- 用字：**「拔渡」不是「拔度」**（法會文案，2026-08-10 更正）。
- 主色 #C49820（金）、#7C5C1E、背景 #F5F0E8；標題襯線字。
- **區塊標題只有一種寫法**（2026-08-11 全站統一過，別再各寫各的）：

  小標 `<h2>` → 大標 `<h3>`（獨立頁是 `<h1>`）→ 分隔飾 → 說明。

  | | 小標 | 短棒 |
  |---|---|---|
  | 置中的區塊 | `text-temple-red font-serif text-lg font-bold tracking-widest mb-2 flex items-center justify-center gap-3` | 左右各一根 `<span className="w-8 h-1 bg-temple-gold" />` |
  | 靠左的區塊（右邊接照片欄） | 同上但去掉 `justify-center` | **只有左邊一根** |

  分隔飾一律 `<span className="w-12 h-px bg-temple-gold/70" />` ＋ `<span className="w-2 h-2 rotate-45 bg-temple-gold inline-block" />` ＋ 再一條短線，外層 `flex items-center gap-3 mt-3`（置中的再加 `justify-center`）。

  **不要**在小標放 icon、底線（`border-b-2`）、`✦` 字元，或改用別的色（`text-amber-700` 之類）——這四種都曾經出現過，已全部清掉。唯一例外是預約問事區：底色是深紅，小標用 `text-temple-gold` 才看得見。
  同一個小標文字在首頁與獨立頁短棒數可能不同（首頁靠左單邊、獨立頁置中雙邊），那是版型差異不是漏改。獨立頁的標題由 `components/StoryPage.tsx` 共用，改一處兩頁都會變。

## 待辦與未修事項

- 主官網上線 checklist：`FAHUI_LANDING` 改 false、index.html title／OG 換回官網用、hero 圖 fallback 是外連 Unsplash 建議換本地圖、Google Maps iframe 在部分環境載入失敗待驗證。
- 遷廟募款區塊尚未動工（使用者要求「新增一個區塊」，待確認目標金額／進度條、收款方式、說明內容、後台可編輯欄位）。
- 揪團功能停用中（`ENABLE_GROUP_BOOKING=false`）；程式與 RLS 已相容，重啟前跑一次完整流程測試。
- 歷史遺留：檢測報告 17 項問題已全修（2026-07-06），詳見 memory 的 project_main_site_prelaunch。

## Changelog
- 2026-07-06 建檔（Fable 5 立制度 session）
- 2026-07-06 對抗審查修正：工具名 fallback、輪數精確定義、門檻優先序、fresh-context 定義、521 誤判防呆
- 2026-08-05 四項服務拆獨立分頁、導覽改名與「更多」收納、法會著陸改 FAHUI_LANDING 旗標、公告加照片
- 2026-08-10 正式網域上線、預渲染與 AI SEO、首頁常見問題區塊（content/faq.json 單一來源）
- 2026-08-11 會員資料自動帶入四表單、香煙改緞帶填滿、平板直立 Hero 修正、全站區塊標題統一
