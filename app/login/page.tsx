'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' })
      return
    }

    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
      } else {
        setMessage({ type: 'success', text: 'Account created! Check your email to confirm, then log in.' })
        setMode('login')
        setLoading(false)
      }
    }
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
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 4px 20px rgba(13,115,119,0.35)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M8 6C8 4.9 8.9 4 10 4h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6zM3 9a1 1 0 0 1 1-1h2v8H4a1 1 0 0 1-1-1V9zm14-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2V8z" fill="white"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
        }}>DiveBuddy</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4, fontWeight: 500 }}>
          Poolside coaching app
        </p>
      </div>

      {/* Card */}
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: 380,
        padding: 28,
      }}>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.05)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 9,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#0D7377' : '#94A3B8',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
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
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="glass-input"
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              fontSize: 15,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="glass-input"
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              fontSize: 15,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '14px 0',
            marginTop: 20,
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </div>
    </div>
  )
}
