-- 同日聖誕合併（廟方 2026-09-09 決定）
-- 請在 Supabase Dashboard > SQL Editor 執行
--
-- 本壇 38 尊裡有幾組是「同一位神明的不同尊」，聖誕當然同一天。原本一尊一筆，
-- 前台會出現連續七列日期一模一樣、只有名字不同的項目，讀起來像重複貼上。
-- 廟方決定合併顯示：一組一筆，尊號寫進 note 讓信眾仍看得到本壇奉祀哪幾尊。
--
-- 合併後 deity_id 設為 NULL：一筆對應多尊，schema 是 1:1 對不上，
-- 硬指其中一尊會讓後台顯示「這筆屬於天上大聖母」而其餘六尊憑空消失，比留白更誤導。

BEGIN;

-- ① 天上聖母：七尊同為農曆三月廿三
UPDATE public.deity_feasts SET
  title    = '天上聖母聖誕',
  deity_id = NULL,
  note     = '本壇奉祀天上大聖母、開基天上二聖母、天上三聖母、天上四聖母、天上五聖母、湄洲聖母、茉莉媽祖，同日祝壽。'
WHERE title = '天上大聖母聖誕';

DELETE FROM public.deity_feasts WHERE title IN (
  '開基天上二聖母聖誕', '天上三聖母聖誕', '天上四聖母聖誕',
  '天上五聖母聖誕', '湄洲聖母聖誕', '茉莉媽祖聖誕'
);

-- ② 濟公師父：三師父與五師父同為農曆二月初二
--    土地公也是二月初二，但那是另一位神明，不併
UPDATE public.deity_feasts SET
  title    = '濟公師父聖誕',
  deity_id = NULL,
  note     = '本壇奉祀濟公三師父、濟公五師父，同日祝壽。'
WHERE title = '濟公三師父聖誕';

DELETE FROM public.deity_feasts WHERE title = '濟公五師父聖誕';

-- ③ 三太子：三尊同為農曆九月初九（中壇元帥聖誕）
UPDATE public.deity_feasts SET
  title    = '三太子聖誕',
  deity_id = NULL,
  note     = '本壇奉祀老駕太子、和緣太子、顧爐太子，同日祝壽。'
WHERE title = '老駕太子聖誕';

DELETE FROM public.deity_feasts WHERE title IN ('和緣太子聖誕', '顧爐太子聖誕');

-- ④ 地藏王菩薩記的是「農曆七月最後一天」，不是死的三十
--    小月（如 2026）程式會自動改列廿九並在前台註明，資料仍存三十不必改。
UPDATE public.deity_feasts SET
  note = '農曆七月最後一天。大月為三十、小月為廿九，本表已為您換算。'
WHERE title = '地藏王菩薩聖誕';

COMMIT;

-- 確認：應為 24 筆
SELECT title AS 名稱,
       lunar_month || '月' || lunar_day AS 農曆,
       CASE WHEN deity_id IS NULL THEN '（合併／未對應）' ELSE '單一神尊' END AS 對應,
       is_visible AS 顯示中
FROM public.deity_feasts
ORDER BY lunar_month, lunar_day, title;
