'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { shortDate, DAY_LONG, weekdayIndex } from '@/lib/schedule/format'
import { pairGroups, type PassPair } from '@/lib/schedule/pairing'
import { createTrainingForPass, latestTrainingForGroup, templatesForGroup, type LatestTraining, type PlanSource, type TemplateOption } from '@/lib/schedule/plan'
import { C } from '@/components/schedule/ui'

// Design screen 7 "Planera pass": copy the group's latest pass, use a template,
// or start empty. Group, date and time come from the schedule.
export default function PlanStartSheet({ pair, onClose }: { pair: PassPair; onClose: () => void }) {
  const router = useRouter()
  const { profile } = useUser()
  const { data, reload } = useSchedule()
  const [latest, setLatest] = useState<LatestTraining | null | undefined>(undefined)
  const [templates, setTemplates] = useState<TemplateOption[] | null>(null)
  const [step, setStep] = useState<'start' | 'templates'>('start')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupId = pair.groupIds[0] ?? null
  const groups = pairGroups(data, pair)
  const firstGroupName = data.groups.find(g => g.id === groupId)?.name ?? groups
  const when = `${DAY_LONG[weekdayIndex(pair.date)].toLowerCase()} ${shortDate(pair.date)}${pair.start ? ` ${pair.start}` : ''}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!groupId) { setLatest(null); setTemplates([]); return }
    const db = createClient()
    latestTrainingForGroup(db, groupId, pair.date).then(setLatest).catch(() => setLatest(null))
    templatesForGroup(db, groupId).then(setTemplates).catch(() => setTemplates([]))
  }, [groupId, pair.date])

  const create = async (source: PlanSource, title: string) => {
    if (!profile?.club_id) return
    setBusy(true)
    setError(null)
    try {
      const id = await createTrainingForPass(createClient(), {
        clubId: profile.club_id, profileId: profile.id, sessionIds: pair.parts.map(p => p.id), groupId,
        date: pair.date, start: pair.start, end: pair.end, title, source,
      })
      reload()
      router.push(`/planning/${id}?edit=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte skapa passet')
      setBusy(false)
    }
  }

  const option = (primary: boolean): React.CSSProperties => ({
    textAlign: 'left', fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', width: '100%', minHeight: 64,
    borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12, opacity: busy ? 0.6 : 1,
    background: primary ? C.primary : '#fff', color: primary ? '#fff' : C.text, border: primary ? 'none' : `1px solid ${C.line}`,
  })
  const sub = (primary: boolean): React.CSSProperties => ({ fontSize: 13.5, fontWeight: 500, marginTop: 3, color: primary ? '#fff' : C.muted })
  const arrow = (primary: boolean) => <span aria-hidden style={{ fontSize: 22, lineHeight: 1, color: primary ? '#fff' : '#8A96A8' }}>›</span>

  const latestText = latest === undefined ? 'Letar efter senaste passet …'
    : latest ? `${latest.date ? `${DAY_LONG[weekdayIndex(latest.date)]} ${shortDate(latest.date)} · ` : ''}${latest.title} · ${latest.items} övningar`
    : `Inget tidigare pass för ${firstGroupName}`
  const templateText = templates === null ? 'Hämtar mallar …'
    : `${templates.length} ${templates.length === 1 ? 'sparat pass' : 'sparade pass'} för ${firstGroupName}`

  return (
    <Portal>
      <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(30,43,66,0.45)' }} />
      <div role="dialog" aria-modal="true" aria-label="Planera pass" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201, maxWidth: 560, margin: '0 auto', maxHeight: '92dvh',
        background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', color: C.text,
      }}>
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <span style={{ width: 40, height: 5, borderRadius: 3, background: '#D5DEE9' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px calc(24px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                {step === 'start' ? 'Planera pass' : 'Välj mall'}
              </h1>
              <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: C.muted }}>{groups} · {when}</div>
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label="Stäng" style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <X size={18} color={C.text} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {step === 'start' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" disabled={busy || !latest} onClick={() => latest && create({ kind: 'copy', trainingId: latest.id }, latest.title)} style={{ ...option(true), opacity: busy || !latest ? 0.6 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Kopiera senaste passet</div>
                  <div style={sub(true)}>{latestText}</div>
                </div>
                {arrow(true)}
              </button>
              <button type="button" disabled={busy || !templates?.length} onClick={() => setStep('templates')} style={{ ...option(false), opacity: busy || !templates?.length ? 0.6 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Använd en mall</div>
                  <div style={sub(false)}>{templateText}</div>
                </div>
                {arrow(false)}
              </button>
              <button type="button" disabled={busy} onClick={() => create({ kind: 'empty' }, `${groups} ${shortDate(pair.date)}`)} style={option(false)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Börja tomt</div>
                  <div style={sub(false)}>Lägg till övningar själv</div>
                </div>
                {arrow(false)}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={() => setStep('start')} style={{ alignSelf: 'flex-start', minHeight: 44, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: C.primary, cursor: 'pointer' }}>‹ Tillbaka</button>
              <div style={{ borderRadius: 18, border: `1px solid ${C.line}`, padding: '0 16px' }}>
                {(templates ?? []).map((t, i, all) => (
                  <button key={t.id} type="button" disabled={busy} onClick={() => create({ kind: 'template', templateId: t.id }, t.name)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', minHeight: 56, background: 'none', border: 'none',
                    borderBottom: i < all.length - 1 ? `1px solid ${C.line}` : 'none', textAlign: 'left', fontFamily: 'inherit', color: C.text, cursor: 'pointer',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{t.items} övningar</div>
                    </div>
                    <span aria-hidden style={{ fontSize: 20, color: '#8A96A8' }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
          {busy && <p style={{ margin: 0, fontSize: 14, color: C.muted, fontWeight: 600 }}>Skapar passet …</p>}
          <p style={{ margin: 0, fontSize: 13.5, color: C.muted, fontWeight: 500 }}>Grupp, datum och tid kommer från schemat. Du behöver inte fylla i dem.</p>
        </div>
      </div>
    </Portal>
  )
}
