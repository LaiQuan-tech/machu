-- 法會報名表：新增電子郵件欄位
-- 請在 Supabase Dashboard > SQL Editor 執行（可重複執行）
--
-- 「帳號後五碼」不需要新欄位：fahui_reconcile.sql 已建立 account_last5，
-- 原本只有後台填寫，這次開放報名者在表單上自行填入，共用同一欄位。

ALTER TABLE public.fahui_registrations ADD COLUMN IF NOT EXISTS email TEXT;

-- 確認欄位都在（執行後應看到 email 與 account_last5 兩列）
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fahui_registrations'
  AND column_name IN ('email', 'account_last5')
ORDER BY column_name;
