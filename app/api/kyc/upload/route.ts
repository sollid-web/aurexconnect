import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'kyc-documents'
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Secure document storage is not configured.' }, { status: 503 })
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ error: 'Upload a JPG, PNG, or WEBP image up to 8 MB.' }, { status: 400 })
  const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${session.user.id}/${randomUUID()}.${extension}`
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': file.type, 'x-upsert': 'false' }, body: await file.arrayBuffer() })
  if (!response.ok) { console.error('KYC storage upload failed', await response.text()); return NextResponse.json({ error: 'Document upload failed.' }, { status: 502 }) }
  return NextResponse.json({ path })
}
