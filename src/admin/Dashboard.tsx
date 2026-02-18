import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
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
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBookingStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">載入統計資料...</div>
  if (error) return <div className="p-8 text-red-500">載入失敗：{error}</div>
  if (!stats) return null

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
