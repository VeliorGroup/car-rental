'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { 
  LayoutDashboard, Search, Calendar, User, 
  LogOut, ChevronLeft, ChevronRight, Globe, Car
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸' },
]

interface CustomerSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function CustomerSidebar({ isCollapsed, onToggle }: CustomerSidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string || 'en'
  const t = useTranslations('CustomerPortal.sidebar')

  const navigationItems = [
    { key: 'dashboard', label: t('dashboard'), href: '/customer/portal', icon: LayoutDashboard },
    { key: 'search', label: t('searchVehicles'), href: '/customer/search', icon: Search },
    { key: 'bookings', label: t('bookings'), href: '/customer/bookings', icon: Calendar },
    { key: 'profile', label: t('profile'), href: '/customer/profile', icon: User },
  ]

  const isActive = (href: string) => pathname.includes(href)

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customer')
    router.push(`/${locale}/customer/login`)
  }

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')
    window.location.href = `/${newLocale}${pathWithoutLocale}`
  }

  const currentLang = languages.find(l => l.code === locale) || languages[0]

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 sticky top-0",
        isCollapsed ? "w-[72px] items-center" : "w-60"
      )}>
        
        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Sidebar Header */}
        <div className={cn("h-16 border-b border-border flex items-center w-full", isCollapsed ? "justify-center px-2" : "px-4")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${locale}/customer/portal`} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <Car className="h-5 w-5 text-primary-foreground" />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-sm font-bold">{t('brand')}</h1>
                    <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
                  </div>
                )}
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="top" sideOffset={8}>
                {t('brand')}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
        
        {/* Main Navigation */}
        <nav className={cn("flex-1 flex flex-col gap-1 overflow-y-auto p-3", isCollapsed ? "items-center" : "")}>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            if (isCollapsed) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <Link href={`/${locale}${item.href}`}>
                      <div className={cn(
                        'flex items-center justify-center rounded-xl transition-colors h-10 w-10',
                        active 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}>
                        <Icon className="h-5 w-5 shrink-0" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link key={item.key} href={`/${locale}${item.href}`}>
                <div className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                  active 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border bg-card mt-auto w-full">
          <div className={cn("flex gap-2 w-full", isCollapsed ? "flex-col items-center" : "flex-row")}>
            {/* Language Switcher */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size={isCollapsed ? "icon" : "sm"} className={cn("gap-2", isCollapsed ? "w-10 h-10 p-0" : "flex-1")}>
                      <Globe className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{currentLang.flag}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="top" sideOffset={8}>
                    {currentLang.name}
                  </TooltipContent>
                )}
              </Tooltip>
              <DropdownMenuContent align="start" side="top">
                {languages.map(lang => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={locale === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size={isCollapsed ? "icon" : "sm"} onClick={handleLogout} className={cn("gap-2", isCollapsed ? "w-10 h-10 p-0" : "min-w-0 flex-1")}>
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{t('logout')}</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="top" sideOffset={8}>{t('logout')}</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
