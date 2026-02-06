'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useState, useEffect } from 'react'
import { 
  PiSquaresFour,
  PiUsers,
  PiCarProfile,
  PiCalendarBlank,
  PiCreditCard,
  PiWarning,
  PiWrench,
  PiCalendarCheck,
  PiBell,
  PiGear,
  PiBuildings,
  PiTire,
  PiSignOut,
  PiCaretLeft,
  PiCaretRight,
  PiGlobeSimple,
  PiChartBar,
  PiFile,
  PiGasPump,
  PiCurrencyCircleDollar
} from 'react-icons/pi'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth'
import { useSidebar } from './sidebar-context'
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

interface NavigationChild {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigationItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationChild[];
}

const navigationItems: NavigationItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: PiSquaresFour },
  { key: 'bookings', href: '/bookings', icon: PiCalendarBlank },
  { key: 'branches', href: '/branches', icon: PiBuildings },
  { key: 'customers', href: '/customers', icon: PiUsers },
  { 
    key: 'vehicles', 
    href: '/vehicles', 
    icon: PiCarProfile,
    children: [
      { key: 'maintenance', href: '/maintenance', icon: PiWrench },
      { key: 'damages', href: '/damages', icon: PiWarning },
      { key: 'cautions', href: '/cautions', icon: PiCreditCard },
      { key: 'tires', href: '/tires', icon: PiTire },
      { key: 'fuelLogs', href: '/fuel-logs', icon: PiGasPump },
    ]
  },
  { key: 'reports', href: '/reports', icon: PiChartBar },
  { key: 'documents', href: '/documents', icon: PiFile },
  { key: 'calendar', href: '/calendar', icon: PiCalendarCheck },
  { key: 'notifications', href: '/notifications', icon: PiBell },
  { key: 'billing', href: '/billing', icon: PiCurrencyCircleDollar },
  { key: 'settings', href: '/settings', icon: PiGear },
]

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string || 'en'
  const currentLocale = useLocale()
  const t = useTranslations('Navigation')
  const { user, logout } = useAuthStore()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [isHydrated, setIsHydrated] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vehicles: true
  })

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

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const isActive = (href: string) => pathname.includes(href)

  const handleLogout = () => {
    logout()
    router.push(`/${locale}/business/login`)
  }

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '')
    window.location.href = `/${newLocale}${pathWithoutLocale}`
  }

  const toggleSection = (key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 sticky top-0",
        isCollapsed ? "w-[72px] items-center" : "w-60"
      )}>
        
        {/* Collapse Toggle - Floating on edge */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
        >
          {isCollapsed ? (
            <PiCaretRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <PiCaretLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Sidebar Header - Like SuperAdmin */}
        <div className={cn("h-16 border-b flex items-center", isCollapsed ? "justify-center px-2" : "px-4")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <PiCarProfile className="h-5 w-5 text-primary-foreground" />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-sm font-bold">Car Rental</h1>
                    <p className="text-xs text-muted-foreground">Business</p>
                  </div>
                )}
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="top" sideOffset={8}>
                Car Rental
              </TooltipContent>
            )}
          </Tooltip>
        </div>
        
        {/* Main Navigation */}
        <nav className={cn("flex-1 flex flex-col gap-1 overflow-y-auto p-3", isCollapsed ? "items-center" : "")}>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedSections[item.key]
            
            // Collapsed State
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
                    {t(item.key)}
                  </TooltipContent>
                </Tooltip>
              )
            }

            // Expanded Sidebar
            return (
              <div key={item.key} className="flex flex-col gap-1">
                <div 
                  className={cn(
                    'flex items-center rounded-xl transition-colors group',
                    active && !hasChildren
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    hasChildren && active ? 'text-primary font-medium' : '' // Highlight parent if child active or self active
                  )}
                >
                  <Link 
                    href={`/${locale}${item.href}`}
                    className="flex-1 flex items-center gap-3 px-3 py-2"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm flex-1">{t(item.key)}</span>
                  </Link>
                  
                  {hasChildren && (
                    <button
                      onClick={(e) => toggleSection(item.key, e)}
                      className="p-2 hover:bg-black/5 rounded-r-xl transition-colors"
                    >
                      <PiCaretRight className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )} />
                    </button>
                  )}
                </div>
                
                {hasChildren && isExpanded && (
                  <div className="flex flex-col gap-1 ml-4 pl-2 border-l border-border/50">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = isActive(child.href)
                      return (
                        <Link key={child.key} href={`/${locale}${child.href}`}>
                          <div className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                            childActive 
                              ? 'bg-accent/50 text-foreground font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}>
                             <ChildIcon className="h-4 w-4 shrink-0" />
                             <span className="text-sm">{t(child.key)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom Section - Language & Logout */}
        <div className="p-4 border-t bg-card mt-auto w-full">
          <div className={cn("flex gap-2 w-full", isCollapsed ? "flex-col items-center" : "flex-row")}>
            {/* Language Switcher */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size={isCollapsed ? "icon" : "sm"} className={cn("gap-2", isCollapsed ? "w-10 h-10 p-0" : "flex-1")}>
                      <PiGlobeSimple className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{languages.find(l => l.code === currentLocale)?.flag}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="top" sideOffset={8}>
                    {languages.find(l => l.code === currentLocale)?.name}
                  </TooltipContent>
                )}
              </Tooltip>
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

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size={isCollapsed ? "icon" : "sm"} onClick={handleLogout} className={cn("gap-2", isCollapsed ? "w-10 h-10 p-0" : "flex-1")}>
                  <PiSignOut className="h-4 w-4 shrink-0" />
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
