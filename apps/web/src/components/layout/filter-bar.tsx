'use client'

import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useDateFilter } from './date-filter-context'
import { useFilterBar } from './filter-bar-context'
import { useParams, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Routes where the date picker should be hidden (but filter bar still shown)
const HIDDEN_DATE_PICKER_ROUTES = ['/customers', '/vehicles', '/branches', '/calendar', '/notifications', '/settings']

export function FilterBar() {
  const { startDate, endDate, setStartDate, setEndDate, clearDates, hasDateFilter } = useDateFilter()
  const { pageFilters, showFilterBar } = useFilterBar()
  const params = useParams()
  const pathname = usePathname()
  const locale = (params?.locale as string) || 'en'
  
  // Check if current route should hide the date picker
  const shouldHideDatePicker = HIDDEN_DATE_PICKER_ROUTES.some(route => pathname?.includes(route))

  if (!showFilterBar) return null

  return (
    <div className="flex items-center gap-3">
      {/* Page-specific filters */}
      {pageFilters && (
        <div className="flex items-center gap-2">
          {pageFilters}
        </div>
      )}
      
      {/* Date picker section - only show if not hidden for this route */}
      {!shouldHideDatePicker && (
        <div className="flex items-center gap-2">
          {/* Global Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            locale={locale}
          />
          
          {/* Clear all filters button */}
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDates}
              className="h-9 px-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

