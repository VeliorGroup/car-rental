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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MoreHorizontal, Search, AlertTriangle, CheckCircle, Clock, AlertCircle, Plus, Pencil, Eye, Trash2 } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { DamageModal } from '@/components/damages/DamageModal'
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

interface Damage {
  id: string
  description: string
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'TOTAL_LOSS'
  status: 'REPORTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISPUTED' | 'RESOLVED' | 'CHARGED'
  estimatedCost: number | null
  actualCost: number | null
  createdAt: string
  disputed: boolean
  disputeReason: string | null
  booking: {
    id: string
    customer: {
      firstName: string
      lastName: string
    }
  }
  vehicle: {
    brand: string
    model: string
    licensePlate: string
  }
}

interface DamageStats {
  total: number
  pending: number
  disputed: number
  resolved: number
  totalCost: number
}

import { DamageCharts } from '@/components/damages/DamageCharts'
import { useParams } from 'next/navigation'
import { useDateFilter } from '@/components/layout/date-filter-context'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import { Label } from '@/components/ui/label'

export default function DamagesPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { startDate: startDateFilter, endDate: endDateFilter } = useDateFilter()
  const [selectedDamage, setSelectedDamage] = useState<Damage | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [disputeDialog, setDisputeDialog] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Damages')
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

  const { data, isLoading } = useQuery({
    queryKey: ['damages', page, search, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 10,
      }
      if (search) params.search = search
      if (startDateFilter) params.startFrom = new Date(startDateFilter).toISOString()
      if (endDateFilter) params.endTo = new Date(endDateFilter).toISOString()
      
      const response = await api.get('/damages', { params })
      return response.data
    },
  })

  const disputeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/damages/${id}/dispute`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damages'] })
      queryClient.invalidateQueries({ queryKey: ['damages-stats-summary'] })
      toast({ title: t('disputeSuccess') })
      setDisputeDialog(false)
      setSelectedDamage(null)
      setDisputeReason('')
    },
    onError: () => {
      toast({ title: t('disputeError'), variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/damages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damages'] })
      queryClient.invalidateQueries({ queryKey: ['damages-stats-summary'] })
      toast({ title: tc('deleteSuccess') })
      setDeleteId(null)
    },
    onError: (error: any) => {
      toast({ title: tc('deleteError'), description: error.response?.data?.message, variant: 'destructive' })
    },
  })

  const handleEdit = (damage: Damage) => {
    setSelectedDamage(damage)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedDamage(null)
    setIsModalOpen(true)
  }

  // ... helpers ...

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'MINOR':
        return <Badge variant="neutral">{t('severity.minor')}</Badge>
      case 'MODERATE':
        return <Badge variant="warning">{t('severity.moderate')}</Badge>
      case 'SEVERE':
        return <Badge variant="danger">{t('severity.severe')}</Badge>
      case 'TOTAL_LOSS':
        return <Badge variant="destructive">{t('severity.totalLoss')}</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return <Badge variant="info">{t('status.reported')}</Badge>
      case 'ASSESSED':
        return <Badge variant="pending">{t('status.assessed')}</Badge>
      case 'REPAIRED':
        return <Badge variant="success">{t('status.repaired')}</Badge>
      case 'DISPUTED':
        return <Badge variant="warning">{t('status.disputed')}</Badge>
      case 'RESOLVED':
        return <Badge variant="success">{t('status.resolved')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const columns: ColumnDef<Damage>[] = [
    {
      accessorKey: 'vehicle',
      header: tc('vehicle'),
      cell: ({ row }) => 
        `${row.original.vehicle?.brand || ''} ${row.original.vehicle?.model || ''} (${row.original.vehicle?.licensePlate || ''})`,
    },
    {
      accessorKey: 'booking.customer',
      header: tc('customer'),
      cell: ({ row }) => 
        `${row.original.booking?.customer?.firstName || ''} ${row.original.booking?.customer?.lastName || ''}`,
    },
    {
      accessorKey: 'description',
      header: tc('description'),
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: 'severity',
      header: t('severity.severity'),
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: 'status',
      header: tc('status'),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'estimatedCost',
      header: t('estimatedCost'),
      cell: ({ row }) => row.original.estimatedCost ? formatCurrency(row.original.estimatedCost) : '-',
    },
    {
      accessorKey: 'createdAt',
      header: t('reported'),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: tc('actions'),
      cell: ({ row }) => {
        const damage = row.original

        return (
          <div className="flex items-center gap-1">
            {!damage.disputed && damage.status !== 'RESOLVED' && damage.status !== 'CHARGED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDamage(damage)
                  setDisputeDialog(true)
                }}
                title={t('dispute')}
              >
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild title={tc('view')}>
              <Link href={`/damages/${damage.id}`}>
                <Eye className="h-4 w-4 text-gray-500" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(damage)} title={tc('edit')}>
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(damage.id)}
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
    data: data?.damages || [],
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
          {t('addDamage')}
        </Button>
      </div>

      <DamageCharts startDate={startDateFilter} endDate={endDateFilter} search={search} />

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
          disabled={!data?.damages || data.damages.length < 10 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disputeTitle')}</DialogTitle>
            <DialogDescription>
              {t('disputeDescription')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('disputePlaceholder')}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialog(false)}>{tc('cancel')}</Button>
            <Button 
              onClick={() => selectedDamage && disputeMutation.mutate({ id: selectedDamage.id, reason: disputeReason })}
              disabled={disputeMutation.isPending || !disputeReason.trim()}
            >
              {t('submitDispute')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <DamageModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedDamage} 
      />
    </div>
  )
}
