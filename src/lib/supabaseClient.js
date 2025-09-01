import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDev = import.meta.env.DEV;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
  
  if (isDev) {
    console.error(errorMessage);
    console.info('Please add these variables to your .env file');
  }
  
  throw new Error(errorMessage);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL: ${supabaseUrl}`);
}

// Optimized Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for OAuth redirect
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'social-spark-auth',
    flowType: 'pkce', // More secure auth flow
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for realtime events
    },
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': `social-spark-web@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    },
    fetch: (url, options = {}) => {
      // Add timeout to all requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
});

// Connection health monitoring
let connectionState = 'unknown';
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function checkConnection() {
  const now = Date.now();
  
  // Rate limit health checks
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && connectionState !== 'unknown') {
    return connectionState === 'connected';
  }
  
  lastHealthCheck = now;
  
  try {
    const { error } = await supabase.from('brands').select('id').limit(1).maybeSingle();
    connectionState = error && error.code !== 'PGRST116' ? 'error' : 'connected';
    return connectionState === 'connected';
  } catch (error) {
    console.warn('Supabase connection check failed:', error);
    connectionState = 'error';
    return false;
  }
}

// Graceful shutdown helper
export function gracefulShutdown() {
  if (supabase.realtime) {
    supabase.realtime.disconnect();
  }
}

// Development helpers
if (isDev) {
  // Add global access for debugging
  if (typeof window !== 'undefined') {
    window.__supabase = supabase;
    window.__checkSupabaseConnection = checkConnection;
  }
  
  console.info('Supabase client initialized', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    authEnabled: !!supabase.auth,
    realtimeEnabled: !!supabase.realtime,
  });
}
