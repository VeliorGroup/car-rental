"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
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

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  locale?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  showClear?: boolean
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

export function DatePicker({
  value,
  onChange,
  onClear,
  locale = 'en',
  placeholder,
  className,
  disabled = false,
  showClear = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const dateLocale = getLocale(locale)
  
  // Parse value (format: "2024-12-29")
  const date = value ? new Date(value + 'T00:00:00') : undefined
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
      setOpen(false)
    }
  }

  const formatDisplay = () => {
    if (!date) return placeholder || (locale === 'it' ? 'Seleziona data' : locale === 'sq' ? 'Zgjidh datën' : 'Select date')
    return format(date, "d MMM yyyy", { locale: dateLocale })
  }

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              "bg-background border-border",
              "hover:bg-accent/50",
              "transition-all duration-200",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            <span className="flex-1 truncate">{formatDisplay()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 shadow-xl border-border bg-background" 
          align="start"
          sideOffset={8}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            locale={dateLocale}
            className="rounded-md p-3"
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
        </PopoverContent>
      </Popover>
      {showClear && value && onClear && (
        <Button variant="ghost" size="icon" onClick={onClear} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
