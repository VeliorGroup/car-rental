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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { CustomerCharts } from '@/components/customers/CustomerCharts'


import { Pencil, Trash2, Eye, Plus, Search } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useFilterBar } from '@/components/layout/filter-bar-context'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  licenseExpiry: string
  status: 'ACTIVE' | 'SUSPENDED' | 'LICENSE_EXPIRED' | 'BLACKLISTED'
  category: 'STANDARD' | 'BUSINESS' | 'PREMIUM'
}

import { CustomerModal } from '@/components/customers/CustomerModal'

export default function CustomersPage() {
  const params = useParams()
  const locale = params.locale as string
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Customers')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedCustomer(null)
    setIsModalOpen(true)
  }

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
    queryKey: ['customers', page, search],
    queryFn: async () => {
      const response = await api.get('/customers', {
        params: {
          page,
          limit: 10,
          search,
        },
      })
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({
        title: tc('deleteSuccess'),
        description: tc('deleteSuccessDesc'),
      })
      setDeleteId(null)
    },
    onError: (error: any) => {
       toast({
        variant: "destructive",
        title: tc('deleteError'),
        description: error.response?.data?.message || "Failed to delete customer",
      })
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">{t('statusActive')}</Badge>
      case 'SUSPENDED':
        return <Badge variant="warning">{t('statusSuspended')}</Badge>
      case 'LICENSE_EXPIRED':
        return <Badge variant="danger">{t('statusLicenseExpired')}</Badge>
      case 'BLACKLISTED':
        return <Badge variant="destructive">{t('statusBlacklisted')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'firstName',
      header: tc('name'),
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
    },
    {
      accessorKey: 'email',
      header: t('email'),
    },
    {
      accessorKey: 'phone',
      header: t('phone'),
    },
    {
      accessorKey: 'licenseNumber',
      header: t('license'),
    },
    {
      accessorKey: 'licenseExpiry',
      header: t('expiry'),
      cell: ({ row }) => formatDate(row.original.licenseExpiry),
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
        const customer = row.original

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title={t('viewDetails')}>
              <Link href={`/${locale}/customers/${customer.id}`}>
                <Eye className="h-4 w-4 text-gray-500" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)} title={tc('edit')}>
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(customer.id)}
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
    data: data?.customers || [],
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
          {t('addCustomer')}
        </Button>
      </div>

      <CustomerCharts search={search} />

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
          disabled={!data?.customers || data.customers.length < 10 || isLoading}
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
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedCustomer} 
      />
    </div>
  )
}