import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // All supported locales
  locales: ['en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'el', 'ro', 'mk', 'sr'],
  
  // Default locale when no locale is detected
  defaultLocale: 'en',
  
  // Always show the locale prefix in the URL
  // This will redirect /login to /en/login automatically
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except static files and Next.js internals
  matcher: ['/((?!_next|.*\\..*).*)']
};
