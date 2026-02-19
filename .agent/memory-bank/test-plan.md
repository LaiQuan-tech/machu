# Test Plan - Machu Project

## 1. 基礎架構驗證 (Infrastructure)

### 1.1 環境架構與樣式 (Architecture & Layout) [Live]
- [x] **TC-INF-001**: 網站能正常載入，且無 Console 錯誤。
- [x] **TC-INF-002**: Tailwind CSS 樣式正常套用 (檢查 `h1` 字體應為 Noto Serif TC)。
- [x] **TC-INF-003**: 本地開發環境 (`npm run dev`) 啟動正常。

### 1.2 Supabase 連線 (Supabase Integration) [Live]
- [x] **TC-INF-004**: 應用程式能成功初始化 Supabase Client。
- [x] **TC-INF-005**: `.env.local` 環境變數讀取正確 (Supabase URL/Key)。

### 1.3 資料庫與 RLS (Database & RLS) [Live]
- [x] **TC-DB-001**: `bookings` 與 `admins` 資料表存在且結構正確。
- [x] **TC-DB-002**: RLS 驗證 - 匿名使用者**無法**讀取 `admins` 表格。
- [x] **TC-DB-003**: RLS 驗證 - 匿名使用者**可以**寫入 `bookings` 表格 (新增預約)。

---

## 2. 核心功能驗證 (Core Features)

### 2.1 前台預約功能 (Booking Frontend) [In Progress]
- [ ] **TC-FE-001**: 表單驗證 - 必填欄位 (姓名、電話、日期) 未填時無法送出。
- [ ] **TC-FE-002**: 預約送出成功後，顯示成功訊息或跳轉。
- [ ] **TC-FE-003**: 送出的資料能正確寫入 Supabase `bookings` 資料表 (狀態預設為 `pending`)。
- [ ] **TC-FE-004**: 日期/時間選擇器操作順暢，無格式錯誤。

### 2.2 Admin 登入與權限 (Admin Auth) [Testing]
- [ ] **TC-AUTH-001**: 未登入狀態訪問 `/admin` 應自動導向 `/admin/login`。
- [ ] **TC-AUTH-002**: 輸入錯誤帳密，應顯示「帳號或密碼錯誤」提示。
- [ ] **TC-AUTH-003**: 輸入正確 Admin 帳密，應成功跳轉至 `/admin` 儀表板。
- [ ] **TC-AUTH-004**: 登入狀態下重新整理頁面，應保持登入 (Session Persist)。
- [ ] **TC-AUTH-005**: 點擊「登出」，應清除 Session 並導向登入頁。

### 2.3 後台預約管理 (Booking Management) [Backlog]
- [ ] **TC-MGT-001**: 後台能顯示所有預約清單，按時間排序 (新->舊)。
- [ ] **TC-MGT-002**: 能篩選預約狀態 (Pending/Confirmed/Cancelled)。
- [ ] **TC-MGT-003**: Admin 能修改預約狀態 (例如：將 Pending 改為 Confirmed)，並即時更新列表。
- [ ] **TC-MGT-004**: Admin 能編輯備註 (Admin Notes) 並儲存。

### 2.4 數據統計儀表板 (Analytics Dashboard) [Backlog]
- [ ] **TC-ANA-001**: 儀表板能顯示正確的「今日預約數」與「待處理數」。
- [ ] **TC-ANA-002**: 圖表能正確顯示「諮詢類型分佈」 (Pie Chart)。
- [ ] **TC-ANA-003**: 圖表能正確顯示「過去 7 天預約趨勢」 (Bar/Line Chart)。

---

## 3. 部署驗證 (Deployment)

### 3.1 CI/CD 流水線 (CI/CD Deployment) [Staging]
- [x] **TC-DEP-001**: Push code 到 `main` 分支，Vercel 自動觸發 Production 部署。
- [x] **TC-DEP-002**: Push code 到 `dev` 分支，Vercel 自動觸發 Staging 部署。
- [ ] **TC-DEP-003**: Production 與 Staging 環境變數隔離 (連接不同 Supabase 專案)。
