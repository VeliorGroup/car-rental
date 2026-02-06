import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // All supported locales
  locales: ['en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'el', 'ro', 'mk', 'sr'],
  
  // Default locale when no locale is detected
  defaultLocale: 'en',
  
  // Always show the locale prefix in the URL
  localePrefix: 'always'
});

// Export navigation helpers with type-safe locale handling
export const { Link, redirect, usePathname, useRouter, getPathname } = 
  createNavigation(routing);
