'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';

/**
 * Redirect /search to home page with search parameters
 * The search functionality is handled directly on the landing page
 */
export default function SearchPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Get all search parameters
    const city = searchParams.get('city');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    // Build query string
    const queryParams = new URLSearchParams();
    if (city) queryParams.set('city', city);
    if (startDate) queryParams.set('startDate', startDate);
    if (endDate) queryParams.set('endDate', endDate);
    if (category) queryParams.set('category', category);

    // Redirect to home page with search parameters
    const queryString = queryParams.toString();
    const redirectUrl = queryString 
      ? `/${locale}?${queryString}` 
      : `/${locale}`;
    
    router.replace(redirectUrl);
  }, [router, locale, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Reindirizzamento...</p>
      </div>
    </div>
  );
}
