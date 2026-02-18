-- =============================================
-- 聖母宮預約系統 - 初始資料庫結構
-- =============================================

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- bookings 預約資料表
-- =============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  birth_date      TEXT NOT NULL,
  booking_date    DATE NOT NULL,
  booking_time    TEXT NOT NULL CHECK (booking_time IN ('上午', '下午', '晚上')),
  consultation_type TEXT NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  admin_notes     TEXT,
  handled_by      TEXT,
  handled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自動更新 trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- admins 白名單資料表
-- =============================================
CREATE TABLE IF NOT EXISTS public.admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

-- bookings RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 任何人（包含匿名）可以新增預約
CREATE POLICY "Anyone can insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

-- 只有 admin 可以讀取所有預約
CREATE POLICY "Admins can read all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
    )
  );

-- 只有 admin 可以更新預約
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.email()
    )
  );

-- admins RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admin 只能讀取自己的資料
CREATE POLICY "Admins can read own record"
  ON public.admins FOR SELECT
  USING (email = auth.email());

-- =============================================
-- Index
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
