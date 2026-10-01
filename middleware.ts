import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/auth/login' },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false
      if (req.nextUrl.pathname.startsWith('/admin')) return token.role === 'ADMIN'
      return true
    },
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
