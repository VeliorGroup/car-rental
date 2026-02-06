import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// List of all namespace files
const NAMESPACES = [
  'common',
  'dashboard',
  'customers',
  'vehicles',
  'bookings',
  'calendar',
  'branches',
  'cautions',
  'damages',
  'maintenance',
  'analytics',
  'notifications',
  'settings',
  'auth',
  'home',
  'tires',
  'public-booking',
  'customer-portal',
  'customer-auth',
  'superadmin',
  'billing',
  'documents',
  'fuel-logs',
  'reports',
  'api-keys',
  'audit-logs',
  'email-templates',
  'checkout'
];

// Helper to load and merge all namespace files for a locale
async function loadMessages(locale: string): Promise<Record<string, any>> {
  const messages: Record<string, any> = {};
  
  for (const ns of NAMESPACES) {
    try {
      // Try to load the namespace for the requested locale
      const module = await import(`../../messages/${locale}/${ns}.json`);
      Object.assign(messages, module.default);
    } catch {
      // Fallback to English if namespace not found for this locale
      try {
        const fallback = await import(`../../messages/en/${ns}.json`);
        Object.assign(messages, fallback.default);
      } catch {
        console.warn(`Missing namespace: ${ns} for locale: ${locale}`);
      }
    }
  }
  
  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale)
  };
});
