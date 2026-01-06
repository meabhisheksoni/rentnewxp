import { ApiService } from '@/services/apiService'
import { performanceMonitor } from './performanceMonitor'

export interface MonthData {
  rentAmount: number
  electricityEnabled: boolean
  electricityData: {
    initialReading: number
    finalReading: number
    multiplier: number
    readingDate: Date
  }
  motorEnabled: boolean
  motorData: {
    initialReading: number
    finalReading: number
    multiplier: number
    numberOfPeople: number
    readingDate: Date
  }
  waterEnabled: boolean
  waterAmount: number
  maintenanceEnabled: boolean
  maintenanceAmount: number
  additionalExpenses: Array<{
    id?: string
    description: string
    amount: number
    date: Date
  }>
  payments: Array<{
    id?: string
    amount: number
    date: Date
    type: 'cash' | 'online'
    note?: string
  }>
}

interface CacheEntry {
  data: MonthData
  timestamp: number
  isStale: boolean
}

export class BillCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL = 15 * 60 * 1000 // 15 minutes (increased for better performance)

  /**
   * Generate cache key based on renter ID, month, and year
   */
  getCacheKey(renterId: number, month: number, year: number): string {
    return `${renterId}-${year}-${month}`
  }

  /**
   * Get cached data for a specific month
   * Returns null if not cached
   * Marks entry as stale if TTL expired but still returns it
   */
  get(renterId: number, month: number, year: number): MonthData | null {
    const key = this.getCacheKey(renterId, month, year)
    const entry = this.cache.get(key)

    if (!entry) {
      performanceMonitor.recordCacheMiss()
      return null
    }

    performanceMonitor.recordCacheHit()

    // Mark as stale if expired but still return it
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      entry.isStale = true
    }

    return entry.data
  }

  /**
   * Check if cached data is stale (older than TTL)
   */
  isStale(renterId: number, month: number, year: number): boolean {
    const key = this.getCacheKey(renterId, month, year)
    const entry = this.cache.get(key)

    if (!entry) return false

    return Date.now() - entry.timestamp > this.CACHE_TTL
  }

  /**
   * Set cached data for a specific month
   */
  set(renterId: number, month: number, year: number, data: MonthData): void {
    const key = this.getCacheKey(renterId, month, year)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false
    })
  }

  /**
   * Invalidate (remove) cached data for a specific month
   */
  invalidate(renterId: number, month: number, year: number): void {
    const key = this.getCacheKey(renterId, month, year)
    this.cache.delete(key)
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Preload adjacent months in background without blocking UI
   */
  /**
   * Preload adjacent months in background without blocking UI
   */
  async preload(
    renterId: number,
    month: number,
    year: number,
    monthlyRent: number
  ): Promise<void> {
    // Calculate previous month
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    // Calculate next month
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    // Load in background without blocking
    Promise.all([
      this.loadIfNotCached(renterId, prevMonth, prevYear, monthlyRent),
      this.loadIfNotCached(renterId, nextMonth, nextYear, monthlyRent)
    ]).catch(err => console.error('Preload failed:', err))
  }

  /**
   * Populate cache from bulk data
   */
  populateFromBulk(renterId: number, bulkData: any[]): void {
    bulkData.forEach(({ bill, expenses, payments }) => {
      if (bill) {
        const billData = this.mapToMonthData(bill, expenses, payments)
        this.set(renterId, bill.month, bill.year, billData)
      }
    })
  }

  private mapToMonthData(bill: any, expenses: any[], payments: any[]): MonthData {
    return {
      rentAmount: bill.rent_amount,
      electricityEnabled: bill.electricity_enabled,
      electricityData: {
        initialReading: bill.electricity_initial_reading || 0,
        finalReading: bill.electricity_final_reading || 0,
        multiplier: bill.electricity_multiplier || 9,
        readingDate: bill.electricity_reading_date
          ? new Date(bill.electricity_reading_date)
          : new Date()
      },
      motorEnabled: bill.motor_enabled,
      motorData: {
        initialReading: bill.motor_initial_reading || 0,
        finalReading: bill.motor_final_reading || 0,
        multiplier: bill.motor_multiplier || 9,
        numberOfPeople: bill.motor_number_of_people || 2,
        readingDate: bill.motor_reading_date
          ? new Date(bill.motor_reading_date)
          : new Date()
      },
      waterEnabled: bill.water_enabled,
      waterAmount: bill.water_amount,
      maintenanceEnabled: bill.maintenance_enabled,
      maintenanceAmount: bill.maintenance_amount,
      additionalExpenses: expenses.map(exp => ({
        id: exp.id!,
        description: exp.description,
        amount: exp.amount,
        date: new Date(exp.date)
      })),
      payments: payments.map(payment => ({
        id: payment.id!,
        amount: payment.amount,
        date: new Date(payment.payment_date),
        type: payment.payment_type,
        note: payment.note
      }))
    }
  }

  /**
   * Load month data from database if not already cached
   */
  private async loadIfNotCached(
    renterId: number,
    month: number,
    year: number,
    monthlyRent: number
  ): Promise<void> {
    // Skip if already cached
    if (this.get(renterId, month, year)) {
      return
    }

    try {
      // Try to load existing bill for this month
      const { bill: existingBill, expenses, payments: billPayments, previous_readings } = await ApiService.getBillWithDetails(renterId, month, year)

      let billData: MonthData

      if (existingBill) {
        billData = this.mapToMonthData(existingBill, expenses, billPayments)
      } else {
        // Create fresh bill with carry-forward readings
        billData = {
          rentAmount: monthlyRent,
          electricityEnabled: false,
          electricityData: {
            initialReading: previous_readings.electricity_final,
            finalReading: previous_readings.electricity_final,
            multiplier: 9,
            readingDate: new Date()
          },
          motorEnabled: false,
          motorData: {
            initialReading: previous_readings.motor_final,
            finalReading: previous_readings.motor_final,
            multiplier: 9,
            numberOfPeople: 2,
            readingDate: new Date()
          },
          waterEnabled: false,
          waterAmount: 0,
          maintenanceEnabled: false,
          maintenanceAmount: 0,
          additionalExpenses: [],
          payments: []
        }
      }

      // Cache the loaded data
      this.set(renterId, month, year, billData)
    } catch (error) {
      console.error('Error loading month data for cache:', error)
      // Don't cache failed requests
    }
  }
}

// Export singleton instance
export const billCache = new BillCache()
