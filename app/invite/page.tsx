'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function InviteContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const tokenParam    = searchParams.get('token')    ?? ''
  const emailParam    = searchParams.get('email')    ?? ''
  const athleteIdParam = searchParams.get('athlete_id') ?? ''

  const [email, setEmail]       = useState(emailParam)
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSignUp() {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Fyll i alla fält.' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Lösenordet måste vara minst 6 tecken.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    // 1. Create account
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      setMessage({ type: 'error', text: error?.message ?? 'Kunde inte skapa konto.' })
      setLoading(false)
      return
    }

    const userId = data.user.id

    // 2–4. Post-signup updates (parallel)
    await Promise.all([
      athleteIdParam
        ? supabase.from('athletes').update({ profile_id: userId }).eq('id', athleteIdParam)
        : Promise.resolve(),
      tokenParam
        ? supabase.from('invites').update({ accepted: true }).eq('token', tokenParam)
        : Promise.resolve(),
      supabase.from('user_roles').insert({ profile_id: userId, role: 'athlete' }),
    ])

    // 5. Navigate to athlete home
    router.push('/athlete')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      paddingTop:    'calc(env(safe-area-inset-top, 0px) + 24px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 4px 20px rgba(13,115,119,0.35)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M8 6C8 4.9 8.9 4 10 4h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6zM3 9a1 1 0 0 1 1-1h2v8H4a1 1 0 0 1-1-1V9zm14-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2V8z" fill="white" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
        }}>
          DiveBuddy
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4, fontWeight: 500 }}>
          Poolside coaching app
        </p>
      </div>

      {/* Card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: 380, padding: 28 }}>

        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#0F172A',
          margin: '0 0 4px', letterSpacing: '-0.03em',
        }}>
          Du är inbjuden! 🎉
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
          Skapa ditt konto för att komma igång
        </p>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            fontSize: 13, fontWeight: 500,
            background: message.type === 'error'
              ? 'rgba(239,68,68,0.08)'
              : 'rgba(13,115,119,0.08)',
            color: message.type === 'error' ? '#DC2626' : '#0D7377',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(13,115,119,0.2)'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={e => setEmail(e.target.value)}
            readOnly={!!emailParam}
            className="glass-input"
            style={{
              padding: '13px 16px', borderRadius: 12, fontSize: 15,
              width: '100%', boxSizing: 'border-box',
              opacity: emailParam ? 0.75 : 1,
            }}
          />
          <input
            type="password"
            placeholder="Välj ett lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignUp()}
            className="glass-input"
            style={{
              padding: '13px 16px', borderRadius: 12, fontSize: 15,
              width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSignUp}
          disabled={loading || !email || !password}
          className="btn-primary"
          style={{
            width: '100%', padding: '14px 0', marginTop: 16, borderRadius: 14,
            fontSize: 15, fontWeight: 700, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || !email || !password ? 0.6 : 1,
          }}
        >
          {loading ? 'Skapar konto...' : 'Skapa konto'}
        </button>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-bg)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid rgba(13,115,119,0.2)',
          borderTopColor: '#0D7377',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
