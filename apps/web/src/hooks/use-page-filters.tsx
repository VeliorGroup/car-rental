'use client'

import { useEffect } from 'react'
import { useFilterBar } from '@/components/layout/filter-bar-context'

export function usePageFilters(filters: React.ReactNode) {
  const { setPageFilters } = useFilterBar()

  useEffect(() => {
    setPageFilters(filters)
    
    // Cleanup when component unmounts
    return () => {
      setPageFilters(null)
    }
  }, [filters, setPageFilters])
}
