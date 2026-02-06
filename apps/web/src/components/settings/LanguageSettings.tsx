'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PiMapPin } from 'react-icons/pi'

export function LanguageSettings() {
  const t = useTranslations('Settings')

  // Get user's country from registration (read-only, stored in localStorage during registration)
  const userCountry = typeof window !== 'undefined' ? localStorage.getItem('selectedCountry') || 'GB' : 'GB'
  const userCurrency = typeof window !== 'undefined' ? localStorage.getItem('selectedCurrency') || 'EUR' : 'EUR'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('language.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('language.description')}
        </p>
      </div>

      {/* Country Info - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiMapPin className="h-5 w-5" />
            {t('language.country')}
          </CardTitle>
          <CardDescription>
            {t('language.countryReadOnly')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('language.countryLabel')}</span>
              <span className="text-sm font-medium">{userCountry}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('language.currencyLabel')}</span>
              <span className="text-sm font-medium">{userCurrency}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

