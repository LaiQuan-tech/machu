-- 信眾名冊的人工校正
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）
--
-- 名冊是即時從各報名來源算出來的，不是一張實體名單，
-- 所以校正不能直接改資料，而是存「規則」，每次重算名冊時套用。
-- 這樣原始報名資料完全不動，校正也隨時可以撤銷。
--
-- kind 三種：
--   confirm_same：這個姓名確實是同一個人，不要再顯示「疑似同名」
--   split       ：這個姓名其實是多個人，依生日拆開
--   alias       ：這個姓名與 target_key 是同一個人（錯字、改名），合併計算

CREATE TABLE IF NOT EXISTS public.devotee_overrides (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       TEXT NOT NULL CHECK (kind IN ('confirm_same', 'split', 'alias')),
  -- 正規化後的姓名（去除所有空白），與前端 nameKey() 一致
  name_key   TEXT NOT NULL,
  -- alias 專用：要併進哪一個 name_key
  target_key TEXT,
  -- split 專用：{ "main": "<主要生日key>" }，沒有生日的紀錄歸給主要那位
  payload    JSONB,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一個姓名同一種校正只留一筆，重複設定就覆蓋
CREATE UNIQUE INDEX IF NOT EXISTS devotee_overrides_kind_name
  ON public.devotee_overrides (kind, name_key);

ALTER TABLE public.devotee_overrides ENABLE ROW LEVEL SECURITY;

-- 只有後台管理員能讀寫（名冊本身就只有後台看得到）
DROP POLICY IF EXISTS "admin_all_devotee_overrides" ON public.devotee_overrides;
CREATE POLICY "admin_all_devotee_overrides" ON public.devotee_overrides
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

SELECT kind, name_key, target_key, payload FROM public.devotee_overrides ORDER BY created_at;
