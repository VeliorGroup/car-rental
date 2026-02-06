/**
 * Mapping from locale code to country code for pricing
 * Used to fetch localized subscription plan prices
 */
export const localeToCountry: Record<string, string> = {
  'en': 'IT',  // English defaults to Italy
  'it': 'IT',  // Italian → Italy
  'sq': 'AL',  // Albanian → Albania
  'es': 'ES',  // Spanish → Spain
  'fr': 'FR',  // French → France
  'de': 'DE',  // German → Germany
  'pt': 'PT',  // Portuguese → Portugal
  'el': 'GR',  // Greek → Greece
  'ro': 'RO',  // Romanian → Romania
  'mk': 'MK',  // Macedonian → North Macedonia
  'sr': 'RS',  // Serbian → Serbia
};

/**
 * Get country code for a locale, with fallback to Italy
 */
export function getCountryCodeForLocale(locale: string): string {
  return localeToCountry[locale] || 'IT';
}
