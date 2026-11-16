'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchExercises, fetchGroups, type Exercise, type LibraryGroup } from '@/lib/library/queries'

// Groups + exercises, cached for the session so the picker opens instantly
// the second time. `refresh()` after creating or editing an exercise.

interface LibraryData { groups: LibraryGroup[]; exercises: Exercise[] }
let cache: LibraryData | null = null
let pending: Promise<LibraryData> | null = null

function load(): Promise<LibraryData> {
  if (!pending) {
    const db = createClient()
    pending = Promise.all([fetchGroups(db), fetchExercises(db)])
      .then(([groups, exercises]) => {
        cache = { groups, exercises }
        return cache
      })
      .finally(() => { pending = null })
  }
  return pending
}

export function useLibrary() {
  const [data, setData] = useState<LibraryData | null>(cache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    load().then(d => { if (alive) setData(d) }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Kunde inte läsa biblioteket') })
    return () => { alive = false }
  }, [])

  return {
    groups: data?.groups ?? [],
    exercises: data?.exercises ?? [],
    loading: !data && !error,
    error,
    refresh: () => { cache = null; return load().then(d => setData(d)) },
    // Add a just-created exercise without a round trip
    addLocal: (e: Exercise) => {
      if (cache) cache = { ...cache, exercises: [...cache.exercises, e] }
      setData(cache)
    },
  }
}
