# Supabase + Vercel + Admin 後台 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將聖母宮預約系統從 Firebase 遷移至 Supabase，加入完整 Admin 後台，並部署至 Vercel（main→正式站、dev→測試站自動 CI/CD）。

**Architecture:** 前台保留現有 React SPA 預約流程，後台新增 `/admin` 路由（Supabase Auth Email+Password 保護），兩個 Supabase 專案分別對應正式/測試環境，透過 Vercel 環境變數自動切換。

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS (本地安裝取代 CDN), Supabase JS v2, React Router v6, Recharts（統計圖表）, Vercel

---

## Task 1: 安裝依賴套件 & 移除 CDN Tailwind

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/index.css`

**Step 1: 安裝所有新套件**

```bash
cd "/Users/aimand/.gemini/File/L Machu"
npm install @supabase/supabase-js react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: 建立 tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.tsx",
    "./*.ts",
  ],
  theme: {
    extend: {
      colors: {
        'temple-red': '#8B0000',
        'temple-gold': '#D4AF37',
        'temple-bg': '#FFFBF0',
        'temple-dark': '#2C0E0E',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
```

**Step 3: 建立 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Noto Sans TC', sans-serif;
  background-color: #FFFBF0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Noto Serif TC', serif;
}
```

**Step 4: 修改 index.html — 移除 CDN Tailwind，移除 importmap，加入 Google Fonts**

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>聖母宮 - 天上聖母</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700;900&family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

**Step 5: 修改 src/index.tsx 加入 CSS import**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 6: 驗證 build 正常**

```bash
cd "/Users/aimand/.gemini/File/L Machu"
npm run build
```
Expected: Build 成功，dist/ 目錄產生，無錯誤

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: migrate tailwind from CDN to local, install supabase & react-router"
```

---

## Task 2: 建立 Supabase 環境設定

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Create: `src/lib/supabase.ts`
- Modify: `.gitignore`

**Step 1: 建立 .env.example（commit 進 git）**

```bash
# 測試站 (dev branch → Supabase staging)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 2: 建立 .env.local（本地開發用，不 commit）**

填入測試站的值：
```
VITE_SUPABASE_URL=https://kbwfdskulxnhjckdvghj.supabase.co
VITE_SUPABASE_ANON_KEY=<從 Supabase 測試站 Settings > API 取得>
```

**Step 3: 確認 .gitignore 有 .env.local**

在 .gitignore 確認這行存在（若無則加入）：
```
.env.local
.env.*.local
```

**Step 4: 建立 src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          name: string
          phone: string
          birth_date: string
          booking_date: string
          booking_time: string
          consultation_type: string
          notes: string | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          admin_notes: string | null
          handled_by: string | null
          handled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          phone: string
          birth_date: string
          booking_date: string
          booking_time: string
          consultation_type: string
          notes?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
        }
        Update: {
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          admin_notes?: string | null
          handled_by?: string | null
          handled_at?: string | null
        }
      }
      admins: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
        }
      }
    }
  }
}
```

**Step 5: Commit**

```bash
git add src/lib/supabase.ts .env.example .gitignore
git commit -m "feat: add supabase client config and type definitions"
```

---

## Task 3: Supabase DB Migration SQL

**目的：** 在兩個 Supabase 專案建立相同的 table 結構與 RLS 規則

**Files:**
- Create: `supabase/migrations/20260218_init.sql`

**Step 1: 建立 migration 目錄與 SQL 檔案**

```bash
mkdir -p "/Users/aimand/.gemini/File/L Machu/supabase/migrations"
```

**Step 2: 建立 20260218_init.sql**

```sql
-- =============================================
-- 聖母宮預約系統 - 初始資料庫結構
-- =============================================

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- bookings 預約資料表
-- =============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
```

**Step 3: 在兩個 Supabase 專案執行 SQL**

前往 Supabase Dashboard > SQL Editor，分別在：
- 測試站 (kbwfdskulxnhjckdvghj) 執行此 SQL
- 正式站 (keosbjepuvqqqhzyuplb) 執行此 SQL

**Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add supabase migration SQL for bookings and admins tables"
```

