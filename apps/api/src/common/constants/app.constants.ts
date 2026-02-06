/**
 * Application-wide constants
 * Centralized location for magic numbers and strings
 */

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  USER_DATA: 300, // 5 minutes
  ANALYTICS: 300, // 5 minutes
  VEHICLE_LIST: 60, // 1 minute
  PRICING: 3600, // 1 hour
  COUNTRIES: 86400, // 24 hours
} as const;

// Rate Limiting (in milliseconds and limits)
export const RATE_LIMIT = {
  LOGIN: { ttl: 60000, limit: 5 }, // 5 attempts per minute
  REGISTER: { ttl: 3600000, limit: 5 }, // 5 attempts per hour
  PASSWORD_RESET: { ttl: 3600000, limit: 3 }, // 3 attempts per hour
  BACKUP_CODE: { ttl: 60000, limit: 5 }, // 5 attempts per minute
  FILE_UPLOAD: { ttl: 60000, limit: 10 }, // 10 uploads per minute
  API_PUBLIC: { ttl: 60000, limit: 30 }, // 30 requests per minute
  DEFAULT: { ttl: 60000, limit: 100 }, // 100 requests per minute
} as const;

// Booking state machine: valid transitions
export const BOOKING_STATE_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['CHECKED_OUT', 'CANCELLED'],
  CHECKED_OUT: ['CHECKED_IN'],
  CHECKED_IN: [], // Terminal state
  CANCELLED: [], // Terminal state
  NO_SHOW: [], // Terminal state
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

// Booking defaults
export const BOOKING_DEFAULTS = {
  STANDARD_CAUTION: 300, // EUR
  BOOKING_HOLD_MINUTES: 15,
  CANCELLATION_FEE_PERCENT: 20, // 20% of booking amount
} as const;

// Date formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'DD/MM/YYYY',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  LICENSE_PLATE: /^[A-Z0-9-]{2,10}$/i,
  VIN: /^[A-HJ-NPR-Z0-9]{17}$/i,
  CUID: /^c[a-z0-9]{24}$/,
} as const;

// HTTP Status messages
export const HTTP_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT: 'Too many requests, please try again later',
} as const;

// Tenant limits by plan
export const PLAN_LIMITS = {
  FREE: {
    VEHICLES: 5,
    USERS: 2,
    LOCATIONS: 1,
  },
  BASIC: {
    VEHICLES: 20,
    USERS: 5,
    LOCATIONS: 3,
  },
  PREMIUM: {
    VEHICLES: 100,
    USERS: 20,
    LOCATIONS: 10,
  },
  ENTERPRISE: {
    VEHICLES: -1, // Unlimited
    USERS: -1,
    LOCATIONS: -1,
  },
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  BOOKING: 'BOOKING',
  CAUTION: 'CAUTION',
  DAMAGE: 'DAMAGE',
  MAINTENANCE: 'MAINTENANCE',
  EXPIRY: 'EXPIRY',
  SYSTEM: 'SYSTEM',
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  USER: 'user',
  TENANT: 'tenant',
  VEHICLE: 'vehicle',
  BOOKING: 'booking',
  ANALYTICS: 'analytics',
  PRICING: 'pricing',
} as const;

/**
 * Generate cache key with tenant namespace
 */
export function getCacheKey(
  prefix: string,
  tenantId: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${tenantId}:${parts.join(':')}`;
}
