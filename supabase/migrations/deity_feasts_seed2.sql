-- 神明聖誕第二批：靠「本尊對照」補上的五筆
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行，已存在的 title 不會重複插入）
--
-- 第一批（deity_feasts_seed.sql）留白的十一尊裡，有六尊經廟方指認本尊後補上：
--   茉莉媽祖               = 媽祖（天上聖母）        → 三月廿三
--   天觀音                 = 觀世音菩薩              → 二月十九（誕辰）
--   老駕／和緣／顧爐太子   = 三太子（中壇元帥）      → 九月初九
--   天官武財神             = 中路財神趙元帥（趙公明）→ 三月十五
-- 日期取自 sim.org.tw 台灣神明生日一覽表，同一份表也把第一批 27 筆逐條驗過。
--
-- 觀音一年有三個日子，這裡取「誕辰」二月十九；
-- 另有六月十九得道、九月十九出家，廟方若也要做，另外新增兩筆即可。
--
-- 仍然留白的五尊：九天司祿貴人星君、菁埔夫人、順天夫人、黃府千歲、火神。
-- 查不到通行的日期，多半是地方性或本壇特有的稱謂，一律由廟方填，不由程式猜。
-- （表裡只有八月初三「九天司命灶君」，司祿與司命是兩位，不可挪用。）

INSERT INTO public.deity_feasts
  (title, deity_id, calendar_type, lunar_month, lunar_day, is_leap_month, note, is_visible, sort_order)
SELECT v.title, d.id, 'lunar', v.m, v.dd, FALSE, '', FALSE, 0
FROM (VALUES
  ('茉莉媽祖', '茉莉媽祖聖誕', 3, 23),
  ('天觀音',   '天觀音聖誕',   2, 19),
  ('老駕太子', '老駕太子聖誕', 9,  9),
  ('和緣太子', '和緣太子聖誕', 9,  9),
  ('顧爐太子', '顧爐太子聖誕', 9,  9),
  ('天官武財神', '天官武財神聖誕', 3, 15)
) AS v(deity_name, title, m, dd)
LEFT JOIN public.deities d ON d.name = v.deity_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.deity_feasts f WHERE f.title = v.title
);

SELECT
  COUNT(*)                                     AS 總筆數,
  COUNT(*) FILTER (WHERE is_visible)           AS 已顯示,
  COUNT(*) FILTER (WHERE deity_id IS NOT NULL) AS 已對上神尊
FROM public.deity_feasts;
