'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, Car, MapPin, CreditCard, ChevronRight, Search
} from 'lucide-react';
import { publicAuthApi } from '@/lib/public-api';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS, it, sq, es, fr, de, pt, el, ro } from 'date-fns/locale';

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  vehicle: {
    brand: string;
    model: string;
    category: string;
    photos: any;
  };
  tenant: {
    name: string;
    companyName: string | null;
  };
  pickupBranch: {
    name: string;
    city: string;
    address: string;
  } | null;
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
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

export default function CustomerBookingsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('CustomerPortal.bookings');
  
  const dateLocale = localeMap[locale] || enUS;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadBookings = async () => {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        router.push(`/${locale}/customer/login`);
        return;
      }

      try {
        setLoading(true);
        const data = await publicAuthApi.getBookings(page, 10);
        setBookings(data.bookings || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        router.push(`/${locale}/customer/login`);
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [locale, router, page]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

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
        {bookings.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('noBookings')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('noBookingsDesc')}
              </p>
              <Link href={`/${locale}/customer/search`}>
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  {t('searchVehicles')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Vehicle Image */}
                      <div className="w-full md:w-48 h-32 md:h-auto bg-muted flex-shrink-0">
                        {booking.vehicle.photos?.[0]?.url ? (
                          <img
                            src={booking.vehicle.photos[0].url}
                            alt={`${booking.vehicle.brand} ${booking.vehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {booking.vehicle.brand} {booking.vehicle.model}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {booking.tenant?.companyName || booking.tenant?.name}
                            </p>
                          </div>
                          <Badge className={statusColors[booking.status] || 'bg-gray-100'}>
                            {t(`status.${booking.status}`)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-muted-foreground">{t('from')} </span>
                              <span className="font-medium">
                                {format(new Date(booking.startDate), 'dd MMM yyyy', { locale: dateLocale })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-muted-foreground">{t('to')} </span>
                              <span className="font-medium">
                                {format(new Date(booking.endDate), 'dd MMM yyyy', { locale: dateLocale })}
                              </span>
                            </div>
                          </div>
                          {booking.pickupBranch && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.pickupBranch.city}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-bold">€{Number(booking.totalAmount)}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1">
                            {t('details')}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('previous')}
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {t('pageOf', { current: page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
