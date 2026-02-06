'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VehicleSearchWidget } from '@/components/public/VehicleSearchWidget'
import { Car, Users, DoorOpen, Fuel, Cog, ArrowRight, Filter, Globe, MapPin } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface PublicVehicle {
  id: string
  brand: string
  model: string
  year: number
  category: string
  transmission: string
  fuelType: string
  seatCount: number
  doorCount: number
  dailyPrice: number
  photos: { key: string; url?: string }[]
  features: string[]
  location: string
}

export default function PublicVehiclesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string || 'en'
  const t = useTranslations('PublicBooking')
  
  const pickup = searchParams.get('pickup') || ''
  const returnDate = searchParams.get('return') || ''
  const location = searchParams.get('location') || 'all'
  
  const [category, setCategory] = useState<string>('all')
  const [transmission, setTransmission] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('price-asc')

  // Calculate rental days
  const days = pickup && returnDate 
    ? Math.ceil((new Date(returnDate).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24))
    : 3

  // Fetch available vehicles (public API - no auth needed)
  const { data: vehicles, isLoading } = useQuery<PublicVehicle[]>({
    queryKey: ['public-vehicles', pickup, returnDate, location, category, transmission],
    queryFn: async () => {
      // TODO: Create public API endpoint for vehicle availability
      // For now, return sample data
      return [
        {
          id: '1',
          brand: 'Toyota',
          model: 'Yaris',
          year: 2023,
          category: 'ECONOMY',
          transmission: 'Manual',
          fuelType: 'Petrol',
          seatCount: 5,
          doorCount: 4,
          dailyPrice: 25,
          photos: [],
          features: ['A/C', 'Bluetooth', 'USB'],
          location: 'Tirana',
        },
        {
          id: '2',
          brand: 'Volkswagen',
          model: 'Golf',
          year: 2023,
          category: 'COMPACT',
          transmission: 'Manual',
          fuelType: 'Diesel',
          seatCount: 5,
          doorCount: 4,
          dailyPrice: 35,
          photos: [],
          features: ['A/C', 'Bluetooth', 'Navigation', 'Cruise Control'],
          location: 'Tirana',
        },
        {
          id: '3',
          brand: 'Mercedes',
          model: 'C-Class',
          year: 2024,
          category: 'LUXURY',
          transmission: 'Automatic',
          fuelType: 'Petrol',
          seatCount: 5,
          doorCount: 4,
          dailyPrice: 120,
          photos: [],
          features: ['A/C', 'Leather Seats', 'Navigation', 'Cruise Control', 'Parking Sensors'],
          location: 'Airport',
        },
        {
          id: '4',
          brand: 'Nissan',
          model: 'Qashqai',
          year: 2023,
          category: 'SUV',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatCount: 5,
          doorCount: 5,
          dailyPrice: 55,
          photos: [],
          features: ['A/C', 'Bluetooth', 'Navigation', '4WD'],
          location: 'Durrës',
        },
      ]
    },
  })

  // Filter and sort vehicles
  const filteredVehicles = vehicles?.filter(v => {
    if (category !== 'all' && v.category !== category) return false
    if (transmission !== 'all' && v.transmission !== transmission) return false
    if (location !== 'all' && !v.location.toLowerCase().includes(location.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.dailyPrice - b.dailyPrice
    if (sortBy === 'price-desc') return b.dailyPrice - a.dailyPrice
    return 0
  }) || []

  const getCategoryLabel = (cat: string) => {
    const key = cat.toLowerCase() as 'economy' | 'compact' | 'midsize' | 'fullsize' | 'suv' | 'luxury' | 'van'
    return t(`categories.${key}`) || cat
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-xl font-bold text-foreground tracking-tight">FleetPulse</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link href={`/${locale}/business/login`}>
              <Button variant="ghost">{t('login')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Search Widget */}
        <VehicleSearchWidget compact className="mb-8" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-4 w-4" />
                  {t('filters')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('category')}</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCategories')}</SelectItem>
                      <SelectItem value="ECONOMY">{t('categories.economy')}</SelectItem>
                      <SelectItem value="COMPACT">{t('categories.compact')}</SelectItem>
                      <SelectItem value="MIDSIZE">{t('categories.midsize')}</SelectItem>
                      <SelectItem value="SUV">{t('categories.suv')}</SelectItem>
                      <SelectItem value="LUXURY">{t('categories.luxury')}</SelectItem>
                      <SelectItem value="VAN">{t('categories.van')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('transmission')}</label>
                  <Select value={transmission} onValueChange={setTransmission}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="Automatic">{t('automatic')}</SelectItem>
                      <SelectItem value="Manual">{t('manual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sortBy')}</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price-asc">{t('priceAsc')}</SelectItem>
                      <SelectItem value="price-desc">{t('priceDesc')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Vehicle Grid */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">
                {t('availableVehicles')} ({filteredVehicles.length})
              </h1>
              {days > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {days} {t('days')}
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('noVehiclesFound')}</h3>
                  <p className="text-muted-foreground">{t('tryDifferentDates')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Vehicle Image */}
                    <div className="aspect-[16/10] relative bg-muted">
                      {vehicle.photos?.[0]?.url ? (
                        <Image
                          src={vehicle.photos[0].url}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Car className="h-20 w-20 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3">
                        {getCategoryLabel(vehicle.category)}
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>{vehicle.brand} {vehicle.model}</span>
                        <span className="text-sm font-normal text-muted-foreground">{vehicle.year}</span>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Vehicle Features */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{vehicle.seatCount} {t('seats')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DoorOpen className="h-4 w-4" />
                          <span>{vehicle.doorCount} {t('doors')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cog className="h-4 w-4" />
                          <span>{vehicle.transmission}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Fuel className="h-4 w-4" />
                          <span>{vehicle.fuelType}</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{vehicle.location}</span>
                      </div>

                      {/* Price */}
                      <div className="pt-2 border-t">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-2xl font-bold text-primary">
                              €{vehicle.dailyPrice}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">
                              /{t('perDay')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">{t('totalFor')} {days} {t('days')}</span>
                            <div className="font-semibold">€{vehicle.dailyPrice * days}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link href={`/${locale}/vehicles/${vehicle.id}?pickup=${pickup}&return=${returnDate}`}>
                          {t('viewDetails')}
                        </Link>
                      </Button>
                      <Button className="flex-1" asChild>
                        <Link href={`/${locale}/book/${vehicle.id}?pickup=${pickup}&return=${returnDate}`}>
                          {t('bookNow')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <span className="font-bold">FleetPulse</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 FleetPulse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
