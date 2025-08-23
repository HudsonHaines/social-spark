import React, { useEffect, useRef, useState } from 'react'
import ProfilePanel from './ProfilePanel'
import { getMyProfile } from '../data/profile'

export default function ProfileButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const prof = await getMyProfile()
        if (!alive) return
        setName(prof?.display_name || '')
        setAvatar(prof?.avatar_url || '')
      } catch {}
    })()
    return () => { alive = false }
  }, [open])

  useEffect(() => {
    function onClick(e) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={boxRef}>
      <button className="btn-outline flex items-center gap-2" onClick={() => setOpen((v) => !v)}>
        <span className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden inline-block">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : null}
        </span>
        <span className="max-w-[120px] truncate">{name || 'Profile'}</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 bg-white border shadow-xl rounded-xl">
          <ProfilePanel onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}