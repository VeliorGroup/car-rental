'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Separator } from '@/components/ui/separator'
import { 
  Car, Calendar, MapPin, FileText, Download, User, 
  Settings, LogOut, ChevronRight, Clock, CheckCircle2,
  XCircle, AlertCircle
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { format } from 'date-fns'

interface CustomerBooking {
  id: string
  reference: string
  vehicle: {
    brand: string
    model: string
    year: number
  }
  pickupDate: string
  returnDate: string
  pickupLocation: string
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  totalPrice: number
}

export default function CustomerBookingsPage() {
  const params = useParams()
  const locale = params.locale as string || 'en'
  const t = useTranslations('CustomerPortal')
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // Fetch customer bookings
  const { data: bookings, isLoading } = useQuery<CustomerBooking[]>({
    queryKey: ['customer-bookings'],
    queryFn: async () => {
      // TODO: Implement customer bookings API
      return [
        {
          id: '1',
          reference: 'BK12345678',
          vehicle: { brand: 'Toyota', model: 'Yaris', year: 2023 },
          pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          returnDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          pickupLocation: 'Tirana',
          status: 'CONFIRMED',
          totalPrice: 105,
        },
        {
          id: '2',
          reference: 'BK87654321',
          vehicle: { brand: 'Volkswagen', model: 'Golf', year: 2023 },
          pickupDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          returnDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          pickupLocation: 'Airport',
          status: 'COMPLETED',
          totalPrice: 140,
        },
      ]
    },
  })

  const upcomingBookings = bookings?.filter(b => 
    ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(b.status)
  ) || []

  const pastBookings = bookings?.filter(b => 
    ['COMPLETED', 'CANCELLED'].includes(b.status)
  ) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-500"><CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed</Badge>
      case 'ACTIVE':
        return <Badge className="bg-green-500"><Car className="mr-1 h-3 w-3" /> Active</Badge>
      case 'COMPLETED':
        return <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-xl font-bold">Car Rental</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/customer/profile`}>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Link href={`/${locale}/customer`}>
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{t('myBookings') || 'My Bookings'}</h1>
              <p className="text-muted-foreground mt-1">
                {t('myBookingsDesc') || 'View and manage your rental bookings'}
              </p>
            </div>
            <Link href={`/${locale}/rent`}>
              <Button>
                {t('newBooking') || 'New Booking'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{upcomingBookings.length}</p>
                <p className="text-sm text-muted-foreground">{t('upcoming') || 'Upcoming'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{pastBookings.filter(b => b.status === 'COMPLETED').length}</p>
                <p className="text-sm text-muted-foreground">{t('completed') || 'Completed'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{bookings?.length || 0}</p>
                <p className="text-sm text-muted-foreground">{t('total') || 'Total'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upcoming')}
            >
              {t('upcoming') || 'Upcoming'} ({upcomingBookings.length})
            </Button>
            <Button
              variant={activeTab === 'past' ? 'default' : 'outline'}
              onClick={() => setActiveTab('past')}
            >
              {t('past') || 'Past'} ({pastBookings.length})
            </Button>
          </div>

          {/* Bookings List */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader />
            </div>
          ) : displayedBookings.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {activeTab === 'upcoming' 
                    ? (t('noUpcoming') || 'No upcoming bookings')
                    : (t('noPast') || 'No past bookings')
                  }
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('startBrowsing') || 'Start by browsing our available vehicles'}
                </p>
                <Link href={`/${locale}/rent`}>
                  <Button>{t('browseVehicles') || 'Browse Vehicles'}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
                          <Car className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {booking.vehicle.brand} {booking.vehicle.model}
                            </h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ref: {booking.reference}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(booking.pickupDate), 'MMM dd')} - {format(new Date(booking.returnDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {booking.pickupLocation}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">€{booking.totalPrice}</p>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/${locale}/my-bookings/${booking.id}`}>
                              <FileText className="mr-1 h-4 w-4" />
                              {t('details') || 'Details'}
                            </Link>
                          </Button>
                          {booking.status === 'COMPLETED' && (
                            <Button variant="outline" size="sm">
                              <Download className="mr-1 h-4 w-4" />
                              {t('receipt') || 'Receipt'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
