'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Gift, Trophy, ChevronRight,
  CheckCircle, Clock, DollarSign
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ReferralStats {
  total: number
  pending: number
  qualified: number
  paidOut: number
  topReferrers: Array<{
    id: string
    name: string
    companyName: string
    referralCode: string
    _count: { referrals: number }
  }>
}

interface Referral {
  id: string
  status: string
  createdAt: string
  referrer: { id: string; name: string; companyName: string }
  referred: { id: string; name: string; companyName: string; createdAt: string }
}

export default function ReferralsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = () => localStorage.getItem('superadmin_token')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken()
        const headers = { Authorization: `Bearer ${token}` }
        
        const [statsRes, referralsRes] = await Promise.all([
          fetch(`${API_URL}/admin/referrals/stats`, { headers }),
          fetch(`${API_URL}/admin/referrals`, { headers }),
        ])

        if (!statsRes.ok || !referralsRes.ok) throw new Error('Failed')

        setStats(await statsRes.json())
        setReferrals(await referralsRes.json())
      } catch {
        router.push(`/${locale}/superadmin/login`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, locale])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUALIFIED':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />{t('referrals.qualified')}</Badge>
      case 'PAID_OUT':
        return <Badge className="bg-blue-600"><DollarSign className="h-3 w-3 mr-1" />{t('referrals.paidOut')}</Badge>
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('referrals.pending')}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    )
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('referrals.totalReferrals')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('referrals.pending')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('referrals.qualified')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.qualified || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('referrals.paidOut')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.paidOut || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {t('referrals.topReferrers')}
            </CardTitle>
            <CardDescription>{t('referrals.leaderboard')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topReferrers?.map((referrer, index) => (
                <Link key={referrer.id} href={`/${locale}/superadmin/tenants/${referrer.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500 text-black' : 
                          index === 1 ? 'bg-gray-400 text-black' : 
                          index === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{referrer.companyName || referrer.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{referrer.referralCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600">{referrer._count.referrals}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
              {(!stats?.topReferrers || stats.topReferrers.length === 0) && (
                <p className="text-muted-foreground text-center py-4">{t('referrals.noReferrers')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Referrals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              {t('referrals.allReferrals') || 'All Referrals'}
            </CardTitle>
            <CardDescription>{referrals.length} {t('referrals.total') || 'total'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {referrals.map(referral => (
                <div key={referral.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{t('referrals.referrer')}</p>
                      <Link href={`/${locale}/superadmin/tenants/${referral.referrer.id}`} className="hover:text-primary">
                        {referral.referrer.companyName || referral.referrer.name}
                      </Link>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{t('referrals.referred')}</p>
                      <Link href={`/${locale}/superadmin/tenants/${referral.referred.id}`} className="hover:text-primary">
                        {referral.referred.companyName || referral.referred.name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(referral.createdAt).toLocaleDateString('it-IT')}

                    </span>
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <p className="text-muted-foreground text-center py-8">{t('referrals.noReferrals')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
