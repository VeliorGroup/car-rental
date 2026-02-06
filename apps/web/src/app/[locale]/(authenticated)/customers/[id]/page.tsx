'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, Edit, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Loader } from '@/components/ui/loader'

interface CustomerDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  idCardNumber: string
  licenseNumber: string
  licenseExpiry: string
  address: string
  city: string
  country: string
  category: string
  status: string
  notes: string
  discountPercentage: number
  totalBookings: number
  totalSpent: number
  createdAt: string
  licenseFrontUrl?: string
  licenseBackUrl?: string
  idCardFrontUrl?: string
  idCardBackUrl?: string
}

interface Booking {
  id: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  vehicle: {
    id: string
    brand: string
    model: string
    licensePlate: string
  }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-blue-500',
  CHECKED_OUT: 'bg-green-500',
  CHECKED_IN: 'bg-gray-500',
  CANCELLED: 'bg-red-500',
  NO_SHOW: 'bg-red-900',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string || 'en'
  const t = useTranslations('Customers')
  const tb = useTranslations('Bookings')

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'STANDARD': return t('standard')
      case 'BUSINESS': return t('business')
      case 'PREMIUM': return t('premium')
      default: return category
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t('statusActive')
      case 'SUSPENDED': return t('statusSuspended')
      case 'BLACKLISTED': return t('statusBlacklisted')
      case 'LICENSE_EXPIRED': return t('statusLicenseExpired')
      default: return status
    }
  }

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await api.get(`/customers/${id}`)
      return response.data
    },
  })

  const { data: bookings, isLoading: isBookingsLoading } = useQuery<Booking[]>({
    queryKey: ['customer-bookings', id],
    queryFn: async () => {
      const response = await api.get(`/customers/${id}/bookings`)
      return response.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader /></div>
  }

  if (!customer) {
    return <div>Customer not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-muted-foreground">
              {getCategoryLabel(customer.category)} {t('customer')} • {getStatusLabel(customer.status)}
            </p>
          </div>
        </div>
        <Link href={`/${locale}/customers/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            {t('editCustomer')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('email')}</dt>
                <dd>{customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('phone')}</dt>
                <dd>{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('dateOfBirth')}</dt>
                <dd>{formatDate(customer.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('address')}</dt>
                <dd>{customer.address}, {customer.city}, {customer.country}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('license')}</dt>
                <dd>{customer.licenseNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('expiry')}</dt>
                <dd className={new Date(customer.licenseExpiry) < new Date() ? 'text-destructive font-bold' : ''}>
                  {formatDate(customer.licenseExpiry)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('idCardNumber')}</dt>
                <dd>{customer.idCardNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('registeredSince')}</dt>
                <dd>{formatDate(customer.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('stats') || 'Stats'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('totalSpent')}</div>
              <div className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('totalBookings') || 'Total Bookings'}</div>
              <div className="text-2xl font-bold">{customer.totalBookings}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t('discount')}</div>
              <div className="text-2xl font-bold">{customer.discountPercentage}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">{t('documents')}</TabsTrigger>
          <TabsTrigger value="bookings">{t('bookingHistory')} ({bookings?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {customer.licenseFrontUrl && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t('licenseFront')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="aspect-video relative bg-muted rounded-md overflow-hidden mb-2">
                    <img 
                      src={customer.licenseFrontUrl} 
                      alt="License Front" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={customer.licenseFrontUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> {t('download')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
            {customer.licenseBackUrl && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t('licenseBack')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="aspect-video relative bg-muted rounded-md overflow-hidden mb-2">
                    <img 
                      src={customer.licenseBackUrl} 
                      alt="License Back" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={customer.licenseBackUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> {t('download')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
            {customer.idCardFrontUrl && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t('idCardFront')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="aspect-video relative bg-muted rounded-md overflow-hidden mb-2">
                    <img 
                      src={customer.idCardFrontUrl} 
                      alt="ID Card Front" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={customer.idCardFrontUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> {t('download')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
            {customer.idCardBackUrl && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t('idCardBack')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="aspect-video relative bg-muted rounded-md overflow-hidden mb-2">
                    <img 
                      src={customer.idCardBackUrl} 
                      alt="ID Card Back" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={customer.idCardBackUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> {t('download')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="bookings">
          <Card>
            <CardContent className="p-0">
              {isBookingsLoading ? (
                <div className="flex justify-center py-8"><Loader /></div>
              ) : bookings && bookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tb('vehicle')}</TableHead>
                      <TableHead>{tb('dates')}</TableHead>
                      <TableHead>{tb('status.status')}</TableHead>
                      <TableHead className="text-right">{tb('amount')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.vehicle.brand} {booking.vehicle.model}</div>
                            <div className="text-sm text-muted-foreground">{booking.vehicle.licensePlate}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[booking.status] || 'bg-gray-500'}>
                             {tb(`status.${booking.status.toLowerCase().replace('_', '')}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(booking.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/${locale}/bookings/${booking.id}`}>
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
