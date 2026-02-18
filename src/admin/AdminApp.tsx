import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from './LoginPage'
import { Dashboard } from './Dashboard'
import { BookingList } from './BookingList'

type AdminView = 'dashboard' | 'bookings'

export const AdminApp: React.FC = () => {
  const { isAdmin, loading, signOut, user } = useAuth()
  const [view, setView] = useState<AdminView>('dashboard')

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
            統計總覽
          </button>
          <button
            onClick={() => setView('bookings')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              view === 'bookings' ? 'bg-red-900 text-temple-gold' : 'hover:bg-red-900'
            }`}
          >
            預約管理
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
