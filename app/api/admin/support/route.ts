import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  status: z.enum(['ALL', 'OPEN', 'PENDING', 'RESOLVED']).default('ALL'),
  q: z.string().trim().max(120).default(''),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100_000)).default('1'),
}).strict()

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid support inbox filters' }, { status: 400 })
  const { status, q, page } = parsed.data
  const where = {
    ...(status === 'ALL' ? {} : { status }),
    ...(q ? { OR: [
      { senderEmail: { contains: q, mode: 'insensitive' as const } },
      { senderName: { contains: q, mode: 'insensitive' as const } },
      { subject: { contains: q, mode: 'insensitive' as const } },
      { messages: { some: { textBody: { contains: q, mode: 'insensitive' as const } } } },
    ] } : {}),
  }

  try {
    const [threads, total, openCount, pendingCount, resolvedCount, admins] = await Promise.all([
      prisma.supportThread.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 30,
        take: 30,
        include: {
          assignedAdmin: { select: { id: true, fullName: true, email: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, direction: true, textBody: true, createdAt: true, fromAddress: true } },
        },
      }),
      prisma.supportThread.count({ where }),
      prisma.supportThread.count({ where: { status: 'OPEN' } }),
      prisma.supportThread.count({ where: { status: 'PENDING' } }),
      prisma.supportThread.count({ where: { status: 'RESOLVED' } }),
      prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } }),
    ])
    return NextResponse.json({ threads, total, page, pageSize: 30, counts: { open: openCount, pending: pendingCount, resolved: resolvedCount }, admins })
  } catch (error) {
    console.error('[Admin support inbox list]', error)
    return NextResponse.json({ error: 'Could not load the support inbox' }, { status: 500 })
  }
}
