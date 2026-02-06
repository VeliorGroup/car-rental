'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface DateFilterContextType {
  startDate: string
  endDate: string
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  clearDates: () => void
  hasDateFilter: boolean
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined)

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const clearDates = () => {
    setStartDate('')
    setEndDate('')
  }

  const hasDateFilter = startDate !== '' || endDate !== ''

  return (
    <DateFilterContext.Provider value={{
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      clearDates,
      hasDateFilter,
    }}>
      {children}
    </DateFilterContext.Provider>
  )
}

export function useDateFilter() {
  const context = useContext(DateFilterContext)
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider')
  }
  return context
}
