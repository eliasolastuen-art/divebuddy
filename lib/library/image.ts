import type { SupabaseClient } from '@supabase/supabase-js'

// Exercise photos: scaled down in the browser, stored in the private
// bucket "exercise-images" under {club_id}/, shown via signed URLs.

const BUCKET = 'exercise-images'
const MAX_SIDE = 1200
const QUALITY = 0.8

// Longest side 1 200 px, JPEG
export async function downscale(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Bilden gick inte att läsa. Prova en annan bild.'))
      el.src = url
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Bilden gick inte att förminska.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Bilden gick inte att spara.'))), 'image/jpeg', QUALITY))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const imagePathFor = (clubId: string, exerciseId: string) => `${clubId}/${exerciseId}.jpg`

export async function uploadExerciseImage(db: SupabaseClient, clubId: string, exerciseId: string, file: File): Promise<string> {
  const blob = await downscale(file)
  const path = imagePathFor(clubId, exerciseId)
  const { error } = await db.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message)
  return path
}

export async function exerciseImageUrl(db: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
