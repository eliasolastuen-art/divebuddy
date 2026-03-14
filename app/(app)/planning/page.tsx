'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Training, PlanningFolder } from '@/types'
import TrainingBuilder from './TrainingBuilder'
import { FolderPlus, Plus, X, ChevronRight, FileText } from 'lucide-react'
import { MOCK_SESSION } from '@/lib/context/session'

const FOLDER_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Utkast',    dot: '#94A3B8' },
  published: { bg: 'rgba(13,115,119,0.1)',  text: '#0D7377', label: 'Publicerad', dot: '#0D7377' },
  completed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', label: 'Genomförd', dot: '#16A34A' },
}

export default function PlanningPage() {
  const router = useRouter()
  const [folders, setFolders] = useState<PlanningFolder[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from('planning_folders').select('*').order('sort_order'),
      supabase.from('trainings').select('*').order('scheduled_date', { ascending: false }),
    ])
    if (f) setFolders(f)
    if (t) setTrainings(t)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('planning_folders').insert({
      club_id: MOCK_SESSION.clubId,
      coach_id: MOCK_SESSION.coachId,
      name: newFolderName.trim(),
      color: newFolderColor,
      sort_order: folders.length,
    })
    setSaving(false)
    setNewFolderName('')
    setShowFolderModal(false)
    load()
  }

  const folderTrainings = (folderId: string) => trainings.filter(t => t.folder_id === folderId)
  const visibleTrainings = selectedFolder ? trainings.filter(t => t.folder_id === selectedFolder) : trainings

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8', fontSize: 15 }}>
      Laddar...
    </div>
  )

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Page header */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
          Planning
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFolderModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: 12, padding: '8px 12px',
              fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
            }}
          >
            <FolderPlus size={14} strokeWidth={2.2} />
            Mapp
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Pass
          </button>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div style={{ padding: '0 16px 20px' }}>
          <div className="text-label" style={{ marginBottom: 10 }}>Mappar</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { id: null, name: 'Alla', color: '#0F172A', count: trainings.length },
              ...folders.map(f => ({ id: f.id, name: f.name, color: (f as any).color || '#0D7377', count: folderTrainings(f.id).length }))
            ].map(item => {
              const isSelected = selectedFolder === item.id
              return (
                <button
                  key={item.id ?? 'all'}
                  onClick={() => setSelectedFolder(item.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    flexShrink: 0,
                    background: isSelected ? item.color : 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isSelected ? item.color : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: 16, padding: '12px 14px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 4px 16px ${item.color}40` : '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s ease',
                    minWidth: 90,
                  }}
                >
                  <span style={{ fontSize: 18, marginBottom: 6 }}>{item.id ? '📁' : '📋'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'white' : '#0F172A', marginBottom: 2 }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8', fontWeight: 500 }}>{item.count} pass</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Training list */}
      <div style={{ padding: '0 16px' }}>
        {visibleTrainings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'rgba(13,115,119,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <FileText size={28} color="#0D7377" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga träningspass ännu</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Tryck + Pass för att börja</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleTrainings.map(t => {
              const s = STATUS_STYLE[t.status] || STATUS_STYLE.draft
              const folder = folders.find(f => f.id === t.folder_id)
              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`/planning/${t.id}`)}
                  className="glass-card"
                  style={{
                    padding: '16px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    borderLeft: `3px solid ${s.dot}`,
                    borderRadius: 18,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 7, letterSpacing: '-0.01em' }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: s.bg, color: s.text,
                        padding: '3px 9px', borderRadius: 9999,
                      }}>{s.label}</span>
                      {t.scheduled_date && (
                        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                          {new Date(t.scheduled_date + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {folder && (
                        <span style={{
                          fontSize: 11, color: '#94A3B8',
                          background: 'rgba(0,0,0,0.04)',
                          padding: '2px 8px', borderRadius: 9999, fontWeight: 500,
                        }}>
                          📁 {folder.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} color="#CBD5E1" strokeWidth={2.5} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New folder modal */}
      {showFolderModal && (
        <>
          <div onClick={() => setShowFolderModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Ny mapp</h2>
              <button onClick={() => setShowFolderModal(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              placeholder="t.ex. Vecka 12, Tävlingsgrupp..."
              className="glass-input"
              style={{ width: '100%', padding: '13px 16px', fontSize: 15, marginBottom: 18, display: 'block' }}
              autoFocus
            />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {FOLDER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: c,
                      border: newFolderColor === c ? '3px solid #0F172A' : '3px solid transparent',
                      cursor: 'pointer',
                      boxShadow: newFolderColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={createFolder}
              disabled={saving || !newFolderName.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: newFolderName.trim() ? 1 : 0.4 }}
            >
              {saving ? 'Sparar...' : 'Skapa mapp'}
            </button>
          </div>
        </>
      )}

      {showBuilder && (
        <TrainingBuilder
          folders={folders}
          onClose={() => setShowBuilder(false)}
          onSaved={() => { setShowBuilder(false); load() }}
        />
      )}
    </div>
  )
}
