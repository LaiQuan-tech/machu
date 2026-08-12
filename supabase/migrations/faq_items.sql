-- 常見問題（FAQ）內容管理：一列 = 首頁「常見問題」的一題
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）
--
-- 為什麼要進資料庫：原本內容寫死在 content/faq.json，改一題就要工程師重新部署。
-- 廟方要能自己增刪改，所以搬進資料庫。
--
-- **搬進資料庫之後有一件事要知道**：
--   首頁畫面會即時反映後台的修改，但送給搜尋引擎的 FAQPage 結構化資料
--   與給不執行 JS 的 AI 爬蟲看的 <noscript> 純文字，是 `npm run build` 產生的靜態內容。
--   前者已改成執行期由 React 依資料庫內容重新注入（Google 會執行 JS，看到的一定是最新的）；
--   後者是建置當下的快照，要等下次部署才會更新——那只影響「新鮮度」，不影響正確性。
--   content/faq.json 保留為保底：資料表還沒建、或讀取失敗時前台仍有內容可顯示。

CREATE TABLE IF NOT EXISTS public.faq_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 顯示順序，數字小的在前。拖拉排序後整批重寫這個欄位
  sort_order  INTEGER NOT NULL DEFAULT 0,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faq_items_order_idx ON public.faq_items (sort_order);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- 訪客只讀得到「顯示中」的題目：草稿留在後台不會外流
DROP POLICY IF EXISTS "public_read_faq_items" ON public.faq_items;
CREATE POLICY "public_read_faq_items" ON public.faq_items
  FOR SELECT TO anon, authenticated USING (is_visible = TRUE);

-- 管理員可讀全部（含隱藏的）並增刪改
DROP POLICY IF EXISTS "admin_all_faq_items" ON public.faq_items;
CREATE POLICY "admin_all_faq_items" ON public.faq_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 帶入目前站上的八題，後台一打開就有東西可以改（已有資料則整段跳過，不覆蓋）
INSERT INTO public.faq_items (sort_order, question, answer, is_visible)
SELECT * FROM (VALUES
  (0, '和聖壇在哪裡？怎麼過去？', '和聖壇位於台北市中正區晉江街 72 巷 9 號。搭乘捷運至古亭站 2 號出口，步行約 5 分鐘即可抵達。', TRUE),
  (1, '開放時間是幾點到幾點？', '每日 06:00 至 23:00 開放。', TRUE),
  (2, '和聖壇主祀哪一尊神明？', '主祀天上聖母（媽祖）。本壇創立於民國 73 年，前身為聖鳳壇。', TRUE),
  (3, '問事需要先預約嗎？', '請盡可能透過官方網站或官方 LINE 帳號預約，方便廟方為您安排時間；也接受現場報名。', TRUE),
  (4, '問事怎麼收費？', '問事每份金紙 100 元，其餘部分隨喜。', TRUE),
  (5, '點燈有哪些燈別？費用多少？', '太歲祈安燈每年 NT$300、光明前程祈福燈每年 NT$300、財源廣進財利燈每年 NT$500、本命神明祈願燈每年 NT$1,200。多於農曆新年期間辦理，可於本站線上登記。', TRUE),
  (6, '可以幫家人代辦點燈嗎？', '可以。線上登記時能一次填寫多位對象的姓名與生辰資料，不限本人。', TRUE),
  (7, '第一次來需要準備供品或金紙嗎？', '不需要特別準備，誠心誠意、人來即可。', TRUE)
) AS seed(sort_order, question, answer, is_visible)
WHERE NOT EXISTS (SELECT 1 FROM public.faq_items);

-- 確認結果
SELECT sort_order, question, is_visible FROM public.faq_items ORDER BY sort_order;
