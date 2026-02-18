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
