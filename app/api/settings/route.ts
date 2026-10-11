import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [settings, paymentMethods] = await Promise.all([
    getSettings(),
    prisma.paymentMethod.findMany({ where: { isActive: true, isMaintenance: false }, orderBy: { displayOrder: 'asc' }, select: { id: true, currency: true, name: true, network: true, address: true, minDeposit: true, maxDeposit: true, requiredConfirmations: true, requiresTxHash: true, requiresProof: true, instructions: true } }),
  ])
  return NextResponse.json({ settings, paymentMethods })
}
