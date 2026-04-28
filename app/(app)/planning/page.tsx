'use client'
import PlanningListView from './PlanningListView'

export default function PlanningPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <div style={{ padding: '20px 16px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
          Planning
        </h1>
      </div>
      <PlanningListView />
    </div>
  )
}