---

## Task 4: 前台預約服務層 — 取代 Firebase

**Files:**
- Create: `src/services/bookingService.ts`
- Modify: `src/types.ts`
- Modify: `src/App.tsx`（更換 import）
- Delete: `src/services/firebase.ts`

**Step 1: 更新 src/types.ts**

```typescript
export enum ConsultationType {
  CAREER = '事業前途',
  HEALTH = '身體健康',
  MARRIAGE = '姻緣感情',
  FAMILY = '家庭家運',
  FORTUNE = '財運補庫',
  OTHER = '其他疑難'
}

export interface BookingData {
  name: string
  phone: string
  birth_date: string
  booking_date: string
  booking_time: string
  consultation_type: ConsultationType
  notes?: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Booking extends BookingData {
  id: string
  status: BookingStatus
  admin_notes?: string | null
  handled_by?: string | null
  handled_at?: string | null
  created_at: string
  updated_at: string
}
```

**Step 2: 建立 src/services/bookingService.ts**

```typescript
import { supabase } from '../lib/supabase'
import { BookingData, Booking, BookingStatus } from '../types'

export const submitBooking = async (data: BookingData): Promise<boolean> => {
  const { error } = await supabase
    .from('bookings')
    .insert({
      name: data.name,
      phone: data.phone,
      birth_date: data.birth_date,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      consultation_type: data.consultation_type,
      notes: data.notes || null,
    })

  if (error) {
    console.error('Booking submission error:', error)
    throw new Error(error.message)
  }

  return true
}

export const fetchBookings = async (): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Booking[]
}

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus,
  adminNotes?: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('bookings')
    .update({
      status,
      admin_notes: adminNotes || null,
      handled_by: user?.email || null,
      handled_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export const fetchBookingStats = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('status, consultation_type, created_at')

  if (error) throw new Error(error.message)

  const total = data.length
  const pending = data.filter(b => b.status === 'pending').length
  const confirmed = data.filter(b => b.status === 'confirmed').length
  const completed = data.filter(b => b.status === 'completed').length
  const cancelled = data.filter(b => b.status === 'cancelled').length

  // 按諮詢類型統計
  const byType = data.reduce((acc, b) => {
    acc[b.consultation_type] = (acc[b.consultation_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 最近 7 天趨勢
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  }).reverse()

  const dailyTrend = last7Days.map(date => ({
    date,
    count: data.filter(b => b.created_at.startsWith(date)).length
  }))

  return { total, pending, confirmed, completed, cancelled, byType, dailyTrend }
}
```

**Step 3: 修改 App.tsx — 更換 import 與欄位名稱**

在 App.tsx 中：
1. 將 `import { submitBooking } from './services/firebase'` 改為 `import { submitBooking } from './services/bookingService'`
2. 將 `formData` 的 `birthDate` 欄位改為 `birth_date`，`bookingDate` 改為 `booking_date`，`bookingTime` 改為 `booking_time`，`type` 改為 `consultation_type`
3. 更新所有對應的 `name` 屬性與 `handleInputChange`

**Step 4: 刪除 Firebase 服務**

```bash
rm "/Users/aimand/.gemini/File/L Machu/src/services/firebase.ts"
```

**Step 5: 驗證 build**

