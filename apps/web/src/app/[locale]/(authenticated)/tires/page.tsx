'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useDateFilter } from '@/components/layout/date-filter-context'
import { useFilterBar } from '@/components/layout/filter-bar-context'
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
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Plus, Search, Pencil, Trash2, Warehouse } from 'lucide-react'
import api from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { TireModal } from '@/components/tires/TireModal'
import { TireCharts } from '@/components/tires/TireCharts'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Tire {
  id: string
  brand: string
  model: string
  size: string
  position: string
  season: string
  mountDate: string
  mountKm: number
  currentKm: number
  cost: number
  location: string | null
  notes: string | null
  vehicleId: string | null
  vehicle: {
    id: string
    brand: string
    model: string
    licensePlate: string
  } | null
}

interface Vehicle {
  id: string
  brand: string
  model: string
  licensePlate: string
}

export default function TiresPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const searchParams = useSearchParams()
  const preselectedVehicleId = searchParams.get('vehicleId')
  const { startDate: startDateFilter, endDate: endDateFilter } = useDateFilter()
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [storeDialogOpen, setStoreDialogOpen] = useState(false)
  const [storeTireId, setStoreTireId] = useState<string | null>(null)
  const [storeLocation, setStoreLocation] = useState('')
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(!!preselectedVehicleId)
  
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Tires')
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

  // Fetch tires list
  const { data, isLoading } = useQuery({
    queryKey: ['tires', page, search, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = { page, limit: 10 }
      if (search) params.brand = search
      if (startDateFilter) params.startFrom = new Date(startDateFilter).toISOString()
      if (endDateFilter) params.endTo = new Date(endDateFilter).toISOString()
      
      const response = await api.get('/tires', { params })
      return response.data
    },
  })

  // Fetch vehicles for dropdown
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-simple'],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { limit: 100 } })
      return response.data.vehicles || response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tires/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tires'] })
      queryClient.invalidateQueries({ queryKey: ['tires-stats'] })
      toast({ title: tc('deleteSuccess') })
      setDeleteId(null)
    },
    onError: (error: any) => {
      toast({ title: tc('deleteError'), description: error.response?.data?.message, variant: 'destructive' })
    },
  })

  const storeMutation = useMutation({
    mutationFn: async ({ id, location }: { id: string; location: string }) => {
      await api.post(`/tires/${id}/store`, { location })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tires'] })
      queryClient.invalidateQueries({ queryKey: ['tires-stats'] })
      toast({ title: t('storeSuccess') })
      setStoreDialogOpen(false)
      setStoreTireId(null)
      setStoreLocation('')
    },
    onError: (error: any) => {
      toast({ title: t('storeError'), description: error.response?.data?.message, variant: 'destructive' })
    },
  })

  const handleAdd = () => {
    setSelectedTire(null)
    setIsModalOpen(true)
  }

  const handleEdit = (tire: Tire) => {
    setSelectedTire(tire)
    setIsModalOpen(true)
  }

  const getSeasonBadge = (season: string) => {
    switch (season) {
      case 'SUMMER':
        return <Badge variant="warning">{t('seasons.summer')}</Badge>
      case 'WINTER':
        return <Badge variant="info">{t('seasons.winter')}</Badge>
      case 'ALL_SEASON':
        return <Badge variant="neutral">{t('seasons.allSeason')}</Badge>
      default:
        return <Badge variant="outline">{season}</Badge>
    }
  }

  const getPositionLabel = (position: string) => {
    const key = position.toLowerCase() as 'fl' | 'fr' | 'rl' | 'rr' | 'spare'
    return t(`positions.${key}`) || position
  }

  const columns: ColumnDef<Tire>[] = [
    {
      accessorKey: 'vehicle',
      header: tc('vehicle'),
      cell: ({ row }) => 
        row.original.vehicle 
          ? `${row.original.vehicle.brand} ${row.original.vehicle.model} (${row.original.vehicle.licensePlate})`
          : <Badge variant="outline">{t('status.stored')}</Badge>,
    },
    {
      accessorKey: 'brand',
      header: t('brand'),
      cell: ({ row }) => `${row.original.brand} ${row.original.model}`,
    },
    {
      accessorKey: 'size',
      header: t('size'),
    },
    {
      accessorKey: 'position',
      header: t('position'),
      cell: ({ row }) => getPositionLabel(row.original.position),
    },
    {
      accessorKey: 'season',
      header: t('season'),
      cell: ({ row }) => getSeasonBadge(row.original.season),
    },
    {
      accessorKey: 'mountDate',
      header: t('mountDate'),
      cell: ({ row }) => formatDate(row.original.mountDate),
    },
    {
      accessorKey: 'mountKm',
      header: t('mountKm'),
      cell: ({ row }) => `${row.original.mountKm.toLocaleString()} km`,
    },
    {
      id: 'actions',
      header: tc('actions'),
      cell: ({ row }) => {
        const tire = row.original

        return (
          <div className="flex items-center gap-1">
            {tire.vehicleId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStoreTireId(tire.id)
                  setStoreDialogOpen(true)
                }}
                title={t('storeTire')}
              >
                <Warehouse className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(tire)}
              title={tc('edit')}
            >
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(tire.id)}
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
    data: data?.tires || [],
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
          {t('addTire')}
        </Button>
      </div>

      {/* Stats Cards */}
      <TireCharts 
        startDate={startDateFilter} 
        endDate={endDateFilter} 
        search={search}
      />

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
          disabled={!data?.tires || data.tires.length < 10 || isLoading}
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

      {/* Store Tire Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('storeTire')}</DialogTitle>
            <DialogDescription>{t('storeTireDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('warehouseLocation')}</Label>
              <Input
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="e.g., Shelf A1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button 
              onClick={() => storeTireId && storeMutation.mutate({ id: storeTireId, location: storeLocation })}
              disabled={!storeLocation}
            >
              {tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TireModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedTire} 
      />
    </div>
  )
}
