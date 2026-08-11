-- 捐款類別：一列 = 隨喜捐獻表單裡的一個選項
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
--
-- 原本寫死在 types.ts 的 DonationType 列舉，改個名字都要工程師改程式再部署。
--
-- **這張表與既有捐款紀錄的關係，動手前務必了解**：
--   `donations.type` 存的是類別的**文字**（例如「慈善救助」），不是這張表的 id。
--   所以在後台改名字，只會影響「之後」的捐款；已經收的紀錄仍然是舊名稱。
--   這是刻意的——那是財務資料，不擅自改寫。後台改名時會顯示受影響的筆數，
--   由廟方自己決定要不要一併更新（打錯字通常要改，換了用途通常不要改）。
--
-- 「神尊修復」不放進這張表：那一項走神尊修復專頁、金額綁定專案，
-- 前台的隨喜捐獻下拉本來就把它濾掉，程式仍以 DonationType.REPAIR 寫入。

CREATE TABLE IF NOT EXISTS public.donation_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 顯示順序，數字小的在前。拖拉排序後整批重寫這個欄位
  sort_order  INTEGER NOT NULL DEFAULT 0,
  -- 前台下拉顯示的文字，同時也是寫進 donations.type 的值，所以不可重複
  name        TEXT NOT NULL UNIQUE,
  -- 關掉就不出現在前台下拉；已收的紀錄不受影響（不要用刪除來「停辦」）
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donation_types_order_idx ON public.donation_types (sort_order);

ALTER TABLE public.donation_types ENABLE ROW LEVEL SECURITY;

-- 訪客只讀得到「顯示中」的類別
DROP POLICY IF EXISTS "public_read_donation_types" ON public.donation_types;
CREATE POLICY "public_read_donation_types" ON public.donation_types
  FOR SELECT TO anon, authenticated USING (is_visible = TRUE);

-- 管理員可讀全部（含隱藏的）並增刪改
DROP POLICY IF EXISTS "admin_all_donation_types" ON public.donation_types;
CREATE POLICY "admin_all_donation_types" ON public.donation_types
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 帶入目前程式裡的五項（神尊修復不列入，理由見檔頭）
INSERT INTO public.donation_types (sort_order, name, is_visible)
SELECT * FROM (VALUES
  (0, '隨喜捐款 (不指定)', TRUE),
  (1, '廟宇維護/修繕',     TRUE),
  (2, '慈善救助',          TRUE),
  (3, '教育文化',          TRUE),
  (4, '法會活動',          TRUE)
) AS seed(sort_order, name, is_visible)
WHERE NOT EXISTS (SELECT 1 FROM public.donation_types);

-- 確認結果
SELECT sort_order, name, is_visible FROM public.donation_types ORDER BY sort_order;
