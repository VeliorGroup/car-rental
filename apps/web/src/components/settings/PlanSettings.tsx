'use client'

import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { PiCheck } from 'react-icons/pi'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { getCountryCodeForLocale } from '@/lib/constants/locale-country'

interface Feature {
  id: string
  name: string
  displayName: string
  description?: string
  icon?: string
}

interface Plan {
  id: string
  name: string
  price: number
  yearlyPrice: number
  currency: string
  billingPeriod: string
  features: Feature[]
  maxVehicles: number
  maxUsers: number
  maxLocations: number
  displayName?: string
  description?: string
  isPopular?: boolean
  isContact?: boolean
}

export function PlanSettings() {
  const t = useTranslations('Settings')
  const locale = useLocale()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const countryCode = getCountryCodeForLocale(locale)
        const response = await api.get('/subscriptions/plans', {
          params: { countryCode }
        })
        const fetchedPlans = response.data.map((plan: any) => ({
          ...plan,
          features: plan.features || [],
          isPopular: plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('professional'),
          isContact: plan.name.toLowerCase().includes('enterprise')
        }))
        
        const sortedPlans = fetchedPlans.sort((a: Plan, b: Plan) => {
          if (a.isContact && !b.isContact) return 1
          if (!a.isContact && b.isContact) return -1
          return a.price - b.price
        })
        setPlans(sortedPlans)
      } catch (error) {
        console.error('Failed to fetch plans:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [locale])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-medium">{t('plan.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('plan.description')}</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium transition-colors ${billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t('plan.monthly')}
          </span>
          <Switch
            checked={billingInterval === 'yearly'}
            onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`text-sm font-medium transition-colors ${billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t('plan.yearly')}
          </span>
          {billingInterval === 'yearly' && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {t('plan.savePercent')}
            </Badge>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`rounded-lg border bg-card p-6 shadow-sm flex flex-col ${
              plan.isPopular ? 'border-primary relative' : ''
            } ${plan.isContact ? 'items-center text-center' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {t('plan.popular')}
              </div>
            )}
            <div className="mb-4">
              <p className="font-medium text-lg">{plan.displayName || plan.name}</p>
              {plan.isContact ? (
                <p className="text-3xl font-bold mt-2">{t('plan.customPrice')}</p>
              ) : (
                <div className="mt-2">
                  <p className="text-3xl font-bold">
                    €{billingInterval === 'yearly' ? Math.round(Number(plan.yearlyPrice) / 12) : Number(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">{t('plan.perMonth')}</span>
                  </p>
                  {billingInterval === 'yearly' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('plan.billedYearly', { total: Number(plan.yearlyPrice) })}
                    </p>
                  )}
                </div>
              )}
            </div>
            <ul className={`space-y-2 text-sm text-muted-foreground flex-1 ${plan.isContact ? 'mb-6 text-left w-full' : ''}`}>
              <li className="flex items-center gap-2">
                <PiCheck className="h-4 w-4 text-primary" />
                {plan.isContact 
                  ? t('plan.featureList.unlimitedVehicles')
                  : t('plan.featureList.vehicles', {count: plan.maxVehicles})
                }
              </li>
              <li className="flex items-center gap-2">
                <PiCheck className="h-4 w-4 text-primary" />
                {plan.isContact 
                  ? t('plan.featureList.unlimitedUsers')
                  : t('plan.featureList.users', {count: plan.maxUsers})
                }
              </li>
              <li className="flex items-center gap-2">
                <PiCheck className="h-4 w-4 text-primary" />
                {plan.isContact 
                  ? t('plan.featureList.dedicatedSupport')
                  : t('plan.featureList.locations', {count: plan.maxLocations})
                }
              </li>
            </ul>
            {plan.isContact ? (
              <Button className="w-full" variant="secondary" onClick={() => window.location.href = 'mailto:sales@example.com'}>
                {t('plan.contactSales')}
              </Button>
            ) : plan.isPopular ? (
              <Button className="mt-6 w-full">{t('plan.active')}</Button>
            ) : (
              <Button className="mt-6 w-full" variant="outline">{t('plan.upgrade')}</Button>
            )}
          </div>
        ))}
        </div>
    </div>
  )
}
