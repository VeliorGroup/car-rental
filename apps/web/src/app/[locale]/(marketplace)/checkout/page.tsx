'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, MapPin, Car, ArrowLeft, Shield, CreditCard, 
  Check, Loader2, AlertCircle, ExternalLink
} from 'lucide-react';
import { searchApi, publicBookingsApi } from '@/lib/public-api';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const t = useTranslations('Checkout');

  const vehicleId = searchParams.get('vehicleId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const [vehicle, setVehicle] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if customer is logged in
    const token = localStorage.getItem('customerToken');
    setIsLoggedIn(!!token);

    // Load vehicle and pricing
    const loadData = async () => {
      if (!vehicleId || !startDate || !endDate) {
        setError(t('errors.missingParams'));
        setLoading(false);
        return;
      }

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
      } catch (err) {
        setError(t('errors.loadError'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [vehicleId, startDate, endDate]);

  const handleBooking = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/${locale}/customer/login?redirect=${returnUrl}`);
      return;
    }

    if (!acceptedTerms) {
      setError(t('errors.termsRequired'));
      return;
    }

    setBooking(true);
    setError('');

    try {
      const response = await publicBookingsApi.createBooking({
        vehicleId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        pickupBranchId: vehicle?.branch?.id,
      });

      // Redirect to Paysera payment
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        // If no payment URL, redirect to success
        router.push(`/${locale}/customer/bookings/${response.booking.id}/success`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.bookingError'));
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicle || !pricing) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t('errors.loadError')}</h1>
        <p className="text-muted-foreground mb-6">{error || t('errors.vehicleNotFound')}</p>
        <Link href={`/${locale}`}>
          <Button>{t('backToSearch')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t('vehicleSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div className="w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={vehicle.photos?.[0]?.url || '/placeholder-car.jpg'}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-muted-foreground">
                      {vehicle.tenant?.companyName || vehicle.tenant?.name}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{vehicle.category}</Badge>
                      <Badge variant="secondary">{vehicle.transmission}</Badge>
                      <Badge variant="secondary">{vehicle.fuelType}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates & Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('datesLocation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('pickup')}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(startDate), 'EEEE d MMMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('return')}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(endDate), 'EEEE d MMMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{vehicle.branch?.name}</p>
                    <p className="text-muted-foreground">
                      {vehicle.branch?.address}, {vehicle.branch?.city}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Login Prompt */}
            {!isLoggedIn && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('loginRequired')}{' '}
                  <Link 
                    href={`/${locale}/customer/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                    className="font-medium text-primary underline"
                  >
                    {t('loginNow')}
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {/* Terms & Conditions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    {t('terms.accept')}{' '}
                    <Link href="/terms" className="text-primary underline">
                      {t('terms.termsConditions')}
                    </Link>{' '}
                    {t('terms.and')}{' '}
                    <Link href="/privacy" className="text-primary underline">
                      {t('terms.privacyPolicy')}
                    </Link>
                    . {t('terms.confirm')}
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Price Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <CardHeader>
                <CardTitle>{t('priceSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      €{pricing.dailyPrice} × {pricing.totalDays} {t('days')}
                    </span>
                    <span>€{pricing.subtotal}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span className="text-primary">€{pricing.totalAmount}</span>
                </div>

                {/* Franchise */}
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        {t('deposit.title')}
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        €{Number(vehicle.franchiseAmount || 300)} {t('deposit.atPickup')}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full h-12 text-lg"
                  size="lg"
                  onClick={handleBooking}
                  disabled={booking || (!isLoggedIn)}
                >
                  {booking ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      {isLoggedIn ? t('payAndBook') : t('loginToBook')}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  {t('securePayment')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
