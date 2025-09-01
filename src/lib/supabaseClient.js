import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDev = import.meta.env.DEV;

// Basic environment check
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

// Enhanced Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'social-spark-web@1.0.0',
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
