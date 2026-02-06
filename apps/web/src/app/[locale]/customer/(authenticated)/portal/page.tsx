'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Mail, Phone, Calendar, Car,
  ChevronRight, Search,
  CalendarCheck, CalendarClock, History, Edit, Settings
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
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CHECKED_OUT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CHECKED_IN: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
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

export default function CustomerPortalPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('CustomerPortal.dashboard');
  const tBookings = useTranslations('CustomerPortal.bookings');
  const tCommon = useTranslations('CustomerPortal.common');
  const tProfile = useTranslations('CustomerPortal.profile');

  const dateLocale = localeMap[locale] || enUS;

  const [customer, setCustomer] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        router.push(`/${locale}/customer/login`);
        return;
      }

      try {
        const [profile, bookingsData, allBookingsData] = await Promise.all([
          publicAuthApi.getProfile(),
          publicAuthApi.getBookings(1, 5),
          publicAuthApi.getBookings(1, 100),
        ]);
        setCustomer(profile);
        setBookings(bookingsData.bookings || []);
        setAllBookings(allBookingsData.bookings || []);
      } catch (error) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        router.push(`/${locale}/customer/login`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [locale, router]);

  const stats = {
    total: allBookings.length,
    active: allBookings.filter(b => b.status === 'CHECKED_OUT').length,
    upcoming: allBookings.filter(b => b.status === 'CONFIRMED').length,
    completed: allBookings.filter(b => b.status === 'CHECKED_IN').length,
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Profile Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {customer?.firstName?.[0]}{customer?.lastName?.[0]}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {t('hello', { name: customer?.firstName || '' })} 👋
              </h1>
              {customer?.isVerified && (
                <Badge variant="secondary" className="text-xs">{t('verified')}</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{customer?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/customer/profile`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              {t('editProfile')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('stats.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarClock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">{t('stats.active')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CalendarCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">{t('stats.confirmed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/5 to-gray-500/10 border-gray-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <History className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">{t('stats.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">{t('recentBookings')}</CardTitle>
            <CardDescription>{t('recentBookingsDesc')}</CardDescription>
          </div>
          <Link href={`/${locale}/customer/bookings`}>
            <Button variant="ghost" size="sm" className="gap-1">
              {t('viewAll')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('noBookings')}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t('noBookingsDesc')}
              </p>
              <Link href={`/${locale}/customer/search`}>
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  {t('searchCar')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header - hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">{t('tableHeaders.vehicle')}</div>
                <div className="col-span-3">{t('tableHeaders.dates')}</div>
                <div className="col-span-2">{t('tableHeaders.location')}</div>
                <div className="col-span-2 text-right">{t('tableHeaders.amount')}</div>
                <div className="col-span-1 text-right">{t('tableHeaders.status')}</div>
              </div>
              
              {/* Rows */}
              <div className="space-y-1">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="rounded-md text-sm transition-colors hover:bg-muted/50"
                  >
                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3 items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {booking.vehicle.photos?.[0]?.url ? (
                            <img
                              src={booking.vehicle.photos[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">{booking.vehicle.brand} {booking.vehicle.model}</span>
                          <p className="text-xs text-muted-foreground">
                            {booking.tenant?.companyName || booking.tenant?.name}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3 text-muted-foreground">
                        {format(new Date(booking.startDate), 'dd MMM', { locale: dateLocale })} - {format(new Date(booking.endDate), 'dd MMM yyyy', { locale: dateLocale })}
                      </div>
                      <div className="col-span-2 text-muted-foreground">
                        {booking.pickupBranch?.city || '-'}
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        €{Number(booking.totalAmount)}
                      </div>
                      <div className="col-span-1 text-right">
                        <Badge className={`${statusColors[booking.status]} text-xs`}>
                          {tBookings(`status.${booking.status}`)}
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="md:hidden p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {booking.vehicle.photos?.[0]?.url ? (
                            <img
                              src={booking.vehicle.photos[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{booking.vehicle.brand} {booking.vehicle.model}</span>
                            <Badge className={`${statusColors[booking.status]} text-xs flex-shrink-0`}>
                              {tBookings(`status.${booking.status}`)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(booking.startDate), 'dd/MM')} - {format(new Date(booking.endDate), 'dd/MM/yy')}</span>
                            <span className="font-medium text-foreground">€{Number(booking.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{tCommon('email')}</p>
                <p className="font-medium">{customer?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{tCommon('phone')}</p>
                <p className="font-medium">{customer?.phone || tProfile('notSpecified')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{tProfile('memberSince')}</p>
                <p className="font-medium">
                  {customer?.createdAt 
                    ? format(new Date(customer.createdAt), 'MMMM yyyy', { locale: dateLocale })
                    : 'N/D'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t('quickActions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${locale}/customer/search`} className="block">
              <Button variant="outline" className="w-full justify-between h-12">
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {t('searchAndBook')}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/customer/bookings`} className="block">
              <Button variant="outline" className="w-full justify-between h-12">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('manageBookings')}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${locale}`} className="block">
              <Button variant="outline" className="w-full justify-between h-12">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('goToHomepage')}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