```bash
cd "/Users/aimand/.gemini/File/L Machu"
npm run build
```
Expected: 無 TypeScript 錯誤，build 成功

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace firebase with supabase booking service"
```

---

## Task 5: Admin 後台路由設定

**Files:**
- Modify: `src/index.tsx`
- Create: `src/admin/AdminApp.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/hooks/useAuth.ts`

**Step 1: 建立 src/hooks/useAuth.ts**

```typescript
import { useState, useEffect } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) checkAdmin(session.user.email!)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) checkAdmin(session.user.email!)
      else { setIsAdmin(false); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdmin = async (email: string) => {
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single()
    setIsAdmin(!!data)
    setLoading(false)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, user, loading, isAdmin, signIn, signOut }
}
```

**Step 2: 建立 src/components/ProtectedRoute.tsx**

```typescript
import React from 'react'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // LoginPage handles this via useAuth
  }

  return <>{children}</>
}
```

**Step 3: 修改 src/index.tsx — 根據路徑載入前台或後台**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Could not find root element')

const root = ReactDOM.createRoot(rootElement)

// 根據路徑決定載入前台或後台
const isAdmin = window.location.pathname.startsWith('/admin')

if (isAdmin) {
  import('./admin/AdminApp').then(({ AdminApp }) => {
    root.render(
      <React.StrictMode>
        <AdminApp />
      </React.StrictMode>
    )
  })
} else {
  import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
}
```

**Step 4: 建立 src/admin/AdminApp.tsx（骨架）**

```tsx
import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from './LoginPage'
import { Dashboard } from './Dashboard'
import { BookingList } from './BookingList'

type AdminView = 'dashboard' | 'bookings'

export const AdminApp: React.FC = () => {
  const { isAdmin, loading, signOut, user } = useAuth()
  const [view, setView] = React.useState<AdminView>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">載入中...</div>
      </div>
    )
  }

  if (!isAdmin) return <LoginPage />

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-temple-red text-white flex flex-col">
        <div className="p-6 border-b border-red-900">
          <h1 className="text-xl font-serif font-bold">聖母宮</h1>
          <p className="text-sm text-temple-gold mt-1">管理後台</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              view === 'dashboard' ? 'bg-red-900 text-temple-gold' : 'hover:bg-red-900'
            }`}
          >
            📊 統計總覽
          </button>
          <button
            onClick={() => setView('bookings')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              view === 'bookings' ? 'bg-red-900 text-temple-gold' : 'hover:bg-red-900'
            }`}
          >
            📋 預約管理
          </button>
        </nav>
        <div className="p-4 border-t border-red-900">
          <p className="text-xs text-gray-300 mb-2 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="w-full px-4 py-2 bg-red-900 hover:bg-red-950 rounded-lg text-sm transition-colors"
          >
            登出
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {view === 'dashboard' && <Dashboard />}
        {view === 'bookings' && <BookingList />}
      </main>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin app routing and auth hook"
```

---

## Task 6: Admin 登入頁面

**Files:**
- Create: `src/admin/LoginPage.tsx`

**Step 1: 建立 src/admin/LoginPage.tsx**

```tsx
import React, { useState } from 'react'
import { Flame } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? '帳號或密碼錯誤'
        : '登入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-temple-bg flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-temple-red p-3 rounded-full mb-4">
            <Flame className="w-8 h-8 text-temple-gold" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-temple-dark">聖母宮管理後台</h1>
          <p className="text-gray-500 text-sm mt-1">請使用管理員帳號登入</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-temple-red"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-temple-red"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-temple-red hover:bg-red-900 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/admin/LoginPage.tsx
git commit -m "feat: add admin login page with supabase auth"
```

---

## Task 7: Admin 統計儀表板

**Files:**
- Create: `src/admin/Dashboard.tsx`

**Step 1: 建立 src/admin/Dashboard.tsx**

