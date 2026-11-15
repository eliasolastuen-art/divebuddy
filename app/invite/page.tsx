'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { processInvite } from '@/lib/actions/processInvite'

function InviteContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const emailParam    = searchParams.get('email')    ?? ''

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
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      // 1a. Came in via the invite link (already signed in) → just choose a password
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }
    } else {
      // 1b. Create account
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error || !data.user) {
        setMessage({ type: 'error', text: error?.message ?? 'Kunde inte skapa konto.' })
        setLoading(false)
        return
      }
      if (!data.session) {
        setMessage({ type: 'success', text: 'Kolla din e-post och bekräfta kontot för att fortsätta.' })
        setLoading(false)
        return
      }
    }

    // 2. Club, roles and athlete link are set on the server from the invite
    const result = await processInvite()
    router.push(result.status === 'ok' ? '/athlete' : '/no-access')
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
          background: 'var(--gradient-hero)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: 'none',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M8 6C8 4.9 8.9 4 10 4h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6zM3 9a1 1 0 0 1 1-1h2v8H4a1 1 0 0 1-1-1V9zm14-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2V8z" fill="white" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
          background: 'var(--gradient-hero)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
        }}>
          DiveBuddy
        </h1>
        <p style={{ color: '#56637A', fontSize: 14, marginTop: 4, fontWeight: 500 }}>
          Poolside coaching app
        </p>
      </div>

      {/* Card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: 380, padding: 28 }}>

        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#1E2B42',
          margin: '0 0 4px', letterSpacing: '-0.03em',
        }}>
          Du är inbjuden! 🎉
        </h2>
        <p style={{ fontSize: 13, color: '#56637A', margin: '0 0 20px' }}>
          Skapa ditt konto för att komma igång
        </p>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            fontSize: 13, fontWeight: 500,
            background: message.type === 'error'
              ? 'rgba(239,68,68,0.08)'
              : 'rgba(43,92,158,0.08)',
            color: message.type === 'error' ? '#DC2626' : '#2B5C9E',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(43,92,158,0.2)'}`,
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
          border: '3px solid rgba(43,92,158,0.2)',
          borderTopColor: '#2B5C9E',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
