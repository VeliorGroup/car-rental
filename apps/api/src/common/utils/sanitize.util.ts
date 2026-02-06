/**
 * Utility functions for sanitizing sensitive data from logs and responses
 */

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'privateKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'twoFASecret',
  'backupCodes',
  'authorization',
  'x-api-key',
];

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i,
];

/**
 * Check if a field name contains sensitive information
 */
export function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  
  // Check exact matches
  if (SENSITIVE_FIELDS.includes(lowerField)) {
    return true;
  }
  
  // Check patterns
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Sanitize an object by removing or masking sensitive fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: { mask?: boolean; remove?: boolean } = { mask: true },
): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      if (options.remove) {
        continue;
      }
      sanitized[key] = '***REDACTED***';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize a string that might contain sensitive data
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  // Mask email-like patterns in URLs or strings
  let sanitized = str.replace(
    /(password|secret|token|key)=[^&\s]+/gi,
    (match) => {
      const [key] = match.split('=');
      return `${key}=***REDACTED***`;
    },
  );

  // Mask JWT tokens
  sanitized = sanitized.replace(
    /Bearer\s+[A-Za-z0-9\-._~+/]+/g,
    'Bearer ***REDACTED***',
  );

  return sanitized;
}

/**
 * Sanitize request/response for logging
 */
export function sanitizeRequest(req: any): any {
  const sanitized = {
    method: req.method,
    url: sanitizeString(req.url),
    headers: sanitizeObject(req.headers || {}, { remove: true }),
    body: sanitizeObject(req.body || {}, { mask: true }),
    query: sanitizeObject(req.query || {}, { mask: true }),
    params: req.params || {},
    ip: req.ip,
    userAgent: req.headers?.['user-agent'],
  };

  return sanitized;
}

/**
 * Sanitize error for logging
 */
export function sanitizeError(error: any): any {
  if (!error) {
    return error;
  }

  const sanitized: any = {
    name: error.name,
    message: sanitizeString(error.message || ''),
    stack: error.stack ? sanitizeString(error.stack) : undefined,
  };

  // Sanitize additional error properties
  if (error.response) {
    sanitized.response = sanitizeObject(error.response, { mask: true });
  }

  if (error.config) {
    sanitized.config = sanitizeObject(error.config, { mask: true });
  }

  return sanitized;
}