```tsx
import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fetchBookingStats } from '../services/bookingService'

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchBookingStats>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookingStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">載入統計資料...</div>
  if (!stats) return <div className="p-8 text-red-500">載入失敗</div>

  const statusData = [
    { name: STATUS_LABELS.pending, value: stats.pending, color: STATUS_COLORS.pending },
    { name: STATUS_LABELS.confirmed, value: stats.confirmed, color: STATUS_COLORS.confirmed },
    { name: STATUS_LABELS.completed, value: stats.completed, color: STATUS_COLORS.completed },
    { name: STATUS_LABELS.cancelled, value: stats.cancelled, color: STATUS_COLORS.cancelled },
  ]

  const typeData = Object.entries(stats.byType).map(([name, value]) => ({ name, value }))

  return (
    <div className="p-8">
      <h2 className="text-2xl font-serif font-bold text-temple-dark mb-6">統計總覽</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '總預約數', value: stats.total, color: 'text-gray-800' },
          { label: '待確認', value: stats.pending, color: 'text-amber-600' },
          { label: '已完成', value: stats.completed, color: 'text-green-600' },
          { label: '已取消', value: stats.cancelled, color: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近 7 天趨勢 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 mb-4">最近 7 天預約趨勢</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="預約數" fill="#8B0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 狀態分佈 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 mb-4">預約狀態分佈</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 諮詢類型分佈 */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4">諮詢項目分佈</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="預約數" fill="#D4AF37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/admin/Dashboard.tsx
git commit -m "feat: add admin dashboard with recharts statistics"
```

---

## Task 8: Admin 預約管理列表

**Files:**
- Create: `src/admin/BookingList.tsx`
- Create: `src/admin/BookingDetail.tsx`

**Step 1: 建立 src/admin/BookingDetail.tsx**

```tsx
import React, { useState } from 'react'
import { Booking, BookingStatus } from '../types'
import { updateBookingStatus } from '../services/bookingService'

interface Props {
  booking: Booking
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS: { value: BookingStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待確認', color: 'bg-amber-100 text-amber-800' },
  { value: 'confirmed', label: '已確認', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '已取消', color: 'bg-red-100 text-red-800' },
]

export const BookingDetail: React.FC<Props> = ({ booking, onClose, onUpdated }) => {
  const [status, setStatus] = useState<BookingStatus>(booking.status)
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateBookingStatus(booking.id, status, adminNotes)
      onUpdated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-temple-dark">預約詳情</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">姓名：</span><span className="font-medium">{booking.name}</span></div>
            <div><span className="text-gray-500">電話：</span><span className="font-medium">{booking.phone}</span></div>
            <div><span className="text-gray-500">生日：</span><span className="font-medium">{booking.birth_date}</span></div>
            <div><span className="text-gray-500">諮詢項目：</span><span className="font-medium">{booking.consultation_type}</span></div>
            <div><span className="text-gray-500">預約日期：</span><span className="font-medium">{booking.booking_date}</span></div>
            <div><span className="text-gray-500">時段：</span><span className="font-medium">{booking.booking_time}</span></div>
          </div>
          {booking.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">備註：</span>{booking.notes}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">更新狀態</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                    status === opt.value ? `${opt.color} border-current` : 'border-transparent bg-gray-100 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理員備註</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-temple-red"
              placeholder="內部備註（信眾不可見）"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-temple-red text-white rounded-lg hover:bg-red-900 transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 建立 src/admin/BookingList.tsx**

```tsx
import React, { useEffect, useState, useCallback } from 'react'
import { Booking, BookingStatus } from '../types'
import { fetchBookings } from '../services/bookingService'
import { BookingDetail } from './BookingDetail'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
}

