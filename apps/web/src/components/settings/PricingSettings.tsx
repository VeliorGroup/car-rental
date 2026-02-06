'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import { PiCurrencyDollar, PiFloppyDisk } from 'react-icons/pi'
import api from '@/lib/api'

interface PricingMatrix {
  [category: string]: {
    [season: string]: number
  }
}

const CATEGORIES = ['ECONOMY', 'COMPACT', 'MIDSIZE', 'FULLSIZE', 'SUV', 'LUXURY', 'VAN']
const SEASONS = ['LOW', 'MEDIUM', 'HIGH']

// Default pricing if none exists
const DEFAULT_PRICING: PricingMatrix = {
  ECONOMY: { LOW: 25, MEDIUM: 35, HIGH: 45 },
  COMPACT: { LOW: 30, MEDIUM: 40, HIGH: 55 },
  MIDSIZE: { LOW: 40, MEDIUM: 55, HIGH: 70 },
  FULLSIZE: { LOW: 50, MEDIUM: 65, HIGH: 85 },
  SUV: { LOW: 60, MEDIUM: 80, HIGH: 100 },
  LUXURY: { LOW: 100, MEDIUM: 150, HIGH: 200 },
  VAN: { LOW: 70, MEDIUM: 90, HIGH: 120 },
}

export function PricingSettings() {
  const t = useTranslations('Settings')
  const tc = useTranslations('Common')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [pricing, setPricing] = useState<PricingMatrix>(DEFAULT_PRICING)
  const [hasChanges, setHasChanges] = useState(false)

  const { isLoading, data } = useQuery({
    queryKey: ['pricing-matrix'],
    queryFn: async () => {
      try {
        const response = await api.get('/vehicles/pricing')
        const pricingData = response.data as Array<{ category: string; season: string; dailyPrice: number | string }>
        if (pricingData && pricingData.length > 0) {
          // Convert flat array to matrix format
          const matrix: PricingMatrix = { ...DEFAULT_PRICING }
          pricingData.forEach((p) => {
            if (matrix[p.category]) {
              matrix[p.category][p.season] = Number(p.dailyPrice)
            }
          })
          return matrix
        }
      } catch {
        // If endpoint not available, use defaults
      }
      return DEFAULT_PRICING
    },
  })

  // Initialize pricing from fetched data
  useEffect(() => {
    if (data) {
      setPricing(data as PricingMatrix)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (data: PricingMatrix) => {
      // Convert matrix to flat array for backend
      const pricingArray = Object.entries(data).flatMap(([category, seasons]) =>
        Object.entries(seasons).map(([season, dailyPrice]) => ({
          category,
          season,
          dailyPrice: String(dailyPrice),
          validFrom: new Date().toISOString(),
          validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        }))
      )
      await api.post('/vehicles/pricing', pricingArray)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix'] })
      toast({ title: t('pricing.saveSuccess') || 'Pricing saved successfully' })
      setHasChanges(false)
    },
    onError: () => {
      toast({ 
        title: t('pricing.saveError') || 'Error saving pricing', 
        variant: 'destructive' 
      })
    },
  })

  const handlePriceChange = (category: string, season: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setPricing(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [season]: numValue,
      },
    }))
    setHasChanges(true)
  }

  const getCategoryLabel = (category: string) => {
    return t(`pricing.categories.${category.toLowerCase()}`) || category
  }

  const getSeasonLabel = (season: string) => {
    return t(`pricing.seasons.${season.toLowerCase()}`) || season
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader  />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('pricing.title') || 'Pricing Rules'}</h3>
        <p className="text-sm text-muted-foreground">
          {t('pricing.description') || 'Set base daily rental prices by vehicle category and season.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiCurrencyDollar className="h-5 w-5" />
            {t('pricing.basePricing') || 'Base Pricing Matrix'}
          </CardTitle>
          <CardDescription>
            {t('pricing.basePricingDesc') || 'Daily rental prices in EUR for each vehicle category and season.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-sm border-b">
                    {t('pricing.category') || 'Category'}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-sm border-b">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success">
                      {getSeasonLabel('LOW')}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-sm border-b">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning">
                      {getSeasonLabel('MEDIUM')}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-sm border-b">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive">
                      {getSeasonLabel('HIGH')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((category, idx) => (
                  <tr key={category} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/30'}`}>
                    <td className="px-4 py-3 font-medium">{getCategoryLabel(category)}</td>
                    {SEASONS.map(season => (
                      <td key={season} className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-background rounded-md border px-2 py-1">
                          <span className="text-muted-foreground text-sm">€</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-20 h-8 text-center border-0 bg-transparent p-0 focus:ring-0"
                            value={pricing[category]?.[season] || 0}
                            onChange={(e) => handlePriceChange(category, season, e.target.value)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => saveMutation.mutate(pricing)} 
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader className="mr-2" />
              ) : (
                <PiFloppyDisk className="mr-2 h-4 w-4" />
              )}
              {tc('save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pricing.seasonDates') || 'Season Dates'}</CardTitle>
          <CardDescription>
            {t('pricing.seasonDatesDesc') || 'Define when each season applies. Prices will be calculated automatically.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-green-600 font-medium">{getSeasonLabel('LOW')}</Label>
              <p className="text-sm text-muted-foreground">Nov 1 - Mar 31</p>
            </div>
            <div className="space-y-2">
              <Label className="text-yellow-600 font-medium">{getSeasonLabel('MEDIUM')}</Label>
              <p className="text-sm text-muted-foreground">Apr 1 - May 31, Oct 1 - Oct 31</p>
            </div>
            <div className="space-y-2">
              <Label className="text-red-600 font-medium">{getSeasonLabel('HIGH')}</Label>
              <p className="text-sm text-muted-foreground">Jun 1 - Sep 30</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {t('pricing.seasonNote') || 'Contact support to customize season date ranges.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
