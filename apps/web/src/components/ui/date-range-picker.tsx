"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, startOfWeek, startOfYear, endOfYear, endOfMonth, endOfWeek, startOfDay, endOfDay, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, startOfWeek as getWeekStart, addDays } from "date-fns"
import { it, enUS, sq } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  locale?: string
  className?: string
}

const getLocale = (locale: string) => {
  switch (locale) {
    case 'it':
      return it
    case 'sq':
      return sq
    default:
      return enUS
  }
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKDAYS_IT = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa']

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  locale = 'en',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState(new Date())
  
  const dateLocale = getLocale(locale)
  const weekdays = locale === 'it' ? WEEKDAYS_IT : WEEKDAYS
  
  const from = startDate ? new Date(startDate + 'T00:00:00') : undefined
  const to = endDate ? new Date(endDate + 'T00:00:00') : undefined

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [selecting, setSelecting] = React.useState<'start' | 'end'>('start')

  const handleDateClick = (date: Date) => {
    if (selecting === 'start') {
      // Selecting start date
      onStartDateChange(formatLocalDate(date))
      onEndDateChange('') // Clear end date
      setSelecting('end')
    } else {
      // Selecting end date
      if (from && date < from) {
        // User clicked a date before start, swap them
        onEndDateChange(formatLocalDate(from))
        onStartDateChange(formatLocalDate(date))
      } else {
        onEndDateChange(formatLocalDate(date))
      }
      setSelecting('start')
    }
  }

  // Reset selection when popover opens
  React.useEffect(() => {
    if (open && !from) {
      setSelecting('start')
    } else if (open && from && to) {
      // If both dates are set, next click will start a new selection
      setSelecting('start')
    }
  }, [open, from, to])
  
  const presets = [
    {
      label: locale === 'it' ? 'Oggi' : 'Today',
      getValue: () => {
        const today = new Date()
        return { from: today, to: today }
      }
    },
    {
      label: locale === 'it' ? 'Settimana' : 'Week',
      getValue: () => {
        const today = new Date()
        return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
      }
    },
    {
      label: locale === 'it' ? 'Mese' : 'Month',
      getValue: () => {
        const today = new Date()
        return { from: startOfMonth(today), to: endOfMonth(today) }
      }
    },
    {
      label: locale === 'it' ? 'Anno' : 'Year',
      getValue: () => {
        const today = new Date()
        return { from: startOfYear(today), to: endOfYear(today) }
      }
    },
  ]
  
  const handlePresetClick = (preset: typeof presets[0]) => {
    const { from, to } = preset.getValue()
    onStartDateChange(formatLocalDate(from))
    onEndDateChange(formatLocalDate(to))
    setOpen(false)
  }

  const formatDateRange = () => {
    if (!from) return locale === 'it' ? 'Seleziona periodo' : 'Select date range'
    
    if (from && to) {
      const sameYear = from.getFullYear() === to.getFullYear()
      const sameMonth = sameYear && from.getMonth() === to.getMonth()
      const sameDay = sameMonth && from.getDate() === to.getDate()
      
      if (sameDay) {
        return format(from, "d MMM yyyy", { locale: dateLocale })
      }
      
      if (sameMonth) {
        return `${format(from, "d", { locale: dateLocale })} - ${format(to, "d MMM yyyy", { locale: dateLocale })}`
      }
      
      if (sameYear) {
        return `${format(from, "d MMM", { locale: dateLocale })} - ${format(to, "d MMM yyyy", { locale: dateLocale })}`
      }
      
      return `${format(from, "d MMM yyyy", { locale: dateLocale })} - ${format(to, "d MMM yyyy", { locale: dateLocale })}`
    }
    
    return format(from, "d MMM yyyy", { locale: dateLocale })
  }

  // Generate calendar days for a month
  const generateMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const calendarStart = getWeekStart(monthStart, { weekStartsOn: 0 })
    
    const days = []
    let day = calendarStart
    
    while (day <= monthEnd || days.length % 7 !== 0) {
      days.push(new Date(day))
      day = addDays(day, 1)
      if (days.length > 42) break // Safety limit
    }
    
    return days
  }

  const month1 = viewMonth
  const month2 = addMonths(viewMonth, 1)
  const days1 = generateMonth(month1)
  const days2 = generateMonth(month2)

  const isInRange = (date: Date) => {
    if (!from || !to) return false
    return isWithinInterval(date, { start: from, end: to })
  }

  const isStart = (date: Date) => from && isSameDay(date, from)
  const isEnd = (date: Date) => to && isSameDay(date, to)
  const isToday = (date: Date) => isSameDay(date, new Date())

  const renderMonth = (monthDate: Date, days: Date[]) => (
    <div className="w-[196px]">
      <div className="text-center text-xs font-medium mb-2">
        {format(monthDate, "MMMM yyyy", { locale: dateLocale })}
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekdays.map((day) => (
          <div key={day} className="h-6 w-7 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {days.map((day, idx) => {
          const inCurrentMonth = isSameMonth(day, monthDate)
          const inRange = isInRange(day)
          const start = isStart(day)
          const end = isEnd(day)
          const today = isToday(day)
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => inCurrentMonth && handleDateClick(day)}
              disabled={!inCurrentMonth}
              className={cn(
                "h-7 w-7 text-xs transition-colors",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                !inCurrentMonth && "text-muted-foreground/30 cursor-default",
                inCurrentMonth && "hover:bg-accent cursor-pointer",
                inRange && !start && !end && "bg-primary/15",
                start && "bg-primary text-primary-foreground rounded-l",
                end && "bg-primary text-primary-foreground rounded-r",
                start && end && "rounded",
                today && !start && !end && "font-bold text-primary",
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "min-w-[240px] justify-between text-left font-normal group h-9",
            "bg-background border-border",
            "hover:bg-accent/50",
            "transition-all duration-200",
            !from && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span className="text-sm">{formatDateRange()}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg border bg-background" 
        align="start"
        sideOffset={4}
      >
        <div className="flex">
          {/* Presets */}
          <div className="border-r py-2 px-2 space-y-1 bg-muted/10 w-24">
            <p className="text-[9px] font-medium text-muted-foreground px-2 pb-1 uppercase">
              {locale === 'it' ? 'Rapido' : 'Quick'}
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-6 px-2 hover:bg-primary/10"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {/* Calendars */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4">
              {renderMonth(month1, days1)}
              {renderMonth(month2, days2)}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                {locale === 'it' ? 'Chiudi' : 'Close'}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                {locale === 'it' ? 'Applica' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
