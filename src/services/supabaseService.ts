import { supabase } from '@/lib/supabase'
import { Renter, Payment } from '@/types'

export interface MonthlyBill {
  id?: string
  user_id?: string
  renter_id: number
  month: number
  year: number
  rent_amount: number
  
  // Electricity
  electricity_enabled: boolean
  electricity_initial_reading: number
  electricity_final_reading: number
  electricity_multiplier: number
  electricity_reading_date?: string
  electricity_amount: number
  
  // Motor
  motor_enabled: boolean
  motor_initial_reading: number
  motor_final_reading: number
  motor_multiplier: number
  motor_number_of_people: number
  motor_reading_date?: string
  motor_amount: number
  
  // Water
  water_enabled: boolean
  water_amount: number
  
  // Maintenance
  maintenance_enabled: boolean
  maintenance_amount: number
  
  // Totals
  total_amount: number
  total_payments: number
  pending_amount: number
  
  created_at?: string
  updated_at?: string
}

export interface AdditionalExpense {
  id?: string
  monthly_bill_id: string
  description: string
  amount: number
  date: string
  created_at?: string
}

export interface BillPayment {
  id?: string
  monthly_bill_id: string
  amount: number
  payment_date: string
  payment_type: 'cash' | 'online'
  note?: string
  created_at?: string
}

export class SupabaseService {
  // Renter operations
  static async insertRenter(renter: Omit<Renter, 'id' | 'created_at'>): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const renterWithUser = {
        ...renter,
        user_id: user.id
      }

