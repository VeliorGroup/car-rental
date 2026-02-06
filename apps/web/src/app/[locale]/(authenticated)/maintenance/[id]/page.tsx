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

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string
  const t = useTranslations('Maintenance')
  const tc = useTranslations('Common')

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const response = await api.get(`/maintenance/${id}`)
      return response.data
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{t('status.pending')}</Badge>
      case 'SCHEDULED':
        return <Badge variant="secondary">{t('status.scheduled')}</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default">{t('status.inProgress')}</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">{t('status.completed')}</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">{t('status.cancelled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="secondary">{t('priority.low')}</Badge>
      case 'MEDIUM':
        return <Badge variant="default">{t('priority.medium')}</Badge>
      case 'HIGH':
        return <Badge variant="destructive">{t('priority.high')}</Badge>
      case 'URGENT':
        return <Badge className="bg-red-600">{t('priority.urgent')}</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    )
  }

  if (!maintenance) {
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
        <Link href={`/${locale}/maintenance/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> {tc('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('maintenanceInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('title')}</span>
              <span className="font-semibold">{maintenance.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('type')}</span>
              <span>{(() => {
                const type = maintenance.type
                const typeKey = type?.toLowerCase().replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase()) as 'routine' | 'repair' | 'inspection' | 'tireChange' | 'oilChange' | 'other'
                return t(`types.${typeKey}`) || type?.replace('_', ' ')
              })()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tc('status')}</span>
              {getStatusBadge(maintenance.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('priorityLabel')}</span>
              {getPriorityBadge(maintenance.priority)}
            </div>
            {maintenance.scheduledFor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('scheduledFor')}</span>
                <span>{formatDate(maintenance.scheduledFor)}</span>
              </div>
            )}
            {maintenance.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('completedAt')}</span>
                <span>{formatDate(maintenance.completedAt)}</span>
              </div>
            )}
            {maintenance.cost && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cost')}</span>
                <span className="font-semibold">{formatCurrency(maintenance.cost)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc('vehicle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenance.vehicle && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('vehicle')}</span>
                  <span>{maintenance.vehicle.brand} {maintenance.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tc('licensePlate')}</span>
                  <span>{maintenance.vehicle.licensePlate}</span>
                </div>
                <div className="pt-2">
                  <Link href={`/${locale}/vehicles/${maintenance.vehicle.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      {tc('viewVehicle')}
                    </Button>
                  </Link>
                </div>
              </>
            )}
            {maintenance.mechanic && (
              <div className="flex justify-between pt-4 border-t">
                <span className="text-muted-foreground">{t('mechanic')}</span>
                <span>{maintenance.mechanic.firstName} {maintenance.mechanic.lastName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {maintenance.description && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{tc('description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{maintenance.description}</p>
            </CardContent>
          </Card>
        )}

        {maintenance.notes && maintenance.notes.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{tc('notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {maintenance.notes.map((note: string, index: number) => (
                  <li key={index} className="text-sm">{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
