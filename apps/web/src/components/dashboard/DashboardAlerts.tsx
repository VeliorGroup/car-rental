'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Loader } from '@/components/ui/loader'

interface DashboardAlertsProps {
  stats: {
    expiringLicenses: number
    expiringInsurances: number
  } | undefined
  isLoading: boolean
}

export function DashboardAlerts({ stats, isLoading }: DashboardAlertsProps) {
  const t = useTranslations('Dashboard')

  if (isLoading) {
    return (
      <Card className="min-h-[200px]">
        <CardHeader>
          <CardTitle className="text-base">{t('alertsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[120px]">
          <Loader  />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="min-h-[200px]">
      <CardHeader>
        <CardTitle className="text-base">{t('alertsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(!stats?.expiringLicenses && !stats?.expiringInsurances) ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noAlerts')}
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.expiringLicenses > 0 && (
                <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('expiringLicenses', { count: stats.expiringLicenses })}</span>
                </div>
              )}
              {stats?.expiringInsurances > 0 && (
                <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('expiringInsurances', { count: stats.expiringInsurances })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
