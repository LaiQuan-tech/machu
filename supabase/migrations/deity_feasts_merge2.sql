-- 觀音合併（廟方 2026-09-09 指出天觀音與鎮殿觀音是同一位）
-- 請在 Supabase Dashboard > SQL Editor 執行
--
-- 與前一批（deity_feasts_merge.sql）同樣的道理：同一位神明的不同尊，聖誕當然同一天，
-- 一尊一筆會讓前台出現兩列日期一樣只有名字不同的項目。
-- 農曆二月十九是觀世音菩薩「誕辰」；另有六月十九得道、九月十九出家，
-- 廟方若要一併做，另外新增兩筆即可，不要改這一筆的日期。
--
-- 注意：這批資料此時 is_visible 已是 true，UPDATE 不動該欄，合併後仍然顯示中。

BEGIN;

UPDATE public.deity_feasts SET
  title    = '觀世音菩薩聖誕',
  deity_id = NULL,
  note     = ''
WHERE title = '鎮殿觀音聖誕';

DELETE FROM public.deity_feasts WHERE title = '天觀音聖誕';

COMMIT;

-- 確認：應為 27 筆、4 筆合併、全部顯示中
SELECT COUNT(*)                                AS 總筆數,
       COUNT(*) FILTER (WHERE is_visible)      AS 顯示中,
       COUNT(*) FILTER (WHERE deity_id IS NULL) AS 合併筆數
FROM public.deity_feasts;
