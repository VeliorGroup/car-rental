'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, MapPin, Search, Car } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VehicleSearchWidgetProps {
  compact?: boolean
  className?: string
}

export function VehicleSearchWidget({ compact = false, className }: VehicleSearchWidgetProps) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string || 'en'
  const t = useTranslations('PublicBooking')
  
  const [pickupDate, setPickupDate] = useState<Date>(addDays(new Date(), 1))
  const [returnDate, setReturnDate] = useState<Date>(addDays(new Date(), 4))
  const [location, setLocation] = useState<string>('')
  
  const handleSearch = () => {
    const searchParams = new URLSearchParams({
      pickup: format(pickupDate, 'yyyy-MM-dd'),
      return: format(returnDate, 'yyyy-MM-dd'),
      location: location || 'all',
    })
    router.push(`/${locale}/rent?${searchParams.toString()}`)
  }

  if (compact) {
    return (
      <Card className={cn("shadow-xl border-2", className)}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Location */}
            <div className="flex-1">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-12">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={t('selectLocation') || 'Select location'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allLocations') || 'All Locations'}</SelectItem>
                  <SelectItem value="tirana">Tirana</SelectItem>
                  <SelectItem value="durres">Durrës</SelectItem>
                  <SelectItem value="vlore">Vlorë</SelectItem>
                  <SelectItem value="airport">Rinas Airport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pickup Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 flex-1 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pickupDate ? format(pickupDate, 'MMM dd, yyyy') : t('pickupDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={pickupDate}
                  onSelect={(date: Date | undefined) => date && setPickupDate(date)}
                  disabled={(date: Date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Return Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 flex-1 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, 'MMM dd, yyyy') : t('returnDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={(date: Date | undefined) => date && setReturnDate(date)}
                  disabled={(date: Date) => date <= pickupDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Search Button */}
            <Button onClick={handleSearch} className="h-12 px-8">
              <Search className="mr-2 h-4 w-4" />
              {t('search') || 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full version for landing page
  return (
    <Card className={cn("shadow-2xl border-0 bg-background/95 backdrop-blur", className)}>
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Car className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">{t('findYourCar') || 'Find Your Perfect Car'}</h3>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('pickupLocation') || 'Pickup Location'}
            </label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-14">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <SelectValue placeholder={t('selectLocation') || 'Select location'} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLocations') || 'All Locations'}</SelectItem>
                <SelectItem value="tirana">Tirana</SelectItem>
                <SelectItem value="durres">Durrës</SelectItem>
                <SelectItem value="vlore">Vlorë</SelectItem>
                <SelectItem value="airport">Rinas Airport (TIA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pickup Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('pickupDate') || 'Pickup Date'}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-14 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {pickupDate ? format(pickupDate, 'EEE, MMM dd, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={pickupDate}
                  onSelect={(date: Date | undefined) => date && setPickupDate(date)}
                  disabled={(date: Date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('returnDate') || 'Return Date'}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-14 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {returnDate ? format(returnDate, 'EEE, MMM dd, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={(date: Date | undefined) => date && setReturnDate(date)}
                  disabled={(date: Date) => date <= pickupDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-transparent">Search</label>
            <Button onClick={handleSearch} className="w-full h-14 text-lg">
              <Search className="mr-2 h-5 w-5" />
              {t('searchVehicles') || 'Search Vehicles'}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t('rentalDuration') || 'Rental duration'}: {Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))} {t('days') || 'days'}
        </p>
      </CardContent>
    </Card>
  )
}
