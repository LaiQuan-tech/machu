import { supabase } from '../lib/supabase'
import { BookingData, Booking, BookingStatus } from '../../types'

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

  const byType = data.reduce((acc, b) => {
    acc[b.consultation_type] = (acc[b.consultation_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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