      const { data, error } = await supabase
        .from('renters')
        .insert(renterWithUser)
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error inserting renter:', error)
      throw new Error(`Failed to add renter: ${error}`)
    }
  }

  static async getAllRenters(): Promise<Renter[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('renters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching renters:', error)
      return []
    }
  }

  static async getActiveRenters(): Promise<Renter[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('renters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('getActiveRenters - User ID:', user.id)
      console.log('getActiveRenters - Retrieved renters:', data?.length || 0)
      console.log('getActiveRenters - Renter details:', data?.map(r => ({ id: r.id, name: r.name, monthly_rent: r.monthly_rent })))

      return data || []
    } catch (error) {
      console.error('Error fetching active renters:', error)
      return []
    }
  }

  static async getArchivedRenters(): Promise<Renter[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('renters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching archived renters:', error)
      return []
    }
  }

  static async getRenterById(id: number): Promise<Renter | null> {
    try {
      const { data, error } = await supabase
        .from('renters')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching renter:', error)
      return null
    }
  }

  static async setRenterActive(renterId: string, isActive: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Convert string ID to number for database query
      const numericId = parseInt(renterId, 10)
      if (isNaN(numericId)) {
        throw new Error('Invalid renter ID format')
      }

      const { error } = await supabase
        .from('renters')
        .update({ is_active: isActive })
        .eq('id', numericId)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error(`Error setting renter active status to ${isActive}:`, error)
      throw new Error('Failed to update renter status.')
    }
  }

  // Payment operations
  static async insertPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error inserting payment:', error)
      throw new Error(`Failed to add payment: ${error}`)
    }
  }

  static async getPaymentsByRenter(renterId: number): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('renter_id', renterId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching payments:', error)
      return []
    }
  }

  static async getPaymentsForMonth(month: Date): Promise<Payment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      // First get renter IDs for this user
      const { data: renterIds } = await supabase
        .from('renters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!renterIds || renterIds.length === 0) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('renter_id', renterIds.map(r => r.id))
        .gte('due_date', startOfMonth.getTime())
        .lte('due_date', endOfMonth.getTime())

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching payments for month:', error)
      return []
    }
  }

  // Dashboard calculations
  static async getTotalMonthlyRent(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('renters')
        .select('monthly_rent')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      console.log('getTotalMonthlyRent - User ID:', user.id)
      console.log('getTotalMonthlyRent - Active renters data:', data)
      console.log('getTotalMonthlyRent - Monthly rents:', (data || []).map(r => r.monthly_rent))

      const total = (data || []).reduce((sum, renter) => sum + renter.monthly_rent, 0)
      console.log('getTotalMonthlyRent - Calculated total:', total)
      return total
    } catch (error) {
      console.error('Error calculating total monthly rent:', error)
      return 0
    }
  }

  static async getOutstandingAmount(forDate: Date): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // First get renter IDs for this user
      const { data: renterIds } = await supabase
        .from('renters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!renterIds || renterIds.length === 0) return 0

      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .in('renter_id', renterIds.map(r => r.id))
        .in('status', ['pending', 'overdue'])
        .lte('due_date', forDate.getTime())

      if (error) throw error

      const total = (data || []).reduce((sum, payment) => sum + payment.amount, 0)
      return total
    } catch (error) {
      console.error('Error calculating outstanding amount:', error)
      return 0
    }
  }

  // Monthly Bill operations
  static async getMonthlyBill(renterId: number, month: number, year: number): Promise<MonthlyBill | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // First verify the renter belongs to this user
      const { data: renter } = await supabase
        .from('renters')
        .select('id')
        .eq('id', renterId)
        .eq('user_id', user.id)
        .single()

      if (!renter) throw new Error('Renter not found or access denied')

      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*')
        .eq('renter_id', renterId)
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data || null
    } catch (error) {
      console.error('Error fetching monthly bill:', error)
      return null
    }
  }

  static async getPreviousMonthBill(renterId: number, month: number, year: number): Promise<MonthlyBill | null> {
    try {
      let prevMonth = month - 1
      let prevYear = year
      
      if (prevMonth === 0) {
        prevMonth = 12
        prevYear = year - 1
      }

      return await this.getMonthlyBill(renterId, prevMonth, prevYear)
    } catch (error) {
      console.error('Error fetching previous month bill:', error)
      return null
    }
  }

  static async saveMonthlyBill(bill: MonthlyBill): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const billWithUser = {
        ...bill,
        user_id: user.id
      }

      const { data, error } = await supabase
        .from('monthly_bills')
        .upsert(billWithUser, {
          onConflict: 'renter_id,month,year',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) throw error

      console.log('Saved monthly bill with ID:', data.id)
      return data.id
    } catch (error) {
      console.error('Error saving monthly bill:', error)
      throw new Error(`Failed to save monthly bill: ${error}`)
    }
  }

  static async getAdditionalExpenses(monthlyBillId: string): Promise<AdditionalExpense[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('additional_expenses')
        .select('*')
        .eq('monthly_bill_id', monthlyBillId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching additional expenses:', error)
      return []
    }
  }

  static async saveAdditionalExpense(expense: Omit<AdditionalExpense, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('additional_expenses')
        .insert(expense)
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error saving additional expense:', error)
      throw new Error(`Failed to save additional expense: ${error}`)
    }
  }

  static async updateAdditionalExpense(expenseId: string, expense: Omit<AdditionalExpense, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('additional_expenses')
        .update(expense)
        .eq('id', expenseId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating additional expense:', error)
      throw new Error(`Failed to update additional expense: ${error}`)
    }
  }

  static async getBillPayments(monthlyBillId: string): Promise<BillPayment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('monthly_bill_id', monthlyBillId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching bill payments:', error)
      return []
    }
  }

  static async saveBillPayment(payment: Omit<BillPayment, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .insert(payment)
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error saving bill payment:', error)
      throw new Error(`Failed to save bill payment: ${error}`)
    }
  }

  static async updateBillPayment(paymentId: string, payment: Omit<BillPayment, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('bill_payments')
        .update(payment)
        .eq('id', paymentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating bill payment:', error)
      throw new Error(`Failed to update bill payment: ${error}`)
    }
  }

  // Test connection
  static async testConnection(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('renters')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (error) throw error
      console.log('✅ Connection successful!')
    } catch (error) {
      console.error('❌ Connection failed:', error)
    }
  }

  // Add sample data
  static async addSampleData(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check if data already exists for this user
      const { data: existingRenters } = await supabase
        .from('renters')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (existingRenters && existingRenters.length > 0) return

      // Add sample renters for this user
      const sampleRenters = [
        {
          name: 'Ram bhaiya',
          email: 'ram@example.com',
          phone: '555-0123',
          property_address: '123 Main Street, Apartment 1A',
          monthly_rent: 6000,
          move_in_date: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
          is_active: true,
          user_id: user.id,
        },
        {
          name: 'hjk',
          email: 'hjk@example.com',
          phone: '555-0456',
          property_address: '456 Oak Avenue, Unit 2B',
          monthly_rent: 8000,
          move_in_date: Date.now() - (60 * 24 * 60 * 60 * 1000), // 60 days ago
          is_active: true,
          user_id: user.id,
        },
        {
          name: 'fqfqf',
          email: 'fqfqf@example.com',
          phone: '555-0789',
          property_address: '789 Pine Road, Suite 3C',
          monthly_rent: 3000,
          move_in_date: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
          is_active: true,
          user_id: user.id,
        },
      ]

      const { error } = await supabase
        .from('renters')
        .insert(sampleRenters)

      if (error) throw error
    } catch (error) {
      console.error('Error adding sample data:', error)
      throw new Error(`Failed to add sample data: ${error}`)
    }
  }

  // Delete renter - updated to handle ID type conversion properly
  static async deleteRenter(renterId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Convert string ID to number for database query
      const numericId = parseInt(renterId, 10)
      if (isNaN(numericId)) {
        console.error('SupabaseService: Invalid renter ID format:', renterId)
        throw new Error('Invalid renter ID format')
      }

      console.log('SupabaseService: Deleting renter with ID:', numericId, 'for user:', user.id)

      const { error } = await supabase
        .from('renters')
        .delete()
        .eq('id', numericId)
        .eq('user_id', user.id)

      if (error) {
        console.error('SupabaseService: Database error deleting renter:', error)
        throw error
      }

      console.log('SupabaseService: Successfully deleted renter from database')
    } catch (error) {
      console.error('SupabaseService: Error deleting renter:', error)
      throw new Error(`Failed to delete renter: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}