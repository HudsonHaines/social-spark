// Simplified Supabase utilities without circular dependencies

// Error codes mapping
export const SUPABASE_ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'invalid_grant',
  USER_NOT_FOUND: 'user_not_found', 
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  SIGNUP_DISABLED: 'signup_disabled',
  
  // Database errors
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  
  // RLS (Row Level Security) errors
  INSUFFICIENT_PRIVILEGE: '42501',
  RLS_POLICY_VIOLATION: 'PGRST301',
  
  // Generic errors
  NOT_FOUND: 'PGRST116',
  CONNECTION_ERROR: 'ECONNREFUSED',
  TIMEOUT: 'PGRST101',
};

// User-friendly error messages
const ERROR_MESSAGES = {
  // Auth messages
  [SUPABASE_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [SUPABASE_ERROR_CODES.USER_NOT_FOUND]: 'No account found with this email',
  [SUPABASE_ERROR_CODES.EMAIL_NOT_CONFIRMED]: 'Please check your email and click the confirmation link',
  [SUPABASE_ERROR_CODES.SIGNUP_DISABLED]: 'Account registration is currently disabled',
  
  // Database messages
  [SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION]: 'Referenced record does not exist',
  [SUPABASE_ERROR_CODES.UNIQUE_VIOLATION]: 'A record with this information already exists',
  [SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION]: 'Required information is missing',
  [SUPABASE_ERROR_CODES.CHECK_VIOLATION]: 'Invalid data provided',
  
  // RLS messages
  [SUPABASE_ERROR_CODES.INSUFFICIENT_PRIVILEGE]: 'You do not have permission to perform this action',
  [SUPABASE_ERROR_CODES.RLS_POLICY_VIOLATION]: 'Access denied for this operation',
  
  // Generic messages
  [SUPABASE_ERROR_CODES.NOT_FOUND]: 'Record not found',
  [SUPABASE_ERROR_CODES.CONNECTION_ERROR]: 'Unable to connect to the server',
  [SUPABASE_ERROR_CODES.TIMEOUT]: 'Request timed out',
};

function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  
  const code = error?.code || error?.error_code || error?.status;
  const userMessage = ERROR_MESSAGES[code];
  
  if (userMessage) return userMessage;
  
  // Fallback to error message or generic message
  return error?.message || error?.error_description || 'An unexpected error occurred';
}

export class SupabaseError extends Error {
  constructor(originalError, context = {}) {
    const message = getErrorMessage(originalError);
    super(message);
    this.name = 'SupabaseError';
    this.code = originalError?.code || 'UNKNOWN';
    this.userMessage = message;
    this.context = context;
    this.originalError = originalError;
  }
}

export function handleSupabaseError(error, context = {}) {
  if (error instanceof SupabaseError) {
    return error;
  }
  return new SupabaseError(error, context);
}

// Simple retry utility
export async function withRetry(fn, options = {}) {
  const { 
    maxRetries = 3, 
    retryableErrors = ['network', 'timeout'],
    baseDelay = 1000 
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) break;
      
      // Check if error is retryable
      const isRetryable = retryableErrors.some(type => {
        if (type === 'network') return error?.code === 'NETWORK_ERROR' || error?.message?.includes('network');
        if (type === 'timeout') return error?.code === 'TIMEOUT' || error?.message?.includes('timeout');
        return false;
      });
      
      if (!isRetryable) break;
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Basic validation helpers
export const validators = {
  uuid: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof value === 'string' && uuidRegex.test(value);
  },
  
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  nonEmptyString: (value) => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof value === 'string' && emailRegex.test(value);
  }
};