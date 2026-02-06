'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CautionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string
  const t = useTranslations('Cautions')
  const tc = useTranslations('Common')

  const { data: caution, isLoading } = useQuery({
    queryKey: ['caution', id],
    queryFn: async () => {
      const response = await api.get(`/cautions/${id}`)
      return response.data
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{t('pending')}</Badge>
      case 'HELD':
        return <Badge variant="default">{t('held')}</Badge>
      case 'RELEASED':
        return <Badge variant="secondary">{t('released')}</Badge>
      case 'CHARGED':
      case 'FULLY_CHARGED':
        return <Badge variant="destructive">{t('charged')}</Badge>
      case 'PARTIALLY_CHARGED':
        return <Badge variant="outline">{t('partiallyCharged')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    )
  }

  if (!caution) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{tc('notFound')}</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t('details')}</h2>
            <p className="text-muted-foreground">ID: {id}</p>
          </div>
        </div>
        <Link href={`/${locale}/cautions/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> {tc('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('cautionInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tc('amount')}</span>
              <span className="font-semibold">{formatCurrency(caution.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tc('status')}</span>
              {getStatusBadge(caution.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('paymentMethod')}</span>
              <span>{(() => {
                const method = caution.paymentMethod
                const methodKey = method?.toLowerCase().replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase()) as 'cash' | 'bankTransfer' | 'paysera'
                return t(`paymentMethods.${methodKey}`) || method?.replace('_', ' ')
              })()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('heldDate')}</span>
              <span>{formatDate(caution.heldAt)}</span>
            </div>
            {caution.releasedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('releasedDate')}</span>
                <span>{formatDate(caution.releasedAt)}</span>
              </div>
            )}
            {caution.chargedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('chargedDate')}</span>
                <span>{formatDate(caution.chargedAt)}</span>
              </div>
            )}
            {caution.chargedAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('chargedAmount')}</span>
                <span className="font-semibold text-red-600">{formatCurrency(caution.chargedAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc('bookingInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {caution.booking?.customer && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('customer')}</span>
                  <span>{caution.booking.customer.firstName} {caution.booking.customer.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('email')}</span>
                  <span>{caution.booking.customer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('phone')}</span>
                  <span>{caution.booking.customer.phone}</span>
                </div>
              </>
            )}
            {caution.booking?.vehicle && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('vehicle')}</span>
                  <span>{caution.booking.vehicle.brand} {caution.booking.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('licensePlate')}</span>
                  <span>{caution.booking.vehicle.licensePlate}</span>
                </div>
              </>
            )}
            {caution.booking?.id && (
              <div className="pt-2">
                <Link href={`/${locale}/bookings/${caution.booking.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    {tc('viewBooking')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
