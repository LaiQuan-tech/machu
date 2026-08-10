-- 志工報名：用餐習慣（葷食／素食）
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）
-- 用途：法會當日備餐。表單為必選，先前的報名資料會是 NULL。

ALTER TABLE public.volunteer_registrations
  ADD COLUMN IF NOT EXISTS diet TEXT;

ALTER TABLE public.volunteer_registrations DROP CONSTRAINT IF EXISTS volunteer_diet_chk;
ALTER TABLE public.volunteer_registrations
  ADD CONSTRAINT volunteer_diet_chk
  CHECK (diet IS NULL OR diet IN ('葷食', '素食'));

-- 權限沿用既有政策（anon 只能 INSERT、管理員可讀寫），不需調整。
