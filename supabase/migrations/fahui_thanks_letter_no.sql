-- 法會報名：感謝狀由「是否已寄送」改成「感謝狀編號」
-- 原本 thanks_letter 是 BOOLEAN（後台打勾），實務上財務人員要填的是
-- 印在實體感謝狀上的號碼（例如 456），所以改成 TEXT 由人自行填寫、不給預設值。
--
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行，第二次會直接跳過）。

DO $$
BEGIN
  -- 只有在欄位還是 BOOLEAN 時才轉換；已經是 TEXT 就什麼都不做，重跑不會出錯
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'fahui_registrations'
      AND column_name  = 'thanks_letter'
      AND data_type    = 'boolean'
  ) THEN
    -- NOT NULL 與 DEFAULT FALSE 必須先拿掉，否則型別轉換會被舊的預設值擋下來
    ALTER TABLE public.fahui_registrations ALTER COLUMN thanks_letter DROP DEFAULT;
    ALTER TABLE public.fahui_registrations ALTER COLUMN thanks_letter DROP NOT NULL;

    -- 先前已打勾的資料沒有號碼可填，轉成 'V' 保留「已處理」這件事實，
    -- 財務人員之後可以直接覆寫成真正的編號；沒打勾的一律留空（NULL）。
    ALTER TABLE public.fahui_registrations
      ALTER COLUMN thanks_letter TYPE TEXT
      USING (CASE WHEN thanks_letter THEN 'V' ELSE NULL END);
  END IF;
END $$;

-- 確認結果（應顯示 data_type = text、is_nullable = YES、column_default 為空）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fahui_registrations'
  AND column_name = 'thanks_letter';
