// src/lib/supabaseUtils.js
import { supabase } from './supabaseClient';

// Error types and codes mapping
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

// Enhanced error class
export class SupabaseError extends Error {
  constructor(originalError, context = {}) {
    const message = getErrorMessage(originalError);
    super(message);
    
    this.name = 'SupabaseError';
    this.code = originalError?.code || 'UNKNOWN';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.userMessage = message;
    
    // Categorize error type
    this.type = categorizeError(originalError);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

// Get user-friendly error message
function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  // Check for specific error codes
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // Check error message patterns
  const message = error.message || '';
  
  if (message.includes('duplicate key value')) {
    return 'This item already exists';
  }
  
  if (message.includes('violates foreign key constraint')) {
    return 'Cannot delete - this item is referenced by other records';
  }
  
  if (message.includes('permission denied')) {
    return 'You do not have permission to perform this action';
  }
  
  if (message.includes('connection refused') || message.includes('network')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  
  // Return original message if it's user-friendly, otherwise generic message
  if (message.length < 100 && !message.includes('ERROR:') && !message.includes('PGRST')) {
    return message;
  }
  
  return 'Something went wrong. Please try again.';
}

// Categorize error for handling
function categorizeError(error) {
  if (!error) return 'unknown';
  
  const code = error.code || '';
  const message = error.message || '';
  
  if (code.startsWith('23') || message.includes('constraint')) return 'validation';
  if (code === 'PGRST301' || code === '42501') return 'permission';
  if (code === 'PGRST116') return 'not_found';
  if (message.includes('network') || message.includes('connection')) return 'network';
  if (message.includes('timeout')) return 'timeout';
  
  return 'database';
}

// Centralized error handler
export function handleSupabaseError(error, context = {}) {
  const supabaseError = new SupabaseError(error, context);
  
  // Log error for debugging (remove in production if needed)
  console.error('Supabase Error:', {
    code: supabaseError.code,
    type: supabaseError.type,
    context: supabaseError.context,
    originalError: error,
  });
  
  return supabaseError;
}

// Wrapper for Supabase operations with automatic error handling
export async function executeSupabaseQuery(operation, context = {}) {
  try {
    const result = await operation();
    
    // Check for Supabase error in result
    if (result.error) {
      throw handleSupabaseError(result.error, context);
    }
    
    return result;
  } catch (error) {
    // If it's already a SupabaseError, re-throw
    if (error instanceof SupabaseError) {
      throw error;
    }
    
    // Otherwise, wrap it
    throw handleSupabaseError(error, context);
  }
}

// Batch operation helper
export async function executeBatch(operations, { maxConcurrency = 5, stopOnFirstError = true } = {}) {
  const results = [];
  const errors = [];
  
  // Process operations in batches to avoid overwhelming the API
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    const batch = operations.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async (operation, index) => {
      try {
        const result = await operation();
        return { success: true, result, index: i + index };
      } catch (error) {
        const supabaseError = handleSupabaseError(error, { batchIndex: i + index });
        if (stopOnFirstError) {
          throw supabaseError;
        }
        return { success: false, error: supabaseError, index: i + index };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
      }
    });
    
    // If stopOnFirstError is true and we have errors, throw the first one
    if (stopOnFirstError && errors.length > 0) {
      throw errors[0].error;
    }
  }
  
  return { results, errors };
}

// Retry wrapper for transient failures
export async function withRetry(operation, {
  maxRetries = 3,
  baseDelayMs = 1000,
  maxDelayMs = 10000,
  backoffMultiplier = 2,
  retryableErrors = ['network', 'timeout'],
} = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const supabaseError = error instanceof SupabaseError ? error : handleSupabaseError(error);
      if (!retryableErrors.includes(supabaseError.type)) {
        throw supabaseError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );
      
      console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError instanceof SupabaseError ? lastError : handleSupabaseError(lastError);
}

// Connection health checker
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('brands') // Use a table that exists
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found is OK
      throw error;
    }
    
    return { connected: true, latency: Date.now() };
  } catch (error) {
    return { 
      connected: false, 
      error: handleSupabaseError(error, { operation: 'health_check' }) 
    };
  }
}

// Query builder helpers
export const queryHelpers = {
  // Safe pagination
  paginate: (query, { page = 1, pageSize = 10, maxPageSize = 100 } = {}) => {
    const safePageSize = Math.min(Math.max(pageSize, 1), maxPageSize);
    const offset = (Math.max(page, 1) - 1) * safePageSize;
    
    return query.range(offset, offset + safePageSize - 1);
  },
  
  // Safe ordering
  orderBy: (query, column, { ascending = true, nullsFirst = false } = {}) => {
    return query.order(column, { ascending, nullsFirst });
  },
  
  // Safe filtering
  filterBy: (query, filters = {}) => {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.like(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    return query;
  },
};

// Input validation helpers
export const validators = {
  uuid: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === 'string' && uuidRegex.test(value);
  },
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof value === 'string' && emailRegex.test(value);
  },
  
  nonEmptyString: (value) => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  positiveInteger: (value) => {
    return Number.isInteger(value) && value > 0;
  },
  
  url: (value) => {
    if (!value || typeof value !== 'string') return true; // Optional URL
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
};

// Export the supabase client for convenience
export { supabase } from './supabaseClient';