export const BookingList: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchBookings()
      setBookings(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b =>
      !search || b.name.includes(search) || b.phone.includes(search)
    )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-bold text-temple-dark">預約管理</h2>
        <button onClick={load} className="text-sm text-temple-red hover:underline">重新整理</button>
      </div>

      {/* 篩選工具列 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋姓名或電話..."
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-temple-red"
        />
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-temple-red text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '全部' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-500">載入中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['姓名', '電話', '諮詢項目', '預約日期', '時段', '狀態', '建立時間', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">沒有預約資料</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{b.consultation_type}</td>
                  <td className="px-4 py-3 text-gray-600">{b.booking_date}</td>
                  <td className="px-4 py-3 text-gray-600">{b.booking_time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(b)}
                      className="text-temple-red hover:underline text-xs font-medium"
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <BookingDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/admin/
git commit -m "feat: add booking list and detail management UI"
```

---

## Task 9: Vercel 部署設定

**Files:**
- Create: `vercel.json`
- Create: `.github/workflows/preview-check.yml`（可選）

**Step 1: 建立 vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 2: 在 Vercel Dashboard 建立專案**

1. 前往 https://vercel.com → New Project
2. Import `github.com/LaiQuan-tech/machu`
3. Framework Preset: Vite
4. Root Directory: `.`（根目錄）

**Step 3: 設定 Vercel 環境變數**

在 Vercel Project Settings > Environment Variables：

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://keosbjepuvqqqhzyuplb.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `<正式站 anon key>` | Production |
| `VITE_SUPABASE_URL` | `https://kbwfdskulxnhjckdvghj.supabase.co` | Preview |
| `VITE_SUPABASE_ANON_KEY` | `<測試站 anon key>` | Preview |

**Step 4: 設定 Vercel Git Integration**

在 Vercel Project Settings > Git：
- Production Branch: `main`
- Preview Branches: 所有分支（含 `dev`）

**Step 5: Commit vercel.json**

```bash
git add vercel.json
git commit -m "feat: add vercel deployment config with SPA rewrites"
```

---

## Task 10: 建立 dev 分支 & 初次推送

**Step 1: 確保在 main 分支並推送**

```bash
cd "/Users/aimand/.gemini/File/L Machu"
git checkout -b main 2>/dev/null || git checkout main
git push origin main
```

**Step 2: 建立並推送 dev 分支**

```bash
git checkout -b dev
git push origin dev
```

**Step 3: 驗證 Vercel 自動部署觸發**

- 前往 Vercel Dashboard > Deployments
- 確認 main 分支觸發 Production 部署
- 確認 dev 分支觸發 Preview 部署

**Step 4: 在 Supabase 正式站建立 admin 帳號**

前往 Supabase 正式站 (keosbjepuvqqqhzyuplb) Dashboard > Authentication > Users：
1. 點擊 "Add User"
2. 填入管理員 email 和密碼
3. 在 SQL Editor 執行：
```sql
INSERT INTO public.admins (email, name) VALUES ('your-admin@email.com', '管理員');
```

在測試站重複同樣步驟。

---

## Task 11: 最終驗證

**Step 1: 驗證前台預約功能**

1. 前往正式站 URL
2. 填寫預約表單並提交
3. 在 Supabase 正式站 Table Editor > bookings 確認資料已寫入

**Step 2: 驗證 Admin 後台**

1. 前往 `{正式站URL}/admin`
2. 用管理員帳號登入
3. 確認 Dashboard 統計顯示正常
4. 確認 BookingList 可列出預約
5. 點擊編輯，更新狀態為「已確認」，確認 DB 更新

**Step 3: 驗證 dev 分支自動部署**

```bash
git checkout dev
echo "# test" >> README.md
git add README.md
git commit -m "test: trigger dev preview deploy"
git push origin dev
```
確認 Vercel Dashboard 出現新的 Preview 部署，且使用測試站 Supabase

**Step 4: 最終 commit**

```bash
git checkout main
git merge dev
git push origin main
```

---

## 完成清單

- [ ] Task 1: Tailwind 本地化 + 套件安裝
- [ ] Task 2: Supabase 環境設定
- [ ] Task 3: DB Migration SQL 執行
- [ ] Task 4: Firebase → Supabase 服務層替換
- [ ] Task 5: Admin 路由架構
- [ ] Task 6: Admin 登入頁
- [ ] Task 7: Admin 統計儀表板
- [ ] Task 8: Admin 預約管理
- [ ] Task 9: Vercel 部署設定
- [ ] Task 10: 分支推送 & 初次部署
- [ ] Task 11: 最終驗證
