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

export default function DamageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string
  const t = useTranslations('Damages')
  const tc = useTranslations('Common')

  const { data: damage, isLoading } = useQuery({
    queryKey: ['damage', id],
    queryFn: async () => {
      const response = await api.get(`/damages/${id}`)
      return response.data
    },
  })

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'MINOR':
        return <Badge variant="secondary">{t('severity.minor')}</Badge>
      case 'MODERATE':
        return <Badge variant="default">{t('severity.moderate')}</Badge>
      case 'MAJOR':
        return <Badge variant="destructive">{t('severity.major')}</Badge>
      case 'TOTAL_LOSS':
        return <Badge variant="destructive">{t('severity.totalLoss')}</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return <Badge variant="outline">{t('status.reported')}</Badge>
      case 'UNDER_REVIEW':
        return <Badge variant="secondary">{t('status.underReview')}</Badge>
      case 'CONFIRMED':
        return <Badge variant="default">{t('status.confirmed')}</Badge>
      case 'DISPUTED':
        return <Badge variant="destructive">{t('status.disputed')}</Badge>
      case 'RESOLVED':
        return <Badge className="bg-green-500">{t('status.resolved')}</Badge>
      case 'CHARGED':
        return <Badge className="bg-blue-500">{t('status.charged')}</Badge>
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

  if (!damage) {
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
        <Link href={`/${locale}/damages/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> {tc('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('damageInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tc('description')}</span>
              <span className="text-right max-w-[200px]">{damage.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('type')}</span>
              <span>{damage.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('position')}</span>
              <span>{damage.position}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('severity.severity')}</span>
              {getSeverityBadge(damage.severity)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tc('status')}</span>
              {getStatusBadge(damage.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('estimatedCost')}</span>
              <span>{damage.estimatedCost ? formatCurrency(damage.estimatedCost) : '-'}</span>
            </div>
            {damage.actualCost && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('actualCost')}</span>
                <span className="font-semibold">{formatCurrency(damage.actualCost)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reported')}</span>
              <span>{formatDate(damage.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc('vehicleAndBooking')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {damage.vehicle && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('vehicle')}</span>
                  <span>{damage.vehicle.brand} {damage.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('licensePlate')}</span>
                  <span>{damage.vehicle.licensePlate}</span>
                </div>
              </>
            )}
            {damage.booking?.customer && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('customer')}</span>
                  <span>{damage.booking.customer.firstName} {damage.booking.customer.lastName}</span>
                </div>
              </>
            )}
            {damage.booking?.id && (
              <div className="pt-2">
                <Link href={`/${locale}/bookings/${damage.booking.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    {tc('viewBooking')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {damage.disputed && (
          <Card className="md:col-span-2 border-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-600">{t('disputeInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-muted-foreground">{t('disputeReason')}</span>
                <p className="mt-1">{damage.disputeReason || '-'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {damage.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{tc('notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{damage.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
