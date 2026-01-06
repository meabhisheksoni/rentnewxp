export interface Renter {
  id: number
  user_id?: string
  name: string
  email: string | null
  phone: string | null
  property_address: string | null
  monthly_rent: number
  move_in_date: string | null
  is_active: boolean
  created_at?: string | null
  total_pending?: number
}

export interface Payment {
  id?: number
  renter_id: number
  amount: number
  payment_date: number
  due_date: number
  status: 'paid' | 'pending' | 'overdue'
  notes?: string
  created_at?: string
}

export interface BillItem {
  name: string
  amount: number
  enabled: boolean
}

export interface ElectricityBill extends BillItem {
  initialReading: number
  finalReading: number
  multiplier: number
}

export interface MotorBill extends BillItem {
  initialReading: number
  finalReading: number
  multiplier: number
  numberOfPeople: number
}