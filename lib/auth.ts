import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) throw new Error('Invalid email or password')
        if (!user.isActive) throw new Error('Your account has been suspended. Contact support.')
        if (process.env.REQUIRE_EMAIL_VERIFICATION !== 'false' && !user.emailVerified) {
          throw new Error('Please verify your email address before signing in.')
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) throw new Error('Invalid email or password')

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          isActive: user.isActive,
          createdAt: Math.floor(user.createdAt.getTime() / 1000),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.isActive = (user as any).isActive
        token.createdAt = (user as any).createdAt
      }

      // Refresh authorization claims from the source of truth on every session refresh.
      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, isActive: true, createdAt: true },
        })
        token.role = currentUser?.role ?? 'USER'
        token.isActive = Boolean(currentUser?.isActive)
        token.createdAt = currentUser ? Math.floor(currentUser.createdAt.getTime() / 1000) : 0
      }
      return token
    },
    async session({ session, token }) {
      if (!token.id) return null as any

      // Check again while materializing the session; inactive/deleted users receive no session.
      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, isActive: true, createdAt: true },
      })
      if (!currentUser?.isActive) return null as any

      session.user.id = token.id
      session.user.role = currentUser.role
      session.user.isActive = currentUser.isActive
      session.user.createdAt = Math.floor(currentUser.createdAt.getTime() / 1000)
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
