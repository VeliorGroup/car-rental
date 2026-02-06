import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PiCopy, PiGift, PiUsers, PiTrophy } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

export function ReferralsSettingsTab() {
  const queryClient = useQueryClient()
  const t = useTranslations('Settings')
  const { toast } = useToast()
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: async () => {
      const res = await api.get('/tenants/me/referrals')
      return res.data
    }
  })

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tenants/me/referrals/regenerate')
      return res.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['referrals', 'stats'], (old: any) => ({
        ...old,
        referralCode: data.referralCode
      }))
      toast({
        title: t('referrals.toast.success'),
        description: t('referrals.toast.desc'), // You might want to update this translation key if needed for generic success
      })
    },
    onError: (error: any) => {
       console.error('Regenerate error:', error);
       let errorMessage = "Failed to generate code";
       
       const message = error.response?.data?.message;
       if (typeof message === 'string') {
           // Check if it's a JSON string
           if (message.startsWith('{')) {
               try {
                   const parsed = JSON.parse(message);
                   errorMessage = parsed.message || parsed.error || message;
               } catch {
                   errorMessage = message;
               }
           } else {
               errorMessage = message;
           }
       } else if (Array.isArray(message)) {
           errorMessage = message.join(', ');
       } else if (typeof message === 'object' && message !== null) {
           errorMessage = message.message || JSON.stringify(message);
       } else if (typeof error.message === 'string') {
           errorMessage = error.message;
       }

       toast({
        variant: 'destructive',
        title: "Error",
        description: errorMessage
       })
    }
  })

  const copyToClipboard = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode)
      toast({
        title: t('referrals.toast.copied'),
        description: t('referrals.toast.desc'),
      })
    }
  }

  const handleGenerate = () => {
     regenerateMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader  />
      </div>
    )
  }

  const qualifiedCount = stats?.qualifiedReferrals || 0
  const progress = (qualifiedCount % 5) / 5 * 100
  const yearsEarned = Math.floor(qualifiedCount / 5)
  const referralsNeeded = 5 - (qualifiedCount % 5)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('referrals.freeYears')}</CardTitle>
            <PiTrophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearsEarned}</div>
            <p className="text-xs text-muted-foreground">
              {t('referrals.totalValue', {value: yearsEarned * 600})}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('referrals.qualifiedReferrals')}</CardTitle>
            <PiUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifiedCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('referrals.payingCustomers')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('referrals.title')}</CardTitle>
          <CardDescription>
            {t('referrals.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('referrals.yourCode')}</h3>
            
            {stats?.referralCode ? (
                <div className="flex items-center gap-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xl font-semibold">
                    {stats.referralCode}
                </code>
                <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                    <PiCopy className="h-4 w-4" />
                </Button>
                <div className="ml-auto">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerate} 
                        disabled={regenerateMutation.isPending}
                    >
                        {regenerateMutation.isPending && <Loader className="mr-2" />}
                        {t('referrals.regenerateCode')}
                    </Button>
                </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Button onClick={handleGenerate} disabled={regenerateMutation.isPending}>
                        {regenerateMutation.isPending && <Loader className="mr-2" />}
                        {t('referrals.generateCode')}
                    </Button>
                </div>
            )}
            
            <p className="text-sm text-muted-foreground mt-2">
              {t('referrals.shareCode')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('referrals.progress')}</span>
              <span className="text-muted-foreground">{t('referrals.moreNeeded', {count: referralsNeeded})}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PiGift className="h-4 w-4 text-primary" />
              <span>{t('referrals.progressStatus', {current: qualifiedCount % 5, total: 5})}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
