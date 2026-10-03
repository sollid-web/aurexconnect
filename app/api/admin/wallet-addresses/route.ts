import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { walletAddressCreateSchema, walletAddressUpdateSchema } from '@/lib/wallet-address-schema'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

function maskAddress(value: string) {
  return value.length <= 12 ? `${value.slice(0, 3)}…${value.slice(-2)}` : `${value.slice(0, 6)}…${value.slice(-4)}`
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const methods = await prisma.walletAddress.findMany({ orderBy: [{ isActive: 'desc' }, { label: 'asc' }] })
    return NextResponse.json({ methods })
  } catch (error) {
    console.error('[Admin payment method list]', error)
    return NextResponse.json({ error: 'Could not load payment methods' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let input: z.infer<typeof walletAddressCreateSchema>
  try {
    input = walletAddressCreateSchema.parse(await req.json())
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const method = await prisma.$transaction(async db => {
      const created = await db.walletAddress.create({ data: input })
      await db.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          targetUserId: session.user.id,
          action: 'CREATE_PAYMENT_METHOD',
          details: `scope=platform; walletAddressId=${created.id}; code=${created.currency}; label=${created.label}; network=${created.network}; address=${maskAddress(created.address)}; active=${created.isActive}`,
        },
      })
      return created
    })
    return NextResponse.json({ method }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'A payment method with that code already exists' }, { status: 409 })
    console.error('[Admin payment method create]', error)
    return NextResponse.json({ error: 'Could not create payment method' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let input: z.infer<typeof walletAddressUpdateSchema>
  try {
    input = walletAddressUpdateSchema.parse(await req.json())
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid JSON body' }, { status: 400 })
  }

  const existing = await prisma.walletAddress.findUnique({ where: { id: input.id } })
  if (!existing) return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
  const { id, ...changes } = input
  const action = typeof changes.isActive === 'boolean' && Object.keys(changes).length === 1
    ? (changes.isActive ? 'ACTIVATE_PAYMENT_METHOD' : 'DEACTIVATE_PAYMENT_METHOD')
    : 'UPDATE_PAYMENT_METHOD'

  try {
    const method = await prisma.$transaction(async db => {
      const updated = await db.walletAddress.update({ where: { id }, data: changes })
      const changedFields = Object.keys(changes)
      await db.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          targetUserId: session.user.id,
          action,
          details: `scope=platform; walletAddressId=${updated.id}; changed=${changedFields.join(',')}; code=${updated.currency}; label=${updated.label}; network=${updated.network}; address=${maskAddress(updated.address)}; active=${updated.isActive}`,
        },
      })
      return updated
    })
    return NextResponse.json({ method })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'A payment method with that code already exists' }, { status: 409 })
    console.error('[Admin payment method update]', error)
    return NextResponse.json({ error: 'Could not update payment method' }, { status: 500 })
  }
}
