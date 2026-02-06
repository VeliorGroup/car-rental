'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  PiList,
  PiX
} from 'react-icons/pi'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth'
const navigationItems = [
  { key: 'dashboard', href: '/dashboard', icon: PiSquaresFour },
  { key: 'branches', href: '/branches', icon: PiBuildings },
  { key: 'vehicles', href: '/vehicles', icon: PiCarProfile },
  { key: 'customers', href: '/customers', icon: PiUsers },
  { key: 'bookings', href: '/bookings', icon: PiCalendarBlank },
  { key: 'cautions', href: '/cautions', icon: PiCreditCard },
  { key: 'damages', href: '/damages', icon: PiWarning },
  { key: 'maintenance', href: '/maintenance', icon: PiWrench },
  { key: 'tires', href: '/tires', icon: PiTire },
  { key: 'calendar', href: '/calendar', icon: PiCalendarCheck },
  { key: 'notifications', href: '/notifications', icon: PiBell },
  { key: 'settings', href: '/settings', icon: PiGear },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string || 'en'
  const t = useTranslations('Navigation')
  const { user, logout } = useAuthStore()

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isActive = (href: string) => pathname.includes(href)

  const handleLogout = () => {
    logout()
    router.push(`/${locale}/business/login`)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-background border-b border-border">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <PiList className="h-6 w-6" />
        </button>
        
        <span className="font-semibold text-sm">FleetPulse</span>
        
        {user && (
          <Link href={`/${locale}/settings`}>
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile" 
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                {user.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 w-72 bg-card z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="font-semibold">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <PiX className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <Link 
            href={`/${locale}/settings`} 
            className="flex items-center gap-3 p-4 border-b border-border hover:bg-accent/50 transition-colors"
          >
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile" 
                className="h-11 w-11 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
                {user.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link key={item.key} href={`/${locale}${item.href}`}>
                  <div className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    active 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}>
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{t(item.key)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <PiSignOut className="h-5 w-5 shrink-0" />
            <span className="text-sm">{t('logout')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
