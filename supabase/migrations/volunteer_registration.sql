-- 志工報名表（佛道兩儀慈航普渡禮懺法會 志工招募）
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
-- 前提：mainsite_rls.sql 已建立 public.is_admin() 函式。

CREATE TABLE IF NOT EXISTS public.volunteer_registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL,
  birth_date  TEXT,
  zodiac      TEXT,
  line_id     TEXT,
  availability      JSONB,
  availability_note TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
);

-- 若資料表先前已建立，補上出勤時段欄位
ALTER TABLE public.volunteer_registrations ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE public.volunteer_registrations ADD COLUMN IF NOT EXISTS availability_note TEXT;

ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;

-- 訪客只能送出（INSERT），不能讀取；管理員可完整讀寫
DROP POLICY IF EXISTS "anon_insert_volunteer" ON public.volunteer_registrations;
CREATE POLICY "anon_insert_volunteer" ON public.volunteer_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_volunteer" ON public.volunteer_registrations;
CREATE POLICY "admin_select_volunteer" ON public.volunteer_registrations
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_volunteer" ON public.volunteer_registrations;
CREATE POLICY "admin_update_volunteer" ON public.volunteer_registrations
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_volunteer" ON public.volunteer_registrations;
CREATE POLICY "admin_delete_volunteer" ON public.volunteer_registrations
  FOR DELETE TO authenticated USING (public.is_admin());
