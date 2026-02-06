'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Plus, Search, Car, Fuel, Gauge, MapPin, Settings, Pencil, Wrench, Eye, Trash2, X } from 'lucide-react'
import { PiCarProfile } from 'react-icons/pi'
import api from '@/lib/api'
import Link from 'next/link'
import { VehicleCharts } from '@/components/vehicles/VehicleCharts'
import { useFilterBar } from '@/components/layout/filter-bar-context'

import { VehicleModal } from '@/components/vehicles/VehicleModal'

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  category: string
  status: 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'OUT_OF_SERVICE' | 'MAINTENANCE'
  location: string
  currentKm: number
  fuelType: string
  transmission: string
  imageKey?: string
  branchId?: string | null
  color?: string
  purchasePrice?: number | string
  purchaseDate?: string
  insuranceExpiry?: string
  reviewDate?: string
  seatCount?: number
  doorCount?: number
}

const VEHICLE_CATEGORIES = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'COMPACT', label: 'Compact' },
  { value: 'MIDSIZE', label: 'Midsize' },
  { value: 'SUV', label: 'SUV' },
  { value: 'LUXURY', label: 'Luxury' },
  { value: 'VAN', label: 'Van' },
]

export default function VehiclesPage() {
  const params = useParams()
  const locale = params.locale as string
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  
  const t = useTranslations('Vehicles')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedVehicle(null)
    setIsModalOpen(true)
  }

  // Register filters in the filter bar
  useEffect(() => {
    setPageFilters(
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8 h-9 w-[180px]"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCategories')}</SelectItem>
            {VEHICLE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={tc('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="AVAILABLE">{t('statusAvailable')}</SelectItem>
            <SelectItem value="RENTED">{t('statusRented')}</SelectItem>
            <SelectItem value="RESERVED">{t('statusReserved')}</SelectItem>
            <SelectItem value="MAINTENANCE">{t('statusMaintenance')}</SelectItem>
            <SelectItem value="OUT_OF_SERVICE">{t('statusOutOfService')}</SelectItem>
          </SelectContent>
        </Select>
        {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); }}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
    return () => setPageFilters(null)
  }, [search, categoryFilter, statusFilter, setPageFilters, t, tc])

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, search, categoryFilter, statusFilter],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 12,
        search,
      }
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await api.get('/vehicles', { params })
      return response.data
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">{t('statusAvailable')}</Badge>
      case 'RENTED':
        return <Badge variant="active">{t('statusRented')}</Badge>
      case 'RESERVED':
        return <Badge variant="info">{t('statusReserved')}</Badge>
      case 'MAINTENANCE':
        return <Badge variant="pending">{t('statusMaintenance')}</Badge>
      case 'OUT_OF_SERVICE':
        return <Badge variant="danger">{t('statusOutOfService')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    // All categories use the same gray style
    return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('addVehicle')}
        </Button>
      </div>

      <VehicleCharts search={search} category={categoryFilter} status={statusFilter} />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : data?.vehicles?.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.vehicles.map((vehicle: Vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative h-40 bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-900/30 dark:to-cyan-900/20 flex items-center justify-center">
                  <PiCarProfile className="h-20 w-20 text-cyan-300 dark:text-cyan-700" />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(vehicle.status)}
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(vehicle.category)}`}>
                      {vehicle.category}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                  <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                      {vehicle.licensePlate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{vehicle.location || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span>{vehicle.currentKm.toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Fuel className="h-4 w-4" />
                      <span>{vehicle.fuelType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      <span>{vehicle.transmission}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-end">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild title={t('viewDetails')}>
                    <Link href={`/${locale}/vehicles/${vehicle.id}`}>
                      <Eye className="h-4 w-4 text-gray-500" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle)} title={t('editVehicle')}>
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild title={t('scheduleMaintenance')}>
                    <Link href={`/${locale}/maintenance/new?vehicleId=${vehicle.id}`}>
                      <Wrench className="h-4 w-4 text-orange-600" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" title={tc('delete')}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          {tc('noResults')}
        </div>
      )}

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
          disabled={!data?.vehicles || data.vehicles.length < 12 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

      <VehicleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedVehicle} 
      />
    </div>
  )
}
