'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Wrench, CheckCircle2, Plus, Clock, Search, MoreHorizontal, Pencil, Eye, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { MaintenanceModal } from '@/components/maintenance/MaintenanceModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Maintenance {
  id: string
  title: string
  type: 'ROUTINE' | 'REPAIR' | 'INSPECTION' | 'TIRE_CHANGE' | 'OIL_CHANGE' | 'OTHER'
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  description: string | null
  scheduledFor: string | null
  completedAt: string | null
  cost: number | null
  vehicle: {
    id: string
    brand: string
    model: string
    licensePlate: string
  }
}

interface MaintenanceStats {
  scheduled: number
  inProgress: number
  completed: number
  totalCost: number
}

import { MaintenanceCharts } from '@/components/maintenance/MaintenanceCharts'
import { useParams } from 'next/navigation'
import { useDateFilter } from '@/components/layout/date-filter-context'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import { Label } from '@/components/ui/label'

export default function MaintenancePage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { startDate: startDateFilter, endDate: endDateFilter } = useDateFilter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Maintenance')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  // Register filters in the filter bar
  useEffect(() => {
    setPageFilters(
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8 h-9 w-[200px]"
        />
      </div>
    )
    return () => setPageFilters(null)
  }, [search, setPageFilters, t])

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedMaintenance(null)
    setIsModalOpen(true)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', page, search, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 10,
      }
      if (search) params.search = search
      if (startDateFilter) params.startFrom = new Date(startDateFilter).toISOString()
      if (endDateFilter) params.endTo = new Date(endDateFilter).toISOString()
      
      const response = await api.get('/maintenance', { params })
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/maintenance/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: tc('deleteSuccess') })
      setDeleteId(null)
    },
    onError: (error: any) => {
      toast({ title: tc('deleteError'), description: error.response?.data?.message, variant: 'destructive' })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="neutral">{t('pending')}</Badge>
      case 'SCHEDULED':
        return <Badge variant="info">{t('scheduled')}</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="busy">{t('inProgress')}</Badge>
      case 'COMPLETED':
        return <Badge variant="success">{t('completed')}</Badge>
      case 'CANCELLED':
        return <Badge variant="danger">{t('cancelled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="neutral">{t('priorityLow')}</Badge>
      case 'MEDIUM':
        return <Badge variant="info">{t('priorityMedium')}</Badge>
      case 'HIGH':
        return <Badge variant="warning">{t('priorityHigh')}</Badge>
      case 'URGENT':
        return <Badge variant="danger">{t('priorityUrgent')}</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const columns: ColumnDef<Maintenance>[] = [
    {
      accessorKey: 'vehicle',
      header: tc('vehicle'),
      cell: ({ row }) => 
        `${row.original.vehicle?.brand || ''} ${row.original.vehicle?.model || ''} (${row.original.vehicle?.licensePlate || ''})`,
    },
    {
      accessorKey: 'title',
      header: t('titleColumn'),
    },
    {
      accessorKey: 'type',
      header: t('type'),
      cell: ({ row }) => {
        const type = row.original.type
        const typeKey = type?.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as 'routine' | 'repair' | 'inspection' | 'tireChange' | 'oilChange' | 'other'
        return t(`types.${typeKey}`) || type?.replace('_', ' ') || '-'
      },
    },
    {
      accessorKey: 'status',
      header: tc('status'),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'priority',
      header: t('priorityLabel'),
      cell: ({ row }) => getPriorityBadge(row.original.priority),
    },
    {
      accessorKey: 'scheduledFor',
      header: t('scheduledFor'),
      cell: ({ row }) => row.original.scheduledFor ? formatDate(row.original.scheduledFor) : '-',
    },
    {
      id: 'actions',
      header: tc('actions'),
      cell: ({ row }) => {
        const maintenance = row.original

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title={tc('view')}>
              <Link href={`/maintenance/${maintenance.id}`}>
                <Eye className="h-4 w-4 text-gray-500" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(maintenance)} title={tc('edit')}>
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(maintenance.id)}
              title={tc('delete')}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: data?.maintenances || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / 10),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addMaintenance')}
        </Button>
      </div>

      <MaintenanceCharts startDate={startDateFilter} endDate={endDateFilter} search={search} />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader />
                    </div>
                  ) : (
                    tc('noResults')
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          {tc('previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.maintenance || data.maintenance.length < 10 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tc('deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MaintenanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedMaintenance} 
      />
    </div>
  )
}
