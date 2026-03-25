'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Supabase sets the session automatically from the URL hash on PASSWORD_RECOVERY events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async () => {
    if (!password || !confirm) {
      setMessage({ type: 'error', text: 'Fyll i båda fälten.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Lösenorden matchar inte.' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Lösenordet måste vara minst 6 tecken.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: 'Lösenordet uppdaterat!' })
      setTimeout(() => router.push('/dashboard'), 1500)
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
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#0F172A',
          letterSpacing: '-0.03em', marginBottom: 8,
        }}>
          Nytt lösenord
        </h2>

        {!ready ? (
          <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500, lineHeight: 1.6 }}>
            Väntar på verifiering från länken i mailet... Öppna länken direkt från din e-postapp.
          </p>
        ) : (
          <>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input
                type="password"
                placeholder="Nytt lösenord"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                className="glass-input"
                style={{ padding: '13px 16px', borderRadius: 12, fontSize: 15, width: '100%', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Bekräfta lösenord"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                className="glass-input"
                style={{ padding: '13px 16px', borderRadius: 12, fontSize: 15, width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleUpdate}
              disabled={loading || !password || !confirm}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || !password || !confirm ? 0.6 : 1,
              }}
            >
              {loading ? 'Sparar...' : 'Spara nytt lösenord'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
