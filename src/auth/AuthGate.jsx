import React from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthProvider'

export default function AuthGate({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-6">Loading...</div>
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border rounded-xl p-6 w-full max-w-md shadow-sm">
          <h1 className="text-xl font-semibold mb-4">Sign in</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} />
        </div>
      </div>
    )
  }
  return children
}