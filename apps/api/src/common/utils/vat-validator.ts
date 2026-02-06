import { BadRequestException } from '@nestjs/common';

/**
 * VAT Number validation by country
 * Supports Balkans and European countries
 */

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  { code: 'RSD', symbol: 'RSD', name: 'Serbian Dinar' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia Mark' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
];

// VAT prefix patterns by country code with currency
// Limited to supported countries: Albania, Italy, UK
const VAT_PATTERNS: Record<string, { prefix: string; pattern: RegExp; name: string; currency: string; flag: string }> = {
  // Albania
  AL: { prefix: 'AL', pattern: /^(AL)?[JKLM]\d{8}[A-Z]$/, name: 'Albania', currency: 'ALL', flag: '🇦🇱' },
  
  // Italy
  IT: { prefix: 'IT', pattern: /^IT\d{11}$/, name: 'Italy', currency: 'EUR', flag: '🇮🇹' },
  
  // United Kingdom
  GB: { prefix: 'GB', pattern: /^GB\d{9}$/, name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
};

/**
 * Get list of supported countries with currency info
 */
export function getSupportedCountries(): { 
  code: string; 
  name: string; 
  vatPrefix: string; 
  currency: string;
  flag: string;
}[] {
  return Object.entries(VAT_PATTERNS).map(([code, data]) => ({
    code,
    name: data.name,
    vatPrefix: data.prefix,
    currency: data.currency,
    flag: data.flag,
  }));
}

/**
 * Get default currency for a country
 */
export function getDefaultCurrencyForCountry(countryCode: string): string {
  const country = VAT_PATTERNS[countryCode.toUpperCase()];
  return country?.currency || 'EUR';
}

/**
 * Validate VAT number for a specific country
 * @throws BadRequestException if VAT doesn't match country
 */
export function validateVatForCountry(vatNumber: string | undefined | null, countryCode: string): void {
  // VAT is optional for some countries
  if (!vatNumber) return;

  const countryData = VAT_PATTERNS[countryCode.toUpperCase()];
  
  if (!countryData) {
    // Unknown country - just check it's not empty if provided
    return;
  }

  const normalizedVat = vatNumber.toUpperCase().replace(/[\s.-]/g, '');
  
  // Check if VAT starts with correct country prefix
  if (!normalizedVat.startsWith(countryData.prefix)) {
    throw new BadRequestException(
      `VAT number for ${countryData.name} must start with "${countryData.prefix}". ` +
      `Received: "${normalizedVat.substring(0, 3)}..."`
    );
  }

  // Check format (optional - can be relaxed for flexibility)
  if (!countryData.pattern.test(normalizedVat)) {
    throw new BadRequestException(
      `Invalid VAT number format for ${countryData.name}. ` +
      `Please check the format.`
    );
  }
}

/**
 * Format VAT number (add prefix if missing)
 */
export function formatVatNumber(vatNumber: string, countryCode: string): string {
  if (!vatNumber) return vatNumber;
  
  const countryData = VAT_PATTERNS[countryCode.toUpperCase()];
  if (!countryData) return vatNumber;

  const normalizedVat = vatNumber.toUpperCase().replace(/[\s.-]/g, '');
  
  // Add prefix if missing
  if (!normalizedVat.startsWith(countryData.prefix)) {
    return countryData.prefix + normalizedVat;
  }
  
  return normalizedVat;
}
