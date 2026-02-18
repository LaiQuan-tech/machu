import React, { useState } from 'react'
import { Booking, BookingStatus } from '../../types'
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗')
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
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
