-- 遷址捐款：圖文段落（沿用 about_sections）＋ 捐款方案矩陣表
-- 請在 Supabase Dashboard > SQL Editor 執行此檔案（可重複執行）

-- ── 1. 圖文段落共用 about_sections ────────────────────────────────────────────
-- 「關於我們」與「遷址捐款」的段落結構完全一樣（標題／內文／照片／說明／順序），
-- 與其複製一張同樣的表再複製一套後台，不如加一個 page 欄位分流。
-- 表名維持 about_sections 是為了不動既有資料與政策；它現在同時服務兩個頁面。
ALTER TABLE public.about_sections
  ADD COLUMN IF NOT EXISTS page TEXT NOT NULL DEFAULT 'about';

ALTER TABLE public.about_sections DROP CONSTRAINT IF EXISTS about_sections_page_chk;
ALTER TABLE public.about_sections
  ADD CONSTRAINT about_sections_page_chk CHECK (page IN ('about', 'relocation'));

CREATE INDEX IF NOT EXISTS about_sections_page_order_idx
  ON public.about_sections (page, sort_order);

-- ── 2. 捐款方案（一列＝一張表格）──────────────────────────────────────────────
-- 方案是「金額當欄、回饋項目當列」的矩陣。若拆成 方案／欄／列／格 四張表，
-- 後台要維護四組增刪與外鍵，對廟方太重；整張表存成一列、欄列放 jsonb，
-- 後台就是一個所見即所得的格子編輯器，加一欄就是陣列多一個元素。
CREATE TABLE IF NOT EXISTS public.relocation_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  -- 表格標題，例如「每月同行｜月供養」
  title         TEXT,
  -- 表格左上角那一格，例如「每月供養」
  amount_header TEXT,
  -- 欄標題（金額）陣列，例如 ["600","1,000","2,000","3,000","6,000"]
  tiers         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 列：[{ "label": "誦經祈福", "cells": ["✓","✓","✓","✓","✓"] }, …]
  -- cells 長度應與 tiers 相同；前端渲染時會補齊，少填不會壞版
  rows          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 表格下方的補充說明
  note          TEXT,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS relocation_plans_order_idx ON public.relocation_plans (sort_order);

ALTER TABLE public.relocation_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_relocation_plans" ON public.relocation_plans;
CREATE POLICY "public_read_relocation_plans" ON public.relocation_plans
  FOR SELECT TO anon, authenticated USING (is_visible = TRUE);

DROP POLICY IF EXISTS "admin_all_relocation_plans" ON public.relocation_plans;
CREATE POLICY "admin_all_relocation_plans" ON public.relocation_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 帶入你提供的兩張方案表，後台一打開就有東西可以改（已有資料則不重複帶入）
INSERT INTO public.relocation_plans (sort_order, title, amount_header, tiers, rows, is_visible)
SELECT 0, '每月同行｜月供養', '每月供養',
       '["600","1,000","2,000","3,000","6,000"]'::jsonb,
       '[{"label":"誦經祈福","cells":["✓","✓","✓","✓","✓"]},
         {"label":"遷址功德簿","cells":["✓","✓","✓","✓","✓"]}]'::jsonb,
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.relocation_plans);

INSERT INTO public.relocation_plans (sort_order, title, amount_header, tiers, rows, is_visible)
SELECT 1, '單次供養', '單次供養',
       '["隨喜","10,000","30,000","50,000","100,000","100,000 以上"]'::jsonb,
       '[{"label":"誦經祈福","cells":["✓","✓","✓","✓","✓","✓"]},
         {"label":"遷址功德簿","cells":["✓","✓","✓","✓","✓","✓"]},
         {"label":"祖廟宮印黃布","cells":["—","—","—","—","✓","✓"]}]'::jsonb,
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.relocation_plans WHERE sort_order = 1);

-- 確認結果
SELECT sort_order, title, jsonb_array_length(tiers) AS 欄數, jsonb_array_length(rows) AS 列數, is_visible
FROM public.relocation_plans ORDER BY sort_order;

-- ── 追加：表格上方說明 ────────────────────────────────────────────────────────
-- 方案表除了下方補充，還需要一段在表格前面的引言，且要與表格同寬。
ALTER TABLE public.relocation_plans
  ADD COLUMN IF NOT EXISTS intro TEXT;
