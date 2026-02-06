'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Building2, LogOut, Globe, LayoutDashboard, Users, Gift, Package, 
  FileText, ChevronRight, Settings, Shield, Menu, X, Sparkles, ShieldCheck, Activity
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SuperAdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'tenants', href: '/tenants', icon: Users },
  { key: 'referrals', href: '/referrals', icon: Gift },
  { key: 'plans', href: '/plans', icon: Package },
  { key: 'features', href: '/features', icon: Sparkles },
  { key: 'roles', href: '/roles', icon: ShieldCheck },
  { key: 'auditLogs', href: '/audit-logs', icon: FileText },
  { key: 'monitoring', href: '/monitoring', icon: Activity },
]

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const locale = params.locale as string
  const currentLocale = useLocale()
  const t = useTranslations('SuperAdmin')
  const [isLoading, setIsLoading] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginPage = pathname.includes('/superadmin/login')

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
    { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  ]

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '')
    window.location.href = `/${newLocale}${pathWithoutLocale}`
  }

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token')
    localStorage.removeItem('superadmin_user')
    router.push(`/${locale}/superadmin/login`)
  }

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token')
    const user = localStorage.getItem('superadmin_user')

    if (isLoginPage) {
      setIsLoading(false)
      return
    }

    if (!token) {
      router.push(`/${locale}/superadmin/login`)
      return
    }

    if (user) {
      const parsed = JSON.parse(user)
      setAdminName(`${parsed.firstName} ${parsed.lastName}`)
    }

    setIsLoading(false)
  }, [router, locale, isLoginPage])

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isActive = (path: string) => pathname.includes(path)

  const getPageTitle = () => {
    for (const item of navItems) {
      if (isActive(item.href)) {
        return t(`nav.${item.key}`) || item.key
      }
    }
    return t('nav.dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold">SuperAdmin</h1>
              <p className="text-xs text-muted-foreground">{t('platformManagement')}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.key}
                href={`/${locale}/superadmin${item.href}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
                  active 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {t(`nav.${item.key}`) || item.key}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t bg-card mt-auto">
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Globe strokeWidth={1.5} />
                  {languages.find(l => l.code === currentLocale)?.flag}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                {languages.map(lang => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={currentLocale === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut strokeWidth={1.5} />
              {t('logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Header */}
        <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-30 flex items-center px-4 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/superadmin/dashboard`} className="text-muted-foreground hover:text-foreground">
              SuperAdmin
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-medium">{getPageTitle()}</span>
          </div>

          <div className="flex-1" />

          {/* Quick Stats Mini */}
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Sistema Attivo
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
