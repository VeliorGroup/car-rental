'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Search, Car, Users, Fuel, Calendar, MapPin, 
  ChevronRight, Globe
} from 'lucide-react';
import { searchApi } from '@/lib/public-api';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import { enUS, it, sq, es, fr, de, pt, el, ro } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Countries with their cities
const countries = [
  { code: 'AL', name: 'Albania', flag: '🇦🇱', active: true },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', active: false },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', active: false },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷', active: false },
  { code: 'MK', name: 'Macedonia', flag: '🇲🇰', active: false },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', active: false },
];

// Cities by country
const citiesByCountry: Record<string, string[]> = {
  AL: ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Elbasan', 'Fier', 
       'Korçë', 'Berat', 'Lushnjë', 'Pogradec', 'Kavajë', 'Lezhë',
       'Gjirokastër', 'Sarandë', 'Kukës', 'Peshkopi', 'Krujë', 'Laç'],
  XK: ['Prishtina', 'Prizren', 'Ferizaj', 'Peja', 'Gjakova', 'Gjilan', 'Mitrovica'],
  IT: ['Roma', 'Milano', 'Napoli', 'Torino', 'Firenze'],
  GR: ['Atene', 'Salonicco', 'Patrasso'],
  MK: ['Skopje', 'Bitola', 'Ohrid'],
  ME: ['Podgorica', 'Nikšić', 'Budva', 'Bar', 'Kotor', 'Herceg Novi'],
};

const localeMap: Record<string, any> = {
  en: enUS,
  it: it,
  sq: sq,
  es: es,
  fr: fr,
  de: de,
  pt: pt,
  el: el,
  ro: ro,
};

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  category: string;
  year: number;
  seats: number;
  fuelType: string;
  transmission: string;
  photos: { url: string }[];
  dailyPrice: number;
  tenant: {
    name: string;
    companyName: string | null;
  };
}

export default function CustomerSearchPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const t = useTranslations('CustomerPortal.search');
  
  const dateLocale = localeMap[locale] || enUS;

  const [country, setCountry] = useState(searchParams.get('country') || 'AL');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    searchParams.get('endDate') || format(addDays(new Date(), 4), 'yyyy-MM-dd')
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // City autocomplete state
  const [cityInputValue, setCityInputValue] = useState(city);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Get cities for selected country
  const availableCities = citiesByCountry[country] || [];
  const selectedCountry = countries.find(c => c.code === country);
  
  // Filter cities based on input
  const filteredCities = availableCities.filter(c =>
    c.toLowerCase().includes(cityInputValue.toLowerCase())
  );

  // Reset city when country changes
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const newCities = citiesByCountry[newCountry] || [];
    if (newCities.length > 0) {
      setCity(newCities[0]);
      setCityInputValue(newCities[0]);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('customerToken');
    if (!token) {
      router.push(`/${locale}/customer/login`);
    }
  }, [locale, router]);

  // Auto-search if URL has params
  useEffect(() => {
    if (searchParams.get('city')) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const results = await searchApi.searchByCity({
        city,
        startDate,
        endDate,
        limit: 20,
      });
      setVehicles(results.vehicles || []);
    } catch (error) {
      console.error('Search error:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    ECONOMY: 'bg-green-100 text-green-800',
    COMPACT: 'bg-blue-100 text-blue-800',
    MIDSIZE: 'bg-purple-100 text-purple-800',
    FULLSIZE: 'bg-orange-100 text-orange-800',
    SUV: 'bg-red-100 text-red-800',
    LUXURY: 'bg-amber-100 text-amber-800',
    VAN: 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      <div>
        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Country */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  {t('country')}
                </Label>
                <Select value={country} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue>
                      {selectedCountry && (
                        <span className="flex items-center gap-1.5">
                          <span>{selectedCountry.flag}</span>
                          <span className="truncate">{selectedCountry.name}</span>
                          {selectedCountry.active && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700 hidden sm:inline">{t('active')}</span>
                          )}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem 
                        key={c.code} 
                        value={c.code}
                        disabled={!c.active}
                      >
                        <span className="flex items-center gap-1.5 text-sm">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                          {c.active ? (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700">{t('active')}</span>
                          ) : (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">{t('comingSoon')}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {t('city')}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={cityInputValue}
                    onChange={(e) => {
                      setCityInputValue(e.target.value);
                      setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                    placeholder={t('searchCity')}
                    className="h-9 pl-8 text-sm"
                  />
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-40 overflow-auto">
                      {filteredCities.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCityInputValue(c);
                            setCity(c);
                            setShowCityDropdown(false);
                          }}
                        >
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {t('pickupDate')}
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-9 text-sm px-2.5"
                    >
                      <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{format(new Date(startDate), 'dd MMM yyyy', { locale: dateLocale })}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={new Date(startDate)}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(format(date, 'yyyy-MM-dd'));
                          setStartDateOpen(false);
                          if (new Date(endDate) <= date) {
                            setEndDate(format(addDays(date, 1), 'yyyy-MM-dd'));
                          }
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {t('returnDate')}
                </Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-9 text-sm px-2.5"
                    >
                      <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{format(new Date(endDate), 'dd MMM yyyy', { locale: dateLocale })}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={new Date(endDate)}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(format(date, 'yyyy-MM-dd'));
                          setEndDateOpen(false);
                        }
                      }}
                      disabled={(date) => date <= new Date(startDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search Button */}
              <div className="flex items-end col-span-2 lg:col-span-1">
                <Button onClick={handleSearch} className="w-full h-9" disabled={loading}>
                  {loading ? (
                    <>{t('searching')}</>
                  ) : (
                    <>
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      {t('search')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : hasSearched ? (
          vehicles.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('noResults')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('noResultsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  {t('resultsCount', { count: vehicles.length, city: city })}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Vehicle Image */}
                    <div className="aspect-[16/10] relative bg-muted">
                      {vehicle.photos?.[0]?.url ? (
                        <img
                          src={vehicle.photos[0].url}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Car className="h-20 w-20 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className={`absolute top-3 right-3 ${categoryColors[vehicle.category] || 'bg-gray-100'}`}>
                        {vehicle.category}
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>{vehicle.brand} {vehicle.model}</span>
                        <span className="text-sm font-normal text-muted-foreground">{vehicle.year}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.tenant?.companyName || vehicle.tenant?.name}
                      </p>
                    </CardHeader>

                    <CardContent className="pb-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {vehicle.seats}
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="h-4 w-4" />
                          {vehicle.fuelType}
                        </span>
                        <span>{vehicle.transmission}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <span className="text-2xl font-bold">€{vehicle.dailyPrice}</span>
                        <span className="text-muted-foreground text-sm">{t('perDay')}</span>
                      </div>
                      <Link href={`/${locale}/book/${vehicle.id}?startDate=${startDate}&endDate=${endDate}`}>
                        <Button>
                          {t('book')}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('startSearch')}</h3>
              <p className="text-muted-foreground">
                {t('startSearchDesc')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
