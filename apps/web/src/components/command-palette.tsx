'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  Wrench,
  Settings,
  Plus,
  Search,
  FileText,
  Building2,
  Bell,
  Calendar,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  const navigateTo = (path: string) => {
    runCommand(() => router.push(`/${locale}${path}`));
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Branches', path: '/branches' },
    { icon: Car, label: 'Vehicles', path: '/vehicles' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: CalendarDays, label: 'Bookings', path: '/bookings' },
    { icon: CreditCard, label: 'Cautions', path: '/cautions' },
    { icon: AlertTriangle, label: 'Damages', path: '/damages' },
    { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const quickActions = [
    { icon: Plus, label: 'New Booking', action: () => navigateTo('/bookings/new') },
    { icon: Plus, label: 'Add Vehicle', action: () => navigateTo('/vehicles/new') },
    { icon: Plus, label: 'Add Customer', action: () => navigateTo('/customers/new') },
    { icon: FileText, label: 'View Reports', action: () => navigateTo('/dashboard') },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={item.action}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.path}
                onSelect={() => navigateTo(item.path)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => navigateTo('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/**
 * Hook to control command palette from anywhere
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  const toggle = React.useCallback(() => setOpen((o) => !o), []);

  return {
    open,
    setOpen,
    toggle,
  };
}
