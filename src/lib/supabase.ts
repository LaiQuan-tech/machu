import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (\!supabaseUrl || \!supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

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
          status: BookingStatus
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
          status?: BookingStatus
        }
        Update: {
          status?: BookingStatus
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
