import { NextRequest, NextResponse } from 'next/server'
import { processRoiInvestments } from '@/lib/roi-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processRoiInvestments()
    const { affectedUserIds: _affectedUserIds, runId, ...response } = result
    return NextResponse.json({ ...response, runId })
  } catch {
    return NextResponse.json({ error: 'ROI engine failed' }, { status: 500 })
  }
}
