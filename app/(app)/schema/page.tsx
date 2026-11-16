import { redirect } from 'next/navigation'

// The term schedule now lives in Planning (week), Viktiga datum and Admin (coaches)
export default function SchemaPage() {
  redirect('/planning')
}
