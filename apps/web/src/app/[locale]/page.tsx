'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Shield, Globe, MapPin, Search, Building2, User, Zap, ChevronRight, Menu, Calendar as CalendarIcon, Car, Users, Fuel, Settings2, Loader2, ArrowRight, Play, Star, TrendingUp, Clock, CreditCard, Headphones, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { searchApi } from '@/lib/public-api'
import { format, addDays, differenceInDays } from 'date-fns'

interface Country {
  code: string
  name: string
  currency: string
  flag: string
}

import { cities } from '@/lib/constants/cities'

// Countries with their status
const displayCountries = [
  { code: 'AL', name: 'Albania', flag: '🇦🇱', active: true },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', active: false },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', active: false },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷', active: false },
  { code: 'MK', name: 'Macedonia', flag: '🇲🇰', active: false },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', active: false },
];

interface SearchResult {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    category: string;
    fuelType: string;
    transmission: string;
    seatCount: number;
    photos: any;
  };
  branch: {
    id: string;
    name: string;
    city: string;
    address: string;
    distance: number;
  };
  tenant: {
    id: string;
    name: string;
    companyName: string | null;
  };
  pricing: {
    dailyPrice: number;
    totalDays: number;
    totalPrice: number;
  };
}

export default function HomePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string || 'en'
  const pathname = usePathname()
  const currentLocale = useLocale()
  const t = useTranslations('Home')

  // Search state
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || '')
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || format(addDays(new Date(), 4), 'yyyy-MM-dd'))
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('AL')
  
  // Search results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Platform stats
  const [platformStats, setPlatformStats] = useState({
    totalVehicles: 0,
    totalTenants: 0,
    totalBookings: 0,
    availableVehicles: 0,
  })
  
  // Top tenants
  const [topTenants, setTopTenants] = useState<{id: string; name: string; vehicleCount: number}[]>([])
  
  // City autocomplete state
  const [cityInputValue, setCityInputValue] = useState(searchCity)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const filteredCities = cities.filter(c => 
    c.label.toLowerCase().includes(cityInputValue.toLowerCase())
  )
  const selectedCountryData = displayCountries.find(c => c.code === selectedCountry) || displayCountries[0]
  
  // Date picker popover state
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  // Load saved country
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry')
    if (savedCountry) setSelectedCountry(savedCountry)
  }, [])

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get('/auth/countries')
        setCountries(response.data.countries || [])
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      }
    }
    fetchCountries()
  }, [])

  // Fetch platform stats and top tenants
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsResponse, tenantsResponse] = await Promise.all([
          api.get('/public/search/stats'),
          api.get('/public/search/top-tenants?limit=5')
        ])
        setPlatformStats(statsResponse.data)
        setTopTenants(tenantsResponse.data)
      } catch (error) {
        console.error('Failed to fetch platform data:', error)
      }
    }
    fetchStats()
  }, [])

  // Auto-search if params are present
  useEffect(() => {
    if (searchParams.get('city')) {
      performSearch()
    }
  }, [])

  const performSearch = async () => {
    setSearchLoading(true)
    setHasSearched(true)
    try {
      const response = await searchApi.searchByCity({
        city: searchCity,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        limit: 20,
      })
      setSearchResults(response.results || [])
      
      // Update URL with search params
      const params = new URLSearchParams({
        city: searchCity,
        startDate: startDate,
        endDate: endDate,
      })
      router.replace(`/${locale}?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearch = () => {
    performSearch()
    // Scroll to results after a short delay
    setTimeout(() => {
      const resultsSection = document.getElementById('search-results')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const getPhotoUrl = (photos: any) => {
    if (!photos) return '/placeholder-car.jpg'
    if (Array.isArray(photos) && photos.length > 0) {
      return photos[0].url || photos[0].key || '/placeholder-car.jpg'
    }
    return '/placeholder-car.jpg'
  }

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '')
    const newPath = `/${newLocale}${pathWithoutLocale || '/'}`
    window.location.href = newPath
  }

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode)
    localStorage.setItem('selectedCountry', countryCode)
  }

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
    { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  ]

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Enterprise Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground leading-tight">Car Rental</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Enterprise</span>
              </div>
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Language Selector */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    {languages.find(l => l.code === currentLocale)?.flag}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languages.map(lang => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => handleLanguageChange(lang.code)}
                      className={currentLocale === lang.code ? 'bg-accent' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                      {currentLocale === lang.code && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-6 bg-border mx-2" />

              {/* Auth Dropdowns */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-foreground font-medium">
                    <User className="h-4 w-4 mr-2" />
                    {t('nav.private')}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <Link href={`/${locale}/customer/login`}>
                    <DropdownMenuItem className="cursor-pointer">
                      {t('nav.loginPrivate')}
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/${locale}/customer/register`}>
                    <DropdownMenuItem className="cursor-pointer">
                      {t('nav.registerPrivate')}
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="font-medium">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('nav.business')}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <Link href={`/${locale}/business/login`}>
                    <DropdownMenuItem className="cursor-pointer">
                      {t('nav.loginBusiness')}
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/${locale}/business/register`}>
                    <DropdownMenuItem className="cursor-pointer">
                      {t('nav.registerBusiness')}
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {/* Language Selector - Always visible */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    {languages.find(l => l.code === currentLocale)?.flag}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languages.map(lang => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => handleLanguageChange(lang.code)}
                      className={currentLocale === lang.code ? 'bg-accent' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                      {currentLocale === lang.code && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Hamburger */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-4 space-y-3">
              {/* Privato Section */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {t('nav.private')}
                </p>
                <Link 
                  href={`/${locale}/customer/login`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('nav.loginPrivate')}</span>
                </Link>
                <Link 
                  href={`/${locale}/customer/register`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('nav.registerPrivate')}</span>
                </Link>
              </div>

              <div className="h-px bg-border mx-2" />

              {/* Business Section */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {t('nav.business')}
                </p>
                <Link 
                  href={`/${locale}/business/login`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('nav.loginBusiness')}</span>
                </Link>
                <Link 
                  href={`/${locale}/business/register`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('nav.registerBusiness')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Enterprise Style */}
      <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden mesh-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm font-medium text-secondary-foreground mb-6">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-[10px] text-white font-bold border-2 border-background">✓</div>
                </div>
                <span>{t('hero.trustBadgePrefix')} {platformStats.totalTenants}+ {t('hero.trustBadgeSuffix')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                {t('hero.enterpriseTitle')}
                <span className="block gradient-text">{t('hero.enterpriseHighlight')}</span>
                {t('hero.enterpriseSubtitle')}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('hero.enterpriseDescription')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold h-12 px-6">
                  <Play className="mr-2 h-4 w-4" />
                  {t('hero.watchDemo')}
                </Button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{platformStats.totalVehicles}</div>
                  <div className="text-sm text-muted-foreground">{t('hero.stats.vehicles')}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{platformStats.totalTenants}</div>
                  <div className="text-sm text-muted-foreground">{t('hero.stats.companies')}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{platformStats.totalBookings}</div>
                  <div className="text-sm text-muted-foreground">{t('hero.stats.bookings')}</div>
                </div>
              </div>
            </div>

            {/* Right Content - Search Card */}
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-info/10 rounded-full blur-2xl" />
              
              {/* Search Card */}
              <Card className="relative shadow-xl glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{t('search.title')}</h2>
                      <p className="text-sm text-muted-foreground">{t('search.subtitle')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{t('search.country') || 'Paese'}</label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20 z-10">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                          className="flex h-12 w-full items-center rounded-md border border-input bg-background pl-14 pr-3 text-sm font-medium hover:border-primary/50 transition-all text-left"
                        >
                          <span className="mr-2">{selectedCountryData.flag}</span>
                          <span>{selectedCountryData.name}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded ${selectedCountryData.active ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground bg-muted'}`}>
                            {selectedCountryData.active ? (t('search.onlyActive') || 'Attivo') : (t('search.comingSoon') || 'Prossimamente')}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                        </button>
                        {showCountryDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
                            {displayCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 ${selectedCountry === country.code ? 'bg-accent' : ''} ${!country.active ? 'opacity-60' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  if (country.active) {
                                    setSelectedCountry(country.code)
                                    localStorage.setItem('selectedCountry', country.code)
                                  }
                                  setShowCountryDropdown(false)
                                }}
                              >
                                {selectedCountry === country.code && <Check className="w-4 h-4 text-primary" />}
                                <span className="text-base">{country.flag}</span>
                                <span className="flex-1">{country.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${country.active ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground bg-muted'}`}>
                                  {country.active ? (t('search.onlyActive') || 'Attivo') : (t('search.comingSoon') || 'Prossimamente')}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{t('search.location')}</label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20 z-10">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <Input
                          type="text"
                          value={cityInputValue}
                          onChange={(e) => {
                            setCityInputValue(e.target.value)
                            setShowCityDropdown(true)
                          }}
                          onFocus={() => setShowCityDropdown(true)}
                          onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                          placeholder={t('search.selectCity')}
                          className="h-12 pl-14 pr-3 font-medium transition-all hover:border-primary/50 focus:border-primary"
                        />
                        {showCityDropdown && filteredCities.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                            {filteredCities.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setCityInputValue(c.label)
                                  setSearchCity(c.value)
                                  setShowCityDropdown(false)
                                }}
                              >
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('search.pickup')}</label>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center h-12 rounded-md border border-input bg-background transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group"
                            >
                              <div className="ml-3 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="ml-3 text-sm font-medium text-foreground">
                                {format(new Date(startDate), 'dd MMM yyyy')}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              className="[--cell-size:1.75rem] text-sm"
                              mode="single"
                              selected={new Date(startDate)}
                              onSelect={(date) => {
                                if (date) {
                                  setStartDate(format(date, 'yyyy-MM-dd'))
                                  setStartDateOpen(false)
                                  // Automatically adjust end date if it's before start date
                                  if (new Date(endDate) <= date) {
                                    setEndDate(format(addDays(date, 1), 'yyyy-MM-dd'))
                                  }
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('search.dropoff')}</label>
                        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center h-12 rounded-md border border-input bg-background transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group"
                            >
                              <div className="ml-3 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="ml-3 text-sm font-medium text-foreground">
                                {format(new Date(endDate), 'dd MMM yyyy')}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              className="[--cell-size:1.75rem] text-sm"
                              mode="single"
                              selected={new Date(endDate)}
                              onSelect={(date) => {
                                if (date) {
                                  setEndDate(format(date, 'yyyy-MM-dd'))
                                  setEndDateOpen(false)
                                }
                              }}
                              disabled={(date) => date <= new Date(startDate)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Search Button */}
                    <Button 
                      onClick={handleSearch}
                      disabled={searchLoading}
                      className="w-full h-12 font-semibold"
                    >
                      {searchLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('search.searching')}
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          {t('search.searchButton')}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Car className="w-4 h-4" />
                        <span>{platformStats.availableVehicles}+ {t('search.availableVehicles')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-medium text-foreground">4.9</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {hasSearched && (
        <section id="search-results" className="py-16 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {searchLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {searchResults.length} {t('search.availableVehicles')}
                  </h2>
                  <p className="text-muted-foreground">
                    {searchCity} • {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((result) => (
                    <Card 
                      key={result.vehicle.id} 
                      className="overflow-hidden card-hover"
                    >
                      <div className="relative h-48 bg-muted overflow-hidden">
                        <img
                          src={getPhotoUrl(result.vehicle.photos)}
                          alt={`${result.vehicle.brand} ${result.vehicle.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-car.jpg'
                          }}
                        />
                        <Badge className="absolute top-3 left-3">
                          {result.vehicle.category}
                        </Badge>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {result.vehicle.brand} {result.vehicle.model}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {result.tenant.companyName || result.tenant.name}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {result.vehicle.seatCount} {t('results.seats')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Fuel className="h-3 w-3 mr-1" />
                            {result.vehicle.fuelType}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Settings2 className="h-3 w-3 mr-1" />
                            {result.vehicle.transmission}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between mb-4 pt-4 border-t border-border">
                          <div>
                            <span className="text-2xl font-bold text-primary">
                              €{result.pricing.dailyPrice}
                            </span>
                            <span className="text-sm text-muted-foreground">{t('results.perDay')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold text-foreground">€{result.pricing.totalPrice}</span>
                            <span className="text-xs text-muted-foreground block">
                              {t('results.totalDays', { days: result.pricing.totalDays })}
                            </span>
                          </div>
                        </div>
                        <Link href={`/${locale}/vehicle/${result.vehicle.id}?startDate=${startDate}&endDate=${endDate}`}>
                          <Button className="w-full font-medium">
                            {t('results.bookNow')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{t('results.noResults')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t('results.noResultsDesc')}
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    setHasSearched(false)
                  }}
                >
                  {t('results.modifySearch')}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Bar */}
      <section className="py-12 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{t('featuresBar.secure')}</div>
                <div className="text-sm text-muted-foreground">{t('featuresBar.secureDesc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{t('featuresBar.fast')}</div>
                <div className="text-sm text-muted-foreground">{t('featuresBar.fastDesc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{t('featuresBar.flexible')}</div>
                <div className="text-sm text-muted-foreground">{t('featuresBar.flexibleDesc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6 text-info" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{t('featuresBar.support')}</div>
                <div className="text-sm text-muted-foreground">{t('featuresBar.supportDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Enterprise Style */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-sm font-medium">{t('whyUs.badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('whyUs.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('whyUs.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <TrendingUp className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t('whyUs.revenue.title')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('whyUs.revenue.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t('whyUs.efficiency.title')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('whyUs.efficiency.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center mb-6">
                  <Globe className="w-7 h-7 text-info" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t('whyUs.experience.title')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('whyUs.experience.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Dual Path */}
      <section className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('ctaDual.title')}</h2>
            <p className="text-muted-foreground">{t('ctaDual.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Customer Path */}
            <Card className="relative overflow-hidden gradient-bg border-0">
              <CardContent className="p-8 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">{t('ctaDual.customers.title')}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('ctaDual.customers.desc')}
                </p>
                <Link href={`/${locale}/customer/register`}>
                  <Button variant="outline" className="font-semibold">
                    {t('ctaDual.customers.button')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Business Path */}
            <Card className="relative overflow-hidden bg-primary border-0">
              <CardContent className="p-8 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-primary-foreground mb-3">{t('ctaDual.business.title')}</h3>
                <p className="text-primary-foreground/80 mb-6 leading-relaxed">
                  {t('ctaDual.business.desc')}
                </p>
                <Link href={`/${locale}/business/register`}>
                  <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                    {t('ctaDual.business.button')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Logos */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {topTenants.length > 0 && (
            <>
              <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
                {t('trust.title')}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
                {topTenants.map((tenant) => (
                  <div key={tenant.id} className="text-2xl font-bold text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors">
                    {tenant.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="bg-foreground text-background py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-3 text-sm opacity-70">
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.features')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('nav.pricing')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.integrations')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.docs')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-3 text-sm opacity-70">
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.about')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.careers')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.blog')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('nav.contacts')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-3 text-sm opacity-70">
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.docs')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.changelog')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.demo')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.sales')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-3 text-sm opacity-70">
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.privacy')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.terms')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">{t('footer.cookies')}</Link></li>
                <li><Link href="#" className="hover:opacity-100 transition-opacity">GDPR</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="font-semibold">Car Rental</span>
            <div className="text-sm opacity-70">
              © 2026 Car Rental Inc. {t('footer.rights')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
