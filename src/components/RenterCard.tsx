'use client'

import { useState, useRef } from 'react'
import { User, MapPin, Calendar, IndianRupee, Trash2, Archive, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { Renter } from '@/types'
import { formatIndianCurrency } from '@/utils/formatters'
import RenterProfile from './RenterProfile'

interface RenterCardProps {
  renter: Renter
  onArchive?: (renterId: string) => void
  onDelete?: (renterId: string) => void
}

export default function RenterCard({ renter, onArchive, onDelete }: RenterCardProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Handle mouse/touch start (for long press detection)
  const handlePointerDown = () => {
    const timer = setTimeout(() => {
      setShowContextMenu(true)
    }, 500) // 500ms long press
    setLongPressTimer(timer)
  }

  // Handle mouse/touch end (cancel long press if released early)
  const handlePointerUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Handle mouse leave (cancel long press if mouse leaves card)
  const handlePointerLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Handle normal click (show profile)
  const handleClick = () => {
    if (!showContextMenu) {
      setShowProfile(true)
    }
  }

  // Handle archive action
  const handleArchive = () => {
    if (onArchive && renter.id) {
      onArchive(renter.id.toString())
    }
    setShowContextMenu(false)
  }

  // Handle delete action
  const handleDelete = () => {
    if (onDelete && renter.id) {
      onDelete(renter.id.toString())
    }
    setShowContextMenu(false)
  }

  return (
    <>
      <div className="relative">
        <div
          ref={cardRef}
          onClick={handleClick}
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-200 group relative"
        >
          {/* Top Section - Renter Info */}
          <div className="flex items-start space-x-4 mb-6">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <User className="h-6 w-6 text-white" />
            </div>

            {/* Renter Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 font-poppins mb-2 truncate">
                {renter.name}
              </h3>

              {/* Address - Small & Italic */}
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="italic truncate">
                  {renter.property_address !== 'N/A' ? renter.property_address : 'Address not provided'}
                </span>
              </div>

              {/* Move-in Date - Small & Italic */}
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="italic">
                  Moved in: {format(new Date(renter.move_in_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section - Horizontal Stats */}
          <div className="grid grid-cols-3 gap-4">
            {/* Monthly Rent */}
            <StatCard
              label="MONTHLY RENT"
              value={formatIndianCurrency(renter.monthly_rent)}
              bgColor="bg-green-50"
              textColor="text-green-700"
              labelColor="text-green-600"
            />

            {/* Pending Amount */}
            <StatCard
              label="PENDING"
              value="₹ 0"
              bgColor="bg-gray-50"
              textColor="text-gray-700"
              labelColor="text-gray-600"
            />

            {/* Status */}
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">
                STATUS
              </p>
              <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-orange-200 text-orange-800 rounded-lg">
                Due Today
              </span>
            </div>
          </div>

          {/* Hover Indicator */}
          <div className="mt-4 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-blue-600 font-semibold text-center">
              Tap to manage bills and payments →
            </p>
          </div>

          {/* Long Press Hint */}
          <div className="absolute bottom-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <MoreVertical className="h-3 w-3" />
              <span>Hold</span>
            </div>
          </div>
        </div>

        {/* Context Menu for Long Press */}
        {showContextMenu && (
          <div className="absolute top-2 right-2 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px]">
            <button
              onClick={handleArchive}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {showProfile && (
        <RenterProfile
          renter={renter}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  )
}

// Reusable Stat Card Component
interface StatCardProps {
  label: string
  value: string
  bgColor: string
  textColor: string
  labelColor: string
}

function StatCard({ label, value, bgColor, textColor, labelColor }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4 text-center`}>
      <p className={`text-xs font-bold ${labelColor} uppercase tracking-wide mb-2`}>
        {label}
      </p>
      <p className={`text-base font-bold ${textColor} font-poppins`}>
        {value}
      </p>
    </div>
  )
}