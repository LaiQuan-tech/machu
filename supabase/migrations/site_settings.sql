-- 網站設定（目前用於追蹤碼：GA4／Meta 像素／GTM）
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）
--
-- 只存「編號」不存整段程式碼：程式碼由前端用官方標準寫法組出來。
-- 讓後台貼任意 <script> 等於開一個後台被盜就能植入惡意腳本的洞，不值得。

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 訪客要讀得到才能載入追蹤碼
DROP POLICY IF EXISTS "public_read_site_settings" ON public.site_settings;
CREATE POLICY "public_read_site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

-- 只有後台管理員能改
DROP POLICY IF EXISTS "admin_all_site_settings" ON public.site_settings;
CREATE POLICY "admin_all_site_settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 先建立三個欄位，後台才有東西可編輯
INSERT INTO public.site_settings (key, value) VALUES
  ('ga4_id', ''),
  ('meta_pixel_id', ''),
  ('gtm_id', '')
ON CONFLICT (key) DO NOTHING;

-- 廟方決定只走 GTM：GA4 與 Meta 像素都在 GTM 容器內設定，
-- 這兩欄必須留空，否則同一次瀏覽會被記錄兩次。
UPDATE public.site_settings SET value = 'GTM-NW9Z5NWQ', updated_at = NOW() WHERE key = 'gtm_id';
UPDATE public.site_settings SET value = '', updated_at = NOW() WHERE key IN ('ga4_id', 'meta_pixel_id');

-- 社群帳號：留空的平台前台不顯示。先帶入原本寫死在程式裡的兩個帳號，
-- 其餘留空等廟方自行填寫（抖音是新的）。
INSERT INTO public.site_settings (key, value) VALUES
  ('social_line',           'https://lin.ee/lj0gLqR'),
  ('social_facebook',       'https://www.facebook.com/100064534546570'),
  ('social_facebook_group', ''),
  ('social_instagram',      ''),
  ('social_tiktok',         '')
ON CONFLICT (key) DO NOTHING;

SELECT key, value FROM public.site_settings ORDER BY key;
