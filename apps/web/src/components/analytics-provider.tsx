'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';

interface AnalyticsContextType {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name?: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

// Extend Window interface for posthog
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Analytics Provider - integrates with Posthog or other analytics
 * Configure NEXT_PUBLIC_POSTHOG_KEY in .env to enable
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Posthog if key is configured
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (posthogKey && typeof window !== 'undefined') {
      // Dynamic import - will only load if key is configured
      const script = document.createElement('script');
      script.src = 'https://cdn.posthog.com/static/array.js';
      script.async = true;
      script.onload = () => {
        if (window.posthog) {
          window.posthog.capture('$pageview');
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  const track = (event: string, properties?: Record<string, unknown>) => {
    // Posthog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(event, properties);
    }

    // Console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Track:', event, properties);
    }
  };

  const identify = (userId: string, traits?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.identify(userId, traits);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identify:', userId, traits);
    }
  };

  const page = (name?: string, properties?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('$pageview', {
        $current_url: window.location.href,
        page_name: name,
        ...properties,
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Page:', name, properties);
    }
  };

  return (
    <AnalyticsContext.Provider value={{ track, identify, page }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Hook to use analytics
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  
  if (!context) {
    // Return no-op functions if not inside provider
    return {
      track: () => {},
      identify: () => {},
      page: () => {},
    };
  }
  
  return context;
}

/**
 * Common analytics events for the car rental app
 */
export const AnalyticsEvents = {
  // Auth
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  
  // Bookings
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_CHECKED_OUT: 'booking_checked_out',
  BOOKING_CHECKED_IN: 'booking_checked_in',
  
  // Vehicles
  VEHICLE_ADDED: 'vehicle_added',
  VEHICLE_UPDATED: 'vehicle_updated',
  
  // Customers
  CUSTOMER_ADDED: 'customer_added',
  
  // Payments
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  
  // Subscription
  PLAN_VIEWED: 'plan_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
} as const;
