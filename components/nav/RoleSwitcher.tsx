'use client'

import { useUser } from '@/lib/context/user'

export default function RoleSwitcher() {
  const { roles, activeRole, setActiveRole } = useUser()

  const switchable = roles.filter(r => r !== 'admin')
  if (switchable.length < 2) return null

  return (
    <div style={{
      display: 'flex',
      background: 'rgba(0,0,0,0.06)',
      borderRadius: 20,
      padding: 3,
    }}>
      {switchable.map(role => (
        <button
          key={role}
          onClick={() => setActiveRole(role)}
          style={{
            padding: '4px 12px',
            borderRadius: 16,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'capitalize',
            transition: 'all 0.18s ease',
            background: activeRole === role ? 'white' : 'transparent',
            color: activeRole === role ? '#0D7377' : '#94A3B8',
            boxShadow: activeRole === role ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {role}
        </button>
      ))}
    </div>
  )
}
