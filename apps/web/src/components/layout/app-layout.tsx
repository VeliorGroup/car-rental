'use client'

import React, { useState } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { PageHeader } from './page-header'
import { FilterBar } from './filter-bar'
import { SidebarProvider } from './sidebar-context'
import { DateFilterProvider } from './date-filter-context'
import { FilterBarProvider } from './filter-bar-context'
import { DailySummarySidebar } from './daily-summary-sidebar'
import { MobileNav } from './mobile-nav'
import { ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth'

const navItems = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'bookings', href: '/bookings' },
  { key: 'branches', href: '/branches' },
  { key: 'customers', href: '/customers' },
  { key: 'vehicles', href: '/vehicles' },
  { key: 'maintenance', href: '/maintenance' },
  { key: 'damages', href: '/damages' },
  { key: 'cautions', href: '/cautions' },
  { key: 'tires', href: '/tires' },
  { key: 'calendar', href: '/calendar' },
  { key: 'notifications', href: '/notifications' },
  { key: 'settings', href: '/settings' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false)
  const pathname = usePathname()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const t = useTranslations('Navigation')
  const { user } = useAuthStore()

  const getPageTitle = () => {
    for (const item of navItems) {
      if (pathname.includes(item.href)) {
        return t(item.key) || item.key
      }
    }
    return t('dashboard')
  }

  return (
    <DateFilterProvider>
      <FilterBarProvider>
        <SidebarProvider>
          <div className="flex min-h-screen bg-background">
            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:flex">
              <Sidebar />
            </div>
            
            {/* Mobile Navigation */}
            <MobileNav />
            
            <div className="flex-1 flex flex-col min-h-screen">
              {/* Top Header Bar - Desktop (with integrated filters) */}
              <header className="hidden md:flex h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-30 items-center px-6 gap-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm shrink-0">
                  <Link href={`/${locale}/dashboard`} className="text-muted-foreground hover:text-foreground transition-colors">
                    FleetPulse
                  </Link>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{getPageTitle()}</span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Integrated Filter Bar */}
                <FilterBar />
              </header>

              
              {/* Main Content - with top padding on mobile for fixed header */}
              <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6 pt-[72px] md:pt-6 custom-scrollbar">
                <div className="mx-auto animate-fade-in max-w-[1600px]">
                  {children}
                </div>
              </main>
            </div>
            
            {/* Daily Summary - desktop only */}
            <div className="hidden md:block">
              <DailySummarySidebar 
                isOpen={isDailySummaryOpen} 
                onClose={() => setIsDailySummaryOpen(false)}
                onOpen={() => setIsDailySummaryOpen(true)}
              />
            </div>
          </div>
        </SidebarProvider>
      </FilterBarProvider>
    </DateFilterProvider>
  )
}

