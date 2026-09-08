-- 神明聖誕第三批：廟方 2026-09-09 提供的四尊
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）
--
--   順天夫人         正月十五   又稱順天聖母、臨水夫人、陳靖姑
--                              與 sim.org.tw「正月十五日 臨水夫人陳靖姑千秋」一致
--   九天司祿貴人星君  五月初五   與端午同日
--   火神（火德星君）  六月廿三
--   菁埔夫人         七月十三
--
-- **黃府千歲不建立**：廟方表示日期未知，明確要求不要出現在行事曆。
-- 這張表沒有「有這尊但日期不明」的表示法（calendar_type 的 CHECK 要求
-- lunar 型態必須有月與日），硬填一個日期比留白危險得多——信眾會照著跑一趟。
-- 日後查到再新增一筆即可。

INSERT INTO public.deity_feasts
  (title, deity_id, calendar_type, lunar_month, lunar_day, is_leap_month, note, is_visible, sort_order)
SELECT v.title, d.id, 'lunar', v.m, v.dd, FALSE, v.note, FALSE, 0
FROM (VALUES
  ('順天夫人',        '順天夫人聖誕',        1, 15, '又稱順天聖母、臨水夫人、陳靖姑。'),
  ('九天司祿貴人星君', '九天司祿貴人星君聖誕', 5,  5, ''),
  ('火神',            '火神聖誕',            6, 23, '又稱火德星君。'),
  ('菁埔夫人',        '菁埔夫人聖誕',        7, 13, '')
) AS v(deity_name, title, m, dd, note)
LEFT JOIN public.deities d ON d.name = v.deity_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.deity_feasts f WHERE f.title = v.title
);

-- 確認：應為 28 筆；38 尊裡只有黃府千歲沒有聖誕
SELECT title AS 名稱,
       lunar_month || '月' || lunar_day AS 農曆,
       is_visible AS 顯示中
FROM public.deity_feasts
ORDER BY lunar_month, lunar_day, title;
