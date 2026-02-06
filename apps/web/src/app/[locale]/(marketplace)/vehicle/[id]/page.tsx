'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, MapPin, Car, Users, Fuel, Settings2, ArrowLeft, 
  Check, Phone, Clock, Shield, CreditCard, ChevronRight
} from 'lucide-react';
import { searchApi, publicBookingsApi } from '@/lib/public-api';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  fuelType: string;
  transmission: string;
  seatCount: number;
  doorCount: number;
  features: string[];
  photos: any;
  franchiseAmount: any;
  tenant: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string;
  };
  branch: {
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    openingHours: any;
    latitude: number;
    longitude: number;
  };
}

interface Pricing {
  dailyPrice: number;
  totalDays: number;
  subtotal: number;
  platformFee: number;
  tenantEarnings: number;
  totalAmount: number;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params.locale as string;
  const vehicleId = params.id as string;

  const startDate = searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd');
  const endDate = searchParams.get('endDate') || format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehicleData, pricingData] = await Promise.all([
          searchApi.getVehicle(vehicleId),
          publicBookingsApi.calculatePricing(
            vehicleId,
            new Date(startDate).toISOString(),
            new Date(endDate).toISOString()
          ),
        ]);
        setVehicle(vehicleData);
        setPricing(pricingData);
      } catch (error) {
        console.error('Failed to load vehicle:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [vehicleId, startDate, endDate]);

  const getPhotos = (photos: any) => {
    if (!photos) return ['/placeholder-car.jpg'];
    if (Array.isArray(photos)) {
      return photos.length > 0 ? photos.map(p => p.url || p.key) : ['/placeholder-car.jpg'];
    }
    return ['/placeholder-car.jpg'];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Veicolo non trovato</h1>
        <p className="text-muted-foreground mb-6">Il veicolo richiesto non è disponibile</p>
        <Link href={`/${locale}`}>
          <Button>Torna alla ricerca</Button>
        </Link>
      </div>
    );
  }

  const photos = getPhotos(vehicle.photos);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna ai risultati
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Photos & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Photo */}
            <div className="relative rounded-xl overflow-hidden bg-muted">
              <img
                src={photos[selectedPhoto]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-[400px] object-cover"
              />
              <Badge className="absolute top-4 left-4 bg-primary text-lg px-4 py-1">
                {vehicle.category}
              </Badge>
            </div>

            {/* Photo Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhoto(index)}
                    className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedPhoto === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={photo} alt="" className="w-20 h-16 object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Vehicle Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl">
                      {vehicle.brand} {vehicle.model}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {vehicle.year} • {vehicle.tenant.companyName || vehicle.tenant.name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Posti</p>
                      <p className="font-semibold">{vehicle.seatCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Porte</p>
                      <p className="font-semibold">{vehicle.doorCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Fuel className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Carburante</p>
                      <p className="font-semibold">{vehicle.fuelType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Settings2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cambio</p>
                      <p className="font-semibold">{vehicle.transmission}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Extra Features */}
                {vehicle.features && vehicle.features.length > 0 && (
                  <>
                    <h3 className="font-semibold mb-3">Caratteristiche</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {vehicle.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          <Check className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                <Separator className="my-6" />

                {/* Branch Info */}
                <h3 className="font-semibold mb-3">Punto di ritiro</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{vehicle.branch.name}</p>
                      <p className="text-muted-foreground">{vehicle.branch.address}, {vehicle.branch.city}</p>
                      {vehicle.branch.phone && (
                        <p className="text-sm flex items-center gap-1 mt-2">
                          <Phone className="h-4 w-4" />
                          {vehicle.branch.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">€{pricing?.dailyPrice}</span>
                  <span className="text-muted-foreground">/giorno</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Ritiro</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(startDate), 'dd MMM', { locale: it })}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Consegna</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(endDate), 'dd MMM', { locale: it })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                {pricing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        €{pricing.dailyPrice} × {pricing.totalDays} giorni
                      </span>
                      <span>€{pricing.subtotal}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Totale</span>
                      <span className="text-primary">€{pricing.totalAmount}</span>
                    </div>
                  </div>
                )}

                {/* Franchise Info */}
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Franchigia</p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        €{Number(vehicle.franchiseAmount || 300)} (deposito cauzionale)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Book Button */}
                <Link
                  href={`/${locale}/checkout?vehicleId=${vehicleId}&startDate=${startDate}&endDate=${endDate}`}
                  className="block"
                >
                  <Button className="w-full h-12 text-lg" size="lg">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Prenota ora
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <p className="text-xs text-center text-muted-foreground">
                  Nessun costo ora. Pagamento alla conferma.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
