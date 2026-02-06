'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const locale = params.locale as string || 'it';
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center space-x-3">
            <span className="text-xl font-bold text-foreground tracking-tight">FleetPulse</span>
            <span className="text-sm text-primary font-medium">Marketplace</span>
          </Link>
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Privato</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/${locale}/customer/login`}>
                  <DropdownMenuItem>Login</DropdownMenuItem>
                </Link>
                <Link href={`/${locale}/customer/register`}>
                  <DropdownMenuItem>Registrazione</DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Business</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/${locale}/business/login`}>
                  <DropdownMenuItem>Login</DropdownMenuItem>
                </Link>
                <Link href={`/${locale}/business/register`}>
                  <DropdownMenuItem>Registrazione</DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © 2026 FleetPulse Marketplace. Tutti i diritti riservati.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Termini
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/help" className="hover:text-foreground transition-colors">
                Assistenza
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
