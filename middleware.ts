import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/auth/login' },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false
      // Middleware only verifies that a session exists. Role/active checks are
      // revalidated against the database by NextAuth session materialization
      // and every admin API, rather than trusting stale JWT role claims here.
      return true
    },
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
