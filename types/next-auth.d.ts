import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      isActive: boolean
      createdAt: number
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
    createdAt: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    isActive: boolean
    createdAt: number
  }
}
