-- 法會報名：對帳欄位（後台可編輯，供產生報名表單與收入計算表使用）
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）

ALTER TABLE public.fahui_registrations
  -- 聯絡人性別（信士／信女）——報名表新增的欄位，先前的報名資料會是 NULL
  ADD COLUMN IF NOT EXISTS contact_gender   TEXT,
  -- 付款方式：'現金' | '轉帳' | '功德主'（功德主＝懺主，全項目皆有但不需付款）
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  -- 付費日期
  ADD COLUMN IF NOT EXISTS payment_date     DATE,
  -- 帳號後五碼（轉帳對帳用）
  ADD COLUMN IF NOT EXISTS account_last5    TEXT,
  -- 財務確認
  ADD COLUMN IF NOT EXISTS finance_check    BOOLEAN NOT NULL DEFAULT FALSE,
  -- 感謝狀編號（印在感謝狀上的號碼，例如 456；由財務人員自行填寫，無預設值）
  -- 註：舊資料庫這欄原本是 BOOLEAN，改型別請跑 fahui_thanks_letter_no.sql；
  --     這裡的 IF NOT EXISTS 對既有資料庫不會生效，不會把型別改回去。
  ADD COLUMN IF NOT EXISTS thanks_letter    TEXT,
  -- 會計確認
  ADD COLUMN IF NOT EXISTS accounting_check BOOLEAN NOT NULL DEFAULT FALSE,
  -- 後台備註（與報名者填寫的 notes 分開）
  ADD COLUMN IF NOT EXISTS admin_note       TEXT;

-- 付款方式限定三種值（允許 NULL＝尚未設定）
ALTER TABLE public.fahui_registrations DROP CONSTRAINT IF EXISTS fahui_payment_method_chk;
ALTER TABLE public.fahui_registrations
  ADD CONSTRAINT fahui_payment_method_chk
  CHECK (payment_method IS NULL OR payment_method IN ('現金', '轉帳', '功德主'));

-- 讀寫權限沿用既有政策：
--   auth_select_fahui / auth_update_fahui（已登入的管理員可讀取與更新）
--   anon_insert_fahui（訪客報名只做 INSERT，不會碰到這些欄位）
