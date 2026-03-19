import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const MAX_SIZE = 3 * 1024 * 1024 // 3MB

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef()

  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)  // { type: 'success'|'error', text }
  const [passwordMsg, setPasswordMsg] = useState(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      setProfileMsg({ type: 'error', text: 'Image must be under 3MB.' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Please select an image file.' })
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setProfileMsg(null)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty.' })
      return
    }
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      let newAvatarUrl = avatarUrl

      // Upload avatar if a new one was selected
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        // Add cache-busting timestamp so browser shows new image
        newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }

      // Update profile row
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), avatar_url: newAvatarUrl })
        .eq('id', user.id)
      if (profileErr) throw profileErr

      // Update auth metadata so name shows correctly
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })

      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      await refreshProfile()
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Enter a new password.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setSavingPassword(true)
    setPasswordMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  function removeAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarUrl(null)
  }

  const displayAvatar = avatarPreview || avatarUrl
  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'
  const isTeacher = profile?.role === 'teacher'
  const accentColor = isTeacher ? '#4F46E5' : '#7C3AED'

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Profile settings</h1>
        <p className="page-subtitle">Update your name, photo and password</p>
      </div>

      {/* Profile info card */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Personal info</h2>

        <form onSubmit={saveProfile} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100" />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: accentColor }}>
                  {initials}
                </div>
              )}
              {/* Camera button */}
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={handleAvatarSelect} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-0.5">{fullName || 'Your name'}</p>
              <p className="text-xs text-gray-400 mb-3">{user?.email}</p>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary text-xs py-1.5 px-3">
                  Change photo
                </button>
                {displayAvatar && (
                  <button type="button" onClick={removeAvatar}
                    className="btn btn-ghost text-xs py-1.5 px-3 text-red-500 hover:bg-red-50">
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or GIF · Max 3MB</p>
            </div>
          </div>

          {/* Full name */}
          <div>
            <label className="label">Full name</label>
            <input className="input" placeholder="Your full name"
              value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          {/* Email — read only */}
          <div>
            <label className="label">Email <span className="text-gray-400 font-normal">(cannot be changed)</span></label>
            <input className="input bg-gray-50 text-gray-400 cursor-not-allowed"
              value={user?.email || ''} disabled />
          </div>

          {profileMsg && (
            <div className={`p-3 rounded-xl text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {profileMsg.text}
            </div>
          )}

          <button type="submit" disabled={savingProfile} className="btn btn-primary w-full"
            style={{ background: accentColor, borderColor: accentColor }}>
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Password card */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Change password</h2>

        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" placeholder="Min. 8 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input type="password" className="input" placeholder="Repeat new password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          {passwordMsg && (
            <div className={`p-3 rounded-xl text-sm ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {passwordMsg.text}
            </div>
          )}

          <button type="submit" disabled={savingPassword} className="btn btn-primary w-full"
            style={{ background: accentColor, borderColor: accentColor }}>
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
