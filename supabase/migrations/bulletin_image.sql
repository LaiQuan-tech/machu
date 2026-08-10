-- 最新活動（公佈欄）加入活動照片
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）

-- 存完整的公開 URL，與神尊修復專案（repair_projects.image_url）一致
ALTER TABLE public.bulletins ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 確認欄位已存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bulletins'
  AND column_name = 'image_url';
