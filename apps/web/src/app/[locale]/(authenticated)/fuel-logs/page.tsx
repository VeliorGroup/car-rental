'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/components/ui/use-toast'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import {
  Plus,
  Search,
  Fuel,
  TrendingUp,
  TrendingDown,
  Car,
  DollarSign,
  Gauge,
  Trash2,
  Pencil,
  X,
  AlertCircle,
} from 'lucide-react'
import { fuelLogsApi, FuelLog } from '@/lib/api'
import api from '@/lib/api'

interface VehicleListItem {
  id: string
  licensePlate: string
  brand: string
  model: string
}

interface FuelLogFormData {
  vehicleId: string
  fuelType: string
  liters: number
  costPerLiter: number
  totalCost: number
  odometerReading: number
  stationName: string
  stationAddress: string
  filledAt: string
  notes: string
  fullTank: boolean
}

const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
]

export default function FuelLogsPage() {
  const t = useTranslations('FuelLogs')
  const tc = useTranslations('Common')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { setPageFilters } = useFilterBar()

  const [page, setPage] = useState(1)
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<FuelLog | null>(null)
  const [formData, setFormData] = useState({
    vehicleId: '',
    fuelType: 'diesel',
    liters: 0,
    costPerLiter: 0,
    totalCost: 0,
    odometerReading: 0,
    stationName: '',
    stationAddress: '',
    filledAt: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    fullTank: true,
  })

  // Fetch vehicles for dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { limit: 100 } })
      return response.data.vehicles
    },
  })

  // Register filters
  useEffect(() => {
    setPageFilters(
      <div className="flex items-center gap-3">
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder={t('selectVehicle')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allVehicles')}</SelectItem>
            {vehicles?.map((v: VehicleListItem) => (
              <SelectItem key={v.id} value={v.id}>
                {v.licensePlate} - {v.brand} {v.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('fuelType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {FUEL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(vehicleFilter !== 'all' || fuelTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setVehicleFilter('all'); setFuelTypeFilter('all'); }}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
    return () => setPageFilters(null)
  }, [vehicleFilter, fuelTypeFilter, vehicles, setPageFilters, t])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fuel-logs', page, vehicleFilter, fuelTypeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (vehicleFilter !== 'all') params.vehicleId = vehicleFilter
      if (fuelTypeFilter !== 'all') params.fuelType = fuelTypeFilter
      const response = await fuelLogsApi.getAll(params)
      return response.data
    },
  })

  const { data: fleetStats } = useQuery({
    queryKey: ['fuel-logs-fleet-stats'],
    queryFn: async () => {
      const response = await fuelLogsApi.getFleetStats()
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FuelLogFormData) => fuelLogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] })
      queryClient.invalidateQueries({ queryKey: ['fuel-logs-fleet-stats'] })
      setIsModalOpen(false)
      resetForm()
      toast({
        title: t('createSuccess'),
        description: t('logCreated'),
      })
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('createError'),
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FuelLogFormData }) => fuelLogsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] })
      queryClient.invalidateQueries({ queryKey: ['fuel-logs-fleet-stats'] })
      setIsModalOpen(false)
      resetForm()
      toast({
        title: t('updateSuccess'),
        description: t('logUpdated'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fuelLogsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] })
      queryClient.invalidateQueries({ queryKey: ['fuel-logs-fleet-stats'] })
      toast({
        title: t('deleteSuccess'),
        description: t('logDeleted'),
      })
    },
  })

  const resetForm = () => {
    setSelectedLog(null)
    setFormData({
      vehicleId: '',
      fuelType: 'diesel',
      liters: 0,
      costPerLiter: 0,
      totalCost: 0,
      odometerReading: 0,
      stationName: '',
      stationAddress: '',
      filledAt: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      fullTank: true,
    })
  }

  const handleEdit = (log: FuelLog) => {
    setSelectedLog(log)
    setFormData({
      vehicleId: log.vehicleId,
      fuelType: log.fuelType,
      liters: log.liters,
      costPerLiter: log.costPerLiter,
      totalCost: log.totalCost,
      odometerReading: log.odometerReading,
      stationName: log.stationName || '',
      stationAddress: log.stationAddress || '',
      filledAt: format(new Date(log.filledAt), 'yyyy-MM-dd'),
      notes: '',
      fullTank: log.fullTank,
    })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (selectedLog) {
      updateMutation.mutate({ id: selectedLog.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // Auto-calculate total cost
  useEffect(() => {
    const total = formData.liters * formData.costPerLiter
    setFormData(prev => ({ ...prev, totalCost: Math.round(total * 100) / 100 }))
  }, [formData.liters, formData.costPerLiter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addFuelLog')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('thisMonthCost')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{fleetStats?.thisMonth?.totalCost?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('thisMonthLiters')}</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fleetStats?.thisMonth?.totalLiters?.toFixed(1) || '0'} L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgConsumption')}</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fleetStats?.fleetAvgConsumption || '-'} L/100km
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('vehiclesTracked')}</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fleetStats?.byVehicle?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">{tc('error')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('loadError') || 'Failed to load fuel logs. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['fuel-logs'] })}
              >
                {tc('retry') || 'Retry'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vehicle')}</TableHead>
                  <TableHead>{t('fuelType')}</TableHead>
                  <TableHead>{t('liters')}</TableHead>
                  <TableHead>{t('costPerLiter')}</TableHead>
                  <TableHead>{t('totalCost')}</TableHead>
                  <TableHead>{t('odometer')}</TableHead>
                  <TableHead>{t('consumption')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.fuelLogs?.map((log: FuelLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.vehicle?.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.vehicle?.brand} {log.vehicle?.model}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.fuelType}</Badge>
                    </TableCell>
                    <TableCell>{log.liters} L</TableCell>
                    <TableCell>€{log.costPerLiter.toFixed(3)}</TableCell>
                    <TableCell className="font-medium">€{log.totalCost.toFixed(2)}</TableCell>
                    <TableCell>{log.odometerReading.toLocaleString()} km</TableCell>
                    <TableCell>
                      {log.consumption ? (
                        <span className={log.consumption > 10 ? 'text-red-500' : 'text-green-500'}>
                          {log.consumption.toFixed(1)} L/100km
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{format(new Date(log.filledAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(log)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.fuelLogs || data.fuelLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      {tc('noResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {tc('previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.fuelLogs || data.fuelLogs.length < 20}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedLog ? t('editFuelLog') : t('addFuelLog')}
            </DialogTitle>
            <DialogDescription>{t('modalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('vehicle')} *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectVehicle')} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v: VehicleListItem) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.licensePlate} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fuelType')}</Label>
                <Select
                  value={formData.fuelType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, fuelType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('date')}</Label>
                <Input
                  type="date"
                  value={formData.filledAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, filledAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('liters')} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.liters || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, liters: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('costPerLiter')} *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.costPerLiter || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, costPerLiter: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('totalCost')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.totalCost || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('odometer')} *</Label>
              <Input
                type="number"
                value={formData.odometerReading || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, odometerReading: parseInt(e.target.value) || 0 }))}
                placeholder="km"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('stationName')}</Label>
              <Input
                value={formData.stationName}
                onChange={(e) => setFormData(prev => ({ ...prev, stationName: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.fullTank}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, fullTank: !!v }))}
              />
              <Label className="text-sm font-normal">{t('fullTank')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.vehicleId || !formData.liters || !formData.odometerReading || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader className="mr-2 h-4 w-4" />
              )}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
