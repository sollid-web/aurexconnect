import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)
export const GET = handler

type AuthRouteContext = {
  params: { nextauth: string[] }
}

export async function POST(req: NextRequest, context: AuthRouteContext) {
  const limited = rateLimit(`login:${requestIp(req)}`, 10, 15 * 60 * 1000)
  if (!limited.allowed) return NextResponse.json({ error: 'Too many sign-in attempts. Please try again later.' }, { status: 429 })
  return handler(req, context)
}
