"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { it, enUS, sq } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  locale?: string
  placeholder?: string
  className?: string
  disabled?: boolean
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

export function DateTimePicker({
  value,
  onChange,
  locale = 'en',
  placeholder,
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const dateLocale = getLocale(locale)
  
  // Parse value (format: "2024-12-29T10:00")
  const parseValue = (val: string) => {
    if (!val) return { date: undefined, time: "10:00" }
    const [datePart, timePart] = val.split('T')
    return {
      date: datePart ? new Date(datePart + 'T00:00:00') : undefined,
      time: timePart || "10:00"
    }
  }
  
  const { date, time } = parseValue(value)
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const newValue = `${year}-${month}-${day}T${time}`
      onChange(newValue)
    }
  }
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const newValue = `${year}-${month}-${day}T${newTime}`
      onChange(newValue)
    } else {
      // If no date selected, use today
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const newValue = `${year}-${month}-${day}T${newTime}`
      onChange(newValue)
    }
  }

  const formatDisplay = () => {
    if (!date) return placeholder || (locale === 'it' ? 'Seleziona data e ora' : locale === 'sq' ? 'Zgjidh datën dhe orën' : 'Select date & time')
    
    const formattedDate = format(date, "d MMM yyyy", { locale: dateLocale })
    return `${formattedDate}, ${time}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            "bg-background border-border",
            "hover:bg-accent/50",
            "transition-all duration-200",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-xl border-border bg-background" 
        align="start"
        sideOffset={8}
      >
        <div className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            locale={dateLocale}
            className="rounded-md"
            classNames={{
              months: "flex flex-col",
              month: "space-y-3",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-1",
              cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
          />
          
          {/* Time Picker */}
          <div className="border-t border-border mt-3 pt-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {locale === 'it' ? 'Ora' : locale === 'sq' ? 'Ora' : 'Time'}
              </span>
              <Input
                type="time"
                value={time}
                onChange={handleTimeChange}
                className="flex-1 h-9"
              />
            </div>
          </div>
          
          {/* Confirm Button */}
          <div className="flex justify-end mt-3 pt-3 border-t border-border">
            <Button
              size="sm"
              onClick={() => setOpen(false)}
            >
              {locale === 'it' ? 'Conferma' : locale === 'sq' ? 'Konfirmo' : 'Confirm'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
