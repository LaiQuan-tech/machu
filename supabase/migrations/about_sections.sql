-- 「關於我們」內容管理：一列 = 一個圖文段落
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
--
-- 為什麼是「一列一段」而不是一大塊文章？
--   前台是圖文穿插的版型，照片要夾在段落之間。若整篇存成一大塊文字，
--   就得在文字裡插入 [圖1] 這類記號再解析——對非工程人員太容易寫壞。
--   拆成段落之後，後台每個段落一張卡片，新增一段就是多一列。

CREATE TABLE IF NOT EXISTS public.about_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 顯示順序，數字小的在前。拖拉排序後整批重寫這個欄位
  sort_order  INTEGER NOT NULL DEFAULT 0,
  heading     TEXT,
  -- 內文。空一行＝新的一段；支援 **粗體** 與 [文字](網址) 兩種標記
  body        TEXT,
  -- 照片在 storage 的路徑（不存完整網址，換 bucket 或網域時才不用改資料）
  image_path  TEXT,
  caption     TEXT,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS about_sections_order_idx ON public.about_sections (sort_order);

ALTER TABLE public.about_sections ENABLE ROW LEVEL SECURITY;

-- 訪客只讀得到「顯示中」的段落：草稿留在後台不會外流
DROP POLICY IF EXISTS "public_read_about_sections" ON public.about_sections;
CREATE POLICY "public_read_about_sections" ON public.about_sections
  FOR SELECT TO anon, authenticated USING (is_visible = TRUE);

-- 管理員可讀全部（含隱藏的）並增刪改
DROP POLICY IF EXISTS "admin_all_about_sections" ON public.about_sections;
CREATE POLICY "admin_all_about_sections" ON public.about_sections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 首頁那兩張數字卡沿用既有的 site_settings，不另外開表
INSERT INTO public.site_settings (key, value) VALUES
  ('about_fact1_value', '1986'),
  ('about_fact1_label', '建壇年份'),
  ('about_fact2_value', '10萬+'),
  ('about_fact2_label', '年度信眾')
ON CONFLICT (key) DO NOTHING;

-- 帶入目前站上的文案，後台一打開就有東西可以改（已存在則不覆蓋）
INSERT INTO public.about_sections (sort_order, heading, body, is_visible)
SELECT 0,
       '心中有善不畏苦；家有溫暖路有光。',
       '和聖壇創立近四十年，秉持著天上聖母傳道的精神。我們深信，心中有善不畏苦；家有溫暖路有光。信仰不止於燒香祈福，更是落實於日常的為人處世。以信仰安頓身心，以善念引領前行，將媽祖的教誨實踐於生活之中，讓慈悲與善念一路延續。',
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.about_sections);

-- 確認結果
SELECT sort_order, heading, is_visible FROM public.about_sections ORDER BY sort_order;
