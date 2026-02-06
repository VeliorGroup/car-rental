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
import { MoreHorizontal, Search, CheckCircle, DollarSign, Plus, Pencil, Eye, Trash2 } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { CautionModal } from '@/components/cautions/CautionModal'
import { useParams } from 'next/navigation'
import { CautionCharts } from '@/components/cautions/CautionCharts'
import { useDateFilter } from '@/components/layout/date-filter-context'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import { Label } from '@/components/ui/label'
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

interface Caution {
  id: string
  amount: number
  status: 'PENDING' | 'HELD' | 'RELEASED' | 'CHARGED' | 'PARTIALLY_CHARGED'
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'PAYSERA'
  heldAt: string
  releasedAt: string | null
  booking: {
    id: string
    customer: {
      firstName: string
      lastName: string
    }
    vehicle: {
      brand: string
      model: string
      licensePlate: string
    }
  }
}

export default function CautionsPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { startDate: startDateFilter, endDate: endDateFilter } = useDateFilter()
  const [actionCaution, setActionCaution] = useState<Caution | null>(null)
  const [selectedCaution, setSelectedCaution] = useState<Caution | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<'release' | 'charge' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Cautions')
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
    queryKey: ['cautions', page, search, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 10,
      }
      if (search) params.search = search
      if (startDateFilter) params.startFrom = new Date(startDateFilter).toISOString()
      if (endDateFilter) params.endTo = new Date(endDateFilter).toISOString()
      
      const response = await api.get('/cautions', { params })
      return response.data
    },
  })

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/cautions/${id}/release`, { reason: 'Released via dashboard' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cautions'] })
      queryClient.invalidateQueries({ queryKey: ['cautions-stats'] })
      toast({ title: t('releaseSuccess') })
      setActionDialog(null)
      setActionCaution(null)
    },
    onError: () => {
      toast({ title: t('releaseError'), variant: 'destructive' })
    },
  })

  const chargeMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      await api.post(`/cautions/${id}/charge`, { amount: String(amount), reason: 'Charged via dashboard' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cautions'] })
      queryClient.invalidateQueries({ queryKey: ['cautions-stats'] })
      toast({ title: t('chargeSuccess') })
      setActionDialog(null)
      setActionCaution(null)
    },
    onError: () => {
      toast({ title: t('chargeError'), variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cautions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cautions'] })
      queryClient.invalidateQueries({ queryKey: ['cautions-stats'] })
      toast({ title: tc('deleteSuccess') })
      setDeleteId(null)
    },
    onError: (error: any) => {
      toast({ title: tc('deleteError'), description: error.response?.data?.message, variant: 'destructive' })
    },
  })

  const handleEdit = (caution: Caution) => {
    setSelectedCaution(caution)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedCaution(null)
    setIsModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{t('pending')}</Badge>
      case 'HELD':
        return <Badge variant="default">{t('held')}</Badge>
      case 'RELEASED':
        return <Badge variant="secondary">{t('released')}</Badge>
      case 'FULLY_CHARGED':
        return <Badge variant="destructive">{t('charged')}</Badge>
      case 'PARTIALLY_CHARGED':
        return <Badge variant="outline">{t('partiallyCharged')}</Badge>
      case 'FAILED':
        return <Badge variant="destructive">{t('failed')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const columns: ColumnDef<Caution>[] = [
    {
      accessorKey: 'booking.customer',
      header: tc('customer'),
      cell: ({ row }) => 
        `${row.original.booking?.customer?.firstName || ''} ${row.original.booking?.customer?.lastName || ''}`,
    },
    {
      accessorKey: 'booking.vehicle',
      header: tc('vehicle'),
      cell: ({ row }) => 
        `${row.original.booking?.vehicle?.brand || ''} ${row.original.booking?.vehicle?.model || ''} (${row.original.booking?.vehicle?.licensePlate || ''})`,
    },
    {
      accessorKey: 'amount',
      header: tc('amount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'status',
      header: tc('status'),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'paymentMethod',
      header: t('paymentMethod'),
      cell: ({ row }) => {
        const method = row.original.paymentMethod
        const methodKey = method?.toLowerCase().replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase()) as 'cash' | 'bankTransfer' | 'paysera'
        return t(`paymentMethods.${methodKey}`) || method?.replace('_', ' ') || 'N/A'
      },
    },
    {
      accessorKey: 'heldAt',
      header: t('heldDate'),
      cell: ({ row }) => row.original.heldAt ? formatDate(row.original.heldAt) : '-',
    },
    {
      id: 'actions',
      header: tc('actions'),
      cell: ({ row }) => {
        const caution = row.original

        return (
          <div className="flex items-center gap-1">
            {caution.status === 'HELD' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionCaution(caution)
                    setActionDialog('release')
                  }}
                  title={t('release')}
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionCaution(caution)
                    setActionDialog('charge')
                  }}
                  title={t('charge')}
                >
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" asChild title={tc('view')}>
              <Link href={`/cautions/${caution.id}`}>
                <Eye className="h-4 w-4 text-gray-500" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(caution)} title={tc('edit')}>
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(caution.id)}
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
    data: data?.cautions || [],
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
          {t('addCaution')}
        </Button>
      </div>

      <CautionCharts startDate={startDateFilter} endDate={endDateFilter} search={search} />

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
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                       <p>{tc('noResults')}</p>
                       {!data && <p className="text-xs text-red-500 mt-2">Error loading data. Please try again.</p>}
                    </div>
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
          disabled={!data?.cautions || data.cautions.length < 10 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Release Dialog */}
      <Dialog open={actionDialog === 'release'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmRelease')}</DialogTitle>
            <DialogDescription>
              {t('releaseDescription', { amount: actionCaution ? formatCurrency(actionCaution.amount) : '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>{tc('cancel')}</Button>
            <Button 
              onClick={() => actionCaution && releaseMutation.mutate(actionCaution.id)}
              disabled={releaseMutation.isPending}
            >
              {tc('confirm')} {t('release')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge Dialog */}
      <Dialog open={actionDialog === 'charge'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmCharge')}</DialogTitle>
            <DialogDescription>
              {t('chargeDescription', { amount: actionCaution ? formatCurrency(actionCaution.amount) : '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>{tc('cancel')}</Button>
            <Button 
              variant="destructive"
              onClick={() => actionCaution && chargeMutation.mutate({ id: actionCaution.id, amount: actionCaution.amount })}
              disabled={chargeMutation.isPending}
            >
              {tc('confirm')} {t('charge')}
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

      <CautionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedCaution} 
      />
    </div>
  )
}
