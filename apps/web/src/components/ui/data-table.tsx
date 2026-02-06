'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  className?: string
  render?: (item: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  className
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((col) => (
              <th 
                key={String(col.key)} 
                className={cn(
                  "pb-3 text-left font-medium text-muted-foreground",
                  col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                  col.className
                )}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && <SortIcon columnKey={String(col.key)} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr 
              key={keyExtractor(item)}
              className={cn(
                "border-b last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td 
                  key={String(col.key)} 
                  className={cn("py-3", col.className)}
                >
                  {col.render 
                    ? col.render(item, index)
                    : String((item as Record<string, unknown>)[col.key as string] ?? '-')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
