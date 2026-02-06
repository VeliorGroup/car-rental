'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { BookingCharts } from '@/components/bookings/BookingCharts'
import { Eye, LogIn, LogOut, Plus, Calendar as CalendarIcon, Trash2, X, Pencil, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDateFilter } from '@/components/layout/date-filter-context'
import { useFilterBar } from '@/components/layout/filter-bar-context'
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
import api from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { BookingModal } from '@/components/bookings/BookingModal'
import { useToast } from '@/hooks/use-toast'

interface Booking {
  id: string
  customer: {
    firstName: string
    lastName: string
    email: string
  }
  vehicle: {
    licensePlate: string
    brand: string
    model: string
  }
  startDate: string
  endDate: string
  status: 'CONFIRMED' | 'CHECKED_OUT' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW'
  totalAmount: number
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  status: string
}

export default function BookingsPage() {
  const params = useParams()
  const locale = params.locale as string
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const { startDate: startDateFilter, endDate: endDateFilter } = useDateFilter()
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Bookings')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  // Register filters in the filter bar
  useEffect(() => {
    setPageFilters(
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder') || 'Search...'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8 h-9 w-[200px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder={tc('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="CONFIRMED">{t('statusConfirmed')}</SelectItem>
            <SelectItem value="CHECKED_OUT">{t('statusCheckedOut')}</SelectItem>
            <SelectItem value="CHECKED_IN">{t('statusCheckedIn')}</SelectItem>
            <SelectItem value="CANCELLED">{t('statusCancelled')}</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
    return () => setPageFilters(null)
  }, [statusFilter, search, setPageFilters, t, tc])

  const handleEdit = (booking: any) => {
    setSelectedBooking(booking)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedBooking(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', page, statusFilter, search, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 10,
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search) params.search = search
      if (startDateFilter) params.startFrom = new Date(startDateFilter).toISOString()
      if (endDateFilter) params.startTo = new Date(endDateFilter).toISOString()

      const response = await api.get('/bookings', { params })
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bookings/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({
        title: tc('deleteSuccess'),
        description: tc('deleteSuccess'),
      })
      setDeleteId(null)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: tc('deleteError'),
        description: error.response?.data?.message || "Failed to delete booking",
      })
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="info">{t('statusConfirmed')}</Badge>
      case 'CHECKED_OUT':
        return <Badge variant="active">{t('statusCheckedOut')}</Badge>
      case 'CHECKED_IN':
        return <Badge variant="success">{t('statusCheckedIn')}</Badge>
      case 'CANCELLED':
        return <Badge variant="danger">{t('statusCancelled')}</Badge>
      case 'NO_SHOW':
        return <Badge variant="warning">{t('statusNoShow')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }



  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: 'customer',
      header: tc('customer'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customer.firstName} {row.original.customer.lastName}</div>
          <div className="text-xs text-muted-foreground">{row.original.customer.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'vehicle',
      header: tc('vehicle'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.vehicle.brand} {row.original.vehicle.model}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.vehicle.licensePlate}</div>
        </div>
      ),
    },
    {
      accessorKey: 'startDate',
      header: t('dates'),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{formatDate(row.original.startDate)}</div>
          <div className="text-muted-foreground">{t('to')} {formatDate(row.original.endDate)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: t('amount'),
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      accessorKey: 'status',
      header: tc('status'),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: tc('actions'),
      cell: ({ row }) => {
        const booking = row.original

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title={t('viewDetails')}>
              <Link href={`/${locale}/bookings/${booking.id}`}>
                <Eye className="h-4 w-4 text-gray-500" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(booking)} title={tc('edit')}>
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            {booking.status === 'CONFIRMED' && (
              <Button variant="ghost" size="sm" asChild title={t('checkout')}>
                <Link href={`/${locale}/bookings/${booking.id}/checkout`}>
                  <LogOut className="h-4 w-4 text-green-600" />
                </Link>
              </Button>
            )}
            {booking.status === 'CHECKED_OUT' && (
              <Button variant="ghost" size="sm" asChild title={t('checkin')}>
                <Link href={`/${locale}/bookings/${booking.id}/checkin`}>
                  <LogIn className="h-4 w-4 text-blue-600" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(booking.id)}
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
    data: data?.bookings || [],
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
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('newBooking')}
        </Button>
      </div>

      <BookingCharts startDate={startDateFilter} endDate={endDateFilter} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
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
          disabled={!data?.bookings || data.bookings.length < 10 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

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
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId)
              }}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => {
            setIsModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
        }} 
        initialData={selectedBooking}
        bookingId={selectedBooking?.id}
        mode={modalMode}
      />
    </div>
  )
}