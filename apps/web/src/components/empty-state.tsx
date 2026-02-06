'use client';

import { cn } from '@/lib/utils';
import { 
  Car, 
  Users, 
  CalendarDays, 
  Package, 
  FileText,
  Plus,
  Search,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'vehicles' | 'customers' | 'bookings' | 'damages' | 'maintenance' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig: Record<string, { 
  icon: LucideIcon; 
  title: string; 
  description: string;
  actionLabel: string;
}> = {
  vehicles: {
    icon: Car,
    title: 'No vehicles yet',
    description: 'Add your first vehicle to start managing your fleet.',
    actionLabel: 'Add Vehicle',
  },
  customers: {
    icon: Users,
    title: 'No customers yet',
    description: 'Add your first customer to start creating bookings.',
    actionLabel: 'Add Customer',
  },
  bookings: {
    icon: CalendarDays,
    title: 'No bookings yet',
    description: 'Create your first booking to get started.',
    actionLabel: 'Create Booking',
  },
  damages: {
    icon: FileText,
    title: 'No damages reported',
    description: 'All vehicles are in great condition. No damage reports found.',
    actionLabel: 'Report Damage',
  },
  maintenance: {
    icon: Package,
    title: 'No maintenance scheduled',
    description: 'All vehicles are up to date. No maintenance required.',
    actionLabel: 'Schedule Maintenance',
  },
  generic: {
    icon: Search,
    title: 'Nothing found',
    description: 'Try adjusting your search or filters.',
    actionLabel: 'Clear Filters',
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type] || emptyStateConfig.generic;
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {/* Animated icon container */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Action button */}
      {onAction && (
        <Button 
          onClick={onAction}
          className="group transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
          {actionLabel || config.actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Search empty state - when search returns no results
 */
export function SearchEmptyState({ 
  query,
  onClear,
}: { 
  query: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No results for &quot;{query}&quot;
      </h3>
      
      <p className="text-muted-foreground text-sm max-w-xs mb-4">
        Try adjusting your search terms or check for typos.
      </p>

      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}

/**
 * Loading empty state with skeleton
 */
export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm mt-4">{text}</p>
    </div>
  );
}
