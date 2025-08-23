import React, { useEffect, useState } from 'react'
import { getMyProfile, upsertMyProfile, uploadAvatar } from '../data/profile'
import { supabase } from '../lib/supabaseClient'

export default function ProfilePanel({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [{ data: userRes }, prof] = await Promise.all([
          supabase.auth.getUser(),
          getMyProfile(),
        ])
        if (!alive) return
        setEmail(userRes.user?.email || '')
        setDisplayName(prof?.display_name || '')
        setAvatarUrl(prof?.avatar_url || '')
      } catch (e) {
        console.error(e)
        setErr(e.message || 'Failed to load profile')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    setErr('')
    try {
      const url = await uploadAvatar(file)
      setAvatarUrl(url)
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Avatar upload failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setErr('')
    try {
      await upsertMyProfile({ display_name: displayName.trim(), avatar_url: avatarUrl || null })
      onClose?.()
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-600">Loading profile…</div>

  return (
    <div className="w-80 p-4">
      {err ? (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {err}
        </div>
      ) : null}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-sm text-slate-500">{email}</div>
          <label className="text-xs text-slate-600 block mt-1">
            Change avatar
            <input type="file" accept="image/*" className="block mt-1 text-sm" onChange={handleUpload} />
          </label>
        </div>
      </div>

      <label className="text-xs text-slate-600">Display name</label>
      <input
        className="input mt-1 mb-4"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
      />

      <div className="flex items-center justify-between">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="mt-4">
        <button className="btn-outline w-full" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </div>
  )
}