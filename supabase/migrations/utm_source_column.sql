-- 報名來源追蹤（UTM 第二層）
-- 2026-09-09。搭配 services/attribution.ts 與 docs/utm-plan.md。
--
-- 為什麼要存在自己的資料表而不是只看 GA4：
--   GA4 只說得出「300 人從 IG 來」，廟方要的是「這 12 筆點燈是抖音那支影片帶來的」。
--   而且 LINE 的內建瀏覽器不送 referrer，GA4 會把 LINE 來的人全算成「直接流量」——
--   只有這一欄看得到 LINE 群發到底有沒有效。
--
-- 存什麼：一個扁平字串「來源/形式/檔期」，例如
--   line/broadcast/pudu2026     從 LINE 群發進來報的
--   tiktok/bio/relocation       抖音簡介欄
--   google                      沒有 UTM，退回 referrer 的網域
--   direct                      沒有 UTM 也沒有 referrer（直接輸入網址、書籤、掃 QR）
-- 不用 jsonb：宮廟規模不需要。一欄在後台列表、Excel 匯出、SQL 篩選（LIKE 'line/%'）都最省事。
--
-- 三個刻意的決定：
--   1. 不加 CHECK constraint。這是報名的送出路徑，CHECK 一旦擋下來整筆報名就失敗——
--      追蹤欄位絕對不可以把轉換擋掉。長度與字元由前端負責清理與截斷。
--   2. 不給 DEFAULT。NULL 的意思是「這筆早於追蹤上線」，跟 'direct' 是兩件不同的事，
--      給了預設值就再也分不出來。上線後每一筆都會由前端帶值進來。
--   3. 不建索引。以本站的資料量（每張表數百筆）全表掃描遠比維護索引划算。
--
-- RLS 不必改：各表的 INSERT 政策都是 WITH CHECK (true) 的資料列層級規則，
-- GRANT 也只授在函式的 EXECUTE 上，沒有任何逐欄授權，所以新欄位自動涵蓋。
-- （已逐一核對 mainsite_rls.sql、fahui_registration.sql、volunteer_registration.sql）

ALTER TABLE public.bookings                ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.donations               ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.lamp_registrations      ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.blessing_registrations  ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.fahui_registrations     ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.volunteer_registrations ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.bookings.source                IS '報名來源，格式「來源/形式/檔期」如 line/broadcast/pudu2026；NULL 表示早於追蹤上線';
COMMENT ON COLUMN public.donations.source               IS '同上';
COMMENT ON COLUMN public.lamp_registrations.source      IS '同上';
COMMENT ON COLUMN public.blessing_registrations.source  IS '同上';
COMMENT ON COLUMN public.fahui_registrations.source     IS '同上';
COMMENT ON COLUMN public.volunteer_registrations.source IS '同上';

-- 刻意不加的兩張表：
--   shared_sessions / shared_session_entries（揪團）——親友填的項目最後是由「建立者」
--   按下送出、寫進 lamp_registrations 等表，所以來源已經記在那邊了，這裡再存一次是重複。
--   bulletin_registrations——submitRegistration 全專案沒有任何呼叫端，是死程式碼。

-- 跑完可以用這句確認六張表都加上了（應該回 6 列）：
--   SELECT table_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND column_name = 'source'
--     AND table_name IN ('bookings','donations','lamp_registrations',
--                        'blessing_registrations','fahui_registrations','volunteer_registrations')
--   ORDER BY table_name;
