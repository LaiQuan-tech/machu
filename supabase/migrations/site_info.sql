-- 網站基本資料：地址、電話、開放時間
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
--
-- 沿用既有的 site_settings（key/value），不另外開表——這只是幾個字串。
--
-- ── 為什麼要搬進資料庫 ──
-- 這三項原本散在六個地方各寫一份：頁尾、隱私政策、結構化資料、noscript、
-- llms.txt、常見問題。改一次要記得六個都動，漏一個就是網站自己跟自己說不一樣的話
-- （實際發生過：網站寫 22:30、首頁問答寫 22:00，持續數小時）。
--
-- ── 改了之後哪些地方會立刻變、哪些要等 ──
--   立刻：頁尾、隱私政策、送給 Google 的結構化資料（執行期由 React 覆寫）
--   等下次發布：llms.txt 與 <noscript> 純文字（建置時的快照，
--              按後台「重新發布」即可更新）
-- 開放時間存「時:分」兩個欄位而不是一段文字：結構化資料的 opens/closes
-- 需要 24 小時制的機器可讀格式，存成「每日 06:00 – 23:00」就得回頭解析，
-- 廟方打成全形冒號就會壞掉。

INSERT INTO public.site_settings (key, value) VALUES
  ('info_address',      '100 臺北市中正區晉江街 72 巷 9 號'),
  -- 結構化資料的 PostalAddress 需要拆開的欄位
  ('info_street',       '晉江街72巷9號'),
  ('info_locality',     '中正區'),
  ('info_region',       '臺北市'),
  ('info_postal_code',  '100'),
  ('info_phone',        '0953-945-349'),
  ('info_hours_open',   '06:00'),
  ('info_hours_close',  '23:00')
ON CONFLICT (key) DO NOTHING;

SELECT key, value FROM public.site_settings WHERE key LIKE 'info_%' ORDER BY key;
