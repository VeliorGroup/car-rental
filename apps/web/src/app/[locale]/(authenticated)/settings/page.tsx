'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/store/auth'
import dynamic from 'next/dynamic'

// Lazy-load settings tab components (only one tab is visible at a time)
const TabLoader = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

const ProfileSettings = dynamic(
  () => import('@/components/settings/ProfileSettings').then(mod => mod.ProfileSettings),
  { loading: TabLoader }
)
const CompanySettings = dynamic(
  () => import('@/components/settings/CompanySettings').then(mod => mod.CompanySettings),
  { loading: TabLoader }
)
const LanguageSettings = dynamic(
  () => import('@/components/settings/LanguageSettings').then(mod => mod.LanguageSettings),
  { loading: TabLoader }
)
const UsersSettingsTab = dynamic(
  () => import('@/components/settings/UsersSettingsTab').then(mod => mod.UsersSettingsTab),
  { loading: TabLoader }
)
const PlanSettings = dynamic(
  () => import('@/components/settings/PlanSettings').then(mod => mod.PlanSettings),
  { loading: TabLoader }
)
const PaymentMethodsTab = dynamic(
  () => import('@/components/settings/PaymentMethodsTab').then(mod => mod.PaymentMethodsTab),
  { loading: TabLoader }
)
const PaymentsTab = dynamic(
  () => import('@/components/settings/PaymentsTab').then(mod => mod.PaymentsTab),
  { loading: TabLoader }
)
const ReferralsSettingsTab = dynamic(
  () => import('@/components/settings/ReferralsSettingsTab').then(mod => mod.ReferralsSettingsTab),
  { loading: TabLoader }
)
const PricingSettings = dynamic(
  () => import('@/components/settings/PricingSettings').then(mod => mod.PricingSettings),
  { loading: TabLoader }
)
import { User, Building2, Users, CreditCard, Wallet, Receipt, Gift, Globe, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function SettingsPage() {
  const t = useTranslations('Settings')
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) return null

  const roleName = typeof user?.role === 'object' ? (user?.role as any)?.name : user?.role
  const isAdmin = roleName === 'ADMIN'

  const sidebarItems = [
    {
        title: "Account",
        items: [
            { id: "profile", label: t('profile.tab'), icon: User },
            { id: "language", label: t('language.tab'), icon: Globe }
        ]
    },
    {
        title: "Organization",
        items: [
            { id: "company", label: t('company.tab'), icon: Building2 },
            ...(isAdmin ? [{ id: "users", label: t('users.tab'), icon: Users }] : []),
            ...(isAdmin ? [{ id: "pricing", label: t('pricing.tab') || 'Pricing', icon: DollarSign }] : [])
        ]
    },
    {
        title: "Billing",
        items: [
            { id: "plan", label: t('plan.tab'), icon: CreditCard },
            { id: "paymentMethods", label: t('paymentMethods.tab'), icon: Wallet },
            { id: "payments", label: t('payments.tab'), icon: Receipt }
        ]
    },
    {
        title: "Other",
        items: [
            { id: "referrals", label: t('referrals.tab'), icon: Gift }
        ]
    }
  ]

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-16 lg:space-y-0">
        {/* Mobile: Horizontal scrollable tabs */}
        <aside className="lg:w-1/5">
          <nav className="space-y-2 lg:space-y-4">
            {sidebarItems.map((group, groupIdx) => (
                <div key={groupIdx}>
                     <h4 className="mb-2 px-1 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
                        {group.title}
                     </h4>
                     <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
                        {group.items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                'flex items-center px-3 py-2 rounded-lg text-sm transition-colors duration-150 shrink-0',
                                activeTab === item.id
                                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                "justify-start gap-2 whitespace-nowrap lg:w-full text-left"
                                )}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="hidden sm:inline lg:inline">{item.label}</span>
                                <span className="sm:hidden lg:hidden">{item.label}</span>
                            </button>
                        ))}
                     </div>
                </div>
            ))}
          </nav>
        </aside>
        <div className="flex-1 pr-8">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'language' && <LanguageSettings />}
            {activeTab === 'company' && <CompanySettings />}
            {activeTab === 'users' && isAdmin && <UsersSettingsTab />}
            {activeTab === 'plan' && <PlanSettings />}
            {activeTab === 'paymentMethods' && <PaymentMethodsTab />}
            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'referrals' && <ReferralsSettingsTab />}
            {activeTab === 'pricing' && isAdmin && <PricingSettings />}
        </div>
      </div>
    </div>
  )
}
