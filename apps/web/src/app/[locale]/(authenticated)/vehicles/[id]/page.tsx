'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Edit, Wrench, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'

interface VehicleDetail {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  category: string
  color: string
  vin: string
  currentKm: number
  purchasePrice: number
  purchaseDate: string
  insuranceExpiry: string
  reviewDate: string
  status: string
  location: string
  franchiseAmount: number
  fuelType: string
  transmission: string
  seatCount: number
  doorCount: number
  features: string[]
  photos: any[]
  notes: string
  createdAt: string
  calculatedKmPerTire?: number
}

interface Maintenance {
  id: string
  type: string
  status: string
  scheduledFor: string
  completedAt?: string
  cost: number
  description: string
  mechanic?: {
    firstName: string
    lastName: string
  }
}

interface Booking {
  id: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  customer: {
    id: string
    firstName: string
    lastName: string
  }
}

const maintenanceStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
}

const bookingStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-blue-500',
  CHECKED_OUT: 'bg-green-500',
  CHECKED_IN: 'bg-gray-500',
  CANCELLED: 'bg-red-500',
}

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string || 'en'
  const t = useTranslations('Vehicles')
  const tc = useTranslations('Common')
  const tm = useTranslations('Maintenance')
  const tb = useTranslations('Bookings')

  const { data: vehicle, isLoading } = useQuery<VehicleDetail>({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const response = await api.get(`/vehicles/${id}`)
      return response.data
    },
  })

  const { data: maintenanceData, isLoading: isMaintenanceLoading } = useQuery<{ maintenances: Maintenance[] }>({
    queryKey: ['vehicle-maintenance', id],
    queryFn: async () => {
      const response = await api.get(`/maintenance`, { params: { vehicleId: id, limit: 100 } })
      return response.data
    },
  })

  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['vehicle-bookings', id],
    queryFn: async () => {
      const response = await api.get(`/bookings`, { params: { vehicleId: id, limit: 100 } })
      return response.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader /></div>
  }

  if (!vehicle) {
    return <div>{t('notFound')}</div>
  }

  const maintenances = maintenanceData?.maintenances || []
  const bookings = bookingsData?.bookings || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {vehicle.brand} {vehicle.model}
            </h2>
            <p className="text-muted-foreground">
              {vehicle.licensePlate} • {vehicle.category} • {vehicle.year}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/damages/new?vehicleId=${id}`}>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" /><path d="M12 17h.01" />
                <path d="M3.586 3.586a2 2 0 0 0 0 2.828L12 14.828l8.414-8.414a2 2 0 0 0-2.828-2.828L12 9.172 6.414 3.586a2 2 0 0 0-2.828 0Z" />
              </svg>
              {t('addDamageButton')}
            </Button>
          </Link>
          <Link href={`/${locale}/maintenance/new?vehicleId=${id}`}>
            <Button variant="outline">
              <Wrench className="mr-2 h-4 w-4" />
              {t('scheduleMaintenanceButton')}
            </Button>
          </Link>
          <Link href={`/${locale}/tires/new?vehicleId=${id}`}>
            <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t('tireChangeButton')}
            </Button>
          </Link>
          <Link href={`/${locale}/vehicles/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              {t('editVehicleButton')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('specifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('vin')}</dt>
                <dd>{vehicle.vin}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('color')}</dt>
                <dd>{vehicle.color}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('transmission')}</dt>
                <dd>{vehicle.transmission}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('fuelType')}</dt>
                <dd>{vehicle.fuelType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('seatsAndDoors')}</dt>
                <dd>{vehicle.seatCount} {t('seats')} / {vehicle.doorCount} {t('doors')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('currentMileage')}</dt>
                <dd>{vehicle.currentKm.toLocaleString()} km</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('location')}</dt>
                <dd>{vehicle.location}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{tc('status')}</dt>
                <dd className={`font-medium ${
                  vehicle.status === 'AVAILABLE' ? 'text-green-600' :
                  vehicle.status === 'RENTED' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {t(`status${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1).toLowerCase().replace('_', '')}`)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('financialLegal')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('purchasePrice')}</div>
              <div className="text-2xl font-bold">{formatCurrency(vehicle.purchasePrice)}</div>
              <div className="text-xs text-muted-foreground">{t('boughtOn', { date: formatDate(vehicle.purchaseDate) })}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('franchiseAmount')}</div>
              <div className="text-xl font-bold">{formatCurrency(vehicle.franchiseAmount)}</div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground">{t('insuranceExpiry')}</div>
              <div className={`text-lg font-bold ${new Date(vehicle.insuranceExpiry) < new Date() ? 'text-destructive' : ''}`}>
                {formatDate(vehicle.insuranceExpiry)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('reviewDate')}</div>
              <div className={`text-lg font-bold ${new Date(vehicle.reviewDate) < new Date() ? 'text-destructive' : ''}`}>
                {formatDate(vehicle.reviewDate)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList>
          <TabsTrigger value="photos">{t('photos')}</TabsTrigger>
          <TabsTrigger value="maintenance">{t('maintenanceHistory')} ({maintenances.length})</TabsTrigger>
          <TabsTrigger value="bookings">{t('bookingHistory')} ({bookings.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="space-y-4">
          {vehicle.photos && vehicle.photos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {vehicle.photos.map((photo: any, index: number) => (
                <Card key={index}>
                  <CardContent className="p-2">
                    <div className="aspect-video relative bg-muted rounded-md overflow-hidden">
                      {/* Image rendering logic would go here */}
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Photo {index + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('noPhotos')}
            </div>
          )}
        </TabsContent>
        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-0">
              {isMaintenanceLoading ? (
                <div className="flex justify-center py-8"><Loader /></div>
              ) : maintenances.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead>{t('mechanic')}</TableHead>
                      <TableHead className="text-right">{t('cost')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenances.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{(() => {
                              const typeKey = m.type?.toLowerCase().replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase()) as 'routine' | 'repair' | 'inspection' | 'tireChange' | 'oilChange' | 'other'
                              return tm(`types.${typeKey}`) || m.type
                            })()}</div>
                            {m.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{m.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(m.scheduledFor)}
                            {m.completedAt && (
                              <div className="text-xs text-muted-foreground">
                                {t('completedAt')}: {formatDate(m.completedAt)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={maintenanceStatusColors[m.status] || 'bg-gray-500'}>
                            {tm(`status.${m.status.toLowerCase().replace('_', '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {m.mechanic ? `${m.mechanic.firstName} ${m.mechanic.lastName}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {m.cost ? formatCurrency(m.cost) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/${locale}/maintenance/${m.id}/edit`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {t('noMaintenanceHistory')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bookings">
          <Card>
            <CardContent className="p-0">
              {isBookingsLoading ? (
                <div className="flex justify-center py-8"><Loader /></div>
              ) : bookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('customer')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{tc('status')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.customer.firstName} {b.customer.lastName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(b.startDate)} - {formatDate(b.endDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={bookingStatusColors[b.status] || 'bg-gray-500'}>
                            {tb(`status.${b.status.toLowerCase().replace('_', '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(b.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/${locale}/bookings/${b.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {t('noBookingHistory')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
