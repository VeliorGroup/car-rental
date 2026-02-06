'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface FilterBarContextType {
  // Page-specific filters rendered as ReactNode
  pageFilters: ReactNode | null
  setPageFilters: (filters: ReactNode | null) => void
  // Whether to show the filter bar
  showFilterBar: boolean
  setShowFilterBar: (show: boolean) => void
}

const FilterBarContext = createContext<FilterBarContextType | undefined>(undefined)

export function FilterBarProvider({ children }: { children: ReactNode }) {
  const [pageFilters, setPageFilters] = useState<ReactNode | null>(null)
  const [showFilterBar, setShowFilterBar] = useState(true)

  return (
    <FilterBarContext.Provider value={{
      pageFilters,
      setPageFilters,
      showFilterBar,
      setShowFilterBar,
    }}>
      {children}
    </FilterBarContext.Provider>
  )
}

export function useFilterBar() {
  const context = useContext(FilterBarContext)
  if (context === undefined) {
    throw new Error('useFilterBar must be used within a FilterBarProvider')
  }
  return context
}
