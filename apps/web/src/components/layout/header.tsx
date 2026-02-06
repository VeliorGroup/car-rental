'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  PiBell, 
  PiUser, 
  PiGear, 
  PiSignOut, 
  PiGlobe,
  PiMagnifyingGlass 
} from 'react-icons/pi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/store/auth'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useDateFilter } from './date-filter-context'

interface HeaderProps {
  onToggleDailySummary?: () => void
  isDailySummaryOpen?: boolean
}

export function Header({ onToggleDailySummary, isDailySummaryOpen }: HeaderProps) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const { user, logout } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)
  const currentLocale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('Navigation')
  const { startDate, endDate, setStartDate, setEndDate } = useDateFilter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleLogout = () => {
    logout()
    router.push(`/${locale}/business/login`)
  }

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '')
    const newPath = `/${newLocale}${pathWithoutLocale || '/dashboard'}`
    window.location.href = newPath
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Left Section - Empty */}
      <div className="flex items-center">
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        {/* Global Date Filter */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          locale={locale}
        />

        {/* Divider */}
        <div className="h-5 w-px bg-border"></div>

        {/* Notification Bell */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => router.push(`/${locale}/notifications`)}
        >
          <PiBell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary"></span>
        </Button>

        {/* Language Selector */}
        {isHydrated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <PiGlobe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
              🇬🇧 English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('de')}>
              🇩🇪 Deutsch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('fr')}>
              🇫🇷 Français
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('es')}>
              🇪🇸 Español
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('it')}>
              🇮🇹 Italiano
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('el')}>
              🇬🇷 Ελληνικά
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('sq')}>
              🇦🇱 Shqip
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('ro')}>
              🇷🇴 Română
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-2"></div>

        {/* User Menu */}
        {isHydrated && (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-9 px-2 rounded-md hover:bg-muted"
            >
              <div className="flex items-center space-x-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  {isHydrated && user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                </div>
                {isHydrated && (
                  <span className="text-sm text-foreground font-medium hidden sm:inline">
                    {user?.firstName}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {isHydrated ? (
                  <>
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </>
                ) : (
                  <div className="h-8 w-full bg-muted rounded animate-pulse" />
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer"
              onSelect={() => router.push(`/${locale}/settings`)}
            >
              <PiGear className="mr-2 h-4 w-4" />
              <span>{t('settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-500 focus:text-red-500 cursor-pointer" 
              onSelect={handleLogout}
            >
              <PiSignOut className="mr-2 h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  )
}
