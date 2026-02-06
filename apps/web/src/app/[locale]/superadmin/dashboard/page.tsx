'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, TrendingUp, Gift, AlertTriangle, ChevronRight,
  DollarSign, Users, BarChart3, TrendingDown
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import dynamic from 'next/dynamic'

// Lazy-load recharts (heavy ~200KB charting library, not needed for SSR)
const RevenueBarChart = dynamic(
  () =>
    import('recharts').then((mod) => {
      const { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } = mod
      return {
        default: function RevenueBarChartInner({
          data,
          formatMonth,
          formatCurrency,
        }: {
          data: any[]
          formatMonth: (m: string) => string
          formatCurrency: (v: number, c?: string) => string
        }) {
          return (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} className="text-xs" />
                  <YAxis tickFormatter={(value) => `€${value}`} className="text-xs" />
                  <Tooltip
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Revenue']}
                    labelFormatter={(label) => formatMonth(label as string)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        },
      }
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg animate-pulse" />
    ),
  }
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Stats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  mrr: number
  newTenantsThisMonth: number
  totalReferrals: number
  qualifiedReferrals: number
}

interface RevenueAnalytics {
  totalRevenue: number
  mrr: number
  arr: number
  arpu: number
  churnRate: number
  activeSubscriptions: number
  subscriptionsByPlan: Array<{
    planName: string
    count: number
    price: number
    revenue: number
    currency?: string
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    subscriptions: number
  }>
  revenueByCurrency?: Record<string, number>
  mrrByCurrency?: Record<string, number>
  monthlyTrendByCurrency?: Record<string, Array<{ month: string; revenue: number }>>
}

interface Tenant {
  id: string
  name: string
  companyName: string
  isActive: boolean
  subscription: { plan: string; status: string } | null
  usage: { vehicles: number; maxVehicles: number; users: number; maxUsers: number }
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const [stats, setStats] = useState<Stats | null>(null)
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = () => localStorage.getItem('superadmin_token')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken()
        const headers = { Authorization: `Bearer ${token}` }
        
        const [statsRes, tenantsRes, revenueRes] = await Promise.all([
          fetch(`${API_URL}/admin/stats`, { headers }),
          fetch(`${API_URL}/admin/tenants`, { headers }),
          fetch(`${API_URL}/admin/revenue-analytics`, { headers }),
        ])

        if (!statsRes.ok || !tenantsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        setStats(await statsRes.json())
        setTenants(await tenantsRes.json())
        if (revenueRes.ok) {
          setRevenueAnalytics(await revenueRes.json())
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push(`/${locale}/superadmin/login`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, locale])

  const tenantsNearLimits = tenants.filter(t => 
    t.subscription && (
      (t.usage.vehicles / t.usage.maxVehicles) >= 0.8 ||
      (t.usage.users / t.usage.maxUsers) >= 0.8
    )
  )

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(value)
  }

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01')
    return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/${locale}/superadmin/tenants`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('dashboard.manageTenants')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.manageTenantsDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/${locale}/superadmin/referrals`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                {t('dashboard.referralProgram')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.referralProgramDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/${locale}/superadmin/plans`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                {t('dashboard.managePlans') || 'Manage Plans'}
              </CardTitle>
              <CardDescription>
                {t('dashboard.managePlansDesc') || 'Manage subscription plans and pricing'}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>


        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              {t('dashboard.thisMonth')}
            </CardTitle>
            <CardDescription>
              <span className="text-2xl font-bold text-green-600">+{stats?.newTenantsThisMonth || 0}</span> {t('dashboard.newTenants')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>


      {/* Revenue KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          {t('dashboard.revenueOverview') || 'Revenue Overview'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.totalRevenue') || 'Total Revenue'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(revenueAnalytics?.totalRevenue || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t('dashboard.allTime') || 'All time'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.arr') || 'ARR (Annual)'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(revenueAnalytics?.arr || 0)}
              </div>
              <p className="text-sm text-muted-foreground">MRR × 12</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.arpu') || 'ARPU'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(revenueAnalytics?.arpu || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t('dashboard.perTenant') || 'Per tenant/month'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.churnRate') || 'Churn Rate'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${(revenueAnalytics?.churnRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {(revenueAnalytics?.churnRate || 0).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">{t('dashboard.last30Days') || 'Last 30 days'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Currency */}
        {revenueAnalytics?.revenueByCurrency && Object.keys(revenueAnalytics.revenueByCurrency).length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-medium mb-3 text-muted-foreground">
              {t('dashboard.revenueByCurrency') || 'Revenue by Currency'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(revenueAnalytics.revenueByCurrency).map(([currency, amount]) => (
                <Card key={currency} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{currency}</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(amount, currency)}
                    </div>
                    {revenueAnalytics.mrrByCurrency?.[currency] && (
                      <div className="text-xs text-muted-foreground mt-1">
                        MRR: {formatCurrency(revenueAnalytics.mrrByCurrency[currency], currency)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Old Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t('dashboard.tenantsOverview') || 'Tenants Overview'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.totalTenants')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalTenants || 0}</div>
              <p className="text-sm text-muted-foreground">{stats?.activeTenants} {t('dashboard.active')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.trialTenants')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats?.trialTenants || 0}</div>
              <p className="text-sm text-muted-foreground">{t('dashboard.trialDays')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.mrr')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats?.mrr || 0)}</div>
              <p className="text-sm text-muted-foreground">{t('dashboard.mrrDesc')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('dashboard.referrals')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats?.qualifiedReferrals || 0}/{stats?.totalReferrals || 0}</div>
              <p className="text-sm text-muted-foreground">{t('dashboard.qualifiedTotal')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscriptions by Plan */}
      {revenueAnalytics?.subscriptionsByPlan && revenueAnalytics.subscriptionsByPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('dashboard.subscriptionsByPlan') || 'Active Subscriptions by Plan'}
            </CardTitle>
            <CardDescription>
              {revenueAnalytics.activeSubscriptions} {t('dashboard.activeSubscriptions') || 'active subscriptions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenueAnalytics.subscriptionsByPlan.map((plan, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{plan.count}</span>
                    </div>
                    <div>
                      <p className="font-medium">{plan.planName}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(plan.price)}/month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(plan.revenue)}</p>
                    <p className="text-xs text-muted-foreground">MRR</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Revenue Trend Chart */}
      {revenueAnalytics?.monthlyTrend && revenueAnalytics.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t('dashboard.monthlyTrend') || 'Monthly Revenue Trend'}
            </CardTitle>
            <CardDescription>{t('dashboard.last12Months') || 'Last 12 months'}</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueBarChart
              data={revenueAnalytics.monthlyTrend}
              formatMonth={formatMonth}
              formatCurrency={formatCurrency}
            />
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {tenantsNearLimits.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('dashboard.tenantsNearLimits')} ({tenantsNearLimits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenantsNearLimits.slice(0, 5).map(tenant => (
                <Link 
                  key={tenant.id} 
                  href={`/${locale}/superadmin/tenants/${tenant.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-background hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800"
                >
                  <span className="font-medium text-foreground">{tenant.companyName || tenant.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 border-0">
                      {tenant.usage.vehicles}/{tenant.usage.maxVehicles} {t('dashboard.vehicles')}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
