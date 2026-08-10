-- 法會線上報名表
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案
-- （可重複執行，已建立的欄位不會被覆蓋）

CREATE TABLE IF NOT EXISTS public.fahui_registrations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address        TEXT NOT NULL,
  line_id        TEXT,
  entries        JSONB NOT NULL DEFAULT '{}',
  zanpu_offering TEXT,
  meal_sponsor   INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  total_amount   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
);

-- 若資料表先前已建立，補上後加的欄位
ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS zanpu_offering TEXT;
ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS meal_sponsor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS contact_birth_date TEXT;
ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS contact_zodiac TEXT;

ALTER TABLE public.fahui_registrations ENABLE ROW LEVEL SECURITY;

-- 允許匿名插入（不需登入即可報名）
DROP POLICY IF EXISTS "anon_insert_fahui" ON public.fahui_registrations;
CREATE POLICY "anon_insert_fahui" ON public.fahui_registrations
  FOR INSERT TO anon WITH CHECK (true);

-- 已登入使用者（管理員）可讀取、更新、刪除
DROP POLICY IF EXISTS "auth_select_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_select_fahui" ON public.fahui_registrations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_update_fahui" ON public.fahui_registrations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_fahui" ON public.fahui_registrations;
CREATE POLICY "auth_delete_fahui" ON public.fahui_registrations
  FOR DELETE TO authenticated USING (true);
