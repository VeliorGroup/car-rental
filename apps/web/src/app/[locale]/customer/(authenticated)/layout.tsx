'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Menu } from 'lucide-react';
import { CustomerSidebar } from './components/customer-sidebar';
import { Button } from '@/components/ui/button';

export default function AuthenticatedCustomerLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string || 'it';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const t = useTranslations('CustomerPortal.sidebar');
  const tHeader = useTranslations('CustomerPortal.header');

  const getPageTitle = () => {
    if (pathname.includes('/customer/search')) return t('searchVehicles');
    if (pathname.includes('/customer/bookings')) return t('bookings');
    if (pathname.includes('/customer/profile')) return t('profile');
    return t('dashboard');
  };
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <CustomerSidebar 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)} 
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="absolute left-0 top-0 h-full w-60 bg-background">
            <CustomerSidebar 
              isCollapsed={false} 
              onToggle={() => setMobileMenuOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-30 flex items-center px-4 md:px-6 gap-4">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link 
              href={`/${locale}/customer/portal`} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('brand')}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{getPageTitle()}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {tHeader('online')}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card py-4">
          <div className="container mx-auto px-6 text-center text-xs text-muted-foreground">
            © 2026 FleetPulse
          </div>
        </footer>
      </div>
    </div>
  );
}
