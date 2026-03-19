'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus } from 'lucide-react'

const BLOCK_CATEGORIES = [
  { id: 'vatten',      label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land',        label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka',      label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet',   label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning', label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling',     label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
] as const

const CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

interface GroupTemplate {
  id: string
  name: string
  category: string | null
  created_at: string
}

interface TrainingTemplate {
  id: string
  name: string
  created_at: string
  block_count: number
}

interface GroupRow {
  id: string
  name: string
  color: string | null
}

export default function GroupLibraryPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const supabase = createClient()

  const [group, setGroup] = useState<GroupRow | null>(null)
  const [templates, setTemplates] = useState<GroupTemplate[]>([])
  const [trainingTemplates, setTrainingTemplates] = useState<TrainingTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // New template sheet
  const [showNewSheet, setShowNewSheet] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const [groupRes, tmplRes, trainingRes] = await Promise.all([
      supabase.from('groups').select('id, name, color').eq('id', groupId).single(),
      supabase.from('block_templates').select('id, name, category, created_at').eq('group_id', groupId).order('created_at', { ascending: false }),
      supabase.from('training_templates').select('id, name, created_at, training_template_blocks(id)').eq('group_id', groupId).order('created_at', { ascending: false }),
    ])
    if (groupRes.data) setGroup(groupRes.data)
    setTemplates(tmplRes.data || [])
    setTrainingTemplates((trainingRes.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      block_count: (t.training_template_blocks || []).length,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [groupId])

  const createTemplate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase
      .from('block_templates')
      .insert({ name: newName.trim(), category: newCategory || null, group_id: groupId })
      .select()
      .single()
    setCreating(false)
    if (data) {
      setShowNewSheet(false)
      setNewName('')
      setNewCategory('')
      router.push(`/library/blocks/${data.id}`)
    }
  }

  // Group templates by block category
  const grouped = BLOCK_CATEGORIES.map(bc => ({
    ...bc,
    templates: templates.filter(t => t.category === bc.id),
  })).filter(g => g.templates.length > 0)
  const uncategorized = templates.filter(t => !t.category || !(t.category in CAT_BY_ID))

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.5} />
        </button>
        {group && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: group.color ?? '#0D7377',
              flexShrink: 0,
            }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {group.name}
            </h1>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '4px 16px 120px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>
        ) : templates.length === 0 && trainingTemplates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga mallar ännu</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Tryck + för att skapa en mall för den här gruppen</p>
          </div>
        ) : (
          <>
            {/* Training templates */}
            {trainingTemplates.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Träningsmallar
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trainingTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/library/trainings/${t.id}`)}
                      className="glass-card"
                      style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 18, border: 'none', cursor: 'pointer', borderLeft: `4px solid ${group?.color ?? '#0D7377'}` }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{t.block_count} block</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider if both sections present */}
            {trainingTemplates.length > 0 && (grouped.some(g => g.templates.length > 0) || uncategorized.length > 0) && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Blockmallar
              </div>
            )}

            {grouped.map(bc => (
              <div key={bc.id} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{bc.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {bc.label}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bc.templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => router.push(`/library/blocks/${tmpl.id}`)}
                      className="glass-card"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px 18px',
                        borderRadius: 18,
                        border: 'none',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${bc.color}`,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{tmpl.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {uncategorized.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Övriga
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {uncategorized.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => router.push(`/library/blocks/${tmpl.id}`)}
                      className="glass-card"
                      style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 18, border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{tmpl.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewSheet(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'linear-gradient(135deg, #0D7377, #0a5a5d)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(13,115,119,0.4)',
          zIndex: 50,
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </button>

      {/* New template sheet */}
      {showNewSheet && (
        <>
          <div
            onClick={() => setShowNewSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }}
          />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400, borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', maxWidth: 520, margin: '0 auto' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Ny mall för {group?.name}</div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Mallnamn..."
              className="glass-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 16 }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && createTemplate()}
            />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Kategori (valfritt)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
              {BLOCK_CATEGORIES.map(bc => (
                <button
                  key={bc.id}
                  onClick={() => setNewCategory(newCategory === bc.id ? '' : bc.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 12,
                    border: `2px solid ${newCategory === bc.id ? bc.color : 'transparent'}`,
                    background: newCategory === bc.id ? `${bc.color}22` : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{bc.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{bc.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={createTemplate}
              disabled={!newName.trim() || creating}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16, opacity: !newName.trim() ? 0.5 : 1 }}
            >
              {creating ? 'Skapar...' : 'Skapa mall'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
