'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'

export default function NoAccessPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
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
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: 380,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56,
          background: 'rgba(13,115,119,0.1)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#0D7377" strokeWidth="2"/>
            <path d="M12 8v4m0 4h.01" stroke="#0D7377" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 800, color: '#0F172A',
          letterSpacing: '-0.03em', marginBottom: 10,
        }}>
          Inget åtkomst
        </h1>
        <p style={{
          fontSize: 14, color: '#64748B', fontWeight: 500,
          lineHeight: 1.6, marginBottom: 28,
        }}>
          Ditt konto väntar på godkännande. Kontakta din klubbadmin för att få en inbjudan.
        </p>

        <button
          onClick={handleSignOut}
          className="btn-secondary"
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Logga ut
        </button>
      </div>
    </div>
  )
}
