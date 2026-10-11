import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getActiveAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  })
  if (!user?.isActive) return null

  return { session, user }
}

export async function requireActiveAdmin() {
  const auth = await getActiveAuth()
  if (!auth || auth.user.role !== 'ADMIN') return null
  return auth
}
